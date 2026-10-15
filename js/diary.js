// 飲食日記：早餐 / 午餐 / 晚餐 / 點心，加上「我的食物」、組合、營養標示與條碼
import { FOODS, itemNutrition } from './meals.js';

export const SLOTS = [
  { key: 'breakfast', label: '早餐', icon: '🌅' },
  { key: 'lunch', label: '午餐', icon: '☀️' },
  { key: 'dinner', label: '晚餐', icon: '🌙' },
  { key: 'snack', label: '點心', icon: '🍪' }
];
export const SLOT_LABEL = Object.fromEntries(SLOTS.map((s) => [s.key, s.label]));

const r1 = (n) => Math.round((+n || 0) * 10) / 10;
export const fmtQty = (v) => (v === 0.5 ? '½' : String(r1(v)));
export function newId(prefix) { return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; }

// ---- 時段 ----
export function slotOfMeal(m) {
  if (m.slot) return m.slot;
  const n = m.name || '';
  if (/早/.test(n)) return 'breakfast';
  if (/晚/.test(n)) return 'dinner';
  if (/點|下午|宵/.test(n)) return 'snack';
  return 'lunch';
}
export function slotByTime(hm) {
  const [h, m] = String(hm || '12:00').split(':').map(Number);
  const t = h * 60 + (m || 0);
  return t < 630 ? 'breakfast' : t < 870 ? 'lunch' : t < 1020 ? 'snack' : t < 1260 ? 'dinner' : 'snack';
}
export function slotOfEntry(x, meals = []) {
  if (x.slot) return x.slot;
  if (x.mealIndex != null && meals[x.mealIndex]) return slotOfMeal(meals[x.mealIndex]);
  return slotByTime(x.time);
}
export function slotNow() { const d = new Date(); return slotByTime(`${d.getHours()}:${d.getMinutes()}`); }

// ---- 一天的日記 ----
export function sumItems(items) {
  const t = { kcal: 0, p: 0, f: 0, c: 0 };
  items.forEach((it) => { t.kcal += +it.kcal || 0; t.p += +it.p || 0; t.f += +it.f || 0; t.c += +it.c || 0; });
  return { kcal: Math.round(t.kcal), p: r1(t.p), f: r1(t.f), c: r1(t.c) };
}
// 建議菜單上「照吃 / 吃比較少」的餐 → 日記項目
export function planMealItems(m) {
  if (!m || !m.eaten || ['skip', 'other'].includes(m.eaten)) return [];
  return m.items.map((it) => {
    const g = m.eaten === 'partial' ? (it.ate ?? it.grams) : it.grams;
    const n = itemNutrition(it.food, g);
    return { name: it.food, grams: Math.round(g), unit: 'g', kcal: Math.round(n.kcal), p: r1(n.p), f: r1(n.f), c: r1(n.c), fromPlan: true };
  }).filter((x) => x.grams > 0);
}
export function dayDiary(rec) {
  const meals = rec?.meals || [], extras = rec?.extras || [];
  const out = Object.fromEntries(SLOTS.map((s) => [s.key, { items: [], plan: [] }]));
  meals.forEach((m, mi) => {
    const s = slotOfMeal(m);
    out[s].plan.push(mi);
    planMealItems(m).forEach((it) => out[s].items.push({ ...it, ref: { meal: mi } }));
  });
  extras.forEach((x, xi) => {
    const s = slotOfEntry(x, meals);
    (x.items || []).forEach((it, ii) => out[s].items.push({ ...it, ref: { extra: xi, item: ii } }));
  });
  for (const k in out) out[k].total = sumItems(out[k].items);
  return out;
}
export function cleanItem(it) {
  const o = {};
  ['name', 'grams', 'servings', 'unit', 'kcal', 'p', 'f', 'c', 'foodId'].forEach((k) => { if (it[k] !== undefined && it[k] !== null && it[k] !== '') o[k] = it[k]; });
  return o;
}
export function amountText(it) {
  const u = it.unit || 'g';
  if (it.servings != null) return `${fmtQty(it.servings)} 份${it.grams ? `（${r1(it.grams)} ${u}）` : ''}`;
  return it.grams ? `${r1(it.grams)} ${u}` : '';
}
// 改份量 → 營養素照比例
export function scaleItem(it, v) {
  const byServing = it.servings != null;
  const old = byServing ? it.servings : it.grams;
  if (!old || !(v > 0)) return it;
  const k = v / old;
  return {
    ...it, ...(byServing ? { servings: r1(v), ...(it.grams ? { grams: r1(it.grams * k) } : {}) } : { grams: r1(v) }),
    kcal: Math.round(it.kcal * k), p: r1(it.p * k), f: r1(it.f * k), c: r1(it.c * k)
  };
}

