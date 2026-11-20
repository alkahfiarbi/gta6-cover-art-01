// Vice Cover Studio v2 — the editor wiring: photos in, panels, layouts,
// grades, words, undo/redo, Surprise me, export. `?shot=` hands control
// to a fixed scene instead (./shots.js). Photos are read on this machine
// and never uploaded anywhere.
import {
  drawCover, smartFill, layoutPanels, panelAtPoint, slotCount,
  GRADE_LABELS, LAYOUT_LABELS, SIZES,
} from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');
const trayEl = $('tray');
const titleEl = $('title');
const subtitleEl = $('subtitle');
const badgeEl = $('badge');
const heatEl = $('heat');
const heatValueEl = $('heatValue');
const zoomEl = $('zoom');
const rotateEl = $('rotate');
const rotateValueEl = $('rotateValue');
const flipBtn = $('flipPanel');
const panelNameEl = $('panelName');
const undoBtn = $('undoBtn');
const redoBtn = $('redoBtn');
const surpriseBtn = $('surpriseBtn');
const smartFillEl = $('smartFill');

const SAMPLES = [
  'samples/sunset-portrait.jpg',
  'samples/neon-street.jpg',
  'samples/pier-friends.jpg',
  'samples/sunset-pier.jpg',
  'samples/neon-alley.jpg',
  'samples/rooftop-palms.jpg',
  'samples/coast-drive.jpg',
  'samples/pier-sunset.jpg',
  'samples/rooftop-neon.jpg',
  'samples/convertible-coast.jpg',
  'samples/boardwalk-duo.jpg',
];

const SURPRISE_LINES = [
  ['SUNSET HEIST', 'vice city nights'],
  ['NEON GETAWAY', 'outrun the dawn'],
  ['PALM SHADOWS', 'leonida state'],
  ['GOLDEN COAST', 'two tickets south'],
  ['MIDNIGHT RUN', 'no brakes, no mercy'],
  ['VICE ROYALE', 'the city is ours'],
  ['HEAT WAVE', 'summer never ends'],
  ['AFTERGLOW', 'chasing the last light'],
];

function freshSlot() {
  return { img: null, photo: -1, zoom: 1, ox: 0, oy: 0, flip: false, rot: 0 };
}

const state = {
  layout: 'hero',
  grade: 'sunset',
  size: '1920x1080',
  title: 'SUNSET HEIST',
  subtitle: 'vice city nights',
  badge: 'VICE CITY',
  heat: 4,
  smartFill: true,
  slots: Array.from({ length: 9 }, freshSlot),
};

let trayPhotos = []; // { img, name, url }
let chosenTray = -1;
let chosenPanel = 0;

// ---- Undo / redo: each step is one snapshot of the whole editor. ----
const undoStack = [];
const redoStack = [];

function takeSnapshot() {
  return JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    size: state.size,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    heat: state.heat,
    smartFill: state.smartFill,
    slots: state.slots.map((s) => ({
      photo: s.photo, zoom: s.zoom, ox: s.ox, oy: s.oy, flip: s.flip, rot: s.rot,
    })),
  });
}

function loadSnapshot(json) {
  const snap = JSON.parse(json);
  state.layout = snap.layout;
  state.grade = snap.grade;
  state.size = snap.size;
  state.title = snap.title;
  state.subtitle = snap.subtitle;
  state.badge = snap.badge;
  state.heat = snap.heat;
  state.smartFill = snap.smartFill;
  state.slots = snap.slots.map((s) => {
    const slot = freshSlot();
    slot.photo = s.photo;
    slot.img = s.photo >= 0 && trayPhotos[s.photo] ? trayPhotos[s.photo].img : null;
    slot.zoom = s.zoom;
    slot.ox = s.ox;
    slot.oy = s.oy;
    slot.flip = s.flip;
    slot.rot = s.rot;
    return slot;
  });
  syncForm();
}

