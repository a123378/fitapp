import { GOALS, LOCATIONS, MUSCLE_GROUPS, SIZE_RULES, GEMINI_DEFAULT_MODEL, CARDIO_MODES, CARDIO_TYPES } from './config.js';
import { exercisesFor } from './exercises.js';
import { creatorPool, PRINCIPLES, GROUP_CUES, AI_STATES, tipsFor } from './coaching.js';

const KEY_STORAGE = 'fitapp.geminiKey';
const MODEL_STORAGE = 'fitapp.geminiModel';

export function getGeminiKey() { return localStorage.getItem(KEY_STORAGE) || ''; }
export function setGeminiKey(k) { localStorage.setItem(KEY_STORAGE, (k || '').trim()); }
export function getGeminiModel() { return localStorage.getItem(MODEL_STORAGE) || GEMINI_DEFAULT_MODEL; }
export function setGeminiModel(m) { localStorage.setItem(MODEL_STORAGE, (m || '').trim() || GEMINI_DEFAULT_MODEL); }

async function callGemini(prompt, schema) {
  const key = getGeminiKey();
  if (!key) throw new Error('NO_KEY');
  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return JSON.parse(text);
}

// ---------- 重訓菜單 ----------
const strengthSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    focus: { type: 'STRING' },
    warmup: { type: 'STRING' },
    exercises: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          sets: { type: 'INTEGER' },
          reps: { type: 'STRING' },
          rest: { type: 'STRING' },
          rir: { type: 'STRING' },
          tip: { type: 'STRING' },
          why: { type: 'STRING' }
        },
        required: ['name', 'sets', 'reps', 'rest']
      }
    },
    note: { type: 'STRING' }
  },
  required: ['title', 'exercises']
};

// 可選動作 = 動作清單 + 博主菜單出現過的動作（附博主提示、示範影片）
function poolFor(location, partKey) {
  const map = new Map();
  exercisesFor(location, partKey).forEach((e) => map.set(e.name, { name: e.name, weight: e.weight, tags: e.tags || [] }));
  creatorPool(location, partKey).forEach((e) => {
    const cur = map.get(e.name);
    map.set(e.name, { ...(cur || { name: e.name, weight: e.weight, tags: [] }), tip: e.tip, video: e.video, creator: e.creator });
  });
  return [...map.values()].map((e) => {
    const t = tipsFor(e.name)[0];
    return e.tip || !t ? e : { ...e, tip: t.text, creator: e.creator || t.from };
  });
}

function historyText(history) {
  if (!history.length) return '（這個肌群還沒有紀錄）';
  return history.map((w) => `${w.date}：` + w.exercises.map((e) =>
    `${e.name} ${e.hasWeight ? `${e.weight || '?'}kg×${e.reps || '?'}` : `${e.reps || '?'}下`}×${e.setsDone || e.sets}組`).join('、')).join('\n');
}

