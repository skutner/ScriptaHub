import { authError, createAccountClient, normalizeConfig } from './auth-client.js';
import { createAttempt } from './auth-attempt.mjs';

// Resolve against this asset so book routes and GitHub project previews agree.
const asset = new URL(document.currentScript.src);
const configUrl = new URL('../auth/config.json', asset);
const callbackUrl = new URL('../auth/callback.html', asset);
const grantApiVersion = 1;
const compatibleGate = (gate) => gate?.grantApiVersion === grantApiVersion && typeof gate.requireAccount === 'function';
let parentGate;
try {
    if (window.parent !== window && window.parent.location.origin === location.origin) {
        const gate = window.parent.ScriptaHubAuth;
        if (compatibleGate(gate)) parentGate = gate;
    }
} catch { /* A cross-origin embed owns its authentication flow. */ }
const messages = {
    en: ['Create an account to continue', 'Sign in or register to download this PDF.', 'Sign in or register to leave feedback.', 'Continue', 'Cancel', 'Opening sign in…', 'Sign in is temporarily unavailable. Please try again later.', 'This account cannot use this action.', 'Your browser blocked the sign-in window. Select Continue to try again.', 'Sign in timed out. Please try again.', 'Close'],
    fr: ['Créez un compte pour continuer', 'Connectez-vous ou inscrivez-vous pour télécharger ce PDF.', 'Connectez-vous ou inscrivez-vous pour laisser un avis.', 'Continuer', 'Annuler', 'Ouverture de la connexion…', 'La connexion est temporairement indisponible. Réessayez plus tard.', 'Ce compte ne peut pas effectuer cette action.', 'Votre navigateur a bloqué la fenêtre de connexion. Sélectionnez Continuer pour réessayer.', 'Le délai de connexion a expiré. Réessayez.', 'Fermer'],
    de: ['Konto erstellen, um fortzufahren', 'Melden Sie sich an oder registrieren Sie sich, um dieses PDF herunterzuladen.', 'Melden Sie sich an oder registrieren Sie sich, um Feedback zu geben.', 'Weiter', 'Abbrechen', 'Anmeldung wird geöffnet…', 'Die Anmeldung ist vorübergehend nicht verfügbar. Versuchen Sie es später erneut.', 'Dieses Konto kann diese Aktion nicht ausführen.', 'Ihr Browser hat das Anmeldefenster blockiert. Wählen Sie Weiter, um es erneut zu versuchen.', 'Die Anmeldung hat zu lange gedauert. Versuchen Sie es erneut.', 'Schließen'],
    es: ['Crea una cuenta para continuar', 'Inicia sesión o regístrate para descargar este PDF.', 'Inicia sesión o regístrate para dejar comentarios.', 'Continuar', 'Cancelar', 'Abriendo el inicio de sesión…', 'El inicio de sesión no está disponible temporalmente. Inténtalo más tarde.', 'Esta cuenta no puede realizar esta acción.', 'Tu navegador bloqueó la ventana de inicio de sesión. Selecciona Continuar para reintentarlo.', 'Se agotó el tiempo de inicio de sesión. Inténtalo de nuevo.', 'Cerrar'],
    pt: ['Crie uma conta para continuar', 'Inicie sessão ou registe-se para descarregar este PDF.', 'Inicie sessão ou registe-se para deixar comentários.', 'Continuar', 'Cancelar', 'A abrir o início de sessão…', 'O início de sessão está temporariamente indisponível. Tente mais tarde.', 'Esta conta não pode efetuar esta ação.', 'O navegador bloqueou a janela de início de sessão. Selecione Continuar para tentar novamente.', 'O tempo para iniciar sessão expirou. Tente novamente.', 'Fechar'],
    it: ['Crea un account per continuare', 'Accedi o registrati per scaricare questo PDF.', 'Accedi o registrati per lasciare un commento.', 'Continua', 'Annulla', 'Apertura dell’accesso…', 'L’accesso non è temporaneamente disponibile. Riprova più tardi.', 'Questo account non può eseguire questa azione.', 'Il browser ha bloccato la finestra di accesso. Seleziona Continua per riprovare.', 'Il tempo per accedere è scaduto. Riprova.', 'Chiudi'],
    ro: ['Creează un cont pentru a continua', 'Autentifică-te sau înregistrează-te pentru a descărca acest PDF.', 'Autentifică-te sau înregistrează-te pentru a lăsa feedback.', 'Continuă', 'Anulează', 'Se deschide autentificarea…', 'Autentificarea este temporar indisponibilă. Încearcă din nou mai târziu.', 'Acest cont nu poate efectua această acțiune.', 'Browserul a blocat fereastra de autentificare. Selectează Continuă pentru a încerca din nou.', 'Timpul pentru autentificare a expirat. Încearcă din nou.', 'Închide'],
    pl: ['Utwórz konto, aby kontynuować', 'Zaloguj się lub zarejestruj, aby pobrać ten PDF.', 'Zaloguj się lub zarejestruj, aby zostawić opinię.', 'Kontynuuj', 'Anuluj', 'Otwieranie logowania…', 'Logowanie jest chwilowo niedostępne. Spróbuj ponownie później.', 'To konto nie może wykonać tej czynności.', 'Przeglądarka zablokowała okno logowania. Wybierz Kontynuuj, aby spróbować ponownie.', 'Upłynął czas logowania. Spróbuj ponownie.', 'Zamknij'],
};
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
const continuation = {
    en: ['Your account is ready', 'Continue to open the requested page in a new tab.'],
    fr: ['Votre compte est prêt', 'Continuez pour ouvrir la page demandée dans un nouvel onglet.'],
    de: ['Ihr Konto ist bereit', 'Öffnen Sie die gewünschte Seite in einem neuen Tab.'],
    es: ['Tu cuenta está lista', 'Continúa para abrir la página solicitada en una pestaña nueva.'],
    pt: ['A sua conta está pronta', 'Continue para abrir a página pedida num novo separador.'],
    it: ['Il tuo account è pronto', 'Continua per aprire la pagina richiesta in una nuova scheda.'],
    ro: ['Contul tău este pregătit', 'Continuă pentru a deschide pagina solicitată într-o filă nouă.'],
    pl: ['Twoje konto jest gotowe', 'Kontynuuj, aby otworzyć wybraną stronę w nowej karcie.'],
};
function language() {
    return (new URL(location.href).searchParams.get('lang') || document.documentElement.lang)?.split('-')[0];
}
function copy() {
    return messages[language()] || messages.en;
}

