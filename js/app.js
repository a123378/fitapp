import { GOALS, LOCATIONS, MUSCLE_GROUPS, BIG_THREE, CARDIO_MODES, CARDIO_TYPES, GEMINI_DEFAULT_MODEL } from './config.js';
import { store, estimate1RM, todayStr } from './store.js';
import { generateSplitMenu, generateStrengthMenu, fallbackStrengthMenu, generateCardioPlan, fallbackCardioPlan, getGeminiKey, setGeminiKey, getGeminiModel, setGeminiModel } from './gemini.js';
import { IntervalTimer, Stopwatch, Countdown, fmtClock, beep } from './timer.js';
import { lineChartSVG, SERIES_COLORS } from './chart.js';
import { GOALS_BODY, DAILY_ACTIVITY, computePlan, trendAdvice, weightEntries, getProfile } from './nutrition.js';
import { creatorMenusFor, PART_LABELS, CREATORS } from './creators.js';
import { GROUP_CUES, PRINCIPLES, suggestNext, repRange, groupHistory, daysSince, AI_STATES, AI_MINUTES, tipsFor, cuesFor, generalCues, embedUrl } from './coaching.js';
import { SPLIT_DAYS, CORE_SLOT, SPLIT_PLAN_VIDEO, WARMUPS, warmupForGroup, candidatesFor, nextSplitDay, lastSplit, splitProgress, lastSlotChoice } from './split.js';

const $view = document.getElementById('view');
const $title = document.getElementById('page-title');
const $badge = document.getElementById('sync-badge');
const $toast = document.getElementById('toast');

let route = 'home';
let trainMode = 'strength'; // 訓練頁上方切換：strength | cardio
let activeTimer = null; // 離開頁面時停止計時器
let restTimer = null;   // 組間休息倒數（重訓菜單頁）

// ---------- 工具 ----------
const h = (strings, ...vals) => strings.reduce((acc, s, i) => acc + s + (i < vals.length ? vals[i] : ''), '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function toast(msg, ms = 2200) { $toast.textContent = msg; $toast.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => ($toast.hidden = true), ms); }
function setTitle(t) { $title.textContent = t; }
function q(sel, root = $view) { return root.querySelector(sel); }
function qa(sel, root = $view) { return [...root.querySelectorAll(sel)]; }
function choiceGrid(items, key, selected, extraClass = '') {
  return `<div class="choice-grid">${Object.entries(items).map(([k, v]) => `
    <div class="choice ${selected === k ? 'selected' : ''} ${extraClass}" data-${key}="${k}">
      <div class="ic">${v.icon || ''}</div><div>${esc(v.label)}</div>${v.desc || v.rm ? `<div class="sub">${esc(v.rm ? `${v.rm}・${v.desc}` : v.desc)}</div>` : ''}
    </div>`).join('')}</div>`;
}
function steps(n, total) { return `<div class="steps">${Array.from({ length: total }, (_, i) => `<span class="${i < n ? 'done' : ''}"></span>`).join('')}</div>`; }

// ---------- 路由 ----------
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.route)));
function navigate(r, mode) {
  document.body.classList.remove('training');
  if (r === 'strength' || r === 'cardio') { trainMode = r; r = 'train'; }
  if (mode) trainMode = mode;
  if (activeTimer) { activeTimer.stop(); activeTimer = null; }
  if (restTimer) { restTimer.stop(); restTimer = null; }
  route = r;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.route === r));
  window.scrollTo(0, 0);
  ({ home: renderHome, train: renderTrain, stats: renderStats, body: renderBody })[r]();
}

// 訓練頁：上方切換重訓 / 有氧，同一頁操作
function renderTrain() {
  setTitle('訓練');
  trainMode === 'strength' ? renderStrength() : renderCardio();
}
function segHTML() {
  return `<div class="seg"><button data-mode="strength" class="${trainMode === 'strength' ? 'active' : ''}">🏋️ 重訓</button><button data-mode="cardio" class="${trainMode === 'cardio' ? 'active' : ''}">🔥 有氧</button></div>`;
}
function bindSeg() {
  qa('.seg button').forEach((b) => b.onclick = () => { if (b.dataset.mode !== trainMode) navigate('train', b.dataset.mode); });
}

// 設定：右上角齒輪 → 彈出視窗
const $modal = document.getElementById('settings-modal');
document.getElementById('open-settings').onclick = () => { renderSettings(); $modal.hidden = false; };
document.getElementById('close-settings').onclick = closeSettings;
$modal.addEventListener('click', (e) => { if (e.target === $modal) closeSettings(); });
function closeSettings() { $modal.hidden = true; updateBadge(); if (route === 'home') navigate('home'); }

store.subscribe(() => {
  updateBadge();
  if (route === 'home' || route === 'stats' || route === 'body') navigate(route);
  if (!$modal.hidden) renderSettings();
});
function updateBadge() {
  if (store.mode === 'firebase') {
    if (store.user) { $badge.textContent = '雲端同步'; $badge.className = 'badge ok'; }
    else { $badge.textContent = '未登入'; $badge.className = 'badge warn'; }
  } else { $badge.textContent = '本機'; $badge.className = 'badge'; }
}

