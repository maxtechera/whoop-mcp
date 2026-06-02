// JSON shape inference for schema discovery. Given one or more sample payloads
// from an endpoint, derive the full data shape: every field path, its type(s),
// which paths are arrays (→ candidate child tables) with element shape +
// observed cardinality. Merges across samples (union of types/fields).
//
// This is how we "understand the data shape" before modeling it, and it feeds
// the path-coverage manifest the zero-loss audit checks against.

export type Scalar = "string" | "number" | "boolean" | "null";

export interface Shape {
  types: Set<string>; // "object" | "array" | Scalar
  // object
  fields?: Map<string, Shape>;
  optionalKeys?: Set<string>; // keys absent in at least one observed object
  objectSamples?: number;
  // array
  items?: Shape;
  lengths?: number[]; // observed array lengths
  // scalar samples (a few, for SHAPES.md)
  examples?: unknown[];
}

function newShape(): Shape {
  return { types: new Set() };
}

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v; // object | string | number | boolean
}

export function observe(shape: Shape, value: unknown): void {
  const t = typeOf(value);
  shape.types.add(t);

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    shape.fields ??= new Map();
    shape.optionalKeys ??= new Set();
    shape.objectSamples = (shape.objectSamples ?? 0) + 1;
    const keys = new Set(Object.keys(obj));
    // keys we've seen before but missing here → optional
    for (const known of shape.fields.keys()) {
      if (!keys.has(known)) shape.optionalKeys.add(known);
    }
    for (const [k, v] of Object.entries(obj)) {
      let child = shape.fields.get(k);
      if (!child) {
        child = newShape();
        shape.fields.set(k, child);
        // first appearance after the first object sample → optional
        if (shape.objectSamples > 1) shape.optionalKeys.add(k);
      }
      observe(child, v);
    }
  } else if (t === "array") {
    const arr = value as unknown[];
    shape.items ??= newShape();
    shape.lengths ??= [];
    shape.lengths.push(arr.length);
    for (const el of arr) observe(shape.items, el);
  } else {
    if (!shape.examples) shape.examples = [];
    if (shape.examples.length < 3 && !shape.examples.includes(value)) {
      shape.examples.push(value);
    }
  }
}

export function inferShape(values: unknown[]): Shape {
  const s = newShape();
  for (const v of values) observe(s, v);
  return s;
}

// ---- leaf-path flattening (for the coverage manifest + zero-loss audit) ----

export interface LeafPath {
  path: string; // dot/bracket path, arrays shown as []
  types: string[];
  underArray: boolean; // path passes through at least one array → time-series/child data
  optional: boolean;
  examples?: unknown[];
}

export function leafPaths(shape: Shape, prefix = "", underArray = false, optional = false): LeafPath[] {
  const out: LeafPath[] = [];
  const isObject = shape.types.has("object") && shape.fields;
  const isArray = shape.types.has("array") && shape.items;
  const scalarTypes = [...shape.types].filter((t) => t !== "object" && t !== "array");

  if (isObject) {
    for (const [k, child] of shape.fields!) {
      const childOptional = optional || (shape.optionalKeys?.has(k) ?? false);
      out.push(...leafPaths(child, prefix ? `${prefix}.${k}` : k, underArray, childOptional));
    }
  }
  if (isArray) {
    out.push(...leafPaths(shape.items!, `${prefix}[]`, true, optional));
  }
  if (scalarTypes.length && !isObject && !isArray) {
    out.push({ path: prefix || "(root)", types: scalarTypes, underArray, optional, examples: shape.examples });
  } else if (scalarTypes.length && (isObject || isArray)) {
    // mixed (e.g. sometimes null, sometimes object) — record the scalar leaf too
    out.push({ path: prefix || "(root)", types: scalarTypes, underArray, optional, examples: shape.examples });
  }
  return out;
}

// Arrays in the shape → candidate child tables for granular decomposition.
export interface ArrayNode {
  path: string;
  maxLen: number;
  count: number;
  elementScalarFields: string[]; // direct scalar fields of the element (if object)
}

export function arrayNodes(shape: Shape, prefix = ""): ArrayNode[] {
  const out: ArrayNode[] = [];
  const walk = (s: Shape, p: string): void => {
    if (s.types.has("array") && s.items) {
      const lens = s.lengths ?? [];
      const elem = s.items;
      const elemFields =
        elem.types.has("object") && elem.fields
          ? [...elem.fields.entries()]
              .filter(([, c]) => !c.types.has("object") && !c.types.has("array"))
              .map(([k]) => k)
          : [];
      out.push({
        path: `${p}[]`,
        maxLen: lens.length ? Math.max(...lens) : 0,
        count: lens.length,
        elementScalarFields: elemFields,
      });
      walk(elem, `${p}[]`);
    }
    if (s.types.has("object") && s.fields) {
      for (const [k, c] of s.fields) walk(c, p ? `${p}.${k}` : k);
    }
  };
  walk(shape, prefix);
  return out;
}
