// Vice Cover Studio — the cover renderer. Draws a multi-panel GTA-style poster
// (photos, sunset/neon grade, bold Anton lettering, heat stars, badge ribbon)
// onto any canvas at any of the three post sizes. Photos are drawn, never
// altered: the grade is an overlay on top of them.

export const SIZES = {
  '1920x1080': [1920, 1080],
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
};

export const LAYOUTS = ['hero', 'grid4', 'grid9', 'full', 'tilt'];
export const GRADES = ['sunset', 'neon', 'vice', 'heat'];

export function panelCount(layout) {
  return { hero: 4, grid4: 4, grid9: 9, full: 1, tilt: 1 }[layout] ?? 4;
}

/** Panel rectangles (fractions of the canvas) and the title zone for a layout. */
export function layoutGeometry(layout) {
  const gap = 0.006;
  const g = (x, y, w, h) => ({ x, y, w, h });
  switch (layout) {
    case 'hero':
      return {
        panels: [
          g(0, 0, 1, 0.56),
          g(0, 0.56 + gap, 1 / 3 - gap, 0.22 - gap),
          g(1 / 3 + gap / 2, 0.56 + gap, 1 / 3 - gap, 0.22 - gap),
          g(2 / 3 + gap / 2, 0.56 + gap, 1 / 3 - gap, 0.22 - gap),
        ],
        titleZone: g(0, 0.78, 1, 0.22),
      };
    case 'grid4':
      return {
        panels: [
          g(0, 0, 0.5 - gap / 2, 0.5 - gap / 2),
          g(0.5 + gap / 2, 0, 0.5 - gap / 2, 0.5 - gap / 2),
          g(0, 0.5 + gap / 2, 0.5 - gap / 2, 0.5 - gap / 2),
          g(0.5 + gap / 2, 0.5 + gap / 2, 0.5 - gap / 2, 0.5 - gap / 2),
        ],
        titleZone: g(0, 0.8, 1, 0.2),
      };
    case 'grid9':
      return {
        panels: Array.from({ length: 9 }, (_, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          return g(col / 3 + (col ? gap / 2 : 0), row / 3 + (row ? gap / 2 : 0),
            1 / 3 - gap, 1 / 3 - gap);
        }),
        titleZone: g(0, 0.8, 1, 0.2),
      };
    case 'tilt':
      return {
        panels: [g(0.1, 0.05, 0.8, 0.6)],
        titleZone: g(0, 0.7, 1, 0.3),
        tilt: -0.07,
      };
    case 'full':
    default:
      return { panels: [g(0, 0, 1, 1)], titleZone: g(0, 0.76, 1, 0.24) };
  }
}

/** Which panel (if any) holds the point (x, y) in canvas pixels. */
export function panelAt(layout, x, y, w, h) {
  const { panels, tilt } = layoutGeometry(layout);
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    let px = x / w;
    let py = y / h;
    if (tilt && i === 0) {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const dx = px - cx;
      const dy = py - cy;
      const c = Math.cos(-tilt);
      const s = Math.sin(-tilt);
      px = cx + dx * c - dy * s;
      py = cy + dx * s + dy * c;
    }
    if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return i;
  }
  return -1;
}

function coverFitDraw(ctx, img, rx, ry, rw, rh, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rw / iw, rh / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  const dx = rx + (rw - dw) / 2 + ox * rw;
  const dy = ry + (rh - dh) / 2 + oy * rh;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawEmptyPanel(ctx, rect, index, w) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, '#3a1550');
  grad.addColorStop(1, '#7a1e6e');
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.setLineDash([Math.max(6, w * 0.008), Math.max(6, w * 0.008)]);
  ctx.lineWidth = Math.max(2, w * 0.002);
  ctx.strokeRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `${Math.max(18, rect.h * 0.14)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`+ PHOTO ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function drawTiltBackground(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, '#2b0f3d');
  sky.addColorStop(0.45, '#c22a7a');
  sky.addColorStop(0.75, '#ff7a3c');
  sky.addColorStop(1, '#ffc46b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sun = ctx.createRadialGradient(w * 0.72, h * 0.3, 10, w * 0.72, h * 0.3, w * 0.3);
  sun.addColorStop(0, 'rgba(255,240,180,0.95)');
  sun.addColorStop(0.5, 'rgba(255,150,80,0.55)');
  sun.addColorStop(1, 'rgba(255,150,80,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(20,8,31,0.16)';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(0, h * (0.62 + i * 0.028), w, h * 0.008);
  }
}

