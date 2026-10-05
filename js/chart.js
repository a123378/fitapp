// 輕量 SVG 折線圖（不依賴外部套件），畫三大項估算 1RM 趨勢
export const SERIES_COLORS = ['#4f8cff', '#ff6b4a', '#3ccf8e'];

/**
 * series: [{ name, color, points: [{ x: 'YYYY-MM-DD', y: number }] }]
 */
export function lineChartSVG(series, { width = 360, height = 220 } = {}) {
  const pad = { l: 40, r: 12, t: 14, b: 28 };
  const all = series.flatMap((s) => s.points);
  if (!all.length) return `<div class="muted center" style="padding:40px 0">還沒有資料，先做幾次臥推 / 深蹲 / 硬舉吧</div>`;

  const xs = [...new Set(all.map((p) => p.x))].sort();
  const xIndex = new Map(xs.map((x, i) => [x, i]));
  const ys = all.map((p) => p.y);
  let yMin = Math.min(...ys), yMax = Math.max(...ys);
  if (yMin === yMax) { yMin -= 5; yMax += 5; }
  const span = yMax - yMin;
  yMin = Math.floor((yMin - span * 0.1) / 5) * 5;
  yMax = Math.ceil((yMax + span * 0.1) / 5) * 5;

  const W = width - pad.l - pad.r, H = height - pad.t - pad.b;
  const sx = (x) => pad.l + (xs.length === 1 ? W / 2 : (xIndex.get(x) / (xs.length - 1)) * W);
  const sy = (y) => pad.t + H - ((y - yMin) / (yMax - yMin)) * H;

  const ticks = 4;
  let grid = '';
  for (let i = 0; i <= ticks; i++) {
    const v = yMin + ((yMax - yMin) * i) / ticks;
    const y = sy(v);
    grid += `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y}" y2="${y}" stroke="#2a3040" stroke-width="1"/>`;
    grid += `<text x="${pad.l - 6}" y="${y + 4}" fill="#8b93a7" font-size="10" text-anchor="end">${Math.round(v)}</text>`;
  }
  const xLabelIdx = xs.length <= 5 ? xs.map((_, i) => i) : [0, Math.floor((xs.length - 1) / 2), xs.length - 1];
  let xl = '';
  xLabelIdx.forEach((i) => {
    xl += `<text x="${sx(xs[i])}" y="${height - 8}" fill="#8b93a7" font-size="10" text-anchor="${i === 0 ? 'start' : i === xs.length - 1 ? 'end' : 'middle'}">${xs[i].slice(5)}</text>`;
  });

  let paths = '';
  series.forEach((s) => {
    if (!s.points.length) return;
    const pts = [...s.points].sort((a, b) => a.x.localeCompare(b.x));
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
    paths += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((p) => { paths += `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="3.5" fill="${s.color}" stroke="#171a21" stroke-width="1.5"><title>${s.name} ${p.x}：${p.y} kg</title></circle>`; });
    const last = pts[pts.length - 1];
    paths += `<text x="${Math.min(sx(last.x) + 6, width - pad.r - 30)}" y="${sy(last.y) - 8}" fill="${s.color}" font-size="11" font-weight="700">${last.y}</text>`;
  });

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="1RM 趨勢圖">${grid}${xl}${paths}</svg>`;
}
