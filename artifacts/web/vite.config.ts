import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type PluginOption } from 'vite';

const isProduction = process.env.NODE_ENV === 'production';

// Porta só é usada pelo dev server / preview. Em build (Vercel, CI) ela não é
// necessária, então caímos num padrão em vez de quebrar o build.
const port = Number(process.env.PORT) || 5173;

// A loja é servida na raiz do domínio; BASE_PATH permite subir num subcaminho.
const basePath = process.env.BASE_PATH || '/';

const devOnlyPlugins: PluginOption[] = [];
if (!isProduction) {
  const runtimeErrorOverlay = (
    await import('@replit/vite-plugin-runtime-error-modal')
  ).default;
  devOnlyPlugins.push(runtimeErrorOverlay());

  if (process.env.REPL_ID !== undefined) {
    devOnlyPlugins.push(
      await import('@replit/vite-plugin-cartographer').then((m) =>
        m.cartographer({ root: path.resolve(import.meta.dirname, '..') }),
      ),
      await import('@replit/vite-plugin-dev-banner').then((m) => m.devBanner()),
    );
  }
}

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss(), ...devOnlyPlugins],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT ?? '5000'}`,
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