const GRADE_WASHES = {
  sunset: [
    ['overlay', (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,190,90,0.14)');
      g.addColorStop(0.6, 'rgba(255,90,120,0.22)');
      g.addColorStop(1, 'rgba(255,60,110,0.34)');
      return g;
    }],
    ['source-over', (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, h * 0.5, 0, h);
      g.addColorStop(0, 'rgba(255,60,110,0)');
      g.addColorStop(1, 'rgba(255,60,110,0.16)');
      return g;
    }],
  ],
  neon: [
    ['overlay', (ctx, w, h) => {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.9);
      g.addColorStop(0, 'rgba(255,0,180,0.34)');
      g.addColorStop(1, 'rgba(255,0,180,0)');
      return g;
    }],
    ['overlay', (ctx, w, h) => {
      const g = ctx.createRadialGradient(w, h, 0, w, h, w * 0.9);
      g.addColorStop(0, 'rgba(0,220,255,0.34)');
      g.addColorStop(1, 'rgba(0,220,255,0)');
      return g;
    }],
  ],
  vice: [
    ['overlay', (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, 'rgba(0,229,255,0.20)');
      g.addColorStop(0.5, 'rgba(255,46,136,0.14)');
      g.addColorStop(1, 'rgba(255,46,136,0.30)');
      return g;
    }],
    ['soft-light', (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, h, w, 0);
      g.addColorStop(0, 'rgba(255,0,150,0.5)');
      g.addColorStop(1, 'rgba(0,200,255,0.5)');
      return g;
    }],
  ],
  heat: [
    ['overlay', (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,140,0,0.26)');
      g.addColorStop(1, 'rgba(255,40,0,0.30)');
      return g;
    }],
    ['source-over', (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,120,0,0.10)');
      g.addColorStop(1, 'rgba(255,40,0,0.10)');
      return g;
    }],
  ],
};