// ================= 首頁 =================
function renderHome() {
  setTitle('我的健身');
  const ws = trainings();
  const plan = computePlan(store.workouts);
  const week = weekStart();
  const thisWeek = ws.filter((w) => w.date >= week);
  const strengthCount = thisWeek.filter((w) => w.type === 'strength').length;
  const cardioCount = thisWeek.filter((w) => w.type === 'cardio').length;
  const last = ws[0];
  $view.innerHTML = h`
    <div class="stat-tiles">
      <div class="tile"><div class="v">${thisWeek.length}</div><div class="k">本週訓練</div></div>
      <div class="tile"><div class="v">${strengthCount}</div><div class="k">重訓</div></div>
      <div class="tile"><div class="v">${cardioCount}</div><div class="k">有氧</div></div>
    </div>
    <div class="row mb">
      <button class="btn primary big grow" id="go-strength">🏋️ 開始重訓</button>
      <button class="btn big grow" id="go-cardio">🔥 開始有氧</button>
    </div>
    <p class="muted small mb">下次重訓：三分化第 ${nextSplitDay(ws)} 天・${esc(SPLIT_DAYS[nextSplitDay(ws)].short)}（第 ${splitProgress(ws).round} 輪）</p>
    <div class="card" id="go-body">${plan.missing ? `<h3>⚖️ 每日熱量與營養素</h3><p class="muted small">${plan.missing === 'profile' ? '到「體重」頁填個人資料並記錄體重，就會算出你的 TDEE 和三大營養素。' : '到「體重」頁記錄今天的體重，就會算出你的 TDEE 和三大營養素。'}</p>`
      : `<div class="row"><div class="grow"><div class="muted small">今日目標（${esc(plan.goal.label)}）</div><div style="font-size:1.6rem;font-weight:800">${plan.target.toLocaleString()} kcal</div></div><div class="muted small" style="text-align:right">TDEE ${plan.tdee.toLocaleString()}<br>體重 ${plan.weight.kg} kg</div></div>
        <div class="macro-mini"><span>蛋白質 <b>${plan.macros.protein}g</b></span><span>脂肪 <b>${plan.macros.fat}g</b></span><span>碳水 <b>${plan.macros.carb}g</b></span></div>`}</div>
    ${store.mode === 'firebase' && !store.user ? `<div class="card accent"><h3>登入 Google 以同步紀錄</h3><p class="muted">登入後紀錄會存到 Firebase，換手機也在。</p><button class="btn primary block" id="login">使用 Google 登入</button></div>` : ''}
    <div class="card">
      <h3>最近紀錄</h3>
      ${ws.length ? ws.slice(0, 8).map(historyRow).join('') : '<p class="muted">還沒有紀錄，從上面開始第一次訓練吧。</p>'}
    </div>`;
  q('#go-strength').onclick = () => navigate('train', 'strength');
  q('#go-body').onclick = () => navigate('body');
  q('#go-cardio').onclick = () => navigate('train', 'cardio');
  q('#login') && (q('#login').onclick = async () => {
    try { await store.signIn(); }
    catch (e) {
      const msg = {
        'auth/unauthorized-domain': `這個網址（${location.hostname}）沒有被允許登入。手機請用 https://fit-app-915f9.web.app 開啟；電腦請用 http://localhost:8080`,
        'auth/popup-closed-by-user': '登入視窗被關掉了，再試一次',
        'auth/network-request-failed': '網路連不上 Google，檢查網路後再試',
        'auth/operation-not-allowed': 'Firebase 還沒開啟 Google 登入（Authentication → 登入方式）'
      }[e.code] || `登入失敗：${e.code || e.message}`;
      toast(msg, 8000);
    }
  });
  bindHistoryRows();
}
function historyRow(w) {
  const label = w.type === 'strength'
    ? (w.split ? `三分化第 ${w.split.day} 天・${SPLIT_DAYS[w.split.day]?.short || ''}` : `${MUSCLE_GROUPS[w.group]?.label || ''}・${GOALS[w.goal]?.label || ''}`)
    : `${CARDIO_TYPES[w.cardioType]?.label || ''}・${CARDIO_MODES[w.mode]?.label || ''}`;
  const detail = w.type === 'strength'
    ? `${w.exercises.length} 個動作${w.location ? '・' + LOCATIONS[w.location].label : ''}`
    : `${fmtClock(w.durationSec || 0)}${w.distanceKm ? '・' + w.distanceKm + ' km' : ''}${w.rounds ? '・' + w.rounds + ' 輪' : ''}`;
  return `<div class="history-item" data-id="${w.id}"><div><div class="t">${w.type === 'strength' ? '🏋️' : '🔥'} ${esc(label)}</div><div class="d">${w.date}・${esc(detail)}</div></div><button class="btn ghost small" data-del="${w.id}">🗑</button></div>`;
}
function bindHistoryRows() {
  qa('[data-del]').forEach((b) => b.onclick = async (e) => {
    e.stopPropagation();
    if (confirm('刪除這筆紀錄？')) { await store.remove(b.dataset.del); toast('已刪除'); }
  });
  qa('.history-item').forEach((el) => el.onclick = () => showWorkoutDetail(el.dataset.id));
}
function showWorkoutDetail(id) {
  const w = store.workouts.find((x) => x.id === id);
  if (!w) return;
  let body;
  if (w.type === 'strength') {
    body = `<div class="ex-head"><span>動作</span><span>重量</span><span>次數</span><span>組數</span></div>` + w.exercises.map((e) => `
      <div class="ex-row"><div><div class="name">${esc(e.name)}</div><div class="plan">${esc(e.part)}${e.e1rm ? `・估 1RM ${e.e1rm} kg` : ''}</div></div>
      <div class="center">${e.hasWeight ? (e.weight ?? '-') + ' kg' : '徒手'}</div><div class="center">${e.reps ?? '-'}</div><div class="center">${e.setsDone ?? e.sets ?? '-'}</div></div>`).join('');
  } else {
    body = `<p>${esc(w.title || '')}</p><p class="muted">時間 ${fmtClock(w.durationSec || 0)}${w.distanceKm ? `・距離 ${w.distanceKm} km` : ''}${w.rounds ? `・${w.rounds} 輪（${w.workSec}s / ${w.restSec}s）` : ''}</p>`;
  }
  $view.innerHTML = h`
    <button class="btn ghost mb" id="back">← 返回</button>
    <div class="card"><h3>${w.date}・${esc(w.type === 'strength' ? (w.split ? `三分化第 ${w.split.day} 天` : `${MUSCLE_GROUPS[w.group]?.label}・${GOALS[w.goal]?.label}`) : `${CARDIO_TYPES[w.cardioType]?.label}・${CARDIO_MODES[w.mode]?.label}`)}</h3>${body}${w.note ? `<p class="muted mt">備註：${esc(w.note)}</p>` : ''}</div>`;
  q('#back').onclick = () => navigate(route);
}
function weekStart() {
  const d = new Date(); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ================= 重訓 =================
const st = { mode: 'split', location: null, group: null, goal: null, menu: null, useAI: false, aiReady: false, ai: { state: 'normal', minutes: 60, note: '' }, splitDay: null, addCore: false, slotChoice: {} };
function resetStrength() { Object.assign(st, { mode: 'split', location: null, group: null, goal: null, menu: null, page: null, useAI: false, aiReady: false, splitDay: null, slotChoice: {} }); }
function renderStrength() {
  if (!st.location) return renderStrengthStep('location');
  if (st.mode === 'split') {
    if (st.menu) return renderStrengthMenu();
    if (st.useAI) return st.aiReady ? renderSplitGenerate() : renderAIOptions();
    return renderSplitDay();
  }
  if (!st.group) return renderStrengthStep('group');
  if (!st.goal) return renderStrengthStep('goal');
  if (!st.menu) {
    const ai = st.useAI || !creatorMenusFor(st.location, st.group).length;
    if (!ai) return renderViyadePick();
    return st.aiReady ? renderStrengthGenerate() : renderAIOptions();
  }
  renderStrengthMenu();
}
function renderStrengthStep(step) {
  const map = { location: ['選擇地點', LOCATIONS, 1], group: ['選擇肌群', MUSCLE_GROUPS, 2], goal: ['選擇目標', GOALS, 3] };
  const [label, items, n] = map[step];
  $view.innerHTML = h`${segHTML()}${steps(n - 1, st.mode === 'split' ? 3 : 4)}<h2>${label}</h2>${st.mode === 'free' && step === 'group' ? '<p class="muted small">自由選擇：這次不算進三分化進度。</p>' : ''}${choiceGrid(items, 'k', st[step], step === 'goal' ? 'full' : '')}
    ${n > 1 ? `<button class="btn ghost block mt" id="back">← 上一步</button>` : ''}`;
  bindSeg();
  qa('[data-k]').forEach((el) => el.onclick = () => { st[step] = el.dataset.k; renderStrength(); });
  q('#back') && (q('#back').onclick = () => { if (step === 'group') { st.mode = 'split'; st.group = null; } else st[step === 'group' ? 'location' : 'group'] = null; renderStrength(); });
}
// ================= 三分化（主要流程） =================
function splitDayNow() { return st.splitDay || nextSplitDay(store.workouts); }
function splitSlots(day) { return [...SPLIT_DAYS[day].slots, ...(st.addCore ? [CORE_SLOT] : [])]; }
function slotDefault(slot, cands) {
  const chosen = st.slotChoice[slot.key];
  if (chosen && cands.some((c) => c.name === chosen)) return chosen;
  const last = lastSlotChoice(store.workouts, slot.key);
  if (last && cands.some((c) => c.name === last)) return last;
  if (st.location === 'home') return (cands.find((c) => c.name === slot.home) || cands[0] || { name: slot.home }).name;
  return slot.name;
}
function slotExercise(slot, name, cands, extra = {}) {
  const c = cands.find((x) => x.name === name) || { name, weight: slot.weight, tip: '', video: null, creator: '' };
  return {
    slot: slot.key, slotLabel: slot.label, role: slot.role, name: c.name,
    part: PART_LABELS[slot.partPick || slot.part] || slot.part, partKey: slot.partPick || slot.part,
    hasWeight: !!c.weight, sets: slot.sets, reps: slot.reps, rest: slot.rest,
    tip: (c.name === slot.name ? slot.tip : c.tip) || c.tip || '', video: c.video || null, t: c.t ?? null,
    from: c.creator || '', ...extra
  };
}
function buildSplitMenu(day) {
  const d = SPLIT_DAYS[day];
  const exercises = splitSlots(day).map((slot) => {
    const cands = candidatesFor(slot, st.location);
    return slotExercise(slot, slotDefault(slot, cands), cands);
  });
  return {
    split: day, title: `三分化${d.label}`, url: d.video, creator: '譚成義・凱聖王', warmupSet: WARMUPS[day],
    warmup: '', focus: '',
    note: d.note + (st.location === 'home' ? ' 在家沒有器材，每個位置先換成在家能做的動作。' : ''),
    exercises
  };
}
function renderSplitDay() {
  const day = splitDayNow();
  const d = SPLIT_DAYS[day];
  const last = lastSplit(store.workouts);
  const prog = splitProgress(store.workouts);
  $view.innerHTML = h`${segHTML()}${steps(1, 3)}
    <h2>今天：三分化${esc(d.label)}</h2>
    <p class="muted small">${last ? `上次練到第 ${last.split.day} 天（${last.date}）・` : ''}第 ${prog.round} 輪・已完成 ${prog.done} 次・<a href="${SPLIT_PLAN_VIDEO}" target="_blank" rel="noopener">📺 計畫說明</a></p>
    <div class="presets mb">${[1, 2, 3].map((n) => `<button class="btn ${n === day ? 'active' : ''}" data-day="${n}">第 ${n} 天・${esc(SPLIT_DAYS[n].short)}</button>`).join('')}</div>
    <div class="card">
      <h3>今天的動作安排</h3>
      ${splitSlots(day).map((slot) => {
        const cands = candidatesFor(slot, st.location);
        return `<div class="history-item"><div><div class="t">${esc(slotDefault(slot, cands))}</div><div class="d">${esc(slot.label)}・${slot.sets} 組 × ${esc(slot.reps)}・可替換 ${Math.max(0, cands.length - 1)} 個</div></div></div>`;
      }).join('')}
      <label class="row mt" style="gap:8px;align-items:center"><input type="checkbox" id="core" ${st.addCore ? 'checked' : ''}> 最後加練核心</label>
    </div>
    <button class="btn primary big block" id="go">▶ 照計畫開始</button>
    <button class="btn block mt" id="ai">🤖 依今天狀況調整（AI）</button>
    <button class="btn ghost block mt" id="free">自己選肌群（這次不算進三分化）</button>
    <button class="btn ghost block mt" id="back">← 換地點</button>`;
  bindSeg();
  qa('[data-day]').forEach((b) => b.onclick = () => { st.splitDay = Number(b.dataset.day); renderSplitDay(); });
  q('#core').onchange = (e) => { st.addCore = e.target.checked; renderSplitDay(); };
  q('#go').onclick = () => { st.splitDay = day; st.goal = 'hypertrophy'; st.menu = withSuggestions(buildSplitMenu(day)); st.page = 0; renderStrengthMenu(); };
  q('#ai').onclick = () => { st.splitDay = day; st.goal = 'hypertrophy'; st.useAI = true; st.aiReady = false; renderAIOptions(); };
  q('#free').onclick = () => { Object.assign(st, { mode: 'free', group: null, goal: null, menu: null, useAI: false, aiReady: false }); renderStrength(); };
  q('#back').onclick = () => { st.location = null; renderStrength(); };
}
async function renderSplitGenerate() {
  const day = splitDayNow();
  const d = SPLIT_DAYS[day];
  $view.innerHTML = h`${segHTML()}${steps(2, 3)}<h2>調整菜單中…</h2>
    <div class="card center"><div class="spinner"></div><p class="muted">${getGeminiKey() ? 'Gemini 正在依你的狀況調整' : '本機規則調整中'}：三分化${esc(d.label)}</p></div>`;
  const history = store.workouts.filter((w) => w.type === 'strength' && w.split && w.split.day === day).slice(0, 4);
  const slots = splitSlots(day).map((slot) => {
    const cands = candidatesFor(slot, st.location);
    return { slot, cands, key: slot.key, label: slot.label, sets: slot.sets, reps: slot.reps, defaultName: slotDefault(slot, cands),
      candidates: cands.map((c) => ({ name: c.name, creator: c.creator, tip: c.tip || (c.pro[0] && c.pro[0].text) || '' })) };
  });
  const suggestions = slots.map((s) => { const r = suggestNext(s.defaultName, true, 'hypertrophy', store.workouts, repRange(s.reps)); return { name: s.defaultName, text: r ? r.text : '' }; });
  const cues = d.groups.flatMap((g) => GROUP_CUES[g] || []);
  const a = st.ai;
  let menu = buildSplitMenu(day);
  try {
    if (!getGeminiKey()) throw new Error('NO_KEY');
    const r = await generateSplitMenu({ day, dayLabel: d.label, location: st.location, slots, ctx: { ...a, history, suggestions, cues } });
    menu.exercises = slots.map((s) => {
      const x = (r.slots || []).find((y) => y.slot === s.key) || {};
      const name = s.cands.some((c) => c.name === x.name) ? x.name : s.defaultName;
      const sets = Math.max(1, Math.min(s.sets + 1, Number(x.sets) || s.sets, s.sets + 1), s.sets - 1);
      return slotExercise(s.slot, name, s.cands, { sets, reps: x.reps || s.reps, rir: x.rir || '', why: x.why || '' });
    });
    Object.assign(menu, { focus: r.focus || '', warmup: r.warmup || '', note: [r.note, menu.note].filter(Boolean).join(' ') });
  } catch (e) {
    if (e.message !== 'NO_KEY') { console.error(e); toast('Gemini 失敗，改用本機調整：' + e.message, 4000); }
    // 本機規則：累或時間少 → 孤立 / 輔助動作減 1 組
    const cut = a.state === 'tired' || a.minutes <= 45;
    const extra = a.state === 'good' && a.minutes >= 90;
    menu.exercises.forEach((ex) => {
      if (cut && ex.role !== 'main') ex.sets = Math.max(2, ex.sets - 1);
      if (extra && ex.role === 'iso') ex.sets += 1;
      ex.rir = a.state === 'tired' ? '3' : a.state === 'good' ? '0-1（最後一組）' : '1-2';
    });
    menu.note = `本機依狀態「${(AI_STATES[a.state] || AI_STATES.normal).label}」和 ${a.minutes} 分鐘調整組數。` + menu.note;
  }
  st.menu = withSuggestions(menu); st.page = 0;
  if (route === 'train' && trainMode === 'strength') renderStrengthMenu();
}

// 博主影片菜單：列出符合地點 + 肌群的影片菜單讓你挑
function renderViyadePick() {
  const all = creatorMenusFor(st.location, st.group);
  const used = [...new Set(all.map((m) => m.creator))];
  if (st.creatorFilter && !used.includes(st.creatorFilter)) st.creatorFilter = null;
  const list = st.creatorFilter ? all.filter((m) => m.creator === st.creatorFilter) : all;
  $view.innerHTML = h`${segHTML()}${steps(3, 4)}<h2>挑一份博主菜單</h2>
    <p class="muted small">${esc(LOCATIONS[st.location].label)}・${esc(MUSCLE_GROUPS[st.group].label)}・共 ${all.length} 份</p>
    ${used.length > 1 ? `<div class="presets mb"><button class="btn ${!st.creatorFilter ? 'active' : ''}" data-cf="">全部</button>${used.map((c) => `<button class="btn ${st.creatorFilter === c ? 'active' : ''}" data-cf="${c}">${esc(CREATORS[c].name)}</button>`).join('')}</div>` : ''}
    ${list.map((m, i) => `<div class="card choice-menu" data-vm="${i}">
      <div class="row"><h3 class="grow">${esc(m.title)}<br><span class="pill accent">${esc(CREATORS[m.creator].name)}</span></h3><a class="btn ghost small" href="${m.url}" target="_blank" rel="noopener" data-stop>📺 影片</a></div>
      <p class="muted small">${m.exercises.map((e) => esc(e.name)).join('・')}</p>
      ${m.note ? `<p class="muted small">${esc(m.note)}</p>` : ''}
      <button class="btn primary block mt" data-use="${i}">用這份</button></div>`).join('')}
    <button class="btn block" id="ai">🤖 改用 AI 從動作清單安排</button>
    <button class="btn ghost block mt" id="back">← 上一步</button>`;
  bindSeg();
  qa('[data-use]').forEach((b) => b.onclick = () => { st.menu = withSuggestions(menuFromViyade(list[Number(b.dataset.use)])); st.page = 0; renderStrengthMenu(); });
  qa('[data-cf]').forEach((b) => b.onclick = () => { st.creatorFilter = b.dataset.cf || null; renderViyadePick(); });
  q('#ai').onclick = () => { st.useAI = true; renderStrength(); };
  q('#back').onclick = () => { st.goal = null; renderStrength(); };
}
function menuFromViyade(m) {
  const g = GOALS[st.goal];
  return {
    title: m.title, url: m.url, creator: CREATORS[m.creator].name, warmup: '', note: m.note || '', warmupSet: warmupForGroup(st.group),
    exercises: m.exercises.map((e) => ({
      name: e.name, part: PART_LABELS[e.part] || e.part, partKey: e.part, hasWeight: !!e.weight,
      sets: e.sets, reps: e.reps, rest: g.rest, tip: e.tip || '', video: e.video || m.url, t: e.video ? null : (e.t ?? null), from: CREATORS[m.creator].name
    }))
  };
}
// AI 安排前先問今天的狀態、時間、備註，讓菜單更貼近當天
function renderAIOptions() {
  const a = st.ai;
  const noCreator = !creatorMenusFor(st.location, st.group).length;
  $view.innerHTML = h`${segHTML()}${steps(3, 4)}<h2>告訴 AI 今天的狀況</h2>
    ${noCreator ? `<p class="muted small">這個肌群目前沒有博主菜單，由 AI 參考博主的訓練思路幫你安排。</p>` : ''}
    <h3 class="mt">今天狀態</h3>
    <div class="choice-grid">${Object.entries(AI_STATES).map(([k, v]) => `<div class="choice ${a.state === k ? 'selected' : ''}" data-state="${k}"><div class="ic">${v.icon}</div><div>${esc(v.label)}</div><div class="sub">${esc(v.desc)}</div><div class="sub">蛋白 ${v.ratio.p}・脂肪 ${v.ratio.f}・碳水 ${v.ratio.c}</div></div>`).join('')}</div>
    <h3 class="mt">可以練多久</h3>
    <div class="presets">${AI_MINUTES.map((m) => `<button class="btn ${a.minutes === m ? 'active' : ''}" data-min="${m}">${m} 分</button>`).join('')}</div>
    <label class="field mt"><span>備註（選填）</span><textarea id="ai-note" placeholder="例如：右肩有點痠、想加強上胸、今天只有啞鈴…">${esc(a.note)}</textarea></label>
    <button class="btn primary big block" id="go">🤖 幫我安排</button>
    <button class="btn ghost block mt" id="back">← 上一步</button>`;
  bindSeg();
  qa('[data-state]').forEach((el) => el.onclick = () => { a.state = el.dataset.state; a.note = q('#ai-note').value; renderAIOptions(); });
  qa('[data-min]').forEach((el) => el.onclick = () => { a.minutes = Number(el.dataset.min); a.note = q('#ai-note').value; renderAIOptions(); });
  q('#go').onclick = () => { a.note = q('#ai-note').value.trim(); st.aiReady = true; renderStrength(); };
  q('#back').onclick = () => { if (st.useAI) st.useAI = false; else st.goal = null; renderStrength(); };
  if (st.mode === 'split') q('h2').textContent = `告訴 AI 今天的狀況（三分化第 ${splitDayNow()} 天）`;
}
// 依上次紀錄幫每個動作算今天的建議重量（博主菜單和 AI 菜單都套用）
function withSuggestions(menu) {
  menu.exercises.forEach((e) => {
    const s = suggestNext(e.name, e.hasWeight, st.goal, store.workouts, menu.split ? repRange(e.reps) : null);
    e.suggest = s ? s.text : '';
    e.suggestW = s ? s.weight : null;
    e.pro = tipsFor(e.name);
  });
  return menu;
}
async function renderStrengthGenerate() {
  $view.innerHTML = h`${segHTML()}${steps(3, 4)}<h2>安排菜單中…</h2>
    <div class="card center"><div class="spinner"></div><p class="muted">${getGeminiKey() ? 'Gemini 正在為你安排' : '本機規則產生中'}：${esc(LOCATIONS[st.location].label)}・${esc(MUSCLE_GROUPS[st.group].label)}・${esc(GOALS[st.goal].label)}</p></div>`;
  const history = groupHistory(store.workouts, st.group);
  const names = [...new Set(history.flatMap((w) => w.exercises.map((e) => e.name)))];
  const suggestions = names.map((n) => {
    const e = history.flatMap((w) => w.exercises).find((x) => x.name === n);
    const s = suggestNext(n, e?.hasWeight, st.goal, store.workouts);
    return { name: n, text: s ? s.text : '' };
  });
  const ctx = { ...st.ai, history, daysSince: daysSince(store.workouts, st.group), suggestions };
  const args = { location: st.location, group: st.group, goal: st.goal, ctx };
  try {
    st.menu = getGeminiKey() ? await generateStrengthMenu(args) : fallbackStrengthMenu(args);
  } catch (e) {
    console.error(e);
    toast('Gemini 失敗，改用本機菜單：' + e.message, 4000);
    st.menu = fallbackStrengthMenu(args);
  }
  withSuggestions(st.menu); st.menu.warmupSet = warmupForGroup(st.group); st.page = 0;
  if (route === 'train' && trainMode === 'strength') renderStrengthMenu();
}
// ================= 訓練頁：一個動作一頁 =================
const fmtT = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
// 抖音的嵌入播放器不能指定開始時間、進度條也拖不動，所以只內嵌短片；
// 長片（要從中間某段開始看的）改成按鈕，到抖音裡從標示的時間開始看。
function clipHTML(url, t, label, embed = true) {
  const src = embedUrl(url);
  if (!src) return '';
  if (embed && !t) return `<div class="clip"><iframe src="${src}" loading="lazy" allow="autoplay; fullscreen; encrypted-media" allowfullscreen referrerpolicy="unsafe-url"></iframe></div>
    <p class="muted small center">${esc(label || '')} <a href="${url}" target="_blank" rel="noopener">在抖音開啟</a></p>`;
  return `<a class="btn block clip-link" href="${url}" target="_blank" rel="noopener"><span>▶ 到抖音看示範${t ? `（從 ${fmtT(t)} 開始）` : ''}</span><span class="muted small">${esc(label || '')}${t ? '・長片，請拖到標示的時間' : ''}</span></a>`;
}
// 動作要看的影片：優先用專講這個動作的短片（訓練怪獸），沒有才用菜單的原影片（附開始時間）
const SHORT_SOURCES = ['維亞德', '訓練怪獸'];
function clipFor(e) {
  const short = (e.pro || []).find((p) => p.video);
  if (short) return { url: short.video, t: 0, label: `${short.from} 講解`, embed: true };
  if (e.video) return { url: e.video, t: e.t || 0, label: e.from || '', embed: SHORT_SOURCES.includes(e.from) && !e.t };
  return null;
}
function menuPages(m) {
  const pages = [];
  warmItems(m).forEach((x, k) => pages.push({ type: 'warmup', k }));
  m.exercises.forEach((e, i) => pages.push({ type: 'ex', i }));
  pages.push({ type: 'finish' });
  return pages;
}
function renderStrengthMenu() {
  const m = st.menu;
  if (st.page == null) st.page = 0;
  const pages = menuPages(m);
  st.page = Math.max(0, Math.min(st.page, pages.length - 1));
  const pg = pages[st.page];
  const total = m.exercises.length;
  $view.innerHTML = h`${segHTML()}
    <div class="row mb"><div class="grow"><b>${esc(m.title)}</b><div class="muted small">${esc(LOCATIONS[st.location].label)}${m.split ? '' : `・${esc(MUSCLE_GROUPS[st.group].label)}・${esc(GOALS[st.goal].label)}`}</div></div><button class="btn ghost small" id="regen">${m.split ? '↩ 回今天' : '🔄 換一份'}</button></div>
    <div class="dots">${pages.map((p, k) => `<span class="${k === st.page ? 'on' : ''} ${p.type}" data-go="${k}">${p.type === 'warmup' ? `熱${p.k + 1}` : p.type === 'finish' ? '✓' : p.i + 1}</span>`).join('')}</div>
    <div id="page"></div>
    <div class="rest-timer" id="rt">
      <div class="row"><div class="clock" id="rt-clock">1:30</div>
        <div class="grow"><div class="muted small">組間休息</div><div class="presets">${[60, 90, 120, 180].map((s) => `<button class="btn" data-rt="${s}">${s}s</button>`).join('')}</div></div>
        <button class="btn primary" id="rt-start">▶</button><button class="btn" id="rt-reset">↺</button></div>
    </div>
    <div class="row pager"><button class="btn grow" id="prev" ${st.page === 0 ? 'disabled' : ''}>← 上一個</button><button class="btn primary grow" id="next" ${st.page === pages.length - 1 ? 'disabled' : ''}>${pg.type === 'warmup' ? (pages[st.page + 1].type === 'warmup' ? '下一個熱身 →' : '熱身完成，開始第 1 個動作 →') : pg.type === 'ex' && pg.i === total - 1 ? '完成，去存檔 →' : '下一個 →'}</button></div>`;
  bindSeg();
  const $page = q('#page');
  document.body.classList.add('training');
  if (pg.type === 'warmup') renderWarmupPage($page, m, pg.k);
  else if (pg.type === 'ex') renderExercisePage($page, m, pg.i);
  else renderFinishPage($page, m);

  // 組間休息（每換一頁依該動作的休息時間預設）
  const $rt = q('#rt'), $clock = q('#rt-clock'), $start = q('#rt-start');
  if (restTimer) restTimer.stop();
  restTimer = new Countdown({ onTick: (t) => {
    $clock.textContent = fmtClock(t.remaining);
    $rt.className = 'rest-timer' + (t.running ? ' running' : t.remaining === 0 ? ' alarm' : '');
    $start.textContent = t.running ? '⏸' : '▶';
  } });
  const ex = pg.type === 'ex' ? m.exercises[pg.i] : null;
  const restSec = ex ? (/分/.test(ex.rest) ? 60 * (Number((ex.rest.match(/\d+/g) || [2]).pop()) || 2) : Number((ex.rest.match(/\d+/g) || [90]).pop()) || 90) : 90;
  const pick = (sec) => { restTimer.set(sec); qa('[data-rt]').forEach((b) => b.classList.toggle('active', Number(b.dataset.rt) === sec)); };
  pick(Math.min(300, restSec));
  qa('[data-rt]').forEach((b) => b.onclick = () => pick(Number(b.dataset.rt)));
  $start.onclick = () => { beep(880, 60); restTimer.running ? restTimer.pause() : restTimer.start(); };
  q('#rt-reset').onclick = () => restTimer.reset();
  $rt.hidden = pg.type !== 'ex';

  const go = (k) => { saveInputs(m); st.page = k; window.scrollTo(0, 0); renderStrengthMenu(); };
  q('#prev').onclick = () => go(st.page - 1);
  q('#next').onclick = () => go(st.page + 1);
  qa('[data-go]').forEach((d) => d.onclick = () => go(Number(d.dataset.go)));
  // 左右滑動換頁
  let x0 = null;
  $page.ontouchstart = (e) => { x0 = e.touches[0].clientX; };
  $page.ontouchend = (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) go(st.page + (dx < 0 ? 1 : -1)); };
  q('#regen').onclick = () => { if (!confirm('離開這次訓練？填過的數字不會保存。')) return; document.body.classList.remove('training'); restTimer.stop(); st.menu = null; st.page = null; st.useAI = false; st.aiReady = false; renderStrength(); };
}
// 把目前頁面輸入的數字存回菜單（換頁不會遺失）
function saveInputs(m) {
  qa('[data-w]').forEach((el) => { m.exercises[Number(el.dataset.w)].inW = el.value; });
  qa('[data-r]').forEach((el) => { m.exercises[Number(el.dataset.r)].inR = el.value; });
  qa('[data-s]').forEach((el) => { m.exercises[Number(el.dataset.s)].inS = el.value; });
}
// 熱身也是一個項目一頁；最上面可切換「滾筒 + 動態 / 只做滾筒 / 只做動態」
function warmItems(m) {
  const w = m.warmupSet;
  if (!w) return [];
  const mode = st.warmMode || 'both';
  return [...(mode !== 'dynamic' ? w.roller.map((x) => ({ ...x, kind: '滾筒放鬆' })) : []), ...(mode !== 'roller' ? w.dynamic.map((x) => ({ ...x, kind: '動態熱身' })) : [])];
}
function renderWarmupPage($p, m, k) {
  const items = warmItems(m);
  const x = items[k];
  const mode = st.warmMode || 'both';
  $p.innerHTML = `<div class="card ex-page">
    <div class="presets mb">${[['both', '滾筒 + 動態'], ['roller', '只做滾筒'], ['dynamic', '只做動態']].map(([key, l]) => `<button class="btn ${mode === key ? 'active' : ''}" data-wm="${key}">${l}</button>`).join('')}</div>
    <div class="muted small">🔥 熱身 ${k + 1} / ${items.length}・${x.kind}</div>
    <h2 class="ex-title">${esc(x.name)}</h2>
    ${clipHTML(x.video, x.t, '譚成義', false)}
    <div class="note-box"><b>怎麼做</b><ul class="cues"><li>${esc(x.detail)}</li>
      ${k === items.length - 1 ? '<li class="muted">熱身完，第一個動作先用輕重量做 1-2 組熱身組再上正式重量（譚成義）</li>' : ''}</ul></div>
  </div>`;
  qa('[data-wm]', $p).forEach((b) => b.onclick = () => { st.warmMode = b.dataset.wm; st.page = 0; renderStrengthMenu(); });
}
function renderExercisePage($p, m, i) {
  const e = m.exercises[i];
  const groups = m.split ? SPLIT_DAYS[m.split].groups : [st.group];
  const proTexts = new Set((e.pro || []).map((p) => p.text));
  const cues = cuesFor(e.name, groups).filter((c) => !proTexts.has(c.text)).slice(0, 3);
  const clip = clipFor(e);
  const wVal = e.inW ?? (e.hasWeight ? (e.suggestW ?? lastWeightFor(e.name) ?? '') : '');
  $p.innerHTML = `<div class="card ex-page">
    ${e.slotLabel ? `<div class="muted small">${esc(e.slotLabel)}${e.from ? `・${esc(e.from)}` : ''}</div>` : (m.creator ? `<div class="muted small">${esc(m.creator)}</div>` : '')}
    <h2 class="ex-title">${i + 1}. ${esc(e.name)}</h2>
    <div class="ex-plan"><span>${e.sets} 組</span><span>× ${esc(e.reps)}</span><span>休 ${esc(e.rest)}</span>${e.rir ? `<span>保留 ${esc(e.rir)} 下</span>` : ''}</div>
    ${clip ? clipHTML(clip.url, clip.t, clip.label, clip.embed) : ''}
    ${e.suggest ? `<div class="note-box suggest">📈 ${esc(e.suggest)}</div>` : ''}
    <div class="note-box">
      <b>注意事項</b>
      <ul class="cues">
        ${e.tip ? `<li>💡 ${esc(e.tip)}</li>` : ''}
        ${(e.pro || []).map((t) => `<li>🎓 ${esc(t.text)}<span class="muted small">・${esc(t.from)}</span></li>`).join('')}
        ${cues.map((c) => `<li>🧠 ${esc(c.text)}<span class="muted small">・${esc(c.from)}</span></li>`).join('')}
        ${e.why ? `<li>🧩 ${esc(e.why)}</li>` : ''}
        ${!e.tip && !(e.pro || []).length && !cues.length && !e.why ? '<li class="muted">這個動作還沒有博主講解</li>' : ''}
      </ul>
    </div>
    <div class="ex-inputs">
      <label><span>最重一組 kg</span>${e.hasWeight ? `<input type="number" inputmode="decimal" step="0.5" placeholder="kg" data-w="${i}" value="${wVal}">` : `<div class="muted center">徒手</div>`}</label>
      <label><span>次數</span><input type="number" inputmode="numeric" placeholder="次" data-r="${i}" value="${e.inR ?? ''}"></label>
      <label><span>完成組數</span><input type="number" inputmode="numeric" data-s="${i}" value="${e.inS ?? e.sets}"></label>
    </div>
    ${e.slot ? `<button class="btn ghost block mt" data-swap="${i}">🔄 換動作</button><div class="swap" id="swap-${i}" hidden></div>` : ''}
  </div>`;
  const b = q('[data-swap]', $p);
  if (b) b.onclick = () => {
    const box = q(`#swap-${i}`, $p);
    if (!box.hidden) { box.hidden = true; return; }
    const slot = [...Object.values(SPLIT_DAYS).flatMap((d) => d.slots), CORE_SLOT].find((s) => s.key === e.slot);
    const cands = candidatesFor(slot, st.location);
    box.innerHTML = cands.map((c, j) => `<div class="swap-item ${c.name === e.name ? 'current' : ''}" data-pick="${j}">
      <div><b>${esc(c.name)}</b>${c.creator ? ` <span class="pill">${esc(c.creator)}</span>` : ''}${c.pro.length ? ' <span class="pill accent">有講解</span>' : ''}</div>
      ${c.tip ? `<div class="plan">💡 ${esc(c.tip)}</div>` : ''}</div>`).join('');
    box.hidden = false;
    qa('[data-pick]', box).forEach((el) => el.onclick = () => {
      saveInputs(m);
      const c = cands[Number(el.dataset.pick)];
      st.slotChoice[e.slot] = c.name;
      m.exercises[i] = slotExercise(slot, c.name, cands, { sets: e.sets, reps: e.reps, rir: e.rir, why: '' });
      withSuggestions({ ...m, exercises: [m.exercises[i]] });
      renderStrengthMenu();
    });
  };
}
function renderFinishPage($p, m) {
  const groups = m.split ? SPLIT_DAYS[m.split].groups : [st.group];
  const gen = [...generalCues(groups), ...(m.split ? PRINCIPLES.filter((p) => p.from.includes('譚成義')).slice(0, 3) : [])];
  $p.innerHTML = `<div class="card ex-page">
    <h2>✅ 今天練完了</h2>
    <div class="ex-head"><span>動作</span><span>重量</span><span>次數</span><span>組數</span></div>
    ${m.exercises.map((e) => `<div class="ex-row"><div class="name">${esc(e.name)}</div><div class="center">${e.hasWeight ? (e.inW || '-') : '徒手'}</div><div class="center">${e.inR || '-'}</div><div class="center">${e.inS || e.sets}</div></div>`).join('')}
    ${gen.length ? `<details class="mt"><summary class="muted small">今天的訓練原則</summary><ul class="cues">${gen.map((c) => `<li>${esc(c.text)}<span class="muted small">・${esc(c.from)}</span></li>`).join('')}</ul></details>` : ''}
    ${m.note ? `<p class="muted small mt">${esc(m.note)}</p>` : ''}
    <label class="field"><span>日期</span><input type="date" id="date" value="${todayStr()}"></label>
    <label class="field"><span>備註（選填）</span><textarea id="note" placeholder="今天狀態、下次要加重…"></textarea></label>
    <button class="btn primary big block" id="save">✅ 儲存這次訓練</button>
    <button class="btn ghost block mt" id="reset">重新選擇</button>
  </div>`;
  q('#reset', $p).onclick = () => { if (!confirm('放棄這次訓練、重新選擇？')) return; document.body.classList.remove('training'); restTimer && restTimer.stop(); resetStrength(); renderStrength(); };
  q('#save', $p).onclick = async () => {
    const exercises = m.exercises.map((e) => {
      const weight = e.hasWeight ? Number(e.inW) || 0 : null;
      const reps = Number(e.inR) || 0;
      const setsDone = Number(e.inS) || e.sets;
      return { name: e.name, part: e.part, hasWeight: e.hasWeight, sets: e.sets, setsDone, weight, reps, e1rm: e.hasWeight ? estimate1RM(weight, reps) : null, ...(e.slot ? { slot: e.slot } : {}) };
    });
    if (!exercises.some((e) => e.reps > 0)) { if (!confirm('還沒填任何次數，確定要儲存嗎？')) return; }
    await store.add({ type: 'strength', date: q('#date', $p).value || todayStr(), location: st.location, group: m.split ? `split${m.split}` : st.group, goal: st.goal, ...(m.split ? { split: { day: m.split } } : {}), title: m.title, source: m.url || null, exercises, note: q('#note', $p).value.trim() });
    toast(m.split ? `已儲存 💪 下次輪到第 ${(m.split % 3) + 1} 天` : '已儲存 💪');
    restTimer && restTimer.stop();
    resetStrength();
    navigate('home');
  };
}
function lastWeightFor(name) {
  for (const w of store.workouts) {
    if (w.type !== 'strength') continue;
    const e = w.exercises.find((x) => x.name === name && x.weight);
    if (e) return e.weight;
  }
  return null;
}

