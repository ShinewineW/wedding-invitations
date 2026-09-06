import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve(import.meta.dirname, '../exports/high-resolution');
await fs.mkdir(output, { recursive: true });
http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4176');
  const url = new URL(req.url, 'http://127.0.0.1:4178');
  if (req.method !== 'POST' || !/^\/[a-z0-9-]+\.png$/.test(url.pathname)) {
    res.writeHead(404).end();
    return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const bytes = Buffer.from(Buffer.concat(chunks).toString(), 'base64');
  const file = path.join(output, path.basename(url.pathname));
  if (url.searchParams.get('append') === '1') await fs.appendFile(file, bytes);
  else await fs.writeFile(file, bytes);
  res.end('saved');
}).listen(4178, '127.0.0.1', () => console.log('Capture receiver: http://127.0.0.1:4178'));
