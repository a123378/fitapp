// 資料層：有 Firebase 設定 → Firestore（Google 登入、跨裝置同步）；沒有 → localStorage
import { firebaseConfig } from './config.js';

const LOCAL_KEY = 'fitapp.workouts';
const FB_VER = '11.10.0';

const state = {
  mode: 'local',          // 'local' | 'firebase'
  user: null,
  workouts: [],           // 依日期新到舊
  listeners: new Set(),
  fb: null
};

export const store = {
  get mode() { return state.mode; },
  get user() { return state.user; },
  get workouts() { return state.workouts; },
  subscribe(fn) { state.listeners.add(fn); return () => state.listeners.delete(fn); },

  async init() {
    if (firebaseConfig && firebaseConfig.apiKey) {
      try { await initFirebase(); return; }
      catch (e) { console.warn('Firebase 初始化失敗，改用本機儲存', e); }
    }
    state.mode = 'local';
    state.workouts = loadLocal();
    notify();
  },

  async signIn() {
    if (state.mode !== 'firebase') return;
    const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = state.fb.authMod;
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(state.fb.auth, provider); }
    catch (e) {
      // 彈出視窗被擋 → 改用整頁跳轉登入；其他錯誤直接丟給畫面顯示
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) {
        await signInWithRedirect(state.fb.auth, provider);
      } else throw e;
    }
  },
  async signOut() { if (state.mode === 'firebase') await state.fb.authMod.signOut(state.fb.auth); },

  async add(workout) {
    const w = { ...workout, id: workout.id || uid(), createdAt: Date.now() };
    if (state.mode === 'firebase' && state.user) {
      const { doc, setDoc } = state.fb.fsMod;
      await setDoc(doc(state.fb.db, 'users', state.user.uid, 'workouts', w.id), w);
    } else {
      state.workouts = [w, ...state.workouts.filter((x) => x.id !== w.id)].sort(byDateDesc);
      saveLocal(); notify();
    }
    return w;
  },
  async remove(id) {
    if (state.mode === 'firebase' && state.user) {
      const { doc, deleteDoc } = state.fb.fsMod;
      await deleteDoc(doc(state.fb.db, 'users', state.user.uid, 'workouts', id));
    } else {
      state.workouts = state.workouts.filter((w) => w.id !== id);
      saveLocal(); notify();
    }
  },
  exportJSON() { return JSON.stringify(state.workouts, null, 2); },
  async importJSON(text) {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error('格式錯誤');
    for (const w of arr) await this.add(w);
  }
};

async function initFirebase() {
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore.js`)
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  const db = fsMod.getFirestore(app);
  try { await fsMod.enableIndexedDbPersistence(db); } catch (_) { /* 已啟用或不支援 */ }
  state.fb = { app, auth, db, authMod, fsMod };
  state.mode = 'firebase';

  let unsubDocs = null;
  authMod.onAuthStateChanged(auth, (user) => {
    state.user = user;
    if (unsubDocs) { unsubDocs(); unsubDocs = null; }
    if (user) {
      const { collection, onSnapshot, query, orderBy } = fsMod;
      const q = query(collection(db, 'users', user.uid, 'workouts'), orderBy('date', 'desc'));
      unsubDocs = onSnapshot(q, (snap) => {
        state.workouts = snap.docs.map((d) => d.data()).sort(byDateDesc);
        notify();
      });
      // 第一次登入時，把本機資料搬上雲端
      migrateLocalToCloud(user);
    } else {
      state.workouts = [];
      notify();
    }
  });
}

async function migrateLocalToCloud(user) {
  const local = loadLocal();
  if (!local.length) return;
  const { doc, setDoc } = state.fb.fsMod;
  for (const w of local) await setDoc(doc(state.fb.db, 'users', user.uid, 'workouts', w.id), w, { merge: true });
  localStorage.removeItem(LOCAL_KEY);
}

function loadLocal() { try { return (JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')).sort(byDateDesc); } catch { return []; } }
function saveLocal() { localStorage.setItem(LOCAL_KEY, JSON.stringify(state.workouts)); }
function notify() { state.listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }
function byDateDesc(a, b) { return (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// ---------- 計算 ----------
// Epley 公式估算 1RM：w × (1 + reps/30)；reps = 1 直接回傳重量
export function estimate1RM(weight, reps) {
  weight = Number(weight); reps = Number(reps);
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
