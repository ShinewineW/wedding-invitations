import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../site/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.rsc': 'text/x-component', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain' };
export async function startDemoServer(port = 4188) {
  const { basePath } = JSON.parse(await readFile(resolve(root, 'demo-manifest.json'), 'utf8'));
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname === '/' || pathname === basePath) {
        response.writeHead(302, { Location: `${basePath}/` }); response.end(); return;
      }
      if (!pathname.startsWith(`${basePath}/`)) { response.writeHead(404); response.end(); return; }
      let file = resolve(root, pathname.slice(basePath.length + 1));
      if (file !== resolve(root) && !file.startsWith(resolve(root) + sep)) { response.writeHead(404); response.end(); return; }
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
      response.end(await readFile(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', accept); });
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}${basePath}/` };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { url } = await startDemoServer(Number(process.env.PORT || 4188));
  console.log(`Demo preview: ${url}`);
}
