import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
if (!files.length) throw new Error('Stage the intended source files with git add before auditing.');
const issues = [];
const privatePath = /(^|\/)(\.local|node_modules|dist|site|release|exports|evidence|\.local-review|local-review|test-results|playwright-report)(\/|$)/;
const photoOrArchive = /\.(jpe?g|png|webp|avif|heic|gif|mp4|mov|zip|pdf)$/i;
const sensitiveText = [
  ['absolute home path', /\/(?:Users|home)\/[^\s"']+/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['access token', /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16})/],
  ['personal invitation link', /(?:zmwjz\.top|yizhi-yusheng\.pages\.dev|h5\.hunbei\.com\/app\/|scene_id=\d+)/],
  ['embedded raster photo', /data:image\/(?:jpeg|png|webp|gif);base64,/],
];
for (const file of files) {
  if (privatePath.test(file) || photoOrArchive.test(file)) issues.push(`${file}: private/generated media must not be tracked`);
  if (/\.(woff2?|ttf|otf)$/i.test(file)) continue;
  // Inspect the exact staged bytes that a commit would publish.
  const text = execFileSync('git', ['show', `:${file}`], { cwd: root, maxBuffer: 8 * 1024 * 1024 }).toString();
  for (const [label, pattern] of sensitiveText) {
    if (pattern.test(text)) issues.push(`${file}: ${label}`);
  }
}
if (issues.length) {
  console.error(issues.join('\n'));
  process.exit(1);
}
console.log(`Public-source audit passed: ${files.length} staged files; no photos, generated exports, personal invitation links or known sensitive patterns.`);
