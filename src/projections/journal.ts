import type { JournalOutT } from "../schemas/journal.js";
import { BEHAVIORS_BY_ID } from "../data/behaviors.js";
import { isObject, asArray, asNumber, asString, asBool } from "../lib/walk.js";

export function projectJournal(raw: unknown, date: string): JournalOutT {
  let inputs: unknown[];
  let cycleId: number | null = null;
  let entryId: string | null = null;
  let notes: string | null = null;

  if (Array.isArray(raw)) {
    inputs = raw;
  } else if (isObject(raw)) {
    const journal = isObject(raw.journal) ? raw.journal as Record<string, unknown> : null;
    if (journal) {
      inputs = asArray(journal.tracked_behaviors);
      cycleId = asNumber(journal.cycle_id);
      // numeric in the v3 draft, string elsewhere
      entryId = asString(journal.journal_entry_id) ?? (asNumber(journal.journal_entry_id) !== null ? String(asNumber(journal.journal_entry_id)) : null);
      notes = asString(journal.notes);
    } else {
      inputs = asArray(raw.records ?? raw.tracker_inputs ?? raw.items);
    }
  } else {
    inputs = [];
  }

  const behaviors = inputs
    .map((raw) => {
      if (!isObject(raw)) return null;
      // v3 drafts nest each row as { behavior_tracker: {...}, tracker_input: {...} };
      // older shapes are flat tracker inputs. Read the input, fall back to the tracker id.
      const tracker = isObject(raw.behavior_tracker) ? raw.behavior_tracker as Record<string, unknown> : null;
      const i = isObject(raw.tracker_input) ? raw.tracker_input as Record<string, unknown> : raw;
      const id = asNumber(i.behavior_tracker_id ?? i.behavior_id ?? tracker?.id);
      if (id === null) return null;
      const meta = BEHAVIORS_BY_ID.get(id);
      return {
        behavior_tracker_id: id,
        title: meta?.title ?? "",
        category: meta?.category ?? "",
        internal_name: meta?.internal_name ?? "",
        answered_yes: asBool(i.answered_yes),
        magnitude_value: asNumber(i.magnitude_input_value),
        magnitude_label: asString(i.magnitude_input_label),
        recorded_at: asString(i.recorded_at),
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  return { date, cycle_id: cycleId, journal_entry_id: entryId, notes, behaviors };
}
