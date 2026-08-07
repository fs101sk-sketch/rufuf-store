(() => {
  const installButton = document.getElementById('pwa-install-button');
  const help = document.getElementById('pwa-install-help');
  const helpIntro = document.getElementById('pwa-help-intro');
  const helpSteps = document.getElementById('pwa-help-steps');
  const closeHelpButton = document.getElementById('pwa-help-close');
  const updateBanner = document.getElementById('pwa-update-banner');
  const updateButton = document.getElementById('pwa-update-button');

  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let installPrompt = null;
  let waitingWorker = null;
  let reloading = false;
  let controlledAtLoad = Boolean(navigator.serviceWorker?.controller);

  function setHelpContent() {
    const steps = ios
      ? ['افتح الصفحة في Safari.', 'اضغط زر المشاركة ⬆.', 'اختر «إضافة إلى الشاشة الرئيسية».', 'اضغط «إضافة».']
      : ['افتح قائمة المتصفح ⋮ أو قائمة التطبيقات.', 'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».', 'وافق على التثبيت.'];
    helpIntro.textContent = ios
      ? 'على iPhone وiPad يتم التثبيت من قائمة المشاركة:'
      : 'إذا لم تظهر نافذة التثبيت تلقائياً، استخدم قائمة المتصفح:';
    helpSteps.replaceChildren(...steps.map((step) => {
      const item = document.createElement('li');
      item.textContent = step;
      return item;
    }));
  }

  function openHelp() {
    setHelpContent();
    help.hidden = false;
    closeHelpButton.focus();
  }

  function closeHelp() {
    help.hidden = true;
    installButton?.focus();
  }

  if (!standalone && installButton) installButton.hidden = false;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    if (!standalone) installButton.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installButton.hidden = true;
    help.hidden = true;
    if (typeof window.toast === 'function') window.toast('✅ تم تثبيت مَجْلِسْ بنجاح', 'ok');
  });

  installButton?.addEventListener('click', async () => {
    if (!installPrompt) {
      openHelp();
      return;
    }
    installButton.disabled = true;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') installButton.hidden = true;
      installPrompt = null;
    } finally {
      installButton.disabled = false;
    }
  });

  closeHelpButton?.addEventListener('click', closeHelp);
  help?.addEventListener('click', (event) => {
    if (event.target === help) closeHelp();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !help.hidden) closeHelp();
  });

  function showUpdate(worker) {
    waitingWorker = worker;
    updateBanner.hidden = false;
  }

  updateButton?.addEventListener('click', () => {
    updateButton.disabled = true;
    updateButton.textContent = 'جاري التحديث…';
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
  });

  if ('serviceWorker' in navigator && ['https:', 'http:'].includes(location.protocol)) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
        if (registration.waiting && navigator.serviceWorker.controller) showUpdate(registration.waiting);

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(worker);
          });
        });

        window.setInterval(() => registration.update(), 60 * 60 * 1000);
      } catch (error) {
        console.error('PWA registration failed', error);
      }
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!controlledAtLoad) {
        controlledAtLoad = true;
        return;
      }
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  }
})();
