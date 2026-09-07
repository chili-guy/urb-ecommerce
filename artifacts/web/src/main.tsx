import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { supabaseConfigured } from '@/lib/supabase';

import './index.css';

const root = document.getElementById('root')!;

if (!supabaseConfigured) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;background:#f4f1eb;color:#111820;font-family:system-ui,-apple-system,sans-serif">
      <div style="max-width:34rem">
        <h1 style="font-size:1.25rem;font-weight:700;margin:0 0 .5rem">Configuração ausente</h1>
        <p style="margin:0;line-height:1.6;color:#4f585d">
          Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> nas
          variáveis de ambiente (na Vercel: Project Settings &rarr; Environment Variables)
          e faça um novo deploy — o Vite fixa esses valores no build.
        </p>
      </div>
    </div>`;
} else {
  createRoot(root, {
    // Keeps caught errors off reportError(), which would raise the dev overlay.
    onCaughtError: (error, errorInfo) => {
      console.error(error, errorInfo.componentStack);
    },
  }).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
}
