// Pure merge rule for Opening Laboratory data (no imports, so it is unit-testable under Node).
export interface LabSource { name: string; text: string }
export interface LabNote { key: string; moves: string; text: string; updated: number }
export interface LabStat { attempts: number; clean: number; last: number }
export interface LabData { sources: LabSource[]; notes: Record<string, LabNote>; stats: Record<string, LabStat>; side: 'auto' | 'w' | 'b' }

/** Merge `extra` into `base` without removing or overwriting anything already in `base`. */
export function mergeLab(base: LabData, extra: LabData): { merged: LabData; added: number } {
  const merged: LabData = { sources: [...base.sources], notes: { ...base.notes }, stats: { ...base.stats }, side: base.side };
  let added = 0;
  for (const s of extra.sources) {
    if (merged.sources.some((x) => x.text === s.text)) continue; // already present (under any name)
    const same = merged.sources.find((x) => x.name === s.name);
    let name = same ? `${s.name} (from this browser)` : s.name;
    for (let i = 2; merged.sources.some((x) => x.name === name); i++) name = `${s.name} (from this browser ${i})`;
    merged.sources.push({ name, text: s.text });
    added++;
  }
  for (const [k, n] of Object.entries(extra.notes)) if (!merged.notes[k]) { merged.notes[k] = n; added++; }
  for (const [k, st] of Object.entries(extra.stats)) if (!merged.stats[k]) merged.stats[k] = st;
  if (merged.side === 'auto' && extra.side !== 'auto') merged.side = extra.side;
  return { merged, added };
}
