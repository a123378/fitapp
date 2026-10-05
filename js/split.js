// 三分化訓練（凱聖王 × 譚成義）：App 的主要重訓流程。
// 每天有固定的「位置」（骨架），組數次數照計畫；每個位置預設用計畫原本的動作，
// 也可以換成其他博主的同類動作（候選清單由下面的 pick 規則從博主菜單 + 動作清單自動挑出）。
import { ALL_MENUS, CREATORS } from './creators.js';
import { EXERCISES } from './exercises.js';
import { tipsFor } from './coaching.js';

const v = (id) => `https://www.douyin.com/video/${id}`;
export const SPLIT_PLAN_VIDEO = v('7623732958012198179');

const has = (...kws) => (n) => kws.some((k) => n.includes(k));
const not = (...kws) => (n) => !kws.some((k) => n.includes(k));
const all = (...fs) => (n) => fs.every((f) => f(n));

export const SPLIT_DAYS = {
  1: {
    label: '第一天：胸 + 肩中束 + 三頭', short: '胸・肩中束・三頭', groups: ['chest_tri', 'shoulders'],
    video: v('7625479021379194118'),
    note: '組數照凱聖王 × 譚成義的計畫白板。複合動作不做到力竭；影片最後有譚成義帶的熱身。',
    slots: [
      { key: 'd1_press', t: 12, label: '胸・主項', part: 'chest', sets: 4, reps: '8', rest: '2-3 分鐘', role: 'main',
        name: '槓鈴臥推', weight: true, tip: '先 1 組 15 下熱身，正式組 12→8 下遞增重量，再 4 組 8 下；不做到力竭',
        pick: all(has('臥推', '平推', '推胸', '伏地挺身'), not('上斜', '下斜', '下胸', '窄', '鑽石', '握把', 'Sphinx', '偽俄式')), home: '伏地挺身' },
      { key: 'd1_incline', t: 1653, label: '胸・上胸', part: 'chest', sets: 4, reps: '12', rest: '90 秒', role: 'aux',
        name: '上斜啞鈴臥推', weight: true, tip: '',
        pick: has('上斜', '上胸'), home: '下斜伏地挺身（腳墊高）' },
      { key: 'd1_dip', t: 2893, label: '下胸 + 三頭（雙槓類）', part: 'chest', sets: 4, reps: '12 或力竭', rest: '90 秒', role: 'aux',
        name: '雙槓撐體', weight: false, tip: '做不到就用退階（輔助）版本',
        pick: has('雙槓', '撐體', '臂屈伸（', '下胸', '夾胸'), home: '椅子撐體' },
      { key: 'd1_tri', t: 3549, label: '三頭', part: 'triceps', sets: 4, reps: '15', rest: '60-90 秒', role: 'iso',
        name: '仰臥槓鈴三頭伸展', weight: true, tip: '',
        partPick: 'triceps', home: '鑽石伏地挺身' },
      { key: 'd1_mid', t: 4155, label: '肩中束', part: 'shoulders', sets: 3, reps: '10 + 10 力竭', rest: '60 秒', role: 'iso',
        name: 'Y字側平舉', weight: true, tip: '每組 10 下後減重再做到力竭',
        pick: has('側平舉', 'Y舉', 'Y字'), home: '水瓶側平舉' }
    ]
  },
  2: {
    label: '第二天：背 + 肩後束 + 二頭', short: '背・肩後束・二頭', groups: ['back_bi', 'shoulders'],
    video: v('7627846384783297834'),
    note: '影片字幕只標了動作和重點、沒標組數，先用 4 組 × 10-12 下（和第一天的配置一致）。影片最後有譚成義帶的練背熱身。',
    slots: [
      { key: 'd2_pull1', t: 16, label: '背・垂直拉（主項）', part: 'back', sets: 4, reps: '10-12', rest: '2 分鐘', role: 'main',
        name: '單手鋼線下拉', weight: true, tip: '',
        pick: has('下拉', '引體'), home: '引體向上' },
      { key: 'd2_row', t: 1684, label: '背・划船', part: 'back', sets: 4, reps: '10-12', rest: '90 秒', role: 'aux',
        name: '單手器械划船', weight: true, tip: '',
        pick: has('划船'), home: '澳式划船（桌下划船）' },
      { key: 'd2_pull2', t: 3117, label: '背闊・第二個拉', part: 'back', sets: 4, reps: '8-12', rest: '90 秒', role: 'aux',
        name: '對握下拉', weight: true, tip: '能做 12 到 8 下的重量範圍都可以',
        pick: has('下拉', '直臂', '抱拉', '曲臂', '引體'), home: '毛巾門框划船' },
      { key: 'd2_rear', t: 3723, label: '肩後束', part: 'shoulders', sets: 4, reps: '12-15', rest: '60 秒', role: 'iso',
        name: '開肘拉', weight: true, tip: '手肘打開、在水平面往後拉，練後束和上背；器械可以多選',
        pick: has('後束', '反向飛鳥', '面拉', '俯身啞鈴飛鳥', '肩伸', '開肘'), home: '俯身反向飛鳥（水瓶）' },
      { key: 'd2_bi', t: 4358, label: '二頭', part: 'biceps', sets: 4, reps: '10-12', rest: '60 秒', role: 'iso',
        name: '鋼線彎舉', weight: true, tip: '注意大臂保持垂直',
        partPick: 'biceps', home: '毛巾彎舉（腳踩）' }
    ]
  },
  3: {
    label: '第三天：腿（股四頭 + 膕繩肌）', short: '腿', groups: ['legs'],
    video: v('7629718942222650670'),
    note: '組數照影片字幕；重量都選「不到力竭」的重量。開頭有譚成義的腿部熱身講解。',
    slots: [
      { key: 'd3_hinge1', t: 599, label: '單側髖鉸鏈', part: 'legs', sets: 3, reps: '12', rest: '90 秒', role: 'main',
        name: '單腿硬拉', weight: true, tip: '不到力竭選重量',
        pick: has('硬拉', '硬舉'), home: '單腳臀橋' },
      { key: 'd3_split', t: 1393, label: '單側蹲', part: 'legs', sets: 3, reps: '10', rest: '90 秒', role: 'main',
        name: '單腿保加利亞蹲', weight: true, tip: '不到力竭選重量',
        pick: has('保加利亞', '分腿', '弓箭步'), home: '保加利亞分腿蹲' },
      { key: 'd3_squat', t: 2061, label: '蹲（股四頭）', part: 'legs', sets: 3, reps: '15', rest: '90 秒', role: 'aux',
        name: '高腳杯深蹲', weight: true, tip: '不到力竭選重量',
        pick: has('深蹲', '腿推', '腿伸展'), home: '徒手深蹲' },
      { key: 'd3_hinge2', t: 2538, label: '膕繩肌', part: 'legs', sets: 3, reps: '15', rest: '90 秒', role: 'aux',
        name: '羅馬尼亞硬舉', weight: true, tip: '槓鈴版；不到力竭選重量',
        pick: has('羅馬尼亞', '腿彎舉'), home: '臀橋' },
      { key: 'd3_ext', t: 3080, label: '後側鏈收尾', part: 'legs', sets: 3, reps: '8-12', rest: '60 秒', role: 'iso',
        name: '山羊挺身', weight: true, tip: '依自己的力量決定要不要加重',
        pick: has('山羊', '臀推', '提踵', '內收'), home: '站姿提踵' }
    ]
  }
};