function checkpoint() {
  const snap = takeSnapshot();
  // A snapshot identical to the last one is no step at all: skip it, so
  // arming a slider or a text field on focus never litters the history.
  if (undoStack.length > 0 && undoStack[undoStack.length - 1] === snap) return;
  undoStack.push(snap);
  if (undoStack.length > 80) undoStack.shift();
  redoStack.length = 0;
  syncHistoryButtons();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(takeSnapshot());
  loadSnapshot(undoStack.pop());
  repaint();
  syncHistoryButtons();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(takeSnapshot());
  loadSnapshot(redoStack.pop());
  repaint();
  syncHistoryButtons();
}

function syncHistoryButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
  undoBtn.textContent = `↩ Undo${undoStack.length ? ` (${undoStack.length})` : ''}`;
  redoBtn.textContent = `↪ Redo${redoStack.length ? ` (${redoStack.length})` : ''}`;
}

function repaint() {
  drawCover(canvas, state);
}

function starsLabel(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function syncForm() {
  document.querySelector(`input[name="layout"][value="${state.layout}"]`).checked = true;
  document.querySelector(`input[name="grade"][value="${state.grade}"]`).checked = true;
  document.querySelector(`input[name="size"][value="${state.size}"]`).checked = true;
  titleEl.value = state.title;
  subtitleEl.value = state.subtitle;
  badgeEl.value = state.badge;
  heatEl.value = String(state.heat);
  heatValueEl.textContent = starsLabel(state.heat);
  smartFillEl.checked = state.smartFill;
  syncPanelControls();
}

function syncPanelControls() {
  const slot = state.slots[chosenPanel];
  zoomEl.value = String(slot.zoom);
  rotateEl.value = String(slot.rot);
  rotateValueEl.textContent = `${slot.rot}°`;
  flipBtn.textContent = slot.flip ? 'Unflip panel' : 'Flip panel';
  panelNameEl.textContent = String(chosenPanel + 1);
  heatValueEl.textContent = starsLabel(state.heat);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function drawTray() {
  trayEl.innerHTML = '';
  trayPhotos.forEach((photo, i) => {
    const fig = document.createElement('figure');
    if (i === chosenTray) fig.classList.add('selected');
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.name;
    const cap = document.createElement('figcaption');
    cap.textContent = photo.name;
    fig.append(img, cap);
    fig.addEventListener('click', () => {
      chosenTray = i;
      checkpoint();
      putPhotoInPanel(i);
      drawTray();
    });
    trayEl.append(fig);
  });
}

/** Puts tray photo `i` into the selected panel, smart-filled when enabled. */
function putPhotoInPanel(i) {
  const photo = trayPhotos[i];
  if (!photo) return;
  const slot = state.slots[chosenPanel];
  slot.img = photo.img;
  slot.photo = i;
  slot.flip = false;
  slot.rot = 0;
  if (state.smartFill) {
    const { panels } = layoutPanels(state.layout);
    const p = panels[chosenPanel];
    const bw = p.poly
      ? (Math.max(...p.poly.map(([x]) => x)) - Math.min(...p.poly.map(([x]) => x))) * canvas.width
      : p.w * canvas.width;
    const bh = p.poly
      ? (Math.max(...p.poly.map(([, y]) => y)) - Math.min(...p.poly.map(([, y]) => y))) * canvas.height
      : p.h * canvas.height;
    const fill = smartFill(photo.img, bw, bh);
    slot.zoom = fill.zoom;
    slot.ox = fill.ox;
    slot.oy = fill.oy;
  } else {
    slot.zoom = 1;
    slot.ox = 0;
    slot.oy = 0;
  }
  repaint();
  syncPanelControls();
}

async function addFiles(files) {
  let added = false;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      trayPhotos.push({ img, name: file.name.replace(/\.[^.]+$/, ''), url });
      added = true;
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  if (!added) return;
  checkpoint();
  if (chosenTray < 0) chosenTray = 0;
  drawTray();
  repaint();
}

async function loadSamples() {
  let added = false;
  for (const src of SAMPLES) {
    if (trayPhotos.some((p) => p.url === src)) continue;
    try {
      const img = await loadImage(src);
      trayPhotos.push({ img, name: src.split('/').pop().replace('.jpg', ''), url: src });
      added = true;
    } catch {
      // A missing sample never blocks the editor.
    }
  }
  if (!added && trayPhotos.length === 0) return;
  checkpoint();
  chosenTray = 0;
  drawTray();
  const count = slotCount(state.layout);
  for (let i = 0; i < count; i++) {
    const slot = state.slots[i];
    if (!slot.img) {
      chosenPanel = i;
      putPhotoInPanel(i % trayPhotos.length);
    }
  }
  chosenPanel = 0;
  repaint();
  syncPanelControls();
}

/** One random cover: layout, grade, words, heat and a shuffled photo fill. */
function surpriseMe() {
  if (trayPhotos.length === 0) {
    statusEl.textContent = 'Load the sample photos first, then Surprise me.';
    return;
  }
  checkpoint();
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(Object.keys(LAYOUT_LABELS));
  state.grade = pick(Object.keys(GRADE_LABELS));
  const [title, subtitle] = pick(SURPRISE_LINES);
  state.title = title;
  state.subtitle = subtitle;
  state.heat = 3 + Math.floor(Math.random() * 3);
  const order = trayPhotos.map((_, i) => i).sort(() => Math.random() - 0.5);
  const count = slotCount(state.layout);
  for (let i = 0; i < count; i++) {
    chosenPanel = i;
    putPhotoInPanel(order[i % order.length]);
    state.slots[i].zoom = 1 + Math.random() * 0.35;
  }
  chosenPanel = 0;
  syncForm();
  repaint();
  statusEl.textContent = `Surprise! ${LAYOUT_LABELS[state.layout]} · ${GRADE_LABELS[state.grade]} · “${title}”.`;
}

$('photoFiles').addEventListener('change', (e) => {
  addFiles([...e.target.files]);
  e.target.value = '';
});
$('loadSamples').addEventListener('click', loadSamples);
$('fillAll').addEventListener('click', () => {
  const photo = trayPhotos[chosenTray];
  if (!photo) {
    statusEl.textContent = 'Add a photo first, then fill every panel with it.';
    return;
  }
  checkpoint();
  const count = slotCount(state.layout);
  for (let i = 0; i < count; i++) {
    chosenPanel = i;
    putPhotoInPanel(chosenTray);
  }
  chosenPanel = 0;
  syncPanelControls();
  repaint();
  statusEl.textContent = `Every panel now shows ${photo.name}.`;
});
smartFillEl.addEventListener('change', () => {
  checkpoint();
  state.smartFill = smartFillEl.checked;
  statusEl.textContent = state.smartFill
    ? 'Smart fill on — new photos are cropped face-aware.'
    : 'Smart fill off — new photos are centred.';
});

document.querySelectorAll('input[name="layout"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    checkpoint();
    state.layout = radio.value;
    chosenPanel = 0;
    repaint();
    syncPanelControls();
  });
});
document.querySelectorAll('input[name="grade"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    checkpoint();
    state.grade = radio.value;
    repaint();
  });
});
document.querySelectorAll('input[name="size"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    checkpoint();
    state.size = radio.value;
    repaint();
  });
});

