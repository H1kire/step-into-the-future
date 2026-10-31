import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase, ref, get, set, update, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';
import { createCharacterSprite } from './pixel-world/character-sprites.js?v=pixel-atlas-4';
import { createMonsterSprite } from './pixel-world/monster-sprites.js?v=pixel-atlas-4';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const SAVE_KEY = 'gorodskie-stranniki-save-v1';
const SESSION_KEY = 'gorodskie-stranniki-group-battle';
const ACTIVE_KEY = 'gorodskie-stranniki-active-battle';
const $ = id => document.getElementById(id);
const readSave = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') || {}; } catch { return {}; } };
const waitForUser = () => new Promise(resolve => {
  let stop = () => {};
  stop = onAuthStateChanged(auth, user => { stop(); resolve(user); });
});
const cleanMember = (uid, member, index) => ({
  uid,
  nickname: String(member?.nickname || 'Игрок').slice(0, 20),
  classId: String(member?.classId || 'adventurer'),
  level: Math.max(1, Number(member?.level) || 1),
  joinedAt: Number(member?.joinedAt) || index
});
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const classNames = { adventurer: 'Странник', warrior: 'Воин', archer: 'Стрелок', mage: 'Маг' };

export function getStoredGroupBattle() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
export function clearStoredGroupBattle() {
  localStorage.removeItem(SESSION_KEY);
}

function getLocalCombatStats() {
  const save = readSave();
  const state = save.state || {};
  const level = Math.max(1, Number(state.level) || 1);
  const attrs = { attack: 12, defense: 0, dexterity: 0, vitality: 0, wisdom: 0, speed: 0, ...(state.attributes || {}) };
  const equipment = state.equipment && typeof state.equipment === 'object' ? state.equipment : {};
  let weaponDamage = 0;
  for (const slot of ['Оружие', '2 рука']) {
    const item = equipment[slot];
    weaponDamage += Number(item?.damage ?? item?.attackBonus) || 0;
  }
  for (const item of Object.values(equipment)) {
    if (!item) continue;
    for (const [key, value] of Object.entries(item.stats || {})) {
      if (key in attrs) attrs[key] += Number(value) || 0;
    }
    attrs.defense += Number(item.defenseBonus) || 0;
  }
  const maxHp = Math.max(100, Number(state.maxHp) || 100);
  const maxEnergy = Math.max(50, Number(state.maxEnergy) || 50);
  return {
    level,
    classId: ['warrior', 'archer', 'mage'].includes(state.ascensionClass) ? state.ascensionClass : 'adventurer',
    hp: Math.max(0, Math.min(maxHp, Number(state.hp) || 0)),
    maxHp,
    energy: Math.max(0, Math.min(maxEnergy, Number(state.energy) || 0)),
    maxEnergy,
    attack: Math.max(1, (5 + weaponDamage) * (1 + attrs.attack / 50) * (1 + attrs.dexterity / 75)),
    defense: Math.max(0, attrs.defense * Math.max(0.1, level * 0.1)),
    speed: Math.max(0, Number(attrs.speed) || 0),
    potions: Math.max(0, Number(state.potions) || 0),
    manaPotions: Math.max(0, Math.min(10, Number(state.manaPotions) || 0))
  };
}

