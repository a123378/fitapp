// 每組紀錄、停滯判斷、減量（deload）
import { estimate1RM } from './store.js';
import { PART_LABELS } from './viyade.js';

export const STALL_N = 3;          // 連續幾次沒進步算停滯
export const DELOAD_WEEKS = 8;     // 連續練幾週沒減量就建議減量週
export const DELOAD_FACTOR = 0.9;  // 減量：重量 × 0.9
export const DELOAD_DAYS = 7;

const round = (x) => Math.round(x * 2) / 2;
const e1 = (s) => estimate1RM(s.w, s.r) || 0;

// 計畫組數（有些菜單寫成字串）
export function plannedSets(e) { return Math.max(1, parseInt(e.sets, 10) || 3); }

// 一個動作的每組紀錄；舊紀錄只有「最重一組 + 組數」，就當成一組
export function setsOf(e) {
  if (Array.isArray(e.setsLog) && e.setsLog.length) return e.setsLog;
  return e.reps > 0 ? [{ w: e.weight ?? null, r: e.reps }] : [];
}

// 從每組算出要存的欄位（weight / reps 是最好的一組，舊畫面和舊程式照樣能用）
export function summarizeSets(rows, hasWeight) {
  const sets = rows.filter((s) => Number(s.r) > 0).map((s) => ({ w: hasWeight ? Number(s.w) || 0 : null, r: Number(s.r), ...(s.rir !== undefined && s.rir !== null && s.rir !== '' ? { rir: Number(s.rir) } : {}) }));
  if (!sets.length) return { setsLog: [], weight: hasWeight ? 0 : null, reps: 0, setsDone: 0, e1rm: null, volume: 0 };
  let best = sets[0];
  for (const s of sets) {
    const better = hasWeight ? (e1(s) > e1(best) || (e1(s) === e1(best) && s.w > best.w)) : s.r > best.r;
    if (better) best = s;
  }
  return {
    setsLog: sets, weight: best.w, reps: best.r, setsDone: sets.length,
    e1rm: hasWeight ? (e1(best) || null) : null,
    volume: hasWeight ? Math.round(sets.reduce((a, s) => a + s.w * s.r, 0)) : sets.reduce((a, s) => a + s.r, 0)
  };
}

// 每組文字：「40 kg × 8/8/7・37.5 kg × 10」；徒手「12/10/9 下」
export function formatSets(e) {
  const sets = setsOf(e);
  if (!sets.length) return '沒有紀錄';
  const old = !(Array.isArray(e.setsLog) && e.setsLog.length);
  const rirText = (xs) => xs.some((s) => s.rir != null) ? `（留 ${xs.map((s) => s.rir ?? '-').join('/')}）` : '';
  if (!sets.some((s) => s.w > 0)) return `${sets.map((s) => s.r).join('/')} 下${rirText(sets)}${old && e.setsDone > 1 ? `・共 ${e.setsDone} 組` : ''}`;
  const groups = [];
  for (const s of sets) {
    const g = groups[groups.length - 1];
    if (g && g.w === s.w) g.s.push(s); else groups.push({ w: s.w, s: [s] });
  }
  return groups.map((g) => `${g.w} kg × ${g.s.map((s) => s.r).join('/')}${rirText(g.s)}`).join('・') + (old && e.setsDone > 1 ? `・共 ${e.setsDone} 組（舊紀錄只有最重一組）` : '');
}

// 正式組：重量 ≥ 當天最重的 90%（排除熱身組）
export function workingSets(sets) {
  const top = Math.max(...sets.map((s) => s.w || 0));
  return top > 0 ? sets.filter((s) => s.w >= top * 0.9) : sets;
}
export function topWeight(sets) { return Math.max(0, ...sets.map((s) => s.w || 0)); }

// 這個動作的歷次紀錄（新到舊）
export function exerciseHistory(name, workouts) {
  const out = [];
  for (const w of workouts) {
    if (w.type !== 'strength') continue;
    const e = w.exercises.find((x) => x.name === name);
    if (!e) continue;
    const sets = setsOf(e);
    if (!sets.length) continue;
    const weighted = sets.some((s) => s.w > 0);
    const old = !(Array.isArray(e.setsLog) && e.setsLog.length);
    const best = weighted ? Math.max(...sets.map(e1)) : Math.max(...sets.map((s) => s.r));
    const ws = workingSets(sets);
    const vol = (weighted ? ws.reduce((a, s) => a + s.w * s.r, 0) : ws.reduce((a, s) => a + s.r, 0)) * (old ? (e.setsDone || 1) : 1);
    out.push({ date: w.date, e, sets, old, weighted, best, vol, planned: plannedSets(e), deload: !!(e.deload || w.deload) });
  }
  return out;
}

