// 金士程（抖音 52109986363，職業健美運動員）訓練日記影片整理出的菜單。
// 他的影片多是訓練 vlog：有字幕寫出計畫的照抄組數；沒寫的在 note 註明，組數用健身房常見的 3-4 組 × 8-12 下。
// part：chest / triceps / back / biceps / shoulders / legs / core

export const JIN_PROFILE = 'https://www.douyin.com/user/MS4wLjABAAAA9tXy09iTw4cp8GNBT0HCwZ_-rbHOrlQlxhw5FZKHrSw';
const v = (id) => `https://www.douyin.com/video/${id}`;

export const JIN_MENUS = [
  {
    id: 'jin-back-plan', title: '金士程背部訓練計畫', url: v('7673500665779473705'), date: '2026-08-13',
    locations: ['gym'], groups: ['back_bi'],
    note: '影片字幕列出的正式計畫（組數照抄）。次數影片沒寫，用 8-12 下；高位下拉當暖身，不做到力竭。',
    exercises: [
      { name: '滑輪下拉', part: 'back', sets: 3, reps: '10-12', weight: true, tip: '當第一個動作暖身，不做力竭；控制脖子不要往前伸' },
      { name: '引體向上', part: 'back', sets: 4, reps: '8-12', weight: false, tip: '可以負重；做不到就用輔助' },
      { name: '直臂下壓（抱拉）', part: 'back', sets: 4, reps: '10-12', weight: true, tip: '手臂微彎，像抱東西一樣往下往身體收' },
      { name: '海豹划船', part: 'back', sets: 4, reps: '8-12', weight: true, tip: '胸口貼在板凳上划，避免借力' },
      { name: '器械下拉', part: 'back', sets: 4, reps: '8-12', weight: true, tip: '' }
    ]
  },
  {
    id: 'jin-legs-best', title: '16 年來最好的一次練腿', url: v('7671970431372447012'), date: '2026-08-09',
    locations: ['gym'], groups: ['legs'],
    note: '影片只示範動作順序，沒寫組數，這裡用 4 組 × 8-12 下。先用腿屈伸把膝蓋和股四頭熱開。',
    exercises: [
      { name: '腿伸展', part: 'legs', sets: 4, reps: '12-15', weight: true, tip: '當第一個動作預熱膝蓋' },
      { name: '哈克深蹲', part: 'legs', sets: 4, reps: '8-12', weight: true, tip: '' },
      { name: '腿推', part: 'legs', sets: 4, reps: '8-12', weight: true, tip: '影片中叫「倒蹬」' },
      { name: '腿彎舉', part: 'legs', sets: 4, reps: '10-12', weight: true, tip: '坐姿腿彎舉，練大腿後側' }
    ]
  },
  {
    id: 'jin-legs-squat', title: '深蹲 + 腿後 + 小腿', url: v('7657869271858433286'), date: '2026-07-02',
    locations: ['gym'], groups: ['legs'],
    note: '狀態不好時他會降低強度、換動作。組數影片沒寫，用 4 組。',
    exercises: [
      { name: '槓鈴深蹲', part: 'legs', sets: 4, reps: '6-10', weight: true, tip: '重量依當天狀態調整，腿軟就別硬上' },
      { name: '俯身腿彎舉', part: 'legs', sets: 4, reps: '10-12', weight: true, tip: '前一天練過硬拉、腿後很累時可以改做這個' },
      { name: '站姿提踵', part: 'legs', sets: 4, reps: '12-15', weight: true, tip: '' }
    ]
  },
  {
    id: 'jin-chest', title: '臥推 + 上斜臥推練胸', url: v('7631903927029517578'), date: '2026-04-23',
    locations: ['gym'], groups: ['chest_tri'],
    note: '先充分熱身再上重量，重點是關節安全和選對重量。組數影片沒寫，用 4 組。',
    exercises: [
      { name: '槓鈴臥推', part: 'chest', sets: 4, reps: '6-10', weight: true, tip: '熱身組做足再上正式重量' },
      { name: '上斜槓鈴臥推', part: 'chest', sets: 4, reps: '8-12', weight: true, tip: '' }
    ]
  },
  {
    id: 'jin-shoulders', title: '金士程練肩', url: v('7674558376071679266'), date: '2026-08-16',
    locations: ['gym'], groups: ['shoulders'],
    note: '兩台推肩機 + 啞鈴推舉。組數影片沒寫，用 4 組。',
    exercises: [
      { name: '器械肩推', part: 'shoulders', sets: 4, reps: '8-12', weight: true, tip: '有保護桿的機台可以放心推到力竭' },
      { name: '啞鈴肩推', part: 'shoulders', sets: 4, reps: '8-12', weight: true, tip: '' }
    ]
  },
  {
    id: 'jin-arms', title: '金士程練手臂', url: v('7671234535643696394'), date: '2026-08-07',
    locations: ['gym'], groups: ['back_bi', 'chest_tri'],
    note: '重點是動作品質和左右平衡：弱的那邊先做、兩邊做一樣多下。組數影片沒寫，用 3-4 組。',
    exercises: [
      { name: '槓鈴彎舉', part: 'biceps', sets: 4, reps: '8-12', weight: true, tip: '' },
      { name: '啞鈴集中彎舉', part: 'biceps', sets: 3, reps: '10-12', weight: true, tip: '坐姿、手肘靠大腿內側；記住左右各做幾下，兩邊一樣' },
      { name: '仰臥繩索三頭伸展', part: 'triceps', sets: 3, reps: '10-12', weight: true, tip: '' },
      { name: '過頭三頭伸展', part: 'triceps', sets: 3, reps: '10-12', weight: true, tip: '坐姿雙手握一顆啞鈴，往頭後放下再推直' }
    ]
  }
];