// ================= 有氧 =================
const cd = { mode: null, type: null, plan: null };
function renderCardio() {
  if (!cd.mode) return renderCardioStep('mode');
  if (!cd.type) return renderCardioStep('type');
  if (!cd.plan) return renderCardioGenerate();
  cd.type === 'run' ? renderRun() : renderIntervalTimer();
}
function renderCardioStep(step) {
  const map = { mode: ['選擇目標', CARDIO_MODES, 1], type: ['選擇訓練型態', CARDIO_TYPES, 2] };
  const [label, items, n] = map[step];
  $view.innerHTML = h`${segHTML()}${steps(n - 1, 3)}<h2>${label}</h2>${choiceGrid(items, 'k', cd[step])}
    ${n > 1 ? `<button class="btn ghost block mt" id="back">← 上一步</button>` : ''}`;
  bindSeg();
  qa('[data-k]').forEach((el) => el.onclick = () => { cd[step] = el.dataset.k; renderCardio(); });
  q('#back') && (q('#back').onclick = () => { cd.mode = null; renderCardio(); });
}
async function renderCardioGenerate() {
  $view.innerHTML = h`${segHTML()}${steps(2, 3)}<h2>安排課表中…</h2><div class="card center"><div class="spinner"></div><p class="muted">${esc(CARDIO_MODES[cd.mode].label)}・${esc(CARDIO_TYPES[cd.type].label)}</p></div>`;
  try {
    cd.plan = getGeminiKey() ? await generateCardioPlan({ ...cd, location: st.location || 'home' }) : fallbackCardioPlan(cd);
  } catch (e) {
    console.error(e); toast('Gemini 失敗，改用本機課表：' + e.message, 4000);
    cd.plan = fallbackCardioPlan(cd);
  }
  if (route === 'train' && trainMode === 'cardio') renderCardio();
}