titleEl.addEventListener('input', () => { state.title = titleEl.value; repaint(); });
subtitleEl.addEventListener('input', () => { state.subtitle = subtitleEl.value; repaint(); });
badgeEl.addEventListener('input', () => { state.badge = badgeEl.value; repaint(); });
// Arm the history on focus — before the first keystroke — so undo returns
// to the words as they were before this edit began.
for (const el of [titleEl, subtitleEl, badgeEl]) {
  el.addEventListener('focus', checkpoint);
}
heatEl.addEventListener('input', () => {
  state.heat = Number(heatEl.value);
  heatValueEl.textContent = starsLabel(state.heat);
  repaint();
});
// Arm sliders on pointerdown / keydown, before the value moves.
for (const el of [heatEl, zoomEl, rotateEl]) {
  el.addEventListener('pointerdown', checkpoint);
  el.addEventListener('keydown', checkpoint);
}
zoomEl.addEventListener('input', () => {
  state.slots[chosenPanel].zoom = Number(zoomEl.value);
  repaint();
});
rotateEl.addEventListener('input', () => {
  state.slots[chosenPanel].rot = Number(rotateEl.value);
  rotateValueEl.textContent = `${rotateEl.value}°`;
  repaint();
});
flipBtn.addEventListener('click', () => {
  checkpoint();
  const slot = state.slots[chosenPanel];
  slot.flip = !slot.flip;
  syncPanelControls();
  repaint();
});
$('resetPanel').addEventListener('click', () => {
  checkpoint();
  const slot = state.slots[chosenPanel];
  slot.zoom = 1;
  slot.ox = 0;
  slot.oy = 0;
  slot.flip = false;
  slot.rot = 0;
  repaint();
  syncPanelControls();
});

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
surpriseBtn.addEventListener('click', surpriseMe);
document.addEventListener('keydown', (e) => {
  const inField = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '');
  if (!e.ctrlKey && !e.metaKey) return;
  if (inField) return;
  if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
    e.preventDefault();
    redo();
  }
});

