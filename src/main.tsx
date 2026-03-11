import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BootErrorBoundary } from './components/ui/BootErrorBoundary';
import './styles/global.css';

const BOOT_OVERLAY_ID = 'boot-failure-overlay';

function showBootFailureOverlay(message: string, error?: unknown) {
  if (document.getElementById(BOOT_OVERLAY_ID)) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = BOOT_OVERLAY_ID;
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '999999';
  overlay.style.background = '#09090b';
  overlay.style.color = '#f4f4f5';
  overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  overlay.style.padding = '24px';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.gap = '12px';
  overlay.innerHTML = `
    <h1 style="margin:0;color:#f87171;font-size:24px;">App failed to start</h1>
    <p style="margin:0;max-width:680px;line-height:1.5;">${message}</p>
    <pre style="margin:0;max-width:100%;overflow:auto;background:#18181b;border-radius:8px;padding:12px;color:#fca5a5;font-size:12px;">${String(error ?? 'No error details available.')}</pre>
  `;

  document.body.appendChild(overlay);
}

function disableServiceWorkerForStability() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .then(() => caches.keys())
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => {
        console.info('[BOOT] Service workers unregistered and caches cleared for Safari stability.');
      })
      .catch((error) => {
        console.warn('[BOOT] Failed to fully disable service workers:', error);
      });
  });
}

window.onerror = (_message, _source, _lineno, _colno, error) => {
  console.error('[BOOT] Unhandled startup error:', error ?? _message);
  showBootFailureOverlay('A runtime error occurred before the game could render.', error ?? _message);
  return false;
};

window.onunhandledrejection = (event) => {
  console.error('[BOOT] Unhandled startup promise rejection:', event.reason);
  showBootFailureOverlay('A startup promise was rejected before the game could render.', event.reason);
};

disableServiceWorkerForStability();

const root = document.getElementById('root');

if (!root) {
  const error = new Error('Root element #root is missing.');
  console.error('[BOOT] Cannot mount React app:', error);
  throw error;
}

createRoot(root).render(
  <StrictMode>
    <BootErrorBoundary>
      <App />
    </BootErrorBoundary>
  </StrictMode>,
);
