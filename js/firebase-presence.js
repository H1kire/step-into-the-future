import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-check.js';
import { getAuth, signInAnonymously, GoogleAuthProvider, linkWithPopup, signInWithPopup, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase, ref, onValue, onChildAdded, set, onDisconnect, get, runTransaction, update, serverTimestamp, push, query, orderByChild, limitToLast } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

import { firebaseConfig, appCheckSiteKey, developerUid } from './firebase-config.js';

const onlineStatus = document.getElementById('onlineStatus');
let lastPosition = null, lastSentAt = 0, currentPlayerRef = null, unsubscribePlayers = null, unsubscribeProfile = null, unsubscribeChat = null, chatName = 'Странник', lastChatSentAt = 0;
const app = initializeApp(firebaseConfig);
if (appCheckSiteKey) initializeAppCheck(app, { provider: new ReCaptchaV3Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
const auth = getAuth(app);
const database = getDatabase(app);

window.addEventListener('game:position', event => {
  const { lat, lng, name } = event.detail || {};
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  lastPosition = { lat, lng, name: String(chatName || name || 'Странник').slice(0, 24) };
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

function dispatchAccount(user, profile) {
  if (!user || user.isAnonymous) {
    window.dispatchEvent(new CustomEvent('firebase:auth', { detail: { uid: '', profile: null } }));
    return;
  }
  const email = String(user.email || '');
  const [local = '', domain = 'gmail.com'] = email.split('@');
  const maskedEmail = email ? `${local.slice(0, 2)}__${local.slice(-2)}@${domain}` : '';
  window.dispatchEvent(new CustomEvent('firebase:auth', { detail: {
    uid: user.uid,
    isDeveloper: !!developerUid && user.uid === developerUid,
    profile,
    email: maskedEmail,
    createdAt: profile?.createdAt || Date.parse(user.metadata.creationTime || '') || Date.now()
  }}));
}

async function ensureAccountProfile(user) {
  const userProfileRef = ref(database, `profiles/${user.uid}`);
  const existing = await get(userProfileRef);
  if (existing.exists()) return existing.val();

  // This client-side counter assigns a display number when someone first enters the game.
  const counterResult = await runTransaction(ref(database, 'accountCounter'), value => (Number.isSafeInteger(value) && value >= 0 ? value : 0) + 1);
  if (!counterResult.committed) throw new Error('Не удалось получить номер аккаунта');
  const accountNumber = counterResult.snapshot.val();
  const serverOffsetSnapshot = await get(ref(database, '.info/serverTimeOffset'));
  const initialProfile = {
    accountNumber,
    nickname: `user${accountNumber}`,
    createdAt: Date.now() + (Number(serverOffsetSnapshot.val()) || 0),
    nicknameChangedAt: 0
  };
  const profileResult = await runTransaction(userProfileRef, current => current || initialProfile);
  if (!profileResult.committed) throw new Error('Не удалось создать профиль аккаунта');
  return profileResult.snapshot.val();
}

function watchProfile(user) {
  if (unsubscribeProfile) unsubscribeProfile();
  const profileRef = ref(database, `profiles/${user.uid}`);
  unsubscribeProfile = onValue(profileRef, snapshot => {
    if (snapshot.exists()) { chatName = snapshot.val().nickname || `user${snapshot.val().accountNumber}`; if (lastPosition) lastPosition.name = chatName; dispatchAccount(user, snapshot.val()); publishPosition(); }
  }, error => {
    onlineStatus.textContent = 'Аккаунт: не удалось загрузить профиль';
    console.error('Firebase profile read failed', error);
  });
}

function watchChat(user) {
  if (unsubscribeChat) unsubscribeChat();
  const recentChat = query(ref(database, 'chatMessages'), orderByChild('createdAt'), limitToLast(50));
  unsubscribeChat = onChildAdded(recentChat, snapshot => {
    const message = snapshot.val();
    if (!message || !Number.isFinite(message.createdAt)) return;
    window.dispatchEvent(new CustomEvent('firebase:chat', { detail: { ...message, id: snapshot.key } }));
  }, error => {
    window.dispatchEvent(new CustomEvent('firebase:chat-status', { detail: { text: 'Чат недоступен: проверь Rules Realtime Database' } }));
    console.error('Firebase chat read failed', error);
  });
  window.dispatchEvent(new CustomEvent('firebase:chat-status', { detail: { text: `Чат подключён · сообщения видны в радиусе 150 м` } }));
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    try { await signInAnonymously(auth); }
    catch (error) { showAuthError(error); }
    return;
  }
  window.firebasePlayerUid = user.uid;
  if (user.isAnonymous) { chatName = 'Странник'; dispatchAccount(user, null); }
  else {
    try {
      const profile = await ensureAccountProfile(user);
      chatName = profile.nickname || `user${profile.accountNumber}`;
      if (lastPosition) lastPosition.name = chatName;
      dispatchAccount(user, profile);
      watchProfile(user);
    } catch (error) {
      dispatchAccount(user, null);
      onlineStatus.textContent = 'Аккаунт: обнови Rules базы Firebase';
      console.error('Firebase profile setup failed', error);
    }
  }
  currentPlayerRef = ref(database, `players/${user.uid}`);
  watchChat(user);
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

window.addEventListener('game:chat-send', async event => {
  const { text: rawText, lat, lng } = event.detail || {};
  const message = String(rawText || '').trim().slice(0, 180);
  const user = auth.currentUser;
  if (!user || !message || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    window.dispatchEvent(new CustomEvent('firebase:chat-status', { detail: { text: 'Ждём подключения и точной GPS-позиции' } }));
    return;
  }
  if (Date.now() - lastChatSentAt < 800) return;
  lastChatSentAt = Date.now();
  try {
    await set(push(ref(database, 'chatMessages')), {
      uid: user.uid,
      name: String(chatName || 'Странник').slice(0, 24),
      text: message,
      lat,
      lng,
      createdAt: serverTimestamp()
    });
    window.dispatchEvent(new CustomEvent('firebase:chat-status', { detail: { text: 'Сообщение отправлено' } }));
  } catch (error) {
    window.dispatchEvent(new CustomEvent('firebase:chat-status', { detail: { text: 'Не удалось отправить: обнови Rules базы Firebase' } }));
    console.error('Firebase chat send failed', error);
  }
});

function setNicknameEditor(open) {
  const editor = document.getElementById('nicknameEditor');
  if (editor) editor.hidden = !open;
  if (open) {
    const input = document.getElementById('nicknameInput');
    input.value = document.getElementById('accountNickname')?.textContent || '';
    input.focus();
  }
}
document.getElementById('accountNickname')?.addEventListener('click', () => setNicknameEditor(true));
document.getElementById('editNicknameBtn')?.addEventListener('click', () => setNicknameEditor(true));
document.getElementById('cancelNicknameBtn')?.addEventListener('click', () => setNicknameEditor(false));
async function saveNickname() {
  const user = auth.currentUser;
  const input = document.getElementById('nicknameInput');
  const button = document.getElementById('saveNicknameBtn');
  const feedback = document.getElementById('nicknameFeedback');
  const nickname = input.value.trim();
  if (!user || user.isAnonymous) return;
  if (!/^[\p{L}\p{N}_-]{2,20}$/u.test(nickname)) { feedback.textContent = 'Ник: 2–20 букв, цифр, _ или -'; return; }
  const profileRef = ref(database, `profiles/${user.uid}`);
  button.disabled = true;
  button.textContent = 'Сохраняем…';
  feedback.textContent = '';
  try {
    const snapshot = await get(profileRef);
    let profile = snapshot.val();
    if (!profile) {
      profile = await ensureAccountProfile(user);
      chatName = profile.nickname || `user${profile.accountNumber}`;
      if (lastPosition) lastPosition.name = chatName;
      dispatchAccount(user, profile);
      watchProfile(user);
    }
    if (nickname === profile.nickname) { feedback.textContent = 'Этот ник уже установлен.'; setNicknameEditor(false); return; }
    const offsetSnapshot = await get(ref(database, '.info/serverTimeOffset'));
    const serverNow = Date.now() + (Number(offsetSnapshot.val()) || 0);
    const remaining = 86400000 - (serverNow - (profile.nicknameChangedAt || 0));
    if (remaining > 0) { feedback.textContent = `Ник можно менять через ${Math.ceil(remaining / 3600000)} ч.`; return; }
    await update(profileRef, { nickname, nicknameChangedAt: serverTimestamp() });
    setNicknameEditor(false);
    feedback.textContent = 'Ник успешно сохранён.';
  } catch (error) {
    const code = String(error?.code || '');
    const message = String(error?.message || 'ошибка Firebase');
    feedback.textContent = code.toLowerCase().includes('permission-denied') || message.toLowerCase().includes('permission_denied')
      ? `Firebase отклонил запись (${code || message}). Опубликуй обновлённые Rules; если ник менялся за последние 24 часа, дождись окончания ограничения.`
      : `Не удалось сохранить ник (${code || 'Firebase'}): ${message}`;
    console.error('Firebase nickname update failed', error);
  } finally {
    button.disabled = false;
    button.textContent = 'Сохранить';
  }
}
document.addEventListener('click', event => { if (event.target.closest('#saveNicknameBtn')) saveNickname(); });
document.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('#nicknameInput')) saveNickname(); });
