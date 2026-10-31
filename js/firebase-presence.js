import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-check.js';
import { getAuth, signInAnonymously, GoogleAuthProvider, linkWithPopup, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase, ref, onValue, onChildAdded, set, onDisconnect, get, runTransaction, update, serverTimestamp, push, query, orderByChild, limitToLast, endAt, remove } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

import { firebaseConfig, appCheckSiteKey, developerUid } from './firebase-config.js';

const onlineStatus = document.getElementById('onlineStatus');
let lastPosition = null, lastSentAt = 0, currentPlayerRef = null, unsubscribePlayers = null, unsubscribeProfile = null, unsubscribeChat = null, chatCleanupTimer = null, cleanupRunning = false, chatName = 'Странник', lastChatSentAt = 0;
let cloudUid = null, cloudReady = false, pendingCloudSave = null, cloudSaveTimer = null, cloudSaveInterval = null, lastCloudWriteAt = 0;
let cloudAutoSaveEnabled = true;
try { cloudAutoSaveEnabled = localStorage.getItem('game-cloud-autosave-v1') !== 'false'; } catch {}
const app = initializeApp(firebaseConfig);
if (appCheckSiteKey) initializeAppCheck(app, { provider: new ReCaptchaV3Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
const auth = getAuth(app);
const database = getDatabase(app);
const GAME_SAVE_KEY = 'gorodskie-stranniki-save-v1';
async function flushCloudSave(force = false) {
  const user = auth.currentUser;
  if (!cloudReady || !user || user.isAnonymous || user.uid !== cloudUid || !pendingCloudSave || (!cloudAutoSaveEnabled && !force)) return;
  const snapshot = pendingCloudSave; pendingCloudSave = null;
  try {
    const data = { ...snapshot, lastSimulationAt: Date.now() };
    await set(ref(database, 'gameSaves/' + user.uid), { data, updatedAt: serverTimestamp() });
    lastCloudWriteAt = Date.now();
    window.dispatchEvent(new CustomEvent('game:cloud-save-status', { detail: { ok: true, at: lastCloudWriteAt } }));
  } catch (error) {
    pendingCloudSave = snapshot;
    window.dispatchEvent(new CustomEvent('game:cloud-save-status', { detail: { ok: false, message: String(error?.code || error?.message || 'Firebase') } }));
    console.error('Firebase game save failed', error);
  }
}
function queueCloudSave(save, force = false) {
  if (!save || typeof save !== 'object') return;
  pendingCloudSave = save;
  if (!cloudReady || !cloudUid || (!cloudAutoSaveEnabled && !force)) return;
  const delay = force ? 0 : Math.max(0, 60000 - (Date.now() - lastCloudWriteAt));
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => flushCloudSave(force), delay);
}
window.addEventListener('game:save-request', event => queueCloudSave(event.detail?.save));
window.addEventListener('game:cloud-autosave-setting', event => {
  cloudAutoSaveEnabled = !!event.detail?.enabled;
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = null;
  if (!cloudAutoSaveEnabled) pendingCloudSave = null;
  else {
    try { const local = JSON.parse(localStorage.getItem(GAME_SAVE_KEY) || 'null'); if (local) queueCloudSave(local); } catch {}
  }
});
window.addEventListener('game:manual-cloud-save-request', async () => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) { window.dispatchEvent(new CustomEvent('game:cloud-save-status', { detail: { ok: false, message: 'Сначала войди через Google.' } })); return; }
  if (!cloudReady || cloudUid !== user.uid) { cloudUid = user.uid; cloudReady = true; }
  let snapshot = null;
  try { snapshot = JSON.parse(localStorage.getItem(GAME_SAVE_KEY) || 'null'); } catch {}
  if (!snapshot || typeof snapshot !== 'object') { window.dispatchEvent(new CustomEvent('game:cloud-save-status', { detail: { ok: false, message: 'Локальное сохранение не найдено.' } })); return; }
  try {
    await set(ref(database, 'gameSaves/' + user.uid), { data: { ...snapshot, lastSimulationAt: Date.now() }, updatedAt: serverTimestamp() });
    lastCloudWriteAt = Date.now();
    pendingCloudSave = null;
    window.dispatchEvent(new CustomEvent('game:cloud-save-status', { detail: { ok: true, at: lastCloudWriteAt } }));
  } catch (error) {
    window.dispatchEvent(new CustomEvent('game:cloud-save-status', { detail: { ok: false, message: String(error?.code || error?.message || 'Firebase') } }));
    console.error('Firebase manual cloud save failed', error);
  }
});
window.addEventListener('game:cloud-restore-request', async () => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    window.dispatchEvent(new CustomEvent('game:cloud-restore-status-result', { detail: { message: 'Сначала войди через Google.' } }));
    return;
  }
  try {
    const snapshot = await get(ref(database, 'gameSaves/' + user.uid));
    const save = snapshot.val()?.data;
    if (!snapshot.exists() || !save || typeof save !== 'object') {
      window.dispatchEvent(new CustomEvent('game:cloud-restore-status-result', { detail: { message: 'В облаке пока нет сохранения.' } }));
      return;
    }
    window.dispatchEvent(new CustomEvent('game:cloud-restore', { detail: { save, updatedAt: snapshot.val()?.updatedAt || 0 } }));
  } catch (error) {
    window.dispatchEvent(new CustomEvent('game:cloud-restore-status-result', { detail: { message: 'Ошибка загрузки из облака: ' + String(error?.code || error?.message || 'Firebase') } }));
  }
});
window.addEventListener('pagehide', () => { if (pendingCloudSave) queueCloudSave(pendingCloudSave, true); });

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
    .catch(error => { if (onlineStatus) onlineStatus.textContent = 'Онлайн: ошибка записи'; console.error('Firebase presence write failed', error); });
}
setInterval(() => { if (!document.hidden) publishPosition(); }, 10000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) publishPosition(); });