// Click selects a panel; dragging pans its photo.
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  const scaleX = canvas.width / r.width;
  const scaleY = canvas.height / r.height;
  return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAtPoint(state.layout, p.x, p.y, canvas.width, canvas.height);
  if (hit < 0) return;
  if (hit !== chosenPanel) {
    chosenPanel = hit;
    syncPanelControls();
  }
  canvas.setPointerCapture(e.pointerId);
  drag = { x: p.x, y: p.y, ox: state.slots[hit].ox, oy: state.slots[hit].oy, moved: false };
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const { panels } = layoutPanels(state.layout);
  const pbox = panels[chosenPanel];
  const bw = pbox.poly
    ? Math.max(...pbox.poly.map(([x]) => x)) - Math.min(...pbox.poly.map(([x]) => x))
    : pbox.w;
  const bh = pbox.poly
    ? Math.max(...pbox.poly.map(([, y]) => y)) - Math.min(...pbox.poly.map(([, y]) => y))
    : pbox.h;
  const dx = (p.x - drag.x) / (bw * canvas.width);
  const dy = (p.y - drag.y) / (bh * canvas.height);
  if (Math.abs(dx) + Math.abs(dy) > 0.002 && !drag.moved) {
    drag.moved = true;
    checkpoint();
  }
  const slot = state.slots[chosenPanel];
  slot.ox = Math.max(-0.6, Math.min(0.6, drag.ox + dx));
  slot.oy = Math.max(-0.6, Math.min(0.6, drag.oy + dy));
  repaint();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

/** Renders the cover at the chosen size and returns its PNG blob. */
export function exportCoverPNG() {
  const off = document.createElement('canvas');
  drawCover(off, state);
  return new Promise((resolve, reject) => {
    off.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('export failed'));
    }, 'image/png');
  });
}

$('export').addEventListener('click', async () => {
  statusEl.textContent = 'Exporting…';
  try {
    const blob = await exportCoverPNG();
    const [w, h] = SIZES[state.size];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    statusEl.textContent = `Saved vice-cover-${w}x${h}.png (${(blob.size / 1024).toFixed(0)} KiB).`;
  } catch {
    statusEl.textContent = 'Export failed — try another photo.';
  }
});

// Wait for the display fonts, then draw (and redraw once they arrive).
async function waitForFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('60px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // Fallback fonts still draw; the scene is usable either way.
  }
}

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { state, loadImage, loadSamples, repaint, exportCoverPNG, trayPhotos });
} else {
  waitForFonts().then(repaint);
  repaint();
  syncHistoryButtons();
}
