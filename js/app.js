import { GOALS, LOCATIONS, MUSCLE_GROUPS, BIG_THREE, CARDIO_MODES, CARDIO_TYPES, GEMINI_DEFAULT_MODEL } from './config.js';
import { store, estimate1RM, todayStr } from './store.js';
import { generateSplitMenu, generateStrengthMenu, fallbackStrengthMenu, generateCardioPlan, fallbackCardioPlan, getGeminiKey, setGeminiKey, getGeminiModel, setGeminiModel, generateMealPlan, analyzeFoodPhoto, generateWeeklyReview, readNutritionLabel, readFoodList, estimateFood } from './gemini.js';
import { SLOTS, SLOT_LABEL, slotOfMeal, slotOfEntry, dayDiary, planMealItems, sumItems, cleanItem, amountText, scaleItem, foodsOf, searchFoods, portion, foodFromLabel, foodFromOFF, newId, fmtQty, loadTfnd, foodsFromList } from './diary.js';
import { weeklyData, localReview, reviewDataText } from './review.js';
import { FOODS, localMealPlan, sanitizeMealPlan, totalsOf, unitText, rebalance, eatenTotals, extrasTotals, portionText, HAND_GUIDE } from './meals.js';
import { IntervalTimer, Stopwatch, Countdown, fmtClock, beep } from './timer.js';
import { lineChartSVG, SERIES_COLORS } from './chart.js';
import { GOALS_BODY, DAILY_ACTIVITY, dayPlan, computePlan, trendAdvice, weightEntries, getProfile } from './nutrition.js';
import { creatorMenusFor, PART_LABELS, CREATORS } from './creators.js';
import { GROUP_CUES, PRINCIPLES, suggestNext, repRange, groupHistory, daysSince, AI_STATES, AI_MINUTES, tipsFor, cuesFor, generalCues, embedUrl } from './coaching.js';
import { plannedSets, summarizeSets, formatSets, exerciseHistory, deloadTarget, activeDeloadWeek, deloadAdvice, addDays, DELOAD_DAYS, muscleReport, weeklyMuscleSeries, MUSCLE_TARGETS } from './progression.js';
import { CYCLE, cycleRecord, cycleWeek, planMods, trainPrefs, mondayOf } from './cycle.js';
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
  ({ home: renderHome, train: renderTrain, stats: renderStats, body: renderBody, diet: renderDiet })[r]();
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

// Gemini key 跨裝置：登入 Google 後存在自己的 Firestore（{id:'settings'}，只有本人讀得到）；
// 這台沒有 key、雲端有 → 自動帶入；這台有、雲端沒有 → 自動上傳
function cloudSettings() { return store.workouts.find((w) => w.type === 'settings') || null; }
let keySyncing = false;
async function syncGeminiKey() {
  if (store.mode !== 'firebase' || !store.user || keySyncing) return;
  const c = cloudSettings();
  if (c && c.geminiKey && !getGeminiKey()) { setGeminiKey(c.geminiKey); if (c.geminiModel) setGeminiModel(c.geminiModel); return; }
  if (getGeminiKey() && (!c || !c.geminiKey)) {
    keySyncing = true;
    try { await store.add({ id: 'settings', type: 'settings', geminiKey: getGeminiKey(), geminiModel: getGeminiModel() }); } catch (e) { console.warn('key 同步失敗', e); }
    keySyncing = false;
  }
}
async function pushGeminiKey() {
  if (store.mode !== 'firebase' || !store.user) return false;
  await store.add({ ...(cloudSettings() || {}), id: 'settings', type: 'settings', geminiKey: getGeminiKey(), geminiModel: getGeminiModel() });
  return true;
}
store.subscribe(() => {
  updateBadge();
  syncGeminiKey();
  if (['home', 'stats', 'body', 'diet'].includes(route)) navigate(route);
  if (!$modal.hidden) renderSettings();
});
function updateBadge() {
  if (store.mode === 'firebase') {
    if (store.user) { $badge.textContent = '雲端同步'; $badge.className = 'badge ok'; }
    else { $badge.textContent = '未登入'; $badge.className = 'badge warn'; }
  } else { $badge.textContent = '本機'; $badge.className = 'badge'; }
}

