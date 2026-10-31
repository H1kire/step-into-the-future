import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase, ref, get, set, update, push, onValue, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app), db = getDatabase(app);
const $ = id => document.getElementById(id);
let uid = '', profile = null, friends = {}, activeDm = '', group = null, unsubscribers = [], groupRoster = [], onlinePlayers = {};
const clean = value => String(value || '').trim().slice(0, 40);
const safe = value => String(value || '').replace(/[.#$\[\]/]/g, '').slice(0, 80);
const panelBase = (id,title) => {
  const el=document.createElement('section'); el.id=id; el.className='card floating-panel hidden social-panel';
  el.innerHTML='<div class="panel-title"><h2>'+title+'</h2><button type="button" class="secondary panel-close" aria-label="Закрыть">✕</button></div><div class="social-content"></div>';
  document.body.append(el); el.querySelector('.panel-close').onclick=()=>el.classList.add('hidden'); window.registerFloatingPanel?.(el); return el.querySelector('.social-content');
};
function createUI(){
  const menu=$('actionMenu'); if(!menu || $('socialMenuButtons')) return;
  const tools=menu.querySelector('.hud-tools'); if(!tools)return;
  const nav=document.createElement('div');nav.id='socialMenuButtons';nav.className='social-menu-buttons';
  nav.innerHTML='<button type="button" class="secondary" data-social-open="friendsPanel">👥 Друзья</button><button type="button" class="secondary" data-social-open="groupPanel">🛡 Группа</button><button type="button" class="secondary" data-social-open="mailPanel">✉️ Почта <span id="mailUnread"></span></button>';
  tools.append(nav);
  const friendsContent=panelBase('friendsPanel','Друзья');
  friendsContent.innerHTML='<div class="social-tabs"><button class="secondary active" id="friendAddTab">Добавить</button><button class="secondary" id="friendListTab">Мои друзья</button></div><div id="friendAddView"><label>Никнейм игрока<input id="friendNickname" maxlength="20" placeholder="Введите никнейм"></label><button class="primary full" id="friendAddBtn">Добавить в друзья</button><p class="social-feedback" id="friendFeedback" aria-live="polite"></p></div><div id="friendListView" hidden><div id="friendsList">Загрузка…</div></div>';
  const groupContent=panelBase('groupPanel','Группа');
  groupContent.innerHTML='<div id="groupHome"><button class="primary full" id="createGroupBtn">Создать группу</button><div class="social-separator">или</div><label>Код группы<input id="groupCodeInput" maxlength="9" placeholder="9 символов"></label><button class="primary full" id="joinGroupBtn" disabled>Присоединиться</button><p class="social-feedback" id="groupFeedback" aria-live="polite"></p></div><div id="groupDetails" hidden></div>';
  const mailContent=panelBase('mailPanel','Почта');
  mailContent.innerHTML='<div id="mailList" class="mail-list">Загрузка…</div><div class="mail-actions"><button class="secondary" id="mailRefresh">Обновить</button><button class="secondary" id="mailReadAll">Пометить всё как прочитанное</button><button class="danger" id="mailDeleteAll">Удалить всё</button></div>';
  const dmContent=panelBase('dmPanel','Личные сообщения');
  dmContent.innerHTML='<div id="dmMessages" class="dm-messages"></div><div class="chatrow"><input id="dmInput" maxlength="500" placeholder="Сообщение…"><button class="primary" id="dmSend">➤</button></div>';
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-social-open]');if(!b)return;
    document.querySelectorAll('.social-panel').forEach(p=>p.classList.add('hidden'));
    $('actionMenu')?.classList.add('hidden');$('menuToggle')?.setAttribute('aria-expanded','false');
    const p=$(b.dataset.socialOpen);p?.classList.remove('hidden');p.style.zIndex='4800';
    if(b.dataset.socialOpen==='friendsPanel')renderFriends();
    if(b.dataset.socialOpen==='groupPanel')renderGroup();
    if(b.dataset.socialOpen==='mailPanel')renderMail();
  });
  $('friendAddTab').onclick=()=>{ $('friendAddView').hidden=false;$('friendListView').hidden=true;$('friendAddTab').classList.add('active');$('friendListTab').classList.remove('active') };
  $('friendListTab').onclick=()=>{ $('friendAddView').hidden=true;$('friendListView').hidden=false;$('friendAddTab').classList.remove('active');$('friendListTab').classList.add('active');renderFriends() };
  $('friendAddBtn').onclick=addFriend;
  $('createGroupBtn').onclick=createGroup;
  $('groupCodeInput').addEventListener('input',()=>{const v=$('groupCodeInput').value.trim();$('joinGroupBtn').disabled=!/^[A-Za-z0-9]{9}$/.test(v)});
  $('joinGroupBtn').onclick=joinGroup;
  $('mailRefresh').onclick=renderMail;
  $('mailReadAll').onclick=()=>mailAction('read');
  $('mailDeleteAll').onclick=()=>mailAction('delete');
  $('dmSend').onclick=sendDm;
  $('dmInput').addEventListener('keydown',e=>{if(e.key==='Enter')sendDm()});
}
function message(id,text){const el=$(id);if(el)el.textContent=text}
function openDm(friendUid,nickname){activeDm=friendUid;const p=$('dmPanel');p.classList.remove('hidden');p.style.zIndex='4900';p.querySelector('h2').textContent='Чат: '+nickname;watchDm()}
async function addFriend(){
  if(!uid){message('friendFeedback','Войди через Google, чтобы пользоваться друзьями.');return}
  const nickname=clean($('friendNickname').value);if(!/^[\p{L}\p{N}_-]{2,20}$/u.test(nickname)){message('friendFeedback','Никнейм: 2–20 букв, цифр, _ или -.');return}
  try{
    const snap=await get(ref(db,'profiles'));let targetUid='',target=null;
    snap.forEach(child=>{if(String(child.val()?.nickname||'').toLocaleLowerCase()===nickname.toLocaleLowerCase()){targetUid=child.key;target=child.val()}});
    if(!targetUid){message('friendFeedback','Игрок с таким никнеймом не найден.');return}
    if(targetUid===uid){message('friendFeedback','Нельзя добавить самого себя.');return}
    await set(ref(db,'friends/'+uid+'/'+targetUid),{uid:targetUid,addedAt:Date.now()});
    message('friendFeedback','Игрок '+target.nickname+' добавлен в друзья!');
    $('friendNickname').value='';renderFriends();
  }catch(error){message('friendFeedback','Не удалось добавить: '+(error.code||error.message)+' · проверь Firebase Rules.')}
}
async function getProfile(id){const [s,p]=await Promise.all([get(ref(db,'profiles/'+id)),get(ref(db,'publicProfiles/'+id))]);return {...(s.val()||{}),...(p.val()||{})}}
async function renderFriends(){
  const box=$('friendsList');if(!box||!uid)return;
  try{
    const snap=await get(ref(db,'friends/'+uid));friends=snap.val()||{};box.replaceChildren();
    const entries=Object.keys(friends);if(!entries.length){box.textContent='Список друзей пока пуст.';return}
    const onlineSnap=await get(ref(db,'players'));
    for(const friendUid of entries){
      const p=await getProfile(friendUid),presence=onlineSnap.child(friendUid).exists(),row=document.createElement('article');row.className='friend-row';
      const title=document.createElement('div');title.className='friend-main';
      const n=document.createElement('b');n.textContent=p.nickname||'Игрок';
      const meta=document.createElement('span');meta.textContent=(presence?'🟢 Онлайн':'⚫ Не в сети')+' · '+classLabel(p.classId)+' · Ур. '+(p.level||1);
      title.append(n,meta);
      const actions=document.createElement('div');actions.className='friend-actions';
      const invite=document.createElement('button');invite.className='secondary';invite.textContent='Добавить в группу';invite.onclick=()=>inviteToGroup(friendUid,p.nickname||'Игрок');
      const dm=document.createElement('button');dm.className='primary';dm.textContent='Личные сообщения';dm.onclick=()=>openDm(friendUid,p.nickname||'Игрок');
      actions.append(invite,dm);row.append(title,actions);box.append(row);
    }
  }catch(error){box.textContent='Не удалось загрузить друзей: '+(error.code||error.message)}
}
function classLabel(id){return({warrior:'Воин',archer:'Стрелок',mage:'Маг',adventurer:'Авантюрист'})[id]||'Не выбран'}
function randomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let out='';for(let i=0;i<9;i++)out+=chars[Math.floor(Math.random()*chars.length)];return out}
async function createGroup(){
  if(!uid){message('groupFeedback','Войди через Google.');return}
  try{
    const old=await get(ref(db,'groupMembers/'+uid));if(old.exists()){message('groupFeedback','Ты уже состоишь в группе.');return}
    const code=randomCode(),groupId=code;
    const data={code,leaderUid:uid,leaderName:profile?.nickname||'Игрок',createdAt:Date.now(),members:{[uid]:{uid,nickname:profile?.nickname||'Игрок',classId:profile?.classId||'',level:profile?.level||1,joinedAt:Date.now()}}};
    await set(ref(db,'groups/'+groupId),data);await set(ref(db,'groupMembers/'+uid),groupId);
    window.dispatchEvent(new Event('game:group-changed'));group={...data,id:groupId};renderGroup();
  }catch(error){message('groupFeedback','Не удалось создать группу: '+(error.code||error.message))}
}
async function renderGroup(){
  if(!uid)return;
  const current=await get(ref(db,'groupMembers/'+uid));const code=current.val();
  $('groupHome').hidden=!!code;$('groupDetails').hidden=!code;
  if(!code)return;
  const snap=await get(ref(db,'groups/'+code));group=snap.val();
  if(!group){$('groupDetails').textContent='Группа больше не существует.';return}
  const members=Object.values(group.members||{}).sort((a,b)=>a.joinedAt-b.joinedAt);
  const head=document.createElement('div');head.className='group-heading';head.innerHTML='<b>Группа ('+escapeHtml(group.leaderName)+')</b>';
  const codeRow=document.createElement('div');codeRow.className='group-code';const codeText=document.createElement('code');codeText.textContent=code;const copy=document.createElement('button');copy.className='secondary tiny-copy';copy.textContent='⧉';copy.title='Копировать код';copy.onclick=()=>navigator.clipboard?.writeText(code);codeRow.append('Код группы: ',codeText,copy);
  const list=document.createElement('div');list.className='group-slots';
  for(let i=0;i<5;i++){const m=members[i],slot=document.createElement('div');slot.className='group-slot';slot.textContent=m?(i+1+'. '+m.nickname+' · '+classLabel(m.classId)+' · ур. '+m.level):(i+1+'. Свободное место');list.append(slot)}
  const settings=document.createElement('div');settings.className='group-settings';settings.hidden=group.leaderUid!==uid;settings.innerHTML='<label><input type="checkbox" id="groupBattleToggle" checked> Групповое сражение</label><label><input type="checkbox" id="groupMapToggle"> Показывать игроков на карте</label>';
  const leave=document.createElement('button');leave.className='danger full';leave.textContent='Покинуть группу';leave.onclick=leaveGroup;
  $('groupDetails').replaceChildren(head,codeRow,list,settings,leave);
  const battleToggle=$('groupBattleToggle');battleToggle.checked=group.groupBattleEnabled!==false;battleToggle.onchange=()=>{if(group.leaderUid===uid)update(ref(db,'groups/'+code),{groupBattleEnabled:battleToggle.checked});else battleToggle.checked=group.groupBattleEnabled!==false};const mapToggle=$('groupMapToggle');mapToggle.checked=group.showPlayersOnMap===true;mapToggle.onchange=()=>{if(group.leaderUid===uid){group.showPlayersOnMap=mapToggle.checked;publishGroupMapState();update(ref(db,'groups/'+code),{showPlayersOnMap:mapToggle.checked}).catch(error=>{mapToggle.checked=!mapToggle.checked;group.showPlayersOnMap=mapToggle.checked;publishGroupMapState();message('groupFeedback','Не удалось сохранить настройку: '+(error.code||error.message))})}else mapToggle.checked=group.showPlayersOnMap===true};publishGroupMapState();
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function joinGroup(){
  if(!uid)return;const code=$('groupCodeInput').value.trim().toUpperCase();
  try{const gref=ref(db,'groups/'+code);const result=await runTransaction(gref,g=>{if(!g||!g.members||Object.keys(g.members).length>=5||g.members[uid])return;g.members[uid]={uid,nickname:profile?.nickname||'Игрок',classId:profile?.classId||'',level:profile?.level||1,joinedAt:Date.now()};return g});
    if(!result.committed){message('groupFeedback','Такой группы не существует (код недействителен) или она заполнена.');return}
    await set(ref(db,'groupMembers/'+uid),code);window.dispatchEvent(new Event('game:group-changed'));$('groupCodeInput').value='';renderGroup();
  }catch(error){message('groupFeedback','Не удалось вступить: '+(error.code||error.message))}
}
async function inviteToGroup(friendUid,nickname){
  if(!uid){return}
  try{const s=await get(ref(db,'groupMembers/'+uid)),code=s.val();if(!code){alert('Сначала создай группу или вступи в неё.');return} const currentGroup=await get(ref(db,'groups/'+code));if(currentGroup.val()?.leaderUid!==uid){alert('Приглашать игроков может только создатель группы.');return}
    await set(push(ref(db,'mail/'+friendUid)),{type:'group-invite',fromUid:uid,fromName:profile?.nickname||'Игрок',groupCode:code,text:'Приглашение в группу от '+(profile?.nickname||'Игрок'),createdAt:Date.now(),read:false});
    alert('Приглашение отправлено игроку '+nickname+' на почту.');
  }catch(error){alert('Не удалось отправить приглашение: '+(error.code||error.message))}
}
async function leaveGroup(){
  const code=group?.code;if(!code)return;
  try{await update(ref(db,'groups/'+code+'/members'),{[uid]:null});await set(ref(db,'groupMembers/'+uid),null);window.dispatchEvent(new Event('game:group-changed'));
    const s=await get(ref(db,'groups/'+code+'/members'));if(!s.exists())await set(ref(db,'groups/'+code),null);
    else if(group.leaderUid===uid){const next=Object.keys(s.val())[0];await update(ref(db,'groups/'+code),{leaderUid:next,leaderName:s.val()[next].nickname})}
    renderGroup();
  }catch(error){message('groupFeedback','Ошибка выхода: '+(error.code||error.message))}
}
async function renderMail(){
  const box=$('mailList');if(!box||!uid)return;
  try{const s=await get(ref(db,'mail/'+uid));box.replaceChildren();const items=Object.entries(s.val()||{}).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
    $('mailUnread').textContent=items.filter(([,m])=>!m.read).length||'';
    if(!items.length){box.textContent='Почта пуста.';return}
    for(const [id,m] of items){const row=document.createElement('article');row.className='mail-row';const text=document.createElement('div');text.textContent=(m.read?'':'● ')+(m.text||'Сообщение');row.append(text);
      if(m.type==='group-invite'){const join=document.createElement('button');join.className='primary';join.textContent='Принять приглашение';join.onclick=async()=>{ $('groupCodeInput').value=m.groupCode;$('groupCodeInput').dispatchEvent(new Event('input'));await joinGroup();await set(ref(db,'mail/'+uid+'/'+id+'/read'),true)};row.append(join)}
      const date=document.createElement('small');date.textContent=new Date(m.createdAt||Date.now()).toLocaleString('ru-RU');row.append(date);box.append(row);
    }
  }catch(error){box.textContent='Почта недоступна: '+(error.code||error.message)}
}
async function mailAction(action){if(!uid)return;const s=await get(ref(db,'mail/'+uid));const updates={};s.forEach(child=>updates[child.key]=action==='read'?{...child.val(),read:true}:null);await update(ref(db,'mail/'+uid),updates);renderMail()}
async function watchDm(){
  if(!uid||!activeDm)return;const s=await get(ref(db,'directMessages/'+uid+'/'+activeDm));const box=$('dmMessages');box.replaceChildren();
  s.forEach(child=>appendDm(child.val()));
  if(unsubscribers.dm)unsubscribers.dm();unsubscribers.dm=onValue(ref(db,'directMessages/'+uid+'/'+activeDm),snap=>{box.replaceChildren();snap.forEach(child=>appendDm(child.val()))});
}
function appendDm(m){const p=document.createElement('p');p.className=m.fromUid===uid?'mine':'';p.textContent=(m.fromName||'Игрок')+': '+m.text+' · '+new Date(m.createdAt||Date.now()).toLocaleString('ru-RU');$('dmMessages')?.append(p)}
async function sendDm(){const input=$('dmInput'),text=clean(input.value);if(!uid||!activeDm||!text)return;try{const item={fromUid:uid,fromName:profile?.nickname||'Игрок',text,createdAt:Date.now()};await Promise.all([set(push(ref(db,'directMessages/'+uid+'/'+activeDm)),item),set(push(ref(db,'directMessages/'+activeDm+'/'+uid)),item)]);input.value=''}catch(error){alert('Не удалось отправить сообщение: '+(error.code||error.message))}}
function publishGroupMapState(){const enabled=!!(group&&group.leaderUid&&group.showPlayersOnMap===true);const members=Object.values(group?.members||{}).filter(m=>m.uid&&m.uid!==uid).map(m=>({uid:m.uid,nickname:m.nickname||'Игрок',classId:m.classId||'adventurer'}));window.dispatchEvent(new CustomEvent('game:group-map-state',{detail:{enabled,members}}))}
let unsubscribeGroup=null,publicProfileTimer=null;function watchSocial(){for(const stop of unsubscribers)if(typeof stop==='function')stop();unsubscribers=[];if(unsubscribeGroup){unsubscribeGroup();unsubscribeGroup=null}unsubscribers.push(onValue(ref(db,'friends/'+uid),s=>{friends=s.val()||{};renderFriends()}));unsubscribers.push(onValue(ref(db,'mail/'+uid),()=>renderMail()));unsubscribers.push(onValue(ref(db,'groupMembers/'+uid),s=>{const code=s.val();if(unsubscribeGroup){unsubscribeGroup();unsubscribeGroup=null}if(!code){group=null;publishGroupMapState();renderGroup();return}unsubscribeGroup=onValue(ref(db,'groups/'+code),g=>{group=g.val();publishGroupMapState();renderGroup()})}));unsubscribers.push(onValue(ref(db,'players'),s=>{onlinePlayers=s.val()||{};publishGroupMapState();window.dispatchEvent(new CustomEvent('game:group-online-players',{detail:onlinePlayers}))}))}
onAuthStateChanged(auth,async user=>{
  uid=user&&!user.isAnonymous?user.uid:'';
  if(!uid){profile=null;if(publicProfileTimer){clearInterval(publicProfileTimer);publicProfileTimer=null}for(const stop of unsubscribers)if(typeof stop==='function')stop();unsubscribers=[];if(unsubscribeGroup){unsubscribeGroup();unsubscribeGroup=null}group=null;publishGroupMapState();return}
  try{const p=await get(ref(db,'profiles/'+uid));profile=p.val()||{};watchSocial();publishPublicProfile();if(publicProfileTimer)clearInterval(publicProfileTimer);publicProfileTimer=setInterval(publishPublicProfile,30000)}catch(error){console.error('Social profile error',error)}
});
function publishPublicProfile(){if(!uid)return;try{const save=JSON.parse(localStorage.getItem('gorodskie-stranniki-save-v1')||'null'),state=save?.state||{};set(ref(db,'publicProfiles/'+uid),{nickname:profile?.nickname||'Игрок',classId:state.ascensionClass||'adventurer',level:Math.max(1,Number(state.level)||1),updatedAt:Date.now()}).catch(error=>console.warn('Public profile update failed',error))}catch{}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(createUI,0));else setTimeout(createUI,0);
