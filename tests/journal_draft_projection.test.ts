import { describe, it, expect } from "vitest";
import { projectJournal } from "../src/projections/journal.js";

// Trimmed from a live /journal-service/v3/journals/drafts/mobile/2026-09-08 capture (2026-09-11).
const draft = { journal: { tracked_behaviors: [
  { behavior_tracker: { id: 89, title: "Protein" }, tracker_input: { journal_entry_id: 1997563209, behavior_tracker_id: 89, answered_yes: true, magnitude_input_value: null, source: "USER" } },
  { behavior_tracker: { id: 2, title: "Caffeine" }, tracker_input: { journal_entry_id: 1997563209, behavior_tracker_id: 2, answered_yes: true, magnitude_input_value: 2, magnitude_input_label: "2" } },
], user_id: 1, cycle_id: 1779114320, journal_entry_id: 1997563209, notes: null, user_reviewed: true }, metadata: {} };

describe("journal projection — v3 draft shape", () => {
  it("reads nested tracker_input rows and the numeric entry id", () => {
    const o = projectJournal(draft, "2026-09-08");
    expect(o.journal_entry_id).toBe("1997563209");
    expect(o.cycle_id).toBe(1779114320);
    expect(o.behaviors.map((b) => [b.behavior_tracker_id, b.answered_yes, b.magnitude_value])).toEqual([[89, true, null], [2, true, 2]]);
    expect(o.behaviors[0].title).toBe("Protein");
  });
  it("still reads flat rows", () => {
    const o = projectJournal({ journal: { tracked_behaviors: [{ behavior_tracker_id: 1, answered_yes: false }], cycle_id: 5 } }, "2026-09-08");
    expect(o.behaviors[0]).toMatchObject({ behavior_tracker_id: 1, answered_yes: false, title: "Alcohol" });
  });
});