// ================= 首頁 =================
// 首頁最上面：下次輪到三分化第幾天（大數字）、週期階段、開始按鈕、這週練了幾次
function heroHTML(ws, total, strength, cardio) {
  const day = nextSplitDay(ws), cw = curCycle();
  return `<section class="hero">
    <div class="hero-top"><span>下次重訓</span><span>三分化・第 ${splitProgress(ws).round} 輪</span></div>
    <div class="hero-main"><div class="hero-num" aria-label="第 ${day} 天">${day}</div>
      <div><div class="hero-day">第 ${day} 天</div><div class="hero-parts">${esc(SPLIT_DAYS[day].short)}</div>${cw ? `<div class="hero-phase ${cw.phase}">${esc(cycleTitle(cw))}</div>` : ''}</div></div>
    ${cw ? cycleBarHTML(cw) : ''}
    <div class="hero-actions"><button class="btn primary big" id="go-strength">開始重訓</button><button class="btn big" id="go-cardio">有氧</button></div>
    <div class="hero-week">這週練了 <b>${total}</b> 次${total ? `（重訓 <b>${strength}</b>、有氧 <b>${cardio}</b>）` : ''}</div>
  </section>`;
}
function renderHome() {
  setTitle('我的健身');
  const ws = trainings();
  const plan = todayPlan();
  const week = weekStart();
  const thisWeek = ws.filter((w) => w.date >= week);
  const strengthCount = thisWeek.filter((w) => w.type === 'strength').length;
  const cardioCount = thisWeek.filter((w) => w.type === 'cardio').length;
  const last = ws[0];
  $view.innerHTML = h`
    ${heroHTML(ws, thisWeek.length, strengthCount, cardioCount)}
    ${resumeCardHTML()}
    ${reviewDue() ? `<div class="card review" id="rv-home"><div class="row"><div class="grow"><h3>這週的回顧可以看了</h3><p class="muted small">訓練、體重、飲食一起看，下週要調整什麼。</p></div><button class="btn primary" id="rv-home-go">看回顧</button></div></div>` : ''}
    ${deloadCardHTML()}
    <div class="card" id="go-body">${plan.missing ? `<h3>⚖️ 每日熱量與營養素</h3><p class="muted small">${plan.missing === 'profile' ? '到「體重」頁填個人資料並記錄體重，就會算出你的 TDEE 和三大營養素。' : '到「體重」頁記錄今天的體重，就會算出你的 TDEE 和三大營養素。'}</p>`
      : `<div class="row"><div class="grow"><div class="muted small">今日目標（${esc(plan.goal.label)}${plan.dayType ? `・${plan.dayType === 'train' ? '練習日' : '休息日'}` : ''}）</div><div class="stat-num"><b>${plan.target.toLocaleString()}</b> kcal</div></div><div class="muted small" style="text-align:right">TDEE ${plan.tdee.toLocaleString()}<br>體重 ${plan.weight.kg} kg</div></div>
        <div class="macro-mini"><span>蛋白質 <b>${plan.macros.protein}g</b></span><span>脂肪 <b>${plan.macros.fat}g</b></span><span>碳水 <b>${plan.macros.carb}g</b></span></div>`}</div>
    ${store.mode === 'firebase' && !store.user ? `<div class="card accent"><h3>登入 Google 以同步紀錄</h3><p class="muted">登入後紀錄會存到 Firebase，換手機也在。</p><button class="btn primary block" id="login">使用 Google 登入</button></div>` : ''}
    <div class="card">
      <h3>最近紀錄</h3>
      ${ws.length ? ws.slice(0, 8).map(historyRow).join('') : '<p class="muted">還沒有紀錄，從上面開始第一次訓練吧。</p>'}
    </div>`;
  q('#go-strength').onclick = () => navigate('train', 'strength');
  bindDeloadCard();
  bindResumeCard(renderHome);
  q('#rv-home-go') && (q('#rv-home-go').onclick = () => { autoReview = true; navigate('stats'); });
  q('#go-body').onclick = () => navigate(plan.missing ? 'body' : 'diet');
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
// ---- 週期、加強部位 ----
function curCycle() { return cycleWeek(store.workouts, todayStr()); }
function focusMuscles() { return trainPrefs(store.workouts).focus || []; }
// 現在是不是減量週：手動開的減量週，或週期排到的減量週
function deloadNow() { const c = curCycle(); return !!activeDeloadWeek(store.workouts, todayStr()) || (c && c.phase === 'deload'); }
function cycleBarHTML(cw) { return `<div class="cy-bar">${CYCLE.map((x, i) => `<span class="cy-seg ${x.phase} ${cw && cw.index === i ? 'on' : ''}">${x.short}</span>`).join('')}</div>`; }
function cycleTitle(cw) { return `${cw.label}${cw.phase === 'deload' ? '' : ` 第 ${cw.week} 週`}`; }
// 減量週：停滯的動作 ≥ 3 個，或連續練了 8 週沒減量 → 首頁建議
const DELOAD_SKIP_KEY = 'fitapp.deloadSkipUntil';
function deloadSkipUntil() { try { return localStorage.getItem(DELOAD_SKIP_KEY) || ''; } catch { return ''; } }
function deloadCardHTML() {
  const today = todayStr();
  const wk = activeDeloadWeek(store.workouts, today);
  const cw = curCycle();
  if (cw && !wk && route === 'home') return '';
  if (cw && !wk) return `<div class="card cycle ${cw.phase === 'deload' ? 'deload' : ''}"><div class="row"><h3 class="grow">${cw.phase === 'deload' ? '🌙' : '📅'} ${esc(cycleTitle(cw))}</h3><span class="muted small">週期第 ${cw.round} 輪</span></div>${cycleBarHTML(cw)}<p class="muted small mt">這週：${esc(cw.note)}。菜單會自動照這個調整。</p></div>`;
  if (wk) return `<div class="card deload"><div class="row"><div class="grow"><h3>🌙 減量週（到 ${wk.end.slice(5).replace('-', '/')}）</h3><p class="muted small">這週每個動作重量約平常的 9 成、組數減半、每組留 3 下。下週回到原本的重量。</p></div></div><button class="btn ghost small" id="dl-end">提前結束減量週</button></div>`;
  const a = deloadAdvice(store.workouts, today);
  if (!a.need || deloadSkipUntil() >= today) return '';
  const why = [a.stalled.length >= 3 ? `${a.stalled.length} 個動作連續 3 次以上沒進步` : '', a.weeks >= 8 ? `已經連續練了 ${a.weeks} 週沒減量` : ''].filter(Boolean).join('，');
  return `<div class="card deload"><h3>🌙 建議安排減量週</h3><p class="muted small">${esc(why)}。減量一週讓關節和神經恢復，之後通常能再突破。</p>
    ${a.stalled.length ? `<ul class="cues">${a.stalled.slice(0, 5).map((x) => `<li>${esc(x.name)}<span class="muted small">・連續 ${x.since} 次沒進步</span></li>`).join('')}</ul>` : ''}
    <div class="row mt" style="gap:8px"><button class="btn primary grow" id="dl-start">開始減量週（7 天）</button><button class="btn ghost" id="dl-skip">這週先不要</button></div></div>`;
}
function bindDeloadCard() {
  const today = todayStr();
  q('#dl-start') && (q('#dl-start').onclick = async () => { await store.add({ id: 'deload-week', type: 'deloadweek', start: today, end: addDays(today, DELOAD_DAYS - 1) }); toast('減量週開始 🌙 這週的菜單會自動減量'); renderHome(); });
  q('#dl-skip') && (q('#dl-skip').onclick = () => { try { localStorage.setItem(DELOAD_SKIP_KEY, addDays(today, 6)); } catch {} renderHome(); });
  q('#dl-end') && (q('#dl-end').onclick = async () => { if (!confirm('提前結束減量週？')) return; const wk = activeDeloadWeek(store.workouts, today); await store.add({ ...wk, end: addDays(today, -1) }); toast('已結束減量週'); renderHome(); });
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
    body = (w.deload ? '<p class="muted small">🌙 減量週</p>' : '') + w.exercises.map((e) => `
      <div class="history-item"><div><div class="t">${esc(e.name)}${e.deload ? ' <span class="pill">減量</span>' : ''}</div><div class="d">${esc(e.part || '')}・${esc(formatSets(e))}</div></div>
      <div class="muted small" style="text-align:right">${e.setsDone ?? e.sets ?? '-'} 組${e.e1rm ? `<br>估 1RM ${e.e1rm}` : ''}${e.volume && e.hasWeight ? `<br>總量 ${e.volume.toLocaleString()} kg` : ''}</div></div>`).join('');
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
// ---- 練到一半的暫存：每打勾、改數字、換頁都存一次；App 被關掉回來可以繼續 ----
const DRAFT_KEY = 'fitapp.draft';
const DRAFT_HOURS = 18;
function saveDraft() {
  if (!st.menu) return;
  const keep = ['mode', 'location', 'group', 'goal', 'menu', 'page', 'splitDay', 'addCore', 'slotChoice', 'warmMode'];
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ at: Date.now(), st: Object.fromEntries(keep.map((k) => [k, st[k]])) })); } catch {}
}
function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!d || !d.st || !d.st.menu || Date.now() - d.at > DRAFT_HOURS * 3600000) return null;
    return d;
  } catch { return null; }
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch {} }
function resumeCardHTML() {
  if (st.menu) return '';
  const d = loadDraft();
  if (!d) return '';
  const exs = d.st.menu.exercises || [];
  const done = exs.reduce((a, e) => a + (e.log || []).filter((s) => s.done).length, 0);
  const t = new Date(d.at);
  return `<div class="card accent" id="resume-card"><h3>⏸ 有一份還沒存的訓練</h3><p class="muted small">${esc(d.st.menu.title || '重訓')}・已完成 ${done} 組・最後動作 ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}</p>
    <div class="row" style="gap:8px"><button class="btn primary grow" id="resume-go">▶ 繼續</button><button class="btn ghost" id="resume-drop">放棄</button></div></div>`;
}
function bindResumeCard(after) {
  q('#resume-go') && (q('#resume-go').onclick = () => { const d = loadDraft(); if (!d) return; Object.assign(st, d.st); navigate('train', 'strength'); });
  q('#resume-drop') && (q('#resume-drop').onclick = () => { if (!confirm('放棄這份訓練？填過的組數會清掉。')) return; clearDraft(); after(); });
}
function renderStrengthStep(step) {
  const map = { location: ['選擇地點', LOCATIONS, 1], group: ['選擇肌群', MUSCLE_GROUPS, 2], goal: ['選擇目標', GOALS, 3] };
  const [label, items, n] = map[step];
  $view.innerHTML = h`${segHTML()}${steps(n - 1, st.mode === 'split' ? 3 : 4)}<h2>${label}</h2>${st.mode === 'free' && step === 'group' ? '<p class="muted small">自由選擇：這次不算進三分化進度。</p>' : ''}${choiceGrid(items, 'k', st[step], step === 'goal' ? 'full' : '')}
    ${n > 1 ? `<button class="btn ghost block mt" id="back">← 上一步</button>` : ''}`;
  bindSeg();
  if (step === 'location') { const seg = q('.seg'); const card = resumeCardHTML(); if (seg && card) { seg.insertAdjacentHTML('afterend', card); bindResumeCard(renderStrength); } }
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
      ${(() => { const cw = curCycle(); return deloadNow() ? '<div class="note-box deload mb">🌙 減量週：每個動作重量約 9 成、組數減半</div>' : cw ? `<div class="note-box cycle mb">📅 ${esc(cycleTitle(cw))}：${esc(cw.note)}</div>` : ''; })()}
      ${splitSlots(day).map((slot) => {
        const cands = candidatesFor(slot, st.location);
        const name = slotDefault(slot, cands);
        const md = planMods({ baseSets: slot.sets, baseReps: slot.reps, baseRir: '', role: slot.role, partKey: slot.partPick || slot.part }, curCycle(), focusMuscles());
        const adv = suggestNext(name, true, 'hypertrophy', store.workouts, repRange(md.reps));
        return `<div class="history-item"><div><div class="t">${esc(name)}${md.focus ? ' <span class="pill accent">🎯 加強</span>' : ''}</div><div class="d">${esc(slot.label)}・${md.sets} 組 × ${esc(md.reps)}${md.sets !== slot.sets || md.reps !== slot.reps ? `<span class="muted">（原本 ${slot.sets} × ${esc(slot.reps)}）</span>` : ''}・可替換 ${Math.max(0, cands.length - 1)} 個${adv && adv.deload && !deloadNow() ? '<br><span class="warn-text">🌙 停滯，今天這個動作減量</span>' : ''}</div></div></div>`;
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
// 減量：減量週（全部動作）或這個動作停滯（單一動作）→ 重量 9 成、組數減半、每組留 3 下；動作頁可切回照常練
function withSuggestions(menu) {
  const cw = curCycle(), focus = focusMuscles();
  const week = deloadNow();
  menu.deloadWeek = !!week;
  menu.cycle = cw ? { label: cycleTitle(cw), note: cw.note, phase: cw.phase } : null;
  menu.exercises.forEach((e) => {
    // 週期、加強部位從「原本的計畫」算起，重算幾次都不會疊加
    if (e.baseSets == null) { e.baseSets = plannedSets(e); e.baseReps = e.reps; e.baseRir = e.rir || ''; }
    const md = planMods(e, menu.split ? cw : (cw && cw.phase === 'deload' ? cw : null), focus);
    e.sets = md.sets; e.reps = md.reps; e.rir = md.rir; e.focus = md.focus;
    e.pro = tipsFor(e.name);
    const s = suggestNext(e.name, e.hasWeight, st.goal, store.workouts, menu.split ? repRange(e.reps) : null);
    const normal = s ? (s.normal || s) : null;
    e.normalPlan = { sets: e.sets, rir: e.rir || '', suggest: normal ? normal.text : '', suggestW: normal ? normal.weight : null };
    const dl = week ? deloadTarget(e.name, e.hasWeight, store.workouts) : s && s.deload ? s : null;
    e.deloadPlan = dl ? { sets: Math.max(2, Math.ceil(e.sets / 2)), rir: '3', suggest: dl.text, suggestW: dl.weight } : null;
    e.log = null;
    Object.assign(e, dl ? e.deloadPlan : e.normalPlan, { deload: !!dl });
  });
  return menu;
}
// 切換這個動作要不要減量（保留已經打勾的組）
function setDeload(e, on) {
  const plan = on ? e.deloadPlan : e.normalPlan;
  if (!plan) return;
  Object.assign(e, plan, { deload: on });
  if (!e.log) return;
  const done = e.log.filter((x) => x.done);
  const rest = Array.from({ length: Math.max(0, e.sets - done.length) }, () => ({ w: e.hasWeight ? (e.suggestW ?? '') : '', r: '', done: false }));
  e.log = [...done, ...rest];
}
// 每組的輸入（第一次進到這個動作才建立，預填建議重量）
function ensureLog(e) {
  if (e.log) return e.log;
  const w0 = e.hasWeight ? (e.suggestW ?? lastWeightFor(e.name) ?? '') : '';
  e.w0 = w0;
  e.log = Array.from({ length: plannedSets(e) }, () => ({ w: w0, r: '', done: false }));
  return e.log;
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
  saveDraft();

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
  q('#regen').onclick = () => { if (!confirm('離開這次訓練？填過的數字不會保存。')) return; clearDraft(); document.body.classList.remove('training'); restTimer.stop(); st.menu = null; st.page = null; st.useAI = false; st.aiReady = false; renderStrength(); };
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
  $p.innerHTML = `<div class="card ex-page">
    ${e.slotLabel ? `<div class="muted small">${esc(e.slotLabel)}${e.from ? `・${esc(e.from)}` : ''}</div>` : (m.creator ? `<div class="muted small">${esc(m.creator)}</div>` : '')}
    <h2 class="ex-title">${i + 1}. ${esc(e.name)}</h2>
    <div class="ex-plan"><span>${e.sets} 組</span><span>× ${esc(e.reps)}</span><span>休 ${esc(e.rest)}</span>${e.rir ? `<span>保留 ${esc(e.rir)} 下</span>` : ''}${e.focus ? '<span class="focus">🎯 加強 +1 組</span>' : ''}</div>
    ${m.cycle && !e.deload && i === 0 ? `<p class="muted small">📅 ${esc(m.cycle.label)}：${esc(m.cycle.note)}</p>` : ''}
    ${clip ? clipHTML(clip.url, clip.t, clip.label, clip.embed) : ''}
    ${e.suggest ? `<div class="note-box ${e.deload ? 'deload' : 'suggest'}">${e.deload ? '' : '📈 '}${esc(e.suggest)}</div>` : ''}
    ${e.deloadPlan ? `<button class="btn ghost small mt" id="dl-toggle">${e.deload ? '今天不減量，照常練' : '🌙 改回減量'}</button>` : ''}
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
    <div class="set-table" id="sets-${i}"></div>
    ${e.slot ? `<button class="btn ghost block mt" data-swap="${i}">🔄 換動作</button><div class="swap" id="swap-${i}" hidden></div>` : ''}
  </div>`;
  renderSetTable(q(`#sets-${i}`, $p), e);
  const dt = q('#dl-toggle', $p);
  if (dt) dt.onclick = () => { setDeload(e, !e.deload); renderExercisePage($p, m, i); };
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
      m.exercises[i] = slotExercise(slot, c.name, cands, { sets: e.baseSets ?? e.sets, reps: e.baseReps ?? e.reps, rir: e.baseRir ?? e.rir, why: '' });
      withSuggestions({ ...m, exercises: [m.exercises[i]] });
      renderStrengthMenu();
    });
  };
}
// 每一組一列：上次、kg、次數、✓（打勾自動開始組間休息）
function renderSetTable($box, e) {
  const log = ensureLog(e);
  saveDraft();
  const prev = exerciseHistory(e.name, store.workouts)[0];
  const prevText = (k) => { const s = prev && prev.sets[k]; return s ? (s.w > 0 ? `${s.w}×${s.r}` : `${s.r} 下`) : '-'; };
  $box.innerHTML = `
    <div class="set-head"><span>組</span><span>上次</span><span>${e.hasWeight ? 'kg' : ''}</span><span>次數</span><span></span></div>
    ${log.map((s, k) => `<div class="set-row ${s.done ? 'done' : ''}">
      <span class="n">${k + 1}</span><span class="prev">${prevText(k)}</span>
      ${e.hasWeight ? `<input type="number" inputmode="decimal" step="0.5" placeholder="kg" data-sw="${k}" value="${esc(String(s.w ?? ''))}">` : '<span class="muted center small">徒手</span>'}
      <input type="number" inputmode="numeric" placeholder="${esc(String(repRange(e.reps)?.[1] ?? '次'))}" data-sr="${k}" value="${esc(String(s.r ?? ''))}">
      <button class="btn ok" data-sd="${k}">${s.done && s.rir != null ? `留${s.rir >= 4 ? '4+' : s.rir}` : '✓'}</button></div>
      ${e.rirAsk === k && s.done ? `<div class="rir-ask"><span class="muted small">還能再做幾下？</span>${[0, 1, 2, 3, 4].map((n) => `<button class="btn small" data-rir="${n}">${n === 4 ? '4+' : n}</button>`).join('')}<button class="btn ghost small" data-rirskip>略過</button></div>` : ''}`).join('')}
    <div class="set-actions"><button class="btn ghost small grow" data-addset>＋ 加一組</button>${log.length > 1 ? '<button class="btn ghost small grow" data-delset>－ 刪最後一組</button>' : ''}</div>
    <p class="muted small">做完一組按 ✓，休息計時會自動開始；kg 會帶到下一組。「還能再做幾下」選填，填了加重會更準。</p>`;
  qa('[data-sw]', $box).forEach((el) => el.oninput = () => { log[Number(el.dataset.sw)].w = el.value; saveDraft(); });
  qa('[data-sr]', $box).forEach((el) => el.oninput = () => { log[Number(el.dataset.sr)].r = el.value; saveDraft(); });
  qa('[data-sd]', $box).forEach((el) => el.onclick = () => {
    const k = Number(el.dataset.sd), s = log[k];
    if (!s.done && !(Number(s.r) > 0)) { const r = q(`[data-sr="${k}"]`, $box); r.focus(); toast('先填這組做了幾下'); return; }
    s.done = !s.done;
    e.rirAsk = s.done ? k : null;
    if (!s.done) delete s.rir;
    if (s.done) {
      const nx = log[k + 1];
      // kg 帶到下一組；但比預填重量輕很多的（熱身組）不帶
      if (nx && !nx.done && e.hasWeight && s.w !== '' && (nx.w === '' || !(Number(e.w0) > 0) || Number(s.w) >= Number(e.w0) * 0.9)) nx.w = s.w;
      if (log.every((x) => x.done)) toast('這個動作完成了 💪');
      if (restTimer) { restTimer.reset(); restTimer.start(); }
    }
    renderSetTable($box, e);
  });
  qa('[data-rir]', $box).forEach((el) => el.onclick = () => { log[e.rirAsk].rir = Number(el.dataset.rir); e.rirAsk = null; renderSetTable($box, e); });
  q('[data-rirskip]', $box) && (q('[data-rirskip]', $box).onclick = () => { e.rirAsk = null; renderSetTable($box, e); });
  const add = q('[data-addset]', $box);
  add.onclick = () => { const l = log[log.length - 1]; log.push({ w: l ? l.w : '', r: '', done: false }); renderSetTable($box, e); };
  const del = q('[data-delset]', $box);
  if (del) del.onclick = () => { log.pop(); renderSetTable($box, e); };
}
// 存檔用：有填次數的組（打勾或沒打勾都算）
function loggedSets(e) { return summarizeSets((e.log || []).filter((s) => s.done || Number(s.r) > 0), e.hasWeight); }
function renderFinishPage($p, m) {
  const groups = m.split ? SPLIT_DAYS[m.split].groups : [st.group];
  const gen = [...generalCues(groups), ...(m.split ? PRINCIPLES.filter((p) => p.from.includes('譚成義')).slice(0, 3) : [])];
  $p.innerHTML = `<div class="card ex-page">
    <h2>✅ 今天練完了</h2>
    ${m.deloadWeek ? '<p class="muted small">🌙 這次是減量週</p>' : ''}
    ${m.exercises.map((e) => { const x = loggedSets(e); return `<div class="history-item"><div><div class="t">${esc(e.name)}${e.deload ? ' <span class="pill">減量</span>' : ''}</div><div class="d">${x.setsDone ? esc(formatSets(x)) : '還沒填'}</div></div><div class="muted small" style="text-align:right">${x.setsDone}/${e.sets} 組${x.e1rm ? `<br>估 1RM ${x.e1rm}` : ''}</div></div>`; }).join('')}
    ${gen.length ? `<details class="mt"><summary class="muted small">今天的訓練原則</summary><ul class="cues">${gen.map((c) => `<li>${esc(c.text)}<span class="muted small">・${esc(c.from)}</span></li>`).join('')}</ul></details>` : ''}
    ${m.note ? `<p class="muted small mt">${esc(m.note)}</p>` : ''}
    <label class="field"><span>日期</span><input type="date" id="date" value="${todayStr()}"></label>
    <label class="field"><span>備註（選填）</span><textarea id="note" placeholder="今天狀態、下次要加重…"></textarea></label>
    <button class="btn primary big block" id="save">✅ 儲存這次訓練</button>
    <button class="btn ghost block mt" id="reset">重新選擇</button>
  </div>`;
  q('#reset', $p).onclick = () => { if (!confirm('放棄這次訓練、重新選擇？')) return; clearDraft(); document.body.classList.remove('training'); restTimer && restTimer.stop(); resetStrength(); renderStrength(); };
  q('#save', $p).onclick = async () => {
    const exercises = m.exercises.map((e) => ({
      name: e.name, part: e.part, ...(e.partKey ? { partKey: e.partKey } : {}), hasWeight: e.hasWeight, sets: plannedSets(e), ...loggedSets(e),
      ...(e.deload ? { deload: true } : {}), ...(e.slot ? { slot: e.slot } : {})
    }));
    if (!exercises.some((e) => e.reps > 0)) { if (!confirm('還沒填任何次數，確定要儲存嗎？')) return; }
    await store.add({ type: 'strength', date: q('#date', $p).value || todayStr(), location: st.location, group: m.split ? `split${m.split}` : st.group, goal: st.goal, ...(m.split ? { split: { day: m.split } } : {}), ...(m.deloadWeek ? { deload: true } : {}), title: m.title, source: m.url || null, exercises, note: q('#note', $p).value.trim() });
    clearDraft();
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
        <div class="ring"><svg viewBox="0 0 240 240" width="240" height="240"><circle cx="120" cy="120" r="${R}" stroke="#33373d" stroke-width="10" fill="none"/><circle id="arc" cx="120" cy="120" r="${R}" stroke="currentColor" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
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
      ${bar('p', '蛋白質', plan.macros.protein, plan.pct.protein, '#3b7be6')}
      ${bar('f', '脂肪', plan.macros.fat, plan.pct.fat, '#f2c230')}
      ${bar('c', '碳水', plan.macros.carb, plan.pct.carb, '#34b866')}
      <p class="muted small mt"><b>${esc(plan.goal.label)}比例</b>：蛋白質 ${plan.goal.ratio.p}%・脂肪 ${plan.goal.ratio.f}%・碳水 ${plan.goal.ratio.c}%。${esc(plan.goal.why)}</p>
      <p class="muted small">換算每公斤體重：蛋白質 ${plan.perKg.protein} g・脂肪 ${plan.perKg.fat} g・碳水 ${plan.perKg.carb} g（蛋白質限制在 ${plan.goal.pRange[0]}-${plan.goal.pRange[1]} g/kg、脂肪至少 0.6 g/kg，超出的部分由碳水補）</p>
      <div class="note-box">
        <b>怎麼算出來的</b>
        <ul class="cues">
          <li>基礎代謝 BMR <b>${plan.bmr.toLocaleString()}</b> kcal（${esc(plan.bmrFormula)}，體重用最近 7 天平均 ${plan.weight.kg} kg）</li>
          <li>活動係數 <b>${plan.factor}</b>：最近 ${plan.freq.days} 天練了 ${plan.freq.count} 次，平均每週 ${plan.freq.perWeek} 次 → ${plan.exFactor}${plan.factor !== plan.exFactor ? `，加上平常活動 +${Math.round((plan.factor - plan.exFactor) * 100) / 100}` : ''}</li>
          <li>TDEE（每日總消耗）= ${plan.bmr.toLocaleString()} × ${plan.factor} = <b>${plan.tdee.toLocaleString()}</b> kcal</li>
          <li>${esc(plan.goal.label)}：${esc(plan.goal.desc)} → <b>${plan.target.toLocaleString()}</b> kcal（每日平均）</li>
          ${(() => { const cy = dayPlan(plan, 'train').cycle; return cy ? `<li>每週練約 ${cy.n} 次 → 練習日 <b>${cy.train.kcal.toLocaleString()}</b> kcal（碳水 ${cy.train.carb} g）、休息日 <b>${cy.rest.kcal.toLocaleString()}</b> kcal（碳水 ${cy.rest.carb} g），蛋白質和脂肪兩天一樣</li>` : ''; })()}
        </ul>
        <p class="muted small">每記錄一次體重、或存一次訓練，都會重新計算。</p>
      </div>
      <div class="note-box"><b>體重趨勢</b><p class="small">${esc(trendAdvice(plan))}</p>
        <p class="muted small">不要只看熱量差，要看身體的變化去調整飲食（譚成義）。每 1-2 週看一次趨勢，一次只調 20-30 g 碳水。</p></div>
    </div>`}

    ${entries.length >= 2 ? `<div class="card"><h3>體重變化</h3><div class="chart-box">${lineChartSVG([{ name: '體重', color: '#3b7be6', points: entries.map((e) => ({ x: e.date, y: e.kg })) }])}</div></div>` : ''}

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

// ================= 飲食 =================
// 今天是練習日還是休息日：飲食頁手動選的優先，沒選就看今天有沒有訓練紀錄
function todayDayType() {
  const saved = todayMealPlan();
  if (saved?.dayType) return saved.dayType;
  return trainings().some((w) => w.date === todayStr()) ? 'train' : 'rest';
}
function todayPlan() { return dayPlan(computePlan(store.workouts), todayDayType()); }
function renderDiet() {
  setTitle('飲食');
  const plan = todayPlan();
  if (plan.missing) {
    $view.innerHTML = `<div class="card"><h3>🍱 飲食日記</h3><p class="muted">${plan.missing === 'profile' ? '先到「體重」頁填個人資料並記錄體重，' : '先到「體重」頁記錄今天的體重，'}算出每日熱量和三大營養素後，就能開始記錄。</p><button class="btn primary block" id="to-body">前往體重頁</button></div>`;
    q('#to-body').onclick = () => navigate('body');
    return;
  }
  if (df.adding) return renderFoodAdd(plan);
  const date = dayKey(), isToday = date === todayStr();
  const rec = dayRec(date);
  const goal = isToday ? plan : { target: rec?.target || plan.target, macros: rec?.macros || plan.macros };
  const e = eatenTotals(rec?.meals || [], rec?.extras || []);
  const pct = (a, b) => Math.min(100, Math.round((a / Math.max(1, b)) * 100));
  const bar = (label, a, b, color) => `<div class="macro"><div class="row"><b class="grow">${label}</b><span><b>${a}</b> / ${b}</span></div><div class="mbar"><i style="width:${pct(a, b)}%;background:${color}"></i></div></div>`;
  const cy = isToday ? plan.cycle : null;
  const left = goal.target - e.kcal;
  const diary = dayDiary(rec);
  $view.innerHTML = h`
    <div class="card accent">
      <div class="date-nav"><button class="btn ghost small" data-dnav="-1">‹</button><b>${esc(dateLabel(date))}</b><button class="btn ghost small" data-dnav="1" ${isToday ? 'disabled' : ''}>›</button></div>
      ${cy ? `<div class="presets dt-row mb">${[['train', '💪 練習日', cy.train.kcal], ['rest', '😴 休息日', cy.rest.kcal]].map(([k, l, kc]) => `<button class="btn ${plan.dayType === k ? 'active' : ''}" data-dt="${k}">${l}・${kc}</button>`).join('')}</div>` : ''}
      <div class="row"><h3 class="grow">${isToday ? `今天・${esc(plan.goal.label)}` : '這一天'}</h3><span class="pill hot">${e.kcal.toLocaleString()} / ${goal.target.toLocaleString()} kcal</span></div>
      <p class="small">${left >= 0 ? `還可以吃 <b>${left.toLocaleString()}</b> kcal` : `超過目標 <b>${(-left).toLocaleString()}</b> kcal`}</p>
      ${bar('蛋白質 g', e.p, goal.macros.protein, '#3b7be6')}
      ${bar('脂肪 g', e.f, goal.macros.fat, '#f2c230')}
      ${bar('碳水 g', e.c, goal.macros.carb, '#34b866')}
      ${isToday && rec?.note ? `<p class="small mt">${esc(rec.note)}</p>` : ''}
      ${isToday ? `<p class="muted small">已吃 / 目標。${cy ? `你每週練約 ${cy.n} 次：練習日多吃碳水、休息日少一點，一週總熱量和「體重」頁算的一樣。` : '目標在「體重」頁依體重和訓練頻率計算。'}</p>` : ''}
    </div>
    ${SLOTS.map((s) => slotCardHTML(s, diary[s.key], rec, isToday)).join('')}
    ${isToday ? mealPlanCardHTML(plan) : ''}`;
  bindDiary(plan, rec, isToday);
  qa('[data-dt]').forEach((b) => b.onclick = async () => {
    const dt = b.dataset.dt;
    const np = dayPlan(computePlan(store.workouts), dt);
    await updateDay(todayStr(), (r) => { r.dayType = dt; r.target = np.target; r.macros = np.macros; }, np);
    if (route === 'diet') renderDiet();
  });
}

// ---------- 飲食日記（早餐 / 午餐 / 晚餐 / 點心） ----------
const df = { date: null, adding: null, q: '', pick: null, newFood: null, draft: null, busy: '', edit: null, hint: '', pendingBarcode: '', importing: null };
const r1 = (n) => Math.round((+n || 0) * 10) / 10;
function nowHM() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function dayKey() { return df.date || todayStr(); }
function dayRec(date) { return store.workouts.find((w) => w.type === 'mealplan' && w.date === date) || null; }
function todayMealPlan() { return dayRec(todayStr()); }
function dateLabel(d) {
  const t = todayStr();
  if (d === t) return '今天';
  if (d === addDays(t, -1)) return '昨天';
  const x = new Date(`${d}T00:00:00`);
  return `${x.getMonth() + 1}/${x.getDate()}（週${'日一二三四五六'[x.getDay()]}）`;
}
// 改一天的飲食紀錄：自己記了東西的時段，建議菜單那一餐算「改吃別的」；今天的話把還沒吃的建議餐重新分配
async function updateDay(date, fn, planOverride) {
  const isToday = date === todayStr();
  const plan = planOverride || (isToday ? todayPlan() : null);
  const old = dayRec(date);
  const rec = old
    ? { ...old, meals: (old.meals || []).map((m) => ({ ...m, items: m.items.map((it) => ({ ...it })) })), extras: (old.extras || []).map((x) => ({ ...x, items: (x.items || []).map((it) => ({ ...it })) })) }
    : { id: `meal-${date}`, type: 'mealplan', date, meals: [], extras: [], ...(plan && !plan.missing ? { target: plan.target, macros: plan.macros } : {}) };
  fn(rec);
  rec.extras = rec.extras.filter((x) => (x.items || []).length);
  rec.meals.forEach((m) => {
    const s = slotOfMeal(m);
    const has = rec.extras.some((x) => slotOfEntry(x, rec.meals) === s);
    if (!m.eaten && has) m.eaten = 'other';
    else if (m.eaten === 'other' && !has) delete m.eaten;
  });
  if (isToday && plan && !plan.missing && rec.meals.length) { const r = rebalance(rec.meals, rec.macros || plan.macros, rec.extras); rec.meals = r.meals; rec.note = r.note; }
  await store.add(rec, { keepCreatedAt: true });
}
// 只填熱量 → 照目標比例估營養素；沒填熱量 → 用營養素算
function fillMacros(it) {
  const plan = todayPlan();
  if (it.kcal > 0 && !it.p && !it.f && !it.c && !plan.missing) { it.p = r1(it.kcal * plan.pct.protein / 400); it.f = r1(it.kcal * plan.pct.fat / 900); it.c = r1(it.kcal * plan.pct.carb / 400); }
  if (!it.kcal) it.kcal = Math.round((it.p || 0) * 4 + (it.f || 0) * 9 + (it.c || 0) * 4);
  return it;
}
async function finishAdd(slot, items, dish, used) {
  const date = dayKey();
  Object.assign(df, { adding: null, pick: null, newFood: null, draft: null, q: '', pendingBarcode: '' });
  await updateDay(date, (r) => r.extras.push({ slot, time: nowHM(), dish: dish || '', items: items.map((it) => fillMacros(cleanItem(it))) }));
  if (used && !used.builtin) { const { kind, ...rest } = used; await store.add({ ...rest, uses: (used.uses || 0) + 1, lastUsed: Date.now() }, { keepCreatedAt: true }); }
  toast(`已加到${SLOT_LABEL[slot]} 🍽`);
  if (route === 'diet') renderDiet();
}

function slotCardHTML(s, d, rec, isToday) {
  const meals = rec?.meals || [];
  const rows = d.items.map((it, k) => {
    if (df.edit && df.edit.slot === s.key && df.edit.idx === k) {
      if (it.fromPlan) return `<div class="food-edit"><b>${esc(it.name)}</b> <span class="muted small">來自建議的${esc(meals[it.ref.meal]?.name || '')}</span><div class="presets mt"><button class="btn small" data-uneat="${it.ref.meal}">↩︎ 整餐改回還沒吃</button><button class="btn ghost small" data-ecancel>取消</button></div></div>`;
      const bySv = it.servings != null;
      return `<div class="food-edit"><b>${esc(it.name)}</b><div class="row mt" style="gap:6px;align-items:center;flex-wrap:wrap"><input type="number" inputmode="decimal" step="${bySv ? 0.5 : 1}" id="e-amt" value="${bySv ? it.servings : (it.grams || 0)}" style="width:84px"><span>${bySv ? '份' : esc(it.unit || 'g')}</span><button class="btn primary small" data-eok>確定</button><button class="btn small" data-edel>🗑 刪除</button><button class="btn ghost small" data-ecancel>取消</button></div></div>`;
    }
    const amt = amountText(it);
    return `<div class="food-row" data-it="${s.key}:${k}"><div class="grow"><div class="t">${esc(it.name)}${it.fromPlan ? ' <span class="pill">建議</span>' : ''}</div><div class="d">${esc(amt)}${amt ? '・' : ''}蛋白 ${r1(it.p)}・脂 ${r1(it.f)}・碳 ${r1(it.c)}</div></div><b>${Math.round(it.kcal)}</b></div>`;
  }).join('');
  const sug = isToday ? d.plan.map((mi) => suggestHTML(meals[mi], mi)).join('') : '';
  return `<div class="card slot"><div class="row"><h3 class="grow">${s.icon} ${s.label}</h3><b class="slot-kcal">${d.total.kcal}</b><span class="muted small">&nbsp;kcal</span></div>
    ${d.items.length ? `<div class="muted small">蛋白 ${d.total.p}・脂 ${d.total.f}・碳 ${d.total.c}</div>${rows}` : ''}
    ${sug}
    <div class="slot-actions"><button class="btn small primary" data-add="${s.key}">＋ 加食物</button><button class="btn ghost small" data-copy="${s.key}">📋 複製前一天</button>${d.items.length ? `<button class="btn ghost small" data-savecombo="${s.key}">⭐ 存成組合</button>` : ''}</div></div>`;
}
function suggestHTML(m, mi) {
  if (!m) return '';
  if (m.eaten === 'skip') return `<p class="muted small sug-skip">已略過建議的${esc(m.name)}・<button class="linkbtn" data-uneat="${mi}">再顯示</button></p>`;
  if (m.eaten) return '';
  const t = totalsOf([{ items: m.items.map((it) => ({ food: it.food, grams: it.grams })) }]);
  const editing = mp.editing === mi;
  return `<div class="suggest-box"><div class="row"><b class="grow">💡 建議${esc(m.name)}</b><span class="muted small">${t.kcal} kcal・蛋白 ${t.p}</span></div>
    ${m.items.map((it, ii) => editing
      ? `<div class="meal-item"><span class="grow">${esc(it.food)}</span><input type="number" inputmode="decimal" class="ate-in" data-ii="${ii}" value="${Math.round(it.ate ?? it.grams)}" style="width:72px"> g</div>`
      : (() => { const pt = portionText(it.food, it.grams, mp.cook); return `<div class="meal-item"><span class="grow">${esc(it.food)}</span><b>${esc(pt.main)}</b><span class="muted small">${esc(pt.sub)}</span></div>`; })()).join('')}
    ${m.tip ? `<p class="muted small">${esc(m.tip)}</p>` : ''}
    ${editing
      ? `<div class="presets mt"><button class="btn small" data-half="${mi}">全部吃一半</button><button class="btn primary small" data-ateok="${mi}">確定</button><button class="btn ghost small" data-atecancel>取消</button></div><p class="muted small">填實際吃的克數（熟重），沒吃的填 0。</p>`
      : `<div class="presets mt"><button class="btn small" data-eat="${mi}" data-how="full">✅ 照吃</button><button class="btn small" data-eat="${mi}" data-how="partial">✏️ 吃比較少</button><button class="btn ghost small" data-eat="${mi}" data-how="skip">⏭ 不照這個</button></div>`}
  </div>`;
}
function bindDiary(plan, rec, isToday) {
  const date = dayKey();
  const diary = dayDiary(rec);
  qa('[data-dnav]').forEach((b) => b.onclick = () => { const d = addDays(date, Number(b.dataset.dnav)); df.date = d >= todayStr() ? null : d; df.edit = null; mp.editing = null; renderDiet(); });
  qa('[data-add]').forEach((b) => b.onclick = () => { Object.assign(df, { adding: b.dataset.add, q: '', pick: null, newFood: null, draft: null, pendingBarcode: '', edit: null }); window.scrollTo(0, 0); renderDiet(); });
  qa('.food-row[data-it]').forEach((el) => el.onclick = () => { const [s, k] = el.dataset.it.split(':'); df.edit = { slot: s, idx: Number(k) }; renderDiet(); });
  qa('[data-ecancel]').forEach((b) => b.onclick = () => { df.edit = null; renderDiet(); });
  const cur = df.edit && diary[df.edit.slot]?.items[df.edit.idx];
  if (cur && !cur.fromPlan) {
    q('[data-eok]').onclick = async () => {
      const v = Number(q('#e-amt').value) || 0; if (v <= 0) { toast('份量要大於 0'); return; }
      df.edit = null;
      await updateDay(date, (r) => { const x = r.extras[cur.ref.extra]; x.items[cur.ref.item] = scaleItem(x.items[cur.ref.item], v); });
      if (route === 'diet') renderDiet();
    };
    q('[data-edel]').onclick = async () => { df.edit = null; await updateDay(date, (r) => { r.extras[cur.ref.extra].items.splice(cur.ref.item, 1); }); if (route === 'diet') renderDiet(); };
  }
  qa('[data-uneat]').forEach((b) => b.onclick = async () => {
    df.edit = null; mp.editing = null;
    await updateDay(date, (r) => { const m = r.meals[Number(b.dataset.uneat)]; if (m) { delete m.eaten; m.items.forEach((it) => { delete it.ate; }); } });
    if (route === 'diet') renderDiet();
  });
  qa('[data-copy]').forEach((b) => b.onclick = async () => {
    const s = b.dataset.copy, prev = addDays(date, -1);
    const items = dayDiary(dayRec(prev))[s].items.map(cleanItem);
    if (!items.length) { toast(`${dateLabel(prev)}的${SLOT_LABEL[s]}沒有紀錄`); return; }
    await updateDay(date, (r) => r.extras.push({ slot: s, time: nowHM(), dish: `複製${dateLabel(prev)}`, items }));
    toast(`已複製 ${items.length} 樣`);
    if (route === 'diet') renderDiet();
  });
  qa('[data-savecombo]').forEach((b) => b.onclick = async () => {
    const s = b.dataset.savecombo;
    const items = diary[s].items.map(cleanItem);
    const name = (prompt('幫這個組合取個名字（之後加食物時搜尋得到）', `我的${SLOT_LABEL[s]}`) || '').trim();
    if (!name) return;
    await store.add({ id: newId('combo'), type: 'combo', name, items, uses: 0, lastUsed: Date.now() });
    toast('已存成組合 ⭐');
  });
  if (isToday) bindPlanSuggest(plan);
}

// ---------- 建議菜單（AI 排的，出現在每一餐裡） ----------
const mp = { mealCount: 3, loading: false, prefs: null, editing: null, cook: null };
function mealPlanCardHTML(plan) {
  const saved = todayMealPlan();
  if (mp.prefs == null) mp.prefs = (getProfile(store.workouts) || {}).mealPrefs || '';
  if (mp.cook == null) mp.cook = (getProfile(store.workouts) || {}).cookMode || 'home';
  const controls = `
    <div class="presets">${[[3, '三餐'], [4, '三餐 + 點心']].map(([k, l]) => `<button class="btn ${mp.mealCount === k ? 'active' : ''}" data-mc="${k}">${l}</button>`).join('')}</div>
    <label class="field mt"><span>偏好／不吃的東西（選填）</span><input type="text" id="mprefs" value="${esc(mp.prefs)}" placeholder="例如：不吃牛、外食為主、早餐只吃超商"></label>
    <button class="btn primary block" id="genmeal" ${mp.loading ? 'disabled' : ''}>${mp.loading ? '安排中…' : saved?.meals?.length ? '🔄 重新產生' : '🍱 產生今天的建議'}</button>
    ${getGeminiKey() ? '' : '<p class="muted small">沒有設定 Gemini key，會用本機規則排。</p>'}`;
  if (!saved || !(saved.meals || []).length) return `<div class="card"><h3>🍱 建議菜單</h3><p class="muted small">依今天剩下的熱量和三大營養素，排出每一餐吃什麼、吃多少克。建議會出現在上面每一餐裡，照吃就按「✅ 照吃」；已經自己記了的餐不會再排。</p>${controls}</div>`;
  const stale = Math.abs((saved.target || 0) - plan.target) > 50;
  return `<div class="card">
    <div class="row"><h3 class="grow">🍱 建議菜單</h3><span class="muted small">${esc(saved.source || '')}</span></div>
    <div class="presets mb">${[['home', '🍳 自己煮'], ['out', '🥡 外食'], ['cooked', '⚖️ 熟重']].map(([k, l]) => `<button class="btn small ${mp.cook === k ? 'active' : ''}" data-cook="${k}">${l}</button>`).join('')}</div>
    <p class="muted small">${mp.cook === 'home' ? '建議裡的肉和魚顯示「生重」（下鍋前秤），飯和麵顯示生米／乾麵重量；油用量匙。' : mp.cook === 'out' ? esc(HAND_GUIDE) : '建議裡全部是煮熟後的重量（燕麥是乾重）。'}</p>
    ${stale ? `<p class="small" style="color:var(--warn)">每日目標已經變成 ${plan.target} kcal，建議重新產生。</p>` : ''}
    ${saved.tips && saved.tips.length ? `<ul class="cues">${saved.tips.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <details class="mt"><summary class="muted small">換一份建議</summary>${controls}</details>
    <button class="btn ghost small mt" id="clearplan">清除建議（已經照吃的會留在日記）</button>
  </div>`;
}
// 建議餐裡已經照吃的 → 轉成日記項目，換菜單或清除時不會不見
function keepEatenPlanMeals(r) {
  r.meals.forEach((m) => { const items = planMealItems(m).map(cleanItem); if (items.length) r.extras.push({ slot: slotOfMeal(m), time: nowHM(), dish: `建議${m.name}`, items }); });
}
function bindPlanSuggest(plan) {
  const today = todayStr();
  const prof = getProfile(store.workouts) || {};
  const setMeal = async (mi, fn) => { await updateDay(today, (r) => { if (r.meals[mi]) fn(r.meals[mi]); }); mp.editing = null; if (route === 'diet') renderDiet(); };
  qa('[data-eat]').forEach((b) => b.onclick = () => {
    const mi = Number(b.dataset.eat), how = b.dataset.how;
    if (how === 'partial') { mp.editing = mi; renderDiet(); return; }
    setMeal(mi, (m) => { m.eaten = how; m.items.forEach((it) => { delete it.ate; }); });
  });
  qa('[data-half]').forEach((b) => b.onclick = () => qa('.ate-in').forEach((i) => { i.value = Math.round(Number(i.value) / 2); }));
  qa('[data-atecancel]').forEach((b) => b.onclick = () => { mp.editing = null; renderDiet(); });
  qa('[data-ateok]').forEach((b) => b.onclick = () => {
    const vals = qa('.ate-in').map((i) => [Number(i.dataset.ii), Math.max(0, Number(i.value) || 0)]);
    setMeal(Number(b.dataset.ateok), (m) => {
      vals.forEach(([ii, v]) => { m.items[ii].ate = v; });
      m.eaten = m.items.every((it) => Math.round(it.ate) >= Math.round(it.grams)) ? 'full' : m.items.every((it) => !it.ate) ? 'skip' : 'partial';
    });
  });
  qa('[data-mc]').forEach((b) => b.onclick = () => { mp.mealCount = Number(b.dataset.mc); qa('[data-mc]').forEach((x) => x.classList.toggle('active', x === b)); });
  qa('[data-cook]').forEach((b) => b.onclick = async () => {
    mp.cook = b.dataset.cook;
    const p = getProfile(store.workouts);
    if (p) await store.add({ ...p, cookMode: mp.cook });
    if (route === 'diet') renderDiet();
  });
  q('#clearplan') && (q('#clearplan').onclick = async () => {
    if (!confirm('清除今天的建議菜單？已經照吃的會留在日記裡。')) return;
    await updateDay(today, (r) => { keepEatenPlanMeals(r); r.meals = []; r.tips = []; r.note = ''; });
    if (route === 'diet') renderDiet();
  });
  const btn = q('#genmeal'); if (!btn) return;
  btn.onclick = async () => {
    mp.prefs = q('#mprefs').value.trim();
    mp.loading = true; btn.disabled = true; btn.textContent = '安排中…';
    const args = { macros: plan.macros, mealCount: mp.mealCount, prefs: mp.prefs };
    let r;
    try {
      if (!getGeminiKey()) throw new Error('NO_KEY');
      const raw = await generateMealPlan({ ...args, target: plan.target, goalLabel: plan.goal.label, trainingToday: plan.dayType ? plan.dayType === 'train' : true, foods: Object.keys(FOODS) });
      r = sanitizeMealPlan(raw, plan.macros, mp.mealCount);
    } catch (e) {
      if (e.message !== 'NO_KEY') toast('AI 排菜單失敗，改用本機規則', 3000);
      r = localMealPlan(args);
    }
    mp.loading = false;
    if ((prof.mealPrefs || '') !== mp.prefs) await store.add({ id: 'profile', type: 'profile', date: '1900-01-01', ...prof, mealPrefs: mp.prefs });
    await updateDay(today, (rec) => {
      keepEatenPlanMeals(rec);
      rec.meals = r.meals.map((m) => ({ ...m, slot: slotOfMeal(m) }));
      rec.tips = r.tips || []; rec.source = r.source; rec.target = plan.target; rec.macros = plan.macros;
    });
    toast('建議排好了，在每一餐裡 🍱');
    if (route === 'diet') renderDiet();
  };
}

// ---------- 加食物：搜尋我的食物 / 營養標示 / 條碼 / 拍一餐 / 自己輸入 ----------
function renderFoodAdd(plan) {
  const s = df.adding, label = SLOT_LABEL[s], date = dayKey();
  let body;
  if (df.busy) body = `<div class="card center"><div class="spinner"></div><p class="muted">${esc(df.busy)}</p></div>`;
  else if (df.importing) body = importHTML();
  else if (df.pick) body = pickerHTML(label);
  else if (df.newFood) body = newFoodHTML();
  else if (df.draft) body = draftHTML();
  else body = `
    ${df.pendingBarcode ? `<div class="card accent"><b>▦ ${esc(df.pendingBarcode)}</b><p class="muted small">第一次掃到這個條碼。拍一次營養標示（或自己輸入），之後掃就直接帶出來。</p></div>` : ''}
    <input type="search" id="fa-q" class="fa-search" placeholder="🔍 搜尋我的食物：茶葉蛋、豆漿…" value="${esc(df.q)}" autocomplete="off">
    <div class="fa-tools">
      <button class="btn" id="fa-label">📷 拍營養標示</button>
      <button class="btn" id="fa-scan">▦ 掃條碼</button>
      <button class="btn" id="fa-photo">🍱 拍一餐估算</button>
      <button class="btn" id="fa-manual">✏️ 自己輸入</button>
    </div>
    <input type="text" id="fa-hint" class="fa-hint" value="${esc(df.hint)}" placeholder="拍照補充說明（選填）：飯只吃一半、飲料無糖…">
    <input type="file" id="fa-label-file" accept="image/*" capture="environment" hidden>
    <input type="file" id="fa-photo-file" accept="image/*" capture="environment" hidden>
    ${getGeminiKey() ? '' : '<p class="muted small">拍營養標示、拍一餐估算、AI 估算要先在設定填 Gemini API key；掃條碼、自己輸入不用。</p>'}
    <div id="fa-results"></div>
    <button class="btn ghost block mt" id="fa-import">📥 從 FatSecret 截圖匯入常吃的食物</button>`;
  $view.innerHTML = h`<button class="btn ghost mb" id="fa-back">← 回飲食日記</button>
    <h2>加到${esc(label)}${date !== todayStr() ? ` <span class="muted small">${esc(dateLabel(date))}</span>` : ''}</h2>${body}`;
  q('#fa-back').onclick = () => { Object.assign(df, { adding: null, pick: null, newFood: null, draft: null, pendingBarcode: '', importing: null }); renderDiet(); };
  if (df.busy) return;
  if (df.importing) return bindImport();
  if (df.pick) return bindPicker();
  if (df.newFood) return bindNewFood();
  if (df.draft) return bindDraft();
  bindSearch(plan);
}
const rerenderDiet = () => { if (route === 'diet') renderDiet(); };
function bindSearch() {
  const $r = q('#fa-results'), $q = q('#fa-q');
  const draw = () => {
    const res = searchFoods(store.workouts, df.q);
    $r.innerHTML = res.sections.map((sec) => `<div class="fa-sec">${esc(sec.title)}</div>` + sec.items.map((x, i) => {
      const d = x.kind === 'combo' ? `組合・${x.items.length} 樣・蛋白 ${sumItems(x.items).p}` : `${x.builtin ? '每 100 g' : x.servingGrams ? `1 份 ${x.servingGrams} ${x.unit || 'g'}` : '1 份'}・蛋白 ${r1(x.per?.p)}・脂 ${r1(x.per?.f)}・碳 ${r1(x.per?.c)}`;
      const kcal = x.kind === 'combo' ? sumItems(x.items).kcal : Math.round(x.per?.kcal || 0);
      return `<div class="food-row" data-res="${sec.key}:${i}"><div class="grow"><div class="t">${x.kind === 'combo' ? '⭐ ' : ''}${esc(x.name)}${x.brand ? ` <span class="muted small">${esc(x.brand)}</span>` : ''}</div><div class="d">${esc(d)}</div></div><b>${kcal}</b></div>`;
    }).join('')).join('') + (df.q.trim() ? `${res.sections.length ? '' : `<p class="muted small mt">我的食物和衛福部資料庫裡都找不到「${esc(df.q.trim())}」。包裝食品拍營養標示最準。</p>`}<button class="btn ghost block mt" id="fa-ai">🤖 ${res.sections.length ? '都不對？' : ''}用 AI 估「${esc(df.q.trim())}」</button>` : '') || `<p class="muted small mt">記過的食物會出現在這裡，常吃的排前面。打字可以搜尋我的食物和衛福部 2,000 多種食材；包裝食品拍營養標示最準。</p>`;
    const ai = q('#fa-ai', $r);
    if (ai) ai.onclick = async () => {
      if (!getGeminiKey()) { toast('要先在設定填 Gemini API key'); return; }
      const query = df.q.trim();
      df.busy = `AI 正在估「${query}」…`; rerenderDiet();
      try {
        const r = await estimateFood({ query });
        const unit = /ml|毫升|cc/i.test(r.unit || '') ? 'ml' : 'g';
        df.newFood = { name: r.name || query, brand: r.brand || '', servingGrams: +r.servingGrams || null, unit, servingsPerPack: null,
          per: { kcal: Math.round(+r.kcal || 0), p: r1(r.protein), f: r1(r.fat), c: r1(r.carb) }, barcode: '', source: 'ai',
          fromAI: true, note: `${r.servingDesc ? `一份 = ${r.servingDesc}。` : ''}${r.note || ''}`, confidence: r.confidence || '' };
      } catch (e) { toast('AI 估算失敗：' + e.message.slice(0, 80), 5000); }
      df.busy = ''; rerenderDiet();
    };
    qa('[data-res]', $r).forEach((el) => el.onclick = () => {
      const [k, i] = el.dataset.res.split(':');
      const x = res.sections.find((sec) => sec.key === k).items[Number(i)];
      if (x.kind === 'combo') { finishAdd(df.adding, x.items.map((it) => ({ ...it })), x.name, x); return; }
      df.pick = { food: x, qty: x.builtin ? 100 : 1, mode: x.builtin ? 'gram' : 'serving' };
      renderDiet();
    });
  };
  $q.oninput = () => { df.q = $q.value; draw(); };
  q('#fa-hint').oninput = (e) => { df.hint = e.target.value; };
  draw();
  loadTfnd().then(() => { if (df.q.trim() && route === 'diet' && q('#fa-results')) draw(); }).catch(() => {});
  q('#fa-import').onclick = () => { df.importing = { items: [], busy: '' }; rerenderDiet(); };
  const needKey = () => { if (getGeminiKey()) return false; toast('要先在 ⚙️ 設定填 Gemini API key'); return true; };
  const lf = q('#fa-label-file'), pf = q('#fa-photo-file');
  q('#fa-label').onclick = () => { if (!needKey()) lf.click(); };
  q('#fa-photo').onclick = () => { if (!needKey()) pf.click(); };
  lf.onchange = async () => {
    const f = lf.files[0]; if (!f) return;
    df.busy = 'Gemini 正在讀營養標示…'; rerenderDiet();
    try {
      const big = await fileToJpeg(f, 1600);
      const r = await readNutritionLabel({ base64: big.split(',')[1], hint: df.hint });
      if (!r.isLabel) toast(r.note || '照片裡看不到營養標示，拍清楚一點再試', 5000);
      else {
        const food = foodFromLabel(r);
        df.newFood = { ...food, name: food.name || df.q.trim(), barcode: df.pendingBarcode || food.barcode, fromLabel: true, note: r.note || '' };
      }
    } catch (e) { toast('讀取失敗：' + e.message.slice(0, 80), 5000); }
    df.busy = ''; rerenderDiet();
  };
  pf.onchange = async () => {
    const f = pf.files[0]; if (!f) return;
    df.busy = 'Gemini 正在看照片…'; rerenderDiet();
    try {
      const big = await fileToJpeg(f, 1024), thumb = await fileToJpeg(f, 240);
      const r = await analyzeFoodPhoto({ base64: big.split(',')[1], hint: df.hint });
      const items = (r.items || []).map((it) => ({ name: it.name, grams: +it.grams || 0, kcal: +it.kcal || 0, p: +it.protein || 0, f: +it.fat || 0, c: +it.carb || 0 }));
      if (!items.length) toast(r.note || '照片裡看不到食物', 4000);
      else df.draft = { dish: r.dish || '', items, note: r.note || '', thumb };
      df.hint = '';
    } catch (e) { toast('估算失敗：' + e.message.slice(0, 80), 5000); }
    df.busy = ''; rerenderDiet();
  };
  q('#fa-scan').onclick = async () => {
    const code = await scanBarcode();
    if (!code) return;
    const hit = foodsOf(store.workouts).find((x) => x.barcode === code);
    if (hit) { df.pick = { food: hit, qty: 1, mode: 'serving' }; rerenderDiet(); return; }
    df.busy = `查詢條碼 ${code}…`; rerenderDiet();
    const off = await lookupOFF(code);
    df.busy = '';
    if (off) df.newFood = { ...off, fromOFF: true };
    else { df.pendingBarcode = code; toast('資料庫找不到這個條碼，拍一次營養標示就好', 4000); }
    rerenderDiet();
  };
  q('#fa-manual').onclick = () => { df.newFood = { name: df.q.trim(), brand: '', servingGrams: null, unit: 'g', servingsPerPack: null, per: {}, barcode: df.pendingBarcode || '' }; rerenderDiet(); };
}
const prevHTML = (it) => `<span><b>${it.kcal}</b> kcal</span><span>蛋白 <b>${it.p}</b></span><span>脂 <b>${it.f}</b></span><span>碳 <b>${it.c}</b></span>`;
function pickerHTML(label) {
  const { food, qty, mode } = df.pick;
  const sg = Number(food.servingGrams) || 0, u = food.unit || 'g';
  const quick = mode === 'serving'
    ? [0.5, 1, 1.5, 2, ...(food.servingsPerPack && ![0.5, 1, 1.5, 2].includes(food.servingsPerPack) ? [food.servingsPerPack] : [])]
    : food.builtin ? [...new Set([50, 100, 150, 200, ...(food.unitHint ? [food.unitHint[1]] : [])])].sort((a, b) => a - b) : [sg / 2, sg, sg * 2];
  const qLabel = (v) => mode === 'serving' ? (food.servingsPerPack === v && v !== 1 ? `整包 ${fmtQty(v)} 份` : `${fmtQty(v)} 份`) : `${Math.round(v)} ${u}${food.unitHint && v === food.unitHint[1] ? `（1 ${food.unitHint[0]}）` : ''}`;
  const info = [food.brand, food.tfnd ? `衛福部資料庫・${food.cat}・每 100 ${u}` : food.builtin ? `每 100 ${u}（煮熟）` : sg ? `1 份 = ${sg} ${u}` : '', food.alias ? `又叫 ${food.alias}` : '', food.servingsPerPack ? `一包 ${fmtQty(food.servingsPerPack)} 份` : '', food.barcode ? `▦ ${food.barcode}` : ''].filter(Boolean);
  return `<div class="card"><h3>${esc(food.name)}</h3>
    ${info.length ? `<p class="muted small">${info.map(esc).join('・')}</p>` : ''}
    <div class="pk-row"><input type="number" inputmode="decimal" step="${mode === 'serving' ? 0.5 : 1}" id="pk-qty" class="pk-qty" value="${qty}">
      ${sg && !food.builtin ? `<div class="pk-unit"><button class="btn small ${mode === 'serving' ? 'active' : ''}" data-pm="serving">份</button><button class="btn small ${mode === 'gram' ? 'active' : ''}" data-pm="gram">${esc(u)}</button></div>` : `<span>${mode === 'serving' ? '份' : esc(u)}</span>`}</div>
    <div class="presets mt">${quick.map((v) => `<button class="btn small" data-pq="${v}">${esc(qLabel(v))}</button>`).join('')}</div>
    <div class="macro-mini mt" id="pk-prev">${prevHTML(portion(food, qty, mode))}</div>
    <button class="btn primary big block mt" id="pk-add">加到${esc(label)}</button>
    <div class="row mt" style="gap:6px;flex-wrap:wrap">${food.builtin ? '' : '<button class="btn ghost small" id="pk-edit">✏️ 修改這項食物</button><button class="btn ghost small" id="pk-del">🗑 從我的食物刪除</button>'}<button class="btn ghost small" id="pk-back">← 回搜尋</button></div>
  </div>`;
}
function bindPicker() {
  const pk = df.pick;
  const upd = () => { pk.qty = Number(q('#pk-qty').value) || 0; q('#pk-prev').innerHTML = prevHTML(portion(pk.food, pk.qty, pk.mode)); };
  q('#pk-qty').oninput = upd;
  qa('[data-pq]').forEach((b) => b.onclick = () => { q('#pk-qty').value = r1(Number(b.dataset.pq)); upd(); });
  qa('[data-pm]').forEach((b) => b.onclick = () => {
    const m = b.dataset.pm; if (m === pk.mode) return;
    const sg = Number(pk.food.servingGrams);
    pk.qty = m === 'gram' ? r1(pk.qty * sg) : r1(pk.qty / sg); pk.mode = m; rerenderDiet();
  });
  q('#pk-back').onclick = () => { df.pick = null; rerenderDiet(); };
  q('#pk-edit') && (q('#pk-edit').onclick = () => { const { kind, ...f } = pk.food; df.newFood = { ...f, per: { ...f.per } }; df.pick = null; rerenderDiet(); });
  q('#pk-del') && (q('#pk-del').onclick = async () => {
    if (!confirm(`從我的食物刪除「${pk.food.name}」？已經記錄的不受影響。`)) return;
    df.pick = null; await store.remove(pk.food.id); toast('已刪除'); rerenderDiet();
  });
  q('#pk-add').onclick = () => {
    upd();
    if (!(pk.qty > 0)) { toast('填一下吃了多少'); return; }
    finishAdd(df.adding, [portion(pk.food, pk.qty, pk.mode)], '', pk.food);
  };
}
function newFoodHTML() {
  const f = df.newFood, per = f.per || {};
  return `<div class="card"><h3>${f.id ? '修改食物' : '新增到我的食物'}</h3>
    ${f.fromAI ? `<p class="small warn-text">🤖 這是 AI 估計值（可信度：${esc(f.confidence || '不確定')}）。${esc(f.note || '')} 有包裝的話，以營養標示為準。</p>` : ''}
    ${f.fromLabel ? `<p class="muted small">已從營養標示讀出來，對一下數字和名稱再存。${f.note ? `<br>💬 ${esc(f.note)}` : ''}</p>` : f.fromOFF ? '<p class="muted small">在 Open Food Facts 找到這個條碼。資料是網友填的，對一下包裝再存。</p>' : '<p class="muted small">照包裝上的營養標示填「每一份」的數字；沒有包裝的估個大概也行。</p>'}
    <label class="field"><span>名稱</span><input type="text" id="nf-name" value="${esc(f.name || '')}" placeholder="例如：茶葉蛋（無蛋黃）"></label>
    <label class="field"><span>品牌／店家（選填）</span><input type="text" id="nf-brand" value="${esc(f.brand || '')}" placeholder="例如：7-11"></label>
    <div class="nf-grid">
      <label><span>每一份量</span><input type="number" inputmode="decimal" id="nf-sg" value="${f.servingGrams ?? ''}" placeholder="選填"></label>
      <label><span>單位</span><select id="nf-unit"><option value="g" ${f.unit !== 'ml' ? 'selected' : ''}>公克</option><option value="ml" ${f.unit === 'ml' ? 'selected' : ''}>毫升</option></select></label>
      <label><span>一包幾份</span><input type="number" inputmode="decimal" id="nf-pack" value="${f.servingsPerPack ?? ''}" placeholder="選填"></label>
    </div>
    <div class="muted small mt">每一份的營養</div>
    <div class="d-nums">${[['kcal', '熱量'], ['p', '蛋白質'], ['f', '脂肪'], ['c', '碳水']].map(([k, l]) => `<label><span>${l}</span><input type="number" inputmode="decimal" data-nf="${k}" value="${per[k] ?? ''}"></label>`).join('')}</div>
    ${f.barcode ? `<p class="muted small">▦ 條碼 ${esc(f.barcode)}</p>` : ''}
    <div class="row mt" style="gap:8px"><button class="btn primary grow" id="nf-save">${f.id ? '儲存' : '存起來，選份量'}</button>${f.barcode ? '' : '<button class="btn" id="nf-scan">▦ 綁條碼</button>'}<button class="btn ghost" id="nf-cancel">取消</button></div>
  </div>`;
}
function bindNewFood() {
  const f = df.newFood;
  const read = () => {
    f.name = q('#nf-name').value.trim(); f.brand = q('#nf-brand').value.trim();
    f.servingGrams = Number(q('#nf-sg').value) || null; f.unit = q('#nf-unit').value; f.servingsPerPack = Number(q('#nf-pack').value) || null;
    f.per = {}; qa('[data-nf]').forEach((i) => { f.per[i.dataset.nf] = Number(i.value) || 0; });
  };
  q('#nf-cancel').onclick = () => { df.newFood = null; rerenderDiet(); };
  q('#nf-scan') && (q('#nf-scan').onclick = async () => { read(); const code = await scanBarcode(); if (code) f.barcode = code; rerenderDiet(); });
  q('#nf-save').onclick = async () => {
    read();
    if (!f.name) { toast('填一下名稱'); return; }
    if (!f.per.kcal && !f.per.p && !f.per.f && !f.per.c) { toast('至少填熱量'); return; }
    if (!f.per.kcal) f.per.kcal = Math.round(f.per.p * 4 + f.per.f * 9 + f.per.c * 4);
    const rec = {
      ...(f.createdAt ? { createdAt: f.createdAt } : {}),
      id: f.id || newId('food'), type: 'food', name: f.name, brand: f.brand || '', servingGrams: f.servingGrams, unit: f.unit || 'g',
      servingsPerPack: f.servingsPerPack, per: { kcal: r1(f.per.kcal), p: r1(f.per.p), f: r1(f.per.f), c: r1(f.per.c) },
      barcode: f.barcode || '', source: f.source || 'manual', uses: f.uses || 0, lastUsed: f.lastUsed || Date.now()
    };
    df.newFood = null; df.pendingBarcode = '';
    df.pick = { food: rec, qty: 1, mode: 'serving' };
    await store.add(rec, { keepCreatedAt: true });
    toast(f.id ? '已更新' : '已存到我的食物');
    rerenderDiet();
  };
}
// ---------- 從 FatSecret 截圖匯入「我的食物」 ----------
function importHTML() {
  const im = df.importing;
  const have = new Set(foodsOf(store.workouts).map((f) => `${f.brand || ''}|${f.name}`));
  const rows = im.items.map((f, i) => {
    const dup = have.has(`${f.brand || ''}|${f.name}`);
    return `<label class="im-row ${dup ? 'dup' : ''}"><input type="checkbox" data-im="${i}" ${f.checked ? 'checked' : ''}>
      <span class="grow"><b>${esc(f.name)}</b>${f.brand ? ` <span class="muted small">${esc(f.brand)}</span>` : ''}${dup ? ' <span class="pill">已經有了</span>' : ''}
      <span class="d">1 份${f.servingGrams ? `（${f.servingGrams} ${esc(f.unit)}）` : ''}・蛋白 ${f.per.p}・脂 ${f.per.f}・碳 ${f.per.c}</span></span>
      <b class="im-k">${Math.round(f.per.kcal)}</b></label>`;
  }).join('');
  const n = im.items.filter((f) => f.checked).length;
  return `<div class="card"><h3>從 FatSecret 截圖匯入</h3>
    <p class="muted small">在 FatSecret 的「日記」頁截圖，可以一次選很多張。App 會讀出每一樣食物，換算成「1 份」的營養，你勾選要的就存進「我的食物」，之後搜尋就有。只存食物資料，不會把那天吃的東西加進日記。</p>
    ${im.busy ? `<div class="center"><div class="spinner"></div><p class="muted small">${esc(im.busy)}</p></div>`
      : im.items.length ? `<div class="im-list">${rows}</div>
        <div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn primary grow" id="im-save" ${n ? '' : 'disabled'}>存 ${n} 樣到我的食物</button><button class="btn" id="im-more">再加截圖</button></div>`
      : `<button class="btn primary block" id="im-pick">選擇截圖</button>`}
    <input type="file" id="im-file" accept="image/*" multiple hidden>
    <button class="btn ghost block mt" id="im-cancel">取消</button></div>`;
}
function bindImport() {
  const im = df.importing;
  const file = q('#im-file');
  const pick = () => { if (!getGeminiKey()) { toast('要先在設定填 Gemini API key'); return; } file.click(); };
  q('#im-pick') && (q('#im-pick').onclick = pick);
  q('#im-more') && (q('#im-more').onclick = pick);
  q('#im-cancel').onclick = () => { df.importing = null; rerenderDiet(); };
  qa('[data-im]').forEach((c) => c.onchange = () => { im.items[Number(c.dataset.im)].checked = c.checked; rerenderDiet(); });
  file.onchange = async () => {
    const files = [...file.files]; if (!files.length) return;
    const have = new Set(foodsOf(store.workouts).map((f) => `${f.brand || ''}|${f.name}`));
    let added = 0, failed = 0;
    for (let i = 0; i < files.length; i++) {
      im.busy = `Gemini 正在讀第 ${i + 1} / ${files.length} 張截圖…`; rerenderDiet();
      try {
        const big = await fileToJpeg(files[i], 1600);
        const r = await readFoodList({ base64: big.split(',')[1] });
        for (const f of foodsFromList(r.items)) {
          const k = `${f.brand}|${f.name}`;
          if (im.items.some((x) => `${x.brand}|${x.name}` === k)) continue;
          im.items.push({ ...f, checked: !have.has(k) }); added++;
        }
      } catch (e) { console.error(e); failed++; }
    }
    im.busy = '';
    toast(`讀到 ${added} 樣${failed ? `，${failed} 張讀取失敗` : ''}`, 3000);
    rerenderDiet();
  };
  q('#im-save') && (q('#im-save').onclick = async () => {
    const sel = im.items.filter((f) => f.checked);
    im.busy = `存進我的食物…`; rerenderDiet();
    const now = Date.now();
    for (let i = 0; i < sel.length; i++) {
      const { checked, servingDesc, ...f } = sel[i];
      await store.add({ ...f, id: newId('food'), type: 'food', uses: 0, lastUsed: now - i }, { keepCreatedAt: true });
    }
    df.importing = null;
    toast(`已存 ${sel.length} 樣到我的食物 📥 搜尋就找得到`, 3500);
    rerenderDiet();
  });
}
// 拍一餐估算（多樣食物、可逐項改）
function draftHTML() {
  const d = df.draft, t = sumItems(d.items);
  return `<div class="card">
    ${d.thumb ? `<img src="${d.thumb}" alt="" class="snap-thumb">` : ''}
    <label class="field"><span>這一餐</span><input type="text" id="d-dish" value="${esc(d.dish || '')}" placeholder="例如：雞腿便當"></label>
    ${d.items.map((it, i) => `<div class="d-row" data-di="${i}">
      <div class="d-top"><input type="text" data-k="name" value="${esc(it.name)}" placeholder="食物名稱"><input type="number" inputmode="decimal" data-k="grams" value="${r1(it.grams)}"><span class="muted small">g</span><button class="btn ghost small" data-ddel="${i}">✕</button></div>
      <div class="d-nums">${[['kcal', 'kcal'], ['p', '蛋白'], ['f', '脂'], ['c', '碳']].map(([k, l]) => `<label><span>${l}</span><input type="number" inputmode="decimal" data-k="${k}" value="${r1(it[k])}"></label>`).join('')}</div>
    </div>`).join('')}
    <button class="btn ghost small" id="d-add">＋ 加一項</button>
    <p class="small mt" id="d-tot">合計 <b>${t.kcal}</b> kcal・蛋白 ${t.p}・脂 ${t.f}・碳 ${t.c}</p>
    ${d.note ? `<p class="muted small">💬 ${esc(d.note)}</p>` : ''}
    <p class="muted small">改克數，熱量和營養素會照比例一起變。數字都是估計值，照片看不出油量和醬汁時會偏低。</p>
    <div class="row" style="gap:8px"><button class="btn primary grow" id="d-save">加到${esc(SLOT_LABEL[df.adding])}</button><button class="btn" id="d-cancel">取消</button></div>
  </div>`;
}
function bindDraft() {
  const d = df.draft;
  const readAll = () => {
    d.dish = q('#d-dish').value;
    qa('.d-row').forEach((row) => { const it = d.items[Number(row.dataset.di)]; row.querySelectorAll('input').forEach((inp) => { it[inp.dataset.k] = inp.dataset.k === 'name' ? inp.value : Number(inp.value) || 0; }); });
  };
  q('#d-dish').oninput = (e) => { d.dish = e.target.value; };
  qa('.d-row').forEach((row) => {
    const it = d.items[Number(row.dataset.di)];
    row.querySelectorAll('input').forEach((inp) => inp.oninput = () => {
      const k = inp.dataset.k;
      if (k === 'grams' && it.grams > 0) {
        const ratio = (Number(inp.value) || 0) / it.grams;
        ['kcal', 'p', 'f', 'c'].forEach((kk) => { it[kk] = it[kk] * ratio; row.querySelector(`[data-k="${kk}"]`).value = r1(it[kk]); });
        it.grams = Number(inp.value) || 0;
      } else it[k] = k === 'name' ? inp.value : Number(inp.value) || 0;
      const t = sumItems(d.items);
      q('#d-tot').innerHTML = `合計 <b>${t.kcal}</b> kcal・蛋白 ${t.p}・脂 ${t.f}・碳 ${t.c}`;
    });
  });
  qa('[data-ddel]').forEach((b) => b.onclick = () => { readAll(); d.items.splice(Number(b.dataset.ddel), 1); rerenderDiet(); });
  q('#d-add').onclick = () => { readAll(); d.items.push({ name: '', grams: 0, kcal: 0, p: 0, f: 0, c: 0 }); rerenderDiet(); };
  q('#d-cancel').onclick = () => { df.draft = null; rerenderDiet(); };
  q('#d-save').onclick = () => {
    readAll();
    const items = d.items.filter((it) => it.name.trim() || it.kcal > 0).map((it) => ({ name: it.name.trim() || '食物', grams: r1(it.grams), unit: 'g', kcal: Math.round(it.kcal), p: r1(it.p), f: r1(it.f), c: r1(it.c) }));
    if (!items.length) { toast('至少填一樣食物'); return; }
    finishAdd(df.adding, items, d.dish.trim());
  };
}
async function fileToJpeg(file, max) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally { URL.revokeObjectURL(url); }
}
// 掃條碼：Android Chrome 的 BarcodeDetector；不支援就讓使用者輸入號碼
async function scanBarcode() {
  const typeIn = () => (prompt('輸入條碼下面的數字：') || '').replace(/\D/g, '') || null;
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
    toast('這個瀏覽器不能用相機掃條碼，改成輸入號碼', 3000);
    return typeIn();
  }
  let formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
  try { const sup = await BarcodeDetector.getSupportedFormats(); const f = formats.filter((x) => sup.includes(x)); if (f.length) formats = f; } catch {}
  const det = new BarcodeDetector({ formats });
  const ov = document.createElement('div');
  ov.className = 'scan-ov';
  ov.innerHTML = `<video playsinline muted></video><div class="scan-box"></div><p>把條碼放進框框裡</p><div class="row" style="gap:8px"><button class="btn" data-sc="type">輸入號碼</button><button class="btn primary" data-sc="cancel">取消</button></div>`;
  document.body.appendChild(ov);
  const video = ov.querySelector('video');
  return new Promise(async (resolve) => {
    let stream = null, timer = null, done = false;
    const finish = (code) => { if (done) return; done = true; clearInterval(timer); stream && stream.getTracks().forEach((t) => t.stop()); ov.remove(); resolve(code); };
    ov.querySelector('[data-sc="cancel"]').onclick = () => finish(null);
    ov.querySelector('[data-sc="type"]').onclick = () => finish(typeIn());
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); video.srcObject = stream; await video.play(); }
    catch (e) { toast('開不了相機：' + e.message, 4000); finish(null); return; }
    timer = setInterval(async () => {
      try { const r = await det.detect(video); if (r && r[0] && r[0].rawValue) { try { navigator.vibrate && navigator.vibrate(80); } catch {} finish(r[0].rawValue.replace(/\D/g, '') || r[0].rawValue); } } catch {}
    }, 250);
  });
}
// 條碼查 Open Food Facts（免費、網頁可以直接查；台灣商品不一定有）
async function lookupOFF(code) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_zh,brands,nutriments,serving_quantity`, { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    return j.status === 1 && j.product ? foodFromOFF(j.product, code) : null;
  } catch { return null; }
}

// ---- 每週回顧 ----
let reviewBusy = false, autoReview = false;
function latestReview() { return store.workouts.filter((w) => w.type === 'review').sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0))[0] || null; }
function reviewDue() {
  const today = todayStr(), dow = new Date().getDay();
  const last = latestReview();
  const trained = store.workouts.some((w) => (w.type === 'strength' || w.type === 'cardio') && w.date >= addDays(today, -6));
  return (dow === 0 || dow === 1) && trained && (!last || last.date < addDays(today, -2));
}
function reviewCardHTML() {
  const r = latestReview();
  const list = (icon, xs) => xs && xs.length ? `<ul class="cues">${xs.map((x) => `<li>${icon} ${esc(x)}</li>`).join('')}</ul>` : '';
  if (reviewBusy) return `<div class="card review"><h3>📋 每週回顧</h3><div class="center"><div class="spinner"></div><p class="muted small">${getGeminiKey() ? 'Gemini 正在看你這週的紀錄' : '整理中'}…</p></div></div>`;
  if (!r) return `<div class="card review"><h3>📋 每週回顧</h3><p class="muted small">把最近 7 天的訓練、體重、飲食放在一起看，告訴你哪裡做得好、下週要調整什麼。</p><button class="btn primary block" id="rv-gen">產生這週的回顧</button></div>`;
  return `<div class="card review"><div class="row"><h3 class="grow">📋 每週回顧</h3><span class="muted small">${r.from.slice(5).replace('-', '/')}–${r.to.slice(5).replace('-', '/')}・${r.source === 'gemini' ? 'Gemini' : '本機'}</span></div>
    <p>${esc(r.summary || '')}</p>
    ${r.good?.length ? `<div class="rv-h ok">做得好</div>${list('✅', r.good)}` : ''}
    ${r.improve?.length ? `<div class="rv-h warn">要注意</div>${list('⚠️', r.improve)}` : ''}
    ${r.actions?.length ? `<div class="rv-h">下週這樣做</div>${list('👉', r.actions)}` : ''}
    <button class="btn ghost small mt" id="rv-gen">🔄 重新產生（用最新紀錄）</button></div>`;
}
async function runReview() {
  if (reviewBusy) return;
  reviewBusy = true; if (route === 'stats') renderStats();
  const today = todayStr();
  const d = weeklyData(store.workouts, today);
  const local = localReview(d);
  let r = local, source = 'local';
  try {
    if (getGeminiKey()) {
      const localText = [`總結：${local.summary}`, ...local.good.map((x) => `好：${x}`), ...local.improve.map((x) => `注意：${x}`), ...local.actions.map((x) => `建議：${x}`)].join('\n');
      const g = await generateWeeklyReview({ dataText: reviewDataText(d), localText });
      if (g && g.summary) { r = { summary: g.summary, good: (g.good || []).slice(0, 4), improve: (g.improve || []).slice(0, 5), actions: (g.actions || []).slice(0, 4) }; source = 'gemini'; }
    }
  } catch (e) { console.error(e); toast('Gemini 失敗，改用本機回顧：' + e.message, 4000); }
  reviewBusy = false;
  await store.add({ id: `review-${today}`, type: 'review', date: today, from: d.from, to: d.to, source, ...r });
  if (route === 'stats') renderStats();
}
// 各肌群每週組數長條圖（最近 12 週）
let musSel = 'chest';
function muscleTrendHTML() {
  const { weeks, data } = weeklyMuscleSeries(store.workouts, todayStr(), 12);
  if (!Object.values(data).some((arr) => arr.some((v) => v > 0))) return '';
  const keys = ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps'];
  const vals = data[musSel], t = MUSCLE_TARGETS[musSel];
  const W = 360, H = 170, pl = 26, pr = 6, pt = 10, pb = 22;
  const yMax = Math.max(t ? t[1] + 4 : 10, ...vals) ;
  const sy = (v) => pt + (H - pt - pb) * (1 - v / yMax);
  const bw = (W - pl - pr) / vals.length;
  let svg = '';
  [0, Math.round(yMax / 2), Math.round(yMax)].forEach((v) => { svg += `<line x1="${pl}" x2="${W - pr}" y1="${sy(v)}" y2="${sy(v)}" stroke="#33373d"/><text x="${pl - 4}" y="${sy(v) + 4}" fill="#9a9ea5" font-size="10" text-anchor="end">${v}</text>`; });
  if (t) svg += `<rect x="${pl}" width="${W - pl - pr}" y="${sy(t[1])}" height="${sy(t[0]) - sy(t[1])}" fill="rgba(60,207,142,.12)"/>`;
  vals.forEach((v, i) => {
    const x = pl + i * bw + bw * 0.18, w = bw * 0.64, cur = i === vals.length - 1;
    const c = !t ? '#3b7be6' : v < t[0] ? '#f2c230' : v > t[1] ? '#e2383f' : '#34b866';
    svg += `<rect x="${x.toFixed(1)}" y="${sy(v).toFixed(1)}" width="${w.toFixed(1)}" height="${(sy(0) - sy(v)).toFixed(1)}" rx="3" fill="${c}" opacity="${cur ? 0.45 : 1}"><title>${weeks[i].slice(5)} 那週：${v} 組</title></rect>`;
    if (v) svg += `<text x="${(x + w / 2).toFixed(1)}" y="${(sy(v) - 3).toFixed(1)}" fill="#9a9ea5" font-size="9" text-anchor="middle">${v}</text>`;
    if (i % 3 === 2 || cur) svg += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 6}" fill="#9a9ea5" font-size="10" text-anchor="middle">${cur ? '本週' : weeks[i].slice(5).replace('-', '/')}</text>`;
  });
  const done = vals.slice(0, -1).filter((v) => v > 0);
  const avg = done.length ? Math.round(done.reduce((a, b) => a + b, 0) / done.length * 10) / 10 : 0;
  return `<div class="card"><h3>📈 各肌群每週組數（最近 12 週）</h3>
    <div class="presets">${keys.map((k) => `<button class="btn small ${musSel === k ? 'active' : ''}" data-mus="${k}">${esc(PART_LABELS[k])}</button>`).join('')}</div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="每週組數">${svg}</svg>
    <p class="muted small">${t ? `綠色區塊是建議範圍 ${t[0]}-${t[1]} 組。` : ''}有練的週平均 ${avg} 組；本週還沒過完，顏色比較淡。週一到週日算一週。</p>
  </div>`;
}
// 訓練週期卡（表現頁）
function cycleCardHTML() {
  const cw = curCycle();
  const detail = `<ul class="cues small">${CYCLE.map((x) => `<li><b>${x.short}</b>・${esc(x.note)}</li>`).join('')}</ul>`;
  if (!cw) return `<div class="card"><h3>📅 訓練週期</h3>
    <p class="muted small">6 週一輪：累積期 3 週（組數慢慢加、越來越接近力竭）→ 強度期 2 週（主項次數降低、重量加上去）→ 減量週 1 週，然後重新開始。比一直用同樣的量練更不容易停滯。三分化的菜單會自動照週期調整。</p>
    ${cycleBarHTML(null)}${detail}<button class="btn primary block mt" id="cy-start">從這週開始</button></div>`;
  return `<div class="card"><div class="row"><h3 class="grow">📅 訓練週期</h3><span class="muted small">第 ${cw.round} 輪・這週從 ${cw.weekStart.slice(5).replace('-', '/')} 開始</span></div>
    ${cycleBarHTML(cw)}<p class="small mt"><b>這週：${esc(cycleTitle(cw))}</b>・${esc(cw.note)}</p>
    <details><summary class="muted small">每週在做什麼</summary>${detail}</details>
    <button class="btn ghost small mt" id="cy-stop">停止週期</button></div>`;
}
function muscleCardHTML() {
  const rows = muscleReport(store.workouts, todayStr());
  if (!rows.some((x) => x.sets || x.avg4)) return '';
  const MAX = 24, pct = (n) => Math.min(100, (n / MAX) * 100);
  const word = { low: '不足', ok: '剛好', high: '偏多', none: '' };
  const focus = focusMuscles();
  // 最近 4 週練了 6 次以上才判斷「長期偏少」
  const enough = store.workouts.filter((w) => w.type === 'strength' && w.date >= addDays(todayStr(), -27)).length >= 6;
  const weak = enough ? rows.filter((x) => x.target && x.avg4 < x.target[0] && !focus.includes(x.key)) : [];
  return `<div class="card"><h3>💪 最近 7 天各肌群組數</h3>
    <p class="muted small">只算正式組（排除熱身組）。建議每週：胸、背、腿 10-20 組；肩、二頭、三頭 6-14 組。二頭、三頭會把背、胸的複合動作算一半。${muscleReport(store.workouts, todayStr()).length && (() => { const n = store.workouts.filter((w) => w.type === 'strength' && w.date >= addDays(todayStr(), -6)).length; return n < 3 ? `這 7 天只練了 ${n} 次，三分化還沒跑完一輪，數字會偏低。` : ''; })()}</p>
    ${rows.map((x) => `<div class="mus-row"><span class="mus-name">${esc(x.label)}</span>
      <div class="mus-bar">${x.target ? `<i class="zone" style="left:${pct(x.target[0])}%;width:${pct(x.target[1]) - pct(x.target[0])}%"></i>` : ''}<b class="${x.status}" style="width:${pct(x.sets)}%"></b></div>
      <span class="mus-n ${x.status}">${x.sets} 組${word[x.status] ? `<small>${word[x.status]}</small>` : ''}</span>
      ${x.key !== 'core' ? `<button class="btn small mus-focus ${focus.includes(x.key) ? 'active' : ''}" data-focus="${x.key}" title="加強這個部位">🎯</button>` : '<span></span>'}</div>
      <div class="mus-sub">${x.indirect ? `直接 ${x.direct} 組 + 複合動作 ${x.indirect} 組・` : ''}4 週平均每週 ${x.avg4} 組${focus.includes(x.key) ? '・<b class="focus">🎯 加強中：每個動作 +1 組</b>' : ''}</div>`).join('')}
    ${weak.length ? `<p class="small mt warn-text">💡 ${weak.map((x) => `${esc(x.label)} 4 週平均 ${x.avg4} 組`).join('、')}，低於建議。按右邊的 🎯 設成加強部位，之後練到這個部位的動作都會多 1 組。</p>` : '<p class="muted small mt">按 🎯 可以把某個部位設成加強部位：練到這個部位的每個動作多 1 組。</p>'}
  </div>`;
}
function renderStats() {
  setTitle('表現');
  const ws = store.workouts.filter((w) => w.type === 'strength');
  const series = BIG_THREE.map((name, i) => {
    const byDate = new Map();
    ws.forEach((w) => w.exercises.forEach((e) => { if (e.name === name && e.e1rm && !e.deload) byDate.set(w.date, Math.max(byDate.get(w.date) || 0, e.e1rm)); }));
    return { name, color: SERIES_COLORS[i], points: [...byDate.entries()].map(([x, y]) => ({ x, y })) };
  });
  const best = series.map((s) => s.points.length ? Math.max(...s.points.map((p) => p.y)) : 0);
  const latest = series.map((s) => { const pts = [...s.points].sort((a, b) => a.x.localeCompare(b.x)); return pts.length ? pts[pts.length - 1].y : 0; });
  const total = best.reduce((a, b) => a + b, 0);

  // 所有有重量的動作 → 目前最佳估算 1RM
  const bestAll = new Map();
  ws.forEach((w) => w.exercises.forEach((e) => { if (e.e1rm && !e.deload) { const cur = bestAll.get(e.name); if (!cur || e.e1rm > cur.v) bestAll.set(e.name, { v: e.e1rm, d: w.date, w: e.weight, r: e.reps }); } }));

  $view.innerHTML = h`
    ${reviewCardHTML()}
    <div class="stat-tiles">
      ${series.map((s, i) => `<div class="tile"><div class="v" style="color:${s.color}">${latest[i] || '-'}</div><div class="k">${esc(s.name)}<br>最新估 1RM</div></div>`).join('')}
    </div>
    <div class="card">
      <div class="row"><h3 class="grow">三大項估算 1RM 趨勢（kg）</h3><span class="muted small">總和 ${Math.round(total)}</span></div>
      <div class="chart-box">${lineChartSVG(series)}</div>
      <div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)} 最佳 ${best[series.indexOf(s)] || '-'}</span>`).join('')}</div>
      <p class="muted small mt">估算公式：Epley，1RM = 重量 × (1 + 次數 ÷ 30)。同一天多次取最高；減量的那幾次不算。</p>
    </div>
    ${cycleCardHTML()}
    ${muscleCardHTML()}
    ${muscleTrendHTML()}
    ${(() => { const a = deloadAdvice(store.workouts, todayStr()); return a.stalled.length ? `<div class="card deload"><h3>⚠️ 停滯中的動作</h3><p class="muted small">連續 3 次「最好的一組」和「總量」都沒超過之前。下次練到會自動減量一次，再回到原本重量。</p>${a.stalled.map((x) => `<div class="history-item"><div><div class="t">${esc(x.name)}</div><div class="d">上次突破 ${x.prDate}</div></div><div class="muted small">連續 ${x.since} 次</div></div>`).join('')}</div>` : ''; })()}
    <div class="card">
      <h3>各動作最佳估算 1RM</h3>
      ${bestAll.size ? [...bestAll.entries()].sort((a, b) => b[1].v - a[1].v).map(([n, x]) => `<div class="history-item"><div><div class="t">${esc(n)}</div><div class="d">${x.d}・${x.w} kg × ${x.r}</div></div><div style="font-weight:800">${x.v} kg</div></div>`).join('') : '<p class="muted">還沒有有重量的紀錄。</p>'}
    </div>
    <div class="card">
      <h3>全部紀錄（${trainings().length}）</h3>
      ${trainings().length ? trainings().map(historyRow).join('') : '<p class="muted">無</p>'}
    </div>`;
  bindHistoryRows();
  q('#rv-gen') && (q('#rv-gen').onclick = () => runReview());
  qa('[data-mus]').forEach((b) => b.onclick = () => { musSel = b.dataset.mus; renderStats(); });
  qa('[data-focus]').forEach((b) => b.onclick = async () => {
    const p = trainPrefs(store.workouts), k = b.dataset.focus;
    const focus = (p.focus || []).includes(k) ? p.focus.filter((x) => x !== k) : [...(p.focus || []), k];
    await store.add({ ...p, focus }, { keepCreatedAt: true });
    toast(focus.includes(k) ? `🎯 ${PART_LABELS[k]}設為加強部位：每個動作 +1 組` : `已取消加強${PART_LABELS[k]}`);
    if (route === 'stats') renderStats();
  });
  q('#cy-start') && (q('#cy-start').onclick = async () => { await store.add({ ...(cycleRecord(store.workouts) || {}), id: 'cycle', type: 'cycle', active: true, start: mondayOf(todayStr()) }, { keepCreatedAt: true }); toast('週期開始 📅 這週是累積期第 1 週'); if (route === 'stats') renderStats(); });
  q('#cy-stop') && (q('#cy-stop').onclick = async () => { if (!confirm('停止訓練週期？菜單會回到原本的組數和次數。')) return; await store.add({ ...cycleRecord(store.workouts), active: false }, { keepCreatedAt: true }); toast('已停止週期'); if (route === 'stats') renderStats(); });
  if (autoReview) { autoReview = false; runReview(); }
}

// ================= 設定 =================
function renderSettings() {
  const $body = document.getElementById('settings-body');
  const q = (sel) => $body.querySelector(sel);
  $body.innerHTML = h`
    <div class="card">
      <h3>Gemini API</h3>
      <p class="muted small">到 <code>aistudio.google.com/apikey</code> 取得，開頭通常是 <code>AIza</code>。${store.user ? '已登入 Google：key 會存到你自己的雲端資料（只有你讀得到），其他裝置登入後自動帶入，不用再貼。' : '登入 Google 後，key 會同步到其他裝置。'}</p>
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
    </div>
    <div class="card">
      <h3>資料備份</h3>
      <p class="muted small">把所有紀錄（訓練、體重、飲食、個人資料）下載成一個檔案，放到雲端硬碟或電腦。還原時同一筆會被覆蓋，其他的保留。檔案裡不含 API key。</p>
      <div class="row" style="gap:8px"><button class="btn grow" id="export">⬇️ 下載備份</button><button class="btn grow" id="import">⬆️ 從備份還原</button></div>
      <input type="file" id="import-file" accept=".json,application/json" hidden>
    </div>`;
  q('#export').onclick = () => {
    const records = store.workouts.filter((w) => w.type !== 'settings');
    const blob = new Blob([JSON.stringify({ app: 'fitapp', version: 1, exportedAt: new Date().toISOString(), records }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `健身備份-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`已下載 ${records.length} 筆紀錄`);
  };
  q('#import').onclick = () => q('#import-file').click();
  q('#import-file').onchange = async (ev) => {
    const f = ev.target.files[0]; ev.target.value = '';
    if (!f) return;
    let records;
    try { const j = JSON.parse(await f.text()); records = Array.isArray(j) ? j : j.records; if (!Array.isArray(records)) throw new Error('格式不對'); }
    catch (e) { toast('讀不到備份檔：' + e.message, 4000); return; }
    records = records.filter((r) => r && r.id && r.type && r.type !== 'settings');
    if (!records.length) { toast('備份檔裡沒有紀錄'); return; }
    const dup = records.filter((r) => store.workouts.some((w) => w.id === r.id)).length;
    if (!confirm(`還原 ${records.length} 筆紀錄？${dup ? `其中 ${dup} 筆和現在的重複，會用備份覆蓋。` : ''}`)) return;
    toast('還原中…');
    let n = 0;
    for (const r of records) { try { await store.add(r, { keepCreatedAt: true }); n++; } catch (e) { console.error(e); } }
    toast(`已還原 ${n} 筆`, 3000);
  };
  q('#savekey').onclick = async () => {
    setGeminiKey(q('#gkey').value); setGeminiModel(q('#gmodel').value);
    try { toast((await pushGeminiKey()) ? '已儲存，也同步到雲端 ☁️' : '已儲存'); } catch (e) { toast('已存在這台，雲端同步失敗：' + e.message, 4000); }
  };
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
