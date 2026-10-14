// 每週回顧：整理最近 7 天的訓練、體重、飲食，給本機規則或 Gemini 寫建議
import { computePlan, trendAdvice, weightEntries } from './nutrition.js';
import { eatenTotals } from './meals.js';
import { exerciseHistory, deloadAdvice, muscleReport, addDays } from './progression.js';

const r1 = (x) => Math.round(x * 10) / 10;
const avg = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const SPLIT_OF = { chest: '第一天', shoulders: '第一天（中束）/ 第二天（後束）', triceps: '第一天', back: '第二天', biceps: '第二天', legs: '第三天' };

export function weeklyData(records, today) {
  const from = addDays(today, -6);
  const inP = (w) => w.date >= from && w.date <= today;
  const strength = records.filter((w) => w.type === 'strength' && inP(w));
  const cardio = records.filter((w) => w.type === 'cardio' && inP(w));
  const prevCount = records.filter((w) => (w.type === 'strength' || w.type === 'cardio') && w.date >= addDays(today, -13) && w.date < from).length;

  const names = [...new Set(strength.flatMap((w) => w.exercises.map((e) => e.name)))];
  const progress = names.map((name) => {
    const hist = exerciseHistory(name, records);
    const now = hist.filter((h) => h.date >= from && h.date <= today);
    const before = hist.filter((h) => h.date < from);
    if (!now.length) return null;
    const weighted = now.some((h) => h.weighted);
    const nb = Math.max(...now.map((h) => h.best));
    const unit = (v) => weighted ? `估 1RM ${r1(v)} kg` : `最多 ${v} 下`;
    if (!before.length) return { name, status: 'new', text: `第一次紀錄，${unit(nb)}` };
    const pb = Math.max(...before.map((h) => h.best));
    const status = nb > pb ? 'pr' : nb >= before[0].best ? 'same' : 'down';
    return { name, status, text: `${unit(nb)}（之前最佳 ${weighted ? r1(pb) : pb}）` };
  }).filter(Boolean);

  const dl = deloadAdvice(records, today);
  const muscles = muscleReport(records, today);
  const plan = computePlan(records, new Date(`${today}T12:00:00`));
  const weight = plan.missing ? null : { kg: plan.weight.kg, change: plan.weeklyChange, goal: plan.goal.label, goalKey: plan.goalKey, advice: trendAdvice(plan) };
  const weighIns = weightEntries(records).filter(inP).length;

  const days = records.filter((r) => r.type === 'mealplan' && inP(r)).map((r) => {
    const t = eatenTotals(r.meals || [], r.extras || []);
    return { kcal: t.kcal, p: t.p, target: Number(r.target) || (plan.missing ? 0 : plan.target), pTarget: r.macros?.protein || (plan.missing ? 0 : plan.macros.protein) };
  }).filter((x) => x.kcal > 0);
  const nutrition = days.length ? {
    days: days.length, kcal: Math.round(avg(days.map((x) => x.kcal))), target: Math.round(avg(days.map((x) => x.target))),
    protein: Math.round(avg(days.map((x) => x.p))), proteinTarget: Math.round(avg(days.map((x) => x.pTarget)))
  } : null;

  return { from, to: today, strength: strength.length, cardio: cardio.length, prevCount, progress, stalled: dl.stalled, deloadNeed: dl.need, streakWeeks: dl.weeks, muscles, weight, weighIns, nutrition };
}

