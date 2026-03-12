import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BootErrorBoundary } from './components/ui/BootErrorBoundary';
import { SafeModeShell } from './components/SafeModeShell';
import './styles/global.css';

// Type-extend window for boot globals set in index.html
declare global {
    interface Window {
        __SAFE_MODE: boolean;
        __bootErrors: Array<{ msg: string; src?: string; line?: number; col?: number; err?: string }>;
        __bootLog: Array<{ t: number; m: string }>;
        __logBoot?: (message: string) => void;
    }
}

const BOOT_OVERLAY_ID = 'boot-failure-overlay';

/** Renders a plain-DOM fatal error overlay. Avoids React/CSS so it always works. */
function showBootFailureOverlay(message: string, error?: unknown) {
    if (document.getElementById(BOOT_OVERLAY_ID)) {
        return;
    }

    // Also hide the boot splash if present
    const splash = document.getElementById('boot-splash');
    if (splash) splash.style.display = 'none';

    const overlay = document.createElement('div');
    overlay.id = BOOT_OVERLAY_ID;
    overlay.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:999999',
        'background:#0a0a0f', 'color:#f4f4f5',
        'font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
        'padding:24px', 'display:flex', 'flex-direction:column',
        'justify-content:flex-start', 'gap:12px', 'overflow:auto',
    ].join(';');

    const errorStr = error instanceof Error
        ? `${error.name}: ${error.message}\n\n${error.stack || ''}`
        : String(error ?? 'No error details available.');

    overlay.innerHTML = [
        `<h1 style="margin:0;color:#fca5a5;font-size:22px;padding-top:40px">App failed to start</h1>`,
        `<p style="margin:0;max-width:680px;line-height:1.5;color:#d4d4d8">${message}</p>`,
        `<pre style="margin:0;max-width:100%;overflow:auto;background:#18181b;border-radius:8px;padding:12px;color:#fca5a5;font-size:11px;white-space:pre-wrap;word-break:break-word">${errorStr}</pre>`,
        `<div style="display:flex;gap:10px;flex-wrap:wrap">`,
        `<button onclick="localStorage.clear();location.reload()" style="padding:10px 18px;background:#7f1d1d;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Clear Data &amp; Retry</button>`,
        `<button onclick="location.href=location.origin+location.pathname+'?safe=1'" style="padding:10px 18px;background:#1e3a5f;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Open Safe Mode</button>`,
        `</div>`,
        `<p style="font-size:11px;color:#71717a;margin:0">User agent: ${navigator.userAgent}</p>`,
    ].join('');

    document.body.appendChild(overlay);
}

/** Log a boot step. Updates the boot splash status text and the global boot log. */
function logBoot(message: string) {
    if (typeof window.__logBoot === 'function') {
        window.__logBoot(message);
    } else {
        const el = document.getElementById('boot-status-text');
        if (el) el.textContent = message;
    }
    console.info('[BOOT]', message);
}

/** Remove the boot splash once React has successfully mounted. */
function removeBootSplash() {
    const splash = document.getElementById('boot-splash');
    if (splash) {
        splash.style.transition = 'opacity 0.3s ease';
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 350);
    }
}

// ── Global error handlers ──────────────────────────────────────
// Note: window.onerror is already set in index.html before this script loads.
// We layer on top here to also call showBootFailureOverlay.
const prevOnError = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
    console.error('[BOOT] Unhandled startup error:', error ?? message);
    showBootFailureOverlay('A runtime error occurred before the game could render.', error ?? message);
    if (typeof prevOnError === 'function') prevOnError(message, source, lineno, colno, error);
    return false;
};

const prevOnUnhandledRejection = window.onunhandledrejection;
window.onunhandledrejection = (event) => {
    console.error('[BOOT] Unhandled promise rejection:', event.reason);
    showBootFailureOverlay('A startup promise was rejected before the game could render.', event.reason);
    if (typeof prevOnUnhandledRejection === 'function') prevOnUnhandledRejection.call(window, event);
};

// ── Service worker: already disabled in index.html inline script. ───────────

// ── Mount ─────────────────────────────────────────────────────
logBoot('Locating root element…');

const rootEl = document.getElementById('root');

if (!rootEl) {
    showBootFailureOverlay(
        'Root element #root is missing from the document. The HTML may not have loaded correctly.',
        new Error('Root element #root is missing.')
    );
    throw new Error('[BOOT] Cannot mount React app: #root element not found.');
}

logBoot('Starting React…');

try {
    const isSafeMode = window.__SAFE_MODE === true;

    createRoot(rootEl).render(
        <StrictMode>
            <BootErrorBoundary>
                {isSafeMode ? <SafeModeShell /> : <App />}
            </BootErrorBoundary>
        </StrictMode>
    );

    // Remove boot splash after React commits its first paint
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            removeBootSplash();
        });
    });

    logBoot('React mounted.');
} catch (err) {
    console.error('[BOOT] Failed to mount React:', err);
    showBootFailureOverlay('React failed to mount. See details below.', err);
}