export async function generateStrengthMenu({ location, group, goal, ctx = {} }) {
  const g = GOALS[goal];
  const mg = MUSCLE_GROUPS[group];
  const partsDesc = mg.parts.map((p) => {
    const rule = SIZE_RULES[p.size];
    const list = poolFor(location, p.key).map((e) => `${e.name}${e.creator ? `（${e.creator}：${e.tip || '有示範'}）` : ''}`).join('；');
    return `【${p.label}】(${p.size === 'large' ? '大肌群' : '小肌群'}：每個動作 ${rule.sets[0]}-${rule.sets[1]} 組，至少 ${rule.minExercises} 個動作)\n可選動作：${list}`;
  }).join('\n');

  const st = AI_STATES[ctx.state] || AI_STATES.normal;
  const minutes = ctx.minutes || 60;
  const ds = ctx.daysSince;
  const principles = PRINCIPLES.map((x) => `- ${x.text}（${x.from}）`).join('\n');
  const cues = (GROUP_CUES[group] || []).map((x) => `- ${x.text}（${x.from}）`).join('\n');
  const sugg = (ctx.suggestions || []).filter((x) => x.text).map((x) => `- ${x.name}：${x.text}`).join('\n');

  const powerNote = goal === 'power' && location === 'home'
    ? '\n在家徒手無法用重量做 1-3RM：改用爆發式動作（擊掌伏地挺身、跳躍深蹲等），每組 3-5 下全力輸出、休息充足。' : '';

  const prompt = `你是專業健身教練，要為我安排今天「${LOCATIONS[location].label}」的「${mg.label}」重訓菜單。
請像真正的私人教練一樣，根據我的紀錄、今天狀態和時間做判斷，而不是隨便挑動作。

【今天的條件】
- 目標：${g.label}（${g.rm}，每組 ${g.reps[0]}-${g.reps[1]} 下，組間休息 ${g.rest}）
- 狀態：${st.label}（${st.desc}）
- 可用時間：約 ${minutes} 分鐘（含熱身；每組約 40 秒 + 休息時間，請估算總組數不要超時）
- 距離上次練這個肌群：${ds == null ? '沒有紀錄' : `${ds} 天`}
${ctx.note ? `- 我的備註：${ctx.note}（一定要照顧到，例如有痠痛就避開相關動作）` : ''}

【最近同肌群的訓練】
${historyText(ctx.history || [], g)}

【依紀錄算出的進度建議】
${sugg || '（沒有可參考的紀錄）'}

【訓練思路（來自我追蹤的博主，請遵守）】
${principles}
${cues}

【排菜單規則】
1. 動作「只能」從下面清單挑，名稱一字不差照抄。
2. 每個部位的動作數量和組數要符合規則；時間不夠時，優先保留複合動作、減少孤立動作的組數，但不要低於最低動作數。
3. 順序：第一個動作安排暖身組概念、不做力竭；大重量複合動作在前，孤立動作在後。
4. 最近已經做過的動作可以保留主要的複合動作（方便追蹤進步），孤立動作適度輪替。
5. 狀態「有點累」：組數取下限、rir 寫 3；「精神很好」：組數可取上限、最後一組 rir 0-1。
6. reps 寫範圍字串如 "8-12"；rest 寫如 "90 秒"；rir 寫保留次數如 "1-2"。
7. tip 一句話講動作重點（有博主提示就用博主的）；why 一句話說明為什麼排這個動作、這個位置。
8. focus 用一句話說今天的訓練重點；note 用一兩句說明這份菜單怎麼依我的紀錄和狀態調整。
9. 全部繁體中文（台灣用語）。
${partsDesc}${powerNote}`;

  const result = await callGemini(prompt, strengthSchema);
  return sanitizeStrength(result, location, group, goal, ctx);
}

function sanitizeStrength(result, location, group, goal, ctx = {}) {
  const mg = MUSCLE_GROUPS[group];
  const valid = new Map();
  mg.parts.forEach((p) => poolFor(location, p.key).forEach((e) => valid.set(e.name, { ...e, part: p.label, partKey: p.key, size: p.size })));
  const seen = new Set();
  let exercises = (result.exercises || [])
    .map((x) => {
      const v = valid.get((x.name || '').trim());
      if (!v || seen.has(v.name)) return null;
      seen.add(v.name);
      const rule = SIZE_RULES[v.size];
      return { name: v.name, part: v.part, partKey: v.partKey, hasWeight: v.weight,
        sets: clamp(Number(x.sets) || rule.sets[0], rule.sets[0], rule.sets[1]),
        reps: String(x.reps || GOALS[goal].reps.join('-')), rest: x.rest || GOALS[goal].rest,
        rir: x.rir || '', tip: x.tip || v.tip || '', why: x.why || '', video: v.video || '' };
    })
    .filter(Boolean);
  if (!exercises.length) throw new Error('Gemini 回傳的動作都不在清單內，請重試');
  // 補足每個部位的最低動作數
  mg.parts.forEach((p) => {
    const rule = SIZE_RULES[p.size];
    const have = exercises.filter((e) => e.partKey === p.key).length;
    const extra = poolFor(location, p.key).filter((e) => !seen.has(e.name)).slice(0, Math.max(0, rule.minExercises - have));
    extra.forEach((e) => { seen.add(e.name); exercises.push({ name: e.name, part: p.label, partKey: p.key, hasWeight: e.weight, sets: rule.sets[0], reps: GOALS[goal].reps.join('-'), rest: GOALS[goal].rest, rir: '', tip: e.tip || '', why: '補足最低動作數', video: e.video || '' }); });
  });
  return { title: result.title || `${mg.label}・${GOALS[goal].label}`, focus: result.focus || '', warmup: result.warmup || '', note: result.note || '', exercises };
}

