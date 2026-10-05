// 譚成義（抖音 nishitiantan1，自然健美冠軍）：和凱聖王合作的三分化計畫 + 「私教系列」長片教學。
// 三分化三天分別放進 App 對應的肌群（第一天：胸+三頭、肩；第二天：背+二頭；第三天：腿）。
// 有寫組數的照抄（第一天看白板、第三天看影片字幕）；沒寫的在 note 註明。
// part：chest / triceps / back / biceps / shoulders / legs / core

export const TAN_PROFILE = 'https://www.douyin.com/user/MS4wLjABAAAArfpAmbNNdODGpzfznrZAXrt2JgCGFWxE25eFkQDGXOY';
const v = (id) => `https://www.douyin.com/video/${id}`;
export const TAN_PLAN_VIDEO = v('7623732958012198179'); // 三分化①：訓練計畫說明

export const TAN_MENUS = [
  {
    id: 'tan-3split-1', title: '三分化第一天：胸 + 肩中束 + 三頭', url: v('7625479021379194118'), date: '2026-04-06',
    locations: ['gym'], groups: ['chest_tri', 'shoulders'],
    note: '凱聖王 × 譚成義三分化。組數照計畫白板。複合動作不做到力竭；臥推先做 1 組 15 下熱身組。影片最後有譚成義帶的熱身。',
    exercises: [
      { name: '槓鈴臥推', part: 'chest', sets: 4, reps: '8', weight: true, tip: '先 1 組 15 下熱身，正式組 12→8 下遞增重量，再 4 組 8 下', t: 12 },
      { name: '上斜啞鈴臥推', part: 'chest', sets: 4, reps: '12', weight: true, tip: '', t: 1653 },
      { name: '雙槓撐體', part: 'triceps', sets: 4, reps: '12 或力竭', weight: false, tip: '做不到就用退階（輔助）版本', t: 2893 },
      { name: '仰臥槓鈴三頭伸展', part: 'triceps', sets: 4, reps: '15', weight: true, tip: '', t: 3549 },
      { name: 'Y字側平舉', part: 'shoulders', sets: 3, reps: '10 + 10 力竭', weight: true, tip: '每組 10 下後減重再做到力竭', t: 4155 }
    ]
  },
  {
    id: 'tan-3split-2', title: '三分化第二天：背 + 肩後束 + 二頭', url: v('7627846384783297834'), date: '2026-04-12',
    locations: ['gym'], groups: ['back_bi', 'shoulders'],
    note: '凱聖王 × 譚成義三分化。這集沒抓到組數，這裡用 4 組 × 10-12 下（和第一天的配置一致）。影片最後有譚成義帶的練背熱身。',
    exercises: [
      { name: '單手鋼線下拉', part: 'back', sets: 4, reps: '10-12', weight: true, tip: '', t: 16 },
      { name: '單手器械划船', part: 'back', sets: 4, reps: '10-12', weight: true, tip: '', t: 1684 },
      { name: '對握下拉', part: 'back', sets: 4, reps: '8-12', weight: true, tip: '能做 12 到 8 下的重量範圍都可以', t: 3117 },
      { name: '開肘拉', part: 'shoulders', sets: 4, reps: '12-15', weight: true, tip: '手肘打開、在水平面往後拉，練後束和上背；器械可以多選', t: 3723 },
      { name: '鋼線彎舉', part: 'biceps', sets: 4, reps: '10-12', weight: true, tip: '注意大臂保持垂直', t: 4358 }
    ]
  },
  {
    id: 'tan-3split-3', title: '三分化第三天：腿（股四頭 + 膕繩肌）', url: v('7629718942222650670'), date: '2026-04-17',
    locations: ['gym'], groups: ['legs'],
    note: '凱聖王 × 譚成義三分化。組數照影片字幕；重量都選「不到力竭」的重量。開頭有譚成義的腿部熱身講解。',
    exercises: [
      { name: '單腿硬拉', part: 'legs', sets: 3, reps: '12', weight: true, tip: '不到力竭選重量', t: 599 },
      { name: '單腿保加利亞蹲', part: 'legs', sets: 3, reps: '10', weight: true, tip: '不到力竭選重量', t: 1393 },
      { name: '高腳杯深蹲', part: 'legs', sets: 3, reps: '15', weight: true, tip: '不到力竭選重量', t: 2061 },
      { name: '羅馬尼亞硬舉', part: 'legs', sets: 3, reps: '15', weight: true, tip: '槓鈴版；不到力竭選重量', t: 2538 },
      { name: '山羊挺身', part: 'legs', sets: 3, reps: '8-12', weight: true, tip: '依自己的力量決定要不要加重', t: 3080 }
    ]
  },
  {
    id: 'tan-pt-back', title: '私教系列・背', url: v('7647176615788911793'), date: '2026-06-03',
    locations: ['gym'], groups: ['back_bi'],
    note: '練背關鍵在脊柱和肩胛穩定，以背闊為主。先用健腹輪、泡沫軸、跪姿肘屈伸熱身。影片沒寫組數，這裡用 3-4 組。',
    exercises: [
      { name: '直臂下壓', part: 'back', sets: 3, reps: '12-15', weight: true, tip: '手腕扣緊、肩胛穩定，往下發力，配合呼吸', t: 494 },
      { name: '單手繩索划船', part: 'back', sets: 4, reps: '10-12', weight: true, tip: '腿蹬住、手肘撐住，軀幹穩定，對抗側屈', t: 688 },
      { name: '對握高位下拉', part: 'back', sets: 4, reps: '10-12', weight: true, tip: '身體中立位微微前傾，不要後仰，控制肩胛', t: 1132 },
      { name: '坐姿划船', part: 'back', sets: 4, reps: '10-12', weight: true, tip: '繩索版；腳蹬住、背預先發力，注意肩胛位置', t: 1753 },
      { name: '繩索曲臂下壓', part: 'back', sets: 3, reps: '12-15', weight: true, tip: '手偏外旋、手腕穩定，對抗側屈', t: 2101 },
      { name: '龍門架反向飛鳥', part: 'shoulders', sets: 3, reps: '12-15', weight: true, tip: '脊柱穩定、肩胛後縮，不要頂肋', t: 2559 }
    ]
  },
  {
    id: 'tan-pt-chest', title: '私教系列・胸', url: v('7650309381392785073'), date: '2026-06-12',
    locations: ['gym'], groups: ['chest_tri'],
    note: '熱身：泡沫軸、Y 字伸展、Y 字推舉、彈力帶繞肩。重點是挺胸、開肋收緊、保持胸腔擴張、軀幹穩定。影片沒寫組數，這裡用 3-4 組。',
    exercises: [
      { name: '雙槓撐體（胸部版）', part: 'chest', sets: 4, reps: '8-12', weight: false, tip: '挺胸、屈髖、重心前傾，保持持續張力', t: 433 },
      { name: '器械平推', part: 'chest', sets: 4, reps: '8-12', weight: true, tip: '半握；開肋、收緊，保持胸腔擴張', t: 884 },
      { name: '上斜推胸', part: 'chest', sets: 4, reps: '8-12', weight: true, tip: '手肘抬高，避免變成下胸發力', t: 1285 },
      { name: '繩索夾上胸', part: 'chest', sets: 3, reps: '12-15', weight: true, tip: '腰貼住、收肋，不要放太開，保持收緊', t: 1710 }
    ]
  },
  {
    id: 'tan-pt-shoulder', title: '私教系列・肩', url: v('7651943506576442225'), date: '2026-06-16',
    locations: ['gym'], groups: ['shoulders'],
    note: '熱身：彈力帶從正前方繞到正後方，一組 20 次，再做 TRX 激活。先練後束，再推肩、中束、前束。影片沒寫組數，這裡用 3-4 組。',
    exercises: [
      { name: '俯身啞鈴肩伸', part: 'shoulders', sets: 3, reps: '12-15', weight: true, tip: '練後束', t: 409 },
      { name: '反向飛鳥', part: 'shoulders', sets: 3, reps: '12-15', weight: true, tip: '坐姿；練後束', t: 841 },
      { name: '啞鈴肩推', part: 'shoulders', sets: 4, reps: '8-12', weight: true, tip: '肩胛穩定、幅度完整、配合呼吸', t: 1292 },
      { name: '側平舉', part: 'shoulders', sets: 4, reps: '12-15', weight: true, tip: '練中束；動作流暢、胸腔充盈、姿勢穩定', t: 1878 },
      { name: '前平舉', part: 'shoulders', sets: 3, reps: '12-15', weight: true, tip: '練前束', t: 2072 }
    ]
  },
  {
    id: 'tan-pt-legs', title: '私教系列・腿', url: v('7655982129109198321'), date: '2026-06-27',
    locations: ['gym'], groups: ['legs'],
    note: '腿部建議頻率高、強度低，避免過度訓練影響恢復。熱身：青蛙式、內旋、抬腿、世界上最偉大的伸展。影片沒寫組數，這裡用 3 組。',
    exercises: [
      { name: '站姿提踵', part: 'legs', sets: 3, reps: '15-20', weight: true, tip: '腳趾抓地，前腳掌不要翹起', t: 691 },
      { name: '器械內收', part: 'legs', sets: 3, reps: '12-15', weight: true, tip: '注意重量、幅度和細節', t: 1046 },
      { name: '保加利亞分腿蹲（啞鈴）', part: 'legs', sets: 3, reps: '10-12', weight: true, tip: '注意重心和行程，挑戰更難的位置', t: 1473 },
      { name: '啞鈴硬拉', part: 'legs', sets: 3, reps: '10-12', weight: true, tip: '注意腳的位置、膝蓋方向和幅度，量力而行', t: 2082 },
      { name: '屈髖抬腿', part: 'legs', sets: 3, reps: '12-15', weight: false, tip: '軀幹穩定、核心收緊', t: 2638 },
      { name: '俯身腿彎舉', part: 'legs', sets: 3, reps: '10-12', weight: true, tip: '勾腳、腳尖微內八，收緊核心', t: 2909 }
    ]
  },
  {
    id: 'tan-pt-arms', title: '私教系列・手臂', url: v('7648931004442846193'), date: '2026-06-08',
    locations: ['gym'], groups: ['chest_tri', 'back_bi'],
    note: '三頭和二頭各用不同肩關節角度（肩伸位、肩屈位、內旋位）練。可當手臂一練或二練。影片沒寫組數，這裡用 3 組。',
    exercises: [
      { name: '單手繩索三頭伸展', part: 'triceps', sets: 3, reps: '12-15', weight: true, tip: '', t: 133 },
      { name: '仰臥槓鈴三頭伸展', part: 'triceps', sets: 3, reps: '10-12', weight: true, tip: '', t: 565 },
      { name: '單手繩索肩屈位三頭伸展', part: 'triceps', sets: 3, reps: '12-15', weight: true, tip: '手臂舉到頭上方（肩屈位）做', t: 1677 },
      { name: '坐姿繩索彎舉', part: 'biceps', sets: 3, reps: '10-12', weight: true, tip: '', t: 861 },
      { name: '仰臥啞鈴肩伸位彎舉', part: 'biceps', sets: 3, reps: '10-12', weight: true, tip: '手臂在身體後方（肩伸位）做，拉長二頭', t: 1293 },
      { name: '坐姿繩索內旋位彎舉', part: 'biceps', sets: 3, reps: '12-15', weight: true, tip: '', t: 2100 }
    ]
  },
  {
    id: 'tan-pt-core', title: '私教系列・腹肌', url: v('7657365167379023973'), date: '2026-07-01',
    locations: ['gym'], groups: ['core'],
    note: '健腹輪是他最推薦的腹部動作。影片沒寫組數，這裡用 3 組。',
    exercises: [
      { name: '懸垂舉腿', part: 'core', sets: 3, reps: '10-15', weight: false, tip: '注意進階 / 退階，和吐氣、吸氣的時機', t: 70 },
      { name: '捲腹', part: 'core', sets: 3, reps: '15-20', weight: false, tip: '仰臥；改在下斜凳上做更難', t: 413 },
      { name: '健腹輪', part: 'core', sets: 3, reps: '8-12', weight: false, tip: '', t: 728 }
    ]
  }
];
