// 訓練週期：累積期 3 週 → 強度期 2 週 → 減量週 1 週，6 週一輪一直循環
// 加強部位：選了的肌群，每個動作多 1 組
import { addDays } from './progression.js';

export const CYCLE = [
  { phase: 'acc', label: '累積期', week: 1, short: '累 1', rir: '3', setsAdd: {}, note: '照計畫的組數，每組留 3 下，把動作做標準' },
  { phase: 'acc', label: '累積期', week: 2, short: '累 2', rir: '2', setsAdd: { aux: 1, iso: 1 }, note: '輔助、孤立動作各 +1 組，每組留 2 下' },
  { phase: 'acc', label: '累積期', week: 3, short: '累 3', rir: '1', setsAdd: { main: 1, aux: 1, iso: 1 }, note: '每個動作 +1 組，每組只留 1 下，這週最累' },
  { phase: 'int', label: '強度期', week: 1, short: '強 1', rir: '1-2', setsAdd: {}, note: '主項次數降低、重量加上去；輔助和孤立照常' },
  { phase: 'int', label: '強度期', week: 2, short: '強 2', rir: '1', setsAdd: {}, note: '主項維持低次數，再衝一點重量' },
  { phase: 'deload', label: '減量週', week: 1, short: '減量', rir: '3', setsAdd: {}, note: '重量約 9 成、組數減半，讓身體恢復，下一輪從累積期重新開始' }
];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function mondayOf(date) { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); }

export function cycleRecord(records) { return records.find((r) => r.type === 'cycle') || null; }
export function cycleWeek(records, today) {
  const c = cycleRecord(records);
  if (!c || !c.active || !c.start) return null;
  const weeks = Math.round((new Date(`${mondayOf(today)}T00:00:00`) - new Date(`${mondayOf(c.start)}T00:00:00`)) / 604800000);
  if (weeks < 0) return null;
  const i = weeks % CYCLE.length;
  return { ...CYCLE[i], index: i, round: Math.floor(weeks / CYCLE.length) + 1, weekStart: addDays(mondayOf(c.start), weeks * 7) };
}

// 強度期主項的次數：8 → 5-6、10-12 → 6-8、15 → 9-10
export function intensityReps(reps) {
  const n = String(reps || '').match(/\d+/g);
  if (!n) return reps;
  const lo = Number(n[0]), hi = n.length > 1 && !/[+＋]/.test(reps) ? Number(n[1]) : lo;
  const a = Math.max(4, Math.round(lo * 0.6)), b = Math.max(a + 1, Math.round(hi * 0.6) + 1);
  return `${a}-${b}`;
}

// 依週期和加強部位調整這個動作今天的組數 / 次數 / 保留次數
// e 要有 baseSets、baseReps、baseRir、role、partKey
export function planMods(e, cw, focus = []) {
  const role = e.role || 'aux';
  let sets = e.baseSets, reps = e.baseReps, rir = e.baseRir || '';
  if (cw && cw.phase !== 'deload') {
    sets += cw.setsAdd[role] || 0;
    if (cw.phase === 'int' && role === 'main') reps = intensityReps(reps);
    rir = cw.rir;
  }
  const isFocus = !!e.partKey && focus.includes(e.partKey);
  if (isFocus) sets += 1;
  return { sets, reps, rir, focus: isFocus };
}

export function trainPrefs(records) { return records.find((r) => r.type === 'trainprefs') || { id: 'trainprefs', type: 'trainprefs', focus: [] }; }