// 沒有 API key 或呼叫失敗時的本機備援菜單：一樣看狀態、時間、上次做過的動作
export function fallbackStrengthMenu({ location, group, goal, ctx = {} }) {
  const g = GOALS[goal];
  const mg = MUSCLE_GROUPS[group];
  const tired = ctx.state === 'tired', good = ctx.state === 'good';
  const short = (ctx.minutes || 60) <= 30;
  const recent = new Set((ctx.history || []).slice(0, 1).flatMap((w) => w.exercises.map((e) => e.name)));
  const exercises = [];
  mg.parts.forEach((p) => {
    const rule = SIZE_RULES[p.size];
    let pool = poolFor(location, p.key);
    if (goal === 'power' && location === 'home') {
      pool = [...pool.filter((e) => e.tags.includes('power')), ...pool.filter((e) => !e.tags.includes('power'))];
    } else {
      // 有博主示範的優先、上次做過的往後放（主項保留第一個）
      pool = shuffle(pool).sort((a, b) => (recent.has(a.name) - recent.has(b.name)) || ((b.creator ? 1 : 0) - (a.creator ? 1 : 0)));
    }
    const n = Math.min(pool.length, rule.minExercises + (p.size === 'large' && !short && !tired ? 1 : 0));
    const sets = tired || short ? rule.sets[0] : good ? rule.sets[1] : Math.min(rule.sets[0] + 1, rule.sets[1]);
    pool.slice(0, n).forEach((e, i) => exercises.push({
      name: e.name, part: p.label, partKey: p.key, hasWeight: e.weight, sets,
      reps: goal === 'power' && location === 'home' ? '3-5' : `${g.reps[0]}-${g.reps[1]}`,
      rest: g.rest, rir: tired ? '3' : good ? '0-1' : '1-2', tip: e.tip || '', why: i === 0 ? '第一個動作，先用較輕重量當暖身' : '', video: e.video || ''
    }));
  });
  return { title: `${mg.label}・${g.label}（本機產生）`, focus: '', warmup: '5 分鐘動態熱身 + 第一個動作 1-2 組輕重量暖身', note: `未設定 Gemini API key，此菜單由本機規則產生（已依狀態「${(AI_STATES[ctx.state] || AI_STATES.normal).label}」和 ${ctx.minutes || 60} 分鐘調整組數）。`, exercises };
}

// ---------- 有氧菜單 ----------
const cardioSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    prepSec: { type: 'INTEGER' },
    workSec: { type: 'INTEGER' },
    restSec: { type: 'INTEGER' },
    rounds: { type: 'INTEGER' },
    moves: { type: 'ARRAY', items: { type: 'STRING' } },
    targetMinutes: { type: 'INTEGER' },
    targetKm: { type: 'NUMBER' },
    paceHint: { type: 'STRING' },
    note: { type: 'STRING' }
  },
  required: ['title']
};

export async function generateCardioPlan({ mode, type, location }) {
  const m = CARDIO_MODES[mode];
  const t = CARDIO_TYPES[type];
  let prompt;
  if (type === 'run') {
    prompt = `你是專業跑步教練。請為我安排一次「${m.label}」目標的跑步課表。
${mode === 'cardio' ? '目標是提升心肺，可安排節奏跑或間歇跑。' : '目標是燃脂，安排中低強度、較長時間的有氧區間（zone 2）。'}
請回傳：title、targetMinutes（總時間分鐘）、targetKm（建議距離，可為小數）、paceHint（配速或心率建議）、note（一句話提醒）。全部繁體中文。`;
  } else {
    prompt = `你是專業體能教練。請為我安排一次「${m.label}」目標的 ${t.label} 課表（${location === 'home' ? '在家徒手' : '健身房'}）。
${type === 'tabata' ? '標準 Tabata：workSec=20、restSec=10、rounds=8，可安排 1-4 個動作輪流。' : 'HIIT：workSec 30-45 秒、restSec 15-30 秒、rounds 8-12。'}
${mode === 'fat' ? '燃脂目標可以拉長總時間或增加輪數。' : '心肺目標請提高強度。'}
請回傳：title、prepSec（準備秒數，10）、workSec、restSec、rounds、moves（動作名稱陣列，繁體中文，徒手可做）、note。全部繁體中文。`;
  }
  const r = await callGemini(prompt, cardioSchema);
  return sanitizeCardio(r, type);
}

function sanitizeCardio(r, type) {
  if (type === 'run') {
    return { title: r.title || '跑步', targetMinutes: Number(r.targetMinutes) || 30, targetKm: Number(r.targetKm) || 5, paceHint: r.paceHint || '', note: r.note || '' };
  }
  return {
    title: r.title || (type === 'tabata' ? 'Tabata' : 'HIIT'),
    prepSec: clamp(Number(r.prepSec) || 10, 5, 30),
    workSec: clamp(Number(r.workSec) || (type === 'tabata' ? 20 : 40), 10, 120),
    restSec: clamp(Number(r.restSec) || (type === 'tabata' ? 10 : 20), 5, 120),
    rounds: clamp(Number(r.rounds) || 8, 1, 30),
    moves: Array.isArray(r.moves) && r.moves.length ? r.moves.slice(0, 8) : ['開合跳', '波比跳', '登山者', '深蹲跳'],
    note: r.note || ''
  };
}

