import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-check.js';
import { getAuth, signInAnonymously, GoogleAuthProvider, linkWithPopup, signInWithPopup, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase, ref, onValue, set, onDisconnect } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

import { firebaseConfig, appCheckSiteKey, developerUid } from './firebase-config.js';

const onlineStatus = document.getElementById('onlineStatus');
let lastPosition = null, lastSentAt = 0, currentPlayerRef = null, unsubscribePlayers = null;
const app = initializeApp(firebaseConfig);
if (appCheckSiteKey) initializeAppCheck(app, { provider: new ReCaptchaV3Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
const auth = getAuth(app);
const database = getDatabase(app);

window.addEventListener('game:position', event => {
  const { lat, lng, name } = event.detail || {};
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  lastPosition = { lat, lng, name: String(name || 'Странник').slice(0, 24) };
  publishPosition();
});

function publishPosition() {
  if (!auth.currentUser || !currentPlayerRef || !lastPosition) return;
  const wait = 3000 - (Date.now() - lastSentAt);
  if (wait > 0) { setTimeout(publishPosition, wait); return; }
  lastSentAt = Date.now();
  set(currentPlayerRef, { ...lastPosition, updatedAt: Date.now() })
    .catch(error => { onlineStatus.textContent = 'Онлайн: ошибка записи'; console.error('Firebase presence write failed', error); });
}
setInterval(() => { if (!document.hidden) publishPosition(); }, 10000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) publishPosition(); });

onAuthStateChanged(auth, async user => {
  if (!user) {
    try { await signInAnonymously(auth); }
    catch (error) { showAuthError(error); }
    return;
  }
  window.firebasePlayerUid = user.uid;
  window.dispatchEvent(new CustomEvent('firebase:auth', { detail: {
    uid: user.isAnonymous ? '' : user.uid,
    name: user.displayName || user.email || '',
    isDeveloper: !user.isAnonymous && !!developerUid && user.uid === developerUid
  }}));
  currentPlayerRef = ref(database, `players/${user.uid}`);
  if (unsubscribePlayers) unsubscribePlayers();
  unsubscribePlayers = onValue(ref(database, 'players'), snapshot => {
    window.dispatchEvent(new CustomEvent('firebase:players', { detail: snapshot.val() || {} }));
  }, error => {
    onlineStatus.textContent = 'Онлайн: нет доступа к игрокам';
    console.error('Firebase players read failed', error);
  });
  onValue(ref(database, '.info/connected'), snapshot => {
    if (snapshot.val() !== true) { onlineStatus.textContent = 'Онлайн: переподключение…'; return; }
    onDisconnect(currentPlayerRef).remove().then(() => {
      onlineStatus.textContent = 'Онлайн: подключено';
      publishPosition();
    }).catch(error => {
      onlineStatus.textContent = 'Онлайн: ошибка настройки';
      console.error('Firebase disconnect cleanup failed', error);
    });
  });
});

async function connectGoogleAccount() {
  const button = document.getElementById('googleSignInBtn');
  if (!button || button.disabled) return;
  button.disabled = true;
  button.textContent = 'Подключаем Google…';
  try {
    const provider = new GoogleAuthProvider();
    const current = auth.currentUser;
    if (current?.isAnonymous) {
      try { await linkWithPopup(current, provider); }
      catch (error) {
        if (error.code !== 'auth/credential-already-in-use' && error.code !== 'auth/email-already-in-use') throw error;
        await signInWithPopup(auth, provider);
      }
    } else if (!current || current.isAnonymous) await signInWithPopup(auth, provider);
  } catch (error) {
    showAuthError(error);
    button.disabled = false;
    button.textContent = '🔐 Войти через Google';
  }
}

function showAuthError(error) {
  const code = String(error?.code || 'unknown');
  onlineStatus.textContent = code === 'auth/operation-not-allowed'
    ? 'Google-вход выключен в Firebase Authentication'
    : code === 'auth/unauthorized-domain'
      ? 'Добавь домен сайта в Firebase Authentication → Settings'
      : `Google-вход: ${code}`;
  onlineStatus.title = String(error?.message || code);
  console.error('Firebase authentication failed', error);
}

document.getElementById('googleSignInBtn')?.addEventListener('click', connectGoogleAccount);