export async function initializeGroupBattle({ onError } = {}) {
  const user = await waitForUser();
  if (!user || user.isAnonymous) return { enabled: false, reason: 'google-auth-required' };

  const memberLink = await get(ref(db, 'groupMembers/' + user.uid));
  const groupId = memberLink.val();
  if (!groupId) return { enabled: false, reason: 'not-in-group' };

  const groupRef = ref(db, 'groups/' + groupId);
  const groupSnap = await get(groupRef);
  const group = groupSnap.val();
  if (!group) return { enabled: false, reason: 'group-not-found' };

  const members = Object.values(group.members || {})
    .filter(member => member?.uid)
    .sort((a, b) => (Number(a.joinedAt) || 0) - (Number(b.joinedAt) || 0))
    .map((member, index) => cleanMember(member.uid, member, index));
  if (members.length < 2) return { enabled: false, reason: 'solo-group', groupId };

  let stopped = false;
  let lastSessionId = '';
  const stopActive = onValue(ref(db, 'groups/' + groupId + '/activeBattle'), snapshot => {
    if (stopped) return;
    const active = snapshot.val();
    if (!active?.sessionId || active.status !== 'active' || active.sessionId === lastSessionId) return;
    lastSessionId = active.sessionId;
    const current = getStoredGroupBattle();
    if (current?.sessionId === active.sessionId) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ groupId, sessionId: active.sessionId }));
    if (!location.pathname.endsWith('/battle.html')) location.href = './battle.html';
  }, error => onError?.(error));

  async function createSession(enemy) {
    const freshGroup = (await get(groupRef)).val();
    if (user.uid !== freshGroup?.leaderUid) throw new Error('Только создатель группы может начать групповой бой.');
    if (freshGroup.groupBattleEnabled === false) return false;
    if (!enemy?.elite || !enemy?.id || !enemy?.name) return false;
    if (Object.keys(freshGroup.members || {}).length < 2) return false;
    const current = (await get(ref(db, 'groups/' + groupId + '/activeBattle'))).val();
    if (current?.status === 'active') throw new Error('В группе уже идёт сражение.');

    const sessionId = 'battle_' + Date.now().toString(36) + '_' + user.uid.slice(0, 6);
    const roster = {};
    for (const member of members) {
      roster[member.uid] = {
        ...member,
        status: 'waiting',
        stats: null,
        joinedAt: null
      };
    }
    const enemyData = {
      id: String(enemy.id),
      name: String(enemy.name),
      level: Math.max(1, Number(enemy.level) || 1),
      hp: Math.max(1, Number(enemy.hp) || 1),
      maxHp: Math.max(1, Number(enemy.maxHp) || Number(enemy.hp) || 1),
      atk: Math.max(1, Number(enemy.atk) || 1),
      def: Math.max(0, Number(enemy.def) || 0),
      xp: Math.max(1, Number(enemy.xp) || 20),
      coins: Math.max(1, Number(enemy.coins) || 5),
      imageKey: String(enemy.imageKey || 'slime'),
      elite: true,
      eliteKey: String(enemy.eliteKey || 'common')
    };
    const session = {
      sessionId, groupId, leaderUid: user.uid,
      status: 'active', phase: 'joining',
      round: 1, turnIndex: 0,
      turnOrder: members.map(member => member.uid),
      joinDeadline: Date.now() + 20000,
      roster, enemy: enemyData,
      actions: {}, events: [{ text: 'Элитный противник обнаружен! Участники подключаются к бою.', kind: 'info' }],
      createdAt: Date.now(), updatedAt: Date.now()
    };
    await set(ref(db, 'groupBattleSessions/' + sessionId), session);
    await update(groupRef, {
      activeBattle: { sessionId, leaderUid: user.uid, status: 'active', startedAt: Date.now(), enemy: enemyData }
    });
    localStorage.setItem(SESSION_KEY, JSON.stringify({ groupId, sessionId }));
    return session;
  }

  async function joinSession(sessionId) {
    const sessionRef = ref(db, 'groupBattleSessions/' + sessionId);
    const session = (await get(sessionRef)).val();
    if (!session || session.status !== 'active' || !session.roster?.[user.uid]) {
      throw new Error('Сражение уже завершено или ты не входишь в эту группу.');
    }
    await update(ref(db, 'groupBattleSessions/' + sessionId + '/roster/' + user.uid), {
      status: 'ready',
      stats: getLocalCombatStats(),
      joinedAt: Date.now()
    });
    return session;
  }

  async function submitAction(sessionId, type) {
    if (!['attack', 'ability', 'potion', 'manaPotion'].includes(type)) throw new Error('Неизвестное действие.');
    const session = (await get(ref(db, 'groupBattleSessions/' + sessionId))).val();
    if (!session || session.status !== 'active' || session.phase !== 'players') throw new Error('Сейчас нельзя совершить ход.');
    if (session.turnOrder?.[session.turnIndex] !== user.uid) throw new Error('Сейчас ход другого участника.');
    const actionId = user.uid + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    await set(ref(db, 'groupBattleSessions/' + sessionId + '/actions/' + user.uid), {
      type, uid: user.uid, round: session.round, actionId, submittedAt: Date.now()
    });
  }

  return {
    enabled: true, user, groupId, group, members,
    isLeader: user.uid === group.leaderUid,
    createSession, joinSession, submitAction,
    close() { stopped = true; stopActive(); }
  };
}