export function fallbackCardioPlan({ mode, type }) {
  if (type === 'run') {
    return mode === 'cardio'
      ? { title: '間歇跑（本機）', targetMinutes: 30, targetKm: 5, paceHint: '快 2 分鐘 / 慢 1 分鐘交替，心率 80-90%', note: '未設定 Gemini API key。' }
      : { title: '燃脂慢跑（本機）', targetMinutes: 40, targetKm: 5, paceHint: '可以邊跑邊說話的速度，心率 60-70%', note: '未設定 Gemini API key。' };
  }
  if (type === 'tabata') {
    return { title: 'Tabata（本機）', prepSec: 10, workSec: 20, restSec: 10, rounds: 8, moves: ['波比跳', '深蹲跳', '登山者', '開合跳'], note: '未設定 Gemini API key。' };
  }
  return mode === 'cardio'
    ? { title: 'HIIT 心肺（本機）', prepSec: 10, workSec: 40, restSec: 20, rounds: 10, moves: ['波比跳', '高抬腿', '深蹲跳', '登山者', '開合跳'], note: '未設定 Gemini API key。' }
    : { title: 'HIIT 燃脂（本機）', prepSec: 10, workSec: 30, restSec: 30, rounds: 12, moves: ['開合跳', '登山者', '弓箭步跳', '平板支撐拍肩', '高抬腿'], note: '未設定 Gemini API key。' };
}

function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// ---------- 三分化：AI 依今天狀況調整當天菜單 ----------
const splitSchema = {
  type: 'OBJECT',
  properties: {
    focus: { type: 'STRING' },
    warmup: { type: 'STRING' },
    slots: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          slot: { type: 'STRING' }, name: { type: 'STRING' }, sets: { type: 'INTEGER' },
          reps: { type: 'STRING' }, rir: { type: 'STRING' }, why: { type: 'STRING' }
        },
        required: ['slot', 'name', 'sets', 'reps']
      }
    },
    note: { type: 'STRING' }
  },
  required: ['slots']
};

// slots: [{ key, label, sets, reps, defaultName, candidates: [{name, creator, tip}] }]
export async function generateSplitMenu({ day, dayLabel, location, slots, ctx = {} }) {
  const st = AI_STATES[ctx.state] || AI_STATES.normal;
  const principles = PRINCIPLES.map((x) => `- ${x.text}（${x.from}）`).join('\n');
  const cues = (ctx.cues || []).map((x) => `- ${x.text}（${x.from}）`).join('\n');
  const sugg = (ctx.suggestions || []).filter((x) => x.text).map((x) => `- ${x.name}：${x.text}`).join('\n');
  const slotText = slots.map((s) => `【${s.key}】${s.label}：計畫 ${s.sets} 組 × ${s.reps}，預設「${s.defaultName}」
  候選：${s.candidates.map((c) => `${c.name}${c.creator ? `（${c.creator}${c.tip ? '：' + c.tip : ''}）` : ''}`).join('；')}`).join('\n');

  const prompt = `你是專業健身教練。我照「凱聖王 × 譚成義三分化」訓練，今天是${dayLabel}（${LOCATIONS[location].label}）。
請在不打亂三分化結構的前提下，依我的紀錄、今天狀態和時間，幫每個位置挑一個動作並微調組數。

【今天的條件】
- 狀態：${st.label}（${st.desc}）
- 可用時間：約 ${ctx.minutes || 60} 分鐘（含熱身；每組約 40 秒 + 休息）
${ctx.note ? `- 我的備註：${ctx.note}（一定要照顧到，例如有痠痛就換掉相關動作）` : ''}

【最近幾次同一天的訓練】
${historyText(ctx.history || [])}

【依紀錄算出的進度建議】
${sugg || '（沒有可參考的紀錄）'}

【訓練思路（請遵守）】
${principles}
${cues}

【規則】
1. 每個位置都要回傳一筆，slot 填位置代號（例如 d1_press），name 只能從該位置的候選照抄。
2. 主項（第一個位置）若上次有做，優先保留同一個動作，方便追蹤進步；輔助和孤立動作可以輪替。
3. 組數以計畫為準，只能 ±1 組；狀態「有點累」或時間不夠就減少孤立動作的組數，rir 寫 3；「精神很好」最後一組 rir 0-1。複合動作不要做到力竭。
4. reps 原則上照計畫；rir 寫保留次數如 "1-2"；why 一句話說明為什麼選這個動作。
5. focus 一句話說今天重點；warmup 一句話；note 一兩句說明你怎麼依我的狀況調整。全部繁體中文（台灣用語）。

${slotText}`;
  return callGemini(prompt, splitSchema);
}
