(() => {
const $ = id => document.getElementById(id);
const map = L.map('map').setView([50.4501,30.5234],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
const playerIcon=L.divIcon({className:'',html:'<div class="marker youmarker">🧙</div>',iconSize:[42,42],iconAnchor:[21,21]});
const enemyIcon=L.divIcon({className:'',html:'<div class="marker enemymarker">👾</div>',iconSize:[38,38],iconAnchor:[19,19]});
const merchantIcon=L.divIcon({className:'',html:'<div class="marker merchantmarker">🧔</div>',iconSize:[40,40],iconAnchor:[20,20]});
const SAVE_KEY='gorodskie-stranniki-save-v1';
const DEVELOPER_UID='fszpYBGnslg9qN7eWteUwE8y3s63';
function readSave(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')||{}}catch{return{}}}
const savedGame=readSave();
// Saved coordinates are only a visual hint and can become stale (for example after
// restoring a backup or moving countries). Never use them as the current GPS fix.
let pos=[50.4501,30.5234];
map.setView(pos,15);
let playerMarker=L.marker(pos,{icon:playerIcon}).addTo(map).bindPopup('Ты здесь — Странник');
let enemyMarker=null, enemy=null, monsters=[],gpsWatch=null, distance=Number.isFinite(savedGame.distance)?savedGame.distance:0,lastPos=null,gpsAllowed=false,gpsPositionReady=false,gpsFixReady=false,gpsInitialCentered=false,lastRealGpsPos=null,lastGpsPos=null,lastGpsAt=0,lastGpsAccuracy=0,gpsCandidate=null,gpsCandidateCount=0,saveTimer=null;
let state={level:1,xp:0,hp:100,maxHp:100,coins:0,potions:1,attack:12,defense:0,encounters:0,...(savedGame.state||{})};
state.godMode=false;
let merchantPos=Array.isArray(savedGame.merchantPos)&&savedGame.merchantPos.length===2&&Number.isFinite(savedGame.merchantPos[0])&&Number.isFinite(savedGame.merchantPos[1])&&Math.abs(savedGame.merchantPos[0])<=90&&Math.abs(savedGame.merchantPos[1])<=180?savedGame.merchantPos:null,merchantMarker=null;
state.inventory=Array.isArray(state.inventory)?state.inventory:[];state.equipment=state.equipment&&typeof state.equipment==='object'?state.equipment:{};state.energy=Number.isFinite(state.energy)?state.energy:(Number.isFinite(state.mana)?state.mana:50);state.maxEnergy=Number.isFinite(state.maxEnergy)?state.maxEnergy:(Number.isFinite(state.maxMana)?state.maxMana:50);delete state.mana;delete state.maxMana;
state.potions=Math.max(0,Math.min(10,Number.isFinite(state.potions)?state.potions:1));
state.abilityPoints=Number.isFinite(state.abilityPoints)?state.abilityPoints:Math.max(0,state.level-1);state.skillNodes=Array.isArray(state.skillNodes)?state.skillNodes.map(id=>String(id).replace(/^hero-mana-/,'hero-energy-')):[];
state.ascensionClass=typeof state.ascensionClass==='string'?state.ascensionClass:'';state.ascensionPoints=Number.isFinite(state.ascensionPoints)?state.ascensionPoints:(state.level>=10?1+Math.floor(state.level/25):0);
function saveGame(){try{const savedState={...state,godMode:false};if(state.godMode){savedState.hp=Math.min(state.hp,state.maxHp*(1+abilityBonus('health')));savedState.energy=Math.min(state.energy,state.maxEnergy*(1+abilityBonus('energy')))}localStorage.setItem(SAVE_KEY,JSON.stringify({state:savedState,distance,pos:lastRealGpsPos,displayPos:pos,realGps:!!lastRealGpsPos,merchantPos,log:Array.from($('log').children).map(p=>({text:p.textContent,kind:p.className})),monsters:monsters.map(({marker,...m})=>m)}))}catch{}}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveGame,350)}
let devMode=false,isDeveloper=false,turn='player',lastAttack=0,combatId=0,activeItemDrag=null,activeInventoryScroll=null;
function setupPanels(){
 const aside=document.querySelector('aside');
 const playerHud=aside.querySelector(':scope > .card:first-child');playerHud.id='playerHud';playerHud.classList.add('floating-panel');document.body.append(playerHud);
 const merchantPanel=aside.querySelector('#merchantPanel');merchantPanel.style.left=innerWidth<=780?'8px':`${Math.max(12,(innerWidth-430)/2)}px`;merchantPanel.style.top=innerWidth<=780?'8vh':'12vh';merchantPanel.style.transform='none';
 const itemDetailPanel=$('itemDetailPanel');itemDetailPanel.style.left=innerWidth<=780?'8px':`${Math.max(12,(innerWidth-340)/2)}px`;itemDetailPanel.style.top='18vh';itemDetailPanel.style.transform='none';
 const menu=document.createElement('section');menu.id='actionMenu';menu.className='card floating-panel hidden menu-panel';menu.style.left=innerWidth<=780?'8px':`${Math.max(12,innerWidth-320)}px`;menu.style.top=innerWidth<=780?'auto':'72px';if(innerWidth<=780)menu.style.bottom='calc(64px + env(safe-area-inset-bottom,0px))';menu.innerHTML='<div class="panel-title"><h2>Меню</h2><button type="button" class="secondary panel-close" aria-label="Закрыть меню">✕</button></div><div class="hud-tools"><button type="button" class="secondary" data-open="statsPanel">📊 Герой</button><button type="button" class="secondary" data-open="logPanel">📜 Журнал</button><button type="button" class="secondary" data-open="bagPanel">🎒 Снаряжение</button><button type="button" class="secondary" data-open="chatPanel">💬 Чат</button><button type="button" class="secondary" id="ascensionOpen">✨ Вознесение</button><button type="button" class="secondary" data-open="accountPanel">👤 Аккаунт</button><button type="button" class="secondary" id="developerMenuButton" data-open="devPanel" hidden>🛠 Меню разработчика</button></div>';document.body.append(menu);
 const menuButton=document.createElement('button');menuButton.type='button';menuButton.id='menuToggle';menuButton.className='primary menu-toggle';menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-controls','actionMenu');menuButton.textContent='☰ Меню';document.body.append(menuButton);menuButton.addEventListener('click',()=>{const open=menu.classList.toggle('hidden')===false;menuButton.setAttribute('aria-expanded',String(open));menu.style.zIndex='5000'});
 const startLeft=Math.max(8,Math.min(365,innerWidth-365));const stats=document.createElement('section');stats.id='statsPanel';stats.className='card floating-panel hidden';stats.style.left=`${startLeft}px`;stats.style.top='74px';stats.innerHTML='<div class="panel-title"><h2>Характеристики героя</h2><button type="button" class="secondary panel-close">✕</button></div><div id="heroStats"></div>';document.body.append(stats);
 const account=document.createElement('section');account.id='accountPanel';account.className='card floating-panel hidden account-panel';account.style.left=`${startLeft}px`;account.style.top='74px';account.innerHTML='<div class="panel-title"><h2>Аккаунт</h2><button type="button" class="secondary panel-close" aria-label="Закрыть аккаунт">✕</button></div><div id="accountGuest"><p class="sub">Ты играешь как гость. Вход через Google необязателен и позволит закрепить аккаунт.</p><button type="button" class="primary full" id="googleSignInBtn">🔐 Войти через Google</button></div><div id="accountProfile" hidden><div class="account-nickname-row"><button type="button" class="account-nickname" id="accountNickname" title="Нажми, чтобы изменить ник"></button><button type="button" class="secondary" id="editNicknameBtn" aria-label="Изменить ник">✎</button></div><div id="nicknameEditor" hidden><input id="nicknameInput" maxlength="20" autocomplete="nickname" placeholder="Новый ник"><button type="button" class="primary" id="saveNicknameBtn">Сохранить</button><button type="button" class="secondary" id="cancelNicknameBtn">Отмена</button></div><p class="account-info" id="nicknameFeedback" aria-live="polite"></p><p class="account-info" id="accountEmail"></p><p class="account-info" id="accountCreatedAt"></p><p class="account-info" id="accountUid"></p><p class="account-info" id="nicknameCooldown"></p></div>';document.body.append(account);
 const devPanel=document.createElement('section');devPanel.id='devPanel';devPanel.className='card floating-panel hidden dev-panel';devPanel.style.left=`${startLeft}px`;devPanel.style.top='74px';devPanel.innerHTML='<div class="panel-title"><h2>Меню разработчика</h2><button type="button" class="secondary panel-close" aria-label="Закрыть меню разработчика">✕</button></div><button type="button" class="secondary full" id="devTeleportToggle">🗺 Перемещение по клику: выкл.</button><label class="dev-control">Уровни: положительное число повышает, отрицательное понижает<input id="devLevelAmount" type="number" min="-1000" max="1000" step="1" value="1"></label><button type="button" class="secondary full" id="devLevelApply">Применить изменение уровня</button><label class="dev-control">Новое количество золота<input id="devGoldAmount" type="number" min="0" step="1" value="0"></label><button type="button" class="secondary full" id="devGoldApply">Заменить золото</button><button type="button" class="secondary full" id="devGodToggle">😇 Режим Бога: выкл.</button>';document.body.append(devPanel);
 const panels=[['logPanel','log','📜 Журнал'],['bagPanel','equip','🎒 Снаряжение'],['chatPanel','chat','💬 Чат поблизости']];
 for(const [id,selector,title] of panels){const query=selector==='log'?'.log':selector==='equip'?'#bagCount':'#chatlog';const card=aside.querySelector(query).closest('.card');card.id=id;card.classList.add('floating-panel','hidden');card.style.left=`${startLeft}px`;card.style.top='74px';const bar=document.createElement('div');bar.className='panel-title';bar.innerHTML=`<h2>${title}</h2><button type="button" class="secondary panel-close">✕</button>`;card.querySelector('h2').replaceWith(bar);document.body.append(card)}
 $('devToolsCard')?.remove();const combat=aside.querySelector('#enemyCard');combat.classList.add('floating-panel');combat.style.left=`${startLeft}px`;combat.style.top='74px';const combatTitle=document.createElement('div');combatTitle.className='panel-title';combatTitle.innerHTML='<h2>Обнаружен противник!</h2><button type="button" class="secondary combat-close" aria-label="Прекратить бой и закрыть окно" title="Прекратить бой">✕</button>';combat.querySelector('h2').replaceWith(combatTitle);combatTitle.querySelector('.combat-close').addEventListener('click',closeCombat);
 menu.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(button.dataset.open==='devPanel'&&!isDeveloper)return;const panel=$(button.dataset.open);if(!panel)return;menu.classList.add('hidden');menuButton.setAttribute('aria-expanded','false');document.querySelectorAll('#logPanel,#bagPanel,#chatPanel,#statsPanel,#abilityTreePanel,#accountPanel,#devPanel').forEach(p=>p.classList.add('hidden'));panel.classList.remove('hidden');panel.style.zIndex='4500';if(button.dataset.open==='statsPanel')renderStats()}));
 document.querySelectorAll('.panel-close').forEach(button=>button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();button.closest('.floating-panel').classList.add('hidden');if(button.closest('#actionMenu'))menuButton.setAttribute('aria-expanded','false')}));
 document.querySelectorAll('.floating-panel .panel-title').forEach(bar=>{let panel=bar.closest('.floating-panel'),drag=null;bar.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag={x:e.clientX-panel.getBoundingClientRect().left,y:e.clientY-panel.getBoundingClientRect().top};bar.setPointerCapture(e.pointerId)});bar.addEventListener('pointermove',e=>{if(!drag)return;panel.style.left=Math.max(0,Math.min(innerWidth-panel.offsetWidth,e.clientX-drag.x))+'px';panel.style.top=Math.max(58,Math.min(innerHeight-60,e.clientY-drag.y))+'px';panel.style.bottom='auto'});bar.addEventListener('pointerup',()=>drag=null)});
 const centerButton=$('centerBtn');if(centerButton){centerButton.classList.add('center-control');document.body.append(centerButton);document.querySelector('.mapbuttons')?.remove()}
}
window.addEventListener('firebase:auth',event=>{const {uid,profile,email,createdAt}=event.detail||{};isDeveloper=uid===DEVELOPER_UID;const guest=$('accountGuest'),signedIn=$('accountProfile');if(guest)guest.hidden=!!uid;if(signedIn)signedIn.hidden=!uid;if(uid){const nickname=profile?.nickname||`user${profile?.accountNumber||''}`;$('accountNickname').textContent=nickname;playerMarker.setPopupContent(`Ты здесь — ${nickname}`);$('accountEmail').textContent=email||'Google-почта не найдена';$('accountCreatedAt').textContent=`Дата регистрации: ${new Date(createdAt||profile?.createdAt||Date.now()).toLocaleDateString('ru-RU')}`;$('accountUid').textContent=`Firebase UID: ${uid}`;const editor=$('nicknameEditor'),remaining=86400000-(Date.now()-(profile?.nicknameChangedAt||0)),cooldown=$('nicknameCooldown');if(cooldown)cooldown.textContent=remaining>0?`Сменить ник можно через ${Math.ceil(remaining/3600000)} ч.`:'Ник можно изменить сейчас';if(editor)editor.hidden=true}else playerMarker.setPopupContent('Ты здесь — Странник');const devButton=$('developerMenuButton');if(devButton)devButton.hidden=!isDeveloper;if(!isDeveloper){devMode=false;if(state.godMode){state.godMode=false;state.hp=Math.min(state.hp,effectiveMaxHp());state.energy=Math.min(state.energy,effectiveMaxEnergy());$('devGodToggle').textContent='😇 Режим Бога: выкл.';render()}}});
function xpToNextLevel(level=state.level){return Math.ceil(100*Math.pow(1.65,level))}
function resourceName(){return state.ascensionClass==='mage'?'Мана':'Энергия'}
function renderStats(){const weaponBonus=(state.equipment['Оружие']?.attackBonus||0)+(state.equipment['2 рука']?.attackBonus||0),resource=resourceName();const entries=[['Уровень',state.level],['Ability Points',state.abilityPoints],['Поинты вознесения',state.ascensionPoints],['Класс',({adventurer:'Авантюрист',warrior:'Воин',archer:'Стрелок',mage:'Маг'})[state.ascensionClass]||'Не выбран'],['Опыт',`${formatGameNumber(state.xp)} / ${formatGameNumber(xpToNextLevel())}`],['Опыт до следующего уровня',formatGameNumber(xpToNextLevel())],['Здоровье',`${formatGameNumber(state.hp)} / ${formatGameNumber(effectiveMaxHp())}`],['Максимум здоровья',formatGameNumber(effectiveMaxHp())],['Базовая атака',formatGameNumber(state.attack)],['Бонус оружия',formatGameNumber(weaponBonus)],['Итоговый урон',formatGameNumber(totalAttack())],['Защита',formatGameNumber(effectiveDefense())],[resource,`${formatGameNumber(state.energy)} / ${formatGameNumber(effectiveMaxEnergy())}`],[`Максимум ${resource.toLowerCase()}`,formatGameNumber(effectiveMaxEnergy())],['Монеты',formatGameNumber(state.coins)],['Победы',state.encounters],['Предметы',state.inventory.length]];$('heroStats').innerHTML=entries.map(([k,v])=>`<div class="status"><b>${k}:</b> ${v}</div>`).join('')}
const playerId=crypto.randomUUID?crypto.randomUUID():String(Math.random());let peers={},peerMarkers={},seenChatIds=new Set(),channel='BroadcastChannel' in window?new BroadcastChannel('stranniki-local'):null;
const slots=['Оружие','2 рука','Обувь','Ноги','Торс','Шлем','Рюкзак'];const rarities=[['Обычное','common'],['Необычное','uncommon'],['Редкое','rare'],['Эпическое','epic'],['Легендарное','legendary']];
const weaponDamage={common:2,uncommon:4,rare:6,epic:9,legendary:13};
const merchantCatalog=[
 {type:'Оружие',price:650,attackBonus:2},
 {type:'Обувь',price:350,defenseBonus:1},
 {type:'Ноги',price:500,defenseBonus:2},
 {type:'Торс',price:750,defenseBonus:3},
 {type:'Шлем',price:500,defenseBonus:2},
 {type:'Рюкзак',price:900,bagBonus:8}
];
function abilityBonus(key){return window.AbilityTree?.getBonuses?.()[key]||0}
function totalAttack(){return state.godMode?1000000:(state.attack+(state.equipment['Оружие']?.attackBonus||0)+(state.equipment['2 рука']?.attackBonus||0))*(1+abilityBonus('attack'))}
function effectiveMaxHp(){return state.godMode?1000000:state.maxHp*(1+abilityBonus('health'))}
function effectiveMaxEnergy(){return state.godMode?1000000:state.maxEnergy*(1+abilityBonus('energy'))}
function effectiveDefense(){if(state.godMode)return 1000000;const gear=Object.values(state.equipment).reduce((sum,item)=>sum+(Number(item?.defenseBonus)||0),0);return ((state.defense||0)+gear)*(1+abilityBonus('defense'))}
function rarityRoll(){let tier=0;const quality=1+abilityBonus('rarity');if(Math.random()<Math.min(.95,.5*quality))tier=1;if(tier>=1&&Math.random()<Math.min(.95,.5*quality))tier=2;if(tier>=2&&Math.random()<Math.min(.95,.5*quality))tier=3;if(tier>=3&&Math.random()<Math.min(.95,.4*quality))tier=4;return rarities[tier]}
function ascensionMilestone(level){return level===10||(level>=25&&level%25===0)}
window.GameAPI={
 getSkillSnapshot(){return{level:state.level,abilityPoints:state.abilityPoints,purchased:[...state.skillNodes]}},
 purchaseSkillNode(node){if(!node||typeof node.id!=='string'||!Number.isInteger(node.cost)||node.cost<1||state.skillNodes.includes(node.id)||state.abilityPoints<node.cost)return false;const hpBefore=effectiveMaxHp(),energyBefore=effectiveMaxEnergy();state.abilityPoints-=node.cost;state.skillNodes.push(node.id);state.hp=Math.min(effectiveMaxHp(),state.hp+effectiveMaxHp()-hpBefore);state.energy=Math.min(effectiveMaxEnergy(),state.energy+effectiveMaxEnergy()-energyBefore);render();return true},
 getAscensionSnapshot(){return{level:state.level,points:state.ascensionPoints,classId:state.ascensionClass}},
 chooseAscensionClass(classId){const valid=['adventurer','warrior','archer','mage'];if(!valid.includes(classId)||state.ascensionPoints<1)return false;if(classId==='adventurer'){if(state.ascensionClass||state.level<10)return false}else if(state.ascensionClass!=='adventurer'||state.level<25)return false;state.ascensionPoints--;state.ascensionClass=classId;render();return true},
 getResourceName(){return resourceName()},
 refresh(){render()}
};
function itemEmoji(item){return ({'Оружие':'⚔️','2 рука':'🛡️','Обувь':'🥾','Ноги':'🦵','Торс':'🛡️','Шлем':'🪖','Рюкзак':'🎒'})[item?.type]||'🎒'}
function canEquipInSlot(item,slot){return slot===item?.type||(slot==='2 рука'&&item?.type==='Оружие')}
function renderBag(){ $('equipSlots').innerHTML=slots.map(s=>{const item=state.equipment[s];return `<div class="slot ${item?'rarity-'+item.key:''}" data-equip="${s}" tabindex="${item?'0':'-1'}" role="${item?'button':'presentation'}">${s}<b>${item?`<span class="item-thumb" data-game-image="${item.type}" data-fallback="${itemEmoji(item)}">${itemEmoji(item)}</span>${item.name}`:'—'}</b></div>`}).join('');$('inventorySlots').innerHTML=Array.from({length:Math.max(24+(state.bagBonus||0),state.inventory.length)},(_,i)=>{const x=state.inventory[i];return `<div class="slot ${x?'rarity-'+x.key:''}" data-item="${i}" tabindex="${x?'0':'-1'}" role="${x?'button':'presentation'}">${i+1}<b>${x?`<span class="item-thumb" data-game-image="${x.type}" data-fallback="${itemEmoji(x)}">${itemEmoji(x)}</span>${x.name}`:'Пусто'}</b></div>`}).join('');$('bagCount').textContent=`Рюкзак · ${24+(state.bagBonus||0)} слотов · ${state.inventory.length} предметов`;document.querySelectorAll('#inventorySlots [data-item],#equipSlots [data-equip]').forEach(el=>el.draggable=false);document.querySelectorAll('[data-game-image]').forEach(el=>window.GameImages?.show(el,el.dataset.gameImage,el.dataset.fallback));scheduleSave()}
function openItemDetails(item,equipped=false){
 if(!item)return;
 const rarity=rarities.find(([,key])=>key===item.key)||rarities[0];
 $('itemDetailTitle').textContent=item.name||item.type||'Предмет';
 window.GameImages?.show($('itemDetailImage'),item.type,itemEmoji(item),$('itemImageCredit'));
 const rarityTag=$('itemDetailRarity');rarityTag.className=`item-detail-rarity rarity-${rarity[1]}`;rarityTag.textContent=`${rarity[0]} редкость · ${equipped?'Экипировано':'В инвентаре'}`;
 const body=$('itemDetailBody');body.replaceChildren();
 const info=document.createElement('p');info.className='sub';info.textContent=`Тип: ${item.type||'Предмет экипировки'}. ${equipped?'Предмет надет на персонажа.':'Перетащи предмет в соответствующий слот, чтобы надеть.'}`;body.append(info);
 const stats=[];
 if(item.attackBonus)stats.push(`Атака: +${formatGameNumber(item.attackBonus)}`);
 if(item.defenseBonus)stats.push(`Защита: +${formatGameNumber(item.defenseBonus)}`);
 if(item.type==='Рюкзак')stats.push(`Вместимость: +${formatGameNumber(item.bagBonus||8)} слотов`);
 if(!stats.length)stats.push('Дополнительных характеристик нет.');
 const list=document.createElement('ul');list.className='item-detail-stats';stats.forEach(text=>{const line=document.createElement('li');line.textContent=text;list.append(line)});body.append(list);
 const panel=$('itemDetailPanel');panel.classList.remove('hidden');panel.style.zIndex='4700';
}
function syncPeer(){if(channel&&gpsAllowed&&gpsPositionReady)channel.postMessage({type:'presence',id:playerId,pos,name:'Странник',at:Date.now()})}
function syncOnline(){if(gpsAllowed&&gpsPositionReady&&lastRealGpsPos)window.dispatchEvent(new CustomEvent('game:position',{detail:{lat:lastRealGpsPos[0],lng:lastRealGpsPos[1],name:'Странник'}}))}
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
 {name:'Малый голем',icon:'🗿',imageKey:'golem',hp:72,atk:14,def:6,xp:65,coins:24}
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
 $('distanceText').textContent=distance<1000?`${formatGameNumber(distance)} м`:`${formatGameNumber(distance/1000)} км`;
 $('energyText')&&($('energyText').textContent=`${formatGameNumber(state.energy)} / ${formatGameNumber(maxEnergy)}`);$('slashBtn').textContent=`⚔️ Рассечение (15 ${resource.toLowerCase()})`;
 $('potionBtn').textContent=`🧪 Лечиться (${state.potions})`;$('potionBtn').disabled=state.potions<1||state.hp>=maxHp;
 $('slashBtn').disabled=state.energy<15||!enemy; if(!$('enemyCard').classList.contains('show'))$('enemyCard').classList.remove('show');renderStats();
 if(!$('merchantPanel').classList.contains('hidden'))renderMerchantShop();
 scheduleSave();
 window.dispatchEvent(new Event('game:stats-updated'));
}
function updatePos(latlng,source='GPS'){
 const hadPosition=gpsPositionReady;
 let ignoreGpsDistance=false;
 const next=[latlng.lat,latlng.lng];
 if(source==='GPS'){
  const accuracy=Number(latlng.accuracy);if(!Number.isFinite(accuracy)||accuracy>250){gpsCandidate=null;gpsCandidateCount=0;$('gpsHead').textContent='Слабый GPS';$('gpsGateStatus').textContent=`Слабый сигнал GPS (точность ±${Number.isFinite(accuracy)?Math.round(accuracy):'—'} м). Включи точную геопозицию телефона и подожди более точный сигнал.`;return false}
  if(Number.isFinite(latlng.timestamp)&&Date.now()-latlng.timestamp>60000){gpsCandidate=null;gpsCandidateCount=0;$('gpsHead').textContent='Устаревшие координаты';$('gpsGateStatus').textContent='Телефон прислал старое местоположение. Жду новое измерение GPS…';return false}
  const now=Date.now();
  if(!gpsFixReady){
   const candidateRadius=150,requiredSamples=1;
   if(gpsCandidate&&map.distance(gpsCandidate,next)<=candidateRadius)gpsCandidateCount++;else{gpsCandidate=next;gpsCandidateCount=1}
   if(gpsCandidateCount<requiredSamples){$('gpsHead').textContent='Проверяем GPS';$('gpsGateStatus').textContent='Проверяю точность координат; жду ещё одно совпадающее измерение…';return false}
   gpsCandidate=null;gpsCandidateCount=0;
  }else{
   const jump=map.distance(lastGpsPos||pos,next),elapsed=Math.max(1,(now-(lastGpsAt||now))/1000),maxPlausible=Math.max(120,elapsed*50+accuracy+lastGpsAccuracy),staleFix=elapsed>180&&accuracy<=100,suspiciousJump=jump>100000||jump>maxPlausible;let confirmedJump=false;
   if(suspiciousJump&&!staleFix){const required=jump>100000?3:2,radius=Math.max(35,Math.min(100,accuracy*.75+lastGpsAccuracy*.5));if(gpsCandidate&&map.distance(gpsCandidate,next)<=radius)gpsCandidateCount++;else{gpsCandidate=next;gpsCandidateCount=1}if(gpsCandidateCount<required){$('gpsHead').textContent='Проверяем GPS';$('gpsGateStatus').textContent='GPS сообщил резкий скачок. Проверяю несколько совпадающих измерений, игра остаётся открытой.';return true}gpsCandidate=null;gpsCandidateCount=0;ignoreGpsDistance=true;confirmedJump=true}
   if(staleFix&&suspiciousJump){ignoreGpsDistance=true;confirmedJump=true}
   if(!confirmedJump){const movementThreshold=Math.max(15,Math.min(30,accuracy*.8+lastGpsAccuracy*.4));if(jump<movementThreshold){gpsCandidate=null;gpsCandidateCount=0;lastGpsAccuracy=accuracy;return true}if(gpsCandidate&&map.distance(gpsCandidate,next)<=25)gpsCandidateCount++;else{gpsCandidate=next;gpsCandidateCount=1}if(gpsCandidateCount<2){$('gpsHead').textContent='Проверяем GPS';$('gpsGateStatus').textContent='Проверяю движение телефона по GPS…';return true}gpsCandidate=null;gpsCandidateCount=0}
  }
  lastGpsAt=now;lastGpsAccuracy=accuracy;lastRealGpsPos=next;gpsFixReady=true;
 }
 const distanceFrom=source==='GPS'&&!ignoreGpsDistance?lastGpsPos:null;if(distanceFrom){const d=map.distance(distanceFrom,next);if(d<100000)distance+=d;}
 if(source==='GPS')lastGpsPos=next;
 lastPos=next;pos=next;gpsPositionReady=true;playerMarker.setLatLng(pos);renderChatPeers();if(source==='GPS'&&!gpsInitialCentered){map.setView(pos,Math.max(map.getZoom(),16));gpsInitialCentered=true}
 cleanupDistantMonsters();
 if(gpsAllowed)updateMerchantForPosition();
 $('coords').textContent=`${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`;
 $('mapState').textContent=source==='GPS'?'GPS активен':'Режим разработчика';
 if(source==='GPS')$('gpsHead').textContent='GPS подключён';
 render();
 syncPeer();syncOnline();
 if(!hadPosition&&monsters.length===0&&gpsAllowed)spawnEnemy(false);
 return true;
}
function spawnEnemy(force=true){
 if(monsters.length>=25){if(force)log('На карте уже максимальное число врагов (25).');return;}
 const f=foes[Math.min(foes.length-1,Math.floor(Math.random()*foes.length))];
 const scale=1+(state.level-1)*.18;
 const monster={...f,level:state.level,maxHp:Math.round(f.hp*scale),hp:Math.round(f.hp*scale),atk:Math.round(f.atk*scale),def:Math.round(f.def*scale),xp:Math.round(f.xp*scale),coins:Math.round(f.coins*scale)};
 const angle=Math.random()*Math.PI*2,meters=Math.random()*100;
 const dLat=(meters/111320)*Math.cos(angle),dLng=(meters/(111320*Math.max(.2,Math.cos(pos[0]*Math.PI/180))))*Math.sin(angle);
 const epos=[pos[0]+dLat,pos[1]+dLng];
 monster.id=crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());monster.pos=epos;placeMonsterMarker(monster);monsters.push(monster);
 log(`На карте появился противник: ${f.name}. Нажми на него, чтобы начать бой.`,'bad');render();
}
function monsterImageKey(monster){if(['slime','goblin','wolf','golem'].includes(monster?.imageKey))return monster.imageKey;const name=String(monster?.name||'').toLowerCase();if(name.includes('гоблин'))return'goblin';if(name.includes('волк'))return'wolf';if(name.includes('голем'))return'golem';return'slime'}
function placeMonsterMarker(monster){monster.marker=L.marker(monster.pos,{icon:enemyIcon}).addTo(map);monster.marker.bindTooltip(`${monster.icon} ${monster.name}`);const markerImage=monster.marker.getElement()?.querySelector('.enemymarker');if(markerImage)window.GameImages?.show(markerImage,monsterImageKey(monster),monster.icon||'👾');monster.marker.on('click',e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);selectEnemy(monster)})}
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
 appendOffer(`🧪 Зелье здоровья · ${state.potions}/10`,100,'potion',!near||state.coins<100||state.potions>=10);
 for(const item of merchantCatalog){const full=state.inventory.length>=24+(state.bagBonus||0);const stats=item.attackBonus?` · +${item.attackBonus} атака`:item.defenseBonus?` · +${item.defenseBonus} защита`:item.bagBonus?` · +${item.bagBonus} слотов`:'';appendOffer(`${item.type} · Обычное${stats}`,item.price,`item:${item.type}`,!near||state.coins<item.price||full)}
 const sell=$('merchantSellList');sell.replaceChildren();
 if(!state.inventory.length){const empty=document.createElement('div');empty.className='sub';empty.textContent='В инвентаре нет предметов для продажи.';sell.append(empty);return;}
 state.inventory.forEach((item,index)=>{const row=document.createElement('div');row.className='shop-row';const name=document.createElement('span');name.textContent=`${item.name} · ${formatGameNumber(salePrice(item))} 🪙`;const button=document.createElement('button');button.type='button';button.className='secondary';button.dataset.sell=String(index);button.textContent='Продать';button.disabled=!near;row.append(name,button);sell.append(row);});
}
function buyMerchantOffer(offer){
 if(merchantDistance()>200){$('merchantDistance').textContent='Подойди ближе к торговцу, чтобы совершить покупку.';return;}
 if(offer==='potion'){
  if(state.potions>=10||state.coins<100)return;
  state.coins-=100;state.potions++;log('Куплено зелье здоровья за 100 монет.','good');
 }else{
  const item=merchantCatalog.find(good=>`item:${good.type}`===offer);if(!item||state.coins<item.price||state.inventory.length>=24+(state.bagBonus||0))return;
  state.coins-=item.price;state.inventory.push({name:`${item.type} · Обычное`,type:item.type,key:'common',basePrice:item.price,attackBonus:item.attackBonus||0,defenseBonus:item.defenseBonus||0,bagBonus:item.bagBonus||0});log(`Куплено: ${item.type} · Обычное за ${formatGameNumber(item.price)} монет.`,'good');renderBag();
 }
 render();renderMerchantShop();
}
function sellMerchantItem(index){
 if(merchantDistance()>200||!Number.isInteger(index)||!state.inventory[index])return;
 const [item]=state.inventory.splice(index,1),earned=salePrice(item);state.coins+=earned;log(`Продано: ${item.name} за ${formatGameNumber(earned)} монет.`,'good');renderBag();render();renderMerchantShop();
}
function restoreMonsters(){if(!Array.isArray(savedGame.monsters))return;for(const m of savedGame.monsters.slice(0,25)){if(!m||!Array.isArray(m.pos)||m.pos.length!==2||!m.pos.every(Number.isFinite))continue;const monster={...m};placeMonsterMarker(monster);monsters.push(monster)}}
function selectEnemy(monster){if(!monster||!monsters.includes(monster))return;if(enemy&&enemy!==monster&&turn==='enemy'){log('Дождись завершения хода противника.');return}combatId++;enemy=monster;enemyMarker=monster.marker;turn='player';$('attackBtn').disabled=false;$('slashBtn').disabled=state.energy<15;const card=$('enemyCard');card.classList.remove('hidden');card.classList.add('show');card.setAttribute('aria-hidden','false');card.style.zIndex='4800';window.GameImages?.show($('enemyIcon'),monsterImageKey(enemy),monster.icon,$('enemyImageCredit'));$('enemyName').textContent=enemy.name;$('enemyHint').textContent='Противник выбран';$('enemyLevel').textContent=enemy.level;$('enemyAttack').textContent=enemy.atk;$('enemyDefense').textContent=enemy.def;$('combatStatus').textContent='Твой ход.';renderEnemy();render()}
function closeCombat(){
 if(enemy){enemy.hp=enemy.maxHp;log(`${enemy.name} восстановил здоровье. Сражение прекращено.`);}
 combatId++;enemy=null;enemyMarker=null;turn='player';$('enemyCard').classList.remove('show');$('attackBtn').disabled=false;$('slashBtn').disabled=state.energy<15;$('combatStatus').textContent='Сражение прекращено. Выбери противника, чтобы начать снова.';scheduleSave();
}
function handlePlayerDeath(){closeCombat();const lost=state.coins*.5;state.coins-=lost;state.hp=Math.max(1,effectiveMaxHp()*.35);log(`Ты погиб и потерял ${formatGameNumber(lost)} монет (50%). Здоровье восстановлено у безопасного места.`,'bad')}
function renderEnemy(){if(!enemy)return;$('enemyHpText').textContent=`${formatGameNumber(enemy.hp)} / ${formatGameNumber(enemy.maxHp)} HP`;$('enemyHpStat').textContent=`${formatGameNumber(enemy.hp)} / ${formatGameNumber(enemy.maxHp)}`;$('enemyHpBar').style.width=Math.max(0,enemy.hp/enemy.maxHp*100)+'%'}
function finishEnemy(){
 if(!enemy||!monsters.includes(enemy))return;
 const defeated=enemy;
 const earnedGold=defeated.coins*(1+abilityBonus('gold'));
 state.xp+=defeated.xp;state.coins+=earnedGold;state.encounters++;
 log(`Победа над ${defeated.name}! +${formatGameNumber(defeated.xp)} опыта, +${formatGameNumber(earnedGold)} монет.`,'good');
 if(Math.random()<Math.min(1,.05*(1+abilityBonus('drop')))){
  const [rarity,key]=rarityRoll(),type=slots[Math.floor(Math.random()*slots.length)],item={name:`${type} · ${rarity}`,key,type};
  if(type==='Оружие')item.attackBonus=weaponDamage[key];
  else if(type==='2 рука')item.attackBonus=(weaponDamage[key]||2)*.75;
  else if(type!=='Рюкзак')item.defenseBonus=({common:1,uncommon:2,rare:3,epic:5,legendary:7})[key]||0;
  if(state.inventory.length<24+(state.bagBonus||0)){state.inventory.push(item);log(`Выпал предмет: ${item.name}${item.attackBonus?` (+${formatGameNumber(item.attackBonus)} к атаке)`:''}!`,'good');renderBag()}
  else log('Предмет выпал, но рюкзак полон.','bad');
 }
 $('combatStatus').textContent=`Победа! Получено ${formatGameNumber(defeated.xp)} опыта и ${formatGameNumber(earnedGold)} монет.`;
 if(defeated.marker)map.removeLayer(defeated.marker);monsters=monsters.filter(m=>m!==defeated);enemy=null;enemyMarker=null;$('enemyCard').classList.remove('show');turn='player';$('attackBtn').disabled=false;$('slashBtn').disabled=state.energy<15;
 let need=xpToNextLevel();
 while(state.xp>=need){state.xp-=need;state.level++;state.abilityPoints++;state.maxHp+=15;state.hp=effectiveMaxHp();state.attack+=3;state.potions=Math.min(10,state.potions+1);let note=`Новый уровень ${state.level}! +1 Ability Point, здоровье восстановлено, атака +3.`;if(ascensionMilestone(state.level)){state.ascensionPoints++;note+=` +1 поинт вознесения.`}log(note,'good');need=xpToNextLevel();}
 render()
}
$('attackBtn').addEventListener('click',()=>{
 if(!enemy||turn!=='player'||Date.now()-lastAttack<1000)return;lastAttack=Date.now();turn='enemy';$('attackBtn').disabled=true;$('combatStatus').textContent='Твоя атака. Ход противника через 1 секунду…';
 const target=enemy,activeCombat=combatId;
 const dmg= Math.max(1,totalAttack()+Math.floor(Math.random()*7)-3-(enemy.def||0));enemy.hp=Math.max(0,enemy.hp-dmg);
 log(`Ты наносишь ${formatGameNumber(dmg)} урона врагу.`,'good');
 if(enemy.hp<=0){renderEnemy();finishEnemy();return;}setTimeout(()=>{if(combatId!==activeCombat||enemy!==target)return;const hit=state.godMode?0:Math.max(1,target.atk+Math.floor(Math.random()*5)-2-effectiveDefense());state.hp=Math.max(0,state.hp-hit);log(state.godMode?`${target.name} атакует, но Режим Бога блокирует урон.`:`${target.name} отвечает и наносит ${formatGameNumber(hit)} урона с учётом защиты.`,'bad');
 if(state.hp<=0){handlePlayerDeath();render();return}
 renderEnemy();render();$('combatStatus').textContent='Твой ход.';turn='player';$('attackBtn').disabled=false;},1000);
});
$('potionBtn').addEventListener('click',()=>{const maxHp=effectiveMaxHp();if(state.potions<1||state.hp>=maxHp||turn!=='player')return;state.potions--;const heal=Math.min(35,maxHp-state.hp);state.hp+=heal;log(`Зелье восстановило ${formatGameNumber(heal)} HP.`,'good');render()});
$('slashBtn').addEventListener('click',()=>{
 if(!enemy||turn!=='player'||state.energy<15)return;
 const target=enemy,activeCombat=combatId;turn='enemy';if(!state.godMode)state.energy-=15;
 const slashDamage=Math.max(1,totalAttack()*1.5+Math.floor(Math.random()*6)-target.def);enemy.hp=Math.max(0,enemy.hp-slashDamage);
 log(`Рассечение наносит ${formatGameNumber(slashDamage)} физического урона и тратит ${formatGameNumber(15)} ${resourceName().toLowerCase()}.`,'good');renderEnemy();render();
 if(enemy.hp<=0){finishEnemy();turn='player';return}
 $('attackBtn').disabled=true;$('slashBtn').disabled=true;$('combatStatus').textContent='Рассечение выполнено. Ход противника через 1 секунду…';
 setTimeout(()=>{if(combatId!==activeCombat||enemy!==target)return;const hit=state.godMode?0:Math.max(1,target.atk+Math.floor(Math.random()*5)-2-effectiveDefense());state.hp=Math.max(0,state.hp-hit);log(state.godMode?`${target.name} атакует, но Режим Бога блокирует урон.`:`${target.name} отвечает и наносит ${formatGameNumber(hit)} урона с учётом защиты.`,'bad');if(state.hp<=0){handlePlayerDeath();render();return}turn='player';$('attackBtn').disabled=false;$('slashBtn').disabled=state.energy<15;$('combatStatus').textContent='Твой ход.';render()},1000)
});
setupPanels();
$('centerBtn').addEventListener('click',()=>map.setView(pos,17));
function developerActionAllowed(){return isDeveloper&&window.firebasePlayerUid===DEVELOPER_UID}
function changeDeveloperLevel(delta){if(!developerActionAllowed()||!Number.isInteger(delta)||!delta)return;const target=Math.max(1,Math.min(100000,state.level+delta));while(state.level<target){state.level++;state.abilityPoints++;state.maxHp+=15;state.attack+=3;state.potions=Math.min(10,state.potions+1);if(ascensionMilestone(state.level))state.ascensionPoints++}while(state.level>target){if(ascensionMilestone(state.level))state.ascensionPoints=Math.max(0,state.ascensionPoints-1);state.level--;state.abilityPoints=Math.max(0,state.abilityPoints-1);state.maxHp=Math.max(100,state.maxHp-15);state.attack=Math.max(12,state.attack-3)}state.xp=0;state.hp=Math.min(state.hp,effectiveMaxHp());state.energy=Math.min(state.energy,effectiveMaxEnergy());render();scheduleSave();log(`Уровень разработчиком изменён: теперь ${state.level}.`,'good')}
$('devTeleportToggle').addEventListener('click',event=>{if(!developerActionAllowed())return;devMode=!devMode;event.currentTarget.textContent=`🗺 Перемещение по клику: ${devMode?'вкл.':'выкл.'}`;event.currentTarget.classList.toggle('primary',devMode)});
$('devLevelApply').addEventListener('click',()=>{if(!developerActionAllowed())return;const delta=Number($('devLevelAmount').value);if(!Number.isInteger(delta)||delta===0||Math.abs(delta)>1000){log('Введи целое изменение уровня от -1000 до 1000, кроме 0.','bad');return}changeDeveloperLevel(delta)});
$('devGoldApply').addEventListener('click',()=>{if(!developerActionAllowed())return;const amount=Number($('devGoldAmount').value);if(!Number.isFinite(amount)||amount<0){log('Укажи неотрицательное количество золота.','bad');return}state.coins=amount;render();scheduleSave();log(`Количество золота установлено: ${formatGameNumber(amount)}.`,'good')});
$('devGodToggle').addEventListener('click',event=>{if(!developerActionAllowed())return;state.godMode=!state.godMode;if(state.godMode){state.hp=1000000;state.energy=1000000}else{state.hp=Math.min(state.hp,effectiveMaxHp());state.energy=Math.min(state.energy,effectiveMaxEnergy())}event.currentTarget.textContent=`😇 Режим Бога: ${state.godMode?'вкл.':'выкл.'}`;render();scheduleSave()});
map.on('click',e=>{if(!devMode||!developerActionAllowed())return;updatePos(e.latlng,'DEV');map.setView(e.latlng,17);log('Разработчик переместил персонажа кликом по карте; пройденное расстояние не изменено.','good')});
$('chatSend').addEventListener('click',()=>{const input=$('chatInput'),text=input.value.trim();if(!text)return;window.dispatchEvent(new CustomEvent('game:chat-send',{detail:{text,lat:pos[0],lng:pos[1]}}));input.value=''});
$('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('chatSend').click()});
$('merchantGoods').addEventListener('click',event=>{const button=event.target.closest('[data-buy]');if(button)buyMerchantOffer(button.dataset.buy)});
$('merchantSellList').addEventListener('click',event=>{const button=event.target.closest('[data-sell]');if(button)sellMerchantItem(Number(button.dataset.sell))});
function startItemDrag(event,slot,item,kind){if(event.button!==undefined&&event.button!==0)return;event.preventDefault();activeItemDrag={pointerId:event.pointerId,slot,item,kind,startX:event.clientX,startY:event.clientY,moved:false,ghost:null,scrollPanel:kind==='inventory'?$('bagPanel'):null,pointerY:event.clientY,scrollRaf:0};slot.classList.add('dragging');if(kind==='inventory')slot.dataset.dragIndex=slot.dataset.item;else slot.dataset.dragEquip=slot.dataset.equip;try{slot.setPointerCapture(event.pointerId)}catch{}}
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
  if(target?.closest('#trashSlot')){state.inventory.splice(index,1);renderBag();render();log(`Удалён предмет: ${item.name}.`,'bad');return;}
  const equip=target?.closest('[data-equip]');if(!equip||!canEquipInSlot(item,equip.dataset.equip))return;
  const slot=equip.dataset.equip,old=state.equipment[slot];state.equipment[slot]=item;state.inventory.splice(index,1);if(item.type==='Рюкзак'&&!old)state.bagBonus=(state.bagBonus||0)+8;if(old)state.inventory.push(old);renderBag();render();log(`Надето: ${item.name} (${slot}).`,'good');
 }else if(dragged.dataset.dragEquip){
  const type=dragged.dataset.dragEquip,item=state.equipment[type];
  const bag=target?.closest('#inventorySlots');if(!bag||!item||state.inventory.length>=24+(state.bagBonus||0))return;
  state.inventory.push(item);delete state.equipment[type];if(type==='Рюкзак')state.bagBonus=Math.max(0,(state.bagBonus||0)-8);renderBag();render();log(`Снято: ${item.name}.`);
 }
});
function autoScrollInventory(drag){if(activeItemDrag!==drag||!drag.scrollPanel)return;const rect=drag.scrollPanel.getBoundingClientRect(),edge=52,y=drag.pointerY;let delta=0;if(y>rect.bottom-edge&&y<rect.bottom)delta=Math.ceil((edge-(rect.bottom-y))*.32);else if(y<rect.top+edge&&y>rect.top)delta=-Math.ceil((edge-(y-rect.top))*.32);if(delta){const before=drag.scrollPanel.scrollTop;drag.scrollPanel.scrollTop+=Math.max(-15,Math.min(15,delta));if(before!==drag.scrollPanel.scrollTop)drag.scrollRaf=requestAnimationFrame(()=>autoScrollInventory(drag));else drag.scrollRaf=0}else drag.scrollRaf=0}
document.addEventListener('pointermove',e=>{const scroll=activeInventoryScroll;if(scroll&&e.pointerId===scroll.pointerId){if(Math.abs(e.clientY-scroll.startY)>4)scroll.moved=true;if(scroll.moved){scroll.panel.scrollTop-=e.clientY-scroll.lastY; e.preventDefault()}scroll.lastY=e.clientY;return}const drag=activeItemDrag;if(!drag||e.pointerId!==drag.pointerId)return;drag.pointerY=e.clientY;if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7){drag.moved=true;const ghost=drag.slot.cloneNode(true);ghost.classList.remove('dragging');ghost.classList.add('drag-ghost');ghost.removeAttribute('data-item');ghost.removeAttribute('data-equip');ghost.removeAttribute('draggable');ghost.style.width=`${drag.slot.getBoundingClientRect().width}px`;document.body.append(ghost);drag.ghost=ghost}if(drag.ghost){drag.ghost.style.left=`${e.clientX-drag.ghost.offsetWidth/2}px`;drag.ghost.style.top=`${e.clientY-drag.ghost.offsetHeight/2}px`}if(drag.scrollPanel&&!drag.scrollRaf){const rect=drag.scrollPanel.getBoundingClientRect();if((e.clientY>rect.bottom-52&&e.clientY<rect.bottom)||(e.clientY<rect.top+52&&e.clientY>rect.top))drag.scrollRaf=requestAnimationFrame(()=>autoScrollInventory(drag))}const target=document.elementFromPoint(e.clientX,e.clientY),trash=target?.closest('#trashSlot'),equip=target?.closest('[data-equip]');$('trashSlot').classList.toggle('drop-target',!!trash&&drag.kind==='inventory');document.querySelectorAll('#equipSlots [data-equip]').forEach(el=>el.classList.toggle('drop-target',!!equip&&equip===el&&drag.item.type===el.dataset.equip))});
document.addEventListener('pointerup',e=>{if(activeInventoryScroll?.pointerId===e.pointerId)activeInventoryScroll=null});
document.addEventListener('pointercancel',e=>{if(activeInventoryScroll?.pointerId===e.pointerId)activeInventoryScroll=null;if(!activeItemDrag)return;if(activeItemDrag.scrollRaf)cancelAnimationFrame(activeItemDrag.scrollRaf);activeItemDrag.ghost?.remove();activeItemDrag.slot.classList.remove('dragging');activeItemDrag=null;$('trashSlot').classList.remove('drop-target');document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'))});
document.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;const slot=event.target.closest?.('[data-item],[data-equip]');if(!slot)return;const item=slot.dataset.item!==undefined?state.inventory[Number(slot.dataset.item)]:state.equipment[slot.dataset.equip];if(item){event.preventDefault();openItemDetails(item,slot.dataset.equip!==undefined)}});
function gpsErrorText(error){if(error.code===1)return'Доступ к геопозиции запрещён. Разреши его в настройках сайта браузера и снова нажми кнопку входа.';if(error.code===2)return'Телефон временно не получил координаты. Продолжаю искать GPS-сигнал.';return'GPS пока не ответил. Продолжаю ждать сигнал и повторять определение.'}
function lockGameForGps(message){gpsAllowed=false;gpsPositionReady=false;gpsFixReady=false;lastGpsPos=null;lastGpsAt=0;lastGpsAccuracy=0;gpsCandidate=null;gpsCandidateCount=0;if(gpsWatch!==null)navigator.geolocation?.clearWatch(gpsWatch);gpsWatch=null;document.body.classList.add('site-locked');$('gpsGate').classList.remove('hidden');$('gpsGateStatus').textContent=message;$('gpsGateBtn').disabled=false;$('gpsGateBtn').textContent='🔄 Проверить GPS и войти';$('gpsHead').textContent='GPS не подключён'}
function handleGpsError(error,retryWatch=false){const message=gpsErrorText(error);if(error.code===1){lockGameForGps(message);return}if(gpsAllowed){$('gpsHead').textContent='Ищем GPS-сигнал…';return}document.body.classList.add('site-locked');$('gpsGate').classList.remove('hidden');$('gpsHead').textContent='Ожидание GPS';$('gpsGateStatus').textContent=message;$('gpsGateBtn').disabled=false;$('gpsGateBtn').textContent='🔄 Повторить проверку GPS';if(retryWatch)startGpsWatch()}
function unlockGame(){if(!gpsPositionReady)return;const firstUnlock=!gpsAllowed;gpsAllowed=true;document.body.classList.remove('site-locked');$('gpsGate').classList.add('hidden');$('gpsGateStatus').textContent='';requestAnimationFrame(()=>map.invalidateSize());if(firstUnlock){if(monsters.length===0)spawnEnemy(false);updateMerchantForPosition();syncPeer();syncOnline()}}
const gpsOptions={enableHighAccuracy:true,maximumAge:0,timeout:15000};
function acceptGpsFix(position){const valid=updatePos({lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,timestamp:position.timestamp},'GPS');if(valid&&gpsPositionReady){unlockGame();map.setView(pos,Math.max(map.getZoom(),17));map.invalidateSize();return true}if(!gpsPositionReady){$('gpsHead').textContent='Проверяем GPS';if(!$('gpsGateStatus').textContent)$('gpsGateStatus').textContent='Жду свежий GPS-фикс с точностью до 250 м…';$('gpsGateBtn').disabled=false;$('gpsGateBtn').textContent='🔄 Повторить поиск GPS'}return false}
function startGpsWatch(){if(gpsWatch!==null)navigator.geolocation.clearWatch(gpsWatch);gpsWatch=navigator.geolocation.watchPosition(acceptGpsFix,error=>handleGpsError(error),gpsOptions)}
function requestGpsAccess(fromGate=false,permissionAlreadyGranted=false){
 const gateStatus=$('gpsGateStatus');if(!navigator.geolocation){lockGameForGps('Этот браузер не поддерживает геолокацию. Открой игру в браузере с поддержкой GPS.');return}
 if(!window.isSecureContext){lockGameForGps('Для GPS открой сайт через HTTPS.');return}
 document.body.classList.add('site-locked');$('gpsGate').classList.remove('hidden');$('gpsGateBtn').disabled=false;$('gpsGateBtn').textContent='⏳ Ищем GPS…';gateStatus.textContent=permissionAlreadyGranted?'Доступ уже разрешён. Получаю координаты; кнопку можно нажать повторно.':'Разреши доступ в запросе браузера. Если поиск затянулся, нажми кнопку ещё раз.';$('gpsHead').textContent='Запрос GPS…';
 startGpsWatch();
 navigator.geolocation.getCurrentPosition(position=>{acceptGpsFix(position);if(!gpsAllowed)$('gpsGateBtn').textContent='🔄 Повторить поиск GPS';startGpsWatch()},error=>handleGpsError(error),gpsOptions);
}
$('gpsGateBtn').addEventListener('click',()=>requestGpsAccess(true));
setInterval(()=>{for(const [id,p] of Object.entries(peers))if(Date.now()-p.at>10000){delete peers[id];if(peerMarkers[id])map.removeLayer(peerMarkers[id]);delete peerMarkers[id]}syncPeer()},5000);
setInterval(()=>{const maxHp=effectiveMaxHp(),maxEnergy=effectiveMaxEnergy();if(state.hp<maxHp&&!enemy)state.hp=Math.min(maxHp,state.hp+maxHp*.0025);if(state.energy<maxEnergy&&!enemy)state.energy=Math.min(maxEnergy,state.energy+maxEnergy*.0075);render()},1000);
setInterval(()=>{if(gpsAllowed&&!document.hidden&&monsters.length<25)spawnEnemy(false)},10000);
window.addEventListener('resize',()=>requestAnimationFrame(()=>map.invalidateSize()));window.addEventListener('orientationchange',()=>setTimeout(()=>map.invalidateSize(),250));
renderBag();
if(Array.isArray(savedGame.log)){const logBox=$('log');logBox.replaceChildren();savedGame.log.slice(0,18).reverse().forEach(entry=>{const p=document.createElement('p');p.textContent=String(entry.text||'');if(['good','bad'].includes(entry.kind))p.className=entry.kind;logBox.append(p)})}
restoreMonsters();
cleanupDistantMonsters();
if(monsters.length===0)spawnEnemy(false);
if(!merchantPos||map.distance(pos,merchantPos)>=500){placeMerchant(nearbyCoordinates(pos));log('На карте появился дружественный торговец. Найди его на карте.','good')}else placeMerchant(merchantPos);
render();
if(!navigator.geolocation){$('gpsGateStatus').textContent='Этот браузер не поддерживает геолокацию.'}else if(navigator.permissions?.query){navigator.permissions.query({name:'geolocation'}).then(permission=>{permission.onchange=()=>{if(permission.state!=='granted'&&gpsAllowed)lockGameForGps('Разрешение на геопозицию отключено. Разреши GPS и войди снова.')};if(permission.state==='granted')requestGpsAccess(true,true);else if(permission.state==='denied')$('gpsGateStatus').textContent='Доступ уже запрещён. Разреши геопозицию в настройках сайта браузера, затем нажми кнопку входа.'}).catch(()=>{$('gpsGateStatus').textContent='Нажми кнопку и разреши браузеру доступ к геопозиции.'})}else $('gpsGateStatus').textContent='Нажми кнопку, чтобы запросить доступ к геопозиции.';
window.addEventListener('pagehide',saveGame);document.addEventListener('visibilitychange',()=>{if(document.hidden){saveGame();return}if(navigator.permissions?.query)navigator.permissions.query({name:'geolocation'}).then(permission=>{if(permission.state!=='granted'&&gpsAllowed)lockGameForGps('GPS отключён. Разреши геопозицию, чтобы вернуться в игру.');else if(permission.state==='granted'&&!gpsAllowed)requestGpsAccess(true,true)}).catch(()=>{})});
})();