// 加練核心（選填，接在每天最後）
export const CORE_SLOT = { key: 'core', label: '加練核心', part: 'core', sets: 3, reps: '10-15', rest: '60 秒', role: 'iso',
  name: '健腹輪', weight: false, tip: '譚成義最推薦的腹部動作', pick: () => true, partPick: 'core', home: '捲腹' };

// 某個位置的所有候選動作（博主菜單 + 動作清單），附來源、提示、示範影片
export function candidatesFor(slot, location) {
  const out = new Map();
  const ok = (name, part) => (slot.partPick ? part === slot.partPick : part === slot.part && slot.pick(name));
  // 計畫原本的動作排第一
  const day = Object.values(SPLIT_DAYS).find((d) => d.slots.includes(slot));
  if (location === 'gym') out.set(slot.name, { name: slot.name, weight: slot.weight, tip: slot.tip, video: day ? day.video : null, t: slot.t ?? null, creator: '譚成義（三分化）' });
  ALL_MENUS.filter((m) => m.locations.includes(location)).forEach((m) => m.exercises.forEach((e) => {
    if (!ok(e.name, e.part) || out.has(e.name)) return;
    out.set(e.name, { name: e.name, weight: !!e.weight, tip: e.tip || '', video: e.video || m.url, t: e.video ? null : (e.t ?? null), creator: CREATORS[m.creator]?.name || '' });
  }));
  const list = (EXERCISES[location] || {})[slot.partPick || slot.part] || [];
  list.forEach((e) => { if (ok(e.name, slot.partPick || slot.part) && !out.has(e.name)) out.set(e.name, { name: e.name, weight: e.weight, tip: '', video: null, creator: '' }); });
  if (location === 'home' && slot.home && !out.has(slot.home)) {
    const e = Object.values(EXERCISES.home).flat().find((x) => x.name === slot.home);
    out.set(slot.home, { name: slot.home, weight: e ? e.weight : false, tip: '', video: null, creator: '' });
  }
  return [...out.values()].map((c) => ({ ...c, pro: tipsFor(c.name) }));
}

