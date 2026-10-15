# 我的健身 PWA

為自己量身打造的健身 App：Gemini 安排菜單、有氧計時器、1RM 追蹤，Firebase 雲端同步。

## 檔案結構

```
fitapp/
├─ index.html          App 入口
├─ manifest.json       PWA 設定（安裝到手機桌面）
├─ sw.js               Service Worker（離線快取；新增 JS 檔要加進這裡）
├─ firestore.rules     Firestore 安全規則（貼到 Firebase Console）
├─ firebase.json       Firebase Hosting 設定
├─ deploy.bat          一鍵部署到 Firebase Hosting
├─ backup.bat          一鍵備份到 GitHub（git add / commit / push）
├─ css/style.css
├─ js/
│  ├─ app.js           畫面與流程
│  ├─ config.js        ★ Firebase 設定、RM 範圍、組數規則、三大項名稱
│  ├─ store.js         Firestore / localStorage 資料層、1RM 公式
│  ├─ gemini.js        Gemini API 呼叫（菜單、有氧、飲食、週回顧）+ 本機備援
│  ├─ exercises.js     ★ 動作清單（Gemini 只會從這裡挑）
│  ├─ split.js         三分化課表、每個動作的候選替換、熱身
│  ├─ creators.js      創作者菜單彙整
│  │  ├─ viyade.js         維亞德
│  │  ├─ jinshicheng.js    金士程
│  │  ├─ rrroy.js          RRRoy
│  │  ├─ tanchengyi.js     谭成义
│  │  └─ xunlianguaishou.js 訓練怪獸
│  ├─ coaching.js      動作要點、訓練原則、示範影片
│  ├─ progression.js   漸進超負荷、減量週、肌群報告
│  ├─ review.js        每週回顧
│  ├─ nutrition.js     體重、熱量與營養目標
│  ├─ meals.js         食物庫、飲食計畫
│  ├─ timer.js         間歇計時器、碼表、嗶聲、震動、螢幕常亮
│  └─ chart.js         SVG 趨勢圖
└─ icons/
```

## 一、本機先跑起來（不需要 Firebase）

因為用了 ES module，不能直接雙擊 index.html，要用一個本機伺服器：

```bash
cd fitapp
python -m http.server 8080
# 或 npx serve .
```

瀏覽器開 http://localhost:8080 。手機要測試的話，電腦和手機在同一 Wi-Fi，用電腦的區網 IP 開（例如 http://192.168.1.10:8080）。

> 沒有 Firebase 設定時，紀錄存在瀏覽器 localStorage；沒有 Gemini key 時，菜單由本機規則隨機產生。功能都能用。

## 二、設定 Gemini API key

1. 到 https://aistudio.google.com/apikey 建立 key（開頭是 `AIza...`）。
2. App → 設定 → 貼上 → 儲存 → 測試連線。
3. Key 只存在手機瀏覽器，不會進 Firebase。

## 三、設定 Firebase（雲端同步）

1. https://console.firebase.google.com → 新增專案。
2. **Authentication** → 登入方式 → 啟用 **Google**。
3. **Firestore Database** → 建立資料庫（正式模式）→ 規則貼上 `firestore.rules` 的內容。
4. 專案設定 → 你的應用程式 → 新增 **Web 應用程式** → 把 `firebaseConfig` 貼到 `js/config.js`。
5. **Authentication → 設定 → 授權網域**：加入你部署的網域（GitHub Pages 的話是 `你的帳號.github.io`）。

## 四、部署（讓手機可以安裝）

PWA 需要 HTTPS。最簡單的方式是 **Firebase Hosting** 或 **GitHub Pages**：

**Firebase Hosting**
```bash
npm i -g firebase-tools
firebase login
firebase init hosting   # public 目錄選 .（fitapp 資料夾），single-page app 選 No
firebase deploy
```

**GitHub Pages**：把 fitapp 資料夾推到 repo，Settings → Pages → 選 branch，網址是 `https://帳號.github.io/repo名/`。

部署後用手機 Chrome 開網址 → 選單 → 「加到主畫面」。

## 五、可自訂的地方

- `js/exercises.js`：增刪動作。`weight: true` 代表有外加重量（會算 1RM）。
- `js/config.js`：
  - `GOALS`：三種目標的 RM 範圍與休息時間。
  - `SIZE_RULES`：大肌群 3-5 組 / 至少 3 動作、小肌群 4-5 組 / 至少 2 動作。
  - `BIG_THREE`：表現頁追蹤的三個動作名稱，要和 exercises.js 一致。

## 已知限制

- **Samsung Health / Google Health Connect**：這兩個是 Android 原生 API，瀏覽器裡的 PWA 無法直接讀取。跑步目前是「App 內碼表 + 手動填距離」。若之後要真正串接，需要用 Capacitor / TWA 包成 Android App 再接 Health Connect。
- Gemini 在瀏覽器端直接呼叫，key 只存在本機；只給自己用沒問題，不要把網址公開分享。
- iOS Safari 的震動 API 不支援，嗶聲仍可用。
