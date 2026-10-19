(() => {
const $ = id => document.getElementById(id);
const map = L.map('map').setView([50.4501,30.5234],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
const playerIcon=L.divIcon({className:'',html:'<div class="marker youmarker">🧙</div>',iconSize:[42,42],iconAnchor:[21,21]});
const enemyIcon=L.divIcon({className:'',html:'<div class="marker enemymarker">👾</div>',iconSize:[38,38],iconAnchor:[19,19]});
const SAVE_KEY='gorodskie-stranniki-save-v1';
function readSave(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')||{}}catch{return{}}}
const savedGame=readSave();
let pos=[50.4501,30.5234];
if(Array.isArray(savedGame.displayPos)&&savedGame.displayPos.length===2&&savedGame.displayPos.every(Number.isFinite))pos=savedGame.displayPos;else if(savedGame.realGps&&Array.isArray(savedGame.pos)&&savedGame.pos.length===2&&savedGame.pos.every(Number.isFinite))pos=savedGame.pos;
map.setView(pos,15);
let playerMarker=L.marker(pos,{icon:playerIcon}).addTo(map).bindPopup('Ты здесь — Странник');
let enemyMarker=null, enemy=null, monsters=[],gpsWatch=null, demoCount=0, distance=Number.isFinite(savedGame.distance)?savedGame.distance:0,lastPos=null,gpsAllowed=false,gpsPositionReady=false,gpsFixReady=false,gpsInitialCentered=false,lastRealGpsPos=savedGame.realGps&&Array.isArray(savedGame.pos)?savedGame.pos:null,lastGpsPos=null,lastGpsAt=0,lastGpsAccuracy=0,gpsCandidate=null,gpsCandidateCount=0,saveTimer=null;
let state={level:1,xp:0,hp:100,maxHp:100,coins:0,potions:1,attack:12,defense:0,encounters:0,...(savedGame.state||{})};
state.inventory=Array.isArray(state.inventory)?state.inventory:[];state.equipment=state.equipment&&typeof state.equipment==='object'?state.equipment:{};state.mana=Number.isFinite(state.mana)?state.mana:50;state.maxMana=Number.isFinite(state.maxMana)?state.maxMana:50;
state.abilityPoints=Number.isFinite(state.abilityPoints)?state.abilityPoints:Math.max(0,state.level-1);state.skillNodes=Array.isArray(state.skillNodes)?state.skillNodes:[];
function saveGame(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({state,distance,pos:lastRealGpsPos,displayPos:pos,realGps:!!lastRealGpsPos,log:Array.from($('log').children).map(p=>({text:p.textContent,kind:p.className})),monsters:monsters.map(({marker,...m})=>m)}))}catch{}}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveGame,350)}
let devMode=false,turn='player',lastAttack=0;
function setupPanels(){
 const aside=document.querySelector('aside');
 const playerHud=aside.querySelector(':scope > .card:first-child');playerHud.id='playerHud';playerHud.classList.add('floating-panel');document.body.append(playerHud);
 const tools=document.createElement('div');tools.className='hud-tools';tools.innerHTML='<button type="button" class="secondary" data-open="statsPanel">📊 Герой</button><button type="button" class="secondary" data-open="logPanel">📜 Журнал</button><button type="button" class="secondary" data-open="bagPanel">🎒 Снаряжение</button><button type="button" class="secondary" data-open="chatPanel">💬 Чат</button>';document.body.append(tools);
 const startLeft=Math.max(8,Math.min(365,innerWidth-365));const stats=document.createElement('section');stats.id='statsPanel';stats.className='card floating-panel hidden';stats.style.left=`${startLeft}px`;stats.style.top='74px';stats.innerHTML='<div class="panel-title"><h2>Характеристики героя</h2><button type="button" class="secondary panel-close">✕</button></div><div id="heroStats"></div>';document.body.append(stats);
 const panels=[['logPanel','log','📜 Журнал'],['bagPanel','equip','🎒 Снаряжение'],['chatPanel','chat','💬 Чат поблизости']];
 for(const [id,selector,title] of panels){const query=selector==='log'?'.log':selector==='equip'?'#bagCount':'#chatlog';const card=aside.querySelector(query).closest('.card');card.id=id;card.classList.add('floating-panel','hidden');card.style.left=`${startLeft}px`;card.style.top='74px';const bar=document.createElement('div');bar.className='panel-title';bar.innerHTML=`<h2>${title}</h2><button type="button" class="secondary panel-close">✕</button>`;card.querySelector('h2').replaceWith(bar);document.body.append(card)}
 const travel=aside.querySelector('#gpsBtn').closest('.card');travel.id='travelPanel';travel.classList.add('floating-panel');travel.style.left='12px';travel.style.bottom='12px';const combat=aside.querySelector('#enemyCard');combat.classList.add('floating-panel');combat.style.left=`${startLeft}px`;combat.style.top='74px';const combatTitle=document.createElement('div');combatTitle.className='panel-title';combatTitle.innerHTML='<h2>Обнаружен противник!</h2>';combat.querySelector('h2').replaceWith(combatTitle);
 tools.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const panel=$(button.dataset.open);if(!panel)return;document.querySelectorAll('#logPanel,#bagPanel,#chatPanel,#statsPanel').forEach(p=>p.classList.add('hidden'));panel.classList.remove('hidden');panel.style.zIndex='4500';if(button.dataset.open==='statsPanel')renderStats()}));
 document.querySelectorAll('.panel-close').forEach(button=>button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();button.closest('.floating-panel').classList.add('hidden')}));
 document.querySelectorAll('.floating-panel .panel-title').forEach(bar=>{let panel=bar.closest('.floating-panel'),drag=null;bar.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag={x:e.clientX-panel.offsetLeft,y:e.clientY-panel.offsetTop};bar.setPointerCapture(e.pointerId)});bar.addEventListener('pointermove',e=>{if(!drag)return;panel.style.left=Math.max(0,Math.min(innerWidth-panel.offsetWidth,e.clientX-drag.x))+'px';panel.style.top=Math.max(58,Math.min(innerHeight-60,e.clientY-drag.y))+'px';panel.style.bottom='auto'});bar.addEventListener('pointerup',()=>drag=null)});
}
function renderStats(){const entries=[['Уровень',state.level],['Ability Points',state.abilityPoints],['Опыт',`${formatGameNumber(state.xp)} / ${formatGameNumber(state.level*100)}`],['Максимум опыта до уровня',formatGameNumber(state.level*100)],['Здоровье',`${formatGameNumber(state.hp)} / ${formatGameNumber(effectiveMaxHp())}`],['Максимум здоровья',formatGameNumber(effectiveMaxHp())],['Базовая атака',formatGameNumber(state.attack)],['Бонус оружия',formatGameNumber(state.equipment['Оружие']?.attackBonus||0)],['Итоговый урон',formatGameNumber(totalAttack())],['Защита',formatGameNumber(effectiveDefense())],['Мана',`${formatGameNumber(state.mana)} / ${formatGameNumber(effectiveMaxMana())}`],['Максимум маны',formatGameNumber(effectiveMaxMana())],['Монеты',formatGameNumber(state.coins)],['Победы',state.encounters],['Предметы',state.inventory.length]];$('heroStats').innerHTML=entries.map(([k,v])=>`<div class="status"><b>${k}:</b> ${v}</div>`).join('')}
const playerId=crypto.randomUUID?crypto.randomUUID():String(Math.random());let peers={},peerMarkers={},channel='BroadcastChannel' in window?new BroadcastChannel('stranniki-local'):null;
const slots=['Оружие','Обувь','Ноги','Торс','Шлем','Рюкзак'];const rarities=[['Обычное','common'],['Необычное','uncommon'],['Редкое','rare'],['Эпическое','epic'],['Легендарное','legendary']];
const weaponDamage={common:2,uncommon:4,rare:6,epic:9,legendary:13};
function abilityBonus(key){return window.AbilityTree?.getBonuses?.()[key]||0}
function totalAttack(){return (state.attack+(state.equipment['Оружие']?.attackBonus||0))*(1+abilityBonus('attack'))}
function effectiveMaxHp(){return state.maxHp*(1+abilityBonus('health'))}
function effectiveMaxMana(){return state.maxMana*(1+abilityBonus('mana'))}
function effectiveDefense(){return (state.defense||0)*(1+abilityBonus('defense'))}
function rarityRoll(){let tier=0;const quality=1+abilityBonus('rarity');if(Math.random()<Math.min(.95,.5*quality))tier=1;if(tier>=1&&Math.random()<Math.min(.95,.5*quality))tier=2;if(tier>=2&&Math.random()<Math.min(.95,.5*quality))tier=3;if(tier>=3&&Math.random()<Math.min(.95,.4*quality))tier=4;return rarities[tier]}
window.GameAPI={
 getSkillSnapshot(){return{level:state.level,abilityPoints:state.abilityPoints,purchased:[...state.skillNodes]}},
 purchaseSkillNode(node){if(!node||typeof node.id!=='string'||!Number.isInteger(node.cost)||node.cost<1||state.skillNodes.includes(node.id)||state.abilityPoints<node.cost)return false;const hpBefore=effectiveMaxHp(),manaBefore=effectiveMaxMana();state.abilityPoints-=node.cost;state.skillNodes.push(node.id);state.hp=Math.min(effectiveMaxHp(),state.hp+effectiveMaxHp()-hpBefore);state.mana=Math.min(effectiveMaxMana(),state.mana+effectiveMaxMana()-manaBefore);render();return true},
 refresh(){render()}
};
function renderBag(){ $('equipSlots').innerHTML=slots.map(s=>`<div class="slot" data-equip="${s}">${s}<b>${state.equipment[s]?.name||'—'}</b></div>`).join('');$('inventorySlots').innerHTML=Array.from({length:Math.max(24+(state.bagBonus||0),state.inventory.length)},(_,i)=>{const x=state.inventory[i];return `<div class="slot ${x?'rarity-'+x.key:''}" data-item="${i}">${i+1}<b>${x?x.name:'Пусто'}</b></div>`}).join('');$('bagCount').textContent=`Рюкзак · ${24+(state.bagBonus||0)} слотов · ${state.inventory.length} предметов`;document.querySelectorAll('#inventorySlots [data-item]').forEach(el=>el.draggable=!!state.inventory[Number(el.dataset.item)]);scheduleSave()}
function syncPeer(){if(channel&&gpsAllowed&&gpsPositionReady)channel.postMessage({type:'presence',id:playerId,pos,name:'Странник',at:Date.now()})}
function syncOnline(){if(gpsAllowed&&gpsPositionReady&&lastRealGpsPos)window.dispatchEvent(new CustomEvent('game:position',{detail:{lat:lastRealGpsPos[0],lng:lastRealGpsPos[1],name:'Странник'}}))}
if(channel)channel.onmessage=e=>{const m=e.data;if(!m||m.id===playerId)return;if(m.type==='presence'){peers[m.id]=m;if(map.distance(pos,m.pos)<=1000){if(!peerMarkers[m.id])peerMarkers[m.id]=L.marker(m.pos,{icon:L.divIcon({className:'',html:'<div class="marker youmarker">🧝</div>',iconSize:[42,42],iconAnchor:[21,21]})}).addTo(map).bindPopup(m.name);else peerMarkers[m.id].setLatLng(m.pos)}else if(peerMarkers[m.id]){map.removeLayer(peerMarkers[m.id]);delete peerMarkers[m.id]}renderChatPeers()}if(m.type==='chat'&&peers[m.id]&&map.distance(pos,peers[m.id].pos)<=150)addChat(m.name+': '+m.text)};
const onlineMarkers={};
window.addEventListener('firebase:players',event=>{
 const online=event.detail||{},now=Date.now();
 for(const [id,p] of Object.entries(online)){
  if(!p||id===window.firebasePlayerUid||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||!Number.isFinite(p.updatedAt)||now-p.updatedAt>30000)continue;
  const point=[p.lat,p.lng];if(map.distance(pos,point)>1000){if(onlineMarkers[id]){map.removeLayer(onlineMarkers[id]);delete onlineMarkers[id]}continue}
  if(!onlineMarkers[id])onlineMarkers[id]=L.marker(point,{icon:L.divIcon({className:'',html:'<div class="marker youmarker">🧝</div>',iconSize:[42,42],iconAnchor:[21,21]})}).addTo(map).bindPopup('Игрок: '+String(p.name||'Странник').slice(0,24));else onlineMarkers[id].setLatLng(point);
 }
 for(const [id,marker] of Object.entries(onlineMarkers)){if(!online[id]||now-(online[id]?.updatedAt||0)>30000){map.removeLayer(marker);delete onlineMarkers[id]}}
});
function addChat(t){const p=document.createElement('p');p.textContent=t;$('chatlog').append(p);$('chatlog').scrollTop=$('chatlog').scrollHeight}
function renderChatPeers(){const n=Object.values(peers).filter(p=>map.distance(pos,p.pos)<=1000).length;$('chatlog').dataset.near=n;const first=$('chatlog').querySelector('p');if(first&&first.textContent.startsWith('Игроки поблизости'))first.textContent=`Игроков рядом (1000 м): ${n}. Чат доступен в радиусе 150 м.`}
const foes=[
 {name:'Дикий слизень',icon:'🟢',hp:28,atk:6,def:0,xp:25,coins:8},
 {name:'Подворотный гоблин',icon:'👺',hp:42,atk:9,def:2,xp:38,coins:13},
 {name:'Теневой волк',icon:'🐺',hp:55,atk:12,def:3,xp:50,coins:18},
 {name:'Малый голем',icon:'🗿',hp:72,atk:14,def:6,xp:65,coins:24}
];
function log(msg,kind=''){const p=document.createElement('p');p.textContent=msg;if(kind)p.className=kind;$('log').prepend(p);while($('log').children.length>18)$('log').lastChild.remove();scheduleSave()}
function render(){
 $('levelText').textContent=`Уровень ${state.level} · ${['Новичок','Искатель','Следопыт','Ветеран','Герой'][Math.min(state.level-1,4)]}`;
 const need=state.level*100;
 const maxHp=effectiveMaxHp(),maxMana=effectiveMaxMana();
 $('xpText').textContent=`${formatGameNumber(state.xp)} / ${formatGameNumber(need)} опыта`;$('xpBar').style.width=Math.min(100,state.xp/need*100)+'%';
 $('hpText').textContent=`${formatGameNumber(state.hp)} / ${formatGameNumber(maxHp)}`;$('hpBar').style.width=Math.max(0,state.hp/maxHp*100)+'%';
 $('atkText').textContent=formatGameNumber(totalAttack());$('coinText').textContent=formatGameNumber(state.coins);
 $('defText').textContent=formatGameNumber(effectiveDefense());$('hudManaText').textContent=`${formatGameNumber(state.mana)} / ${formatGameNumber(maxMana)}`;
 $('distanceText').textContent=distance<1000?`${formatGameNumber(distance)} м`:`${formatGameNumber(distance/1000)} км`;
 $('manaText')&&($('manaText').textContent=`${formatGameNumber(state.mana)} / ${formatGameNumber(maxMana)}`);
 $('potionBtn').textContent=`🧪 Лечиться (${state.potions})`;$('potionBtn').disabled=state.potions<1||state.hp>=maxHp;
 $('spellBtn').disabled=state.mana<15||!enemy; if(!$('enemyCard').classList.contains('show'))$('enemyCard').classList.remove('show');renderStats();
 scheduleSave();
 window.dispatchEvent(new Event('game:stats-updated'));
}
function updatePos(latlng,source='GPS'){
 const next=[latlng.lat,latlng.lng];
 if(source==='GPS'){
  const accuracy=Number(latlng.accuracy);if(!Number.isFinite(accuracy)||accuracy>100){gpsCandidate=null;gpsCandidateCount=0;$('gpsHead').textContent='Слабый GPS';$('gpsBtn').textContent='🛰 Ждём точный GPS';$('gpsStatus').textContent=`Слабый сигнал GPS (точность ±${Number.isFinite(accuracy)?Math.round(accuracy):'—'} м). Включи точную геопозицию телефона и подожди более точный сигнал.`;return false}
  const now=Date.now();
  if(!gpsFixReady){
   const farFromSaved=!!(lastRealGpsPos&&map.distance(lastRealGpsPos,next)>100000);
   if(farFromSaved&&accuracy>60){gpsCandidate=null;gpsCandidateCount=0;$('gpsHead').textContent='Проверяем GPS';$('gpsStatus').textContent=`Новое место далеко от сохранённого. Жду более точные GPS-измерения (сейчас ±${Math.round(accuracy)} м).`;return false}
   const candidateRadius=farFromSaved?75:150,requiredSamples=farFromSaved?3:2;
   if(gpsCandidate&&map.distance(gpsCandidate,next)<=candidateRadius)gpsCandidateCount++;else{gpsCandidate=next;gpsCandidateCount=1}
   if(gpsCandidateCount<requiredSamples){$('gpsHead').textContent='Проверяем GPS';$('gpsStatus').textContent=farFromSaved?'Новое место далеко от сохранённого. Проверяю ещё несколько совпадающих GPS-измерений…':'Проверяю точность координат; жду ещё одно совпадающее измерение…';return false}
   gpsCandidate=null;gpsCandidateCount=0;
  }else{
   const jump=map.distance(lastGpsPos||pos,next),elapsed=Math.max(1,(now-(lastGpsAt||now))/1000),maxPlausible=Math.max(120,elapsed*50+accuracy+lastGpsAccuracy);
   if(jump>100000||jump>maxPlausible){$('gpsHead').textContent='Проверяем GPS';$('gpsStatus').textContent='GPS сообщил резкий скачок координат. Игнорирую его и жду подтверждённое местоположение.';gpsCandidate=null;gpsCandidateCount=0;return false}
   const movementThreshold=Math.max(15,Math.min(30,accuracy*.8+lastGpsAccuracy*.4));
   if(jump<movementThreshold){gpsCandidate=null;gpsCandidateCount=0;lastGpsAccuracy=accuracy;return true}
   if(gpsCandidate&&map.distance(gpsCandidate,next)<=25)gpsCandidateCount++;else{gpsCandidate=next;gpsCandidateCount=1}
   if(gpsCandidateCount<2){$('gpsHead').textContent='Проверяем GPS';$('gpsStatus').textContent='Проверяю движение телефона по GPS…';return true}
   gpsCandidate=null;gpsCandidateCount=0;
  }
  lastGpsAt=now;lastGpsAccuracy=accuracy;lastRealGpsPos=next;gpsFixReady=true;
 }
 const distanceFrom=source==='GPS'?lastGpsPos:null;if(distanceFrom){const d=map.distance(distanceFrom,next);if(d<100000)distance+=d;}
 if(source==='GPS')lastGpsPos=next;
 lastPos=next;pos=next;gpsPositionReady=true;playerMarker.setLatLng(pos);if(source==='GPS'&&!gpsInitialCentered){map.setView(pos,Math.max(map.getZoom(),16));gpsInitialCentered=true}
 $('coords').textContent=`${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`;
 $('mapState').textContent=source==='GPS'?'GPS активен':'Демо-режим';
 if(source==='GPS'){$('gpsHead').textContent='GPS подключён';$('gpsBtn').textContent='✅ GPS подключён';$('gpsStatus').innerHTML='<strong>Геопозиция получена.</strong> Двигайся по городу, чтобы исследовать карту.';}
 render();
 syncPeer();syncOnline();
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
function placeMonsterMarker(monster){monster.marker=L.marker(monster.pos,{icon:enemyIcon}).addTo(map);monster.marker.bindTooltip(`${monster.icon} ${monster.name}`);monster.marker.on('click',e=>{L.DomEvent.stopPropagation(e);selectEnemy(monster)})}
function restoreMonsters(){if(!Array.isArray(savedGame.monsters))return;for(const m of savedGame.monsters.slice(0,25)){if(!m||!Array.isArray(m.pos)||m.pos.length!==2||!m.pos.every(Number.isFinite))continue;const monster={...m};placeMonsterMarker(monster);monsters.push(monster)}}
function selectEnemy(monster){if(enemy&&enemy!==monster&&turn==='enemy'){log('Дождись завершения хода противника.');return}enemy=monster;enemyMarker=monster.marker;turn='player';$('attackBtn').disabled=false;$('spellBtn').disabled=state.mana<15;$('enemyCard').classList.add('show');$('enemyIcon').textContent=enemy.icon;$('enemyName').textContent=enemy.name;$('enemyHint').textContent='Противник выбран';$('enemyLevel').textContent=enemy.level;$('enemyAttack').textContent=enemy.atk;$('enemyDefense').textContent=enemy.def;$('combatStatus').textContent='Твой ход.';renderEnemy();render()}
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
  if(state.inventory.length<24+(state.bagBonus||0)){state.inventory.push(item);log(`Выпал предмет: ${item.name}${item.attackBonus?` (+${formatGameNumber(item.attackBonus)} к атаке)`:''}!`,'good');renderBag()}
  else log('Предмет выпал, но рюкзак полон.','bad');
 }
 $('combatStatus').textContent=`Победа! Получено ${formatGameNumber(defeated.xp)} опыта и ${formatGameNumber(earnedGold)} монет.`;
 if(defeated.marker)map.removeLayer(defeated.marker);monsters=monsters.filter(m=>m!==defeated);enemy=null;enemyMarker=null;$('enemyCard').classList.remove('show');turn='player';$('attackBtn').disabled=false;$('spellBtn').disabled=false;
 let need=state.level*100;
 while(state.xp>=need){state.xp-=need;state.level++;state.abilityPoints++;state.maxHp+=15;state.hp=effectiveMaxHp();state.attack+=3;state.potions++;log(`Новый уровень ${state.level}! +1 Ability Point, здоровье восстановлено, атака +3.`,'good');need=state.level*100;}
 render()
}
$('attackBtn').addEventListener('click',()=>{
 if(!enemy||turn!=='player'||Date.now()-lastAttack<1000)return;lastAttack=Date.now();turn='enemy';$('attackBtn').disabled=true;$('combatStatus').textContent='Твоя атака. Ход противника через 1 секунду…';
 const dmg= Math.max(1,totalAttack()+Math.floor(Math.random()*7)-3-(enemy.def||0));enemy.hp=Math.max(0,enemy.hp-dmg);
 log(`Ты наносишь ${formatGameNumber(dmg)} урона врагу.`,'good');
 if(enemy.hp<=0){renderEnemy();finishEnemy();return;}setTimeout(()=>{if(!enemy)return;const hit=Math.max(1,enemy.atk+Math.floor(Math.random()*5)-2-effectiveDefense());state.hp=Math.max(0,state.hp-hit);log(`${enemy.name} отвечает и наносит ${formatGameNumber(hit)} урона с учётом защиты.`,'bad');
 if(state.hp<=0){state.hp=Math.max(1,effectiveMaxHp()*.35);state.coins=Math.max(0,state.coins-Math.min(5,state.coins));log('Ты отступил и восстановился у безопасного места. Здоровье частично восстановлено.','bad');}
 renderEnemy();render();$('combatStatus').textContent='Твой ход.';turn='player';$('attackBtn').disabled=false;},1000);
});
$('potionBtn').addEventListener('click',()=>{const maxHp=effectiveMaxHp();if(state.potions<1||state.hp>=maxHp||turn!=='player')return;state.potions--;const heal=Math.min(35,maxHp-state.hp);state.hp+=heal;log(`Зелье восстановило ${formatGameNumber(heal)} HP.`,'good');render()});
$('spellBtn').addEventListener('click',()=>{
 if(!enemy||turn!=='player'||state.mana<15)return;
 turn='enemy';state.mana-=15;
 const spellDamage=24*(1+abilityBonus('attack'));enemy.hp=Math.max(0,enemy.hp-spellDamage);
 log(`Искра наносит ${formatGameNumber(spellDamage)} урона и тратит ${formatGameNumber(15)} маны.`,'good');renderEnemy();render();
 if(enemy.hp<=0){finishEnemy();turn='player';return}
 $('attackBtn').disabled=true;$('spellBtn').disabled=true;$('combatStatus').textContent='Заклинание сработало. Ход противника через 1 секунду…';
 setTimeout(()=>{if(!enemy)return;const hit=Math.max(1,enemy.atk+Math.floor(Math.random()*5)-2-effectiveDefense());state.hp=Math.max(0,state.hp-hit);log(`${enemy.name} отвечает и наносит ${formatGameNumber(hit)} урона с учётом защиты.`,'bad');if(state.hp<=0){state.hp=Math.max(1,effectiveMaxHp()*.35);log('Ты отступил и восстановился у безопасного места.','bad')}turn='player';$('attackBtn').disabled=false;$('spellBtn').disabled=state.mana<15;$('combatStatus').textContent='Твой ход.';render()},1000)
});
$('centerBtn').addEventListener('click',()=>map.setView(pos,17));
$('devModeBtn').addEventListener('click',e=>{devMode=!devMode;e.currentTarget.textContent=`🛠 Режим разработчика: ${devMode?'вкл.':'выкл.'} · ${devMode?'кликни по карте для телепорта':''}`;});
map.on('click',e=>{if(!devMode)return;updatePos(e.latlng,'DEMO');map.setView(e.latlng,17);log('Разработчик переместил персонажа кликом по карте.','good')});
$('chatSend').addEventListener('click',()=>{const text=$('chatInput').value.trim();if(!text)return;addChat('Ты: '+text);if(channel)channel.postMessage({type:'chat',id:playerId,name:'Странник',text,at:Date.now()});$('chatInput').value=''});
$('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('chatSend').click()});
$('inventorySlots').addEventListener('pointerdown',e=>{const slot=e.target.closest('[data-item]');if(!slot||!state.inventory[Number(slot.dataset.item)])return;slot.dataset.dragIndex=slot.dataset.item;slot.classList.add('dragging')});
$('equipSlots').addEventListener('pointerdown',e=>{const slot=e.target.closest('[data-equip]');if(!slot||!state.equipment[slot.dataset.equip])return;slot.dataset.dragEquip=slot.dataset.equip;slot.classList.add('dragging')});
document.addEventListener('pointerup',e=>{const dragged=document.querySelector('.slot.dragging');if(!dragged)return;dragged.classList.remove('dragging');const target=document.elementFromPoint(e.clientX,e.clientY);if(dragged.dataset.dragIndex!==undefined){const equip=target?.closest('[data-equip]'),index=Number(dragged.dataset.dragIndex),item=state.inventory[index];if(!equip||!item||equip.dataset.equip!==item.type)return;const old=state.equipment[item.type];state.equipment[item.type]=item;state.inventory.splice(index,1);if(item.type==='Рюкзак'&&!old)state.bagBonus=(state.bagBonus||0)+8;if(old)state.inventory.push(old);renderBag();log(`Надето: ${item.name}.`,'good')}else if(dragged.dataset.dragEquip){const bag=target?.closest('#inventorySlots'),type=dragged.dataset.dragEquip,item=state.equipment[type];if(!bag||!item||state.inventory.length>=24+(state.bagBonus||0))return;state.inventory.push(item);delete state.equipment[type];if(type==='Рюкзак')state.bagBonus=Math.max(0,(state.bagBonus||0)-8);renderBag();log(`Снято: ${item.name}.`)} });
function gpsErrorText(error){if(error.code===1)return'Доступ к геопозиции запрещён. Разреши его в настройках сайта в браузере и нажми кнопку ещё раз.';if(error.code===2)return'Устройство пока не определило координаты. Включи геолокацию телефона и попробуй ещё раз.';return'Не удалось получить координаты вовремя. Проверь GPS и попробуй ещё раз.'}
function unlockGame(){gpsAllowed=true;document.body.classList.remove('site-locked');$('gpsGate').classList.add('hidden');requestAnimationFrame(()=>map.invalidateSize())}
function requestGpsAccess(fromGate=false,permissionAlreadyGranted=false){
 const gateStatus=$('gpsGateStatus');if(!navigator.geolocation){gateStatus.textContent='Этот браузер не поддерживает геолокацию.';return}
 if(!window.isSecureContext){gateStatus.textContent='Для GPS открой сайт через HTTPS или localhost.';return}
 if(permissionAlreadyGranted){unlockGame();gateStatus.textContent='Доступ к геопозиции разрешён. Получаем координаты…';$('gpsHead').textContent='GPS разрешён…'}
 $('gpsGateBtn').disabled=true;$('gpsGateBtn').textContent='⏳ Определяем местоположение…';gateStatus.textContent='Разреши доступ в запросе браузера и подожди, пока устройство определит координаты.';$('gpsHead').textContent='Запрос GPS…';$('gpsStatus').textContent='Ожидание разрешения и координат…';$('gpsBtn').disabled=true;$('gpsBtn').textContent='⏳ Подключение…';
 navigator.geolocation.getCurrentPosition(p=>{
  gpsAllowed=true;document.body.classList.remove('site-locked');$('gpsGate').classList.add('hidden');$('gpsGateBtn').disabled=false;$('gpsGateBtn').textContent='Разрешить GPS и войти в игру';
  updatePos({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy},'GPS');map.setView(pos,17);map.invalidateSize();$('gpsBtn').disabled=false;if(gpsPositionReady)$('gpsBtn').textContent='✅ GPS подключён';
  if(gpsWatch===null)gpsWatch=navigator.geolocation.watchPosition(q=>updatePos({lat:q.coords.latitude,lng:q.coords.longitude,accuracy:q.coords.accuracy},'GPS'),e=>{if(e.code===1){gpsAllowed=false;document.body.classList.add('site-locked');$('gpsGate').classList.remove('hidden');$('gpsGateStatus').textContent=gpsErrorText(e)}else $('gpsStatus').textContent=gpsErrorText(e);gpsWatch=null;$('gpsHead').textContent='GPS прерван';$('gpsBtn').disabled=false;$('gpsBtn').textContent='🔄 Подключить GPS';$('gpsGateBtn').disabled=false}, {enableHighAccuracy:true,maximumAge:0,timeout:30000});
 },e=>{const showGpsError=()=>{$('gpsHead').textContent='GPS не подключён';$('gpsStatus').textContent=gpsErrorText(e);$('gpsGateStatus').textContent=gpsErrorText(e);$('gpsGateBtn').disabled=false;$('gpsGateBtn').textContent='🔄 Попробовать снова';$('gpsBtn').disabled=false;$('gpsBtn').textContent='🔄 Подключить GPS'};if(e.code===1){gpsAllowed=false;document.body.classList.add('site-locked');$('gpsGate').classList.remove('hidden');showGpsError()}else if(navigator.permissions?.query)navigator.permissions.query({name:'geolocation'}).then(p=>{if(p.state==='granted'){unlockGame();showGpsError()}else showGpsError()}).catch(showGpsError);else showGpsError()}, {enableHighAccuracy:true,timeout:30000,maximumAge:0});
}
$('gpsGateBtn').addEventListener('click',()=>requestGpsAccess(true));
$('gpsBtn').addEventListener('click',()=>requestGpsAccess(false));
$('demoBtn').addEventListener('click',()=>{
 demoCount++;const step=0.00045;const a=demoCount*1.7;
 updatePos({lat:pos[0]+step*Math.cos(a),lng:pos[1]+step*Math.sin(a)},'DEMO');
 map.setView(pos,16);$('gpsHead').textContent='Демо-режим';$('gpsStatus').textContent='Демо-прогулка: персонаж переместился по карте. Нажимай ещё раз, чтобы исследовать район.';
});
setInterval(()=>{for(const [id,p] of Object.entries(peers))if(Date.now()-p.at>10000){delete peers[id];if(peerMarkers[id])map.removeLayer(peerMarkers[id]);delete peerMarkers[id]}syncPeer()},5000);
setInterval(()=>{const maxHp=effectiveMaxHp(),maxMana=effectiveMaxMana();if(state.hp<maxHp&&!enemy)state.hp=Math.min(maxHp,state.hp+maxHp*.0025);if(state.mana<maxMana&&!enemy)state.mana=Math.min(maxMana,state.mana+maxMana*.0075);render()},1000);
setInterval(()=>{if(gpsAllowed&&gpsPositionReady&&!document.hidden&&monsters.length<25)spawnEnemy(false)},10000);
window.addEventListener('resize',()=>requestAnimationFrame(()=>map.invalidateSize()));window.addEventListener('orientationchange',()=>setTimeout(()=>map.invalidateSize(),250));
setupPanels();renderBag();
if(Array.isArray(savedGame.log)){const logBox=$('log');logBox.replaceChildren();savedGame.log.slice(0,18).reverse().forEach(entry=>{const p=document.createElement('p');p.textContent=String(entry.text||'');if(['good','bad'].includes(entry.kind))p.className=entry.kind;logBox.append(p)})}
restoreMonsters();
render();
if(!navigator.geolocation){$('gpsGateStatus').textContent='Этот браузер не поддерживает геолокацию.'}else if(navigator.permissions?.query){navigator.permissions.query({name:'geolocation'}).then(permission=>{if(permission.state==='granted')requestGpsAccess(true,true);else if(permission.state==='denied')$('gpsGateStatus').textContent='Доступ уже запрещён. Разреши геопозицию в настройках сайта браузера, затем нажми кнопку.'}).catch(()=>{$('gpsGateStatus').textContent='Нажми кнопку и разреши браузеру доступ к геопозиции.'})}else $('gpsGateStatus').textContent='Нажми кнопку, чтобы запросить доступ к геопозиции.';
window.addEventListener('pagehide',saveGame);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame()});
})();