function dispatchAccount(user, profile, profileError = null) {
  if (!user || user.isAnonymous) {
    cloudUid = null; cloudReady = false; pendingCloudSave = null; if (cloudSaveTimer) clearTimeout(cloudSaveTimer); if (cloudSaveInterval) clearInterval(cloudSaveInterval); cloudSaveTimer = null; cloudSaveInterval = null;
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
    profileError: profileError ? String(profileError?.code || profileError?.message || profileError) : '',
    email: maskedEmail,
    createdAt: profile?.createdAt || Date.parse(user.metadata.creationTime || '') || Date.now()
  }}));
}

async function allocateAccountNumber(minimumExistingNumber = 0) {
  const counterRef = ref(database, 'accountCounter');
  // Rules require each counter write to increase by exactly one. Catch up
  // safely if older profiles were created before the counter was introduced.
  for (let attempt = 0; attempt < 10000; attempt++) {
    const result = await runTransaction(counterRef, value => {
      const current = Number.isSafeInteger(value) && value >= 0 ? value : 0;
      return current + 1;
    });
    if (!result.committed) throw new Error('Не удалось получить глобальный номер аккаунта');
    const number = Number(result.snapshot.val());
    if (Number.isSafeInteger(number) && number > minimumExistingNumber) return number;
  }
  throw new Error('Слишком большой разрыв в нумерации аккаунтов');
}

