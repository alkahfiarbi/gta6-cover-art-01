// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos
// loaded; ?shot=cover shows the cover the app itself exported, as the PNG it
// wrote, displayed full-screen. `layout`, `grade`, `size`, `caption`,
// `subtitle`, `badge`, `heat` and `photos` (comma-separated sample names)
// pick the scene. window.__shotReady is set once the scene is painted.
import { panelCount } from './cover.js';

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

export async function runShot(shot, query, ctx) {
  const { state, loadSamples, redraw, exportCoverPNG } = ctx;
  state.layout = query.get('layout') ?? 'hero';
  state.grade = query.get('grade') ?? 'sunset';
  state.size = query.get('size') ?? '1920x1080';
  state.title = query.get('caption') ?? 'SUNSET HEIST';
  state.subtitle = query.get('subtitle') ?? 'vice city nights';
  state.badge = query.get('badge') ?? 'VICE CITY';
  state.heat = Number(query.get('heat') ?? 4);

  await waitForFonts();
  await loadSamples();

  const wanted = (query.get('photos') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (wanted.length > 0) {
    const count = panelCount(state.layout);
    for (let i = 0; i < count; i++) {
      const name = wanted[i % wanted.length];
      const found = ctx.trayPhotos.find((p) => p.name === name);
      if (found) {
        state.slots[i].img = found.img;
        state.slots[i].zoom = 1;
        state.slots[i].ox = 0;
        state.slots[i].oy = 0;
      }
    }
  }

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    document.getElementById('shotView').hidden = false;
    const blob = await exportCoverPNG();
    const url = URL.createObjectURL(blob);
    const img = document.getElementById('shotImg');
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      img.src = url;
    });
  } else {
    redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
