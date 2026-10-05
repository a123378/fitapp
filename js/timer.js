// 間歇計時器：準備 → (動作 → 休息) × 輪數 → 完成
// 倒數 3-2-1 嗶聲 + 階段切換長音 + 震動 + 螢幕常亮

let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function beep(freq = 880, ms = 120, vol = 0.4) {
  try {
    const ctx = ensureAudio();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    o.stop(ctx.currentTime + ms / 1000 + 0.02);
  } catch (_) { /* ignore */ }
}
export function vibrate(pattern) { try { navigator.vibrate && navigator.vibrate(pattern); } catch (_) {} }

let wakeLock = null;
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (_) {}
}

export class IntervalTimer {
  constructor({ prepSec = 10, workSec = 20, restSec = 10, rounds = 8, onTick, onPhase, onDone }) {
    Object.assign(this, { prepSec, workSec, restSec, rounds, onTick, onPhase, onDone });
    this.reset();
  }
  reset() {
    this.stop();
    this.phase = 'prep'; this.round = 0; this.remaining = this.prepSec; this.running = false; this.finished = false;
    this._lastBeep = null;
  }
  start() {
    if (this.running || this.finished) return;
    ensureAudio();
    this.running = true;
    keepAwake(true);
    this._endAt = Date.now() + this.remaining * 1000;
    this._iv = setInterval(() => this._tick(), 200);
    this.onPhase && this.onPhase(this);
  }
  pause() {
    if (!this.running) return;
    this.running = false;
    clearInterval(this._iv);
    this.remaining = Math.max(0, Math.ceil((this._endAt - Date.now()) / 1000));
    keepAwake(false);
  }
  stop() { clearInterval(this._iv); this.running = false; keepAwake(false); }
  skip() { this._advance(); }
  _tick() {
    const left = Math.ceil((this._endAt - Date.now()) / 1000);
    if (left !== this.remaining) {
      this.remaining = left;
      if (left >= 1 && left <= 3 && this._lastBeep !== `${this.phase}${this.round}${left}`) {
        this._lastBeep = `${this.phase}${this.round}${left}`;
        beep(660, 100); vibrate(60);
      }
      this.onTick && this.onTick(this);
    }
    if (left <= 0) this._advance();
  }
  _advance() {
    if (this.phase === 'prep' || this.phase === 'rest') {
      this.round += 1;
      if (this.round > this.rounds) return this._finish();
      this.phase = 'work'; this.remaining = this.workSec;
      beep(1046, 350, 0.5); vibrate([150, 60, 150]);
    } else if (this.phase === 'work') {
      if (this.round >= this.rounds) return this._finish();
      this.phase = 'rest'; this.remaining = this.restSec;
      beep(523, 350, 0.5); vibrate(200);
    }
    this._endAt = Date.now() + this.remaining * 1000;
    this.onPhase && this.onPhase(this);
    this.onTick && this.onTick(this);
  }
  _finish() {
    this.stop();
    this.finished = true; this.phase = 'done'; this.remaining = 0;
    beep(1318, 200); setTimeout(() => beep(1568, 200), 220); setTimeout(() => beep(2093, 500), 440);
    vibrate([300, 100, 300, 100, 600]);
    this.onPhase && this.onPhase(this);
    this.onDone && this.onDone(this);
  }
  get totalSeconds() { return this.prepSec + this.rounds * this.workSec + (this.rounds - 1) * this.restSec; }
  get phaseTotal() { return this.phase === 'prep' ? this.prepSec : this.phase === 'work' ? this.workSec : this.restSec; }
}

export class Stopwatch {
  constructor(onTick) { this.onTick = onTick; this.elapsed = 0; this.running = false; }
  start() { if (this.running) return; this.running = true; keepAwake(true); this._from = Date.now() - this.elapsed; this._iv = setInterval(() => { this.elapsed = Date.now() - this._from; this.onTick && this.onTick(this); }, 250); }
  pause() { if (!this.running) return; this.running = false; clearInterval(this._iv); keepAwake(false); }
  stop() { this.pause(); }
  reset() { this.pause(); this.elapsed = 0; this.onTick && this.onTick(this); }
}

// 組間休息倒數：設定秒數 → 開始 → 3-2-1 嗶 → 結束長音 + 震動
export class Countdown {
  constructor({ onTick, onDone }) { this.onTick = onTick; this.onDone = onDone; this.total = 90; this.remaining = 90; this.running = false; }
  set(sec) { this.stop(); this.total = sec; this.remaining = sec; this.onTick && this.onTick(this); }
  start() {
    if (this.running) return;
    if (this.remaining <= 0) this.remaining = this.total;
    ensureAudio(); this.running = true; keepAwake(true);
    this._endAt = Date.now() + this.remaining * 1000; this._lastBeep = null;
    this._iv = setInterval(() => {
      const left = Math.ceil((this._endAt - Date.now()) / 1000);
      if (left !== this.remaining) {
        this.remaining = Math.max(0, left);
        if (left >= 1 && left <= 3 && this._lastBeep !== left) { this._lastBeep = left; beep(660, 100); vibrate(60); }
        this.onTick && this.onTick(this);
      }
      if (left <= 0) {
        this.stop(); this.remaining = 0;
        beep(1046, 500, 0.5); setTimeout(() => beep(1046, 500, 0.5), 600); vibrate([300, 100, 300]);
        this.onTick && this.onTick(this); this.onDone && this.onDone(this);
      }
    }, 200);
    this.onTick && this.onTick(this);
  }
  pause() { if (!this.running) return; this.running = false; clearInterval(this._iv); this.remaining = Math.max(0, Math.ceil((this._endAt - Date.now()) / 1000)); keepAwake(false); this.onTick && this.onTick(this); }
  stop() { this.running = false; clearInterval(this._iv); keepAwake(false); }
  reset() { this.stop(); this.remaining = this.total; this.onTick && this.onTick(this); }
}

export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
