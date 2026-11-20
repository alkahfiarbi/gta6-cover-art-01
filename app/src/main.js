// Vice Cover Studio v2 — wires the editor: photos in, panels, layouts,
// grades, words, undo/redo, Surprise me, export. `?shot=` sets up a fixed
// scene for a screenshot instead (./shots.js). Photos are read on this
// machine and never uploaded anywhere.
import {
  drawCover, faceAwareFill, layoutGeometry, panelAt, panelCount,
  GRADE_NAMES, LAYOUT_NAMES, SIZES,
} from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const trayEl = document.getElementById('tray');
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const badgeEl = document.getElementById('badge');
const heatEl = document.getElementById('heat');
const heatValueEl = document.getElementById('heatValue');
const zoomEl = document.getElementById('zoom');
const rotateEl = document.getElementById('rotate');
const rotateValueEl = document.getElementById('rotateValue');
const flipBtn = document.getElementById('flipPanel');
const panelNameEl = document.getElementById('panelName');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const surpriseBtn = document.getElementById('surpriseBtn');
const smartFillEl = document.getElementById('smartFill');

const SAMPLES = [
  'samples/sunset-portrait.jpg',
  'samples/neon-street.jpg',
  'samples/pier-friends.jpg',
  'samples/pier-sunset.jpg',
  'samples/rooftop-neon.jpg',
  'samples/convertible-coast.jpg',
  'samples/boardwalk-duo.jpg',
];

const SURPRISE_TITLES = [
  ['SUNSET HEIST', 'vice city nights'],
  ['NEON GETAWAY', 'outrun the dawn'],
  ['PALM SHADOWS', 'leonida state'],
  ['GOLDEN COAST', 'two tickets south'],
  ['MIDNIGHT RUN', 'no brakes, no mercy'],
  ['VICE ROYALE', 'the city is ours'],
  ['HEAT WAVE', 'summer never ends'],
  ['AFTERGLOW', 'chasing the last light'],
];

function blankSlot() {
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
  slots: Array.from({ length: 9 }, blankSlot),
};

let trayPhotos = []; // { img, name, url }
let selectedTray = -1;
let selectedPanel = 0;

// ---- History: every undoable step is one snapshot of the whole state. ----
const past = [];
const future = [];

