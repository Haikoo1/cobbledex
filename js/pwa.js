/**
 * pwa.js — Progressive Web App support
 *
 * Features:
 * - Service Worker registration (Cache First strategy)
 * - beforeinstallprompt handler with custom install button
 * - Online/offline status detection
 */

/** @type {Event|null} Stashed install prompt event */
let deferredInstallPrompt = null;

/**
 * Register the Service Worker.
 */
async function registerSW() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('./sw.js', {
      scope: './',
    });
    console.log('SW registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateNotification();
        }
      });
    });
  } catch (err) {
    console.error('SW registration failed:', err);
  }
}

/**
 * Show a notification when a new version is available.
 */
function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: var(--panel); border: 2px solid var(--cyan);
    border-radius: 8px; padding: 12px 20px; z-index: 2000;
    font-family: var(--font-terminal); font-size: 14px; color: var(--txt);
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    cursor: pointer;
  `;
  notification.textContent = '🔄 New version available! Click to update.';
  notification.addEventListener('click', () => {
    notification.remove();
    window.location.reload();
  });
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 10000);
}

/**
 * Handle the beforeinstallprompt event.
 * @param {Event} event - beforeinstallprompt event
 */
function handleInstallPrompt(event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallButton();
}

/**
 * Show the install button.
 */
function showInstallButton() {
  const existing = document.getElementById('installBtn');
  if (existing) return;

  const btn = document.createElement('button');
  btn.id = 'installBtn';
  btn.textContent = '⬇ Install Cobbledex';
  btn.className = 'header-btn';
  btn.style.marginLeft = '4px';
  btn.style.color = 'var(--green)';
  btn.style.borderColor = 'rgba(68, 255, 136, 0.3)';
  btn.addEventListener('click', triggerInstall);

  const headerActions = document.querySelector('.header-actions');
  if (headerActions) {
    headerActions.appendChild(btn);
  }
}

/**
 * Trigger the install prompt.
 */
async function triggerInstall() {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  console.log('Install result:', result.outcome);

  // Clean up
  deferredInstallPrompt = null;
  const btn = document.getElementById('installBtn');
  if (btn) btn.remove();
}

/**
 * Check online status and show notification.
 */
function updateOnlineStatus() {
  const wasOffline = !navigator.onLine;
  if (wasOffline) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
      background: #44AA44; color: white; padding: 8px 16px;
      border-radius: 4px; font-family: var(--font-terminal); font-size: 13px;
      z-index: 9999;
    `;
    toast.textContent = '✅ Back online!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

// Listen for install prompt
window.addEventListener('beforeinstallprompt', handleInstallPrompt);

// Listen for online/offline
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', () => {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
    background: #CC4444; color: white; padding: 8px 16px;
    border-radius: 4px; font-family: var(--font-terminal); font-size: 13px;
    z-index: 9999;
  `;
  toast.textContent = '⚠ You are offline — data may be limited';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
});

export {
  registerSW,
  handleInstallPrompt,
  triggerInstall,
};
