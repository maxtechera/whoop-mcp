// HTTP transport entry point. Boots an MCP server over Streamable HTTP behind
// auth, on Express so we can mount the MCP SDK's OAuth 2.1 authorization-server
// endpoints (required for claude.ai web + the Claude mobile app, whose custom
// connectors only support OAuth — no bearer-header field).
//
// Two auth paths, both accepted on /mcp:
//   1. Static bearer (MCP_AUTH_TOKEN) — for Claude Code (--header) and the
//      Claude Desktop mcp-remote bridge. Unchanged from before.
//   2. OAuth 2.1 + PKCE — for claude.ai web / mobile custom connectors. The
//      /authorize step is gated by AUTH_PASSWORD. See whoop/oauth_provider.ts.
//
// Env:
//   MCP_TRANSPORT=http        (required to select this transport)
//   MCP_AUTH_TOKEN=<≥16 char> (required; also the JWT signing secret)
//   AUTH_PASSWORD=<password>  (optional; enables the OAuth/web-connector path)
//   PUBLIC_URL=https://...    (optional; the server's public origin, used as the
//                              OAuth issuer. Defaults to http://localhost:<port>)
import express, { type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import type { WhoopClient } from "./whoop/client.js";
import { registerTools } from "./tools/register.js";
import { WhoopOAuthProvider, renderConsentForm } from "./whoop/oauth_provider.js";

export interface HttpServerOptions {
  /** Bearer token clients must present + JWT signing secret. Required, ≥16 chars. */
  authToken: string;
  port?: number;
  host?: string;
}

export async function startHttpServer(client: WhoopClient, opts: HttpServerOptions): Promise<void> {
  if (!opts.authToken || opts.authToken.length < 16) {
    throw new Error(
      "MCP_AUTH_TOKEN must be set and at least 16 chars. Generate one with `openssl rand -hex 32`.",
    );
  }
  const port = opts.port ?? Number(process.env.PORT ?? process.env.MCP_HTTP_PORT ?? 3000);
  const host = opts.host ?? "0.0.0.0";
  const password = process.env.AUTH_PASSWORD ?? "";
  // `||` not `??`: an empty PUBLIC_URL (e.g. a host that injects "" for an unset
  // var, or the first-pass deploy on Railway/Cloud Run before the real URL
  // is known) must fall back to localhost, not become `new URL("")` → boot crash.
  const publicUrl = process.env.PUBLIC_URL || `http://localhost:${port}`;
  const oauthEnabled = password.length > 0;

  const provider = new WhoopOAuthProvider({
    signingSecret: opts.authToken,
    password,
    staticToken: opts.authToken,
  });

  // Stateless: a fresh McpServer + transport per request, no mcp-session-id. In-memory
  // sessions died on every Railway redeploy and connectors then failed every call with
  // "Server not initialized" until they were re-added (health-mcp and finance-mcp hit this
  // first). Building the server is a handful of registerTool calls; the WHOOP client is shared.
  async function handleStateless(req: Request, res: Response): Promise<void> {
    const server = new McpServer({ name: "whoop", version: "1.2.0" });
    registerTools(server, client);
    // `undefined` is what turns session tracking off at runtime; this SDK's types still
    // declare the generator required, hence the cast.
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined as unknown as () => string,
      enableJsonResponse: true,
    });
    res.on("close", () => { void transport.close(); void server.close(); });
    await server.connect(transport as Parameters<typeof server.connect>[0]);
    await transport.handleRequest(req, res, req.body);
  }

  const app = express();
  app.disable("x-powered-by");
  // Behind Fly's reverse proxy the client IP is in X-Forwarded-For. Trust
  // exactly ONE hop (Fly's edge proxy) so express-rate-limit (used by the SDK's
  // OAuth endpoints) can identify clients. `true` (trust all) is rejected by
  // express-rate-limit as too permissive — clients could spoof X-Forwarded-For
  // — so we use the hop count instead.
  app.set("trust proxy", 1);

  // CORS — a browser-based MCP client (or the OAuth redirect dance) may hit this.
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "authorization, content-type, mcp-session-id");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id, www-authenticate");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  // Health probe — no auth. Container hosts (Fly/Docker HEALTHCHECK) hit this.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // OAuth 2.1 authorization-server endpoints: /.well-known/oauth-authorization-server,
  // /.well-known/oauth-protected-resource/mcp, /authorize, /token, /register, /revoke.
  //
  // resourceServerUrl MUST be the actual MCP endpoint (…/mcp), not the root.
  // Claude's connector validates that the protected-resource metadata's
  // `resource` matches the URL it's connecting to. If we let it default to the
  // issuer (root), Claude sees resource=https://host/ ≠ https://host/mcp and
  // refuses to connect. Setting it to /mcp also serves the metadata at the
  // RFC 9728 path-specific location /.well-known/oauth-protected-resource/mcp.
  const issuerUrl = new URL(publicUrl);
  const resourceServerUrl = new URL(`${publicUrl.replace(/\/$/, "")}/mcp`);
  app.use(mcpAuthRouter({ provider, issuerUrl, resourceServerUrl }));

  // Brute-force guard for the password gate: this consent route is custom and
  // is NOT covered by the SDK's OAuth rate-limiter. Per-IP fixed window
  // (trust proxy=1 gives us the real client IP via req.ip).
  const consentHits = new Map<string, { count: number; resetAt: number }>();
  const CONSENT_MAX = 10;
  const CONSENT_WINDOW_MS = 15 * 60 * 1000;

  // Password-gate handler for the /authorize step. The form rendered by
  // provider.authorize() POSTs here; we validate the password, mint an auth
  // code, and redirect back to the client.
  app.post("/oauth/consent", express.urlencoded({ extended: false }), (req: Request, res: Response) => {
    if (!oauthEnabled) {
      res.status(403).json({ error: "oauth_disabled", error_description: "AUTH_PASSWORD is not set on this server." });
      return;
    }
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    const hit = consentHits.get(ip);
    if (!hit || now > hit.resetAt) {
      consentHits.set(ip, { count: 1, resetAt: now + CONSENT_WINDOW_MS });
    } else if (++hit.count > CONSENT_MAX) {
      res.status(429).json({ error: "too_many_requests", error_description: "Too many attempts — wait 15 minutes." });
      return;
    }
    const body = req.body as Record<string, string>;
    const redirect = provider.consent({
      clientId: body.client_id ?? "",
      redirectUri: body.redirect_uri ?? "",
      codeChallenge: body.code_challenge ?? "",
      state: body.state ?? "",
      scopes: body.scope ?? "",
      resource: body.resource ?? "",
      password: body.password ?? "",
    });
    if (!redirect) {
      // Wrong password (or bad client) — re-render the form with an error.
      res.status(401).setHeader("content-type", "text/html; charset=utf-8");
      res.end(renderConsentForm({
        clientId: body.client_id ?? "",
        redirectUri: body.redirect_uri ?? "",
        codeChallenge: body.code_challenge ?? "",
        state: body.state ?? "",
        scopes: body.scope ?? "",
        resource: body.resource ?? "",
        error: true,
      }));
      return;
    }
    res.redirect(302, redirect);
  });

  // MCP endpoint — gated by OAuth token OR static bearer (provider.verifyAccessToken
  // accepts both). 401s carry a WWW-Authenticate pointing at the resource metadata
  // so OAuth clients can discover the authorization server.
  const bearer = requireBearerAuth({
    verifier: provider,
    resourceMetadataUrl: `${publicUrl.replace(/\/$/, "")}/.well-known/oauth-protected-resource/mcp`,
  });

  const mcpHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      await handleStateless(req, res);
    } catch (err) {
      console.error("[whoop-mcp] request error:", err);
      if (!res.headersSent) res.status(500).json({ error: "internal server error" });
    }
  };

  app.post("/mcp", bearer, express.json(), (req, res) => void mcpHandler(req, res));
  app.get("/mcp", bearer, (req, res) => void mcpHandler(req, res));
  app.delete("/mcp", bearer, (req, res) => void mcpHandler(req, res));

  const httpServer = app.listen(port, host, () => {
    console.error(`[whoop-mcp] listening on ${publicUrl} (bound ${host}:${port})`);
    console.error(`[whoop-mcp] health: GET /health`);
    console.error(`[whoop-mcp] auth: static bearer (MCP_AUTH_TOKEN)${oauthEnabled ? " + OAuth (web/mobile connectors)" : " — OAuth disabled (set AUTH_PASSWORD to enable)"}`);
  });

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    console.error(`[whoop-mcp] cannot listen on ${port}: ${err.code ?? ""} ${err.message}`);
    process.exit(1);
  });

  const close = (): void => {
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}
