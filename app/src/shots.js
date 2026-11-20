// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the cover the app itself exported, as
// the PNG it wrote, displayed full-screen. `layout`, `grade`, `size`,
// `caption`, `subtitle`, `badge`, `heat` and `photos` (comma-separated
// sample names) pick the scene. `smart=0` turns the face-aware fill off.
// window.__shotReady is set once the scene is painted.
import { slotCount } from './cover.js';

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

/** Reads the scene out of the query string and into the editor state. */
function applyScene(query, state) {
  state.layout = query.get('layout') ?? 'hero';
  state.grade = query.get('grade') ?? 'sunset';
  state.size = query.get('size') ?? '1920x1080';
  state.title = query.get('caption') ?? 'SUNSET HEIST';
  state.subtitle = query.get('subtitle') ?? 'vice city nights';
  state.badge = query.get('badge') ?? 'VICE CITY';
  state.heat = Number(query.get('heat') ?? 4);
  state.smartFill = query.get('smart') !== '0';
}

/** Fills the visible panels with the named samples, in order, cycling. */
function fillWantedPhotos(query, ctx) {
  const { state, trayPhotos } = ctx;
  const wanted = (query.get('photos') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (wanted.length === 0) return;
  const count = slotCount(state.layout);
  for (let i = 0; i < count; i++) {
    const name = wanted[i % wanted.length];
    const foundAt = trayPhotos.findIndex((p) => p.name === name);
    if (foundAt < 0) continue;
    const slot = state.slots[i];
    slot.img = trayPhotos[foundAt].img;
    slot.photo = foundAt;
    slot.zoom = 1;
    slot.ox = 0;
    slot.oy = 0;
    slot.flip = false;
    slot.rot = 0;
  }
}

/** Shows the PNG the app exported, exactly as it wrote it. */
async function showExportedCover(ctx) {
  document.body.classList.add('shot-cover');
  document.getElementById('shotView').hidden = false;
  const blob = await ctx.exportCoverPNG();
  const url = URL.createObjectURL(blob);
  const img = document.getElementById('shotImg');
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve;
    img.src = url;
  });
}

export async function runShot(shot, query, ctx) {
  const { state, loadSamples, repaint } = ctx;
  applyScene(query, state);
  await waitForFonts();
  await loadSamples();
  fillWantedPhotos(query, ctx);
  if (shot === 'cover') {
    await showExportedCover(ctx);
  } else {
    repaint();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