async function ensureAccountProfile(user) {
  const userProfileRef = ref(database, `profiles/${user.uid}`);
  const existing = await get(userProfileRef);
  let profile = existing.val() || null;
  let accountNumber = Number.isSafeInteger(profile?.accountNumber) && profile.accountNumber > 0 ? profile.accountNumber : 0;

  if (!accountNumber) {
    const profilesSnapshot = await get(ref(database, 'profiles'));
    let existingCount = 0, highestAssigned = 0;
    profilesSnapshot.forEach(child => {
      existingCount++;
      const n = Number(child.val()?.accountNumber);
      if (Number.isSafeInteger(n) && n > highestAssigned) highestAssigned = n;
    });
    accountNumber = await allocateAccountNumber(Math.max(existingCount, highestAssigned));
  }

  const defaultNickname = `User${accountNumber}`;
  const initialProfile = {
    accountNumber,
    nickname: defaultNickname,
    createdAt: Date.now(),
    nicknameChangedAt: 0,
    nicknameStandardized: true
  };

  if (!profile) {
    const profileResult = await runTransaction(userProfileRef, current => current || initialProfile);
    if (!profileResult.committed) throw new Error('Не удалось создать профиль аккаунта');
    profile = profileResult.snapshot.val();
  } else {
    const updates = {};
    if (!Number.isSafeInteger(profile.accountNumber) || profile.accountNumber <= 0) updates.accountNumber = accountNumber;
    // Never overwrite a nickname that the player has explicitly changed.
    // Old untouched profiles still receive their numbered default nickname.
    if (profile.nicknameStandardized !== true) {
      const hasExplicitNicknameChange = Number(profile.nicknameChangedAt) > 0;
      const currentNickname = String(profile.nickname || '').trim();
      if (!hasExplicitNicknameChange || !currentNickname) updates.nickname = defaultNickname;
      updates.nicknameStandardized = true;
    }
    if (!profile.createdAt) updates.createdAt = Date.now();
    if (profile.nicknameChangedAt == null) updates.nicknameChangedAt = 0;
    if (Object.keys(updates).length) {
      const previousNicknameKey = String(profile.nickname || '').trim().toLocaleLowerCase();
      await update(userProfileRef, updates);
      profile = { ...profile, ...updates };
      const nextNicknameKey = String(profile.nickname || '').trim().toLocaleLowerCase();
      if (previousNicknameKey && previousNicknameKey !== nextNicknameKey) {
        await runTransaction(ref(database, 'nicknameIndex/' + previousNicknameKey), current =>
          current === user.uid ? null : current
        );
      }
    }
  }

  // Reserve the nickname that is actually stored in the profile. Previously
  // this always reserved UserN, even for a custom nickname; a collision on
  // that unused default nickname could abort login and make the UI show "user".
  const activeNickname = String(profile.nickname || defaultNickname).trim();
  const nicknameKey = activeNickname.toLocaleLowerCase();
  const nicknameIndexRef = ref(database, 'nicknameIndex/' + nicknameKey);
  let indexResult = await runTransaction(nicknameIndexRef, current =>
    current === null || current === user.uid ? user.uid : undefined
  );

  // A stale index can belong to an account that has already changed its name.
  if (!indexResult.committed) {
    const indexSnapshot = await get(nicknameIndexRef);
    const previousOwnerUid = indexSnapshot.val();
    if (previousOwnerUid && previousOwnerUid !== user.uid) {
      const ownerProfile = (await get(ref(database, 'profiles/' + previousOwnerUid))).val();
      const ownerNickname = String(ownerProfile?.nickname || '').trim().toLocaleLowerCase();
      if (ownerNickname !== nicknameKey) {
        indexResult = await runTransaction(nicknameIndexRef, current =>
          current === previousOwnerUid ? user.uid : current === user.uid ? user.uid : undefined
        );
      }
    }
  }

  // A legacy collision in the secondary index must not invalidate a valid
  // Firebase account or hide its saved profile/nickname.
  if (!indexResult.committed) console.warn('Nickname index is occupied; profile login continues', activeNickname);
  return profile;
}
function watchProfile(user) {
  if (unsubscribeProfile) unsubscribeProfile();
  const profileRef = ref(database, `profiles/${user.uid}`);
  unsubscribeProfile = onValue(profileRef, snapshot => {
    if (snapshot.exists()) { chatName = snapshot.val().nickname || `user${snapshot.val().accountNumber}`; if (lastPosition) lastPosition.name = chatName; dispatchAccount(user, snapshot.val()); publishPosition(); }
  }, error => {
    if (onlineStatus) onlineStatus.textContent = 'Аккаунт: не удалось загрузить профиль';
    console.error('Firebase profile read failed', error);
  });
}

function watchChat(user) {
  if (unsubscribeChat) unsubscribeChat();
  const recentChat = query(ref(database, 'chatMessages'), orderByChild('createdAt'), limitToLast(100));
  unsubscribeChat = onChildAdded(recentChat, snapshot => {
    const message = snapshot.val();
    if (!message || !Number.isFinite(message.createdAt)) return;
    window.dispatchEvent(new CustomEvent('firebase:chat', { detail: { ...message, id: snapshot.key } }));
  }, error => {
    window.dispatchEvent(new CustomEvent('firebase:chat-status', { detail: { text: 'Чат недоступен: проверь Rules Realtime Database' } }));
    console.error('Firebase chat read failed', error);
  });
  window.dispatchEvent(new CustomEvent('firebase:chat-status', { detail: { text: 'Слушаю новые сообщения чата' } }));
}