// 下一次該練第幾天（看最後一次三分化紀錄）
export function nextSplitDay(workouts) {
  const last = workouts.find((w) => w.type === 'strength' && w.split);
  return last ? (last.split.day % 3) + 1 : 1;
}
export function lastSplit(workouts) {
  return workouts.find((w) => w.type === 'strength' && w.split) || null;
}
// 已完成幾次三分化訓練 → 第幾輪
export function splitProgress(workouts) {
  const n = workouts.filter((w) => w.type === 'strength' && w.split).length;
  return { done: n, round: Math.floor(n / 3) + 1, first: [...workouts].reverse().find((w) => w.type === 'strength' && w.split)?.date || null };
}
// 這個位置上次選的動作（讓主項能持續追蹤進步）
export function lastSlotChoice(workouts, slotKey) {
  for (const w of workouts) {
    if (w.type !== 'strength' || !w.split) continue;
    const e = w.exercises.find((x) => x.slot === slotKey);
    if (e) return e.name;
  }
  return null;
}

// 熱身（開始動作前）：滾筒放鬆 / 動態熱身，內容取自譚成義的熱身與泡沫軸教學
const FOAM = v('7622584923861727601');       // 譚成義：泡沫軸放鬆全身
const SPLIT_WARM = v('7638569547629063665'); // 譚成義：三分化熱身整套流程
export const WARMUPS = {
  1: {
    roller: [
      { name: '泡沫軸放鬆上肢', detail: '胸大肌、二頭、三頭、三角肌，每個部位約 30 秒，在最痠的地方多滾', video: FOAM, t: 290 },
      { name: '放鬆胸小肌、胸大肌、二頭', detail: '三分化熱身流程的「胸部」放鬆段', video: SPLIT_WARM, t: 16 }
    ],
    dynamic: [
      { name: '胸部激活', detail: '激活胸廓擴張，練前鋸肌和下斜方，最後做手腕激活', video: SPLIT_WARM, t: 16 },
      { name: 'Y 字伸展・Y 字推舉・彈力帶繞肩', detail: '彈力帶從正前方繞到正後方，一組 20 次', video: v('7650309381392785073'), t: 10 },
      { name: '譚成義帶的胸肩三頭熱身', detail: '三分化第一天影片最後的熱身講解', video: v('7625479021379194118'), t: 4660 }
    ]
  },
  2: {
    roller: [
      { name: '泡沫軸放鬆上背', detail: '菱形肌、大圓肌、岡下肌、三頭，每個部位約 30 秒', video: FOAM, t: 290 },
      { name: '放鬆中斜方、菱形肌、大圓肌、岡下肌', detail: '三分化熱身流程的「背部」放鬆段', video: SPLIT_WARM, t: 456 }
    ],
    dynamic: [
      { name: '彈力帶熱身・前鋸肌・肩胛下肌激活', detail: '三分化熱身流程的「背部」激活段', video: SPLIT_WARM, t: 456 },
      { name: '健腹輪・跪姿肘屈伸', detail: '保持肩胛外展、核心發力，先把肩胛和軀幹穩定度叫醒', video: v('7647176615788911793'), t: 116 },
      { name: '譚成義帶的練背熱身', detail: '三分化第二天影片最後的熱身帶練', video: v('7627846384783297834'), t: 4804 }
    ]
  },
  3: {
    roller: [
      { name: '泡沫軸放鬆小腿、大腿、臀部', detail: '小腿、大腿後側（勾腳尖、重心前傾）、臀部，每個部位約 30 秒', video: FOAM, t: 8 },
      { name: '放鬆小腿後側、大腿前後、內外側、臀部', detail: '三分化熱身流程的「下肢」放鬆段', video: SPLIT_WARM, t: 802 }
    ],
    dynamic: [
      { name: '青蛙趴・單腿站立・飛機轉圈', detail: '打開髖關節、練足踝穩定', video: SPLIT_WARM, t: 802 },
      { name: '青蛙式・髖內旋・抬腿・世界上最偉大的伸展', detail: '提高髖關節靈活度', video: v('7655982129109198321'), t: 44 },
      { name: '譚成義的腿部熱身講解', detail: '三分化第三天影片開頭', video: v('7629718942222650670'), t: 0 }
    ]
  }
};
// 自由選肌群時用：依肌群對應到三分化的某一天熱身
export function warmupForGroup(group) {
  return { chest_tri: WARMUPS[1], shoulders: WARMUPS[1], back_bi: WARMUPS[2], legs: WARMUPS[3] }[group] || null;
}
