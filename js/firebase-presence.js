import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-check.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase, ref, onValue, set, onDisconnect } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

import { firebaseConfig, appCheckSiteKey } from './firebase-config.js';

const onlineStatus = document.getElementById('onlineStatus');
let lastPosition = null, lastSentAt = 0, currentPlayerRef = null;
const app = initializeApp(firebaseConfig);
if (appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true
  });
}
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

signInAnonymously(auth).then(async ({ user }) => {
  window.firebasePlayerUid = user.uid;
  currentPlayerRef = ref(database, `players/${user.uid}`);
  onValue(ref(database, 'players'), snapshot => {
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
}).catch(error => {
  const code = String(error?.code || 'unknown');
  onlineStatus.textContent = code === 'auth/operation-not-allowed'
    ? 'Онлайн: включи Anonymous в Firebase Auth'
    : code === 'auth/unauthorized-domain'
      ? 'Онлайн: добавь домен GitHub Pages в Auth'
      : `Онлайн: ошибка входа (${code})`;
  onlineStatus.title = String(error?.message || code);
  console.error('Firebase anonymous sign-in failed', error);
});