/** The colour grade: gradient overlays over the photos, never a change to them. */
export function applyGrade(ctx, grade, w, h) {
  for (const [mode, make] of GRADE_WASHES[grade] ?? GRADE_WASHES.sunset) {
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.fillStyle = make(ctx, w, h);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

let grainPattern = null;
function drawGrain(ctx, w, h) {
  if (!grainPattern) {
    const n = document.createElement('canvas');
    n.width = 140;
    n.height = 140;
    const nctx = n.getContext('2d');
    const data = nctx.createImageData(140, 140);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 100 + Math.floor(Math.random() * 155);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    nctx.putImageData(data, 0, 0);
    grainPattern = ctx.createPattern(n, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawHalftone(ctx, zone, w) {
  const stripH = zone.h * 0.22;
  ctx.save();
  ctx.beginPath();
  ctx.rect(zone.x, zone.y, zone.w, stripH);
  ctx.clip();
  const step = Math.max(10, w * 0.016);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  for (let y = zone.y + step / 2; y < zone.y + stripH; y += step) {
    for (let x = step / 2; x < w; x += step) {
      const r = step * 0.22 * (0.6 + 0.4 * Math.sin(x * 0.02));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = '#ffd23e';
    ctx.shadowColor = '#ff9d00';
    ctx.shadowBlur = r * 0.8;
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.stroke();
  }
}

/** The heat meter: five stars, `heat` of them lit. */
export function drawHeatStars(ctx, cx, cy, size, heat) {
  const gap = size * 2.4;
  const startX = cx - (gap * 4) / 2;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, startX + i * gap, cy, size, i < heat);
  }
}

function drawBadgeRibbon(ctx, text, w, h) {
  if (!text.trim()) return;
  const label = text.trim().toUpperCase();
  let size = Math.max(20, h * 0.032);
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(label).width > w * 0.34 && size > 12) {
    size -= 1;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  const padX = size * 0.7;
  const padY = size * 0.42;
  const tw = ctx.measureText(label).width;
  ctx.save();
  ctx.translate(w - tw / 2 - padX - w * 0.015, h * 0.045);
  ctx.rotate(0.06);
  ctx.fillStyle = '#ff2e88';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = size * 0.3;
  ctx.shadowOffsetY = size * 0.08;
  ctx.fillRect(-tw / 2 - padX, -size / 2 - padY, tw + padX * 2, size + padY * 2);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, size * 0.05);
  ctx.restore();
}

function drawTitleBlock(ctx, state, zone, w, h) {
  const zx = zone.x;
  const zy = zone.y;
  const zw = zone.w;
  const zh = zone.h;
  const scrim = ctx.createLinearGradient(0, zy, 0, zy + zh);
  scrim.addColorStop(0, 'rgba(12,4,20,0)');
  scrim.addColorStop(0.35, 'rgba(12,4,20,0.62)');
  scrim.addColorStop(1, 'rgba(12,4,20,0.92)');
  ctx.fillStyle = scrim;
  ctx.fillRect(zx, zy, zw, zh);
  drawHalftone(ctx, { x: zx, y: zy, w: zw, h: zh }, w);

  const title = state.title.trim().toUpperCase();
  const sub = state.subtitle.trim();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (title) {
    let size = zh * 0.44;
    ctx.font = `${size}px Anton, sans-serif`;
    while (ctx.measureText(title).width > w * 0.92 && size > 14) {
      size -= 2;
      ctx.font = `${size}px Anton, sans-serif`;
    }
    const ty = zy + zh * 0.34;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.strokeStyle = '#1c0630';
    ctx.strokeText(title, w / 2, ty);
    ctx.fillStyle = 'rgba(255,46,136,0.55)';
    ctx.fillText(title, w / 2 + size * 0.035, ty + size * 0.03);
    ctx.fillStyle = 'rgba(0,229,255,0.45)';
    ctx.fillText(title, w / 2 - size * 0.03, ty - size * 0.025);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, w / 2, ty);
  }
  if (sub) {
    const size = Math.max(16, zh * 0.2);
    ctx.font = `${size}px Pacifico, cursive`;
    const sy = zy + zh * 0.68;
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = size * 0.7;
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(sub, w / 2, sy);
    ctx.shadowBlur = 0;
  }
  drawHeatStars(ctx, w / 2, zy + zh * 0.9, Math.max(8, zh * 0.07), state.heat);
}

/** Renders the whole cover onto `canvas` at the state's export size. */
export function drawCover(canvas, state) {
  const [w, h] = SIZES[state.size] ?? SIZES['1920x1080'];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#14081f';
  ctx.fillRect(0, 0, w, h);

  const { panels, titleZone, tilt } = layoutGeometry(state.layout);
  if (state.layout === 'tilt') drawTiltBackground(ctx, w, h);

  panels.forEach((p, i) => {
    const rx = p.x * w;
    const ry = p.y * h;
    const rw = p.w * w;
    const rh = p.h * h;
    const slot = state.slots[i];
    ctx.save();
    if (tilt && i === 0) {
      ctx.translate(rx + rw / 2, ry + rh / 2);
      ctx.rotate(tilt);
      ctx.translate(-rw / 2, -rh / 2);
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = w * 0.02;
      ctx.shadowOffsetY = h * 0.012;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-rw * 0.035, -rh * 0.045, rw * 1.07, rh * 1.09);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.beginPath();
    ctx.rect(tilt && i === 0 ? 0 : rx, tilt && i === 0 ? 0 : ry,
      tilt && i === 0 ? rw : rw, tilt && i === 0 ? rh : rh);
    ctx.clip();
    if (slot && slot.img) {
      if (tilt && i === 0) coverFitDraw(ctx, slot.img, 0, 0, rw, rh, slot.zoom, slot.ox, slot.oy);
      else coverFitDraw(ctx, slot.img, rx, ry, rw, rh, slot.zoom, slot.ox, slot.oy);
    } else if (tilt && i === 0) {
      drawEmptyPanel(ctx, { x: 0, y: 0, w: rw, h: rh }, i, w);
    } else {
      drawEmptyPanel(ctx, { x: rx, y: ry, w: rw, h: rh }, i, w);
    }
    ctx.restore();
    if (!(tilt && i === 0)) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(2, w * 0.002);
      ctx.strokeRect(rx, ry, rw, rh);
    }
  });

  applyGrade(ctx, state.grade, w, h);
  drawGrain(ctx, w, h);
  drawVignette(ctx, w, h);
  drawTitleBlock(ctx, state, {
    x: titleZone.x * w,
    y: titleZone.y * h,
    w: titleZone.w * w,
    h: titleZone.h * h,
  }, w, h);
  drawBadgeRibbon(ctx, state.badge, w, h);
  return canvas;
}