function snapshot() {
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

function restore(json) {
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
    const slot = blankSlot();
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

function pushHistory() {
  const snap = snapshot();
  // A snapshot identical to the last one is no step at all: skip it, so
  // arming a slider or a text field on focus never litters the history.
  if (past.length > 0 && past[past.length - 1] === snap) return;
  past.push(snap);
  if (past.length > 80) past.shift();
  future.length = 0;
  syncHistoryButtons();
}

function undo() {
  if (past.length === 0) return;
  future.push(snapshot());
  restore(past.pop());
  redraw();
  syncHistoryButtons();
}

function redo() {
  if (future.length === 0) return;
  past.push(snapshot());
  restore(future.pop());
  redraw();
  syncHistoryButtons();
}

function syncHistoryButtons() {
  undoBtn.disabled = past.length === 0;
  redoBtn.disabled = future.length === 0;
  undoBtn.textContent = `↩ Undo${past.length ? ` (${past.length})` : ''}`;
  redoBtn.textContent = `↪ Redo${future.length ? ` (${future.length})` : ''}`;
}

function redraw() {
  drawCover(canvas, state);
}

function heatLabel(n) {
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
  heatValueEl.textContent = heatLabel(state.heat);
  smartFillEl.checked = state.smartFill;
  syncPanelControls();
}

function syncPanelControls() {
  const slot = state.slots[selectedPanel];
  zoomEl.value = String(slot.zoom);
  rotateEl.value = String(slot.rot);
  rotateValueEl.textContent = `${slot.rot}°`;
  flipBtn.textContent = slot.flip ? 'Unflip panel' : 'Flip panel';
  panelNameEl.textContent = String(selectedPanel + 1);
  heatValueEl.textContent = heatLabel(state.heat);
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

function renderTray() {
  trayEl.innerHTML = '';
  trayPhotos.forEach((photo, i) => {
    const fig = document.createElement('figure');
    if (i === selectedTray) fig.classList.add('selected');
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.name;
    const cap = document.createElement('figcaption');
    cap.textContent = photo.name;
    fig.append(img, cap);
    fig.addEventListener('click', () => {
      selectedTray = i;
      pushHistory();
      assignTrayToPanel(i);
      renderTray();
    });
    trayEl.append(fig);
  });
}

/** Puts tray photo `i` into the selected panel, face-aware when enabled. */
function assignTrayToPanel(i) {
  const photo = trayPhotos[i];
  if (!photo) return;
  const slot = state.slots[selectedPanel];
  slot.img = photo.img;
  slot.photo = i;
  slot.flip = false;
  slot.rot = 0;
  if (state.smartFill) {
    const { panels } = layoutGeometry(state.layout);
    const box = panels[selectedPanel];
    const bw = box.poly
      ? (Math.max(...box.poly.map(([x]) => x)) - Math.min(...box.poly.map(([x]) => x))) * canvas.width
      : box.w * canvas.width;
    const bh = box.poly
      ? (Math.max(...box.poly.map(([, y]) => y)) - Math.min(...box.poly.map(([, y]) => y))) * canvas.height
      : box.h * canvas.height;
    const fill = faceAwareFill(photo.img, bw, bh);
    slot.zoom = fill.zoom;
    slot.ox = fill.ox;
    slot.oy = fill.oy;
  } else {
    slot.zoom = 1;
    slot.ox = 0;
    slot.oy = 0;
  }
  redraw();
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
  pushHistory();
  if (selectedTray < 0) selectedTray = 0;
  renderTray();
  redraw();
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
  pushHistory();
  selectedTray = 0;
  renderTray();
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    const slot = state.slots[i];
    if (!slot.img) {
      selectedPanel = i;
      assignTrayToPanel(i % trayPhotos.length);
    }
  }
  selectedPanel = 0;
  redraw();
  syncPanelControls();
}

/** One random cover: layout, grade, words, heat and a shuffled photo fill. */
function surpriseMe() {
  if (trayPhotos.length === 0) {
    statusEl.textContent = 'Load the sample photos first, then Surprise me.';
    return;
  }
  pushHistory();
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(Object.keys(LAYOUT_NAMES));
  state.grade = pick(Object.keys(GRADE_NAMES));
  const [title, subtitle] = pick(SURPRISE_TITLES);
  state.title = title;
  state.subtitle = subtitle;
  state.heat = 3 + Math.floor(Math.random() * 3);
  const order = trayPhotos.map((_, i) => i).sort(() => Math.random() - 0.5);
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    selectedPanel = i;
    assignTrayToPanel(order[i % order.length]);
    state.slots[i].zoom = 1 + Math.random() * 0.35;
  }
  selectedPanel = 0;
  syncForm();
  redraw();
  statusEl.textContent = `Surprise! ${LAYOUT_NAMES[state.layout]} · ${GRADE_NAMES[state.grade]} · “${title}”.`;
}

document.getElementById('photoFiles').addEventListener('change', (e) => {
  addFiles([...e.target.files]);
  e.target.value = '';
});
document.getElementById('loadSamples').addEventListener('click', loadSamples);
document.getElementById('fillAll').addEventListener('click', () => {
  const photo = trayPhotos[selectedTray];
  if (!photo) {
    statusEl.textContent = 'Add a photo first, then fill every panel with it.';
    return;
  }
  pushHistory();
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    selectedPanel = i;
    assignTrayToPanel(selectedTray);
  }
  selectedPanel = 0;
  syncPanelControls();
  redraw();
  statusEl.textContent = `Every panel now shows ${photo.name}.`;
});
smartFillEl.addEventListener('change', () => {
  pushHistory();
  state.smartFill = smartFillEl.checked;
  statusEl.textContent = state.smartFill
    ? 'Smart fill on — new photos are cropped face-aware.'
    : 'Smart fill off — new photos are centred.';
});

