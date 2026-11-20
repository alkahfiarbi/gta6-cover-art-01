// Vice Cover Studio v2 — the cover renderer. Paints a multi-panel,
// GTA-poster-style cover (photos, sunset/neon/ink grades, bold Anton
// lettering, heat stars, badge ribbon) onto any canvas at any of the
// three post sizes. Photos are drawn, never changed: every grade is an
// overlay on top of them, and every panel keeps its own crop, zoom,
// flip and rotation.

export const SIZES = {
  '1920x1080': [1920, 1080],
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
};

export const LAYOUTS = [
  'hero', 'grid4', 'grid9', 'full', 'tilt',
  'slash', 'cast6', 'comic', 'duo', 'triptych',
];

export const LAYOUT_NAMES = {
  hero: 'Hero + 3',
  grid4: 'Grid 4',
  grid9: 'Grid 9',
  full: 'Full bleed',
  tilt: 'Tilted snap',
  slash: 'Slashed key art',
  cast6: 'Whole-cast 6',
  comic: 'Comic strip',
  duo: 'Diagonal duo',
  triptych: 'Poster triptych',
};

export const GRADES = ['sunset', 'neon', 'vice', 'heat', 'ink', 'golden', 'noir'];

export const GRADE_NAMES = {
  sunset: 'Sunset',
  neon: 'Neon Night',
  vice: 'Vice City',
  heat: 'Heat Wave',
  ink: 'Poster Ink',
  golden: 'Golden Hour',
  noir: 'Palm Noir',
};

export function panelCount(layout) {
  return {
    hero: 4, grid4: 4, grid9: 9, full: 1, tilt: 1,
    slash: 3, cast6: 6, comic: 4, duo: 2, triptych: 3,
  }[layout] ?? 4;
}

// A panel is either a rectangle { x, y, w, h } (fractions of the canvas)
// or a polygon { poly: [[x, y], ...] } for the slashed and diagonal cuts.
const rect = (x, y, w, h) => ({ x, y, w, h });
const poly = (points) => ({ poly: points });