const style = document.createElement('link');
style.rel = 'stylesheet';
const styleUrl = new URL('auth.css', asset);
styleUrl.search = asset.search;
style.href = styleUrl.href;
document.head.append(style);
let client;
let loading;
let pending;
let generation = 0;
let errorDialog;
function getClient() {
    if (!loading) {
        const request = fetch(configUrl, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000) })
            .then((response) => { if (!response.ok) throw authError('unavailable'); return response.json(); })
            .then((input) => {
                let storage;
                try { storage = sessionStorage; } catch { /* In-memory sessions still work. */ }
                client = createAccountClient(normalizeConfig(input, callbackUrl), { storage });
                return client;
            });
        loading = request;
        request.catch(() => { if (loading === request) loading = undefined; });
    }
    return loading;
}
// Shared configuration has its own timeout and does not contact the issuer.
if (!parentGate) getClient().catch(() => {});

function openPopup() {
    const popup = window.open('about:blank', '_blank', 'popup,width=520,height=720');
    if (popup) {
        popup.document.title = copy()[0];
        popup.document.body.textContent = copy()[5];
    }
    return popup;
}
function closePopup(popup) {
    try { popup?.close(); } catch { /* Detached callbacks have their own close guidance. */ }
}
function pendingStatus(attempt) {
    const element = document.createElement('section');
    element.className = 'scriptahub-auth-pending';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = copy()[5];
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = copy()[4];
    cancel.addEventListener('click', attempt.cancel);
    element.append(status, cancel);
    document.body.append(element);
    attempt.addCleanup(() => element.remove());
    return { ready() { status.textContent = (continuation[language()] || continuation.en)[0]; } };
}

