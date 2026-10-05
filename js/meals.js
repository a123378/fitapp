// 飲食菜單：依體重頁算出的熱量與三大營養素，排出一天要吃什麼、各吃多少克。
// 營養數字一律用這裡的食物表計算（AI 只負責挑食物和份量，數字由程式算，才不會亂掉）。
// 數值為每 100 g「可食用、煮熟後」的近似值（參考衛福部食品營養成分資料庫的常見數字）。
// cat：protein 主要蛋白質、carb 主食、veg 蔬菜、fat 油脂堅果、fruit 水果、dairy 乳品／豆漿
// unit：[單位名稱, 每單位克數]，用來顯示「約 2 顆」

export const FOODS = {
  '雞胸肉':       { cat: 'protein', p: 31, f: 3.6, c: 0 },
  '去皮雞腿肉':   { cat: 'protein', p: 26, f: 8, c: 0 },
  '豬里肌':       { cat: 'protein', p: 27, f: 7, c: 0 },
  '牛腱':         { cat: 'protein', p: 30, f: 6, c: 0 },
  '鮭魚':         { cat: 'protein', p: 22, f: 13, c: 0 },
  '鯛魚片':       { cat: 'protein', p: 20, f: 2, c: 0 },
  '鮪魚罐頭（水煮）': { cat: 'protein', p: 25, f: 1, c: 0, unit: ['罐', 120] },
  '蝦仁':         { cat: 'protein', p: 22, f: 1, c: 0 },
  '雞蛋':         { cat: 'protein', p: 12.5, f: 10, c: 1, unit: ['顆', 55] },
  '豆干':         { cat: 'protein', p: 17, f: 8, c: 3, unit: ['片', 35] },
  '板豆腐':       { cat: 'protein', p: 8.5, f: 4, c: 2, unit: ['盒', 300] },
  '乳清蛋白粉':   { cat: 'protein', p: 78, f: 6, c: 8, unit: ['匙', 30] },
  '白飯':         { cat: 'carb', p: 3, f: 0.3, c: 31, unit: ['碗', 200] },
  '糙米飯':       { cat: 'carb', p: 3, f: 1, c: 30, unit: ['碗', 200] },
  '燕麥片（乾）': { cat: 'carb', p: 13, f: 7, c: 66 },
  '全麥吐司':     { cat: 'carb', p: 10, f: 4, c: 45, unit: ['片', 35] },
  '地瓜':         { cat: 'carb', p: 1.5, f: 0.2, c: 28 },
  '馬鈴薯':       { cat: 'carb', p: 2, f: 0.1, c: 17 },
  '義大利麵（熟）': { cat: 'carb', p: 5.5, f: 1, c: 30 },
  '烏龍麵':       { cat: 'carb', p: 3, f: 0.5, c: 22, unit: ['包', 200] },
  '饅頭':         { cat: 'carb', p: 8, f: 1.5, c: 50, unit: ['個', 90] },
  '綠色蔬菜':     { cat: 'veg', p: 1.5, f: 0.3, c: 3.5 },
  '花椰菜':       { cat: 'veg', p: 3, f: 0.3, c: 5 },
  '番茄':         { cat: 'veg', p: 0.9, f: 0.2, c: 4, unit: ['顆', 150] },
  '香蕉':         { cat: 'fruit', p: 1.3, f: 0.2, c: 22, unit: ['根', 120] },
  '蘋果':         { cat: 'fruit', p: 0.3, f: 0.2, c: 14, unit: ['顆', 200] },
  '芭樂':         { cat: 'fruit', p: 0.8, f: 0.1, c: 10, unit: ['顆', 200] },
  '無糖豆漿':     { cat: 'dairy', p: 3.6, f: 1.9, c: 1.5, unit: ['杯', 400] },
  '鮮奶':         { cat: 'dairy', p: 3.2, f: 3.6, c: 4.8, unit: ['杯', 240] },
  '無糖希臘優格': { cat: 'dairy', p: 9, f: 3, c: 4, unit: ['盒', 150] },
  '橄欖油':       { cat: 'fat', p: 0, f: 100, c: 0, unit: ['茶匙', 5] },
  '無調味堅果':   { cat: 'fat', p: 18, f: 55, c: 18, unit: ['小把', 15] },
  '酪梨':         { cat: 'fat', p: 2, f: 15, c: 8, unit: ['顆', 150] },
  '花生醬（無糖）': { cat: 'fat', p: 25, f: 50, c: 20, unit: ['湯匙', 16] }
};

