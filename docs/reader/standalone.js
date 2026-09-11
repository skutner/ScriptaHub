(() => {
  const standaloneScriptUrl = document.currentScript?.src;
  const pdfLinks = [...document.querySelectorAll('a[href]')].filter((link) => {
    try {
      const url = new URL(link.href, window.location.href);
      return url.origin === window.location.origin && /\.pdf$/i.test(url.pathname);
    } catch { return false; }
  });
  pdfLinks.forEach((link) => { link.dataset.authAction = 'download'; });
    if (pdfLinks.length) {
        const grantApiVersion = 1;
        const compatibleGate = () => globalThis.ScriptaHubAuth?.grantApiVersion === grantApiVersion && typeof globalThis.ScriptaHubAuth.requireAccount === 'function';
        const accountReload = {
            en: "Reload this page to update sign-in, then try again. Copy any unsent text before reloading.",
            fr: "Rechargez cette page pour mettre à jour la connexion, puis réessayez. Copiez tout texte non envoyé avant de recharger.",
            de: "Laden Sie diese Seite neu, um die Anmeldung zu aktualisieren, und versuchen Sie es erneut. Kopieren Sie vorher ungesendeten Text.",
            es: "Recarga esta página para actualizar el inicio de sesión y vuelve a intentarlo. Copia el texto no enviado antes de recargar.",
            pt: "Recarregue esta página para atualizar o início de sessão e tente novamente. Copie o texto não enviado antes de recarregar.",
            it: "Ricarica questa pagina per aggiornare l’accesso, poi riprova. Copia il testo non inviato prima di ricaricare.",
            ro: "Reîncarcă această pagină pentru a actualiza autentificarea, apoi încearcă din nou. Copiază textul netrimis înainte de reîncărcare.",
            pl: "Odśwież tę stronę, aby zaktualizować logowanie, i spróbuj ponownie. Przed odświeżeniem skopiuj niewysłany tekst.",
        };
        const accountUnavailable = {
            en: 'Account sign-in is currently unavailable. Please try again.',
            fr: 'La connexion à votre compte est momentanément indisponible. Veuillez réessayer.',
            de: 'Die Anmeldung ist derzeit nicht verfügbar. Bitte versuchen Sie es erneut.',
            es: 'El inicio de sesión no está disponible en este momento. Inténtalo de nuevo.',
            pt: 'O início de sessão está indisponível neste momento. Tente novamente.',
            it: 'L’accesso all’account non è al momento disponibile. Riprova.',
            ro: 'Autentificarea nu este disponibilă momentan. Încearcă din nou.',
            pl: 'Logowanie jest obecnie niedostępne. Spróbuj ponownie.',
        };
        let authLoading;
        let waitingForGate = false;
        let accountStatus;
        const loadAccountGate = () => {
            if (compatibleGate()) return Promise.resolve(true);
            if (globalThis.ScriptaHubAuth) return Promise.resolve(false);
            if (!standaloneScriptUrl) return Promise.resolve(false);
            if (!authLoading) {
                authLoading = new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = new URL('../assets/auth.js?v=20260911-2', standaloneScriptUrl).href;
                    script.addEventListener('load', () => resolve(compatibleGate()), { once: true });
                    script.addEventListener('error', () => resolve(false), { once: true });
                    document.head.append(script);
                }).then((available) => {
                    if (!available) authLoading = null;
                    return available;
                });
            }
            return authLoading;
        };
        loadAccountGate();
        const gateWhileLoading = async (event) => {
            if (compatibleGate() || event.defaultPrevented || (event.type === 'auxclick' && event.button !== 1)) return;
            const link = event.target.closest?.('a[data-auth-action="download"]');
            if (!link) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (waitingForGate) return;
            waitingForGate = true;
            const activation = {
                bubbles: true, cancelable: true, composed: true, view: window,
                button: event.button, buttons: event.buttons, detail: event.detail,
                ctrlKey: event.ctrlKey, metaKey: event.metaKey,
                shiftKey: event.shiftKey, altKey: event.altKey,
            };
            try {
                if (await loadAccountGate()) {
                    if (accountStatus) accountStatus.textContent = '';
                    // Let the shared gate resume the original action after sign-in.
                    link.dispatchEvent(new MouseEvent(event.type, activation));
                } else {
                    if (!accountStatus) {
                        accountStatus = document.createElement('p');
                        accountStatus.setAttribute('role', 'status');
                        link.after(accountStatus);
                    }
                    const labels = globalThis.ScriptaHubAuth ? accountReload : accountUnavailable;
                    accountStatus.textContent = labels[document.documentElement.lang.split('-')[0]] || labels.en;
                }
            } finally {
                waitingForGate = false;
            }
        };
        document.addEventListener('click', gateWhileLoading, true);
        document.addEventListener('auxclick', gateWhileLoading, true);
    }

  const storageKey = `axiologic-standalone-reader:v2:${window.location.pathname}`;
  let saveTimer;

  const readState = () => {
    try { return JSON.parse(window.localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  };

  const writeState = (value) => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* Storage is optional. */ }
  };

  const maximumScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const metrics = () => {
    const available = maximumScroll();
    const position = available > 0 ? window.scrollY / available : 0;
    const total = Math.max(1, Math.ceil(document.documentElement.scrollHeight / Math.max(1, window.innerHeight)));
    const page = Math.min(total, Math.floor(window.scrollY / Math.max(1, window.innerHeight)) + 1);
    return { position: Math.max(0, Math.min(1, position)), page, total };
  };

  const report = () => {
    const progress = metrics();
    writeState({ ...readState(), ...progress, updatedAt: Date.now() });
    window.parent.postMessage({ type: 'axiologic-reader-progress', ...progress }, '*');
  };

  const goToPosition = (position, behavior = 'auto') => {
    const safePosition = Math.max(0, Math.min(1, Number(position) || 0));
    window.scrollTo({ top: maximumScroll() * safePosition, behavior });
    window.setTimeout(report, behavior === 'smooth' ? 360 : 0);
  };

  const applySettings = ({ fontSize, theme, position } = {}) => {
    const preservedPosition = metrics().position;
    if (Number(fontSize)) document.documentElement.style.setProperty('--standalone-size', `${fontSize}rem`);
    if (theme) document.documentElement.dataset.theme = theme;
    window.requestAnimationFrame(() => goToPosition(Number.isFinite(Number(position)) ? Number(position) : preservedPosition));
  };

  document.querySelectorAll('p').forEach((paragraph) => {
    if (!paragraph.textContent.replace(/\u00a0/g, ' ').trim()) paragraph.remove();
  });

  window.addEventListener('scroll', () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(report, 160);
  }, { passive: true });
  window.addEventListener('pagehide', report);
  window.addEventListener('resize', () => window.setTimeout(report, 120));
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'axiologic-reader-settings') applySettings(event.data);
    if (event.data?.type === 'axiologic-reader-reset') {
      writeState({ position: 0, page: 1, updatedAt: Date.now() });
      goToPosition(0, 'smooth');
    }
    if (event.data?.type === 'axiologic-reader-page') {
      window.scrollBy({ top: (Number(event.data.direction) < 0 ? -1 : 1) * window.innerHeight * .9, behavior: 'smooth' });
    }
    if (event.data?.type === 'axiologic-reader-seek') goToPosition(event.data.position, 'smooth');
  });

  const saved = readState();
  window.requestAnimationFrame(() => goToPosition(saved.position || 0));
})();
