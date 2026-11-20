// Vice Cover Studio v2 — cover painter.
//
// Everything on the poster is painted here: the ten multi-panel layouts,
// the seven colour grades (always overlays, never edits to the photos),
// the bold Anton title with its neon Pacifico subtitle, the heat stars,
// the badge ribbon, grain, vignette and halftone. A cover is drawn onto
// any canvas at any of the three post sizes, and the same painter feeds
// both the live preview and the exported PNG, so what you see is what
// you get.

export const SIZES = {
  '1920x1080': [1920, 1080],
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
};

export const LAYOUTS = [
  'hero', 'grid4', 'grid9', 'full', 'tilt',
  'slash', 'cast6', 'comic', 'duo', 'triptych',
];

export const LAYOUT_LABELS = {
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

export const GRADE_LABELS = {
  sunset: 'Sunset',
  neon: 'Neon Night',
  vice: 'Vice City',
  heat: 'Heat Wave',
  ink: 'Poster Ink',
  golden: 'Golden Hour',
  noir: 'Palm Noir',
};

/** How many photo slots a layout shows. */
export function slotCount(layout) {
  switch (layout) {
    case 'grid9': return 9;
    case 'cast6': return 6;
    case 'hero': case 'grid4': case 'comic': return 4;
    case 'slash': case 'triptych': return 3;
    case 'duo': return 2;
    default: return 1;
  }
}

const box = (x, y, w, h) => ({ x, y, w, h });
const cut = (points) => ({ poly: points });

/** Bounding rectangle of a panel, polygon or not, in fractions of canvas. */
function panelBounds(p) {
  if (!p.poly) return p;
  const xs = p.poly.map(([px]) => px);
  const ys = p.poly.map(([, py]) => py);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { x: left, y: top, w: Math.max(...xs) - left, h: Math.max(...ys) - top };
}

/**
 * Panel shapes and the title band for each layout. Fractions of the
 * canvas; `gap` is the hairline between panels. Polygon panels are the
 * slashed and diagonal cuts — the title rides over the art on those.
 */
export function layoutPanels(layout) {
  const gap = 0.007;
  const band = (top = 0.78) => box(0, top, 1, 1 - top);
  switch (layout) {
    case 'hero':
      return {
        panels: [
          box(0, 0, 1, 0.58),
          box(0, 0.587, 1 / 3 - gap, 0.185),
          box(1 / 3 + gap / 2, 0.587, 1 / 3 - gap, 0.185),
          box(2 / 3 + gap / 2, 0.587, 1 / 3 - gap, 0.185),
        ],
        title: band(),
      };
    case 'grid4':
      return {
        panels: [
          box(0, 0, 0.5 - gap / 2, 0.5 - gap / 2),
          box(0.5 + gap / 2, 0, 0.5 - gap / 2, 0.5 - gap / 2),
          box(0, 0.5 + gap / 2, 0.5 - gap / 2, 0.5 - gap / 2),
          box(0.5 + gap / 2, 0.5 + gap / 2, 0.5 - gap / 2, 0.5 - gap / 2),
        ],
        title: band(),
      };
    case 'grid9':
      return {
        panels: Array.from({ length: 9 }, (_, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          return box(
            col / 3 + (col === 0 ? 0 : gap / 2),
            row / 3 + (row === 0 ? 0 : gap / 2),
            1 / 3 - gap,
            1 / 3 - gap,
          );
        }),
        title: band(),
      };
    case 'tilt':
      return {
        panels: [box(0.11, 0.04, 0.78, 0.62)],
        title: box(0, 0.7, 1, 0.3),
        tilt: -0.06,
      };
    case 'slash':
      // Three bands sliced on the diagonal; the title sits over the art.
      return {
        panels: [
          cut([[0, 0], [1, 0], [1, 0.3], [0, 0.38]]),
          cut([[0, 0.38], [1, 0.3], [1, 0.58], [0, 0.66]]),
          cut([[0, 0.66], [1, 0.58], [1, 0.82], [0, 0.82]]),
        ],
        title: box(0, 0.64, 1, 0.36),
        keyArt: true,
      };
    case 'cast6':
      return {
        panels: [
          box(0, 0, 1, 0.5),
          ...Array.from({ length: 5 }, (_, i) =>
            box(i * 0.2 + (i === 0 ? 0 : gap / 2), 0.507, 0.2 - gap, 0.26)),
        ],
        title: band(),
      };
    case 'comic':
      return {
        panels: [
          box(0, 0, 1, 0.4),
          box(0, 0.407, 1 / 3 - gap, 0.36),
          box(1 / 3 + gap / 2, 0.407, 1 / 3 - gap, 0.36),
          box(2 / 3 + gap / 2, 0.407, 1 / 3 - gap, 0.36),
        ],
        title: band(),
      };
    case 'duo':
      // Two triangles sharing a single diagonal cut.
      return {
        panels: [
          cut([[0, 0], [1, 0], [1, 0.78]]),
          cut([[0, 0], [1, 0.78], [0, 0.78]]),
        ],
        title: band(),
      };
    case 'triptych':
      return {
        panels: [
          box(0, 0, 0.29, 0.76),
          box(0.297, 0, 0.406, 0.76),
          box(0.71, 0, 0.29, 0.76),
        ],
        title: band(),
      };
    case 'full':
    default:
      return { panels: [box(0, 0, 1, 1)], title: box(0, 0.74, 1, 0.26) };
  }
}

function insidePoly(px, py, points) {
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

/** Index of the panel holding canvas point (x, y), or -1 when none does. */
export function panelAtPoint(layout, x, y, w, h) {
  const { panels, tilt } = layoutPanels(layout);
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    let fx = x / w;
    let fy = y / h;
    if (tilt && i === 0) {
      // Un-rotate the point around the tilted panel's centre.
      const b = panelBounds(p);
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const c = Math.cos(-tilt);
      const s = Math.sin(-tilt);
      const dx = fx - cx;
      const dy = fy - cy;
      fx = cx + dx * c - dy * s;
      fy = cy + dx * s + dy * c;
    }
    if (p.poly) {
      if (insidePoly(fx, fy, p.poly)) return i;
    } else if (fx >= p.x && fx <= p.x + p.w && fy >= p.y && fy <= p.y + p.h) {
      return i;
    }
  }
  return -1;
}

/**
 * Face-aware fill: faces usually sit in the upper centre of a photo, so
 * instead of a dead-centre cover fit the crop is centre-weighted with a
 * small upward nudge, and a slightly larger zoom for photos whose shape
 * fights the panel. Returns the zoom and pan offsets for a fresh fill.
 */
export function smartFill(img, panelW, panelH) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const panelAspect = panelW / panelH;
  const imgAspect = iw / ih;
  const tallInWide = imgAspect < panelAspect * 0.85;
  const wideInTall = imgAspect > panelAspect * 1.3;
  return {
    zoom: tallInWide ? 1.08 : wideInTall ? 1.05 : 1,
    ox: 0,
    oy: tallInWide ? -0.12 : 0,
  };
}