export const MEAL_SETS = {
  3: [{ name: '早餐', share: 0.3 }, { name: '午餐', share: 0.35 }, { name: '晚餐', share: 0.35 }],
  4: [{ name: '早餐', share: 0.25 }, { name: '午餐', share: 0.3 }, { name: '點心', share: 0.15 }, { name: '晚餐', share: 0.3 }]
};

const r5 = (g) => Math.max(0, Math.round(g / 5) * 5);
const kcalOf = (f) => f.p * 4 + f.f * 9 + f.c * 4;

export function itemNutrition(food, grams) {
  const f = FOODS[food];
  if (!f) return { p: 0, f: 0, c: 0, kcal: 0 };
  const k = grams / 100;
  return { p: f.p * k, f: f.f * k, c: f.c * k, kcal: kcalOf(f) * k };
}
export function unitText(food, grams) {
  const u = FOODS[food]?.unit;
  if (!u || !grams) return '';
  const n = Math.round((grams / u[1]) * 2) / 2;
  return n > 0 ? `約 ${n} ${u[0]}` : '';
}
export function totalsOf(meals) {
  const t = { p: 0, f: 0, c: 0, kcal: 0 };
  for (const m of meals) for (const it of m.items) {
    const n = itemNutrition(it.food, it.grams);
    t.p += n.p; t.f += n.f; t.c += n.c; t.kcal += n.kcal;
  }
  return { p: Math.round(t.p), f: Math.round(t.f), c: Math.round(t.c), kcal: Math.round(t.kcal) };
}

// 把各類食物的克數調到接近目標：蛋白質類、主食水果類、油脂類各乘一個倍數，
// 三個倍數一起解（三條方程式：蛋白質、脂肪、碳水），蔬菜和乳品份量不動
const GROUPS = [['protein'], ['carb', 'fruit'], ['fat']];
function groupVec(meals, cats) {
  const v = [0, 0, 0];
  meals.forEach((m) => m.items.forEach((it) => { if (!it.fixed && cats.includes(FOODS[it.food]?.cat)) { const n = itemNutrition(it.food, it.grams); v[0] += n.p; v[1] += n.f; v[2] += n.c; } }));
  return v;
}
function solve(A, b) {
  // 高斯消去法，A 為 n×n
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i++) {
    let piv = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[piv][i])) piv = k;
    if (Math.abs(M[piv][i]) < 1e-9) return null;
    [M[i], M[piv]] = [M[piv], M[i]];
    for (let k = 0; k < n; k++) if (k !== i) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