// 停滯：最近一次減量之後，連續 STALL_N 次「最好的一組估 1RM」和「正式組總量」都沒有超過之前
export function stallInfo(hist) {
  const k = hist.findIndex((h) => h.deload);
  const win = (k < 0 ? hist : hist.slice(0, k)).slice().reverse(); // 舊到新
  if (!win.length) return { stalled: false, since: 0 };
  let bestE = -Infinity, bestV = -Infinity, lastPR = 0;
  win.forEach((h, i) => {
    if (h.best > bestE || h.vol > bestV) lastPR = i;
    bestE = Math.max(bestE, h.best); bestV = Math.max(bestV, h.vol);
  });
  const since = win.length - 1 - lastPR;
  return { stalled: since >= STALL_N, since, prDate: win[lastPR].date };
}

// 漸進超負荷：依上次「每一組」建議今天；停滯就建議這個動作今天減量
export function progressionAdvice(name, hasWeight, workouts, [lo, hi]) {
  const hist = exerciseHistory(name, workouts);
  if (!hist.length) return null;
  const last = hist[0];

  // 上次是減量 → 回到減量前
  if (last.deload) {
    const pre = hist.find((h) => !h.deload);
    if (hasWeight && pre && pre.weighted) { const w = topWeight(workingSets(pre.sets)); return { text: `上次是減量，今天回到減量前的 ${w} kg、正常組數`, weight: w }; }
    return { text: '上次是減量，今天回到正常組數和次數', weight: hasWeight && last.weighted ? topWeight(last.sets) : null };
  }

  const normal = normalAdvice(last, hasWeight, lo, hi);
  const stall = stallInfo(hist);
  if (!stall.stalled) return normal;
  const top = topWeight(workingSets(last.sets));
  const w = hasWeight && last.weighted ? round(top * DELOAD_FACTOR) : null;
  return {
    text: `連續 ${stall.since} 次沒有進步（上次突破是 ${stall.prDate}）→ 今天這個動作減量：${w ? `${w} kg、` : ''}組數減半、每組留 3 下，下次回到 ${top ? `${top} kg` : '原本的量'}`,
    weight: w, deload: true, stall, normal
  };
}

function normalAdvice(last, hasWeight, lo, hi) {
  const sets = last.sets;
  const rirs = (xs) => xs.every((s) => s.rir != null) ? xs.map((s) => s.rir) : null;
  if (!hasWeight || !last.weighted) {
    const reps = sets.map((s) => s.r);
    return Math.min(...reps) >= hi
      ? { text: `上次 ${reps.join('/')} 下，每組都到 ${hi} 下了 → 今天換較難的變化或放慢離心`, weight: null }
      : { text: `上次 ${reps.join('/')} 下 → 今天目標每組多 1 下（做到 ${hi} 下）`, weight: null };
  }
  const work = workingSets(sets);
  const top = topWeight(work);
  const inc = top >= 40 ? 2.5 : top >= 10 ? 1 : 0.5;
  const prev = `上次 ${top} kg × ${work.map((s) => s.r).join('/')}`;
  const need = last.old ? 1 : Math.max(1, last.planned - 1);
  const rr = rirs(work);
  const easy = rr && Math.min(...rr) >= 3; // 每組都還留 3 下以上
  if (work.length >= need && work.every((s) => s.r >= hi)) {
    if (easy) return { text: `${prev}，每組都到 ${hi} 下而且還留 3 下以上 → 今天直接加到 ${round(top + inc * 2)} kg`, weight: round(top + inc * 2) };
    return { text: `${prev}${last.old ? '' : `，每組都到 ${hi} 下`} → 今天加到 ${round(top + inc)} kg`, weight: round(top + inc) };
  }
  if (easy) return { text: `${prev}，每組都還留 3 下以上 → 今天同重量每組做到 ${hi} 下（留 1-2 下就好）`, weight: top };
  if (Math.max(...work.map((s) => s.r)) < lo) return { text: `${prev}，次數不到 ${lo}，今天降到 ${round(top * 0.9)} kg 把動作做好`, weight: round(top * 0.9) };
  return { text: `${prev} → 同重量，沒到 ${hi} 下的組多做 1 下；${last.old ? '' : '每組都到 '}${hi} 下就加重`, weight: top };
}

// 減量週裡每個動作的目標
export function deloadTarget(name, hasWeight, workouts) {
  const pre = exerciseHistory(name, workouts).find((h) => !h.deload);
  const w = hasWeight && pre && pre.weighted ? round(topWeight(workingSets(pre.sets)) * DELOAD_FACTOR) : null;
  return { text: `🌙 減量週：${w ? `${w} kg（平常的 9 成）、` : ''}組數減半、每組留 3 下，讓身體恢復`, weight: w };
}

// ---- 減量週 ----
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function addDays(date, n) { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDay(d); }
function mondayOf(date) { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoDay(d); }

export function deloadWeekRecord(workouts) { return workouts.find((w) => w.type === 'deloadweek') || null; }
export function activeDeloadWeek(workouts, today) {
  const d = deloadWeekRecord(workouts);
  return d && d.start <= today && today <= d.end ? d : null;
}