/** Paints one photo into a panel rect, honouring zoom, pan, flip, rotate. */
function paintPhoto(ctx, img, rx, ry, rw, rh, slot) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(rw / iw, rh / ih) * (slot.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const cx = rx + rw / 2 + (slot.ox || 0) * rw;
  const cy = ry + rh / 2 + (slot.oy || 0) * rh;
  ctx.save();
  ctx.translate(cx, cy);
  if (slot.rot) ctx.rotate((slot.rot * Math.PI) / 180);
  if (slot.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function paintEmptyPanel(ctx, x, y, w, h, index, canvasW) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#421358');
  g.addColorStop(1, '#8a2066');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const dash = Math.max(6, canvasW * 0.008);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.setLineDash([dash, dash]);
  ctx.lineWidth = Math.max(2, canvasW * 0.002);
  ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `${Math.max(18, h * 0.13)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`+ PHOTO ${index + 1}`, x + w / 2, y + h / 2);
}

function paintTiltBackdrop(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, '#2b0f3d');
  sky.addColorStop(0.45, '#c22a7a');
  sky.addColorStop(0.78, '#ff7a3c');
  sky.addColorStop(1, '#ffc46b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sun = ctx.createRadialGradient(w * 0.7, h * 0.28, 8, w * 0.7, h * 0.28, w * 0.32);
  sun.addColorStop(0, 'rgba(255,242,180,0.95)');
  sun.addColorStop(0.5, 'rgba(255,150,80,0.5)');
  sun.addColorStop(1, 'rgba(255,150,80,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  // A retro sun-striped horizon.
  ctx.fillStyle = 'rgba(20,8,31,0.18)';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(0, h * (0.6 + i * 0.03), w, h * 0.009);
  }
}

/** Vertical (or diagonal) gradient from [offset, colour] stops. */
function fade(ctx, w, h, stops, diagonal = false) {
  const g = diagonal
    ? ctx.createLinearGradient(0, 0, w, h)
    : ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  return g;
}

function radial(ctx, cx, cy, r, inner, outer) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

// Each grade is a stack of blend-mode washes over the photos. Nothing
// here touches the photos themselves — take the grade away and the
// originals are exactly as they were.
const GRADE_WASHES = {
  sunset: [
    { blend: 'overlay', paint: (ctx, w, h) => fade(ctx, w, h, [
      [0, 'rgba(255,190,90,0.15)'], [0.6, 'rgba(255,90,120,0.22)'], [1, 'rgba(255,60,110,0.34)'],
    ]) },
    { blend: 'source-over', paint: (ctx, w, h) => fade(ctx, w, h, [
      [0, 'rgba(255,60,110,0)'], [1, 'rgba(255,60,110,0.16)'],
    ]) },
  ],
  neon: [
    { blend: 'overlay', paint: (ctx, w, h) => radial(ctx, 0, 0, w * 0.9, 'rgba(255,0,180,0.34)', 'rgba(255,0,180,0)') },
    { blend: 'overlay', paint: (ctx, w, h) => radial(ctx, w, h, w * 0.9, 'rgba(0,220,255,0.34)', 'rgba(0,220,255,0)') },
  ],
  vice: [
    { blend: 'overlay', paint: (ctx, w, h) => fade(ctx, w, h, [
      [0, 'rgba(0,229,255,0.2)'], [0.5, 'rgba(255,46,136,0.14)'], [1, 'rgba(255,46,136,0.3)'],
    ], true) },
    { blend: 'soft-light', paint: (ctx, w, h) => fade(ctx, w, h, [
      [0, 'rgba(255,0,150,0.5)'], [1, 'rgba(0,200,255,0.5)'],
    ], true) },
  ],
  heat: [
    { blend: 'overlay', paint: (ctx, w, h) => fade(ctx, w, h, [
      [0, 'rgba(255,140,0,0.26)'], [1, 'rgba(255,40,0,0.3)'],
    ]) },
    { blend: 'source-over', paint: (ctx, w, h) => fade(ctx, w, h, [
      [0, 'rgba(255,120,0,0.1)'], [1, 'rgba(255,40,0,0.1)'],
    ], true) },
  ],
  ink: [
    // Poster Ink: pull the colour out, lift the contrast, and let the
    // halftone dots and ink strokes (painted later) do the painterly work.
    { blend: 'saturation', paint: (ctx, w, h) => fade(ctx, w, h, [
      [0, 'rgba(128,128,128,0.55)'], [1, 'rgba(128,128,128,0.55)'],
    ]) },
    { blend: 'overlay', paint: (ctx, w, h) => fade(ctx, w, h, [
      [0, 'rgba(255,214,140,0.16)'], [0.55, 'rgba(255,120,90,0.1)'], [1, 'rgba(20,10,40,0.3)'],
    ]) },
    { blend: 'soft-light', paint: (ctx, w, h) => fade(ctx, w, h, [
      [0, 'rgba(255,255,255,0.35)'], [1, 'rgba(0,0,0,0.45)'],
    ]) },
  ],
  golden: [
    { blend: 'overlay', paint: (ctx, w, h) => fade(ctx, w, h, [
      [0, 'rgba(255,200,80,0.22)'], [0.6, 'rgba(255,150,50,0.18)'], [1, 'rgba(180,80,20,0.28)'],
    ]) },
    { blend: 'screen', paint: (ctx, w, h) => radial(ctx, w * 0.82, h * 0.12, w * 0.45, 'rgba(255,236,170,0.5)', 'rgba(255,236,170,0)') },
  ],
  noir: [
    { blend: 'overlay', paint: (ctx, w, h) => fade(ctx, w, h, [
      [0, 'rgba(0,40,60,0.34)'], [0.5, 'rgba(10,10,30,0.18)'], [1, 'rgba(255,46,136,0.26)'],
    ], true) },
    { blend: 'soft-light', paint: (ctx, w, h) => fade(ctx, w, h, [
      [0, 'rgba(0,229,255,0.4)'], [1, 'rgba(255,0,120,0.4)'],
    ], true) },
  ],
};

/** The colour grade: gradient washes over the photos, never a change to them. */
export function applyGrade(ctx, grade, w, h) {
  for (const layer of GRADE_WASHES[grade] ?? GRADE_WASHES.sunset) {
    ctx.save();
    ctx.globalCompositeOperation = layer.blend;
    ctx.fillStyle = layer.paint(ctx, w, h);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

// A tiny seeded random stream, so the film grain is identical on every
// export of the same cover instead of flickering between runs.
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function paintGrain(ctx, w, h) {
  if (!grainTile) {
    const tile = document.createElement('canvas');
    tile.width = 140;
    tile.height = 140;
    const tctx = tile.getContext('2d');
    const data = tctx.createImageData(140, 140);
    const rand = seededRandom(20261121);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 100 + Math.floor(rand() * 155);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    tctx.putImageData(data, 0, 0);
    grainTile = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = grainTile;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function paintVignette(ctx, w, h, strength = 0.38) {
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function paintHalftone(ctx, zone, w, alpha = 0.14) {
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
function paintInkStrokes(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(15,5,25,0.5)';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, w * 0.004);
  const strokes = [
    [0.06, 0.1, 0.3, 0.04, 0.42, 0.12],
    [0.62, 0.86, 0.78, 0.8, 0.94, 0.9],
    [0.04, 0.55, 0.2, 0.5, 0.3, 0.58],
  ];
  for (const [x1, y1, x2, y2, x3, y3] of strokes) {
    ctx.beginPath();
    ctx.moveTo(x1 * w, y1 * h);
    ctx.quadraticCurveTo(x2 * w, y2 * h, x3 * w, y3 * h);
    ctx.stroke();
  }
  ctx.restore();
}

/** A simple procedural palm silhouette, drawn for the Palm Noir grade. */
function paintPalm(ctx, x, y, s, leanLeft) {
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
    ctx.quadraticCurveTo(
      34 + Math.cos(ang) * len * 0.5, -130 + Math.sin(ang) * len * 0.3 - 14, tx, ty);
    ctx.stroke();
  }
  ctx.restore();
}

function paintStar(ctx, cx, cy, r, lit) {
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
  if (lit) {
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
export function paintHeatStars(ctx, cx, cy, size, heat) {
  const gap = size * 2.4;
  const startX = cx - (gap * 4) / 2;
  for (let i = 0; i < 5; i++) {
    paintStar(ctx, startX + i * gap, cy, size, i < heat);
  }
}

function paintBadge(ctx, text, w, h) {
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

function paintTitleBand(ctx, state, zone, w, h, grade) {
  const { x: zx, y: zy, w: zw, h: zh } = zone;
  const scrim = ctx.createLinearGradient(0, zy, 0, zy + zh);
  scrim.addColorStop(0, 'rgba(12,4,20,0)');
  scrim.addColorStop(0.35, 'rgba(12,4,20,0.62)');
  scrim.addColorStop(1, 'rgba(12,4,20,0.92)');
  ctx.fillStyle = scrim;
  ctx.fillRect(zx, zy, zw, zh);
  paintHalftone(ctx, { x: zx, y: zy, w: zw, h: zh }, w, grade === 'ink' ? 0.3 : 0.14);
  if (grade === 'noir') {
    paintPalm(ctx, w * 0.03, zy + zh * 0.98, zh / 150, false);
    paintPalm(ctx, w * 0.97, zy + zh * 0.98, zh / 170, true);
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
    // Chromatic offset: pink and cyan ghosts behind the white face.
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
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = size * 0.7;
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(sub, w / 2, zy + zh * 0.68);
    ctx.shadowBlur = 0;
  }
  paintHeatStars(ctx, w / 2, zy + zh * 0.9, Math.max(8, zh * 0.07), state.heat);
}

function tracePanel(ctx, p, w, h) {
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

  const { panels, title, tilt } = layoutPanels(state.layout);
  if (state.layout === 'tilt') paintTiltBackdrop(ctx, w, h);

  panels.forEach((p, i) => {
    const b = panelBounds(p);
    const rx = b.x * w;
    const ry = b.y * h;
    const rw = b.w * w;
    const rh = b.h * h;
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
      if (slot && slot.img) paintPhoto(ctx, slot.img, 0, 0, rw, rh, slot);
      else paintEmptyPanel(ctx, 0, 0, rw, rh, i, w);
    } else {
      tracePanel(ctx, p, w, h);
      ctx.clip();
      if (slot && slot.img) paintPhoto(ctx, slot.img, rx, ry, rw, rh, slot);
      else paintEmptyPanel(ctx, rx, ry, rw, rh, i, w);
    }
    ctx.restore();
    if (!(tilt && i === 0)) {
      tracePanel(ctx, p, w, h);
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
  if (state.grade === 'ink') paintInkStrokes(ctx, w, h);
  paintGrain(ctx, w, h);
  paintVignette(ctx, w, h, state.grade === 'noir' ? 0.5 : 0.38);
  paintTitleBand(ctx, state, {
    x: title.x * w,
    y: title.y * h,
    w: title.w * w,
    h: title.h * h,
  }, w, h, state.grade);
  paintBadge(ctx, state.badge, w, h);
  return canvas;
}