function seededRandom(seed) {
  let hash = 2166136261;
  for (let i = 0; i < String(seed).length; i++) {
    hash ^= String(seed).charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash += hash << 13; hash ^= hash >>> 7; hash += hash << 3; hash ^= hash >>> 17; hash += hash << 5;
  return (hash >>> 0) / 4294967295;
}
function addEvent(session, text, kind) {
  session.events = Array.isArray(session.events) ? session.events : [];
  session.events.push({ text, kind: kind || 'info', at: Date.now() });
  session.events = session.events.slice(-30);
}
function processAction(session, uid, action) {
  const member = session.roster?.[uid];
  if (!member?.stats || member.status !== 'ready' || member.stats.hp <= 0) return;
  const stats = member.stats;
  let text = '';
  if (action.type === 'attack' || action.type === 'ability') {
    const ability = action.type === 'ability';
    if (ability && stats.energy < 15) return;
    if (ability) stats.energy -= 15;
    const roll = seededRandom(action.actionId || (uid + session.round));
    const critical = roll < Math.min(0.35, 0.03 + (Number(stats.speed) || 0) * 0.001);
    const spread = seededRandom((action.actionId || uid) + '_damage') * 5;
    const hit = Math.max(1, Math.round((Number(stats.attack) || 1) * (ability ? 1.5 : 1) * (critical ? 2 : 1) - Math.max(0, Number(session.enemy.def) || 0) + spread));
    session.enemy.hp = Math.max(0, session.enemy.hp - hit);
    text = member.nickname + (ability ? ' использует особую атаку и наносит ' : ' атакует и наносит ') + hit + ' урона' + (critical ? ' (критический удар)!' : '.');
  } else if (action.type === 'potion') {
    if (stats.potions < 1 || stats.hp >= stats.maxHp) return;
    stats.potions--;
    const heal = Math.min(Math.ceil(stats.maxHp * 0.25), stats.maxHp - stats.hp);
    stats.hp += heal;
    text = member.nickname + ' использует зелье здоровья: +' + heal + ' HP.';
  } else if (action.type === 'manaPotion') {
    if (stats.manaPotions < 1 || stats.energy >= stats.maxEnergy) return;
    stats.manaPotions--;
    const restored = Math.min(Math.ceil(stats.maxEnergy * 0.25), stats.maxEnergy - stats.energy);
    stats.energy += restored;
    text = member.nickname + ' использует зелье маны: +' + restored + ' энергии.';
  }
  if (text) addEvent(session, text, 'good');
}
function applyEnemyTurn(session) {
  const alive = session.turnOrder.filter(uid => {
    const member = session.roster?.[uid];
    return member?.status === 'ready' && member.stats && member.stats.hp > 0;
  });
  if (!alive.length) {
    session.status = 'defeat';
    session.phase = 'finished';
    addEvent(session, 'Все участники потеряли сознание. Групповое сражение окончено.', 'bad');
    return;
  }
  const targetIndex = Math.floor(seededRandom(session.sessionId + ':' + session.round + ':target') * alive.length);
  const targetUid = alive[Math.min(alive.length - 1, targetIndex)];
  const target = session.roster[targetUid];
  const random = seededRandom(session.sessionId + ':' + session.round + ':damage');
  const raw = ((Number(session.enemy.atk) || 1) + random * 4) * (0.95 + random * 0.15);
  const hit = Math.max(1, Math.round((raw - (Number(target.stats.defense) || 0) * 0.55) / 5));
  target.stats.hp = Math.max(0, target.stats.hp - hit);
  addEvent(session, session.enemy.name + ' выбирает целью ' + target.nickname + ' и наносит ' + hit + ' урона.', 'bad');
  if (session.turnOrder.every(uid => (Number(session.roster?.[uid]?.stats?.hp) || 0) <= 0)) {
    session.status = 'defeat';
    session.phase = 'finished';
    addEvent(session, 'Все участники потеряли сознание. Групповое сражение окончено.', 'bad');
  } else {
    session.round++;
    session.turnIndex = 0;
  }
}
async function leaderTick(sessionRef, sessionId) {
  const snap = await get(sessionRef);
  const session = snap.val();
  if (!session || session.status !== 'active') return;
  if (session.phase === 'joining') {
    const ready = session.turnOrder.filter(uid => session.roster?.[uid]?.status === 'ready' && session.roster?.[uid]?.stats);
    if (ready.length && (ready.length === session.turnOrder.length || Date.now() >= session.joinDeadline)) {
      await runTransaction(sessionRef, current => {
        if (!current || current.status !== 'active' || current.phase !== 'joining') return;
        const joined = current.turnOrder.filter(uid => current.roster?.[uid]?.status === 'ready' && current.roster?.[uid]?.stats);
        if (!joined.length) return;
        current.turnOrder = joined;
        current.turnIndex = 0;
        current.phase = 'players';
        addEvent(current, 'Группа готова. Начинается раунд 1!', 'info');
        return current;
      });
    }
    return;
  }
  if (session.phase !== 'players') return;
  const uid = session.turnOrder?.[session.turnIndex];
  const action = uid ? session.actions?.[uid] : null;
  if (uid && session.roster?.[uid]?.status === 'ready' && Number(session.roster?.[uid]?.stats?.hp) <= 0) {
    await runTransaction(sessionRef, current => {
      if (!current || current.status !== 'active' || current.phase !== 'players' || current.turnOrder?.[current.turnIndex] !== uid || Number(current.roster?.[uid]?.stats?.hp) > 0) return;
      if (current.turnIndex + 1 < current.turnOrder.length) current.turnIndex++;
      else { applyEnemyTurn(current); if (current.status === 'active') addEvent(current, 'Раунд ' + current.round + '. Ходы участников.', 'info'); }
      current.updatedAt = Date.now();
      return current;
    });
    return;
  }
  if (!uid || !action || action.round !== session.round) return;
  await runTransaction(sessionRef, current => {
    if (!current || current.status !== 'active' || current.phase !== 'players') return;
    const currentUid = current.turnOrder?.[current.turnIndex];
    const pending = currentUid ? current.actions?.[currentUid] : null;
    if (currentUid !== uid || !pending || pending.actionId !== action.actionId || pending.round !== current.round) return;
    processAction(current, currentUid, pending);
    current.actions[currentUid] = null;
    if (current.enemy.hp <= 0) {
      current.status = 'victory';
      current.phase = 'finished';
      addEvent(current, 'Победа! Элитный противник повержен.', 'good');
      return current;
    }
    if (current.turnIndex + 1 < current.turnOrder.length) {
      current.turnIndex++;
    } else {
      applyEnemyTurn(current);
      if (current.status === 'active') addEvent(current, 'Раунд ' + current.round + '. Ходы участников.', 'info');
    }
    current.updatedAt = Date.now();
    return current;
  });
}

function syncLocalSave(session, uid, reward) {
  const member = session.roster?.[uid];
  if (!member?.stats) return;
  const save = readSave();
  const state = save.state || {};
  state.hp = Math.max(0, Number(member.stats.hp) || 0);
  state.maxHp = Math.max(1, Number(member.stats.maxHp) || 1);
  state.energy = Math.max(0, Number(member.stats.energy) || 0);
  state.maxEnergy = Math.max(1, Number(member.stats.maxEnergy) || 1);
  state.potions = Math.max(0, Number(member.stats.potions) || 0);
  state.manaPotions = Math.max(0, Number(member.stats.manaPotions) || 0);
  if (session.status === 'defeat' && state.hp <= 0) state.hp = 1;
  if (session.status === 'victory' && reward) {
    const rewardKey = 'group-battle-rewarded-' + session.sessionId;
    if (localStorage.getItem(rewardKey) !== '1') {
      const xp = Math.max(1, Number(session.enemy.xp) || 20);
      const coins = Math.max(1, Number(session.enemy.coins) || 5);
      state.xp = Math.max(0, Number(state.xp) || 0) + xp;
      state.coins = Math.max(0, Number(state.coins) || 0) + coins;
      state.encounters = Math.max(0, Number(state.encounters) || 0) + 1;
      const attrs = { attack: 12, defense: 0, dexterity: 0, vitality: 0, wisdom: 0, speed: 0, ...(state.attributes || {}) };
      const needXp = level => Math.round(3250 * Math.pow(Math.max(1, level), 1.196));
      while (state.xp >= needXp(Math.max(1, Number(state.level) || 1))) {
        state.xp -= needXp(Math.max(1, Number(state.level) || 1));
        state.level = Math.max(1, Number(state.level) || 1) + 1;
        state.abilityPoints = (Number(state.abilityPoints) || 0) + 1;
        state.maxHp = (Number(state.maxHp) || 100) + 50;
        state.maxEnergy = (Number(state.maxEnergy) || 50) + 25;
        for (const key of ['attack', 'defense', 'dexterity', 'vitality', 'wisdom', 'speed']) attrs[key] = (Number(attrs[key]) || 0) + 10;
        state.hp = Math.min(state.maxHp, state.hp + 50);
        state.energy = Math.min(state.maxEnergy, state.energy + 25);
        state.potions = Math.min(10, state.potions + 1);
        if (state.level === 10 || (state.level >= 25 && state.level % 25 === 0)) state.ascensionPoints = (Number(state.ascensionPoints) || 0) + 1;
      }
      state.attributes = attrs;
      localStorage.setItem(rewardKey, '1');
    }
  }
  save.state = state;
  if (session.status === 'victory') {
    save.monsters = (Array.isArray(save.monsters) ? save.monsters : []).filter(monster => String(monster.id) !== String(session.enemy.id));
  }
  save.lastSimulationAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    window.dispatchEvent(new CustomEvent('game:save-request', { detail: { save } }));
  } catch (error) { console.error('Group battle save failed', error); }
}

