// RRRoy（抖音 1032747842）合集「我付錢，你上課！」：每集付費請一位教練帶練一個部位。
// 動作順序與重點取自影片的「章節要點」；影片沒寫組數，這裡用 3-4 組 × 8-12 下，並在 note 註明。
// part：chest / triceps / back / biceps / shoulders / legs / core

export const RRROY_PROFILE = 'https://www.douyin.com/user/MS4wLjABAAAA0it0fUEigDf0UzOBauEckW89yKPUIpckJULbkz-WVeg';
const v = (id) => `https://www.douyin.com/video/${id}`;
const NOTE = '影片沒寫組數，這裡用 3-4 組 × 8-12 下。';

export const RRROY_MENUS = [
  {
    id: 'roy-45-shoulder', title: '第45集・張努練肩', url: v('7683931471555382543'), date: '2026-09-10',
    locations: ['gym'], groups: ['shoulders'],
    note: '教練：張努。先熱身拉伸松解，再練前束、後束、中束。' + NOTE,
    exercises: [
      { name: '反手史密斯推肩', part: 'shoulders', sets: 4, reps: '8-12', weight: true, tip: '反手握，還能有效刺激前鋸肌', t: 205 },
      { name: '高位面拉', part: 'shoulders', sets: 3, reps: '12-15', weight: true, tip: '練後束', t: 399 },
      { name: '垂式側平舉', part: 'shoulders', sets: 3, reps: '12-15', weight: true, tip: '練中束', t: 575 },
      { name: 'Y舉', part: 'shoulders', sets: 3, reps: '12-15', weight: true, tip: '手臂角度往斜下方', t: 724 }
    ]
  },
  {
    id: 'roy-44-chest', title: '第44集・溫凱練胸（固定器械）', url: v('7679436187165035817'), date: '2026-08-29',
    locations: ['gym'], groups: ['chest_tri'],
    note: '教練：溫凱。以固定器械為主：力線更準、收縮更到位，容易上手。' + NOTE,
    exercises: [
      { name: '史密斯平板臥推', part: 'chest', sets: 4, reps: '8-12', weight: true, tip: '', t: 58 },
      { name: '史密斯上斜臥推', part: 'chest', sets: 4, reps: '8-12', weight: true, tip: '', t: 192 },
      { name: '器械平推', part: 'chest', sets: 3, reps: '10-12', weight: true, tip: '', t: 309 },
      { name: '器械下胸推', part: 'chest', sets: 3, reps: '10-12', weight: true, tip: '', t: 424 },
      { name: '繩索夾胸', part: 'chest', sets: 3, reps: '12-15', weight: true, tip: '依要練的位置調整繩索高度', t: 492 }
    ]
  },
  {
    id: 'roy-43-back', title: '第43集・潇哥練背闊', url: v('7660908141084871976'), date: '2026-07-10',
    locations: ['gym'], groups: ['back_bi'],
    note: '教練：潇。這天以背闊肌為主，影片開頭有講為什麼選這些動作。' + NOTE,
    exercises: [
      { name: '反手高位下拉', part: 'back', sets: 4, reps: '8-12', weight: true, tip: '', t: 60 },
      { name: '對握輔助引體向上', part: 'back', sets: 4, reps: '8-12', weight: true, tip: '', t: 291 },
      { name: '繩索單側下拉', part: 'back', sets: 3, reps: '10-12', weight: true, tip: '', t: 409 },
      { name: '直臂下壓', part: 'back', sets: 3, reps: '12-15', weight: true, tip: '', t: 637 }
    ]
  },
  {
    id: 'roy-42-shoulder', title: '第42集・大鵬練肩中後束', url: v('7649850513902619913'), date: '2026-06-11',
    locations: ['gym'], groups: ['shoulders'],
    note: '教練：大鵬（肌肉飼養員）。先做肩部體態調整和後束激活，再練中後束。' + NOTE,
    exercises: [
      { name: '後束激活', part: 'shoulders', sets: 2, reps: '15-20', weight: true, tip: '幫助激活後束、提高後束控制能力', t: 194 },
      { name: '蝴蝶機反向飛鳥', part: 'shoulders', sets: 4, reps: '12-15', weight: true, tip: '', t: 343 },
      { name: '啞鈴坐姿側平舉', part: 'shoulders', sets: 4, reps: '12-15', weight: true, tip: '', t: 499 },
      { name: '單邊器械側平舉', part: 'shoulders', sets: 3, reps: '12-15', weight: true, tip: '', t: 644 }
    ]
  },
  {
    id: 'roy-41-chest', title: '第41集・小曾練胸', url: v('7640892819325930761'), date: '2026-05-18',
    locations: ['gym'], groups: ['chest_tri'],
    note: '教練：小曾（糖原儲備者）。細節一調整，發力感受明顯不同。' + NOTE,
    exercises: [
      { name: '輔助雙槓臂屈伸', part: 'chest', sets: 4, reps: '8-12', weight: true, tip: '', t: 81 },
      { name: '啞鈴臥推', part: 'chest', sets: 4, reps: '8-12', weight: true, tip: '', t: 296 },
      { name: '器械坐姿上斜推胸', part: 'chest', sets: 3, reps: '10-12', weight: true, tip: '', t: 478 },
      { name: '蝴蝶機夾胸', part: 'chest', sets: 3, reps: '12-15', weight: true, tip: '', t: 551 }
    ]
  },
  {
    id: 'roy-40-back', title: '第40集・溫凱練背（固定器械）', url: v('7629831051065576745'), date: '2026-04-18',
    locations: ['gym'], groups: ['back_bi'],
    note: '教練：溫凱。全部用固定器械，每個動作針對背的不同區域。' + NOTE,
    exercises: [
      { name: '單手器械高位下拉', part: 'back', sets: 4, reps: '8-12', weight: true, tip: '「全肩伸」的動作對背闊刺激更到位', t: 85 },
      { name: '坐姿繩索反手划船', part: 'back', sets: 3, reps: '10-12', weight: true, tip: '', t: 310 },
      { name: '器械單臂划船', part: 'back', sets: 3, reps: '10-12', weight: true, tip: '針對大圓肌和背闊上半段', t: 468 },
      { name: '器械俯身划船', part: 'back', sets: 3, reps: '10-12', weight: true, tip: '肩胛主動後縮，針對中下斜方', t: 555 }
    ]
  },
  {
    id: 'roy-39-arms', title: '第39集・董永林新手練手臂', url: v('7623476647462784307'), date: '2026-04-01',
    locations: ['gym'], groups: ['chest_tri', 'back_bi'],
    note: '教練：董永林。很基礎、適合剛開始健身的新手。' + NOTE,
    exercises: [
      { name: '繩索三頭下壓', part: 'triceps', sets: 4, reps: '10-12', weight: true, tip: '', t: 53 },
      { name: '啞鈴頸後臂屈伸', part: 'triceps', sets: 3, reps: '10-12', weight: true, tip: '', t: 222 },
      { name: '槓鈴彎舉', part: 'biceps', sets: 4, reps: '8-12', weight: true, tip: '', t: 355 },
      { name: '啞鈴坐姿彎舉', part: 'biceps', sets: 3, reps: '10-12', weight: true, tip: '', t: 456 },
      { name: '繩索彎舉', part: 'biceps', sets: 3, reps: '12-15', weight: true, tip: '針對肱肌', t: 520 }
    ]
  },
  {
    id: 'roy-38-shoulder', title: '第38集・大鵬練肩', url: v('7617876646846090515'), date: '2026-03-16',
    locations: ['gym'], groups: ['shoulders'],
    note: '教練：大鵬（肌肉飼養員）。重點：不要為了把重量推上去而推，要順著肌纖維方向發力收縮。' + NOTE,
    exercises: [
      { name: '啞鈴肩推', part: 'shoulders', sets: 4, reps: '8-12', weight: true, tip: '坐姿；想著順肌纖維方向收縮，不是硬把啞鈴推上去', t: 86 },
      { name: '器械肩推', part: 'shoulders', sets: 4, reps: '8-12', weight: true, tip: '手肘可以打開一點，開肘越大中束參與越多（關節靈活度要夠）', t: 245 },
      { name: '繩索側平舉', part: 'shoulders', sets: 3, reps: '12-15', weight: true, tip: '先回中立位、人和繩索拉開距離、預先張力、在肩胛面舉不要往後飛、下放不落底', t: 367 },
      { name: '側平舉', part: 'shoulders', sets: 3, reps: '12-15', weight: true, tip: '', t: 597 }
    ]
  },
  {
    id: 'roy-37-back', title: '第37集・Clark梁練下背', url: v('7603948345136057626'), date: '2026-02-07',
    locations: ['gym'], groups: ['back_bi'],
    note: '教練：Clark梁。前兩個動作重點練下背，後兩個練上背。' + NOTE,
    exercises: [
      { name: '引體向上', part: 'back', sets: 4, reps: '6-10', weight: false, tip: '力線要穩、拉得夠深才刺激到下背；拉不動用輔助', t: 70 },
      { name: '對握划船', part: 'back', sets: 4, reps: '8-12', weight: true, tip: '座位調高一點能拉到更多下背；預先吃住張力', t: 241 },
      { name: '高位下拉', part: 'back', sets: 3, reps: '10-12', weight: true, tip: '以上背為主，不用拉滿，主要練大圓肌', t: 448 },
      { name: '上斜板俯身划船', part: 'back', sets: 3, reps: '10-12', weight: true, tip: '', t: 502 }
    ]
  }
];