// ---- 我的食物、組合 ----
export function foodsOf(records) { return records.filter((r) => r.type === 'food'); }
export function combosOf(records) { return records.filter((r) => r.type === 'combo'); }
export function builtinFoods() {
  return Object.entries(FOODS).map(([name, f]) => ({
    id: `builtin:${name}`, builtin: true, kind: 'food', name, servingGrams: 100, unit: 'g',
    per: { kcal: Math.round(f.p * 4 + f.f * 9 + f.c * 4), p: f.p, f: f.f, c: f.c }, unitHint: f.unit || null
  }));
}
export function searchFoods(records, query) {
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
  const qq = norm(query);
  const hit = (x) => !qq || norm(x.name).includes(qq) || norm(x.brand).includes(qq) || (x.barcode && x.barcode === qq);
  const mine = [...foodsOf(records).map((x) => ({ ...x, kind: 'food' })), ...combosOf(records).map((x) => ({ ...x, kind: 'combo' }))].filter(hit);
  if (!qq) {
    mine.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
    return { sections: mine.length ? [{ key: 'recent', title: '最近吃過', items: mine.slice(0, 25) }] : [] };
  }
  mine.sort((a, b) => (b.uses || 0) - (a.uses || 0) || (b.lastUsed || 0) - (a.lastUsed || 0));
  const builtin = builtinFoods().filter(hit);
  return { sections: [mine.length && { key: 'mine', title: '我的食物', items: mine.slice(0, 30) }, builtin.length && { key: 'builtin', title: '常見食材（每 100 g，煮熟）', items: builtin }].filter(Boolean) };
}
// 吃了多少 → 一個日記項目；mode：serving 份 / gram 公克（毫升）
export function portion(food, qty, mode) {
  const sg = Number(food.servingGrams) || 0;
  const k = mode === 'gram' ? (sg ? qty / sg : 0) : qty;
  const per = food.per || {};
  return {
    name: food.name, unit: food.unit || 'g',
    ...(mode === 'gram' ? { grams: r1(qty) } : { servings: r1(qty), ...(sg ? { grams: r1(qty * sg) } : {}) }),
    kcal: Math.round((+per.kcal || 0) * k), p: r1((+per.p || 0) * k), f: r1((+per.f || 0) * k), c: r1((+per.c || 0) * k),
    ...(food.builtin ? {} : { foodId: food.id })
  };
}

// ---- 營養標示 / 條碼 ----
export function foodFromLabel(r) {
  const unit = /ml|毫升|cc/i.test(r.unit || '') ? 'ml' : 'g';
  return {
    name: (r.name || '').trim(), brand: (r.brand || '').trim(), servingGrams: +r.servingGrams || 100, unit,
    servingsPerPack: +r.servingsPerPack || null,
    per: { kcal: r1(r.kcal), p: r1(r.protein), f: r1(r.fat), c: r1(r.carb) },
    barcode: String(r.barcode || '').replace(/\D/g, ''), source: 'label'
  };
}
export function foodFromOFF(p, code) {
  const n = p.nutriments || {};
  const kcal100 = +n['energy-kcal_100g'] || (n.energy_100g ? n.energy_100g / 4.184 : 0);
  const per100 = { kcal: kcal100, p: +n.proteins_100g || 0, f: +n.fat_100g || 0, c: +n.carbohydrates_100g || 0 };
  if (!per100.kcal && !per100.p && !per100.f && !per100.c) return null;
  const sq = +p.serving_quantity || 0;
  const k = sq ? sq / 100 : 1;
  return {
    name: (p.product_name_zh || p.product_name || '').trim(), brand: String(p.brands || '').split(',')[0].trim(),
    servingGrams: sq || 100, unit: 'g', servingsPerPack: null,
    per: { kcal: r1(per100.kcal * k), p: r1(per100.p * k), f: r1(per100.f * k), c: r1(per100.c * k) },
    barcode: code, source: 'off'
  };
}
