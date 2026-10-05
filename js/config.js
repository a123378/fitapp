// ===== Firebase 設定 =====
// 到 Firebase Console → 專案設定 → 你的應用程式（Web）→ SDK 設定與配置，把 firebaseConfig 貼到這裡。
// 若留空（apiKey 為空字串），App 會自動改用手機本機儲存（localStorage），功能一樣可以用，只是不會跨裝置同步。
export const firebaseConfig = {
  apiKey: "AIzaSyAx_ScW5X5Ax3rzTe_TKp0lhpvm78wM2BQ",
  authDomain: "fit-app-915f9.firebaseapp.com",
  projectId: "fit-app-915f9",
  storageBucket: "fit-app-915f9.firebasestorage.app",
  messagingSenderId: "407017272254",
  appId: "1:407017272254:web:5ab91e061ff86739693fef"
};

// ===== Gemini 設定 =====
// Gemini API key 不放在程式碼裡，改在 App 的「設定」頁面輸入，會存在手機本機。
export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

// ===== 訓練參數 =====
export const GOALS = {
  power:       { label: "爆發力", rm: "1-3RM",   reps: [1, 3],   rest: "3-5 分鐘", desc: "高負荷、低次數" },
  hypertrophy: { label: "肌肥大", rm: "8-12RM",  reps: [8, 12],  rest: "60-90 秒", desc: "中負荷、中次數" },
  endurance:   { label: "肌耐力", rm: "12-16RM", reps: [12, 16], rest: "30-60 秒", desc: "低負荷、高次數" }
};

export const LOCATIONS = {
  home: { label: "在家徒手", icon: "🏠" },
  gym:  { label: "健身房機械", icon: "🏋️" }
};

// 每個肌群拆成「大肌群 / 小肌群」，套用你的規則：
// 大肌群 3-5 組、至少 3 個動作；小肌群 4-5 組、至少 2 個動作
export const MUSCLE_GROUPS = {
  chest_tri: { label: "胸 + 三頭", icon: "💪", parts: [
    { key: "chest",   label: "胸",   size: "large" },
    { key: "triceps", label: "三頭", size: "small" } ] },
  back_bi:   { label: "背 + 二頭", icon: "🦾", parts: [
    { key: "back",    label: "背",   size: "large" },
    { key: "biceps",  label: "二頭", size: "small" } ] },
  legs:      { label: "腿", icon: "🦵", parts: [
    { key: "legs",    label: "腿",   size: "large" } ] },
  shoulders: { label: "肩", icon: "🙆", parts: [
    { key: "shoulders", label: "肩", size: "small" } ] },
  core:      { label: "核心", icon: "🧱", parts: [
    { key: "core", label: "核心", size: "small" } ] }
};

export const SIZE_RULES = {
  large: { sets: [3, 5], minExercises: 3 },
  small: { sets: [4, 5], minExercises: 2 }
};

// 表現頁追蹤的三大項（名稱要和動作清單一致）
export const BIG_THREE = ["槓鈴臥推", "槓鈴深蹲", "硬舉"];

export const CARDIO_MODES = {
  cardio: { label: "心肺訓練", icon: "❤️", desc: "提升心肺耐力" },
  fat:    { label: "燃脂",     icon: "🔥", desc: "高熱量消耗" }
};
export const CARDIO_TYPES = {
  hiit:   { label: "HIIT",  icon: "⚡", desc: "高強度間歇" },
  tabata: { label: "Tabata", icon: "⏱️", desc: "20 秒動 / 10 秒休 × 8" },
  run:    { label: "跑步",   icon: "🏃", desc: "戶外或跑步機" }
};