export function fitToTarget(meals, macros) {
  const t = [macros.protein, macros.fat, macros.carb];
  const vecs = GROUPS.map((g) => groupVec(meals, g));
  const fixed = [0, 0, 0];
  meals.forEach((m) => m.items.forEach((it) => { if (it.fixed || !GROUPS.flat().includes(FOODS[it.food]?.cat)) { const n = itemNutrition(it.food, it.grams); fixed[0] += n.p; fixed[1] += n.f; fixed[2] += n.c; } }));
  const rhs = t.map((x, i) => x - fixed[i]);
  let sc = [1, 1, 1];
  const active = [0, 1, 2].filter((g) => vecs[g].some((x) => x > 0));
  const trySolve = (act, rows) => {
    const A = rows.map((r) => act.map((g) => vecs[g][r]));
    const x = solve(A, rows.map((r) => rhs[r]));
    if (!x || x.some((v) => v < 0)) return null;
    const out = [1, 1, 1]; act.forEach((g, i) => { out[g] = x[i]; }); return out;
  };
  // 先三個一起解；解不出來（例如肉本身的油就超過脂肪目標）就把油脂類拿掉，只對蛋白質和碳水解
  sc = (active.length === 3 && trySolve([0, 1, 2], [0, 1, 2]))
    || (() => { const a = active.filter((g) => g !== 2); const r = trySolve(a, a.map((g) => (g === 0 ? 0 : 2))); if (r && active.includes(2)) r[2] = 0.3; return r; })()
    || [1, 1, 1];
  sc = sc.map((x, i) => Math.min(i === 2 ? 6 : 3, Math.max(0, x)));
  meals.forEach((m) => m.items.forEach((it) => {
    const gi = GROUPS.findIndex((g) => g.includes(FOODS[it.food]?.cat));
    if (gi >= 0 && !it.fixed) it.grams = it.grams * sc[gi];
  }));
  meals.forEach((m) => m.items.forEach((it) => {
    const u = FOODS[it.food]?.unit;
    // 有固定單位且單位小的（蛋、吐司、湯匙）取到半個單位，其他取 5 g
    it.grams = u && u[1] <= 60 ? Math.round(it.grams / (u[1] / 2)) * (u[1] / 2) : r5(it.grams);
  }));
  meals.forEach((m) => { m.items = m.items.filter((it) => it.grams > 0); });
  return meals;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function allowed(cat, avoid) {
  return Object.keys(FOODS).filter((n) => FOODS[n].cat === cat && !avoid.some((a) => a && n.includes(a)));
}
function avoidList(prefs) {
  return (prefs || '').split(/[、,，\s]+/).map((s) => s.replace(/^不吃|^不要|^沒有/, '').trim()).filter((s) => s.length >= 1 && s.length <= 6);
}

// 沒有 Gemini key 時的本機規則：每餐 1 份蛋白質 + 1 份主食 + 蔬菜（早餐和點心換成乳品／水果），最後由 fitToTarget 調份量
export function localMealPlan({ macros, mealCount = 3, prefs = '' }) {
  const avoid = avoidList(prefs);
  const P = allowed('protein', avoid), C = allowed('carb', avoid), V = allowed('veg', avoid),
        D = allowed('dairy', avoid), Fr = allowed('fruit', avoid), Fa = allowed('fat', avoid);
  const used = new Set();
  const fresh = (list) => { const l = list.filter((x) => !used.has(x)); const x = pick(l.length ? l : list); used.add(x); return x; };
  const meals = MEAL_SETS[mealCount].map((m) => {
    const pG = (macros.protein * m.share), cG = (macros.carb * m.share);
    const items = [];
    if (m.name === '早餐') {
      const bc = fresh(C.filter((n) => ['燕麥片（乾）', '全麥吐司', '饅頭', '地瓜'].includes(n)).length ? C.filter((n) => ['燕麥片（乾）', '全麥吐司', '饅頭', '地瓜'].includes(n)) : C);
      const egg = P.includes('雞蛋') ? '雞蛋' : fresh(P);
      items.push({ food: egg, grams: 110, fixed: true }, { food: bc, grams: (cG * 0.7) / FOODS[bc].c * 100 });
      if (D.length) items.push({ food: fresh(D), grams: 300 });
    } else if (m.name === '點心') {
      if (D.length) items.push({ food: D.includes('無糖希臘優格') ? '無糖希臘優格' : fresh(D), grams: 150 });
      if (Fr.length) items.push({ food: fresh(Fr), grams: (cG * 0.8) / 18 * 100 });
      if (Fa.length) items.push({ food: Fa.includes('無調味堅果') ? '無調味堅果' : fresh(Fa), grams: 15 });
    } else {
      const meat = P.filter((n) => !['雞蛋', '乳清蛋白粉'].includes(n));
      // 脂肪預算緊（每 g 蛋白質配不到 0.35 g 脂肪）時只挑低脂的蛋白質
      const lean = meat.filter((n) => FOODS[n].f / FOODS[n].p < 0.3);
      const pf = fresh(macros.fat / macros.protein < 0.35 && lean.length ? lean : meat.length ? meat : P);
      const cf = fresh(C.filter((n) => !['燕麥片（乾）', '全麥吐司', '饅頭'].includes(n)).length ? C.filter((n) => !['燕麥片（乾）', '全麥吐司', '饅頭'].includes(n)) : C);
      items.push({ food: pf, grams: (pG * 0.85) / FOODS[pf].p * 100 }, { food: cf, grams: (cG * 0.85) / FOODS[cf].c * 100 });
      if (V.length) items.push({ food: fresh(V), grams: 150 });
      if (Fa.includes('橄欖油')) items.push({ food: '橄欖油', grams: 5 });
    }
    return { name: m.name, items: items.map((it) => ({ ...it, grams: Math.max(5, it.grams) })), tip: '' };
  });
  fitToTarget(meals, macros);
  // 脂肪超過目標太多：把最油的蛋白質／乳品換成較瘦的，再重算一次（最多 4 次）
  const leanP = P.filter((n) => FOODS[n].f / FOODS[n].p < 0.15 && n !== '乳清蛋白粉');
  const leanD = D.filter((n) => FOODS[n].f / Math.max(1, FOODS[n].p) < 0.6);
  for (let k = 0; k < 4 && totalsOf(meals).f > macros.fat + 6; k++) {
    let worst = null;
    meals.forEach((m) => m.items.forEach((it) => {
      const f = FOODS[it.food]; if (!['protein', 'dairy'].includes(f.cat) || it.food === '雞蛋') return;
      const pool = f.cat === 'protein' ? leanP : leanD;
      if (pool.includes(it.food) || !pool.length) return;
      const fat = itemNutrition(it.food, it.grams).f;
      if (!worst || fat > worst.fat) worst = { it, fat, pool };
    }));
    if (!worst) break;
    const nf = worst.pool.filter((n) => !meals.some((m) => m.items.some((x) => x.food === n)))[0] || worst.pool[0];
    const keyOld = FOODS[worst.it.food].cat === 'protein' ? 'p' : 'p';
    worst.it.grams = (worst.it.grams * FOODS[worst.it.food][keyOld]) / Math.max(1, FOODS[nf][keyOld]);
    worst.it.food = nf;
    fitToTarget(meals, macros);
  }
  return { meals, tips: ['蔬菜可以多吃不用秤，份量是最少量。', '烹調用水煮、清蒸、氣炸、少油煎；外食用「一個拳頭飯、一個手掌肉」估。'], source: '本機規則' };
}

// 把 AI 回傳的菜單清乾淨：只留食物表裡有的食物，再把份量調到目標
export function sanitizeMealPlan(r, macros, mealCount) {
  const names = Object.keys(FOODS);
  const fix = (food) => names.includes(food) ? food : names.find((n) => n.includes(food) || food.includes(n.replace(/（.*）/, '')));
  const meals = (r.meals || []).map((m) => ({
    name: m.name || '一餐', tip: m.tip || '',
    items: (m.items || []).map((it) => ({ food: fix(String(it.food || '')), grams: Number(it.grams) || 0 })).filter((it) => it.food && it.grams > 0)
  })).filter((m) => m.items.length);
  if (!meals.length) throw new Error('AI 回傳的菜單是空的');
  return { meals: fitToTarget(meals, macros), tips: (r.tips || []).slice(0, 4), source: 'Gemini' };
}

// ---------- 吃了多少 → 重新分配後面的餐 ----------
// meal.eaten：'full' 照吃、'partial' 吃比較少（item.ate 是實際克數）、'skip' 沒吃；沒有 eaten 代表還沒吃
export function eatenTotals(meals) {
  const done = meals.filter((m) => m.eaten).map((m) => ({
    items: m.eaten === 'skip' ? [] : m.items.map((it) => ({ food: it.food, grams: m.eaten === 'partial' ? (it.ate ?? it.grams) : it.grams }))
  }));
  return totalsOf(done);
}
// 依已經吃的量，把剩下還沒吃的餐調回目標（每樣營養素最多比原本多 50%、少 50%，避免一餐暴增）
export function rebalance(meals, macros) {
  const left = meals.filter((m) => !m.eaten);
  left.forEach((m) => m.items.forEach((it) => { if (it.base == null) it.base = it.grams; it.grams = it.base; }));
  if (!left.length) return { meals, note: '' };
  const eaten = eatenTotals(meals);
  const baseT = totalsOf(left);
  const need = { protein: macros.protein - eaten.p, fat: macros.fat - eaten.f, carb: macros.carb - eaten.c };
  const cap = (v, b) => Math.min(b * 1.5, Math.max(b * 0.5, v));
  const goal = { protein: cap(need.protein, baseT.p), fat: cap(need.fat, baseT.f), carb: cap(need.carb, baseT.c) };
  fitToTarget(left, goal);
  const after = totalsOf(left);
  const diff = after.kcal - baseT.kcal;
  let note = '';
  if (Math.abs(diff) >= 30) note = diff > 0 ? `前面少吃了，後面的餐多加了約 ${diff} kcal（以蛋白質為優先）` : `前面吃多了，後面的餐減少了約 ${-diff} kcal`;
  const capped = need.protein > baseT.p * 1.5 || need.carb > baseT.c * 1.5;
  if (capped) note += (note ? '；' : '') + '差太多的部分不用硬補，一餐最多只加 50%，今天少一點沒關係';
  return { meals, note };
}