function panelBox(p) {
  if (!p.poly) return p;
  const xs = p.poly.map(([x]) => x);
  const ys = p.poly.map(([, y]) => y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

/** Panel rectangles/polygons and the title zone for a layout. */
export function layoutGeometry(layout) {
  const g = 0.006; // hairline gap between panels
  const title = (y = 0.78, h = 0.22) => rect(0, y, 1, h);
  switch (layout) {
    case 'hero':
      return {
        panels: [
          rect(0, 0, 1, 0.56),
          rect(0, 0.56 + g, 1 / 3 - g, 0.2),
          rect(1 / 3 + g / 2, 0.56 + g, 1 / 3 - g, 0.2),
          rect(2 / 3 + g / 2, 0.56 + g, 1 / 3 - g, 0.2),
        ],
        titleZone: title(),
      };
    case 'grid4':
      return {
        panels: [
          rect(0, 0, 0.5 - g / 2, 0.5 - g / 2),
          rect(0.5 + g / 2, 0, 0.5 - g / 2, 0.5 - g / 2),
          rect(0, 0.5 + g / 2, 0.5 - g / 2, 0.5 - g / 2),
          rect(0.5 + g / 2, 0.5 + g / 2, 0.5 - g / 2, 0.5 - g / 2),
        ],
        titleZone: title(),
      };
    case 'grid9':
      return {
        panels: Array.from({ length: 9 }, (_, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          return rect(col / 3 + (col ? g / 2 : 0), row / 3 + (row ? g / 2 : 0),
            1 / 3 - g, 1 / 3 - g);
        }),
        titleZone: title(),
      };
    case 'tilt':
      return {
        panels: [rect(0.1, 0.05, 0.8, 0.6)],
        titleZone: rect(0, 0.7, 1, 0.3),
        tilt: -0.07,
      };
    case 'slash':
      // Three bands cut on the diagonal; the title rides over the art.
      return {
        panels: [
          poly([[0, 0], [1, 0], [1, 0.28], [0, 0.36]]),
          poly([[0, 0.36], [1, 0.28], [1, 0.56], [0, 0.64]]),
          poly([[0, 0.64], [1, 0.56], [1, 0.8], [0, 0.8]]),
        ],
        titleZone: rect(0, 0.66, 1, 0.34),
        keyArt: true,
      };
    case 'cast6':
      return {
        panels: [
          rect(0, 0, 1, 0.52),
          ...Array.from({ length: 5 }, (_, i) =>
            rect(i * 0.2 + (i ? g / 2 : 0), 0.526, 0.2 - g, 0.234)),
        ],
        titleZone: title(),
      };
    case 'comic':
      return {
        panels: [
          rect(0, 0, 1, 0.38),
          rect(0, 0.386, 1 / 3 - g, 0.374),
          rect(1 / 3 + g / 2, 0.386, 1 / 3 - g, 0.374),
          rect(2 / 3 + g / 2, 0.386, 1 / 3 - g, 0.374),
        ],
        titleZone: title(),
      };
    case 'duo':
      // Two triangles sharing one diagonal cut.
      return {
        panels: [
          poly([[0, 0], [1, 0], [1, 0.76]]),
          poly([[0, 0], [1, 0.76], [0, 0.76]]),
        ],
        titleZone: title(),
      };
    case 'triptych':
      return {
        panels: [
          rect(0, 0, 0.3, 0.76),
          rect(0.306, 0, 0.388, 0.76),
          rect(0.7, 0, 0.3, 0.76),
        ],
        titleZone: title(),
      };
    case 'full':
    default:
      return { panels: [rect(0, 0, 1, 1)], titleZone: rect(0, 0.76, 1, 0.24) };
  }
}

function pointInPoly(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Which panel (if any) holds the point (x, y) in canvas pixels. */
export function panelAt(layout, x, y, w, h) {
  const { panels, tilt } = layoutGeometry(layout);
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    let px = x / w;
    let py = y / h;
    if (tilt && i === 0) {
      const box = panelBox(p);
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const dx = px - cx;
      const dy = py - cy;
      const c = Math.cos(-tilt);
      const s = Math.sin(-tilt);
      px = cx + dx * c - dy * s;
      py = cy + dx * s + dy * c;
    }
    if (p.poly) {
      if (pointInPoly(px, py, p.poly)) return i;
    } else if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) {
      return i;
    }
  }
  return -1;
}

/**
 * Face-aware auto-fill: faces usually sit in the upper centre of a photo,
 * so the crop is centre-weighted with a small upward bias instead of a
 * dead-centre cover fit. Returns the zoom and offsets for a fresh fill.
 */
export function faceAwareFill(img, panelW, panelH) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const panelAspect = panelW / panelH;
  const imgAspect = iw / ih;
  // A tall photo in a wide panel loses its top and bottom first: keep the
  // upper third (where faces are) by nudging the crop upward.
  const tallInWide = imgAspect < panelAspect * 0.85;
  const wideInTall = imgAspect > panelAspect * 1.25;
  return {
    zoom: tallInWide ? 1.06 : wideInTall ? 1.04 : 1,
    ox: 0,
    oy: tallInWide ? -0.1 : 0,
  };
}