function renderIntervalTimer() {
  const p = cd.plan;
  const timer = new IntervalTimer({ prepSec: p.prepSec, workSec: p.workSec, restSec: p.restSec, rounds: p.rounds, onTick: paint, onPhase: paint, onDone: onDone });
  activeTimer = timer;
  const R = 108, C = 2 * Math.PI * R;
  $view.innerHTML = h`${segHTML()}${steps(3, 3)}
    <div class="row mb"><h2 class="grow">${esc(p.title)}</h2><button class="btn ghost small" id="regen">🔄</button></div>
    <div><span class="pill hot">${esc(CARDIO_MODES[cd.mode].label)}</span><span class="pill">${p.rounds} 輪</span><span class="pill">動 ${p.workSec}s</span><span class="pill">休 ${p.restSec}s</span><span class="pill">共 ${fmtClock(timer.totalSeconds)}</span></div>
    <div class="card mt">
      <div class="timer-wrap prep" id="tw">
        <div class="ring"><svg viewBox="0 0 240 240" width="240" height="240"><circle cx="120" cy="120" r="${R}" stroke="#2a3040" stroke-width="10" fill="none"/><circle id="arc" cx="120" cy="120" r="${R}" stroke="currentColor" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
          <div class="inner"><div class="timer-phase" id="ph">準備</div><div class="timer-clock" id="clk">${p.prepSec}</div><div class="timer-round" id="rd">第 0 / ${p.rounds} 輪</div></div></div>
        <div id="mv" class="mt" style="font-size:1.1rem;font-weight:700"></div>
      </div>
      <div class="row">
        <button class="btn primary big grow" id="startpause">▶ 開始</button>
        <button class="btn big" id="skip">⏭</button>
        <button class="btn big" id="restart">↺</button>
      </div>
    </div>
    <div class="card"><h3>動作輪替</h3><p class="muted">${p.moves.map((m, i) => `${i + 1}. ${esc(m)}`).join('　')}</p>${p.note ? `<p class="muted small">${esc(p.note)}</p>` : ''}</div>
    <div id="save-area"></div>
    <button class="btn ghost block" id="reset">重新選擇</button>`;

  bindSeg();
  const $tw = q('#tw'), $ph = q('#ph'), $clk = q('#clk'), $rd = q('#rd'), $mv = q('#mv'), $arc = q('#arc'), $sp = q('#startpause');
  function paint(t) {
    const names = { prep: '準備', work: '動作！', rest: '休息', done: '完成 🎉' };
    $tw.className = `timer-wrap ${t.phase}`;
    $ph.textContent = names[t.phase];
    $clk.textContent = t.phase === 'done' ? '✓' : t.remaining;
    $rd.textContent = `第 ${Math.min(t.round, t.rounds)} / ${t.rounds} 輪`;
    $mv.textContent = t.phase === 'work' ? p.moves[(t.round - 1) % p.moves.length] : t.phase === 'rest' ? `下一個：${p.moves[t.round % p.moves.length]}` : '';
    const frac = t.phase === 'done' ? 1 : 1 - t.remaining / t.phaseTotal;
    $arc.style.strokeDashoffset = String(C * (1 - frac));
    $sp.textContent = t.running ? '⏸ 暫停' : t.finished ? '已完成' : '▶ 開始';
  }
  $sp.onclick = () => { beep(880, 60); timer.running ? timer.pause() : timer.start(); paint(timer); };
  q('#skip').onclick = () => { if (!timer.finished) { timer.skip(); paint(timer); } };
  q('#restart').onclick = () => { timer.reset(); paint(timer); q('#save-area').innerHTML = ''; };
  q('#regen').onclick = () => { timer.stop(); cd.plan = null; renderCardio(); };
  q('#reset').onclick = () => { timer.stop(); Object.assign(cd, { mode: null, type: null, plan: null }); renderCardio(); };
  function onDone() {
    q('#save-area').innerHTML = `<div class="card accent"><h3>做完了！</h3>
      <label class="field"><span>備註（選填）</span><textarea id="note"></textarea></label>
      <button class="btn primary big block" id="save">✅ 儲存紀錄</button></div>`;
    q('#save').onclick = async () => {
      await store.add({ type: 'cardio', date: todayStr(), mode: cd.mode, cardioType: cd.type, title: p.title, durationSec: timer.totalSeconds, rounds: p.rounds, workSec: p.workSec, restSec: p.restSec, note: q('#note').value.trim() });
      toast('已儲存 🔥'); Object.assign(cd, { mode: null, type: null, plan: null }); navigate('home');
    };
  }
}

