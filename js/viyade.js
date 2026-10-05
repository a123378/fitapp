// 維亞德（抖音 1759818827）影片整理出的現成菜單。
// 重訓菜單以這裡為主：選好地點 + 肌群後，列出符合的影片菜單讓你挑，每個動作附上示範影片連結。
// 之後有新影片，照同樣格式往 VIYADE_MENUS 加一筆即可。
// part：chest 胸 / triceps 三頭 / back 背 / biceps 二頭 / shoulders 肩 / legs 腿 / core 核心
// weight：true = 有外加重量（會估 1RM）；reps 照影片建議，影片沒講就用常見建議並在 note 註明。

export const VIYADE_PROFILE = 'https://www.douyin.com/user/MS4wLjABAAAAfasLItGfE2JlNCp1I68JVtv4M5P0IMKfcxqt7bCgO44';
const v = (id) => `https://www.douyin.com/video/${id}`;

export const PART_LABELS = { chest: '胸', triceps: '三頭', back: '背', biceps: '二頭', shoulders: '肩', legs: '腿', core: '核心' };

export const VIYADE_MENUS = [
  {
    id: 'home-fullbody', title: '居家無工具練全身', url: v('7685220717662721363'), date: '2026-09-14',
    locations: ['home'], groups: ['chest_tri', 'back_bi', 'shoulders', 'core'],
    note: '不能去健身房、沒時間時的全身菜單。背部那一組影片中用了啞鈴，沒有可用裝水的背包代替。',
    exercises: [
      { name: '伏地挺身', part: 'chest', sets: 2, reps: '10', weight: false, tip: '太難可以跪姿，或手撐在高一點的地方（上斜）' },
      { name: '派克伏地挺身', part: 'shoulders', sets: 2, reps: '10', weight: false, tip: '屁股抬高成倒 V，頭往地板方向下' },
      { name: 'Sphinx 伏地挺身（前臂撐起）', part: 'triceps', sets: 2, reps: '10', weight: false, tip: '從前臂貼地推到手掌撐直，集中三頭；進階可單手輔助' },
      { name: 'T 恤彎舉（躺姿腳勾）', part: 'biceps', sets: 3, reps: '10', weight: false, tip: '躺著把 T 恤套在腳上，用手往上拉、腳給阻力' },
      { name: '仰臥肘撐挺身', part: 'back', sets: 3, reps: '10', weight: false, tip: '仰躺用手肘往地板壓，把上背撐離地面' },
      { name: '單臂啞鈴划船', part: 'back', sets: 2, reps: '10', weight: true, tip: '身體前傾、背打直，往腰的方向拉' },
      { name: '上腹捲腹', part: 'core', sets: 1, reps: '10', weight: false, tip: '' },
      { name: '下腹舉腿', part: 'core', sets: 1, reps: '10', weight: false, tip: '' }
    ]
  },
  {
    id: 'home-db-upper', title: '啞鈴上半身訓練', url: v('7684848141230042858'), date: '2026-09-13',
    locations: ['home', 'gym'], groups: ['chest_tri', 'back_bi', 'shoulders'],
    note: '只需要一對啞鈴，每個動作 12 下 × 3 組。',
    exercises: [
      { name: '啞鈴肩推', part: 'shoulders', sets: 3, reps: '12', weight: true, tip: '手肘位置要對，不要往後打太開' },
      { name: '啞鈴握把伏地挺身', part: 'chest', sets: 3, reps: '12', weight: false, tip: '握啞鈴做伏地挺身，幅度可以更深，練胸和前三角' },
      { name: '單臂啞鈴划船（手肘外展）', part: 'back', sets: 3, reps: '12', weight: true, tip: '手肘往外往後拉，單獨練背闊肌，不要變成二頭發力' },
      { name: '啞鈴彎舉', part: 'biceps', sets: 3, reps: '12', weight: true, tip: '啞鈴放在身體前面，手肘固定' },
      { name: '俯身啞鈴三頭後伸', part: 'triceps', sets: 3, reps: '12', weight: true, tip: '身體往前傾，上臂貼身，只動前臂往後伸直' }
    ]
  },
  {
    id: 'home-quick', title: '居家訓練快速版', url: v('7683362172001828089'), date: '2026-09-09',
    locations: ['home'], groups: ['chest_tri', 'shoulders', 'core'],
    note: '影片是動作示範剪輯，沒標次數，這裡用 10-12 下 × 3 組。',
    exercises: [
      { name: '伏地挺身', part: 'chest', sets: 3, reps: '10-12', weight: false, tip: '' },
      { name: '派克伏地挺身', part: 'shoulders', sets: 3, reps: '10-12', weight: false, tip: '從倒 V 往前下推，練肩和三頭' },
      { name: '仰臥舉腿', part: 'core', sets: 3, reps: '10-12', weight: false, tip: '練下腹，放下時慢一點' },
      { name: '坐姿收腿', part: 'core', sets: 3, reps: '10-12', weight: false, tip: '坐姿手撐後方，膝蓋收向胸口再伸直' }
    ]
  },
  {
    id: 'home-pushups', title: '五種伏地挺身練胸', url: v('7682618607347750521'), date: '2026-09-07',
    locations: ['home'], groups: ['chest_tri'],
    note: '五個動作連做為一組，共 3 組；太難每個改做 8 下。',
    exercises: [
      { name: '伏地挺身', part: 'chest', sets: 3, reps: '10', weight: false, tip: '' },
      { name: '窄距伏地挺身', part: 'triceps', sets: 3, reps: '10', weight: false, tip: '手距比肩窄，多用到三頭' },
      { name: '寬距伏地挺身', part: 'chest', sets: 3, reps: '10', weight: false, tip: '手距比肩寬，集中胸' },
      { name: '下斜伏地挺身（腳墊高）', part: 'chest', sets: 3, reps: '10', weight: false, tip: '腳放在高處，練上胸' },
      { name: '上斜伏地挺身（手撐高處）', part: 'chest', sets: 3, reps: '10', weight: false, tip: '手撐椅子或花台，練下胸、比較簡單' }
    ]
  },
  {
    id: 'core-3min', title: '三分鐘腹肌跟練', url: v('7685969638044556470'), date: '2026-09-16',
    locations: ['home', 'gym'], groups: ['core'],
    note: '跟著影片做，每個動作 30 秒不休息，六個動作共 3 分鐘；體力夠可以做 2-3 輪。',
    exercises: [
      { name: 'V 字起身', part: 'core', sets: 1, reps: '30 秒', weight: false, tip: '' },
      { name: '登山者', part: 'core', sets: 1, reps: '30 秒', weight: false, tip: '' },
      { name: '捲腹', part: 'core', sets: 1, reps: '30 秒', weight: false, tip: '' },
      { name: '交替觸腳跟', part: 'core', sets: 1, reps: '30 秒', weight: false, tip: '練側腹' },
      { name: '反向捲腹', part: 'core', sets: 1, reps: '30 秒', weight: false, tip: '用下腹把屁股捲離地面' },
      { name: '俄羅斯轉體', part: 'core', sets: 1, reps: '30 秒', weight: false, tip: '' }
    ]
  },
  {
    id: 'gym-back3', title: '練背三個動作', url: v('7678543508135593457'), date: '2026-08-27',
    locations: ['gym'], groups: ['back_bi'],
    note: '下拉練寬、划船練厚、直臂下壓集中背闊肌。影片沒標次數，這裡用 10-12 下 × 3-4 組。',
    exercises: [
      { name: '滑輪下拉', part: 'back', sets: 4, reps: '10-12', weight: true, tip: '拇指不要扣、肩胛骨先內收、手肘往內收，拉到鎖骨', video: v('7680028756610601087') },
      { name: '坐姿划船', part: 'back', sets: 4, reps: '10-12', weight: true, tip: '拉到腹部，不是拉到胸口；可換 45 度彎把手變化握法', video: v('7677789033766790390') },
      { name: '直臂下壓', part: 'back', sets: 3, reps: '12', weight: true, tip: '手臂打直往下壓，感覺背闊肌發力' }
    ]
  },
  {
    id: 'gym-ez-arms', title: 'E-Z 槓鈴練手臂', url: v('7681504074340455615'), date: '2026-09-04',
    locations: ['gym'], groups: ['back_bi'],
    note: '同一支 E-Z 槓換三種握法，影片沒標次數，這裡用 10-12 下 × 3 組。',
    exercises: [
      { name: 'E-Z 槓彎舉（窄握）', part: 'biceps', sets: 3, reps: '10-12', weight: true, tip: '窄握集中二頭長頭' },
      { name: 'E-Z 槓彎舉（寬握）', part: 'biceps', sets: 3, reps: '10-12', weight: true, tip: '寬握集中二頭短頭' },
      { name: 'E-Z 槓反握彎舉', part: 'biceps', sets: 3, reps: '10-12', weight: true, tip: '掌心朝下，練肱橈肌和前臂' }
    ]
  },
  {
    id: 'gym-arm-fix', title: '手臂動作糾正', url: v('7680760518521279721'), date: '2026-09-02',
    locations: ['gym'], groups: ['chest_tri', 'back_bi'],
    note: '四個常做錯的手臂動作，照正確姿勢做。次數用 10-12 下 × 3 組。',
    exercises: [
      { name: '過頭三頭伸展', part: 'triceps', sets: 3, reps: '10-12', weight: true, tip: '繩索往斜上方打開，不是直直往上推' },
      { name: '牧師椅彎舉', part: 'biceps', sets: 3, reps: '10-12', weight: true, tip: '上臂整個貼在墊子上，身體不要往後倒' },
      { name: '斜板彎舉', part: 'biceps', sets: 3, reps: '10-12', weight: true, tip: '背貼住椅背、腳往前踩，不要身體前傾借力' },
      { name: '啞鈴彎舉', part: 'biceps', sets: 3, reps: '10-12', weight: true, tip: '手肘固定在身體旁，不要往前甩' }
    ]
  },
  {
    id: 'gym-chest-dip', title: '胸部版雙槓撐體', url: v('7679282767384956073'), date: '2026-08-29',
    locations: ['gym'], groups: ['chest_tri'],
    note: '一般雙槓撐體累了會往後仰變成三頭發力；腿放前面、重心往前，胸會一直出力（類似飛鳥）。',
    exercises: [
      { name: '雙槓撐體（胸部版）', part: 'chest', sets: 3, reps: '8-12', weight: false, tip: '腿放到身體前面、重心往前，全程胸部發力' },
      { name: '雙槓撐體', part: 'triceps', sets: 3, reps: '8-12', weight: false, tip: '身體直立，三頭為主' }
    ]
  },
  {
    id: 'gym-db-press-fix', title: '啞鈴肩推怎麼做才對', url: v('7677049928493107897'), date: '2026-08-23',
    locations: ['gym'], groups: ['shoulders'],
    note: '椅背不要調太斜（那是上斜臥推），重量不要太重、做完整行程。次數用 8-12 下 × 4 組。',
    exercises: [
      { name: '啞鈴肩推', part: 'shoulders', sets: 4, reps: '8-12', weight: true, tip: '椅背接近直立、手肘在身體稍前方，推到頂再完整放下' }
    ]
  },
  {
    id: 'db-shoulder-arms', title: '啞鈴這些動作練什麼', url: v('7675931802577924273'), date: '2026-08-20',
    locations: ['gym', 'home'], groups: ['shoulders', 'back_bi'],
    note: '一對啞鈴站著就能練的動作清單，影片沒標次數，這裡用 12 下 × 3 組。',
    exercises: [
      { name: '啞鈴肩推', part: 'shoulders', sets: 3, reps: '12', weight: true, tip: '練整體肩膀' },
      { name: '側平舉', part: 'shoulders', sets: 3, reps: '12', weight: true, tip: '練中束' },
      { name: '啞鈴過頭前平舉', part: 'shoulders', sets: 3, reps: '12', weight: true, tip: '往前上方舉過頭，練前束' },
      { name: '啞鈴肩外旋', part: 'shoulders', sets: 3, reps: '12', weight: true, tip: '上臂平舉 90 度，前臂往上轉，強化旋轉肌袖' },
      { name: '俯身反向飛鳥', part: 'shoulders', sets: 3, reps: '12', weight: true, tip: '身體前傾，往兩側打開，練後束' },
      { name: '啞鈴彎舉', part: 'biceps', sets: 3, reps: '12', weight: true, tip: '' }
    ]
  }
];

export function viyadeMenusFor(location, group) {
  return VIYADE_MENUS.filter((m) => m.locations.includes(location) && m.groups.includes(group));
}
