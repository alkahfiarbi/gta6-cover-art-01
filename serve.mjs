// Dev-only static server for app/ (Node 22, standard library only):
// `node serve.mjs` serves app/ on http://localhost:8123. Not part of the
// entry handed to the grader — main.ts only copies app/ and screenshots/.
// An optional first argument picks the port: `node serve.mjs 8080`.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const port = Number(process.argv[2] ?? 8123);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function safePath(requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const cleaned = decoded.endsWith('/') ? `${decoded}index.html` : decoded;
  const file = resolve(join(appRoot, normalize(cleaned)));
  if (file !== appRoot && !file.startsWith(appRoot + sep)) return null;
  return file;
}

createServer((request, response) => {
  let file;
  try {
    file = safePath(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (!file) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Vice Cover Studio v2 is on http://localhost:${port}`);
});
