import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase, ref, get, set, update, onValue, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const SAVE_KEY = 'gorodskie-stranniki-save-v1';
const SESSION_KEY = 'gorodskie-stranniki-group-battle';
const ACTIVE_KEY = 'gorodskie-stranniki-active-battle';

const readLocalSave = () => {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
};
const cleanMember = (uid, member, order) => ({
  uid,
  nickname: String(member?.nickname || 'Игрок').slice(0, 20),
  classId: String(member?.classId || 'adventurer'),
  level: Math.max(1, Number(member?.level) || 1),
  order: Number(member?.joinedAt) || order,
  joinedAt: Number(member?.joinedAt) || Date.now()
});

/**
 * Shared group-battle transport.
 * The leader owns the encounter state; each participant writes only their own
 * turn intent and their own resulting save remains in their local/cloud save.
 */
export async function initializeGroupBattle({ onSession, onError } = {}) {
  const user = await new Promise(resolve => {
    const stop = onAuthStateChanged(auth, value => { stop(); resolve(value); });
  });
  if (!user || user.isAnonymous) return { enabled: false, reason: 'google-auth-required' };

  const memberLink = await get(ref(db, 'groupMembers/' + user.uid));
  const groupId = memberLink.val();
  if (!groupId) return { enabled: false, reason: 'not-in-group' };

  const groupRef = ref(db, 'groups/' + groupId);
  const groupSnap = await get(groupRef);
  const group = groupSnap.val();
  if (!group || group.groupBattleEnabled === false) return { enabled: false, reason: 'disabled', groupId };

  const members = Object.values(group.members || {})
    .filter(member => member?.uid)
    .sort((a, b) => (Number(a.joinedAt) || 0) - (Number(b.joinedAt) || 0))
    .map((member, index) => cleanMember(member.uid, member, index));
  if (members.length < 2) return { enabled: false, reason: 'solo-group', groupId, group, members };

  let stopped = false;
  let lastSessionId = '';
  const stopSession = onValue(ref(db, 'groups/' + groupId + '/activeBattle'), snapshot => {
    if (stopped) return;
    const active = snapshot.val();
    if (!active?.sessionId || active.sessionId === lastSessionId) return;
    lastSessionId = active.sessionId;
    onSession?.({ groupId, sessionId: active.sessionId, leaderUid: active.leaderUid, enemy: active.enemy || null });
  }, error => onError?.(error));

  async function createSession(enemy) {
    if (user.uid !== group.leaderUid) throw new Error('Только создатель группы может начать групповое сражение.');
    if (!enemy?.id || !enemy?.name || !enemy?.elite) throw new Error('Групповой бой запускается только против элитного монстра.');
    const current = await get(ref(db, 'groups/' + groupId + '/activeBattle'));
    if (current.exists() && current.val()?.status === 'active') throw new Error('В группе уже идёт сражение.');
    const sessionId = 'battle_' + Date.now().toString(36) + '_' + user.uid.slice(0, 6);
    const roster = {};
    for (const member of members) roster[member.uid] = {
      ...member,
      status: 'joined',
      hp: null,
      maxHp: null,
      energy: null,
      maxEnergy: null,
      lastAction: null
    };
    const session = {
      sessionId,
      groupId,
      leaderUid: user.uid,
      status: 'active',
      phase: 'players',
      round: 1,
      turnIndex: 0,
      turnOrder: members.map(member => member.uid),
      roster,
      enemy: {
        id: String(enemy.id),
        name: String(enemy.name),
        level: Number(enemy.level) || 1,
        hp: Number(enemy.hp) || 1,
        maxHp: Number(enemy.maxHp) || Number(enemy.hp) || 1,
        atk: Number(enemy.atk) || 1,
        def: Number(enemy.def) || 0,
        imageKey: String(enemy.imageKey || 'slime'),
        eliteKey: String(enemy.eliteKey || 'common')
      },
      createdAt: Date.now(),
      updatedAt: serverTimestamp()
    };
    await set(ref(db, 'groupBattleSessions/' + sessionId), session);
    await update(groupRef, { activeBattle: { sessionId, leaderUid: user.uid, status: 'active', startedAt: Date.now(), enemy: session.enemy } });
    localStorage.setItem(SESSION_KEY, JSON.stringify({ groupId, sessionId, role: 'leader' }));
    return session;
  }

  async function joinSession(sessionId) {
    const snap = await get(ref(db, 'groupBattleSessions/' + sessionId));
    const session = snap.val();
    if (!session || session.status !== 'active' || !session.roster?.[user.uid]) {
      throw new Error('Сражение уже завершено или ты не входишь в эту группу.');
    }
    await update(ref(db, 'groupBattleSessions/' + sessionId + '/roster/' + user.uid), { status: 'joined' });
    localStorage.setItem(SESSION_KEY, JSON.stringify({ groupId, sessionId, role: user.uid === session.leaderUid ? 'leader' : 'member' }));
    return session;
  }

  async function submitAction(sessionId, action) {
    if (!['attack', 'ability', 'potion', 'manaPotion', 'defend'].includes(action?.type)) throw new Error('Неизвестное действие.');
    const sessionSnap = await get(ref(db, 'groupBattleSessions/' + sessionId));
    const session = sessionSnap.val();
    if (!session || session.status !== 'active' || session.phase !== 'players') throw new Error('Сейчас нельзя совершить ход.');
    if (session.turnOrder?.[session.turnIndex] !== user.uid) throw new Error('Сейчас ход другого участника.');
    await set(ref(db, 'groupBattleSessions/' + sessionId + '/actions/' + user.uid), {
      ...action,
      uid: user.uid,
      round: session.round,
      submittedAt: Date.now()
    });
  }

  async function watchSession(sessionId, callback) {
    return onValue(ref(db, 'groupBattleSessions/' + sessionId), snapshot => callback(snapshot.val()), error => onError?.(error));
  }

  return {
    enabled: true, user, groupId, group, members,
    isLeader: user.uid === group.leaderUid,
    createSession, joinSession, submitAction, watchSession,
    close() { stopped = true; stopSession(); }
  };
}

export function getStoredGroupBattle() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
export function clearStoredGroupBattle() {
  localStorage.removeItem(SESSION_KEY);
}
