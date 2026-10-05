// 體重紀錄 → TDEE（每日總消耗）與三大營養素建議。
// 每次記錄體重或存一次訓練，畫面重算一次：
//   BMR：Mifflin-St Jeor 公式（有體脂率時改用 Katch-McArdle，用去脂體重算比較準）
//   活動係數：依最近 4 週「實際訓練次數」換算每週頻率，再加上平常的活動量
//   目標熱量：減脂 −20%、維持、增肌 +10%
//   三大營養素：每個目標有自己的比例（蛋白質 / 脂肪 / 碳水 佔熱量 %），
//   再用體重檢查：蛋白質限制在該目標的 g/kg 範圍內、脂肪不低於 0.6 g/kg，多出或不足的熱量由碳水補

export const GOALS_BODY = {
  // ratio：蛋白質 / 脂肪 / 碳水 佔總熱量的比例；pRange：蛋白質每公斤體重的上下限
  cut:      { label: '減脂', kcal: 0.8, ratio: { p: 35, f: 25, c: 40 }, pRange: [2.0, 2.6],
              desc: '熱量 −20%，蛋白質拉高保住肌肉，碳水減少',
              why: '熱量赤字時肌肉容易流失，所以蛋白質比例最高；脂肪維持荷爾蒙所需，碳水留給訓練前後。' },
  maintain: { label: '維持', kcal: 1.0, ratio: { p: 30, f: 25, c: 45 }, pRange: [1.6, 2.2],
              desc: '吃到消耗量，三大營養素均衡',
              why: '熱量打平，蛋白質足夠修復即可，碳水支撐訓練表現。' },
  bulk:     { label: '增肌', kcal: 1.1, ratio: { p: 25, f: 20, c: 55 }, pRange: [1.6, 2.2],
              desc: '熱量 +10%，碳水拉高支撐訓練量',
              why: '熱量盈餘時蛋白質不需要太高，多的熱量給碳水，訓練量和恢復都比較好，也比較不容易長脂肪。' }
};
export const DAILY_ACTIVITY = {
  sit:   { label: '久坐（辦公室、讀書）', add: 0 },
  walk:  { label: '常走動（站著工作、通勤走路）', add: 0.05 },
  labor: { label: '勞力工作', add: 0.1 }
};

const isTraining = (w) => w.type === 'strength' || w.type === 'cardio';
const DAY = 86400000;
const toDate = (s) => new Date(`${s}T00:00:00`);

export function weightEntries(records) {
  return records.filter((r) => r.type === 'weight' && r.kg > 0).sort((a, b) => a.date.localeCompare(b.date));
}
export function getProfile(records) {
  return records.find((r) => r.type === 'profile') || null;
}

// 最近 4 週平均每週訓練次數（紀錄不滿 4 週就用實際天數換算，至少算 1 週）
export function weeklyFrequency(records, today = new Date()) {
  const trains = records.filter(isTraining);
  if (!trains.length) return { perWeek: 0, count: 0, days: 28 };
  const from = new Date(today.getTime() - 28 * DAY);
  const recent = trains.filter((w) => toDate(w.date) >= from);
  const first = trains.map((w) => toDate(w.date)).sort((a, b) => a - b)[0];
  const days = Math.max(7, Math.min(28, Math.round((today - Math.max(first, from)) / DAY) + 1));
  return { perWeek: Math.round((recent.length / days) * 7 * 10) / 10, count: recent.length, days };
}
export function exerciseFactor(perWeek) {
  if (perWeek < 1) return 1.2;
  if (perWeek < 3) return 1.375;
  if (perWeek < 5) return 1.55;
  if (perWeek < 7) return 1.725;
  return 1.9;
}

// 用最近 7 天的平均體重（沒有就用最新一筆），減少每天水分波動的影響
export function currentWeight(entries) {
  if (!entries.length) return null;
  const last = entries[entries.length - 1];
  const from = toDate(last.date).getTime() - 6 * DAY;
  const wk = entries.filter((e) => toDate(e.date).getTime() >= from);
  const avg = wk.reduce((s, e) => s + e.kg, 0) / wk.length;
  return { kg: Math.round(avg * 10) / 10, latest: last.kg, n: wk.length, bodyFat: [...entries].reverse().find((e) => e.bodyFat > 0)?.bodyFat || null };
}
// 每週變化：比較最近 7 天平均和 14-7 天前的平均
export function weeklyChange(entries) {
  if (entries.length < 2) return null;
  const end = toDate(entries[entries.length - 1].date).getTime();
  const avg = (a, b) => { const xs = entries.filter((e) => { const t = toDate(e.date).getTime(); return t > end - b * DAY && t <= end - a * DAY; }); return xs.length ? xs.reduce((s, e) => s + e.kg, 0) / xs.length : null; };
  const now = avg(0, 7), before = avg(7, 14);
  if (now == null || before == null) return null;
  return Math.round((now - before) * 100) / 100;
}