document.querySelectorAll('input[name="layout"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    pushHistory();
    state.layout = radio.value;
    selectedPanel = 0;
    redraw();
    syncPanelControls();
  });
});
document.querySelectorAll('input[name="grade"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    pushHistory();
    state.grade = radio.value;
    redraw();
  });
});
document.querySelectorAll('input[name="size"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    pushHistory();
    state.size = radio.value;
    redraw();
  });
});
titleEl.addEventListener('input', () => { state.title = titleEl.value; redraw(); });
subtitleEl.addEventListener('input', () => { state.subtitle = subtitleEl.value; redraw(); });
badgeEl.addEventListener('input', () => { state.badge = badgeEl.value; redraw(); });
// Arm the history on focus — before the first keystroke — so undo returns
// to the words as they were before this edit began.
for (const el of [titleEl, subtitleEl, badgeEl]) {
  el.addEventListener('focus', pushHistory);
}
heatEl.addEventListener('input', () => {
  state.heat = Number(heatEl.value);
  heatValueEl.textContent = heatLabel(state.heat);
  redraw();
});
// Arm sliders on pointerdown / keydown, before the value moves.
for (const el of [heatEl, zoomEl, rotateEl]) {
  el.addEventListener('pointerdown', pushHistory);
  el.addEventListener('keydown', pushHistory);
}
zoomEl.addEventListener('input', () => {
  state.slots[selectedPanel].zoom = Number(zoomEl.value);
  redraw();
});
rotateEl.addEventListener('input', () => {
  state.slots[selectedPanel].rot = Number(rotateEl.value);
  rotateValueEl.textContent = `${rotateEl.value}°`;
  redraw();
});
flipBtn.addEventListener('click', () => {
  pushHistory();
  const slot = state.slots[selectedPanel];
  slot.flip = !slot.flip;
  syncPanelControls();
  redraw();
});
document.getElementById('resetPanel').addEventListener('click', () => {
  pushHistory();
  const slot = state.slots[selectedPanel];
  slot.zoom = 1;
  slot.ox = 0;
  slot.oy = 0;
  slot.flip = false;
  slot.rot = 0;
  redraw();
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
  } else if ((e.key.toLowerCase() === 'y') || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
    e.preventDefault();
    redo();
  }
});

// Click selects a panel; dragging pans its photo.
let drag = null;
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAt(state.layout, p.x, p.y, canvas.width, canvas.height);
  if (hit < 0) return;
  if (hit !== selectedPanel) {
    selectedPanel = hit;
    syncPanelControls();
  }
  canvas.setPointerCapture(e.pointerId);
  drag = { x: p.x, y: p.y, ox: state.slots[hit].ox, oy: state.slots[hit].oy, moved: false };
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const { panels } = layoutGeometry(state.layout);
  const box = panels[selectedPanel];
  const bw = box.poly
    ? Math.max(...box.poly.map(([x]) => x)) - Math.min(...box.poly.map(([x]) => x))
    : box.w;
  const bh = box.poly
    ? Math.max(...box.poly.map(([, y]) => y)) - Math.min(...box.poly.map(([, y]) => y))
    : box.h;
  const dx = (p.x - drag.x) / (bw * canvas.width);
  const dy = (p.y - drag.y) / (bh * canvas.height);
  if (Math.abs(dx) + Math.abs(dy) > 0.002 && !drag.moved) {
    drag.moved = true;
    pushHistory();
  }
  const slot = state.slots[selectedPanel];
  slot.ox = Math.max(-0.6, Math.min(0.6, drag.ox + dx));
  slot.oy = Math.max(-0.6, Math.min(0.6, drag.oy + dy));
  redraw();
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

document.getElementById('export').addEventListener('click', async () => {
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
  runShot(shot, query, { state, loadImage, loadSamples, redraw, exportCoverPNG, trayPhotos });
} else {
  waitForFonts().then(redraw);
  redraw();
  syncHistoryButtons();
}
