// 動作清單：Gemini 只能從這裡挑動作，確保名稱一致、之後統計不會亂。
// 你可以自由增刪，名稱改了要記得「表現」頁追蹤的三大項在 config.js 的 BIG_THREE 也要同步。
// weight: true 代表這個動作有外加重量（可估算 1RM）；false 代表徒手，只記次數。

export const EXERCISES = {
  home: {
    chest: [
      { name: "伏地挺身", weight: false },
      { name: "下斜伏地挺身（腳墊高）", weight: false },
      { name: "寬距伏地挺身", weight: false },
      { name: "擊掌伏地挺身", weight: false, tags: ["power"] },
      { name: "慢速離心伏地挺身", weight: false },
      { name: "偽俄式伏地挺身", weight: false }
    ],
    triceps: [
      { name: "鑽石伏地挺身", weight: false },
      { name: "椅子撐體", weight: false },
      { name: "徒手三頭伸展（靠桌）", weight: false },
      { name: "窄距伏地挺身", weight: false }
    ],
    back: [
      { name: "引體向上", weight: false },
      { name: "反手引體向上", weight: false },
      { name: "澳式划船（桌下划船）", weight: false },
      { name: "毛巾門框划船", weight: false },
      { name: "超人式", weight: false },
      { name: "俯臥 Y-T-W", weight: false }
    ],
    biceps: [
      { name: "反手引體向上（窄握）", weight: false },
      { name: "毛巾彎舉（腳踩）", weight: false },
      { name: "水瓶彎舉", weight: true },
      { name: "桌緣反握划船", weight: false }
    ],
    legs: [
      { name: "徒手深蹲", weight: false },
      { name: "跳躍深蹲", weight: false, tags: ["power"] },
      { name: "弓箭步", weight: false },
      { name: "保加利亞分腿蹲", weight: false },
      { name: "手槍深蹲", weight: false },
      { name: "臀橋", weight: false },
      { name: "單腳臀橋", weight: false },
      { name: "站姿提踵", weight: false },
      { name: "靠牆蹲", weight: false },
      { name: "跳箱 / 跳台階", weight: false, tags: ["power"] }
    ],
    shoulders: [
      { name: "派克伏地挺身", weight: false },
      { name: "靠牆倒立肩推", weight: false },
      { name: "水瓶側平舉", weight: true },
      { name: "水瓶前平舉", weight: true },
      { name: "俯身反向飛鳥（水瓶）", weight: true },
      { name: "平板支撐拍肩", weight: false }
    ],
    core: [
      { name: "捲腹", weight: false },
      { name: "反向捲腹", weight: false },
      { name: "V 字起身", weight: false },
      { name: "登山者", weight: false },
      { name: "交替觸腳跟", weight: false },
      { name: "俄羅斯轉體", weight: false },
      { name: "仰臥舉腿", weight: false },
      { name: "平板支撐", weight: false }
    ]
  },
  gym: {
    chest: [
      { name: "槓鈴臥推", weight: true },
      { name: "啞鈴臥推", weight: true },
      { name: "上斜啞鈴臥推", weight: true },
      { name: "上斜槓鈴臥推", weight: true },
      { name: "機械胸推", weight: true },
      { name: "蝴蝶機夾胸", weight: true },
      { name: "繩索夾胸", weight: true },
      { name: "啞鈴飛鳥", weight: true }
    ],
    triceps: [
      { name: "繩索三頭下壓", weight: true },
      { name: "過頭三頭伸展", weight: true },
      { name: "窄握臥推", weight: true },
      { name: "雙槓撐體", weight: false },
      { name: "仰臥槓鈴三頭伸展", weight: true }
    ],
    back: [
      { name: "硬舉", weight: true },
      { name: "引體向上", weight: false },
      { name: "滑輪下拉", weight: true },
      { name: "坐姿划船", weight: true },
      { name: "槓鈴划船", weight: true },
      { name: "單臂啞鈴划船", weight: true },
      { name: "T槓划船", weight: true },
      { name: "直臂下壓", weight: true }
    ],
    biceps: [
      { name: "槓鈴彎舉", weight: true },
      { name: "啞鈴彎舉", weight: true },
      { name: "錘式彎舉", weight: true },
      { name: "斜板彎舉", weight: true },
      { name: "繩索彎舉", weight: true }
    ],
    legs: [
      { name: "槓鈴深蹲", weight: true },
      { name: "腿推", weight: true },
      { name: "羅馬尼亞硬舉", weight: true },
      { name: "哈克深蹲", weight: true },
      { name: "腿伸展", weight: true },
      { name: "腿彎舉", weight: true },
      { name: "臀推", weight: true },
      { name: "保加利亞分腿蹲（啞鈴）", weight: true },
      { name: "站姿提踵", weight: true }
    ],
    shoulders: [
      { name: "槓鈴肩推", weight: true },
      { name: "啞鈴肩推", weight: true },
      { name: "側平舉", weight: true },
      { name: "前平舉", weight: true },
      { name: "反向飛鳥", weight: true },
      { name: "面拉", weight: true },
      { name: "直立划船", weight: true },
      { name: "聳肩", weight: true }
    ],
    core: [
      { name: "捲腹", weight: false },
      { name: "反向捲腹", weight: false },
      { name: "V 字起身", weight: false },
      { name: "登山者", weight: false },
      { name: "交替觸腳跟", weight: false },
      { name: "俄羅斯轉體", weight: false },
      { name: "仰臥舉腿", weight: false },
      { name: "平板支撐", weight: false }
    ]
  }
};

export function exercisesFor(location, partKey) {
  return (EXERCISES[location] && EXERCISES[location][partKey]) || [];
}

export function findExercise(location, name) {
  const groups = EXERCISES[location] || {};
  for (const list of Object.values(groups)) {
    const hit = list.find((e) => e.name === name);
    if (hit) return hit;
  }
  return null;
}