function dialog(message, continueAction, { destination, heading, attempt, grant } = {}) {
    const labels = copy();
    const previousFocus = document.activeElement;
    const element = document.createElement('dialog');
    element.className = 'scriptahub-auth-dialog';
    element.setAttribute('aria-labelledby', 'scriptahub-auth-title');
    element.setAttribute('aria-describedby', 'scriptahub-auth-message');
    const title = document.createElement('h2');
    title.id = 'scriptahub-auth-title';
    title.textContent = heading || labels[0];
    const body = document.createElement('p');
    body.id = 'scriptahub-auth-message';
    body.textContent = message;
    const actions = document.createElement('div');
    actions.className = 'scriptahub-auth-actions';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = continueAction || destination ? labels[4] : labels[10];
    actions.append(close);
    element.append(title, body, actions);
    document.body.append(element);
    if (!attempt && !grant) errorDialog = element;
    return new Promise((resolve) => {
        let result = null;
        let removed = false;
        const dismiss = () => {
            if (removed) return;
            removed = true;
            element.close();
            element.remove();
            if (errorDialog === element) errorDialog = undefined;
            previousFocus?.focus();
            resolve(result);
        };
        const cancel = () => { attempt?.cancel(); grant?.cancel(); dismiss(); };
        element.addEventListener('cancel', (event) => { event.preventDefault(); cancel(); });
        element.addEventListener('close', () => {
            if (!removed) cancel();
        });
        close.addEventListener('click', cancel);
        attempt?.addCleanup(dismiss);
        grant?.onFinish(() => {
            // Leave a valid anchor connected for this activation's default navigation.
            window.setTimeout(dismiss, 0);
        });
        if (continueAction) {
            const proceed = document.createElement('button');
            proceed.type = 'button';
            proceed.className = 'scriptahub-auth-primary';
            proceed.textContent = labels[3];
            proceed.addEventListener('click', () => {
                try {
                    attempt?.check();
                    result = continueAction();
                    if (result) dismiss();
                    else body.textContent = labels[8];
                } catch { cancel(); }
            });
            actions.append(proceed);
        }
        if (destination) {
            const proceed = document.createElement('a');
            proceed.href = destination.href;
            proceed.target = '_blank';
            proceed.rel = 'noopener noreferrer';
            proceed.className = 'scriptahub-auth-primary';
            proceed.textContent = labels[3];
            const activate = (event) => {
                if (event.type === 'auxclick' && event.button !== 1) return;
                try {
                    grant.publish(() => {
                        proceed.href = destination.href;
                        resumed.add(proceed);
                        result = true;
                    });
                } catch {
                    event.preventDefault();
                    cancel();
                }
            };
            proceed.addEventListener('click', activate);
            proceed.addEventListener('auxclick', activate);
            actions.append(proceed);
        }
        if (!removed) element.showModal();
    });
}

function reloadGuidance() {
    if (pending) return;
    errorDialog?.close();
    dialog(accountReload[language()] || accountReload.en);
}

