import { CALLBACK_MESSAGE, CALLBACK_ACK, openCallbackChannel, callbackPayload } from './auth-transport.mjs';

const responseUrl = location.href;
const messages = {
    en: ['Completing sign in… You can close this window if it stays open.', 'Return to ScriptaHub and start sign in again.'],
    fr: ['Connexion en cours… Vous pouvez fermer cette fenêtre si elle reste ouverte.', 'Revenez sur ScriptaHub et recommencez la connexion.'],
    de: ['Anmeldung wird abgeschlossen… Sie können dieses Fenster schließen, falls es geöffnet bleibt.', 'Kehren Sie zu ScriptaHub zurück und starten Sie die Anmeldung erneut.'],
    es: ['Completando el inicio de sesión… Puedes cerrar esta ventana si permanece abierta.', 'Vuelve a ScriptaHub e inicia sesión de nuevo.'],
    pt: ['A concluir o início de sessão… Pode fechar esta janela se permanecer aberta.', 'Volte ao ScriptaHub e inicie sessão novamente.'],
    it: ['Completamento dell’accesso… Puoi chiudere questa finestra se rimane aperta.', 'Torna su ScriptaHub e avvia nuovamente l’accesso.'],
    ro: ['Se finalizează autentificarea… Poți închide această fereastră dacă rămâne deschisă.', 'Revino la ScriptaHub și începe din nou autentificarea.'],
    pl: ['Kończenie logowania… Możesz zamknąć to okno, jeśli pozostaje otwarte.', 'Wróć do ScriptaHub i rozpocznij logowanie ponownie.'],
};
let language = navigator.language?.split('-')[0];
try { language = localStorage.getItem('scripta-language') || language; } catch { /* Preferences are optional. */ }
if (!messages[language]) language = 'en';
document.documentElement.lang = language;
// Keep the response out of subsequent history/referrer navigation.
history.replaceState(null, '', location.pathname);
const state = new URL(responseUrl).searchParams.get('state');
const data = { type: CALLBACK_MESSAGE, url: responseUrl };
const status = document.getElementById('auth-callback-status');
status.textContent = messages[language][1];
if (state && state.length <= 256 && callbackPayload(data, location.href, state)) {
    const channel = openCallbackChannel(window, state);
    let opener;
    try { opener = window.opener; } catch { /* The provider may sever the opener. */ }
    let delivered = false;
    const finish = () => {
        window.removeEventListener('message', receive);
        if (channel) { channel.onmessage = null; channel.close(); }
        window.clearTimeout(timer);
    };
    const acknowledge = (data) => {
        if (delivered || data?.type !== CALLBACK_ACK || data.state !== state) return;
        delivered = true;
        status.textContent = messages[language][0];
        finish();
        try { window.close(); } catch { /* Completion guidance remains visible. */ }
    };
    const receive = (event) => {
        if (opener && event.source === opener && event.origin === location.origin) acknowledge(event.data);
    };
    const timer = window.setTimeout(finish, 5000);
    window.addEventListener('message', receive);
    if (channel) channel.onmessage = (event) => acknowledge(event.data);
    try { channel?.postMessage(data); } catch { /* Fall back to the strict opener transport. */ }
    try { opener?.postMessage(data, location.origin); } catch { /* Retry guidance covers a lost opener. */ }
}
