// Every production build starts with an empty output directory.
import { rm } from 'node:fs/promises';
await rm(new URL('../dist/', import.meta.url), {
  recursive: true,
  force: true,
});