// 連續有重訓的週數（遇到沒練的一週或減量就重算）
export function trainingStreakWeeks(workouts, today) {
  const dl = deloadWeekRecord(workouts);
  const weeks = new Map();
  for (const w of workouts) {
    if (w.type !== 'strength' || !w.date) continue;
    const k = mondayOf(w.date);
    const v = weeks.get(k) || { n: 0, deload: false };
    v.n++; if (w.deload || (w.exercises || []).some((e) => e.deload)) v.deload = true;
    weeks.set(k, v);
  }
  if (dl) { const k = mondayOf(dl.start); weeks.set(k, { ...(weeks.get(k) || { n: 0 }), deload: true }); }
  let wk = mondayOf(today), n = 0;
  if (!weeks.get(wk)) wk = addDays(wk, -7); // 這週還沒練，從上週開始算
  for (;;) {
    const v = weeks.get(wk);
    if (!v || v.deload || !v.n) break;
    n++; wk = addDays(wk, -7);
  }
  return n;
}

// 首頁要不要建議減量週
export function deloadAdvice(workouts, today) {
  const recent = workouts.filter((w) => w.type === 'strength').slice(0, 9);
  const names = [...new Set(recent.flatMap((w) => w.exercises.map((e) => e.name)))];
  const stalled = names.map((name) => ({ name, ...stallInfo(exerciseHistory(name, workouts)) })).filter((x) => x.stalled).sort((a, b) => b.since - a.since);
  const weeks = trainingStreakWeeks(workouts, today);
  return { need: stalled.length >= 3 || weeks >= DELOAD_WEEKS, stalled, weeks };
}

// ---- 各肌群每週組數 ----
// 胸、背、腿每週 10-20 組正式組；肩、二頭、三頭 6-14 組。
// 二頭、三頭另外把複合動作算一半（背的組數 × 0.5 → 二頭、胸的組數 × 0.5 → 三頭）
export const MUSCLE_ORDER = ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'core'];
export const MUSCLE_TARGETS = { chest: [10, 20], back: [10, 20], legs: [10, 20], shoulders: [6, 14], biceps: [6, 14], triceps: [6, 14], core: null };
const INDIRECT = { biceps: 'back', triceps: 'chest' };
const LABEL_TO_KEY = Object.fromEntries(Object.entries(PART_LABELS).map(([k, v]) => [v, k]));
export function partKeyOf(e) { return e.partKey || LABEL_TO_KEY[e.part] || (PART_LABELS[e.part] ? e.part : null); }
export function workingSetCount(e) {
  if (Array.isArray(e.setsLog) && e.setsLog.length) return workingSets(e.setsLog).length;
  return e.reps > 0 ? (e.setsDone || 1) : 0;
}
// from / to：日期字串（含頭尾）
export function muscleSets(workouts, from, to) {
  const out = Object.fromEntries(MUSCLE_ORDER.map((k) => [k, 0]));
  for (const w of workouts) {
    if (w.type !== 'strength' || !w.date || w.date < from || w.date > to) continue;
    for (const e of w.exercises) { const k = partKeyOf(e); if (k && k in out) out[k] += workingSetCount(e); }
  }
  return out;
}
export function muscleReport(workouts, today) {
  const now = muscleSets(workouts, addDays(today, -6), today);
  const four = muscleSets(workouts, addDays(today, -27), today);
  const total = (m, k) => m[k] + (INDIRECT[k] ? m[INDIRECT[k]] * 0.5 : 0);
  return MUSCLE_ORDER.map((k) => {
    const t = MUSCLE_TARGETS[k], n = Math.round(total(now, k) * 2) / 2, avg = Math.round(total(four, k) / 4 * 10) / 10;
    const status = !t ? 'none' : n < t[0] ? 'low' : n > t[1] ? 'high' : 'ok';
    return { key: k, label: PART_LABELS[k], sets: n, direct: now[k], indirect: INDIRECT[k] ? now[INDIRECT[k]] * 0.5 : 0, avg4: avg, target: t, status };
  }).filter((x) => x.target || x.sets);
}

// 各肌群每週組數（週一到週日），最近 n 週，舊到新；最後一週是這週（還沒過完）
export function weeklyMuscleSeries(workouts, today, n = 12) {
  const d = new Date(`${today}T00:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const mon = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const weeks = Array.from({ length: n }, (_, i) => addDays(mon, (i - n + 1) * 7));
  const per = weeks.map((w) => muscleSets(workouts, w, addDays(w, 6)));
  const data = Object.fromEntries(MUSCLE_ORDER.map((k) => [k, per.map((m) => Math.round((m[k] + (INDIRECT[k] ? m[INDIRECT[k]] * 0.5 : 0)) * 2) / 2)]));
  return { weeks, data };
}