function renderRun() {
  const p = cd.plan;
  const sw = new Stopwatch((s) => { q('#clk').textContent = fmtClock(s.elapsed / 1000); });
  activeTimer = sw;
  $view.innerHTML = h`${segHTML()}${steps(3, 3)}
    <div class="row mb"><h2 class="grow">${esc(p.title)}</h2><button class="btn ghost small" id="regen">🔄</button></div>
    <div><span class="pill hot">${esc(CARDIO_MODES[cd.mode].label)}</span><span class="pill">目標 ${p.targetMinutes} 分</span><span class="pill">約 ${p.targetKm} km</span></div>
    ${p.paceHint ? `<p class="muted mt">配速建議：${esc(p.paceHint)}</p>` : ''}
    <div class="card mt">
      <div class="timer-wrap work"><div class="timer-clock" id="clk">0:00</div><div class="timer-round">碼表（可不用，直接填手錶數據）</div></div>
      <div class="row"><button class="btn primary big grow" id="sp">▶ 開始</button><button class="btn big" id="rs">↺</button></div>
    </div>
    <div class="card">
      <h3>跑完填入</h3>
      <p class="muted small">PWA 無法直接讀取 Samsung Health / Google Health Connect，請從手錶或 App 抄數據。</p>
      <div class="row">
        <label class="field grow"><span>時間（分）</span><input type="number" inputmode="decimal" id="min" placeholder="30"></label>
        <label class="field grow"><span>距離（km）</span><input type="number" inputmode="decimal" step="0.01" id="km" placeholder="5.0"></label>
      </div>
      <label class="field"><span>備註（選填）</span><textarea id="note"></textarea></label>
      <button class="btn primary big block" id="save">✅ 儲存紀錄</button>
    </div>
    <button class="btn ghost block" id="reset">重新選擇</button>`;
  bindSeg();
  q('#sp').onclick = () => { if (sw.running) { sw.pause(); q('#sp').textContent = '▶ 繼續'; } else { sw.start(); q('#sp').textContent = '⏸ 暫停'; } q('#min').value = (sw.elapsed / 60000).toFixed(1); };
  q('#rs').onclick = () => { sw.reset(); q('#sp').textContent = '▶ 開始'; };
  q('#regen').onclick = () => { sw.pause(); cd.plan = null; renderCardio(); };
  q('#reset').onclick = () => { sw.pause(); Object.assign(cd, { mode: null, type: null, plan: null }); renderCardio(); };
  q('#save').onclick = async () => {
    const min = Number(q('#min').value) || sw.elapsed / 60000;
    const km = Number(q('#km').value) || 0;
    if (!min) { toast('請填時間'); return; }
    sw.pause();
    await store.add({ type: 'cardio', date: todayStr(), mode: cd.mode, cardioType: 'run', title: p.title, durationSec: Math.round(min * 60), distanceKm: km ? Math.round(km * 100) / 100 : null, note: q('#note').value.trim() });
    toast('已儲存 🏃'); Object.assign(cd, { mode: null, type: null, plan: null }); navigate('home');
  };
}

