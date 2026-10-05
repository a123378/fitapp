// 訓練思路：把博主影片裡講的觀念整理在這裡，給 AI 排菜單時參考，也顯示在菜單頁上。
// 每條都標註來源博主；之後有新的講解照同樣格式往下加。
import { ALL_MENUS, CREATORS } from './creators.js';
import { GOALS } from './config.js';

// 通用原則（每一條都來自博主影片）
export const PRINCIPLES = [
  { text: '第一個動作當暖身，不要做到力竭', from: '金士程' },
  { text: '正式組前熱身要做足，選對重量，關節安全優先', from: '金士程' },
  { text: '狀態不好時降低強度或換動作，不要硬上', from: '金士程' },
  { text: '左右力量不平均：弱的那邊先做，兩邊做一樣多下', from: '金士程' },
  { text: '感覺不到目標肌群發力時，先修正動作再談重量', from: '維亞德' },
  { text: '多關節的大動作排前面，單關節的孤立動作排後面', from: '常見原則' },
  { text: '用 30%-85% 1RM 的重量練，持續提高這個範圍內的能力；抓不準就選能做 6-12 下的重量', from: '凱聖王 × 譚成義' },
  { text: '次數要週期性變化，例如 3-5 週練 6-15 下、再 3-5 週練 15-30 下、再 3-5 週練 5-8 下', from: '凱聖王 × 譚成義' },
  { text: '計畫先從低強度、高容量開始，再逐步提高強度、減少容量，注意疲勞管理和休息', from: '凱聖王 × 譚成義' },
  { text: '複合動作不建議做到力竭；單關節動作可以視情況做到力竭', from: '凱聖王 × 譚成義' },
  { text: '隔天痠不痠不能判斷會不會長肌肉，但能告訴你練得對不對（例如練肩隔天反而斜方痠）', from: '凱聖王 × 譚成義' },
  { text: '同一塊肌肉要多角度刺激，選動作要看解剖結構；自由重量和器械沒有誰好誰壞', from: '凱聖王 × 譚成義' },
  { text: '不要為了把重量推上去而推，要想著順著肌纖維的方向發力收縮', from: 'RRRoy 第38集・大鵬' },
  { text: '固定器械力線更準、收縮更到位，適合找發力感', from: 'RRRoy 第44集・溫凱' },
  { text: '增肌要募集到最有潛力的 IIB 型肌纖維：動作模式正確的前提下，做 6-12 下、接近力竭', from: '訓練怪獸・陳康' },
  { text: '練肩和手臂以遞增組為主；遞減組是為了做到深度力竭，但不要過度追求力竭', from: '訓練怪獸・劉孟易' }
];

// 單一動作的講解（依動作名稱關鍵字比對），菜單上會顯示在該動作下方，也會提供給 AI 參考
const XV = (id) => `https://www.douyin.com/video/${id}`;
export const EXERCISE_TIPS = [
  { match: ['高位下拉', '滑輪下拉', '對握下拉'], text: '身體姿態、握把細節和常見握把誤區', from: '訓練怪獸・鬼背小黑', video: XV('7684073894222875914') },
  { match: ['單臂', '單手器械划船', '單手繩索划船'], also: '划船', text: '頭、背、臀維持中立，不刻意夾肘；往腹部拉才練到背闊，往胸口拉會變成後束；寬握時凳子調低', from: '訓練怪獸・陳康', video: XV('7691171242623175971') },
  { match: ['坐姿划船', '坐姿繩索'], also: '划船', text: '挺胸但不過度；拉到下胸練上背和斜方，拉到肚臍練背闊（這時不要主動夾肩胛）；回放時讓肩胛鬆開，行程更長', from: '訓練怪獸・鬼背小黑', video: XV('7670380728614769905') },
  { match: ['槓鈴划船', '俯身划船', 'T槓划船'], text: '做槓鈴划船腰痠，先用龍門架（滑輪放最低）學：挺胸、核心收緊、背打直；開肘拉到下胸練上背，手肘放低拉到肚臍練背闊', from: '訓練怪獸・鬼背小黑', video: XV('7687834249491123519') },
  { match: ['直臂下壓', '抱拉'], text: '手扣住但別抓太緊、手肘微彎；含胸背闊更出力、挺胸偏大圓肌；回去時保持離心控制', from: '訓練怪獸・鬼背小黑', video: XV('7663326989260033314') },
  { match: ['側平舉'], text: '不要做「倒水」動作（手臂內旋）以免肩峰撞擊：手臂伸直、大拇指朝上', from: '訓練怪獸・陳康', video: XV('7690430161417735474') },
  { match: ['側平舉'], text: '斜方肌代償多半是下放沒控制：下放時保持中束拉長，想像有支撐點，不要整個放下', from: '訓練怪獸・趙師', video: XV('7641802641449766186') },
  { match: ['肩推'], text: '先找到肩膀發力、手肘微彎、配合呼吸；下放離心保持張力；依自己的能力調整大臂內收角度', from: '訓練怪獸・劉孟易', video: XV('7674841548474862884') },
  { match: ['上斜'], also: '推', text: '握距略窄、小臂垂直、不用觸胸；骨盆後傾、肋骨提起、胸腔打開，順著肌纖維方向收縮', from: '訓練怪獸・劉孟易', video: XV('7673358722688666895') }
];