/** Draws one photo into a panel rect, honouring its zoom, pan, flip, rotate. */
function drawPanelPhoto(ctx, img, rx, ry, rw, rh, slot) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rw / iw, rh / ih) * (slot.zoom || 1);
  const dw = iw * base;
  const dh = ih * base;
  const cx = rx + rw / 2 + (slot.ox || 0) * rw;
  const cy = ry + rh / 2 + (slot.oy || 0) * rh;
  ctx.save();
  ctx.translate(cx, cy);
  if (slot.rot) ctx.rotate((slot.rot * Math.PI) / 180);
  if (slot.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function drawEmptyPanel(ctx, x, y, w, h, index, canvasW) {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#3a1550');
  grad.addColorStop(1, '#7a1e6e');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.setLineDash([Math.max(6, canvasW * 0.008), Math.max(6, canvasW * 0.008)]);
  ctx.lineWidth = Math.max(2, canvasW * 0.002);
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `${Math.max(18, h * 0.14)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`+ PHOTO ${index + 1}`, x + w / 2, y + h / 2);
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

function washGradient(ctx, w, h, stops, horizontal = false) {
  const g = horizontal
    ? ctx.createLinearGradient(0, 0, w, h)
    : ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

const GRADE_LAYERS = {
  sunset: [
    { mode: 'overlay', fill: (ctx, w, h) => washGradient(ctx, w, h, [
      [0, 'rgba(255,190,90,0.14)'], [0.6, 'rgba(255,90,120,0.22)'], [1, 'rgba(255,60,110,0.34)'],
    ]) },
    { mode: 'source-over', fill: (ctx, w, h) => washGradient(ctx, w, h, [
      [0, 'rgba(255,60,110,0)'], [1, 'rgba(255,60,110,0.16)'],
    ]) },
  ],
  neon: [
    { mode: 'overlay', fill: (ctx, w, h) => {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.9);
      g.addColorStop(0, 'rgba(255,0,180,0.34)');
      g.addColorStop(1, 'rgba(255,0,180,0)');
      return g;
    } },
    { mode: 'overlay', fill: (ctx, w, h) => {
      const g = ctx.createRadialGradient(w, h, 0, w, h, w * 0.9);
      g.addColorStop(0, 'rgba(0,220,255,0.34)');
      g.addColorStop(1, 'rgba(0,220,255,0)');
      return g;
    } },
  ],
  vice: [
    { mode: 'overlay', fill: (ctx, w, h) => washGradient(ctx, w, h, [
      [0, 'rgba(0,229,255,0.20)'], [0.5, 'rgba(255,46,136,0.14)'], [1, 'rgba(255,46,136,0.30)'],
    ], true) },
    { mode: 'soft-light', fill: (ctx, w, h) => washGradient(ctx, w, h, [
      [0, 'rgba(255,0,150,0.5)'], [1, 'rgba(0,200,255,0.5)'],
    ], true) },
  ],
  heat: [
    { mode: 'overlay', fill: (ctx, w, h) => washGradient(ctx, w, h, [
      [0, 'rgba(255,140,0,0.26)'], [1, 'rgba(255,40,0,0.30)'],
    ]) },
    { mode: 'source-over', fill: (ctx, w, h) => washGradient(ctx, w, h, [
      [0, 'rgba(255,120,0,0.10)'], [1, 'rgba(255,40,0,0.10)'],
    ], true) },
  ],
  ink: [
    // Poster Ink: pull the colour out, push the contrast up, then let the
    // halftone and the ink strokes (drawn after) do the painterly work.
    { mode: 'saturation', fill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, 'rgba(128,128,128,0.55)');
      g.addColorStop(1, 'rgba(128,128,128,0.55)');
      return g;
    } },
    { mode: 'overlay', fill: (ctx, w, h) => washGradient(ctx, w, h, [
      [0, 'rgba(255,214,140,0.16)'], [0.55, 'rgba(255,120,90,0.10)'], [1, 'rgba(20,10,40,0.30)'],
    ]) },
    { mode: 'soft-light', fill: (ctx, w, h) => washGradient(ctx, w, h, [
      [0, 'rgba(255,255,255,0.35)'], [1, 'rgba(0,0,0,0.45)'],
    ]) },
  ],
  golden: [
    { mode: 'overlay', fill: (ctx, w, h) => washGradient(ctx, w, h, [
      [0, 'rgba(255,200,80,0.22)'], [0.6, 'rgba(255,150,50,0.18)'], [1, 'rgba(180,80,20,0.28)'],
    ]) },
    { mode: 'screen', fill: (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.82, h * 0.12, 0, w * 0.82, h * 0.12, w * 0.45);
      g.addColorStop(0, 'rgba(255,236,170,0.5)');
      g.addColorStop(1, 'rgba(255,236,170,0)');
      return g;
    } },
  ],
  noir: [
    { mode: 'overlay', fill: (ctx, w, h) => washGradient(ctx, w, h, [
      [0, 'rgba(0,40,60,0.34)'], [0.5, 'rgba(10,10,30,0.18)'], [1, 'rgba(255,46,136,0.26)'],
    ], true) },
    { mode: 'soft-light', fill: (ctx, w, h) => washGradient(ctx, w, h, [
      [0, 'rgba(0,229,255,0.4)'], [1, 'rgba(255,0,120,0.4)'],
    ], true) },
  ],
};

/** The colour grade: gradient overlays over the photos, never a change to them. */
export function applyGrade(ctx, grade, w, h) {
  for (const layer of GRADE_LAYERS[grade] ?? GRADE_LAYERS.sunset) {
    ctx.save();
    ctx.globalCompositeOperation = layer.mode;
    ctx.fillStyle = layer.fill(ctx, w, h);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

let grainPattern = null;
function drawGrain(ctx, w, h) {
  if (!grainPattern) {
    const tile = document.createElement('canvas');
    tile.width = 140;
    tile.height = 140;
    const tctx = tile.getContext('2d');
    const data = tctx.createImageData(140, 140);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 100 + Math.floor(Math.random() * 155);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    tctx.putImageData(data, 0, 0);
    grainPattern = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawVignette(ctx, w, h, strength = 0.38) {
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawHalftone(ctx, zone, w, alpha = 0.14) {
  const stripH = zone.h * 0.22;
  ctx.save();
  ctx.beginPath();
  ctx.rect(zone.x, zone.y, zone.w, stripH);
  ctx.clip();
  const step = Math.max(10, w * 0.016);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
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

/** A few loose ink strokes across the cover, for the Poster Ink grade. */
function drawInkStrokes(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(15,5,25,0.5)';
  ctx.lineCap = 'round';
  const strokes = [
    [0.06, 0.1, 0.3, 0.04, 0.42, 0.12],
    [0.62, 0.86, 0.78, 0.8, 0.94, 0.9],
    [0.04, 0.55, 0.2, 0.5, 0.3, 0.58],
  ];
  for (const [x1, y1, x2, y2, x3, y3] of strokes) {
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.beginPath();
    ctx.moveTo(x1 * w, y1 * h);
    ctx.quadraticCurveTo(x2 * w, y2 * h, x3 * w, y3 * h);
    ctx.stroke();
  }
  ctx.restore();
}

/** A simple procedural palm silhouette, drawn for the Palm Noir grade. */
function drawPalmSilhouette(ctx, x, y, s, leanLeft) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(leanLeft ? -s : s, s);
  ctx.strokeStyle = 'rgba(8,4,16,0.85)';
  ctx.fillStyle = 'rgba(8,4,16,0.85)';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14, -70, 34, -130);
  ctx.stroke();
  ctx.lineWidth = 6;
  for (let i = 0; i < 6; i++) {
    const ang = (-Math.PI * (0.12 + i * 0.14)) - 0.15;
    const len = 62 - Math.abs(i - 2.5) * 8;
    const tx = 34 + Math.cos(ang) * len;
    const ty = -130 + Math.sin(ang) * len * 0.55;
    ctx.beginPath();
    ctx.moveTo(34, -130);
    ctx.quadraticCurveTo(34 + Math.cos(ang) * len * 0.5, -130 + Math.sin(ang) * len * 0.3 - 14, tx, ty);
    ctx.stroke();
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

function drawTitleBlock(ctx, state, zone, w, h, grade) {
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
  drawHalftone(ctx, { x: zx, y: zy, w: zw, h: zh }, w, grade === 'ink' ? 0.3 : 0.14);
  if (grade === 'noir') {
    drawPalmSilhouette(ctx, w * 0.03, zy + zh * 0.98, zh / 150, false);
    drawPalmSilhouette(ctx, w * 0.97, zy + zh * 0.98, zh / 170, true);
  }

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

function tracePanelPath(ctx, p, w, h) {
  ctx.beginPath();
  if (p.poly) {
    p.poly.forEach(([fx, fy], i) => {
      if (i === 0) ctx.moveTo(fx * w, fy * h);
      else ctx.lineTo(fx * w, fy * h);
    });
    ctx.closePath();
  } else {
    ctx.rect(p.x * w, p.y * h, p.w * w, p.h * h);
  }
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
    const box = panelBox(p);
    const rx = box.x * w;
    const ry = box.y * h;
    const rw = box.w * w;
    const rh = box.h * h;
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
      ctx.beginPath();
      ctx.rect(0, 0, rw, rh);
      ctx.clip();
      if (slot && slot.img) drawPanelPhoto(ctx, slot.img, 0, 0, rw, rh, slot);
      else drawEmptyPanel(ctx, 0, 0, rw, rh, i, w);
    } else {
      tracePanelPath(ctx, p, w, h);
      ctx.clip();
      if (slot && slot.img) drawPanelPhoto(ctx, slot.img, rx, ry, rw, rh, slot);
      else drawEmptyPanel(ctx, rx, ry, rw, rh, i, w);
    }
    ctx.restore();
    if (!(tilt && i === 0)) {
      tracePanelPath(ctx, p, w, h);
      if (state.grade === 'ink') {
        ctx.strokeStyle = '#0d0518';
        ctx.lineWidth = Math.max(4, w * 0.005);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = Math.max(2, w * 0.002);
      }
      ctx.stroke();
    }
  });

  applyGrade(ctx, state.grade, w, h);
  if (state.grade === 'ink') drawInkStrokes(ctx, w, h);
  drawGrain(ctx, w, h);
  drawVignette(ctx, w, h, state.grade === 'noir' ? 0.5 : 0.38);
  drawTitleBlock(ctx, state, {
    x: titleZone.x * w,
    y: titleZone.y * h,
    w: titleZone.w * w,
    h: titleZone.h * h,
  }, w, h, state.grade);
  drawBadgeRibbon(ctx, state.badge, w, h);
  return canvas;
}