// ================= 表現 =================
function trainings() { return store.workouts.filter((w) => w.type === 'strength' || w.type === 'cardio'); }

// ================= 體重 =================
function renderBody() {
  setTitle('體重');
  const prof = getProfile(store.workouts) || {};
  const entries = weightEntries(store.workouts);
  const plan = computePlan(store.workouts);
  const last = entries[entries.length - 1];
  const needProfile = !prof.height || !prof.age || !prof.sex;
  const bar = (k, label, g, pct, color) => `<div class="macro"><div class="row"><b class="grow">${label}</b><span><b>${g}</b> g</span><span class="muted small" style="width:48px;text-align:right">${pct}%</span></div><div class="mbar"><i style="width:${pct}%;background:${color}"></i></div></div>`;
  $view.innerHTML = h`
    <div class="card">
      <h3>記錄體重</h3>
      <div class="row" style="gap:8px">
        <label class="field grow"><span>體重 kg</span><input type="number" inputmode="decimal" step="0.1" id="kg" placeholder="${last ? last.kg : '70.0'}"></label>
        <label class="field grow"><span>體脂 %（選填）</span><input type="number" inputmode="decimal" step="0.1" id="bf" placeholder="${last && last.bodyFat ? last.bodyFat : '-'}"></label>
      </div>
      <label class="field"><span>日期</span><input type="date" id="bdate" value="${todayStr()}"></label>
      <button class="btn primary block" id="addw">✅ 記錄</button>
      <p class="muted small mt">建議每天早上起床、上完廁所、吃東西前量，數字最穩定。同一天記錄兩次會以最後一次為準。</p>
    </div>

    ${needProfile ? '' : plan.missing ? `<div class="card"><p class="muted">記錄第一筆體重後，就會算出每日熱量和三大營養素。</p></div>` : `
    <div class="card accent">
      <div class="row"><h3 class="grow">每日目標・${esc(plan.goal.label)}</h3><span class="pill hot">${plan.target.toLocaleString()} kcal</span></div>
      ${bar('p', '蛋白質', plan.macros.protein, plan.pct.protein, '#4f8cff')}
      ${bar('f', '脂肪', plan.macros.fat, plan.pct.fat, '#f5b942')}
      ${bar('c', '碳水', plan.macros.carb, plan.pct.carb, '#3ccf8e')}
      <p class="muted small mt"><b>${esc(plan.goal.label)}比例</b>：蛋白質 ${plan.goal.ratio.p}%・脂肪 ${plan.goal.ratio.f}%・碳水 ${plan.goal.ratio.c}%。${esc(plan.goal.why)}</p>
      <p class="muted small">換算每公斤體重：蛋白質 ${plan.perKg.protein} g・脂肪 ${plan.perKg.fat} g・碳水 ${plan.perKg.carb} g（蛋白質限制在 ${plan.goal.pRange[0]}-${plan.goal.pRange[1]} g/kg、脂肪至少 0.6 g/kg，超出的部分由碳水補）</p>
      <div class="note-box">
        <b>怎麼算出來的</b>
        <ul class="cues">
          <li>基礎代謝 BMR <b>${plan.bmr.toLocaleString()}</b> kcal（${esc(plan.bmrFormula)}，體重用最近 7 天平均 ${plan.weight.kg} kg）</li>
          <li>活動係數 <b>${plan.factor}</b>：最近 ${plan.freq.days} 天練了 ${plan.freq.count} 次，平均每週 ${plan.freq.perWeek} 次 → ${plan.exFactor}${plan.factor !== plan.exFactor ? `，加上平常活動 +${Math.round((plan.factor - plan.exFactor) * 100) / 100}` : ''}</li>
          <li>TDEE（每日總消耗）= ${plan.bmr.toLocaleString()} × ${plan.factor} = <b>${plan.tdee.toLocaleString()}</b> kcal</li>
          <li>${esc(plan.goal.label)}：${esc(plan.goal.desc)} → <b>${plan.target.toLocaleString()}</b> kcal</li>
        </ul>
        <p class="muted small">每記錄一次體重、或存一次訓練，都會重新計算。</p>
      </div>
      <div class="note-box"><b>體重趨勢</b><p class="small">${esc(trendAdvice(plan))}</p>
        <p class="muted small">不要只看熱量差，要看身體的變化去調整飲食（譚成義）。每 1-2 週看一次趨勢，一次只調 20-30 g 碳水。</p></div>
    </div>`}

    ${entries.length >= 2 ? `<div class="card"><h3>體重變化</h3><div class="chart-box">${lineChartSVG([{ name: '體重', color: '#4f8cff', points: entries.map((e) => ({ x: e.date, y: e.kg })) }])}</div></div>` : ''}

    <details class="card" ${needProfile ? 'open' : ''}>
      <summary><b>個人資料</b>${needProfile ? '<span class="pill hot">先填這裡</span>' : `<span class="muted small">・${prof.sex === 'male' ? '男' : '女'}・${prof.age} 歲・${prof.height} cm・${esc(GOALS_BODY[prof.goal || 'maintain'].label)}</span>`}</summary>
      <div class="presets mt">${[['male', '男'], ['female', '女']].map(([k, l]) => `<button class="btn ${prof.sex === k ? 'active' : ''}" data-sex="${k}">${l}</button>`).join('')}</div>
      <div class="row mt" style="gap:8px">
        <label class="field grow"><span>年齡</span><input type="number" inputmode="numeric" id="age" value="${prof.age || ''}"></label>
        <label class="field grow"><span>身高 cm</span><input type="number" inputmode="decimal" id="height" value="${prof.height || ''}"></label>
      </div>
      <h3 class="mt">目標</h3>
      <div class="choice-grid row3">${Object.entries(GOALS_BODY).map(([k, v]) => `<div class="choice ${(prof.goal || 'maintain') === k ? 'selected' : ''}" data-goal="${k}"><div>${esc(v.label)}</div></div>`).join('')}</div>
      <h3 class="mt">平常（不含訓練）的活動量</h3>
      <div class="choice-grid row3">${Object.entries(DAILY_ACTIVITY).map(([k, v]) => { const main = v.label.split('（')[0]; return `<div class="choice ${(prof.activity || 'sit') === k ? 'selected' : ''}" data-act="${k}"><div>${esc(main)}</div></div>`; }).join('')}</div>
      <button class="btn primary block mt" id="savep">儲存個人資料</button>
    </details>

    ${entries.length ? `<div class="card"><h3>體重紀錄</h3>${[...entries].reverse().slice(0, 30).map((e) => `<div class="history-item"><div><div class="t">${e.kg} kg${e.bodyFat ? `・體脂 ${e.bodyFat}%` : ''}</div><div class="d">${e.date}</div></div><button class="btn ghost small" data-delw="${e.id}">🗑</button></div>`).join('')}</div>` : ''}`;

  const draft = { sex: prof.sex, goal: prof.goal || 'maintain', activity: prof.activity || 'sit' };
  const mark = (attr, val) => qa(`[data-${attr}]`).forEach((el) => el.classList.toggle(el.classList.contains('choice') ? 'selected' : 'active', el.dataset[attr] === val));
  qa('[data-sex]').forEach((b) => b.onclick = () => { draft.sex = b.dataset.sex; mark('sex', draft.sex); });
  qa('[data-goal]').forEach((b) => b.onclick = () => { draft.goal = b.dataset.goal; mark('goal', draft.goal); });
  qa('[data-act]').forEach((b) => b.onclick = () => { draft.activity = b.dataset.act; mark('act', draft.activity); });
  q('#savep').onclick = async () => {
    const age = Number(q('#age').value), height = Number(q('#height').value);
    if (!draft.sex || !age || !height) { toast('請填性別、年齡和身高'); return; }
    await store.add({ id: 'profile', type: 'profile', date: '1900-01-01', ...prof, ...draft, age, height });
    toast('已更新，熱量和營養素重新計算了');
  };
  q('#addw').onclick = async () => {
    const kg = Number(q('#kg').value), bf = Number(q('#bf').value);
    if (!(kg > 20 && kg < 300)) { toast('請輸入體重'); return; }
    const date = q('#bdate').value || todayStr();
    await store.add({ id: `w-${date}`, type: 'weight', date, kg: Math.round(kg * 10) / 10, ...(bf > 0 && bf < 70 ? { bodyFat: Math.round(bf * 10) / 10 } : {}) });
    toast('已記錄 ⚖️');
  };
  qa('[data-delw]').forEach((b) => b.onclick = async () => { if (confirm('刪除這筆體重？')) await store.remove(b.dataset.delw); });
}