export async function startGroupBattlePage() {
  const stored = getStoredGroupBattle();
  if (!stored?.sessionId) { window.location.replace('./index.html'); return; }
  const user = await waitForUser();
  if (!user || user.isAnonymous) {
    $('combatMessage').textContent = 'Для группового боя необходимо войти через Google.';
    return;
  }
  const sessionRef = ref(db, 'groupBattleSessions/' + stored.sessionId);
  let initial = (await get(sessionRef)).val();
  if (!initial || !initial.roster?.[user.uid]) {
    $('combatMessage').textContent = 'Групповое сражение не найдено или ты не состоишь в этой группе.';
    return;
  }
  const sessionApi = await initializeGroupBattle();
  if (!sessionApi.enabled) {
    $('combatMessage').textContent = 'Не удалось подключить группу. Вернись на карту и попробуй снова.';
    return;
  }
  if (initial.status === 'active') await sessionApi.joinSession(stored.sessionId);

  const arena = document.querySelector('.arena');
  arena.classList.add('group-arena');
  arena.innerHTML =
    '<section class="group-party" id="groupParty"></section>' +
    '<div class="versus">VS</div>' +
    '<section class="fighter enemy-fighter">' +
      '<div class="fighter-label enemy-label">ЭЛИТНЫЙ ПРОТИВНИК</div>' +
      '<div class="sprite-stage enemy-stage"><div id="groupEnemySprite" class="sprite"></div></div>' +
      '<h2 id="groupEnemyName">Враг</h2><div class="level-label" id="groupEnemyLevel"></div>' +
      '<div class="bar-label"><span>❤️ Здоровье</span><b id="groupEnemyHpText"></b></div><div class="bar"><i id="groupEnemyHpBar"></i></div>' +
      '<div class="bar-label"><span>⚔️ Урон</span><b id="groupEnemyAttack"></b></div>' +
      '<div class="bar-label"><span>🛡 Защита</span><b id="groupEnemyDefense"></b></div>' +
    '</section>';
  try { $('groupEnemySprite').append(createMonsterSprite(initial.enemy.imageKey || 'slime', 3)); } catch {}
  $('playerLevelTop').textContent = 'Групповой бой';
  $('turnTrack').innerHTML = '<div class="turn-step active" id="groupRoundStep"><span>1</span><b>Подготовка</b></div><span class="turn-arrow">→</span><div class="turn-step" id="groupEnemyStep"><span>2</span><b>Атака монстра</b></div>';
  const note = (message, kind) => {
    const p = document.createElement('p');
    p.textContent = message;
    if (kind) p.className = kind;
    $('battleLog').prepend(p);
    while ($('battleLog').children.length > 12) $('battleLog').lastElementChild.remove();
  };
  let lastEventCount = 0;
  let finishedHandled = false;
  let leaderBusy = false;
  let timer = null;
  const render = session => {
    if (!session) return;
    const party = $('groupParty');
    party.replaceChildren();
    for (const uid of session.turnOrder || Object.keys(session.roster || {})) {
      const player = session.roster?.[uid];
      if (!player) continue;
      const stats = player.stats || {};
      const isCurrent = session.phase === 'players' && session.turnOrder?.[session.turnIndex] === uid;
      const card = document.createElement('article');
      card.className = 'fighter group-player-fighter' + (uid === user.uid ? ' own-fighter' : '') + (isCurrent ? ' current-turn' : '');
      const sprite = document.createElement('div');
      sprite.className = 'sprite-stage player-stage';
      const spriteBox = document.createElement('div');
      spriteBox.className = 'sprite';
      sprite.append(spriteBox);
      try { spriteBox.append(createCharacterSprite(player.classId || 'adventurer', 3)); } catch {}
      const title = document.createElement('h2');
      title.textContent = player.nickname + (uid === user.uid ? ' · Ты' : '');
      const level = document.createElement('div');
      level.className = 'level-label';
      level.textContent = 'Уровень ' + (stats.level || player.level || 1) + ' · ' + (player.status === 'waiting' ? 'Подключение…' : (stats.hp > 0 ? 'В бою' : 'Повержен'));
      const hpLabel = document.createElement('div');
      hpLabel.className = 'bar-label';
      hpLabel.innerHTML = '<span>❤️ HP</span><b>' + (stats.hp ?? '—') + ' / ' + (stats.maxHp ?? '—') + '</b>';
      const hpBar = document.createElement('div');
      hpBar.className = 'bar';
      const hpFill = document.createElement('i');
      hpFill.style.width = stats.maxHp ? Math.max(0, Math.min(100, stats.hp / stats.maxHp * 100)) + '%' : '0%';
      hpBar.append(hpFill);
      const energyLabel = document.createElement('div');
      energyLabel.className = 'bar-label';
      energyLabel.innerHTML = '<span>⚡ Энергия</span><b>' + (stats.energy ?? '—') + ' / ' + (stats.maxEnergy ?? '—') + '</b>';
      const energyBar = document.createElement('div');
      energyBar.className = 'bar energy';
      const energyFill = document.createElement('i');
      energyFill.style.width = stats.maxEnergy ? Math.max(0, Math.min(100, stats.energy / stats.maxEnergy * 100)) + '%' : '0%';
      energyBar.append(energyFill);
      const statsLine = document.createElement('div');
      statsLine.className = 'battle-stats';
      statsLine.textContent = '⚔️ ' + Math.round(stats.attack || 0) + '   🛡 ' + Math.round(stats.defense || 0);
      card.append(sprite, title, level, hpLabel, hpBar, energyLabel, energyBar, statsLine);
      party.append(card);
    }
    $('groupEnemyName').textContent = session.enemy.name;
    $('groupEnemyLevel').textContent = 'Уровень ' + session.enemy.level;
    $('groupEnemyHpText').textContent = Math.max(0, Math.ceil(session.enemy.hp)) + ' / ' + session.enemy.maxHp;
    $('groupEnemyHpBar').style.width = Math.max(0, Math.min(100, session.enemy.hp / session.enemy.maxHp * 100)) + '%';
    $('groupEnemyAttack').textContent = session.enemy.atk;
    $('groupEnemyDefense').textContent = session.enemy.def;
    $('groupRoundStep').querySelector('b').textContent = session.phase === 'joining' ? 'Подключение' : 'Раунд ' + session.round;
    $('groupEnemyStep').classList.toggle('active', session.phase === 'enemy');
    $('groupRoundStep').classList.toggle('active', session.phase !== 'enemy');
    const own = session.roster?.[user.uid];
    const isTurn = session.status === 'active' && session.phase === 'players' && session.turnOrder?.[session.turnIndex] === user.uid && own?.stats?.hp > 0;
    const waiting = session.status === 'active' && session.phase === 'joining';
    $('combatMessage').textContent = session.status === 'victory' ? 'Победа! Элитный противник повержен.' :
      session.status === 'defeat' ? 'Группа потерпела поражение.' :
      waiting ? 'Ожидаем подключения участников…' :
      isTurn ? 'Твой ход! Выбери действие.' :
      'Ход игрока: ' + (session.roster?.[session.turnOrder?.[session.turnIndex]]?.nickname || 'ожидание');
    $('basicAttack').disabled = !isTurn || !!session.actions?.[user.uid];
    $('abilityAttack').disabled = !isTurn || !!session.actions?.[user.uid] || (own?.stats?.energy || 0) < 15;
    $('usePotion').disabled = !isTurn || !!session.actions?.[user.uid] || (own?.stats?.potions || 0) < 1 || (own?.stats?.hp || 0) >= (own?.stats?.maxHp || 0);
    $('useManaPotion').disabled = !isTurn || !!session.actions?.[user.uid] || (own?.stats?.manaPotions || 0) < 1 || (own?.stats?.energy || 0) >= (own?.stats?.maxEnergy || 0);
    $('potionCount').textContent = (own?.stats?.potions || 0) + ' осталось';
    $('manaPotionCount').textContent = (own?.stats?.manaPotions || 0) + ' осталось';
    $('abilityCost').textContent = '15 энергии';
    if (session.status !== 'active') $('returnAfterFight').hidden = false;
    if (session.events?.length > lastEventCount) {
      for (const event of session.events.slice(lastEventCount)) note(event.text, event.kind);
      lastEventCount = session.events.length;
    }
  };
  const applySnapshot = session => {
    if (!session) return;
    render(session);
    syncLocalSave(session, user.uid, session.status === 'victory');
    if (session.status !== 'active' && !finishedHandled) {
      finishedHandled = true;
      if (user.uid === session.leaderUid) {
        update(ref(db, 'groups/' + session.groupId + '/activeBattle'), { status: session.status, finishedAt: Date.now() }).catch(console.error);
      }
      $('combatMessage').textContent = session.status === 'victory' ? 'Победа! Награды сохранены.' : 'Сражение окончено. Здоровье синхронизировано.';
    }
  };
  const unsubscribe = onValue(sessionRef, snapshot => {
    const session = snapshot.val();
    applySnapshot(session);
    if (user.uid === session?.leaderUid && session?.status === 'active' && !leaderBusy) {
      leaderBusy = true;
      leaderTick(sessionRef, stored.sessionId).catch(error => console.error('Group battle authority error', error)).finally(() => { leaderBusy = false; });
    }
  }, error => { $('combatMessage').textContent = 'Ошибка синхронизации: ' + error.message; });
  if (user.uid === initial.leaderUid) {
    timer = setInterval(() => {
      if (!leaderBusy) {
        leaderBusy = true;
        leaderTick(sessionRef, stored.sessionId).catch(error => console.error(error)).finally(() => { leaderBusy = false; });
      }
    }, 1500);
  }
  const send = type => sessionApi.submitAction(stored.sessionId, type).catch(error => {
    $('combatMessage').textContent = error.message || 'Не удалось отправить действие.';
  });
  $('basicAttack').onclick = () => send('attack');
  $('abilityAttack').onclick = () => send('ability');
  $('usePotion').onclick = () => send('potion');
  $('useManaPotion').onclick = () => send('manaPotion');
  $('exitBattle').addEventListener('click', event => {
    event.preventDefault();
    $('combatMessage').textContent = 'Групповой бой нельзя покинуть отдельно. Дождись окончания сражения.';
  });
  $('returnAfterFight').onclick = () => {
    if (!finishedHandled) return;
    unsubscribe();
    if (timer) clearInterval(timer);
    sessionApi.close();
    clearStoredGroupBattle();
    localStorage.removeItem(ACTIVE_KEY);
    window.location.href = './index.html';
  };
  $('returnAfterFight').hidden = true;
  $('returnAfterFight').textContent = 'Вернуться на карту';
  applySnapshot(initial);
}

let groupBattleApi = null;
let groupBattleInit = null;
async function connectGroupBattle() {
  if (groupBattleApi?.enabled) return groupBattleApi;
  if (groupBattleInit) return groupBattleInit;
  groupBattleInit = initializeGroupBattle({ onError: error => console.error('Group battle connection failed', error) })
    .then(api => { if (api.enabled) groupBattleApi = api; return api; })
    .finally(() => { groupBattleInit = null; });
  return groupBattleInit;
}
if (typeof window !== 'undefined') {
  window.startGroupBattleForEnemy = async enemy => {
    if (!enemy?.elite) return false;
    const api = await connectGroupBattle();
    if (!api.enabled || !api.isLeader) return false;
    const session = await api.createSession(enemy);
    if (!session) return false;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ groupId: api.groupId, sessionId: session.sessionId }));
    localStorage.setItem(ACTIVE_KEY, String(enemy.id));
    window.location.href = './battle.html';
    return true;
  };
  window.addEventListener('game:group-changed', () => {
    if (groupBattleApi) groupBattleApi.close();
    groupBattleApi = null;
    connectGroupBattle().catch(error => console.error('Group battle reconnect failed', error));
  });
  connectGroupBattle().catch(error => console.error('Group battle initialization failed', error));
}