// 沒有 Gemini 時的本機規則
export function localReview(d) {
  const good = [], improve = [], actions = [];
  const prs = d.progress.filter((x) => x.status === 'pr');
  const total = d.strength + d.cardio;
  if (d.strength >= 3) good.push(`重訓 ${d.strength} 次，三分化完整跑完一輪以上`);
  else if (d.strength) improve.push(`重訓只有 ${d.strength} 次，三分化一輪要 3 次`);
  else improve.push('這 7 天沒有重訓');
  prs.slice(0, 3).forEach((x) => good.push(`${x.name} 破紀錄：${x.text}`));
  d.progress.filter((x) => x.status === 'down').slice(0, 2).forEach((x) => improve.push(`${x.name} 比之前退步：${x.text}`));
  if (d.stalled.length) {
    improve.push(`停滯中：${d.stalled.slice(0, 3).map((x) => x.name).join('、')}`);
    actions.push(d.deloadNeed ? '到首頁開始一週減量週，讓身體恢復再衝' : '停滯的動作下次練到會自動減量一次，照著做就好');
  } else if (d.deloadNeed) actions.push(`已經連續練了 ${d.streakWeeks} 週，安排一週減量（首頁有按鈕）`);
  const low = d.muscles.filter((x) => x.status === 'low' && x.target);
  const high = d.muscles.filter((x) => x.status === 'high');
  const ok = d.muscles.filter((x) => x.status === 'ok');
  if (ok.length >= 4) good.push(`${ok.map((x) => x.label).join('、')} 組數都在建議範圍`);
  if (low.length && d.strength >= 3) {
    improve.push(`組數不夠：${low.map((x) => `${x.label} ${x.sets} 組`).join('、')}（建議 ${low[0].target.join('-')} 組）`);
    const x = low[0];
    actions.push(`${x.label}（${SPLIT_OF[x.key] || ''}）每個動作加 1 組，目標每週 ${x.target[0]} 組以上`);
  }
  if (high.length) improve.push(`組數偏多：${high.map((x) => `${x.label} ${x.sets} 組`).join('、')}，恢復不過來會停滯`);
  if (d.weight) {
    if (d.weight.change != null) actions.push(d.weight.advice);
    if (d.weighIns < 3) improve.push(`體重只量了 ${d.weighIns} 天，每天早上量一次趨勢才準`);
  } else improve.push('還沒有個人資料或體重，算不出熱量目標');
  const n = d.nutrition;
  if (n) {
    if (n.proteinTarget && n.protein < n.proteinTarget * 0.9) { improve.push(`蛋白質平均 ${n.protein} g，目標 ${n.proteinTarget} g`); actions.push(`每天多一份蛋白質（約 ${n.proteinTarget - n.protein} g，例如一盒無糖豆漿 + 一顆蛋，或一塊雞胸）`); }
    else if (n.proteinTarget) good.push(`蛋白質平均 ${n.protein} g，有達標`);
    if (n.target) {
      const diff = n.kcal - n.target;
      if (Math.abs(diff) > n.target * 0.1) improve.push(`熱量平均 ${n.kcal} kcal，目標 ${n.target}（${diff > 0 ? '多' : '少'} ${Math.abs(diff)}）`);
      else good.push(`熱量平均 ${n.kcal} kcal，接近目標 ${n.target}`);
    }
    if (n.days < 4) improve.push(`飲食只記了 ${n.days} 天，多記幾天建議才準`);
  } else improve.push('這 7 天沒有記錄飲食');
  const summary = `最近 7 天：重訓 ${d.strength} 次、有氧 ${d.cardio} 次${prs.length ? `，${prs.length} 個動作破紀錄` : ''}${d.weight && d.weight.change != null ? `；體重 ${d.weight.kg} kg（週變化 ${d.weight.change > 0 ? '+' : ''}${d.weight.change}）` : ''}${total < d.prevCount ? '，比前一週少練' : ''}。`;
  return { summary, good: good.slice(0, 4), improve: improve.slice(0, 5), actions: actions.slice(0, 4) };
}

// 給 Gemini 看的資料
export function reviewDataText(d) {
  const lines = [
    `期間：${d.from} ~ ${d.to}`,
    `訓練：重訓 ${d.strength} 次、有氧 ${d.cardio} 次（前一週共 ${d.prevCount} 次）；連續訓練 ${d.streakWeeks} 週沒減量`,
    `三分化：第一天胸 + 肩中束 + 三頭、第二天背 + 肩後束 + 二頭、第三天腿`,
    `各動作：${d.progress.map((x) => `${x.name}［${{ pr: '破紀錄', same: '持平', down: '退步', new: '新動作' }[x.status]}］${x.text}`).join('；') || '無'}`,
    `停滯中（連續 3 次以上沒進步）：${d.stalled.map((x) => `${x.name} ${x.since} 次`).join('、') || '無'}`,
    `各肌群最近 7 天正式組數：${d.muscles.map((x) => `${x.label} ${x.sets} 組（建議 ${x.target ? x.target.join('-') : '無'}，4 週平均 ${x.avg4}）`).join('、')}`,
    d.weight ? `體重：目標${d.weight.goal}，7 天平均 ${d.weight.kg} kg，週變化 ${d.weight.change ?? '資料不足'} kg，這週量了 ${d.weighIns} 天` : '體重：沒有資料',
    d.nutrition ? `飲食（記了 ${d.nutrition.days} 天）：平均 ${d.nutrition.kcal} kcal / 目標 ${d.nutrition.target}；蛋白質 ${d.nutrition.protein} g / 目標 ${d.nutrition.proteinTarget} g` : '飲食：沒有紀錄'
  ];
  return lines.join('\n');
}
