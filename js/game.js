(() => {
const $ = id => document.getElementById(id);
// Keep the GPS entry flow usable on browsers that do not implement randomUUID.
const makePlayerId = () => globalThis.crypto?.randomUUID?.() || `player-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const map = L.map('map').setView([0,0],15);
const playerIcon=L.divIcon({className:'',html:'<div class="marker youmarker">🧙</div>',iconSize:[42,42],iconAnchor:[21,21]});
const enemyIcon=L.divIcon({className:'',html:'<div class="marker enemymarker">👾</div>',iconSize:[38,38],iconAnchor:[19,19]});
const merchantIcon=L.divIcon({className:'',html:'<div class="marker merchantmarker">🧔</div>',iconSize:[40,40],iconAnchor:[20,20]});
const priestIcon=L.divIcon({className:'',html:'<div class="marker priestmarker">🧙‍♂️</div>',iconSize:[42,42],iconAnchor:[21,21]});
const SAVE_KEY='gorodskie-stranniki-save-v1';
const DEVELOPER_UID='fszpYBGnslg9qN7eWteUwE8y3s63';
function readSave(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')||{}}catch{return{}}}
const savedGame=readSave();
// Saved coordinates are only a visual hint and can become stale (for example after
// restoring a backup or moving countries). Never use them as the current GPS fix.
let pos=[0,0];
map.setView(pos,15);
let playerMarker=L.marker(pos,{icon:playerIcon}).addTo(map).bindPopup('Ты здесь — Странник');
let enemyMarker=null, enemy=null, monsters=[],gpsWatch=null,gpsAllowed=false,gpsPositionReady=false,gpsFixReady=false,gpsInitialCentered=false,lastRealGpsPos=null,lastGpsPos=null,lastGpsAt=0,lastGpsAccuracy=0,gpsCandidate=null,gpsCandidateCount=0,saveTimer=null;
let state={level:1,xp:0,hp:100,maxHp:100,coins:0,potions:1,manaPotions:0,attack:12,defense:0,encounters:0,...(savedGame.state||{})};
state.godMode=false;
const legacyAttack=Number.isFinite(state.attack)?state.attack:12,legacyDefense=Number.isFinite(state.defense)?state.defense:0;state.attributes={attack:legacyAttack,defense:legacyDefense,dexterity:0,vitality:0,wisdom:0,speed:0,...(state.attributes||{})};for(const key of ['attack','defense','dexterity','vitality','wisdom','speed'])state.attributes[key]=Number.isFinite(Number(state.attributes[key]))?Number(state.attributes[key]):0;delete state.attack;delete state.defense;
let merchantPos=Array.isArray(savedGame.merchantPos)&&savedGame.merchantPos.length===2&&Number.isFinite(savedGame.merchantPos[0])&&Number.isFinite(savedGame.merchantPos[1])&&Math.abs(savedGame.merchantPos[0])<=90&&Math.abs(savedGame.merchantPos[1])<=180?savedGame.merchantPos:null,merchantMarker=null;
let priestPos=Array.isArray(savedGame.priestPos)&&savedGame.priestPos.length===2&&Number.isFinite(savedGame.priestPos[0])&&Number.isFinite(savedGame.priestPos[1])&&Math.abs(savedGame.priestPos[0])<=90&&Math.abs(savedGame.priestPos[1])<=180?savedGame.priestPos:null,priestMarker=null;
state.inventory=Array.isArray(state.inventory)?state.inventory:[];state.equipment=state.equipment&&typeof state.equipment==='object'?state.equipment:{};state.energy=Number.isFinite(state.energy)?state.energy:(Number.isFinite(state.mana)?state.mana:50);state.maxEnergy=Number.isFinite(state.maxEnergy)?state.maxEnergy:(Number.isFinite(state.maxMana)?state.maxMana:50);delete state.mana;delete state.maxMana;
for(const item of [...state.inventory,...Object.values(state.equipment)])if(item&&typeof item==='object'){if(!Number.isFinite(item.level))item.level=1;if(!Number.isFinite(item.requiredLevel))item.requiredLevel=1}
state.bagBonus=Number.isFinite(state.bagBonus)?state.bagBonus:(state.equipment['Рюкзак']?Number(state.equipment['Рюкзак'].bagBonus)||8:0);
state.potions=Math.max(0,Math.min(10,Number.isFinite(state.potions)?state.potions:1));state.manaPotions=Math.max(0,Math.min(10,Number.isFinite(state.manaPotions)?state.manaPotions:0));
if((Number(state.levelStatVersion)||0)<2){const earnedLevels=Math.max(0,(Number(state.level)||1)-1);for(const key of ['attack','defense','dexterity','vitality','wisdom','speed'])state.attributes[key]+=earnedLevels*10;state.maxHp=100+earnedLevels*50;state.maxEnergy=50+earnedLevels*25;state.hp=Math.min(Number(state.hp)||state.maxHp,state.maxHp);state.energy=Math.min(Number(state.energy)||state.maxEnergy,state.maxEnergy);state.levelStatVersion=2}
if((Number(state.levelStatVersion)||0)<3){if((Number(state.levelStatVersion)||0)>=2)state.attributes.defense=Math.max(0,state.attributes.defense-Math.max(0,(Number(state.level)||1)-1)*10);state.levelStatVersion=3}
state.abilityPoints=Number.isFinite(state.abilityPoints)?state.abilityPoints:Math.max(0,state.level-1);state.skillNodes=Array.isArray(state.skillNodes)?state.skillNodes.map(id=>String(id).replace(/^hero-mana-/,'hero-energy-')):[];state.goldTreeNodes=state.goldTreeNodes&&typeof state.goldTreeNodes==='object'&&!Array.isArray(state.goldTreeNodes)?state.goldTreeNodes:{};
state.ascensionClass=typeof state.ascensionClass==='string'?state.ascensionClass:'';state.ascensionPoints=Number.isFinite(state.ascensionPoints)?state.ascensionPoints:(state.level>=10?1+Math.floor(state.level/25):0);
const ascensionBranchIds=['warrior','archer','mage'];let savedAscensionPath=Array.isArray(state.ascensionPath)?state.ascensionPath.filter(id=>id==='adventurer'||ascensionBranchIds.includes(id)):[];if(!savedAscensionPath.length&&state.ascensionClass)savedAscensionPath=state.ascensionClass==='adventurer'?['adventurer']:['adventurer',state.ascensionClass];state.ascensionPath=savedAscensionPath[0]==='adventurer'?['adventurer',...savedAscensionPath.slice(1).filter(id=>ascensionBranchIds.includes(id)).slice(0,1)]:[];state.ascensionClass=state.ascensionPath.at(-1)||'';let lastSimulationAt=Number(savedGame.lastSimulationAt)||Date.now();const offlineElapsedMs=Math.max(0,Math.min(7*86400000,Date.now()-(Number(savedGame.lastSimulationAt)||Date.now())));if(offlineElapsedMs>0){const seconds=offlineElapsedMs/1000,attrs=state.attributes;state.hp=Math.min(state.maxHp,Math.max(0,state.hp)+state.maxHp*(.0025+attrs.vitality/100*.0005)*seconds);state.energy=Math.min(state.maxEnergy,Math.max(0,state.energy)+state.maxEnergy*(.0075+attrs.wisdom/100*.001)*seconds)}lastSimulationAt=Date.now();
function saveGame(){try{
 lastSimulationAt=Date.now();
 const savedState={...state,godMode:false};
 if(state.godMode){savedState.hp=Math.min(state.hp,state.maxHp*(1+abilityBonus('health')));savedState.energy=Math.min(state.energy,state.maxEnergy*(1+abilityBonus('energy')))}
 // Serialize the complete character state, including inventory/equipment, both
 // upgrade trees, ascension, consumables, currencies, attributes and progression.
 const completeState=JSON.parse(JSON.stringify(savedState));
 const snapshot={
  schemaVersion:2,
  state:completeState,
  pos:lastRealGpsPos,
  displayPos:pos,
  realGps:!!lastRealGpsPos,
  merchantPos,
  priestPos,
  log:Array.from($('log').children).map(p=>({text:p.textContent,kind:p.className})),
  monsters:monsters.map(({marker,...m})=>m),
  monsterSpawnCount,
  lastSimulationAt,
  savedAt:lastSimulationAt
 };
 const serialized=JSON.stringify(snapshot);
 localStorage.setItem(SAVE_KEY,serialized);
 window.dispatchEvent(new CustomEvent('game:save-request',{detail:{save:JSON.parse(serialized)}}));
 }catch(error){console.error('Game save failed',error);window.dispatchEvent(new CustomEvent('game:local-save-status',{detail:{ok:false,message:String(error?.message||error)}}))}}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveGame,350)}
let monsterSpawnCount=Math.max(0,Math.floor(Number(savedGame.monsterSpawnCount)||0));
let devMode=false,isDeveloper=false,turn='player',lastAttack=0,combatId=0,activeItemDrag=null,activeInventoryScroll=null,inventoryPage=0;
function setupPanels(){
 const aside=document.querySelector('aside');
 const playerHud=aside.querySelector(':scope > .card:first-child');playerHud.id='playerHud';playerHud.classList.add('floating-panel');document.body.append(playerHud);
 const merchantPanel=aside.querySelector('#merchantPanel');merchantPanel.style.left=innerWidth<=780?'8px':`${Math.max(12,(innerWidth-430)/2)}px`;merchantPanel.style.top=innerWidth<=780?'8vh':'12vh';merchantPanel.style.transform='none';
 const priestPanel=$('priestPanel');priestPanel.style.left=innerWidth<=780?'8px':`${Math.max(12,(innerWidth-360)/2)}px`;priestPanel.style.top=innerWidth<=780?'8vh':'14vh';priestPanel.style.transform='none';
 const itemDetailPanel=$('itemDetailPanel');itemDetailPanel.style.left=innerWidth<=780?'8px':`${Math.max(12,(innerWidth-340)/2)}px`;itemDetailPanel.style.top='18vh';itemDetailPanel.style.transform='none';
 const menu=document.createElement('section');menu.id='actionMenu';menu.className='card floating-panel hidden menu-panel';menu.style.left=innerWidth<=780?'8px':`${Math.max(12,innerWidth-320)}px`;menu.style.top=innerWidth<=780?'auto':'72px';if(innerWidth<=780)menu.style.bottom='calc(64px + env(safe-area-inset-bottom,0px))';menu.innerHTML='<div class="panel-title"><h2>Меню</h2><button type="button" class="secondary panel-close" aria-label="Закрыть меню">✕</button></div><div class="hud-tools"><button type="button" class="secondary" data-open="statsPanel">📊 Герой</button><button type="button" class="secondary" data-open="logPanel">📜 Журнал</button><button type="button" class="secondary" data-open="bagPanel">🎒 Снаряжение</button><button type="button" class="secondary" data-open="chatPanel">💬 Чат</button><button type="button" class="secondary" id="ascensionOpen">✨ Вознесение</button><button type="button" class="secondary" data-open="accountPanel">👤 Аккаунт</button><button type="button" class="secondary" id="developerMenuButton" data-open="devPanel" hidden>🛠 Меню разработчика</button></div>';document.body.append(menu);
 const menuButton=document.createElement('button');menuButton.type='button';menuButton.id='menuToggle';menuButton.className='primary menu-toggle';menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-controls','actionMenu');menuButton.textContent='☰ Меню';document.body.append(menuButton);menuButton.addEventListener('click',()=>{const open=menu.classList.toggle('hidden')===false;menuButton.setAttribute('aria-expanded',String(open));menu.style.zIndex='5000'});
 const startLeft=Math.max(8,Math.min(365,innerWidth-365));const stats=document.createElement('section');stats.id='statsPanel';stats.className='card floating-panel hidden';stats.style.left=`${startLeft}px`;stats.style.top='74px';stats.innerHTML='<div class="panel-title"><h2>Характеристики героя</h2><button type="button" class="secondary panel-close">✕</button></div><div id="heroStats"></div>';document.body.append(stats);
 const account=document.createElement('section');account.id='accountPanel';account.className='card floating-panel hidden account-panel';account.style.left=`${startLeft}px`;account.style.top='74px';account.innerHTML='<div class="panel-title"><h2>Аккаунт</h2><button type="button" class="secondary panel-close" aria-label="Закрыть аккаунт">✕</button></div><div id="accountGuest"><p class="sub">Ты играешь как гость. Вход через Google необязателен и позволит закрепить аккаунт.</p><button type="button" class="primary full" id="googleSignInBtn">🔐 Войти через Google</button></div><div id="accountProfile" hidden><div class="account-nickname-row"><button type="button" class="account-nickname" id="accountNickname" title="Нажми, чтобы изменить ник"></button><button type="button" class="secondary" id="editNicknameBtn" aria-label="Изменить ник">✎</button></div><div id="nicknameEditor" hidden><input id="nicknameInput" maxlength="20" autocomplete="nickname" placeholder="Новый ник"><button type="button" class="primary" id="saveNicknameBtn">Сохранить</button><button type="button" class="secondary" id="cancelNicknameBtn">Отмена</button></div><p class="account-info" id="nicknameFeedback" aria-live="polite"></p><p class="account-info" id="accountEmail"></p><p class="account-info" id="accountCreatedAt"></p><p class="account-info" id="accountUid"></p><p class="account-info" id="nicknameCooldown"></p><button type="button" class="secondary full" id="accountSignOutBtn">↩ Выйти из аккаунта</button><p class="account-info" id="accountSignOutFeedback" aria-live="polite"></p><hr><h3>Облачное сохранение</h3><label class="account-info"><input type="checkbox" id="cloudAutoSaveToggle" checked> Автоматическое сохранение (каждые 60 секунд)</label><button type="button" class="secondary full" id="cloudRestoreBtn">Восстановить сохранение из облака</button><button type="button" class="primary full" id="cloudSaveNowBtn" hidden>Сохранить прогресс в облако</button><p class="account-info" id="cloudSaveFeedback" aria-live="polite">Облачное сохранение готово.</p></div>';document.body.append(account);
 const devPanel=document.createElement('section');devPanel.id='devPanel';devPanel.className='card floating-panel hidden dev-panel';devPanel.style.left=`${startLeft}px`;devPanel.style.top='74px';devPanel.innerHTML='<div class="panel-title"><h2>Меню разработчика</h2><button type="button" class="secondary panel-close" aria-label="Закрыть меню разработчика">✕</button></div><button type="button" class="secondary full" id="devTeleportToggle">🗺 Перемещение по клику: выкл.</button><label class="dev-control">Уровни: положительное число повышает, отрицательное понижает<input id="devLevelAmount" type="number" min="-1000" max="1000" step="1" value="1"></label><button type="button" class="secondary full" id="devLevelApply">Применить изменение уровня</button><label class="dev-control">Новое количество золота<input id="devGoldAmount" type="number" min="0" step="1" value="0"></label><button type="button" class="secondary full" id="devGoldApply">Заменить золото</button><button type="button" class="secondary full" id="devGodToggle">😇 Режим Бога: выкл.</button>';document.body.append(devPanel);
 const panels=[['logPanel','log','📜 Журнал'],['bagPanel','equip','🎒 Снаряжение'],['chatPanel','chat','💬 Чат поблизости']];
 for(const [id,selector,title] of panels){const query=selector==='log'?'.log':selector==='equip'?'#bagCount':'#chatlog';const card=aside.querySelector(query).closest('.card');card.id=id;card.classList.add('floating-panel','hidden');card.style.left=`${startLeft}px`;card.style.top='74px';const bar=document.createElement('div');bar.className='panel-title';bar.innerHTML=`<h2>${title}</h2><button type="button" class="secondary panel-close">✕</button>`;card.querySelector('h2').replaceWith(bar);document.body.append(card)}
 $('devToolsCard')?.remove();const combat=aside.querySelector('#enemyCard');combat.classList.add('floating-panel');combat.style.left=`${startLeft}px`;combat.style.top='74px';const combatTitle=document.createElement('div');combatTitle.className='panel-title';combatTitle.innerHTML='<h2>Обнаружен противник!</h2><button type="button" class="secondary combat-close" aria-label="Прекратить бой и закрыть окно" title="Прекратить бой">✕</button>';combat.querySelector('h2').replaceWith(combatTitle);combatTitle.querySelector('.combat-close').addEventListener('click',closeCombat);
 menu.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(button.dataset.open==='devPanel'&&!isDeveloper)return;const panel=$(button.dataset.open);if(!panel)return;menu.classList.add('hidden');menuButton.setAttribute('aria-expanded','false');document.querySelectorAll('#logPanel,#bagPanel,#chatPanel,#statsPanel,#abilityTreePanel,#accountPanel,#devPanel').forEach(p=>p.classList.add('hidden'));panel.classList.remove('hidden');panel.style.zIndex='4500';if(button.dataset.open==='statsPanel')renderStats()}));
 document.querySelectorAll('.panel-close').forEach(button=>button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();button.closest('.floating-panel').classList.add('hidden');if(button.closest('#actionMenu'))menuButton.setAttribute('aria-expanded','false')}));
 const fitPanelToViewport=(panel,top=panel.getBoundingClientRect().top)=>{
  if(panel.id==='playerHud')return;
  const rect=panel.getBoundingClientRect();
  const headerBottom=document.querySelector('header')?.getBoundingClientRect().bottom||0;
  const safeTop=Math.max(headerBottom,Math.min(innerHeight-40,top)),left=Math.max(0,Math.min(innerWidth-panel.offsetWidth,rect.left));
  panel.style.transform='none';
  panel.style.left=`${left}px`;panel.style.top=`${safeTop}px`;panel.style.bottom='auto';
  panel.style.maxHeight=`${Math.max(40,innerHeight-safeTop-8)}px`;
 };
 let lastPanelTap=null,touchPanelDrag=null,suppressPanelClick=false,suppressPanelClickUntil=0,panelTapTimer=null;
 document.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;
  if(e.target.closest('.ability-graph-scroll,#treeZoomToolbar')){lastPanelTap=null;clearTimeout(panelTapTimer);return}
  const panel=e.target.closest('.floating-panel:not(#playerHud)');if(!panel)return;
  const now=Date.now(),isSecondTap=lastPanelTap&&lastPanelTap.panel===panel&&now-lastPanelTap.at<450&&Math.hypot(e.clientX-lastPanelTap.x,e.clientY-lastPanelTap.y)<32;
  if(!isSecondTap){lastPanelTap={panel,at:now,x:e.clientX,y:e.clientY};return}
  clearTimeout(panelTapTimer);lastPanelTap=null;const rect=panel.getBoundingClientRect();panel.style.transform='none';panel.style.left=`${rect.left}px`;panel.style.top=`${rect.top}px`;touchPanelDrag={panel,pointerId:e.pointerId,offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top,moved:false};panel.classList.add('touch-drag-armed');
  suppressPanelClick=true;e.preventDefault();e.stopPropagation();
  try{panel.setPointerCapture(e.pointerId)}catch{}
 },true);
 document.addEventListener('pointermove',e=>{
  const drag=touchPanelDrag;if(!drag||e.pointerId!==drag.pointerId)return;
  if(Math.hypot(e.movementX||0,e.movementY||0)>1)drag.moved=true;
  const headerBottom=document.querySelector('header')?.getBoundingClientRect().bottom||0;
  const left=Math.max(0,Math.min(innerWidth-drag.panel.offsetWidth,e.clientX-drag.offsetX));
  const top=Math.max(headerBottom,Math.min(innerHeight-40,e.clientY-drag.offsetY));
  drag.panel.style.left=`${left}px`;drag.panel.style.top=`${top}px`;drag.panel.style.bottom='auto';drag.panel.style.maxHeight=`${Math.max(40,innerHeight-top-8)}px`;
  e.preventDefault();
 },{capture:true,passive:false});
 const finishTouchPanelDrag=e=>{if(touchPanelDrag?.pointerId===e.pointerId){touchPanelDrag.panel.classList.remove('touch-drag-armed');touchPanelDrag=null;lastPanelTap=null;suppressPanelClickUntil=Date.now()+700;setTimeout(()=>{suppressPanelClick=false},700)}else if(lastPanelTap){const tappedPanel=lastPanelTap.panel;tappedPanel.classList.add('touch-drag-armed');clearTimeout(panelTapTimer);panelTapTimer=setTimeout(()=>tappedPanel.classList.remove('touch-drag-armed'),450)}};
 document.addEventListener('pointerup',finishTouchPanelDrag,true);document.addEventListener('pointercancel',finishTouchPanelDrag,true);
 document.addEventListener('click',e=>{if(!suppressPanelClick||Date.now()>suppressPanelClickUntil)return;suppressPanelClick=false;suppressPanelClickUntil=0;e.preventDefault();e.stopPropagation()},true);
 let desktopPanelDrag=null;
 document.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'||e.button!==0)return;
  // The ability-tree graph has its own pan/zoom gestures; never drag its parent panel from inside it.
  if(e.target.closest('.ability-graph-scroll,#treeZoomToolbar'))return;
  const panel=e.target.closest('.floating-panel:not(#playerHud):not(.hidden)');if(!panel)return;
  // Keep controls usable; the rest of the panel surface acts as a drag handle.
  if(e.target.closest('button,input,textarea,select,a,[contenteditable="true"]'))return;
  const rect=panel.getBoundingClientRect();panel.style.transform='none';panel.style.left=`${rect.left}px`;panel.style.top=`${rect.top}px`;panel.style.bottom='auto';
  desktopPanelDrag={panel,pointerId:e.pointerId,offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top,startX:e.clientX,startY:e.clientY,moved:false};
  try{panel.setPointerCapture(e.pointerId)}catch{}
 },true);
 document.addEventListener('pointermove',e=>{
  const drag=desktopPanelDrag;if(!drag||e.pointerId!==drag.pointerId)return;
  if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>3)drag.moved=true;
  if(!drag.moved)return;
  const headerBottom=document.querySelector('header')?.getBoundingClientRect().bottom||0;
  const left=Math.max(0,Math.min(innerWidth-drag.panel.offsetWidth,e.clientX-drag.offsetX));
  const top=Math.max(headerBottom,Math.min(innerHeight-40,e.clientY-drag.offsetY));
  drag.panel.style.left=`${left}px`;drag.panel.style.top=`${top}px`;drag.panel.style.maxHeight=`${Math.max(40,innerHeight-top-8)}px`;
  e.preventDefault();
 },true);
 const finishDesktopPanelDrag=e=>{
  if(!desktopPanelDrag||desktopPanelDrag.pointerId!==e.pointerId)return;
  const moved=desktopPanelDrag.moved;desktopPanelDrag=null;
  if(moved){suppressPanelClick=true;suppressPanelClickUntil=Date.now()+100;setTimeout(()=>{suppressPanelClick=false},100)}
 };
 document.addEventListener('pointerup',finishDesktopPanelDrag,true);document.addEventListener('pointercancel',finishDesktopPanelDrag,true);
 window.registerFloatingPanel=panel=>{
  if(!panel||panel.id==='playerHud'||panel.dataset.dragHandleInitialized)return;
  panel.dataset.dragHandleInitialized='true';
 };
 document.querySelectorAll('.floating-panel .panel-title').forEach(bar=>window.registerFloatingPanel(bar.closest('.floating-panel')));
 // Register panels that are added later (for example Friends, Group, Mail and DM).
 const floatingPanelObserver=new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes){
   if(!(node instanceof Element))continue;
   if(node.matches('.floating-panel'))window.registerFloatingPanel(node);
   node.querySelectorAll?.('.floating-panel').forEach(panel=>window.registerFloatingPanel(panel));
  }
 });
 floatingPanelObserver.observe(document.body,{childList:true,subtree:true});
 const centerFloatingPanel=panel=>{
  if(!panel||panel.id==='playerHud'||panel.classList.contains('hidden'))return;
  panel.style.left='50%';
  panel.style.top='50%';
  panel.style.right='auto';
  panel.style.bottom='auto';
  panel.style.transform='translate(-50%,-50%)';
  panel.style.maxHeight='calc(100dvh - 24px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))';
 };
 const openPanelObserver=new MutationObserver(records=>{
  for(const record of records){
   const panel=record.target;
   if(panel instanceof Element&&panel.classList.contains('floating-panel')&&!panel.classList.contains('hidden'))requestAnimationFrame(()=>centerFloatingPanel(panel));
  }
 });
 openPanelObserver.observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true});
 window.addEventListener('resize',()=>document.querySelectorAll('.floating-panel:not(#playerHud):not(.hidden)').forEach(centerFloatingPanel));
 const centerButton=$('centerBtn'),clearButton=$('clearEnemiesBtn');if(centerButton){centerButton.classList.add('center-control');document.body.append(centerButton)}if(clearButton){clearButton.classList.add('clear-enemies-control');document.body.append(clearButton)}document.querySelector('.mapbuttons')?.remove();
 if(clearButton)clearButton.addEventListener('click',()=>{if(enemy){enemy=null;enemyMarker=null;turn='player';$('enemyCard').classList.remove('show');$('combatStatus').textContent='Враги очищены. Найди нового противника.'}for(const monster of monsters)if(monster.marker)map.removeLayer(monster.marker);monsters=[];saveGame();log('Все противники удалены. Начинаем новый цикл появления врагов.','good');spawnEnemy(true);clearButton.blur()})
}
window.addEventListener('firebase:auth',event=>{const {uid,profile,email,createdAt,profileError}=event.detail||{};isDeveloper=uid===DEVELOPER_UID;const guest=$('accountGuest'),signedIn=$('accountProfile');if(guest)guest.hidden=!!uid;if(signedIn)signedIn.hidden=!uid;if(uid){const autoToggle=$('cloudAutoSaveToggle');if(autoToggle)autoToggle.checked=localStorage.getItem('game-cloud-autosave-v1')!=='false';const manualSave=$('cloudSaveNowBtn');if(manualSave)manualSave.hidden=autoToggle?.checked!==false;const nickname=profile?.nickname||(profile?.accountNumber?`User${profile.accountNumber}`:'Профиль не загружен');$('accountNickname').textContent=nickname;$('accountNickname').title=profile?'Нажми, чтобы изменить ник':'Профиль не удалось загрузить';if(!profile)$('nicknameFeedback').textContent='Ошибка загрузки профиля: '+(profileError||'неизвестная ошибка Firebase')+'. Проверь консоль браузера (F12) и Firebase Rules.';playerMarker.setPopupContent(`Ты здесь — ${nickname}`);$('accountEmail').textContent=email||'Google-почта не найдена';$('accountCreatedAt').textContent=`Дата регистрации: ${new Date(createdAt||profile?.createdAt||Date.now()).toLocaleDateString('ru-RU')}`;$('accountUid').textContent=`Firebase UID: ${uid}`;const editor=$('nicknameEditor'),remaining=86400000-(Date.now()-(profile?.nicknameChangedAt||0)),cooldown=$('nicknameCooldown');if(cooldown)cooldown.textContent=remaining>0?`Сменить ник можно через ${Math.ceil(remaining/3600000)} ч.`:'Ник можно изменить сейчас';if(editor)editor.hidden=true}else playerMarker.setPopupContent('Ты здесь — Странник');const devButton=$('developerMenuButton');if(devButton)devButton.hidden=!isDeveloper;if(!isDeveloper){devMode=false;if(state.godMode){state.godMode=false;state.hp=Math.min(state.hp,effectiveMaxHp());state.energy=Math.min(state.energy,effectiveMaxEnergy());$('devGodToggle').textContent='😇 Режим Бога: выкл.';render()}}});
document.addEventListener('click',event=>{if(!event.target.closest('#accountSignOutBtn'))return;const button=$('accountSignOutBtn'),feedback=$('accountSignOutFeedback');if(button){button.disabled=true;button.textContent='Выходим…'}if(feedback){feedback.textContent='Завершаем сеанс Google…';feedback.style.color='var(--muted)'}window.dispatchEvent(new Event('game:account-sign-out-request'))});
window.addEventListener('firebase:account-sign-out-status',event=>{const button=$('accountSignOutBtn'),feedback=$('accountSignOutFeedback');if(button){button.disabled=false;button.textContent='↩ Выйти из аккаунта'}if(feedback){feedback.textContent=event.detail?.ok?'Выполнен выход. Переключаемся на гостевой режим…':`Не удалось выйти: ${event.detail?.message||'ошибка'}`;feedback.style.color=event.detail?.ok?'#57e68a':'#ff7777'}});

function xpToNextLevel(level=state.level){const n=Math.max(1,Math.floor(Number(level)||1));return Math.round(3250*Math.pow(n,1.196))}
function resourceName(){return state.ascensionClass==='mage'?'Мана':'Энергия'}
function activeSkillName(){return({adventurer:'Рассечение',warrior:'Сокрушительный удар',archer:'Точный выстрел',mage:'Чародейский импульс'})[state.ascensionClass]||'Рассечение'}
function renderStats(){const a=totalAttributes(),resource=resourceName();const entries=[['Уровень',state.level],['Ability Points',state.abilityPoints],['Поинты вознесения',state.ascensionPoints],['Класс',classNames[state.ascensionClass]||'Не выбран'],['Attack',formatGameNumber(a.attack)],['Defense',formatGameNumber(a.defense)],['Dexterity',formatGameNumber(a.dexterity)],['Vitality',formatGameNumber(a.vitality)],['Wisdom',formatGameNumber(a.wisdom)],['Speed',formatGameNumber(a.speed)],['Урон',formatGameNumber(totalAttack())],['Снижение урона',formatGameNumber(effectiveDefense())],['Шанс критического удара',`${formatGameNumber(criticalChance()*100)}%`],['Опыт',`${formatGameNumber(state.xp)} / ${formatGameNumber(xpToNextLevel())}`],['Опыт до уровня',formatGameNumber(xpToNextLevel())],['Здоровье',`${formatGameNumber(state.hp)} / ${formatGameNumber(effectiveMaxHp())}`],['Максимум здоровья',formatGameNumber(effectiveMaxHp())],[resource,`${formatGameNumber(state.energy)} / ${formatGameNumber(effectiveMaxEnergy())}`],[`Максимум ${resource.toLowerCase()}`,formatGameNumber(effectiveMaxEnergy())],['Монеты',formatGameNumber(state.coins)],['Победы',state.encounters],['Предметы',inventoryItemCount()]];$('heroStats').innerHTML=entries.map(([k,v])=>`<div class="status"><b>${k}:</b> ${v}</div>`).join('')}
const playerId=makePlayerId();let peers={},peerMarkers={},seenChatIds=new Set(),channel='BroadcastChannel' in window?new BroadcastChannel('stranniki-local'):null;
const slots=['Оружие','2 рука','Шлем','Торс','Ноги','Обувь','Рюкзак'];const gearSlots=slots.filter(slot=>slot!=='Рюкзак');const rarities=[['Обычное','common'],['Необычное','uncommon'],['Редкое','rare'],['Эпическое','epic'],['Легендарное','legendary']];
function inventoryCapacity(){return 24+Math.max(0,Number(state.bagBonus)||0)}
function inventoryItemCount(){return state.inventory.reduce((count,item)=>count+(item?1:0),0)}
function firstEmptyInventorySlot(){for(let i=0;i<inventoryCapacity();i++)if(!state.inventory[i])return i;return -1}
function storeInventoryItem(item,index=firstEmptyInventorySlot()){if(!item||index<0||index>=inventoryCapacity()||state.inventory[index])return false;state.inventory[index]=item;return true}
function recalculateBagBonus(){const backpack=state.equipment['Рюкзак'];state.bagBonus=backpack?Math.max(0,Number(backpack.bagBonus)||8):0}
const merchantCatalog=[
 {type:'Оружие',price:650,attackBonus:2},
 {type:'Обувь',price:350,defenseBonus:1},
 {type:'Ноги',price:500,defenseBonus:2},
 {type:'Торс',price:750,defenseBonus:3},
 {type:'Шлем',price:500,defenseBonus:2},
 {type:'Рюкзак',price:900,bagBonus:8}
];
function abilityBonus(key){return window.AbilityTree?.getBonuses?.()[key]||0}
const attributeNames={attack:'Attack',defense:'Defense',dexterity:'Dexterity',vitality:'Vitality',wisdom:'Wisdom',speed:'Speed'},classNames={adventurer:'Авантюрист',warrior:'Воин',archer:'Стрелок',mage:'Маг'};
function itemDamage(item){return Number(item?.damage??item?.attackBonus)||0}
function itemStats(item){const stats={...(item?.stats||{})};if(item?.defenseBonus&&!Number.isFinite(stats.defense))stats.defense=Number(item.defenseBonus);if(item?.attributeBonuses)Object.assign(stats,item.attributeBonuses);return stats}
function itemAvailableToCharacter(item){const activeClass=state.ascensionClass||'adventurer';return (!Array.isArray(item?.allowedClasses)||item.allowedClasses.includes(activeClass))&&state.level>=(Number(item?.requiredLevel)||1)}
function goldTreeBonus(key){return window.GoldTree?.getBonuses?.()[key]||0}
function totalAttributes(){const totals={...state.attributes};for(const item of Object.values(state.equipment)){if(!itemAvailableToCharacter(item))continue;for(const [key,value] of Object.entries(itemStats(item)))if(Object.prototype.hasOwnProperty.call(totals,key))totals[key]+=Number(value)||0}for(const key of Object.keys(totals))totals[key]*=1+abilityBonus(key)+goldTreeBonus(key);return totals}
function renderEquipmentAttributes(){const panel=$('equipmentAttributes');if(!panel)return;const attributes=totalAttributes();panel.innerHTML=Object.entries(attributeNames).map(([key,label])=>`<div><span>${label}</span><b>${formatGameNumber(attributes[key])}</b></div>`).join('')}
function totalAttack(){if(state.godMode)return 1000000;const a=totalAttributes(),main=itemAvailableToCharacter(state.equipment['Оружие'])?itemDamage(state.equipment['Оружие']):0,offhand=itemAvailableToCharacter(state.equipment['2 рука'])?itemDamage(state.equipment['2 рука']):0,baseDamage=5+main+offhand;return baseDamage*(1+a.attack/50)*(1+a.dexterity/75)}
function effectiveMaxHp(){return state.godMode?1000000:state.maxHp*(1+abilityBonus('health')+goldTreeBonus('health'))}
function effectiveMaxEnergy(){return state.godMode?1000000:state.maxEnergy*(1+abilityBonus('energy')+goldTreeBonus('energy'))}
function effectiveDefense(){if(state.godMode)return 1000000;return totalAttributes().defense*Math.max(.1,state.level*.1)}
function criticalChance(){return Math.min(1,.01+totalAttributes().speed*.005/100)}
function rollPlayerDamage(multiplier=1){const critical=Math.random()<criticalChance();return{damage:Math.max(1,totalAttack()*multiplier*(critical?2:1)),critical}}
function rarityRoll(){let tier=0;const quality=1+abilityBonus('rarity')+goldTreeBonus('rarity');if(Math.random()<Math.min(.95,.5*quality))tier=1;if(tier>=1&&Math.random()<Math.min(.95,.5*quality))tier=2;if(tier>=2&&Math.random()<Math.min(.95,.5*quality))tier=3;if(tier>=3&&Math.random()<Math.min(.95,.4*quality))tier=4;return rarities[tier]}
function eliteRarityRoll(){const quality=1+abilityBonus('rarity')+goldTreeBonus('rarity'),a=Math.min(.95,.5*quality),b=Math.min(.95,.4*quality),weights=[1-a,a*(1-a),a*a*(1-a),a*a*a*(1-b),a*a*a*b];weights[0]*=2;weights[1]*=2;const total=weights.reduce((sum,value)=>sum+value,0);let roll=Math.random()*total;for(let tier=0;tier<weights.length;tier++){roll-=weights[tier];if(roll<0)return rarities[tier]}return rarities[0]}
const gearPrefixes=['Северный','Кованый','Лунный','Забытый','Грозовой','Рунный','Странника','Кровавый','Сумрачный','Звёздный'],gearSuffixes=['предела','рассвета','дозора','бури','истока'],gearClasses=['warrior','archer','mage'];
const gearTemplates=gearClasses.flatMap(classId=>gearSlots.flatMap(type=>Array.from({length:50},(_,index)=>({classId,type,variant:index+1,requiredLevel:Math.max(1,Math.ceil((index+1)/5))}))));
const rarityPower={common:1,uncommon:1.4,rare:1.8,epic:2.3,legendary:3};
function rollGearLevel(playerLevel){const maxLevel=Math.max(1,Math.floor(Number(playerLevel)||1)),offset=Math.random()<.65?Math.floor(Math.random()*4):Math.floor(Math.random()*Math.min(12,maxLevel));return Math.max(1,maxLevel-offset)}
function makeGearDrop(playerLevel,rarity,key){const maxLevel=Math.max(1,Math.floor(Number(playerLevel)||1)),variantLimit=Math.min(50,maxLevel),pool=gearTemplates.filter(template=>template.variant<=variantLimit&&template.requiredLevel<=maxLevel),template=pool[Math.floor(Math.random()*pool.length)]||gearTemplates[0],itemLevel=Math.max(template.requiredLevel,rollGearLevel(maxLevel)),scale=Math.sqrt(itemLevel)*rarityPower[key],jitter=()=>Math.round((.9+Math.random()*.2)*100)/100,base={name:`${classNames[template.classId]} · ${template.type} · ${gearPrefixes[(template.variant-1)%10]} ${gearSuffixes[Math.floor((template.variant-1)/10)]} · ${rarity}`,type:template.type,key,level:itemLevel,requiredLevel:template.requiredLevel,variant:template.variant,classId:template.classId,allowedClasses:template.variant%5===0?['adventurer','warrior','archer','mage']:[template.classId],stats:{},damage:0};
 const damageBase=template.type==='Оружие'?3.2:template.type==='2 рука'?2.1:0,armorBase=({Шлем:.9,Торс:1.8,Ноги:1.3,Обувь:.8})[template.type]||0;base.damage=damageBase?Math.max(1,Math.round(damageBase*scale*jitter()*10)/10):0;if(armorBase)base.stats.defense=Math.max(1,Math.round(armorBase*scale*jitter()*10)/10);
 const classPrimary={warrior:['attack','vitality','defense'],archer:['dexterity','speed','attack'],mage:['wisdom','dexterity','vitality']}[template.classId],slotPrimary=template.type==='Оружие'||template.type==='2 рука'?classPrimary[0]:template.type==='Торс'||template.type==='Шлем'?classPrimary[2]:classPrimary[1],statScale=Math.max(.5,Math.sqrt(itemLevel)*.48)*rarityPower[key];base.stats[slotPrimary]=Math.round(statScale*jitter()*10)/10;
 if(template.variant>10){const candidates=[...new Set([...classPrimary,'defense','attack','dexterity','vitality','wisdom','speed'])].filter(stat=>stat!==slotPrimary),hybridCount=2+Math.floor(Math.random()*3);for(let i=0;i<hybridCount&&candidates.length;i++){const at=Math.floor(Math.random()*candidates.length),stat=candidates.splice(at,1)[0];base.stats[stat]=Math.round(statScale*(.45+Math.random()*.55)*10)/10}}
 return base}
function makeBackpackDrop(playerLevel,rarity,key){const level=Math.max(1,Math.floor(Number(playerLevel)||1)),raritySlots={common:0,uncommon:1,rare:2,epic:3,legendary:4}[key]||0,baseSlots=Math.floor(8*Math.pow(1.5,Math.floor((level-1)/5)));return{name:`Рюкзак странника · ${rarity}`,type:'Рюкзак',key,level,requiredLevel:1,allowedClasses:['adventurer','warrior','archer','mage'],bagBonus:Math.floor(baseSlots+raritySlots),stats:{vitality:Math.round(Math.sqrt(level)*.35*rarityPower[key]*10)/10}}}
function ascensionMilestone(level){return level===10||(level>=25&&level%25===0)}
window.GameAPI={
 getSkillSnapshot(){return{level:state.level,abilityPoints:state.abilityPoints,purchased:[...state.skillNodes]}},
 purchaseSkillNode(node){if(!node||typeof node.id!=='string'||!Number.isInteger(node.cost)||node.cost<1||state.skillNodes.includes(node.id)||state.abilityPoints<node.cost)return false;const hpBefore=effectiveMaxHp(),energyBefore=effectiveMaxEnergy();state.abilityPoints-=node.cost;state.skillNodes.push(node.id);state.hp=Math.min(effectiveMaxHp(),state.hp+effectiveMaxHp()-hpBefore);state.energy=Math.min(effectiveMaxEnergy(),state.energy+effectiveMaxEnergy()-energyBefore);render();scheduleSave();return true},
 getGoldTreeSnapshot(){return{coins:state.coins,purchased:{...state.goldTreeNodes}}},
 purchaseGoldTreeNode(node){if(!node||typeof node.id!=='string'||!Number.isInteger(node.cost)||node.cost<1)return false;const ranks=Math.max(0,Math.floor(Number(state.goldTreeNodes[node.id])||0)),parentMaxRank=node.parentId?(window.GoldTree?.getNodeMaxRank?.(node.parentId)||0):0;if(ranks>=node.maxRank||state.coins<node.cost||node.parentId&&(!parentMaxRank||Number(state.goldTreeNodes[node.parentId])<parentMaxRank))return false;const hpBefore=effectiveMaxHp(),energyBefore=effectiveMaxEnergy();state.coins-=node.cost;state.goldTreeNodes[node.id]=ranks+1;state.hp=Math.min(effectiveMaxHp(),state.hp+effectiveMaxHp()-hpBefore);state.energy=Math.min(effectiveMaxEnergy(),state.energy+effectiveMaxEnergy()-energyBefore);render();scheduleSave();return true},
 getAscensionSnapshot(){return{level:state.level,points:state.ascensionPoints,classId:state.ascensionClass,selectedNodes:[...state.ascensionPath],coins:state.coins}},
 chooseAscensionClass(classId){if(state.ascensionPoints<1)return false;if(classId==='adventurer'){if(state.ascensionPath.length||state.level<10)return false}else if(!ascensionBranchIds.includes(classId)||state.ascensionPath.length!==1||state.ascensionPath[0]!=='adventurer'||state.level<25)return false;state.ascensionPoints--;state.ascensionPath.push(classId);state.ascensionClass=classId;render();scheduleSave();return true},
 resetAscension(){const cost=10000;if(!state.ascensionPath.length||state.coins<cost)return false;const refund=state.ascensionPath.length;state.coins-=cost;state.ascensionPoints+=refund;state.ascensionPath=[];state.ascensionClass='';render();scheduleSave();log(`Священник сбросил ветку Вознесения за ${formatGameNumber(cost)} монет. Возвращено ${refund} поинтов.`,'good');return true},
 getResourceName(){return resourceName()},
 refresh(){render()}
};
function itemEmoji(item){return ({'Оружие':'⚔️','2 рука':'🛡️','Обувь':'🥾','Ноги':'🦵','Торс':'🛡️','Шлем':'🪖','Рюкзак':'🎒'})[item?.type]||'🎒'}
function canEquipInSlot(item,slot){return itemAvailableToCharacter(item)&&(slot===item?.type||(slot==='2 рука'&&item?.type==='Оружие'))}
function renderBag(){
 const layout={'Шлем':'helmet','Оружие':'weapon','2 рука':'offhand','Торс':'torso','Ноги':'legs','Обувь':'boots','Рюкзак':'backpack'};
 $('equipSlots').innerHTML=slots.map(slot=>{const item=state.equipment[slot];return `<div class="slot equip-slot equip-${layout[slot]} ${item?'rarity-'+item.key:''}" data-equip="${slot}" aria-label="${slot}${item?`: ${item.name}`:''}" title="${slot}${item?`: ${item.name}`:''}" tabindex="${item?'0':'-1'}" role="${item?'button':'presentation'}"><span class="equip-label">${slot}</span><b>${item?`<span class="item-thumb" data-game-image="${item.type}" data-fallback="${itemEmoji(item)}">${itemEmoji(item)}</span><span class="equip-name">${item.name}</span>`:'+'}</b></div>`}).join('');
 const capacity=inventoryCapacity(),visibleSlots=Math.max(capacity,state.inventory.length),pageCount=Math.max(1,Math.ceil(visibleSlots/30));inventoryPage=Math.max(0,Math.min(inventoryPage,pageCount-1));const first=inventoryPage*30,last=Math.min(visibleSlots,first+30);
 $('inventoryTabs').innerHTML=pageCount>1?Array.from({length:pageCount},(_,page)=>`<button type="button" class="inventory-tab ${page===inventoryPage?'active':''}" data-inventory-page="${page}" aria-pressed="${page===inventoryPage}">${page+1}</button>`).join(''):'';
 $('inventorySlots').innerHTML=Array.from({length:last-first},(_,offset)=>{const index=first+offset,item=state.inventory[index];return `<div class="slot inventory-slot ${item?'rarity-'+item.key:''}" data-item="${index}" aria-label="Слот ${index+1}${item?`: ${item.name}`:': пусто'}" title="Слот ${index+1}" tabindex="${item?'0':'-1'}" role="${item?'button':'presentation'}"><span class="slot-index">${index+1}</span>${item?`<span class="item-thumb" data-game-image="${item.type}" data-fallback="${itemEmoji(item)}">${itemEmoji(item)}</span>`:'<span class="empty-slot-mark">·</span>'}</div>`}).join('');
 renderEquipmentAttributes();$('bagCount').textContent=`🎒 ${capacity} слотов · ${inventoryItemCount()} предметов`;$('bagCoins').textContent=`🪙 ${formatGameNumber(state.coins)}`;$('bagPotions').textContent=`🧪 ${state.potions}/10 · ⚡ ${state.manaPotions}/10`;$('inventoryCapacity').textContent=`${inventoryItemCount()} / ${capacity}`;
 document.querySelectorAll('#inventorySlots [data-item],#equipSlots [data-equip]').forEach(el=>el.draggable=false);document.querySelectorAll('[data-game-image]').forEach(el=>window.GameImages?.show(el,el.dataset.gameImage,el.dataset.fallback));scheduleSave()
}
function openItemDetails(item,equipped=false){
 if(!item)return;
 const rarity=rarities.find(([,key])=>key===item.key)||rarities[0];
 $('itemDetailTitle').textContent=item.name||item.type||'Предмет';
 window.GameImages?.show($('itemDetailImage'),item.type,itemEmoji(item),$('itemImageCredit'));
 const rarityTag=$('itemDetailRarity');rarityTag.className=`item-detail-rarity rarity-${rarity[1]}`;rarityTag.textContent=`${rarity[0]} редкость · ${equipped?'Экипировано':'В инвентаре'}`;
 const body=$('itemDetailBody');body.replaceChildren();
 const info=document.createElement('p');info.className='sub';const allowed=Array.isArray(item.allowedClasses)?item.allowedClasses.map(id=>classNames[id]||id).join(', '):'всем классам';info.textContent=`Тип: ${item.type||'Предмет экипировки'} · Уровень предмета: ${formatGameNumber(item.level||1)} · Может использовать: ${allowed}. ${equipped?'Предмет надет на персонажа.':canEquipInSlot(item,item.type)?'Перетащи предмет в соответствующий слот, чтобы надеть.':'Этот предмет нельзя надеть текущим классом.'}`;body.append(info);
 const stats=[];
 const damage=itemDamage(item),bonuses=itemStats(item);if(damage)stats.push(`Урон оружия: +${formatGameNumber(damage)}`);
 for(const [key,label] of Object.entries(attributeNames))if(bonuses[key])stats.push(`${label}: +${formatGameNumber(bonuses[key])}`);
 if(item.type==='Рюкзак')stats.push(`Вместимость: +${formatGameNumber(item.bagBonus||8)} слотов`);
 if(item.variant)stats.push(`Вариант снаряжения: ${item.variant} / 50`);if(item.requiredLevel>1)stats.push(`Доступно с уровня персонажа ${formatGameNumber(item.requiredLevel)}`);if(!stats.length)stats.push('Дополнительных характеристик нет.');
 const list=document.createElement('ul');list.className='item-detail-stats';stats.forEach(text=>{const line=document.createElement('li');line.textContent=text;list.append(line)});body.append(list);
 const panel=$('itemDetailPanel');panel.classList.remove('hidden');panel.style.zIndex='4700';
}
function syncPeer(){if(channel&&gpsAllowed&&gpsPositionReady)channel.postMessage({type:'presence',id:playerId,pos,name:'Странник',at:Date.now()})}
function syncOnline(){if(gpsAllowed&&gpsPositionReady)window.dispatchEvent(new CustomEvent('game:position',{detail:{lat:pos[0],lng:pos[1],name:'Странник'}}))}
window.addEventListener('firebase:request-position',syncOnline);
if(channel)channel.onmessage=e=>{const m=e.data;if(!m||m.id===playerId)return;if(m.type==='presence'){peers[m.id]=m;if(map.distance(pos,m.pos)<=1000){if(!peerMarkers[m.id])peerMarkers[m.id]=L.marker(m.pos,{icon:L.divIcon({className:'',html:'<div class="marker youmarker">🧝</div>',iconSize:[42,42],iconAnchor:[21,21]})}).addTo(map).bindPopup(m.name);else peerMarkers[m.id].setLatLng(m.pos)}else if(peerMarkers[m.id]){map.removeLayer(peerMarkers[m.id]);delete peerMarkers[m.id]}renderChatPeers()}};
let chatConnected=false,chatFeedback='';
window.addEventListener('firebase:chat',event=>{const m=event.detail;if(!m||!Number.isFinite(m.lat)||!Number.isFinite(m.lng)||!Number.isFinite(m.createdAt)||Date.now()-m.createdAt>=600000||!m.id||seenChatIds.has(m.id))return;seenChatIds.add(m.id);if(seenChatIds.size>300)seenChatIds.delete(seenChatIds.values().next().value);if(m.uid===window.firebasePlayerUid)addChat(`Ты: ${String(m.text||'').slice(0,180)}`);else if(map.distance(pos,[m.lat,m.lng])<=150)addChat(`${String(m.name||'Игрок').slice(0,24)}: ${String(m.text||'').slice(0,180)}`)});
window.addEventListener('firebase:chat-status',event=>{const detail=event.detail||{};if(typeof detail.connected==='boolean'){chatConnected=detail.connected;if(chatConnected)chatFeedback=''}else chatFeedback=detail.text||'';renderChatPeers()});
const onlineMarkers={};
window.addEventListener('firebase:players',event=>{
 const online=event.detail||{},now=Date.now();
 for(const [id,p] of Object.entries(online)){
  if(!p||id===window.firebasePlayerUid||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||!Number.isFinite(p.updatedAt)||now-p.updatedAt>30000)continue;
  const point=[p.lat,p.lng],playerName=String(p.name||'Странник').slice(0,24),popupText='Игрок: '+playerName;if(map.distance(pos,point)>1000){if(onlineMarkers[id]){map.removeLayer(onlineMarkers[id]);delete onlineMarkers[id]}continue}
  if(!onlineMarkers[id])onlineMarkers[id]=L.marker(point,{icon:L.divIcon({className:'',html:'<div class="marker youmarker">🧝</div>',iconSize:[42,42],iconAnchor:[21,21]})}).addTo(map).bindPopup(popupText);else onlineMarkers[id].setLatLng(point).setPopupContent(popupText);
 }
 for(const [id,marker] of Object.entries(onlineMarkers)){if(!online[id]||now-(online[id]?.updatedAt||0)>30000){map.removeLayer(marker);delete onlineMarkers[id]}}
 renderChatPeers();
});
function addChat(t){const log=$('chatlog'),first=log.firstElementChild;if(first&&first.textContent==='Сообщения игроков рядом появятся здесь.')first.remove();const p=document.createElement('p');p.textContent=t;log.append(p);while(log.children.length>60)log.firstElementChild.remove();log.scrollTop=log.scrollHeight}
function renderChatPeers(){const n=Object.values(onlineMarkers).filter(marker=>map.distance(pos,marker.getLatLng())<=150).length;const status=$('chatStatus');if(status){const connection=chatConnected?'Чат подключён':'Чат подключается…';status.textContent=`${connection} · ${n?`игроков рядом: ${n}`:'рядом пока нет игроков'}${chatFeedback?` · ${chatFeedback}`:''}`}$('chatlog').dataset.near=n}
const foes=[
 {name:'Дикий слизень',icon:'🟢',imageKey:'slime',hp:28,atk:6,def:0,xp:25,coins:8},
 {name:'Подворотный гоблин',icon:'👺',imageKey:'goblin',hp:42,atk:9,def:2,xp:38,coins:13},
 {name:'Теневой волк',icon:'🐺',imageKey:'wolf',hp:55,atk:12,def:3,xp:50,coins:18},
 {name:'Малый голем',icon:'🗿',imageKey:'golem',hp:72,atk:14,def:6,xp:65,coins:24},
 {name:'Скелет-страж',icon:'💀',imageKey:'skeleton',hp:48,atk:11,def:2,xp:44,coins:15},
 {name:'Пещерная летучая мышь',icon:'🦇',imageKey:'bat',hp:24,atk:8,def:0,xp:28,coins:9},
 {name:'Грибной страж',icon:'🍄',imageKey:'mushroom',hp:58,atk:12,def:4,xp:52,coins:19},
 {name:'Дорожный разбойник',icon:'🗡️',imageKey:'bandit',hp:64,atk:15,def:3,xp:62,coins:25},
 {name:'Светляк-дух',icon:'✨',imageKey:'wisp',hp:78,atk:17,def:5,xp:75,coins:30}
];
function log(msg,kind=''){const p=document.createElement('p');p.textContent=msg;if(kind)p.className=kind;$('log').prepend(p);while($('log').children.length>18)$('log').lastChild.remove();scheduleSave()}
function render(){
 $('levelText').textContent=`Уровень ${state.level} · ${['Новичок','Искатель','Следопыт','Ветеран','Герой'][Math.min(state.level-1,4)]}`;
 const need=xpToNextLevel();
 const maxHp=effectiveMaxHp(),maxEnergy=effectiveMaxEnergy();
 $('xpText').textContent=`${formatGameNumber(state.xp)} / ${formatGameNumber(need)} опыта`;$('xpBar').style.width=Math.min(100,state.xp/need*100)+'%';
 $('hpText').textContent=`${formatGameNumber(state.hp)} / ${formatGameNumber(maxHp)}`;$('hpBar').style.width=Math.max(0,state.hp/maxHp*100)+'%';
 $('atkText').textContent=formatGameNumber(totalAttack());$('coinText').textContent=formatGameNumber(state.coins);
 $('defText').textContent=formatGameNumber(effectiveDefense());$('hudEnergyText').textContent=`${formatGameNumber(state.energy)} / ${formatGameNumber(maxEnergy)}`;const resource=resourceName();$('hudEnergyText').closest('.stat').querySelector('.label').textContent=`⚡ ${resource}`;$('energyText').parentElement.firstChild.textContent=`⚡ ${resource}: `;
 const ascensionButton=$('ascensionOpen');if(ascensionButton)ascensionButton.textContent=`✨ Вознесение${state.ascensionPoints?` · ${formatGameNumber(state.ascensionPoints)}`:''}`;
 $('energyText')&&($('energyText').textContent=`${formatGameNumber(state.energy)} / ${formatGameNumber(maxEnergy)}`);$('slashBtn').textContent=`⚔️ ${activeSkillName()} (15 ${resource.toLowerCase()})`;
 if($('bagCoins'))$('bagCoins').textContent=`🪙 ${formatGameNumber(state.coins)}`;if($('bagPotions'))$('bagPotions').textContent=`🧪 ${state.potions}/10`;if($('inventoryCapacity'))$('inventoryCapacity').textContent=`${inventoryItemCount()} / ${inventoryCapacity()}`;
 $('potionBtn').textContent=`🧪 Лечиться (${state.potions})`;$('potionBtn').disabled=state.potions<1||state.hp>=maxHp;
 $('slashBtn').disabled=state.energy<15||!enemy; if(!$('enemyCard').classList.contains('show'))$('enemyCard').classList.remove('show');renderStats();renderEquipmentAttributes();
 if(!$('merchantPanel').classList.contains('hidden'))renderMerchantShop();
 if(!$('priestPanel').classList.contains('hidden'))renderPriestService();
 scheduleSave();
 window.dispatchEvent(new Event('game:stats-updated'));
}
function updatePos(latlng,source='PIXEL'){
 const next=[latlng.lat,latlng.lng];
 pos=next;gpsPositionReady=true;playerMarker.setLatLng(pos);renderChatPeers();cleanupDistantMonsters();updateMerchantForPosition();updatePriestForPosition();
 const pixel=latLngToPixel(pos);$('coords').textContent=`X: ${Math.round(pixel.x)} · Y: ${Math.round(pixel.y)}`;$('mapState').textContent='Свободное перемещение';render();syncPeer();syncOnline();return true
}
function rollMonsterLevel(){const max=Math.max(1,Math.floor(state.level));const roll=Math.random();const offset=roll<.6?3+Math.floor(Math.random()*5):roll<.85?8+Math.floor(Math.random()*8):Math.floor(Math.random()*3);return Math.max(1,max-offset)}
function spawnEnemy(force=true){
 if(monsters.length>=60){if(force)log('На карте уже максимальное число врагов (60).');return;}
 const f=foes[Math.min(foes.length-1,Math.floor(Math.random()*foes.length))];
 const level=rollMonsterLevel(),scale=1+Math.pow(Math.max(0,level-1),.82)*.12;
 const baseHp=Math.round(500*Math.pow(level,1.1)*(f.hp/50));
 const monster={...f,level,maxHp:Math.max(baseHp,Math.ceil(totalAttack()*2)),hp:Math.max(baseHp,Math.ceil(totalAttack()*2)),atk:Math.round(f.atk*(1+Math.pow(Math.max(0,level-1),.78)*.09)*5.5*11),def:Math.round(f.def*(1+Math.pow(Math.max(0,level-1),.72)*.08)*5.5*11),xp:Math.round((30+f.xp*.7)*Math.pow(level,.72)),coins:Math.round((5+f.coins*.7)*Math.pow(level,.58)),balanceVersion:6};
 let epos=null;for(let attempt=0;attempt<50;attempt++){const angle=Math.random()*Math.PI*2,meters=5+Math.random()*40,dLat=(meters/111320)*Math.cos(angle),dLng=(meters/(111320*Math.max(.2,Math.cos(pos[0]*Math.PI/180))))*Math.sin(angle),candidate=[pos[0]+dLat,pos[1]+dLng],pixel=latLngToPixel(candidate);const spaced=monsters.every(existing=>{const other=latLngToPixel(existing.pos),gap=5+Math.random()*5;return Math.hypot(pixel.x-other.x,pixel.y-other.y)>=16+gap});if(spaced){epos=candidate;break}}if(!epos){if(force)log('Не удалось найти свободное место для нового врага.');return;}
 monsterSpawnCount++;const eliteChance=Math.min(1,.05*(1+abilityBonus('drop')+goldTreeBonus('drop')));const guaranteedElite=monsterSpawnCount%10===0;if(guaranteedElite||Math.random()<eliteChance){const [eliteRarity,eliteKey]=eliteRarityRoll(),eliteTier=Math.max(0,rarities.findIndex(r=>r[1]===eliteKey));const difficultyMultiplier=5*(eliteTier+1),rewardMultiplier=2*(eliteTier+1);monster.elite=true;monster.eliteRarity=eliteRarity;monster.eliteKey=eliteKey;monster.eliteTier=eliteTier;monster.eliteDifficultyMultiplier=difficultyMultiplier;monster.eliteRewardMultiplier=rewardMultiplier;monster.name='Элитный '+monster.name;monster.maxHp=Math.round(monster.maxHp*difficultyMultiplier);monster.hp=monster.maxHp;monster.atk=Math.round(monster.atk*difficultyMultiplier);monster.def=Math.round(monster.def*difficultyMultiplier);monster.xp=Math.round(monster.xp*rewardMultiplier);monster.coins=Math.round(monster.coins*rewardMultiplier)}
 monster.id=crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());monster.pos=epos;placeMonsterMarker(monster);monsters.push(monster);scheduleSave();
 log(`На карте появился противник: ${f.name}. Нажми на него, чтобы начать бой.`,'bad');render();
}
function monsterImageKey(monster){if(['slime','goblin','wolf','golem','skeleton','bat','mushroom','bandit','wisp'].includes(monster?.imageKey))return monster.imageKey;const name=String(monster?.name||'').toLowerCase();if(name.includes('гоблин'))return'goblin';if(name.includes('волк'))return'wolf';if(name.includes('голем'))return'golem';return'slime'}
function eliteColor(key){return({common:'#d8e0e8',uncommon:'#57e68a',rare:'#55a9ff',epic:'#c16aff',legendary:'#ffb84d'})[key]||'#d8e0e8'}
function placeMonsterMarker(monster){const icon=monster.elite?L.divIcon({className:'',html:`<div class="marker enemymarker elite-monster-marker" style="--elite-color:${eliteColor(monster.eliteKey)}">👾</div>`,iconSize:[44,44],iconAnchor:[22,22]}):enemyIcon;monster.marker=L.marker(monster.pos,{icon}).addTo(map);const label=monster.elite?`<span style="color:${eliteColor(monster.eliteKey)};font-weight:900">${monster.name}</span>`:`${monster.icon} ${monster.name}`;monster.marker.bindTooltip(label,{className:monster.elite?'elite-monster-tooltip':''});monster.marker.on('click',e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);selectEnemy(monster)})}
function cleanupDistantMonsters(){
 const nearby=[];
 for(const monster of monsters){
  if(monster===enemy||map.distance(pos,monster.pos)<=150){nearby.push(monster);continue;}
  if(monster.marker)map.removeLayer(monster.marker);
 }
 if(nearby.length!==monsters.length){monsters=nearby;scheduleSave()}
}
function nearbyCoordinates(origin,minMeters=50,maxMeters=75){
 const angle=Math.random()*Math.PI*2,meters=minMeters+Math.random()*(maxMeters-minMeters);
 const lat=origin[0]+meters/111320*Math.cos(angle),lng=origin[1]+meters/(111320*Math.max(.2,Math.cos(origin[0]*Math.PI/180)))*Math.sin(angle);
 return [lat,lng];
}
function placeMerchant(nextPos){
 if(merchantMarker)map.removeLayer(merchantMarker);
 merchantPos=nextPos;
 merchantMarker=L.marker(merchantPos,{icon:merchantIcon}).addTo(map).bindTooltip('Дружественный торговец');
 merchantMarker.on('click',event=>{L.DomEvent.stopPropagation(event);openMerchantShop()});
 scheduleSave();
}
function updateMerchantForPosition(){
 if(!merchantPos){placeMerchant(nearbyCoordinates(pos));log('На карте появился дружественный торговец. Найди его на карте.','good');return;}
 if(map.distance(pos,merchantPos)>=500){placeMerchant(nearbyCoordinates(pos));log('Торговец перебрался ближе к твоему новому району.','good');}
 else if(!merchantMarker){placeMerchant(merchantPos);}
}
function placePriest(nextPos){if(priestMarker)map.removeLayer(priestMarker);priestPos=nextPos;priestMarker=L.marker(priestPos,{icon:priestIcon}).addTo(map).bindTooltip('Священник путей');priestMarker.on('click',event=>{L.DomEvent.stopPropagation(event);openPriestPanel()});scheduleSave()}
function updatePriestForPosition(){if(!priestPos){placePriest(nearbyCoordinates(pos,25,70));log('На карте появился священник. Найди его, чтобы сбросить Вознесение.','good');return}if(map.distance(pos,priestPos)>=1000){placePriest(nearbyCoordinates(pos,100,250));log('Священник появился в новом районе. Найди его на карте.','good')}else if(!priestMarker)placePriest(priestPos)}
function priestDistance(){return priestPos?map.distance(pos,priestPos):Infinity}
function renderPriestService(){const distance=priestDistance(),snapshot=window.GameAPI.getAscensionSnapshot(),near=distance<=150;const button=$('priestResetButton');$('priestDistance').textContent=Number.isFinite(distance)?`До священника: ${formatGameNumber(distance)} м · подойди на 150 м`:'Священник пока не найден.';$('priestWallet').textContent=`Твои монеты: ${formatGameNumber(state.coins)} 🪙`;$('priestStatus').textContent=!near?'Подойди ближе, чтобы воспользоваться услугой.':!snapshot.classId?'Сначала выбери класс Вознесения.':state.coins<10000?`Нужно ещё ${formatGameNumber(10000-state.coins)} монет.`:'Священник готов сбросить выбранную ветку.';button.disabled=!near||!snapshot.classId||state.coins<10000}
function openPriestPanel(){$('priestPanel').classList.remove('hidden');$('priestPanel').style.zIndex='4700';renderPriestService()}
function openMerchantShop(){
 $('merchantPanel').classList.remove('hidden');$('merchantPanel').style.zIndex='4500';renderMerchantShop();
}
function merchantDistance(){return merchantPos?map.distance(pos,merchantPos):Infinity}
function baseItemPrice(item){return merchantCatalog.find(good=>good.type===item?.type)?.price||100}
function salePrice(item){const rarityIndex=Math.max(0,rarities.findIndex(([,key])=>key===item?.key));return Math.max(1,Math.floor(baseItemPrice(item)*(.1+rarityIndex*.02)))}
function renderMerchantShop(){
 const near=merchantDistance()<=200;
 $('merchantDistance').textContent=Number.isFinite(merchantDistance())?`До торговца: ${formatGameNumber(merchantDistance())} м. Для торговли подойди на 200 м.`:'Торговец пока не найден.';
 $('merchantWallet').textContent=`У тебя: ${formatGameNumber(state.coins)} 🪙`;
 const goods=$('merchantGoods');goods.replaceChildren();
 const appendOffer=(label,price,id,disabled=false)=>{const row=document.createElement('div');row.className='shop-row';const name=document.createElement('span');name.textContent=label;const button=document.createElement('button');button.type='button';button.className='primary';button.dataset.buy=id;button.textContent=`Купить · ${formatGameNumber(price)} 🪙`;button.disabled=disabled;row.append(name,button);goods.append(row)};
 appendOffer(`🧪 Зелье здоровья · ${state.potions}/10`,100,'potion',!near||state.coins<100||state.potions>=10);appendOffer(`⚡ Зелье маны · ${state.manaPotions}/10`,100,'mana-potion',!near||state.coins<100||state.manaPotions>=10);
 for(const item of merchantCatalog){const full=firstEmptyInventorySlot()<0;const stats=item.attackBonus?` · +${item.attackBonus} атака`:item.defenseBonus?` · +${item.defenseBonus} защита`:item.bagBonus?` · +${item.bagBonus} слотов`:'';appendOffer(`${item.type} · Обычное${stats}`,item.price,`item:${item.type}`,!near||state.coins<item.price||full)}
 const sell=$('merchantSellList');sell.replaceChildren();
 if(!inventoryItemCount()){const empty=document.createElement('div');empty.className='sub';empty.textContent='В инвентаре нет предметов для продажи.';sell.append(empty);return;}
 state.inventory.forEach((item,index)=>{if(!item)return;const row=document.createElement('div');row.className='shop-row';const name=document.createElement('span');name.textContent=`${item.name} · ${formatGameNumber(salePrice(item))} 🪙`;const button=document.createElement('button');button.type='button';button.className='secondary';button.dataset.sell=String(index);button.textContent='Продать';button.disabled=!near;row.append(name,button);sell.append(row);});
}
function buyMerchantOffer(offer){
 if(merchantDistance()>200){$('merchantDistance').textContent='Подойди ближе к торговцу, чтобы совершить покупку.';return;}
 if(offer==='potion'){
  if(state.potions>=10||state.coins<100)return;
  state.coins-=100;state.potions++;log('Куплено зелье здоровья за 100 монет.','good');
 }else if(offer==='mana-potion'){
  if(state.manaPotions>=10||state.coins<100)return;
  state.coins-=100;state.manaPotions++;log('Куплено зелье маны за 100 монет.','good');
 }else{
  const item=merchantCatalog.find(good=>`item:${good.type}`===offer);if(!item||state.coins<item.price||firstEmptyInventorySlot()<0)return;
  state.coins-=item.price;storeInventoryItem({name:`${item.type} · Обычное`,type:item.type,key:'common',level:1,requiredLevel:1,basePrice:item.price,attackBonus:item.attackBonus||0,defenseBonus:item.defenseBonus||0,bagBonus:item.bagBonus||0});log(`Куплено: ${item.type} · Обычное за ${formatGameNumber(item.price)} монет.`,'good');renderBag();
 }
 render();renderMerchantShop();
}
function sellMerchantItem(index){
 if(merchantDistance()>200||!Number.isInteger(index)||!state.inventory[index])return;
 const item=state.inventory[index];if(!item)return;state.inventory[index]=null;const earned=salePrice(item);state.coins+=earned;log(`Продано: ${item.name} за ${formatGameNumber(earned)} монет.`,'good');renderBag();render();renderMerchantShop();
}
function restoreMonsters(){if(!Array.isArray(savedGame.monsters))return;for(const m of savedGame.monsters.slice(0,60)){if(!m||!Array.isArray(m.pos)||m.pos.length!==2||!m.pos.every(Number.isFinite))continue;const monster={...m};if((Number(monster.balanceVersion)||0)<2){const hpRatio=monster.maxHp>0?Math.max(0,Math.min(1,monster.hp/monster.maxHp)):1;monster.maxHp=Math.max(1,Math.round((Number(monster.maxHp)||1)*5.5));monster.hp=Math.max(1,Math.round(monster.maxHp*hpRatio));monster.atk=Math.max(1,Math.round((Number(monster.atk)||1)*5.5));monster.def=Math.max(0,Math.round((Number(monster.def)||0)*5.5));monster.balanceVersion=2;}if((Number(monster.balanceVersion)||0)<3){const hpRatio=monster.maxHp>0?Math.max(0,Math.min(1,monster.hp/monster.maxHp)):1;monster.maxHp=Math.max(1,Math.round((Number(monster.maxHp)||1)*11));monster.hp=Math.max(1,Math.round(monster.maxHp*hpRatio));monster.atk=Math.max(1,Math.round((Number(monster.atk)||1)*11));monster.def=Math.max(0,Math.round((Number(monster.def)||0)*11));monster.balanceVersion=3;}if((Number(monster.balanceVersion)||0)<4){const hpRatio=monster.maxHp>0?Math.max(0,Math.min(1,monster.hp/monster.maxHp)):1;const minHp=Math.ceil(totalAttack()*2);if(monster.maxHp<minHp){monster.maxHp=minHp;monster.hp=Math.max(1,Math.round(minHp*hpRatio))}monster.balanceVersion=4;}if((Number(monster.balanceVersion)||0)<6){const hpRatio=monster.maxHp>0?Math.max(0,Math.min(1,monster.hp/monster.maxHp)):1;const template=foes.find(item=>item.imageKey===monster.imageKey),baseHp=Math.round(500*Math.pow(Math.max(1,Number(monster.level)||1),1.1)*((Number(template?.hp)||50)/50)),eliteScale=monster.elite?Math.max(1,Number(monster.eliteDifficultyMultiplier)||5):1;monster.maxHp=Math.max(Math.ceil(totalAttack()*2),Math.round(baseHp*eliteScale));monster.hp=Math.max(1,Math.round(monster.maxHp*hpRatio));monster.balanceVersion=6;}placeMonsterMarker(monster);monsters.push(monster)}}
function showPixelMonsterPortrait(monster){const target=$('enemyIcon'),sprite=window.PixelSprites?.createMonsterSprite(monsterImageKey(monster),4);if(sprite){target.replaceChildren(sprite);target.classList.remove('has-game-image');$('enemyImageCredit').replaceChildren()}else target.textContent=monster.icon||'👾'}
async function selectEnemy(monster){if(!monster||!monsters.includes(monster))return;saveGame();if(monster.elite&&typeof window.startGroupBattleForEnemy==='function'){try{const started=await window.startGroupBattleForEnemy(monster);if(started)return}catch(error){log('Не удалось начать групповое сражение: '+(error.message||error),'bad');return}}localStorage.setItem('gorodskie-stranniki-active-battle',String(monster.id));window.location.href='./battle.html'}
function closeCombat(){
 if(enemy){enemy.hp=enemy.maxHp;log(`${enemy.name} восстановил здоровье. Сражение прекращено.`);}
 combatId++;enemy=null;enemyMarker=null;turn='player';$('enemyCard').classList.remove('show');$('attackBtn').disabled=false;$('slashBtn').disabled=state.energy<15;$('combatStatus').textContent='Сражение прекращено. Выбери противника, чтобы начать снова.';scheduleSave();
}
function handlePlayerDeath(){closeCombat();const lost=state.coins*.5;state.coins-=lost;state.hp=Math.max(1,effectiveMaxHp()*.35);log(`Ты погиб и потерял ${formatGameNumber(lost)} монет (50%). Здоровье восстановлено у безопасного места.`,'bad')}
function renderEnemy(){if(!enemy)return;$('enemyHpText').textContent=`${formatGameNumber(enemy.hp)} / ${formatGameNumber(enemy.maxHp)} HP`;$('enemyHpStat').textContent=`${formatGameNumber(enemy.hp)} / ${formatGameNumber(enemy.maxHp)}`;$('enemyHpBar').style.width=Math.max(0,enemy.hp/enemy.maxHp*100)+'%'}
function finishEnemy(){
 if(!enemy||!monsters.includes(enemy))return;
 const defeated=enemy;
 const earnedGold=defeated.coins*(1+abilityBonus('gold')+goldTreeBonus('gold'));
 state.xp+=defeated.xp;state.coins+=earnedGold;state.encounters++;
 log(`Победа над ${defeated.name}! +${formatGameNumber(defeated.xp)} опыта, +${formatGameNumber(earnedGold)} монет.`,'good');
 if(Math.random()<Math.min(1,.05*(1+abilityBonus('drop')+goldTreeBonus('drop')))){
  const [rarity,key]=rarityRoll(),item=Math.random()<1/7?makeBackpackDrop(defeated.level,rarity,key):makeGearDrop(defeated.level,rarity,key);
  if(storeInventoryItem(item)){log(`Выпал предмет: ${item.name}, ур. ${item.level}.`,'good');renderBag()}
  else log('Предмет выпал, но рюкзак полон.','bad');
 }
 $('combatStatus').textContent=`Победа! Получено ${formatGameNumber(defeated.xp)} опыта и ${formatGameNumber(earnedGold)} монет.`;
 if(defeated.marker)map.removeLayer(defeated.marker);monsters=monsters.filter(m=>m!==defeated);enemy=null;enemyMarker=null;$('enemyCard').classList.remove('show');turn='player';$('attackBtn').disabled=false;$('slashBtn').disabled=state.energy<15;
 let need=xpToNextLevel();
  while(state.xp>=need){state.xp-=need;state.level++;state.abilityPoints++;state.maxHp+=50;state.maxEnergy+=25;for(const key of ['attack','dexterity','vitality','wisdom','speed'])state.attributes[key]+=10;state.hp=Math.min(effectiveMaxHp(),state.hp+50);state.energy=Math.min(effectiveMaxEnergy(),state.energy+25);state.potions=Math.min(10,state.potions+1);let note=`Новый уровень ${state.level}! +1 Ability Point, все 6 характеристик +10, HP +50, ${resourceName()} +25.`;if(ascensionMilestone(state.level)){state.ascensionPoints++;note+=` +1 поинт вознесения.`}log(note,'good');need=xpToNextLevel();}
 render();saveGame();window.setTimeout(()=>{window.location.replace('./index.html')},250)
}
$('attackBtn').addEventListener('click',()=>{
 if(!enemy||turn!=='player'||Date.now()-lastAttack<1000)return;lastAttack=Date.now();turn='enemy';$('attackBtn').disabled=true;$('combatStatus').textContent='Твоя атака. Ход противника через 1 секунду…';
 const target=enemy,activeCombat=combatId;
 const rolled=rollPlayerDamage(),dmg=Math.max(1,rolled.damage+Math.floor(Math.random()*7)-3-(enemy.def||0));enemy.hp=Math.max(0,enemy.hp-dmg);
 log(`Ты наносишь ${formatGameNumber(dmg)} урона врагу${rolled.critical?' критическим ударом ×2':''}.`,'good');
 if(enemy.hp<=0){renderEnemy();finishEnemy();return;}setTimeout(()=>{if(combatId!==activeCombat||enemy!==target)return;const hit=state.godMode?0:Math.max(1,target.atk+Math.floor(Math.random()*5)-2-effectiveDefense());state.hp=Math.max(0,state.hp-hit);log(state.godMode?`${target.name} атакует, но Режим Бога блокирует урон.`:`${target.name} отвечает и наносит ${formatGameNumber(hit)} урона с учётом защиты.`,'bad');
 if(state.hp<=0){handlePlayerDeath();render();return}
 renderEnemy();render();$('combatStatus').textContent='Твой ход.';turn='player';$('attackBtn').disabled=false;},1000);
});
$('potionBtn').addEventListener('click',()=>{const maxHp=effectiveMaxHp();if(state.potions<1||state.hp>=maxHp||turn!=='player')return;state.potions--;const heal=Math.min(Math.ceil(maxHp*.25),maxHp-state.hp);state.hp+=heal;log(`Зелье восстановило ${formatGameNumber(heal)} HP.`,'good');render()});
$('slashBtn').addEventListener('click',()=>{
 if(!enemy||turn!=='player'||state.energy<15)return;
 const target=enemy,activeCombat=combatId;turn='enemy';if(!state.godMode)state.energy-=15;
 const rolled=rollPlayerDamage(1.5),slashDamage=Math.max(1,rolled.damage+Math.floor(Math.random()*6)-target.def);enemy.hp=Math.max(0,enemy.hp-slashDamage);
 log(`${activeSkillName()} наносит ${formatGameNumber(slashDamage)} физического урона${rolled.critical?' критическим ударом ×2':''} и тратит ${formatGameNumber(15)} ${resourceName().toLowerCase()}.`,'good');renderEnemy();render();
 if(enemy.hp<=0){finishEnemy();turn='player';return}
 $('attackBtn').disabled=true;$('slashBtn').disabled=true;$('combatStatus').textContent=`${activeSkillName()} выполнен. Ход противника через 1 секунду…`;
 setTimeout(()=>{if(combatId!==activeCombat||enemy!==target)return;const hit=state.godMode?0:Math.max(1,target.atk+Math.floor(Math.random()*5)-2-effectiveDefense());state.hp=Math.max(0,state.hp-hit);log(state.godMode?`${target.name} атакует, но Режим Бога блокирует урон.`:`${target.name} отвечает и наносит ${formatGameNumber(hit)} урона с учётом защиты.`,'bad');if(state.hp<=0){handlePlayerDeath();render();return}turn='player';$('attackBtn').disabled=false;$('slashBtn').disabled=state.energy<15;$('combatStatus').textContent='Твой ход.';render()},1000)
});
setupPanels();
$('centerBtn').addEventListener('click',()=>{window.pixelGameWorld?.centerOnPlayer();map.setView(pos,17)});
function developerActionAllowed(){return isDeveloper&&window.firebasePlayerUid===DEVELOPER_UID}
function changeDeveloperLevel(delta){if(!developerActionAllowed()||!Number.isInteger(delta)||!delta)return;const target=Math.max(1,Math.min(100000,state.level+delta));while(state.level<target){state.level++;state.abilityPoints++;state.maxHp+=50;state.maxEnergy+=25;for(const key of ['attack','dexterity','vitality','wisdom','speed'])state.attributes[key]+=10;state.potions=Math.min(10,state.potions+1);if(ascensionMilestone(state.level))state.ascensionPoints++}while(state.level>target){if(ascensionMilestone(state.level))state.ascensionPoints=Math.max(0,state.ascensionPoints-1);state.level--;state.abilityPoints=Math.max(0,state.abilityPoints-1);state.maxHp=Math.max(100,state.maxHp-50);state.maxEnergy=Math.max(50,state.maxEnergy-25);for(const key of ['attack','dexterity','vitality','wisdom','speed'])state.attributes[key]=Math.max(0,state.attributes[key]-10)}state.xp=0;state.hp=Math.min(state.hp,effectiveMaxHp());state.energy=Math.min(state.energy,effectiveMaxEnergy());render();scheduleSave();log(`Уровень разработчиком изменён: теперь ${state.level}.`,'good')}
$('devTeleportToggle').addEventListener('click',event=>{if(!developerActionAllowed())return;devMode=!devMode;event.currentTarget.textContent=`🗺 Перемещение по клику: ${devMode?'вкл.':'выкл.'}`;event.currentTarget.classList.toggle('primary',devMode)});
$('devLevelApply').addEventListener('click',()=>{if(!developerActionAllowed())return;const delta=Number($('devLevelAmount').value);if(!Number.isInteger(delta)||delta===0||Math.abs(delta)>1000){log('Введи целое изменение уровня от -1000 до 1000, кроме 0.','bad');return}changeDeveloperLevel(delta)});
$('devGoldApply').addEventListener('click',()=>{if(!developerActionAllowed())return;const amount=Number($('devGoldAmount').value);if(!Number.isFinite(amount)||amount<0){log('Укажи неотрицательное количество золота.','bad');return}state.coins=amount;render();scheduleSave();log(`Количество золота установлено: ${formatGameNumber(amount)}.`,'good')});
$('devGodToggle').addEventListener('click',event=>{if(!developerActionAllowed())return;state.godMode=!state.godMode;if(state.godMode){state.hp=1000000;state.energy=1000000}else{state.hp=Math.min(state.hp,effectiveMaxHp());state.energy=Math.min(state.energy,effectiveMaxEnergy())}event.currentTarget.textContent=`😇 Режим Бога: ${state.godMode?'вкл.':'выкл.'}`;render();scheduleSave()});
map.on('click',e=>{if(!devMode||!developerActionAllowed())return;updatePos(e.latlng,'DEV');map.setView(e.latlng,17);log('Разработчик переместил персонажа кликом по карте; пройденное расстояние не изменено.','good')});
$('chatSend').addEventListener('click',()=>{const input=$('chatInput'),text=input.value.trim();if(!text)return;window.dispatchEvent(new CustomEvent('game:chat-send',{detail:{text,lat:pos[0],lng:pos[1]}}));input.value=''});
$('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('chatSend').click()});
$('merchantGoods').addEventListener('click',event=>{const button=event.target.closest('[data-buy]');if(button)buyMerchantOffer(button.dataset.buy)});
$('merchantSellList').addEventListener('click',event=>{const button=event.target.closest('[data-sell]');if(button)sellMerchantItem(Number(button.dataset.sell))});
$('priestResetButton').addEventListener('click',()=>{renderPriestService();if($('priestResetButton').disabled)return;if(!window.confirm('Заплатить священнику 10 000 монет, сбросить ветку Вознесения и вернуть потраченные поинты?'))return;if(window.GameAPI.resetAscension())renderPriestService()});
function startItemDrag(event,slot,item,kind){if(event.button!==undefined&&event.button!==0)return;event.preventDefault();activeItemDrag={pointerId:event.pointerId,slot,item,kind,startX:event.clientX,startY:event.clientY,moved:false,ghost:null,scrollPanel:$('bagPanel'),pointerY:event.clientY,scrollRaf:0};slot.classList.add('dragging');if(kind==='inventory')slot.dataset.dragIndex=slot.dataset.item;else slot.dataset.dragEquip=slot.dataset.equip;try{slot.setPointerCapture(event.pointerId)}catch{}}
$('inventoryTabs').addEventListener('click',event=>{const button=event.target.closest('[data-inventory-page]');if(!button)return;inventoryPage=Number(button.dataset.inventoryPage)||0;renderBag()});
$('inventorySlots').addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;const slot=e.target.closest('[data-item]');const item=slot?state.inventory[Number(slot.dataset.item)]:null;if(item){startItemDrag(e,slot,item,'inventory');return}const panel=$('bagPanel');if(!panel)return;e.preventDefault();activeInventoryScroll={pointerId:e.pointerId,panel,lastY:e.clientY,startY:e.clientY,moved:false};try{(slot||$('inventorySlots')).setPointerCapture(e.pointerId)}catch{}});
$('equipSlots').addEventListener('pointerdown',e=>{const slot=e.target.closest('[data-equip]');if(!slot)return;const item=state.equipment[slot.dataset.equip];if(item)startItemDrag(e,slot,item,'equipment')});
document.addEventListener('pointerup',e=>{
 const drag=activeItemDrag,dragged=drag?.slot;if(!dragged)return;
 activeItemDrag=null;if(drag.scrollRaf)cancelAnimationFrame(drag.scrollRaf);drag.ghost?.remove();dragged.classList.remove('dragging');
 $('trashSlot').classList.remove('drop-target');
 document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
 const target=document.elementFromPoint(e.clientX,e.clientY);if(!drag.moved){if(drag.kind==='inventory')openItemDetails(drag.item);else openItemDetails(drag.item,true);return;}
 if(dragged.dataset.dragIndex!==undefined){
  const index=Number(dragged.dataset.dragIndex),item=state.inventory[index];if(!item)return;
  if(target?.closest('#trashSlot')){state.inventory[index]=null;renderBag();render();log(`Удалён предмет: ${item.name}.`,'bad');return;}
  const equip=target?.closest('[data-equip]');
  if(equip&&canEquipInSlot(item,equip.dataset.equip)){const slot=equip.dataset.equip,old=state.equipment[slot],nextBagBonus=slot==='Рюкзак'?(Number(item.bagBonus)||8):state.bagBonus,nextCount=inventoryItemCount()+(old?0:-1);if(nextCount>24+nextBagBonus)return;state.equipment[slot]=item;state.inventory[index]=old||null;recalculateBagBonus();renderBag();render();log(`Надето: ${item.name} (${slot}).`,'good');return;}
  const bagSlot=target?.closest('#inventorySlots [data-item]');if(!bagSlot)return;const destination=Number(bagSlot.dataset.item);if(destination===index||destination>=inventoryCapacity())return;
  [state.inventory[index],state.inventory[destination]]=[state.inventory[destination]||null,state.inventory[index]];renderBag();
 }else if(dragged.dataset.dragEquip){
  const type=dragged.dataset.dragEquip,item=state.equipment[type];
  const bagSlot=target?.closest('#inventorySlots [data-item]');if(!bagSlot||!item)return;const destination=Number(bagSlot.dataset.item);if(destination>=inventoryCapacity())return;
  const itemAtDestination=state.inventory[destination];if(itemAtDestination&&!canEquipInSlot(itemAtDestination,type))return;const nextBagBonus=type==='Рюкзак'?(itemAtDestination?Number(itemAtDestination.bagBonus)||8:0):state.bagBonus,nextCount=inventoryItemCount()+(itemAtDestination?0:1);if(nextCount>24+nextBagBonus)return;
  state.inventory[destination]=item; if(itemAtDestination)state.equipment[type]=itemAtDestination;else delete state.equipment[type];recalculateBagBonus();renderBag();render();log(itemAtDestination?`Предметы обменены: ${item.name} и ${itemAtDestination.name}.`:`Снято: ${item.name}.`);
 }
});
function autoScrollInventory(drag){if(activeItemDrag!==drag||!drag.scrollPanel)return;const rect=drag.scrollPanel.getBoundingClientRect(),edge=52,y=drag.pointerY;let delta=0;if(y>rect.bottom-edge&&y<rect.bottom)delta=Math.ceil((edge-(rect.bottom-y))*.32);else if(y<rect.top+edge&&y>rect.top)delta=-Math.ceil((edge-(y-rect.top))*.32);if(delta){const before=drag.scrollPanel.scrollTop;drag.scrollPanel.scrollTop+=Math.max(-15,Math.min(15,delta));if(before!==drag.scrollPanel.scrollTop)drag.scrollRaf=requestAnimationFrame(()=>autoScrollInventory(drag));else drag.scrollRaf=0}else drag.scrollRaf=0}
document.addEventListener('pointermove',e=>{const scroll=activeInventoryScroll;if(scroll&&e.pointerId===scroll.pointerId){if(Math.abs(e.clientY-scroll.startY)>4)scroll.moved=true;if(scroll.moved){scroll.panel.scrollTop-=e.clientY-scroll.lastY; e.preventDefault()}scroll.lastY=e.clientY;return}const drag=activeItemDrag;if(!drag||e.pointerId!==drag.pointerId)return;drag.pointerY=e.clientY;if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7){drag.moved=true;const ghost=drag.slot.cloneNode(true);ghost.classList.remove('dragging');ghost.classList.add('drag-ghost');ghost.removeAttribute('data-item');ghost.removeAttribute('data-equip');ghost.removeAttribute('draggable');ghost.style.width=`${drag.slot.getBoundingClientRect().width}px`;document.body.append(ghost);drag.ghost=ghost}if(drag.ghost){drag.ghost.style.left=`${e.clientX-drag.ghost.offsetWidth/2}px`;drag.ghost.style.top=`${e.clientY-drag.ghost.offsetHeight/2}px`}if(drag.scrollPanel&&!drag.scrollRaf){const rect=drag.scrollPanel.getBoundingClientRect();if((e.clientY>rect.bottom-52&&e.clientY<rect.bottom)||(e.clientY<rect.top+52&&e.clientY>rect.top))drag.scrollRaf=requestAnimationFrame(()=>autoScrollInventory(drag))}const target=document.elementFromPoint(e.clientX,e.clientY),trash=target?.closest('#trashSlot'),equip=target?.closest('[data-equip]');$('trashSlot').classList.toggle('drop-target',!!trash&&drag.kind==='inventory');document.querySelectorAll('#equipSlots [data-equip]').forEach(el=>el.classList.toggle('drop-target',!!equip&&equip===el&&canEquipInSlot(drag.item,el.dataset.equip)))});
document.addEventListener('pointerup',e=>{if(activeInventoryScroll?.pointerId===e.pointerId)activeInventoryScroll=null});
document.addEventListener('pointercancel',e=>{if(activeInventoryScroll?.pointerId===e.pointerId)activeInventoryScroll=null;if(!activeItemDrag)return;if(activeItemDrag.scrollRaf)cancelAnimationFrame(activeItemDrag.scrollRaf);activeItemDrag.ghost?.remove();activeItemDrag.slot.classList.remove('dragging');activeItemDrag=null;$('trashSlot').classList.remove('drop-target');document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'))});
document.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;const slot=event.target.closest?.('[data-item],[data-equip]');if(!slot)return;const item=slot.dataset.item!==undefined?state.inventory[Number(slot.dataset.item)]:state.equipment[slot.dataset.equip];if(item){event.preventDefault();openItemDetails(item,slot.dataset.equip!==undefined)}});
const PIXEL_WORLD_SIZE=2400,PIXEL_WORLD_CENTER=PIXEL_WORLD_SIZE/2,PIXEL_ORIGIN_LAT=0,PIXEL_ORIGIN_LNG=0,PIXEL_LAT_METERS=111320*4,PIXEL_LNG_METERS=111320*4;
function latLngToPixel(point){return{x:Math.max(0,Math.min(PIXEL_WORLD_SIZE-1,PIXEL_WORLD_CENTER+(point[1]-PIXEL_ORIGIN_LNG)*PIXEL_LNG_METERS)),y:Math.max(0,Math.min(PIXEL_WORLD_SIZE-1,PIXEL_WORLD_CENTER-(point[0]-PIXEL_ORIGIN_LAT)*PIXEL_LAT_METERS))}}
function pixelToLatLng(x,y){return{lat:PIXEL_ORIGIN_LAT+(PIXEL_WORLD_CENTER-y)/PIXEL_LAT_METERS,lng:PIXEL_ORIGIN_LNG+(x-PIXEL_WORLD_CENTER)/PIXEL_LNG_METERS}}
let groupMapEnabled=false,groupMapMembers=[],groupOnlinePlayers={};window.addEventListener('game:group-map-state',event=>{groupMapEnabled=!!event.detail?.enabled;groupMapMembers=Array.isArray(event.detail?.members)?event.detail.members:[]});window.addEventListener('game:group-online-players',event=>{groupOnlinePlayers=event.detail||{}});window.GamePixelAPI={getSnapshot(){const players=groupMapEnabled?groupMapMembers.map(member=>{const id=member.uid,p=groupOnlinePlayers[id];if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||Date.now()-(p.updatedAt||0)>30000)return null;return{...latLngToPixel([p.lat,p.lng]),id,name:String(member.nickname||p.name||'Игрок').slice(0,24),classId:member.classId||'adventurer'}}).filter(Boolean):[];return{players,player:latLngToPixel(pos),character:state.ascensionClass||'classless',monsters:monsters.map(monster=>({...latLngToPixel(monster.pos),id:String(monster.id),name:monster.name,imageKey:monsterImageKey(monster)})),merchant:merchantPos?{...latLngToPixel(merchantPos),id:'merchant'}:null,priest:priestPos?{...latLngToPixel(priestPos),id:'priest'}:null}},moveToWorld(x,y){updatePos(pixelToLatLng(x,y),'PIXEL')},selectMonster(id){const monster=monsters.find(item=>String(item.id)===String(id));if(monster)selectEnemy(monster)},selectActor(type){if(type==='merchant')openMerchantShop();if(type==='priest')openPriestPanel()}};
function enterPixelWorld(){gpsAllowed=true;gpsPositionReady=true;gpsFixReady=true;document.body.classList.remove('site-locked');$('gpsHead').textContent='Пиксельный мир · свободное перемещение';$('mapState').textContent='Пиксельный мир';map.setView(pos,15);requestAnimationFrame(()=>map.invalidateSize());if(monsters.length===0)spawnEnemy(false);updateMerchantForPosition();updatePriestForPosition();syncPeer();syncOnline()}
window.__gameGpsHandlerReady=true;
setInterval(()=>{for(const [id,p] of Object.entries(peers))if(Date.now()-p.at>10000){delete peers[id];if(peerMarkers[id])map.removeLayer(peerMarkers[id]);delete peerMarkers[id]}syncPeer()},5000);
setInterval(()=>{const maxHp=effectiveMaxHp(),maxEnergy=effectiveMaxEnergy(),attributes=totalAttributes(),hpRegen=.0025+attributes.vitality/100*.0005,resourceRegen=.0075+attributes.wisdom/100*.001;if(state.hp<maxHp&&!enemy)state.hp=Math.min(maxHp,state.hp+maxHp*hpRegen);if(state.energy<maxEnergy&&!enemy)state.energy=Math.min(maxEnergy,state.energy+maxEnergy*resourceRegen);render()},1000);
function scheduleMonsterSpawn(){setTimeout(()=>{if(!document.hidden&&monsters.length<60)spawnEnemy(false);scheduleMonsterSpawn()},3000)}
scheduleMonsterSpawn();
window.addEventListener('resize',()=>requestAnimationFrame(()=>map.invalidateSize()));window.addEventListener('orientationchange',()=>setTimeout(()=>map.invalidateSize(),250));
renderBag();
if(Array.isArray(savedGame.log)){const logBox=$('log');logBox.replaceChildren();savedGame.log.slice(0,18).reverse().forEach(entry=>{const p=document.createElement('p');p.textContent=String(entry.text||'');if(['good','bad'].includes(entry.kind))p.className=entry.kind;logBox.append(p)})}
restoreMonsters();
cleanupDistantMonsters();
if(monsters.length===0)spawnEnemy(false);const offlineSpawnCount=Math.min(60-monsters.length,Math.floor(offlineElapsedMs/3000));for(let i=0;i<offlineSpawnCount;i++)spawnEnemy(false);
if(!merchantPos||map.distance(pos,merchantPos)>=500){placeMerchant(nearbyCoordinates(pos));log('На карте появился дружественный торговец. Найди его на карте.','good')}else placeMerchant(merchantPos);
if(!priestPos){placePriest(nearbyCoordinates(pos,100,250));log('На карте появился священник. Найди его, чтобы сбросить Вознесение.','good')}else placePriest(priestPos);
render();
enterPixelWorld();
 window.addEventListener('pagehide',saveGame);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame()});
window.addEventListener('game:cloud-load',event=>{const remote=event.detail?.save;if(remote&&typeof remote==='object')window.dispatchEvent(new CustomEvent('game:cloud-save-available',{detail:{updatedAt:event.detail?.updatedAt||0}}))});
window.addEventListener('game:cloud-restore',event=>{const remote=event.detail?.save;if(!remote||typeof remote!=='object')return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(remote));window.dispatchEvent(new CustomEvent('game:cloud-restore-status',{detail:{ok:true}}));window.location.reload()}catch(error){console.error('Cloud save restore failed',error);window.dispatchEvent(new CustomEvent('game:cloud-restore-status',{detail:{ok:false,message:String(error?.message||error)}}))}});
$('cloudAutoSaveToggle')?.addEventListener('change',event=>{const enabled=!!event.target.checked;localStorage.setItem('game-cloud-autosave-v1',String(enabled));$('cloudSaveNowBtn').hidden=enabled;window.dispatchEvent(new CustomEvent('game:cloud-autosave-setting',{detail:{enabled}}));$('cloudSaveFeedback').textContent=enabled?'Автосохранение включено: прогресс отправляется в облако каждые 60 секунд.':'Автосохранение отключено. Используй кнопку ручного сохранения.'});
$('cloudRestoreBtn')?.addEventListener('click',()=>{const button=$('cloudRestoreBtn');button.disabled=true;button.textContent='Загружаем сохранение…';const feedback=$('cloudSaveFeedback');if(feedback){feedback.textContent='Получаем сохранение из облака…';feedback.style.color='var(--muted)'}window.dispatchEvent(new CustomEvent('game:cloud-restore-request'))});
$('cloudSaveNowBtn')?.addEventListener('click',()=>{const feedback=$('cloudSaveFeedback');if(feedback){feedback.textContent='Отправляем текущее сохранение в облако…';feedback.style.color='var(--muted)'}const button=$('cloudSaveNowBtn');button.disabled=true;window.dispatchEvent(new CustomEvent('game:manual-cloud-save-request'))});
window.addEventListener('game:cloud-save-status',event=>{const feedback=$('cloudSaveFeedback');const button=$('cloudSaveNowBtn');if(button)button.disabled=false;if(feedback){const ok=!!event.detail?.ok;feedback.textContent=ok?'Сохранено в облако ✓':`Не удалось сохранить: ${event.detail?.message||'неизвестная ошибка'}`;feedback.style.color=ok?'#57e68a':'#ff7777'}});
window.addEventListener('game:cloud-ready',event=>{const button=$('cloudSaveNowBtn');if(button)button.disabled=!!event.detail?.error});
window.addEventListener('game:cloud-restore-status',event=>{const button=$('cloudRestoreBtn');if(button){button.disabled=false;button.textContent='Восстановить сохранение из облака'}const feedback=$('cloudSaveFeedback');if(feedback)feedback.textContent=event.detail?.ok?'Сохранение восстановлено. Перезагружаем игру…':`Не удалось восстановить: ${event.detail?.message||'ошибка'}`});
window.addEventListener('game:cloud-restore-status-result',event=>{const button=$('cloudRestoreBtn');if(button){button.disabled=false;button.textContent='Восстановить сохранение из облака'}const feedback=$('cloudSaveFeedback');if(feedback){feedback.textContent=event.detail?.message||'Облачное сохранение недоступно.';feedback.style.color='#ff7777'}});
setInterval(()=>{if(localStorage.getItem('game-cloud-autosave-v1')!=='false')saveGame()},60000);
})();
