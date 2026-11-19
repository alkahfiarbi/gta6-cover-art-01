// Vice Cover Studio — wires the editor: photos in, panels, layout, grade,
// words, export. `?shot=` sets up a fixed scene for a screenshot instead
// (./shots.js). Photos are read on this machine and never uploaded anywhere.
import { drawCover, layoutGeometry, panelAt, panelCount, SIZES } from './cover.js';
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
const panelNameEl = document.getElementById('panelName');

const SAMPLES = ['samples/sunset-portrait.jpg', 'samples/neon-street.jpg', 'samples/pier-friends.jpg'];

const state = {
  layout: 'hero',
  grade: 'sunset',
  size: '1920x1080',
  title: 'SUNSET HEIST',
  subtitle: 'vice city nights',
  badge: 'VICE CITY',
  heat: 4,
  slots: Array.from({ length: 9 }, () => ({ img: null, zoom: 1, ox: 0, oy: 0 })),
};

let trayPhotos = []; // { img, name, url }
let selectedTray = -1;
let selectedPanel = 0;
let fontsReady = false;

function redraw() {
  drawCover(canvas, state);
}

function heatLabel(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function syncPanelControls() {
  const slot = state.slots[selectedPanel];
  zoomEl.value = String(slot.zoom);
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
      assignTrayToPanel(i);
      renderTray();
    });
    trayEl.append(fig);
  });
}

function assignTrayToPanel(i) {
  const photo = trayPhotos[i];
  if (!photo) return;
  const slot = state.slots[selectedPanel];
  slot.img = photo.img;
  slot.zoom = 1;
  slot.ox = 0;
  slot.oy = 0;
  redraw();
  syncPanelControls();
}

async function addFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      trayPhotos.push({ img, name: file.name.replace(/\.[^.]+$/, ''), url });
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  if (trayPhotos.length > 0 && selectedTray < 0) selectedTray = 0;
  renderTray();
  redraw();
}

async function loadSamples() {
  for (const src of SAMPLES) {
    if (trayPhotos.some((p) => p.url === src)) continue;
    try {
      const img = await loadImage(src);
      trayPhotos.push({ img, name: src.split('/').pop().replace('.jpg', ''), url: src });
    } catch {
      // A missing sample never blocks the editor.
    }
  }
  if (trayPhotos.length > 0) {
    selectedTray = 0;
    renderTray();
    // Fill the visible panels with the samples, one photo per panel.
    const count = panelCount(state.layout);
    for (let i = 0; i < count; i++) {
      const slot = state.slots[i];
      if (!slot.img) slot.img = trayPhotos[i % trayPhotos.length].img;
    }
    redraw();
  }
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
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    state.slots[i].img = photo.img;
    state.slots[i].zoom = 1;
    state.slots[i].ox = 0;
    state.slots[i].oy = 0;
  }
  redraw();
  statusEl.textContent = `Every panel now shows ${photo.name}.`;
});

document.querySelectorAll('input[name="layout"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.layout = radio.value;
    selectedPanel = 0;
    redraw();
    syncPanelControls();
  });
});
document.querySelectorAll('input[name="grade"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.grade = radio.value;
    redraw();
  });
});
document.querySelectorAll('input[name="size"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.size = radio.value;
    redraw();
  });
});
titleEl.addEventListener('input', () => { state.title = titleEl.value; redraw(); });
subtitleEl.addEventListener('input', () => { state.subtitle = subtitleEl.value; redraw(); });
badgeEl.addEventListener('input', () => { state.badge = badgeEl.value; redraw(); });
heatEl.addEventListener('input', () => {
  state.heat = Number(heatEl.value);
  heatValueEl.textContent = heatLabel(state.heat);
  redraw();
});
zoomEl.addEventListener('input', () => {
  state.slots[selectedPanel].zoom = Number(zoomEl.value);
  redraw();
});
document.getElementById('resetPanel').addEventListener('click', () => {
  const slot = state.slots[selectedPanel];
  slot.zoom = 1;
  slot.ox = 0;
  slot.oy = 0;
  redraw();
  syncPanelControls();
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
  selectedPanel = hit;
  syncPanelControls();
  canvas.setPointerCapture(e.pointerId);
  drag = { x: p.x, y: p.y, ox: state.slots[hit].ox, oy: state.slots[hit].oy };
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const { panels } = layoutGeometry(state.layout);
  const rect = panels[selectedPanel];
  const slot = state.slots[selectedPanel];
  slot.ox = Math.max(-0.6, Math.min(0.6, drag.ox + (p.x - drag.x) / (rect.w * canvas.width)));
  slot.oy = Math.max(-0.6, Math.min(0.6, drag.oy + (p.y - drag.y) / (rect.h * canvas.height)));
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
    fontsReady = true;
  } catch {
    fontsReady = false;
  }
}

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { state, loadImage, loadSamples, redraw, exportCoverPNG, trayPhotos });
} else {
  waitForFonts().then(redraw);
  redraw();
}
