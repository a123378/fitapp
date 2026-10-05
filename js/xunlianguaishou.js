// 訓練怪獸（抖音 XUNLIANGUAISHOU_2）：補劑品牌經營的「怪獸課堂」，請 IFBB PRO（陳康、趙師、鬼背小黑、劉孟易、譚成義）講動作細節。
// 多是 1-2 分鐘的單一動作講解，所以主要用在 coaching.js 的動作提示；完整菜單只有一份。

export const XLGS_PROFILE = 'https://www.douyin.com/user/MS4wLjABAAAAxncwnqGNKa9iZbHkC9vzsVxd0aAxs2J5nvKZDsB7UoNYQnB-nBKCSzZAGuvHCMT6';
const v = (id) => `https://www.douyin.com/video/${id}`;

export const XLGS_MENUS = [
  {
    id: 'xlgs-shoulder-superset', title: '鬼背小黑・肩部超級組', url: v('7671138732816338211'), date: '2026-08-07',
    locations: ['gym', 'home'], groups: ['shoulders'],
    note: '四個動作連做為一輪（超級組），全方位多角度刺激三角肌，注意不要讓斜方肌過度參與。影片沒寫組數，這裡用 3-4 輪、每個動作 10-12 下。在家只有啞鈴的話，最後一個後束動作用啞鈴俯身開肘划船。',
    exercises: [
      { name: '啞鈴肩推', part: 'shoulders', sets: 4, reps: '10-12', weight: true, tip: '挺胸、背靠緊，手肘微彎，不要放太低' },
      { name: '側平舉', part: 'shoulders', sets: 4, reps: '10-12', weight: true, tip: '挺胸；中、中後、中前三個角度各做一次' },
      { name: '俯身啞鈴飛鳥', part: 'shoulders', sets: 4, reps: '10-12', weight: true, tip: '俯身、含胸，針對中後束；做不到就換退階動作' },
      { name: '後束拉', part: 'shoulders', sets: 4, reps: '10-12', weight: true, tip: '含胸、大臂開肘；對握或提拉，三選一' }
    ]
  }
];
