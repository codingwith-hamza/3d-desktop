import { defineConfig } from 'vite';

// base './' keeps built asset paths relative so it works on any static host
export default defineConfig({
  base: './',
  server: {
    host: true, // bind 0.0.0.0 so Replit's proxy can reach the dev server
    allowedHosts: true, // accept the *.replit.dev preview hostname
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
});
