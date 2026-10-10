import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Register PWA service worker in production builds for offline support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (import.meta as any)?.env?.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      try {
        registerSW({ immediate: true });
      } catch (e) {
        console.debug('PWA registration skipped:', e);
      }
    })
    .catch(() => {});
}

try {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  }
} catch (err: any) {
  console.error('Fatal initialization error:', err);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#fff;font-family:sans-serif;padding:20px;">
        <div style="max-width:440px;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;text-align:center;">
          <h2 style="font-size:18px;margin-bottom:8px;color:#f59e0b;">System Startup Recovery</h2>
          <p style="font-size:12px;color:#94a3b8;margin-bottom:16px;">${err?.message || 'Initialization error'}</p>
          <button onclick="location.reload()" style="background:#f59e0b;color:#0f172a;font-weight:700;border:none;padding:10px 20px;border-radius:10px;font-size:12px;cursor:pointer;">
            စနစ်အား ပြန်လည် Reload ပြုလုပ်မည်
          </button>
        </div>
      </div>
    `;
  }
}