export function computePlan(records, today = new Date()) {
  const p = getProfile(records);
  const entries = weightEntries(records);
  const cw = currentWeight(entries);
  if (!p || !p.height || !p.age || !p.sex || !cw) return { missing: !p || !p.height || !p.age || !p.sex ? 'profile' : 'weight' };
  const w = cw.kg;
  const bf = cw.bodyFat;
  const lbm = bf ? w * (1 - bf / 100) : null;
  const bmr = Math.round(lbm ? 370 + 21.6 * lbm : 10 * w + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161));
  const freq = weeklyFrequency(records, today);
  const ex = exerciseFactor(freq.perWeek);
  const factor = Math.round((ex + (DAILY_ACTIVITY[p.activity || 'sit']?.add || 0)) * 1000) / 1000;
  const tdee = Math.round(bmr * factor);
  const goal = GOALS_BODY[p.goal || 'maintain'];
  const target = Math.round((tdee * goal.kcal) / 10) * 10;
  // 先照目標比例分配，再用體重檢查蛋白質和脂肪是否合理
  const r = goal.ratio;
  const [pMin, pMax] = goal.pRange;
  let protein = Math.round((target * r.p / 100) / 4);
  protein = Math.round(Math.min(Math.max(protein, w * pMin), w * pMax));
  let fat = Math.round((target * r.f / 100) / 9);
  if (fat < w * 0.6) fat = Math.round(w * 0.6);
  const carb = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));
  return {
    weight: cw, bmr, bmrFormula: lbm ? `Katch-McArdle（去脂體重 ${Math.round(lbm * 10) / 10} kg）` : 'Mifflin-St Jeor',
    freq, exFactor: ex, factor, tdee, goal, goalKey: p.goal || 'maintain', target,
    macros: { protein, fat, carb },
    perKg: { protein: Math.round((protein / w) * 10) / 10, fat: Math.round((fat / w) * 10) / 10, carb: Math.round((carb / w) * 10) / 10 },
    pct: { protein: Math.round((protein * 4 / target) * 100), fat: Math.round((fat * 9 / target) * 100), carb: Math.round((carb * 4 / target) * 100) },
    weeklyChange: weeklyChange(entries)
  };
}

// 依體重趨勢給的調整建議（每 1-2 週看趨勢，不要只看熱量差）
export function trendAdvice(plan) {
  const c = plan.weeklyChange;
  if (c == null) return '記錄滿兩週後，會依體重趨勢提醒你要不要調整。';
  const pctWk = (c / plan.weight.kg) * 100;
  if (plan.goalKey === 'cut') {
    if (pctWk > -0.25) return `這週體重變化 ${c > 0 ? '+' : ''}${c} kg，掉得比預期慢，可以把碳水少吃 20-30 g 或多一次有氧。`;
    if (pctWk < -1) return `這週掉了 ${-c} kg，超過體重 1%，太快容易掉肌肉，可以加回 20-30 g 碳水。`;
    return `這週 ${c} kg，速度剛好（每週約掉體重 0.5-1%）。`;
  }
  if (plan.goalKey === 'bulk') {
    if (pctWk < 0.1) return `這週 ${c > 0 ? '+' : ''}${c} kg，幾乎沒漲，可以多吃 20-30 g 碳水。`;
    if (pctWk > 0.5) return `這週 +${c} kg，漲太快容易長脂肪，可以少吃 20-30 g 碳水。`;
    return `這週 +${c} kg，速度剛好（每週約漲體重 0.25-0.5%）。`;
  }
  return Math.abs(pctWk) <= 0.3 ? `這週 ${c > 0 ? '+' : ''}${c} kg，維持得很穩。` : `這週 ${c > 0 ? '+' : ''}${c} kg，若不是刻意的，可以微調碳水 20-30 g。`;
}