function renderStats() {
  setTitle('表現');
  const ws = store.workouts.filter((w) => w.type === 'strength');
  const series = BIG_THREE.map((name, i) => {
    const byDate = new Map();
    ws.forEach((w) => w.exercises.forEach((e) => { if (e.name === name && e.e1rm) byDate.set(w.date, Math.max(byDate.get(w.date) || 0, e.e1rm)); }));
    return { name, color: SERIES_COLORS[i], points: [...byDate.entries()].map(([x, y]) => ({ x, y })) };
  });
  const best = series.map((s) => s.points.length ? Math.max(...s.points.map((p) => p.y)) : 0);
  const latest = series.map((s) => { const pts = [...s.points].sort((a, b) => a.x.localeCompare(b.x)); return pts.length ? pts[pts.length - 1].y : 0; });
  const total = best.reduce((a, b) => a + b, 0);

  // 所有有重量的動作 → 目前最佳估算 1RM
  const bestAll = new Map();
  ws.forEach((w) => w.exercises.forEach((e) => { if (e.e1rm) { const cur = bestAll.get(e.name); if (!cur || e.e1rm > cur.v) bestAll.set(e.name, { v: e.e1rm, d: w.date, w: e.weight, r: e.reps }); } }));

  $view.innerHTML = h`
    <div class="stat-tiles">
      ${series.map((s, i) => `<div class="tile"><div class="v" style="color:${s.color}">${latest[i] || '-'}</div><div class="k">${esc(s.name)}<br>最新估 1RM</div></div>`).join('')}
    </div>
    <div class="card">
      <div class="row"><h3 class="grow">三大項估算 1RM 趨勢（kg）</h3><span class="muted small">總和 ${Math.round(total)}</span></div>
      <div class="chart-box">${lineChartSVG(series)}</div>
      <div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)} 最佳 ${best[series.indexOf(s)] || '-'}</span>`).join('')}</div>
      <p class="muted small mt">估算公式：Epley，1RM = 重量 × (1 + 次數 ÷ 30)。同一天多次取最高。</p>
    </div>
    <div class="card">
      <h3>各動作最佳估算 1RM</h3>
      ${bestAll.size ? [...bestAll.entries()].sort((a, b) => b[1].v - a[1].v).map(([n, x]) => `<div class="history-item"><div><div class="t">${esc(n)}</div><div class="d">${x.d}・${x.w} kg × ${x.r}</div></div><div style="font-weight:800">${x.v} kg</div></div>`).join('') : '<p class="muted">還沒有有重量的紀錄。</p>'}
    </div>
    <div class="card">
      <h3>全部紀錄（${trainings().length}）</h3>
      ${trainings().length ? trainings().map(historyRow).join('') : '<p class="muted">無</p>'}
    </div>`;
  bindHistoryRows();
}

// ================= 設定 =================
function renderSettings() {
  const $body = document.getElementById('settings-body');
  const q = (sel) => $body.querySelector(sel);
  $body.innerHTML = h`
    <div class="card">
      <h3>Gemini API</h3>
      <p class="muted small">Key 只存在這支手機的瀏覽器裡，不會上傳到 Firebase。到 <code>aistudio.google.com/apikey</code> 取得，開頭通常是 <code>AIza</code>。</p>
      <label class="field"><span>API key</span><input type="password" id="gkey" value="${esc(getGeminiKey())}" placeholder="AIza..."></label>
      <label class="field"><span>模型</span><input type="text" id="gmodel" value="${esc(getGeminiModel())}" placeholder="${GEMINI_DEFAULT_MODEL}"></label>
      <div class="row"><button class="btn primary grow" id="savekey">儲存</button><button class="btn" id="testkey">測試連線</button></div>
    </div>
    <div class="card">
      <h3>雲端同步（Firebase）</h3>
      <p class="muted small">目前模式：<b>${store.mode === 'firebase' ? 'Firebase' : '本機儲存'}</b>${store.user ? `，已登入 ${esc(store.user.email || store.user.displayName || '')}` : ''}</p>
      ${store.mode === 'firebase'
        ? (store.user ? `<button class="btn block" id="logout">登出</button>` : `<button class="btn primary block" id="login">使用 Google 登入</button>`)
        : `<p class="muted small">要啟用同步，請把 Firebase 專案設定貼到 <code>js/config.js</code> 的 firebaseConfig（看 README）。</p>`}
    </div>`;
  q('#savekey').onclick = () => { setGeminiKey(q('#gkey').value); setGeminiModel(q('#gmodel').value); toast('已儲存'); };
  q('#testkey').onclick = async () => {
    setGeminiKey(q('#gkey').value); setGeminiModel(q('#gmodel').value);
    toast('測試中…');
    try { const r = await generateCardioPlan({ mode: 'fat', type: 'tabata', location: 'home' }); toast(`✅ 成功：${r.title}`, 3000); }
    catch (e) { toast('❌ ' + e.message, 5000); }
  };
  q('#login') && (q('#login').onclick = async () => {
    try { await store.signIn(); }
    catch (e) {
      const msg = {
        'auth/unauthorized-domain': `這個網址（${location.hostname}）沒有被允許登入。手機請用 https://fit-app-915f9.web.app 開啟；電腦請用 http://localhost:8080`,
        'auth/popup-closed-by-user': '登入視窗被關掉了，再試一次',
        'auth/network-request-failed': '網路連不上 Google，檢查網路後再試',
        'auth/operation-not-allowed': 'Firebase 還沒開啟 Google 登入（Authentication → 登入方式）'
      }[e.code] || `登入失敗：${e.code || e.message}`;
      toast(msg, 8000);
    }
  });
  q('#logout') && (q('#logout').onclick = () => store.signOut());
}

// ---------- 啟動 ----------
(async () => {
  await store.init();
  updateBadge();
  navigate('home');
})();