async function cleanupExpiredChat() {
  if (cleanupRunning || !auth.currentUser) return;
  cleanupRunning = true;
  const cutoff = Date.now() - 10 * 60 * 1000;
  try {
    const expired = await get(query(ref(database, 'chatMessages'), orderByChild('createdAt'), endAt(cutoff), limitToFirst(100)));
    const deletions = [];
    expired.forEach(child => {
      const message = child.val();
      if (Number.isFinite(message?.createdAt) && message.createdAt <= cutoff) {
        deletions.push(remove(ref(database, `chatMessages/${child.key}`)));
      }
    });
    await Promise.all(deletions);
    if (deletions.length) window.dispatchEvent(new CustomEvent('firebase:chat-status', { detail: { text: `Автоочистка удалила сообщений: ${deletions.length}` } }));
    else window.dispatchEvent(new CustomEvent('firebase:chat-status', { detail: { text: '' } }));
  } catch (error) {
    window.dispatchEvent(new CustomEvent('firebase:chat-status', { detail: { text: 'Автоочистка: опубликуй новые Firebase Rules' } }));
    console.warn('Firebase chat cleanup failed; publish the updated Realtime Database rules', error);
  } finally {
    cleanupRunning = false;
  }
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    try { await signInAnonymously(auth); }
    catch (error) { showAuthError(error); }
    return;
  }
  window.firebasePlayerUid = user.uid;
  if (!user.isAnonymous) { cloudUid = user.uid; cloudReady = true; window.dispatchEvent(new CustomEvent('game:cloud-ready', { detail: { uid: user.uid } })); }
  if (user.isAnonymous) { chatName = 'Странник'; dispatchAccount(user, null); }
  else {
    try {
      const profile = await ensureAccountProfile(user);
      chatName = profile.nickname || `user${profile.accountNumber}`;
      if (lastPosition) lastPosition.name = chatName;
      dispatchAccount(user, profile);
      watchProfile(user);
      try {
        const cloudSnapshot = await get(ref(database, 'gameSaves/' + user.uid));
        if (cloudSnapshot.exists() && cloudSnapshot.val()?.data && typeof cloudSnapshot.val().data === 'object') {
          window.dispatchEvent(new CustomEvent('game:cloud-load', { detail: { save: cloudSnapshot.val().data, updatedAt: cloudSnapshot.val().updatedAt || 0 } }));
          pendingCloudSave = null; lastCloudWriteAt = Date.now();
        } else {
          let localSave = null;
          try { localSave = JSON.parse(localStorage.getItem(GAME_SAVE_KEY) || 'null'); } catch {}
          if (localSave) pendingCloudSave = localSave;
        }
        cloudReady = true;
        if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
        if (cloudSaveInterval) clearInterval(cloudSaveInterval);
        if (pendingCloudSave && cloudAutoSaveEnabled) queueCloudSave(pendingCloudSave);
        cloudSaveInterval = setInterval(() => flushCloudSave(), 60000);
      } catch (error) {
        cloudReady = true;
        if (onlineStatus) onlineStatus.textContent = 'Облако: ошибка загрузки';
        console.error('Firebase cloud save load failed', error);
      }
    } catch (error) {
      cloudUid = user.uid; cloudReady = true;
      window.dispatchEvent(new CustomEvent('game:cloud-ready', { detail: { uid: user.uid } }));
      dispatchAccount(user, null, error);
      if (onlineStatus) onlineStatus.textContent = 'Аккаунт: ошибка загрузки профиля — ' + String(error?.code || error?.message || 'Firebase');
      console.error('Firebase profile setup failed', error);
    }
  }
  currentPlayerRef = ref(database, `players/${user.uid}`);
  window.dispatchEvent(new Event('firebase:request-position'));
  watchChat(user);
  if (chatCleanupTimer) clearInterval(chatCleanupTimer);
  cleanupExpiredChat();
  chatCleanupTimer = setInterval(cleanupExpiredChat, 60 * 1000);
  if (unsubscribePlayers) unsubscribePlayers();
  unsubscribePlayers = onValue(ref(database, 'players'), snapshot => {
    window.dispatchEvent(new CustomEvent('firebase:players', { detail: snapshot.val() || {} }));
  }, error => {
    if (onlineStatus) onlineStatus.textContent = 'Онлайн: нет доступа к игрокам';
    console.error('Firebase players read failed', error);
  });
  onValue(ref(database, '.info/connected'), snapshot => {
    const connected = snapshot.val() === true;
    window.dispatchEvent(new CustomEvent('firebase:chat-status', { detail: { connected } }));
    if (!connected) { if (onlineStatus) onlineStatus.textContent = 'Онлайн: переподключение…'; return; }
    onDisconnect(currentPlayerRef).remove().then(() => {
      if (onlineStatus) onlineStatus.textContent = 'Онлайн: подключено';
      publishPosition();
    }).catch(error => {
      if (onlineStatus) onlineStatus.textContent = 'Онлайн: ошибка настройки';
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
  if (onlineStatus) onlineStatus.textContent = code === 'auth/operation-not-allowed'
    ? 'Google-вход выключен в Firebase Authentication'
    : code === 'auth/unauthorized-domain'
      ? 'Добавь домен сайта в Firebase Authentication → Settings'
      : `Google-вход: ${code}`;
  onlineStatus.title = String(error?.message || code);
  console.error('Firebase authentication failed', error);
}

document.getElementById('googleSignInBtn')?.addEventListener('click', connectGoogleAccount);

window.addEventListener('game:account-sign-out-request', async () => {
  try {
    await signOut(auth);
    window.dispatchEvent(new CustomEvent('firebase:account-sign-out-status', { detail: { ok: true } }));
  } catch (error) {
    console.error('Firebase sign out failed', error);
    window.dispatchEvent(new CustomEvent('firebase:account-sign-out-status', { detail: { ok: false, message: String(error?.message || error?.code || 'Не удалось выйти') } }));
  }
});

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
  let step = 'проверка профиля';
  try {
    const snapshot = await get(profileRef);
    let profile = snapshot.val();
    if (!profile) {
      step = 'создание профиля';
      profile = await ensureAccountProfile(user);
      chatName = profile.nickname || `user${profile.accountNumber}`;
      if (lastPosition) lastPosition.name = chatName;
      dispatchAccount(user, profile);
      watchProfile(user);
    }
    if (nickname === profile.nickname) { feedback.textContent = 'Этот ник уже установлен.'; setNicknameEditor(false); return; }
    step = 'проверка времени смены ника';
    // nicknameChangedAt is written with serverTimestamp(), so its stored value is
    // server time. Use the local clock for the UI countdown; the database Rules
    // remain the authority for the 24-hour limit.
    const serverNow = Date.now();
    const remaining = 86400000 - (serverNow - (profile.nicknameChangedAt || 0));
    if (remaining > 0) { feedback.textContent = `Ник можно менять через ${Math.ceil(remaining / 3600000)} ч.`; return; }
    step = 'проверка уникальности ника';
    const allProfiles = await get(ref(database, 'profiles'));
    let nicknameTaken = false;
    allProfiles.forEach(child => { if (child.key !== user.uid && String(child.val()?.nickname || '').toLocaleLowerCase() === nickname.toLocaleLowerCase()) nicknameTaken = true; });
    if (nicknameTaken) { feedback.textContent = 'Этот никнейм уже занят.'; return; }
    const nicknameKey = nickname.toLocaleLowerCase();
    const indexRef = ref(database, 'nicknameIndex/' + nicknameKey);
    const indexResult = await runTransaction(indexRef, current => current === null || current === user.uid ? user.uid : undefined);
    if (!indexResult.committed) { feedback.textContent = 'Этот никнейм уже занят.'; return; }
    step = 'запись ника в Firebase';
    try {
      await update(profileRef, { nickname, nicknameChangedAt: serverTimestamp() });
    } catch (error) {
      // Do not leave a newly reserved nickname behind when the profile write fails.
      if (nicknameKey !== String(profile.nickname || '').toLocaleLowerCase()) {
        await runTransaction(indexRef, current => current === user.uid ? null : current);
      }
      throw error;
    }
    const oldKey = String(profile.nickname || '').toLocaleLowerCase();
    if (oldKey && oldKey !== nicknameKey) { const oldIndex = ref(database, 'nicknameIndex/' + oldKey); await runTransaction(oldIndex, current => current === user.uid ? null : current); }
    setNicknameEditor(false);
    feedback.textContent = 'Ник успешно сохранён.';
  } catch (error) {
    const code = String(error?.code || '');
    const message = String(error?.message || 'ошибка Firebase');
    feedback.textContent = code.toLowerCase().includes('permission-denied') || message.toLowerCase().includes('permission_denied')
      ? `Firebase отклонил запись (${code || message}). Опубликуй обновлённые Rules; если ник менялся за последние 24 часа, дождись окончания ограничения.`
      : `Не удалось сохранить ник на этапе «${step}» (${code || 'Firebase'}): ${message}`;
    console.error('Firebase nickname update failed', error);
  } finally {
    button.disabled = false;
    button.textContent = 'Сохранить';
  }
}
document.addEventListener('click', event => { if (event.target.closest('#saveNicknameBtn')) saveNickname(); });
document.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('#nicknameInput')) saveNickname(); });
