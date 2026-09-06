import { defineConfig } from 'vite';

// Serve the exact Pages directory, without falling back to a root invitation.
export default defineConfig({
  appType: 'mpa',
  build: { outDir: 'dist/client' },
});