export function tipsFor(name) {
  return EXERCISE_TIPS.filter((t) => t.match.some((k) => name.includes(k)) && (!t.also || name.includes(t.also)));
}

// 各肌群的動作重點（顯示在菜單頁「教練重點」）
export const GROUP_CUES = {
  chest_tri: [
    { text: '雙槓撐體練胸：挺胸、屈髖、重心前傾，保持持續張力', from: '譚成義' },
    { text: '推胸半握、開肋收緊、保持胸腔擴張；上斜推胸手肘抬高，避免變成下胸發力', from: '譚成義' },
    { text: '繩索夾胸可以依要練的位置調整繩索高度', from: 'RRRoy 第44集・溫凱' },
    { text: '上斜推胸握距略窄、小臂垂直，骨盆後傾、肋骨提起、胸腔打開', from: '訓練怪獸・劉孟易' },
    { text: '臥推正式組前先做熱身組', from: '金士程' },
    { text: '雙槓撐體想練胸：腿放前面、重心往前，胸會一直出力', from: '維亞德' },
    { text: '伏地挺身可以換寬距、窄距、上斜、下斜，練到不同位置', from: '維亞德' },
    { text: '過頭三頭伸展：繩索往斜上方打開，不是直直往上推', from: '維亞德' }
  ],
  back_bi: [
    { text: '練背關鍵在脊柱和肩胛穩定；下拉身體中立位微微前傾，不要後仰', from: '譚成義' },
    { text: '單手繩索划船：腿蹬住、手肘撐住，軀幹對抗側屈', from: '譚成義' },
    { text: '「全肩伸」動作練背闊更到位；器械單臂划船偏大圓肌，俯身划船肩胛主動後縮偏中下斜方', from: 'RRRoy 第40集・溫凱' },
    { text: '想練下背：引體力線要穩、拉得夠深；對握划船座位調高、預先吃住張力', from: 'RRRoy 第37集・Clark梁' },
    { text: '划船拉到下胸偏上背、拉到肚臍偏背闊；往腹部拉才不會變成後束出力', from: '訓練怪獸・鬼背小黑、陳康' },
    { text: '下拉：拇指不要扣、肩胛骨先內收、手肘往內收，拉到鎖骨', from: '維亞德' },
    { text: '划船拉到腹部，不是拉到胸口；下拉練寬、划船練厚', from: '維亞德' },
    { text: '高位下拉放第一個當暖身，不做力竭', from: '金士程' },
    { text: '彎舉手肘固定；牧師椅上臂貼墊、斜板彎舉背貼椅背，不借力', from: '維亞德' }
  ],
  shoulders: [
    { text: '先做後束激活和熱身：彈力帶從正前方繞到正後方，一組 20 次', from: '譚成義' },
    { text: '推肩手肘打開越多，中束參與越多（關節靈活度要夠）', from: 'RRRoy 第38集・大鵬' },
    { text: '側平舉大拇指朝上別「倒水」；下放保持中束拉長，斜方才不會代償', from: '訓練怪獸・陳康、趙師' },
    { text: '繩索側平舉：先回中立位、和繩索拉開距離、預先張力、在肩胛面舉不要往後飛、下放不落底', from: 'RRRoy 第38集・大鵬' },
    { text: '啞鈴肩推椅背接近直立、手肘在身體稍前方，別太重、做完整行程', from: '維亞德' },
    { text: '側平舉練中束、反向飛鳥練後束、肩外旋顧旋轉肌袖', from: '維亞德' },
    { text: '有保護桿的推肩機可以比較放心推到力竭', from: '金士程' }
  ],
  legs: [
    { text: '腿部頻率高、強度低，避免過度訓練影響恢復', from: '譚成義' },
    { text: '腿部動作都選「不到力竭」的重量', from: '凱聖王 × 譚成義' },
    { text: '提踵腳趾抓地，前腳掌不要翹起', from: '譚成義' },
    { text: '先用腿伸展把膝蓋和股四頭熱開', from: '金士程' },
    { text: '深蹲重量依當天狀態調整，腿軟就別硬上', from: '金士程' },
    { text: '前一天練過硬拉、腿後很累，改做俯身腿彎舉這類小動作', from: '金士程' }
  ],
  core: [
    { text: '健腹輪是最推薦的腹部動作；懸垂舉腿注意進退階和呼吸', from: '譚成義' },
    { text: '上腹、下腹、側腹都要練到，動作連做不休息效率高', from: '維亞德' }
  ]
};