function requireAccount(action, actionOwner, expectedVersion) {
    // A legacy caller would mistake an opaque grant for a published account.
    const ownerType = typeof actionOwner;
    if (expectedVersion !== grantApiVersion || actionOwner == null || !['object', 'function', 'symbol'].includes(ownerType)) {
        reloadGuidance();
        return Promise.resolve(null);
    }
    // Only duplicate requests for the exact same retained action share a grant.
    if (pending) return pending.action === action && pending.owner === actionOwner ? pending.promise : Promise.resolve(null);
    errorDialog?.close();
    const id = ++generation;
    const record = { action, owner: actionOwner };
    pending = record;
    const attempt = createAttempt({
        generation: id,
        isCurrent: () => pending === record && generation === id,
        onFinish(error) {
            if (pending !== record) return;
            pending = undefined;
            if (error?.code === 'timeout' && generation === id) dialog(copy()[9]);
        },
    });
    const status = pendingStatus(attempt);
    let popup;
    attempt.addCleanup(() => closePopup(popup));
    record.promise = (async () => {
        try {
            // Reserve the popup in the original user gesture, before any await.
            popup = client?.hasSession() ? null : openPopup();
            const accountClient = await attempt.wait(getClient());
            attempt.check();
            let candidate = await attempt.wait(accountClient.current(attempt));
            attempt.check();
            if (!candidate) {
                // Before provider navigation a physically closed blank window can be retried.
                if (!popup || popup.closed) {
                    popup = await attempt.wait(dialog(copy()[action === 'download' ? 1 : 2], openPopup, { attempt }));
                    attempt.check();
                    if (!popup) throw authError('cancelled');
                }
                candidate = await attempt.wait(accountClient.signIn(popup, 'signup', attempt));
                attempt.check();
            }
            closePopup(popup);
            status.ready();
            attempt.addCleanup(() => accountClient.discard(candidate));
            return attempt.grant(candidate.account, () => accountClient.commit(candidate, attempt));
        } catch (error) {
            const owned = pending === record && generation === id;
            attempt.fail(error);
            if (owned && !['cancelled', 'timeout'].includes(error.code)) {
                dialog(copy()[error.code === 'accountDenied' ? 7 : 6]);
            }
            return null;
        }
    })();
    return record.promise;
}

const resumed = new WeakSet();
let activeLink;
async function gateLink(event) {
    const link = event.target.closest?.('a[href]');
    if (!link || event.defaultPrevented || (event.type === 'auxclick' && event.button !== 1)) return;
    if (resumed.has(link)) { resumed.delete(link); return; }
    const url = new URL(link.href, location.href);
    const action = link.dataset.authAction || (url.origin === location.origin && /\.pdf$/i.test(url.pathname) ? 'download' : '');
    if (!['download', 'feedback'].includes(action)) return;
    event.preventDefault();
    if (activeLink || url.origin !== location.origin) return;
    const gate = window.ScriptaHubAuth;
    if (!compatibleGate(gate)) { reloadGuidance(); return; }
    const activation = { link };
    activeLink = activation;
    const target = link.target;
    const download = link.hasAttribute('download');
    const newWindow = target === '_blank' || event.button === 1 || event.ctrlKey || event.metaKey || event.shiftKey;
    link.setAttribute('aria-busy', 'true');
    let grant;
    try {
        grant = await gate.requireAccount(action, activation, grantApiVersion);
        if (!grant) return;
        if (!link.isConnected) { grant.cancel(); return; }
        if (newWindow && !download) {
            const text = continuation[language()] || continuation.en;
            await dialog(text[1], undefined, { destination: url, heading: text[0], grant });
            return;
        }
        grant.publish(() => {
            // Preserve the captured destination even if the page edited the original node.
            const previousHref = link.href;
            const previousTarget = link.target;
            link.href = url.href;
            link.target = target;
            resumed.add(link);
            try { link.click(); } finally {
                resumed.delete(link);
                link.href = previousHref;
                link.target = previousTarget;
            }
        });
    } catch { grant?.cancel(); } finally {
        if (activeLink === activation) {
            link.removeAttribute('aria-busy');
            activeLink = undefined;
        }
    }
}
document.addEventListener('click', gateLink);
document.addEventListener('auxclick', gateLink);
window.ScriptaHubAuth = Object.freeze({ grantApiVersion, requireAccount: parentGate?.requireAccount || requireAccount });