// 博主菜單裡出現過的動作 → 加進 AI 可選清單（附提示與示範影片）
export function creatorPool(location, partKey) {
  const out = new Map();
  ALL_MENUS.filter((m) => m.locations.includes(location)).forEach((m) => m.exercises.forEach((e) => {
    if (e.part !== partKey || out.has(e.name)) return;
    out.set(e.name, { name: e.name, weight: !!e.weight, tip: e.tip || '', video: e.video || m.url, creator: CREATORS[m.creator]?.name || '' });
  }));
  return [...out.values()];
}

// 最近同肌群的訓練（給 AI 看進度）
export function groupHistory(workouts, group, n = 4) {
  return workouts.filter((w) => w.type === 'strength' && w.group === group).slice(0, n);
}

export function daysSince(workouts, group) {
  const last = workouts.find((w) => w.type === 'strength' && w.group === group);
  if (!last) return null;
  return Math.round((new Date(todayISO()) - new Date(last.date)) / 86400000);
}

// 漸進超負荷：依上次表現建議今天的重量 / 次數
// range：可傳入這個動作自己的次數範圍（例如三分化的 "8"、"10-12"），沒傳就用目標的範圍
export function repRange(reps) {
  const n = String(reps || '').match(/\d+/g);
  if (!n) return null;
  const a = Number(n[0]), b = n.length > 1 && !/[+＋]/.test(reps) ? Number(n[1]) : a;
  return [Math.min(a, b), Math.max(a, b)];
}
export function suggestNext(name, hasWeight, goalKey, workouts, range = null) {
  const [lo, hi] = range || GOALS[goalKey].reps;
  let last = null;
  for (const w of workouts) {
    if (w.type !== 'strength') continue;
    const e = w.exercises.find((x) => x.name === name && x.reps > 0);
    if (e) { last = { ...e, date: w.date }; break; }
  }
  if (!last) return null;
  if (!hasWeight || !last.weight) {
    return last.reps >= hi
      ? { text: `上次 ${last.reps} 下已達上限，今天換較難的變化或放慢離心`, weight: null }
      : { text: `上次 ${last.reps} 下，今天目標 ${last.reps + 1} 下`, weight: null };
  }
  const inc = last.weight >= 40 ? 2.5 : last.weight >= 10 ? 1 : 0.5;
  const prev = `上次 ${last.weight} kg × ${last.reps}`;
  if (last.reps >= hi) return { text: `${prev} → 今天加到 ${round(last.weight + inc)} kg`, weight: round(last.weight + inc) };
  if (last.reps < lo) return { text: `${prev}，次數不到 ${lo}，今天降到 ${round(last.weight * 0.9)} kg 把動作做好`, weight: round(last.weight * 0.9) };
  return { text: `${prev} → 同重量，目標多 1 下（${last.reps + 1}）`, weight: last.weight };
}

function round(x) { return Math.round(x * 2) / 2; }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

// AI 選項
export const AI_STATES = {
  good:   { label: '精神很好', icon: '🔥', desc: '可以挑戰重量' },
  normal: { label: '普通', icon: '🙂', desc: '照計畫練' },
  tired:  { label: '有點累', icon: '😮‍💨', desc: '降低量、顧動作' }
};
export const AI_MINUTES = [30, 45, 60, 90];


// 把肌群重點分配到動作上：重點文字和動作名稱有共同的動作關鍵字就算相關
const MOVE_KEYS = ['臥推', '推胸', '平推', '上斜', '雙槓', '撐體', '夾胸', '伏地挺身', '下拉', '引體', '划船', '直臂', '抱拉', '彎舉', '側平舉', '肩推', '推肩', '飛鳥', '後束', '面拉', '深蹲', '硬拉', '硬舉', '腿彎舉', '提踵', '保加利亞', '腿伸展', '捲腹', '健腹輪', '舉腿', '三頭', '前平舉'];
export function cuesFor(name, groups) {
  const keys = MOVE_KEYS.filter((k) => name.includes(k));
  if (!keys.length) return [];
  return groups.flatMap((g) => GROUP_CUES[g] || []).filter((c) => keys.some((k) => c.text.includes(k)));
}
// 沒有對應到任何動作的肌群重點（放在最後一頁當今天的原則）
export function generalCues(groups) {
  return groups.flatMap((g) => GROUP_CUES[g] || []).filter((c) => !MOVE_KEYS.some((k) => c.text.includes(k)));
}
// 抖音影片網址 → 嵌入播放器
export function embedUrl(url) {
  const m = String(url || '').match(/video\/(\d+)/);
  return m ? `https://open.douyin.com/player/video?vid=${m[1]}&autoplay=0` : null;
}
