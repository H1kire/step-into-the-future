(() => {
  const branches = [
    { id: 'hero', title: 'I · Статы героя', color: '#7dc8ff', xs: [90, 190, 290, 390], center: 240,
      lanes: [
        { id: 'attack', title: 'Атака', effects: { attack: 0.06 }, detail: '+6% к базовой атаке' },
        { id: 'health', title: 'Здоровье', effects: { health: 0.06 }, detail: '+6% к максимальному здоровью' },
        { id: 'energy', title: 'Энергия', effects: { energy: 0.06 }, detail: '+6% к максимальной энергии' },
        { id: 'defense', title: 'Защита', effects: { defense: 0.06 }, detail: '+6% к защите' }
      ]
    },
    { id: 'loot', title: 'II · Добыча и золото', color: '#ffd166', xs: [570, 670, 770], center: 670,
      lanes: [
        { id: 'drop', title: 'Шанс лута', effects: { drop: 0.04 }, detail: '+4% к базовому шансу выпадения' },
        { id: 'gold', title: 'Золото', effects: { gold: 0.05 }, detail: '+5% к золоту с монстров' },
        { id: 'rarity', title: 'Редкость', effects: { rarity: 0.025 }, detail: '+2.5% к шансам повышения редкости' }
      ]
    },
    { id: 'hybrid', title: 'III · Гибридные статы', color: '#d59aff', xs: [950, 1050, 1150], center: 1050,
      lanes: [
        { id: 'force', title: 'Сила и здоровье', effects: { attack: 0.04, health: 0.04 }, detail: '+4% к атаке и здоровью' },
        { id: 'guard', title: 'Защита и энергия', effects: { defense: 0.04, energy: 0.04 }, detail: '+4% к защите и энергии' },
        { id: 'balance', title: 'Баланс', effects: { attack: 0.03, health: 0.03, defense: 0.03, energy: 0.03 }, detail: '+3% к атаке, здоровью, защите и энергии' }
      ]
    }
  ];
  const rowCount = 25, rowGap = 52, firstY = 150, nodes = [];
  for (const branch of branches) branch.lanes.forEach((lane, laneIndex) => {
    for (let depth = 1; depth <= rowCount; depth++) nodes.push({
      id: `${branch.id}-${lane.id}-${String(depth).padStart(2, '0')}`, branch, lane, laneIndex, depth,
      cost: 1 + Math.floor((depth - 1) / 5), effects: lane.effects, detail: lane.detail,
      x: branch.xs[laneIndex], y: firstY + (depth - 1) * rowGap,
      parentId: depth > 1 ? `${branch.id}-${lane.id}-${String(depth - 1).padStart(2, '0')}` : null
    });
  });
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  function bonuses(purchasedIds) {
    const totals = { attack: 0, health: 0, energy: 0, defense: 0, dexterity: 0, vitality: 0, wisdom: 0, speed: 0, drop: 0, gold: 0, rarity: 0, monsterSpeed: 0 };
    for (const id of purchasedIds) { const node = nodeById.get(id); if (node) for (const [key, value] of Object.entries(node.effects)) totals[key] += value; }
    return totals;
  }

  // 20 x 50 stat improvements and 10 x 50 economy/world improvements = 1,500 nodes.
  const statLanes = [
    ['attack','Атака'],['defense','Защита'],['dexterity','Dexterity'],['vitality','Vitality'],['wisdom','Wisdom'],['speed','Скорость'],
    ['attack','Атака II'],['defense','Защита II'],['dexterity','Dexterity II'],['vitality','Vitality II'],['wisdom','Wisdom II'],['speed','Скорость II'],
    ['attack','Атака III'],['defense','Защита III'],['dexterity','Dexterity III'],['vitality','Vitality III'],['wisdom','Wisdom III'],['speed','Скорость III'],
    ['health','Максимум здоровья'],['energy','Максимум энергии']
  ];
  const utilityLanes = [
    ['drop','Шанс выпадения'],['drop','Шанс выпадения II'],['rarity','Редкость'],['rarity','Редкость II'],
    ['gold','Золото'],['gold','Золото II'],['monsterSpeed','Появление монстров'],['monsterSpeed','Появление монстров II'],
    ['drop','Охотник за добычей'],['rarity','Мастер редкости']
  ];
  const goldLanes = [
    ...statLanes.map(([key,title], index) => ({ id:`stat-${index+1}`, title, key, kind:'stat', color:'#79c7ff' })),
    ...utilityLanes.map(([key,title], index) => ({ id:`utility-${index+1}`, title, key, kind:'utility', color:'#ffd166' }))
  ];
  const statColors={attack:'#b66cff',defense:'#aeb5bf',dexterity:'#ffd43b',vitality:'#ff5d64',wisdom:'#36d6c5',speed:'#55d879',health:'#ff5d64',energy:'#36d6c5'};
  const warmColors=['#ffad42','#ffd166','#f28c28','#ffc04d','#e88924','#ffe08a'];
  for(let i=0;i<goldLanes.length;i++)goldLanes[i].color=goldLanes[i].kind==='stat'?statColors[goldLanes[i].key]:warmColors[(i-goldLanes.length+utilityLanes.length)%warmColors.length];
  const goldNodes = [];
  goldLanes.forEach((lane, laneIndex) => {
    for (let depth=1;depth<=50;depth++) {
      const magnitude = 1 + (depth-1)*.045;
      const base = lane.kind==='stat' ? .0012 : lane.key==='gold' ? .00794935521688 : .001;
      const effect = base*magnitude;
      const maxRank = 5 + ((depth-1)%5)*5;
      const id=`gold-${lane.id}-${String(depth).padStart(2,'0')}`;
      const priceScale=depth<=8?1:depth<=20?1+(depth-8)*.08:1+12*.08+(depth-20)*.14;
      goldNodes.push({id,lane,depth,laneIndex,x:75+laneIndex*108,y:145+(depth-1)*64,maxRank,effect,
        cost:Math.floor((60+depth*depth*1.4)*(1+(depth-1)/12)*priceScale),parentId:depth>1?`gold-${lane.id}-${String(depth-1).padStart(2,'0')}`:null});
    }
  });
  const goldNodeById = new Map(goldNodes.map(node=>[node.id,node]));
  const mainAngles=[0,Math.PI/3,2*Math.PI/3,Math.PI,4*Math.PI/3,5*Math.PI/3],childAngles=[-27,-12,27,12].map(value=>value*Math.PI/180),goldStep=48;
  const getGoldNode=(laneIndex,depth)=>goldNodeById.get(`gold-${goldLanes[laneIndex].id}-${String(depth).padStart(2,'0')}`);
  // One start node fans into six broad spokes. Each spoke then opens four long side paths.
  for(let laneIndex=0;laneIndex<6;laneIndex++){
    const angle=mainAngles[laneIndex],dx=Math.cos(angle),dy=Math.sin(angle);
    for(let depth=1;depth<=50;depth++){const node=getGoldNode(laneIndex,depth);if(laneIndex===0&&depth===1){node.x=0;node.y=0;node.parentId=null;continue}const parent=depth===1?getGoldNode(0,1):getGoldNode(laneIndex,depth-1);node.parentId=parent.id;node.x=parent.x+dx*goldStep;node.y=parent.y+dy*goldStep}
  }
  for(let laneIndex=6;laneIndex<goldLanes.length;laneIndex++){
    const branchIndex=laneIndex-6,trunk=Math.floor(branchIndex/4),side=branchIndex%4,anchorDepth=8+side*8,angle=mainAngles[trunk]+childAngles[side],dx=Math.cos(angle),dy=Math.sin(angle);
    for(let depth=1;depth<=50;depth++){const node=getGoldNode(laneIndex,depth),parent=depth===1?getGoldNode(trunk,anchorDepth):getGoldNode(laneIndex,depth-1);node.parentId=parent.id;node.x=parent.x+dx*goldStep;node.y=parent.y+dy*goldStep}
  }
  window.GoldTree = {
    getBonuses() {
      const purchased=window.GameAPI?.getGoldTreeSnapshot?.().purchased||{};
      const totals={attack:0,defense:0,dexterity:0,vitality:0,wisdom:0,speed:0,health:0,energy:0,drop:0,rarity:0,gold:0,monsterSpeed:0};
      for(const [id,rawRank] of Object.entries(purchased)){const node=goldNodeById.get(id);if(!node)continue;totals[node.lane.key]+=node.effect*Math.min(node.maxRank,Math.max(0,Number(rawRank)||0))}
      return totals;
    }
  };

  const format = value => window.formatGameNumber ? window.formatGameNumber(value) : Number(value).toFixed(3);
  const tools = document.querySelector('.hud-tools');
  if (!tools || !window.GameAPI) return;
  const button=document.createElement('button');button.type='button';button.className='secondary';button.id='abilityTreeOpen';button.textContent='🌿 Древо';tools.append(button);
  const panel=document.createElement('section');panel.id='abilityTreePanel';panel.className='card floating-panel hidden ability-tree-panel';
  panel.innerHTML=`<div class="panel-title ability-tree-title"><h2>Древо улучшений</h2><button type="button" class="secondary panel-close" aria-label="Закрыть">✕</button></div>
    <div class="tree-switch" role="tablist"><button type="button" class="secondary tree-tab active" data-tree="ability">🌿 За Ability Points</button><button type="button" class="secondary tree-tab" data-tree="gold">🪙 За золото</button></div>
    <div class="ability-summary"><span id="abilityPointsReadout"></span><span id="abilityProgressReadout"></span></div>
    <div class="tree-zoom-toolbar" id="treeZoomToolbar" hidden><button type="button" class="secondary" id="treeZoomOut" aria-label="Отдалить">−</button><span id="treeZoomReadout">100%</span><button type="button" class="secondary" id="treeZoomIn" aria-label="Приблизить">+</button><button type="button" class="secondary" id="treeCenter" aria-label="Перейти к центру древа">◎ Центр</button></div>
    <div class="ability-graph-scroll" id="abilityGraphScroll"><svg id="abilityGraph" role="img" aria-label="Древо из 250 улучшений"></svg></div>
    <div class="ability-detail" id="abilityDetail">Выбери доступный узел на графе.</div><button type="button" class="primary full" id="abilityBuy" disabled>Выбери узел</button>`;
  document.body.append(panel);window.registerFloatingPanel?.(panel);
  let tree='ability',selectedId=null;
  const pointsReadout=panel.querySelector('#abilityPointsReadout'),progressReadout=panel.querySelector('#abilityProgressReadout'),detail=panel.querySelector('#abilityDetail'),buyButton=panel.querySelector('#abilityBuy'),graph=panel.querySelector('#abilityGraph');
  const graphScroll=panel.querySelector('#abilityGraphScroll'),zoomToolbar=panel.querySelector('#treeZoomToolbar'),zoomReadout=panel.querySelector('#treeZoomReadout');let goldZoom=1,goldBaseWidth=0,goldBaseHeight=0,goldCameraX=0,goldCameraY=0,goldMinX=0,goldMinY=0,goldCullElements=[];
  const snapshot=()=>window.GameAPI.getSkillSnapshot();
  function status(node,purchased,points){if(purchased.has(node.id))return'purchased';if(node.parentId&&!purchased.has(node.parentId))return'locked';return points>=node.cost?'available':'affordable-later'}
  function renderAbilityGraph(){const current=snapshot(),purchased=new Set(current.purchased);graph.style.width='1240px';pointsReadout.textContent=`Свободно: ${format(current.abilityPoints)} Ability Points`;progressReadout.textContent=`Улучшено: ${purchased.size} / 250`;button.textContent=`🌿 Древо · ${format(current.abilityPoints)}`;graph.setAttribute('viewBox',`0 0 1240 ${firstY+(rowCount-1)*rowGap+52}`);graph.setAttribute('aria-label','Изначальное древо из 250 улучшений');const parts=[];
    for(const branch of branches){parts.push(`<text class="tree-branch-title" x="${branch.center}" y="28" text-anchor="middle" fill="${branch.color}">${branch.title}</text><text class="tree-branch-root" x="${branch.center}" y="75" text-anchor="middle">ВЕТКА</text>`);for(let i=0;i<branch.lanes.length;i++){const lane=branch.lanes[i],x=branch.xs[i];parts.push(`<path class="tree-link" stroke="${branch.color}" d="M ${branch.center} 82 C ${branch.center} 112, ${x} 112, ${x} ${firstY-15}"/><text class="tree-lane-title" x="${x}" y="125" text-anchor="middle">${lane.id==='energy'?window.GameAPI.getResourceName():lane.title}</text>`);}}
    for(const node of nodes){const s=status(node,purchased,current.abilityPoints);if(node.parentId){const parent=nodeById.get(node.parentId);parts.push(`<path class="tree-link ${purchased.has(node.id)?'tree-link-done':''}" stroke="${node.branch.color}" d="M ${parent.x} ${parent.y+14} L ${node.x} ${node.y-14}"/>`)}parts.push(`<g class="tree-node ${s}" data-skill-id="${node.id}" tabindex="0" role="button" aria-label="${node.lane.title}, уровень ${node.depth}, стоимость ${node.cost} Ability Points"><title>${node.lane.title} ${node.depth}: ${node.detail}; стоимость ${node.cost} Ability Points</title><circle cx="${node.x}" cy="${node.y}" r="14" stroke="${node.branch.color}"/><text x="${node.x}" y="${node.y+4}" text-anchor="middle">${node.depth}</text></g>`)}graph.innerHTML=parts.join('')}
  function renderGoldGraph(){const current=window.GameAPI.getGoldTreeSnapshot(),purchased=current.purchased;pointsReadout.textContent=`Золото: ${format(current.coins)}`;progressReadout.textContent=`Улучшено: ${Object.values(purchased).reduce((a,b)=>a+(Number(b)||0),0)} рангов · ${goldNodes.length} узлов`;button.textContent='🪙 Древо за золото';const minX=Math.min(...goldNodes.map(node=>node.x))-180,maxX=Math.max(...goldNodes.map(node=>node.x))+180,minY=Math.min(...goldNodes.map(node=>node.y))-180,maxY=Math.max(...goldNodes.map(node=>node.y))+180,width=maxX-minX,height=maxY-minY;goldBaseWidth=width;goldBaseHeight=height;goldMinX=minX;goldMinY=minY;graph.style.width=`${width}px`;graph.style.height=`${height}px`;graph.style.position='absolute';graph.style.left='0';graph.style.top='0';graph.style.transformOrigin='0 0';graph.setAttribute('viewBox',`${minX} ${minY} ${width} ${height}`);graph.setAttribute('aria-label','Древо за золото из 1 500 улучшений с общей стартовой точкой');const parts=[`<defs><radialGradient id="gold-tree-aura"><stop offset="0" stop-color="#ffd166" stop-opacity=".28"/><stop offset="1" stop-color="#ff9a2f" stop-opacity="0"/></radialGradient></defs><circle cx="0" cy="0" r="150" fill="url(#gold-tree-aura)"/><circle cx="0" cy="0" r="58" fill="none" stroke="#ffd166" stroke-width="2" opacity=".18"/>`];
    const labels=[];for(let laneIndex=0;laneIndex<goldLanes.length;laneIndex++){const node=getGoldNode(laneIndex,1),trunk=laneIndex<6?laneIndex:Math.floor((laneIndex-6)/4),angle=laneIndex<6?mainAngles[laneIndex]:mainAngles[trunk]+childAngles[(laneIndex-6)%4],labelNode=laneIndex<6?getGoldNode(laneIndex,4):getGoldNode(laneIndex,2),degrees=(angle*180/Math.PI+360)%360,rotation=degrees>90&&degrees<270?degrees-180:degrees,side=laneIndex<6?-1:((laneIndex-6)%4===0||(laneIndex-6)%4===1?-1:1),labelX=labelNode.x-Math.sin(angle)*34*side,labelY=labelNode.y+Math.cos(angle)*34*side;labels.push(`<text class="gold-lane-title" data-cull-left="${labelX-180-goldMinX}" data-cull-top="${labelY-36-goldMinY}" data-cull-right="${labelX+180-goldMinX}" data-cull-bottom="${labelY+36-goldMinY}" transform="translate(${labelX} ${labelY}) rotate(${Math.round(rotation)})" fill="${goldLanes[laneIndex].color}" text-anchor="middle">${goldLanes[laneIndex].title}</text>`)}
    for(const node of goldNodes){const rank=Math.max(0,Math.floor(Number(purchased[node.id])||0)),unlocked=!node.parentId||Number(purchased[node.parentId])>0,canBuy=unlocked&&rank<node.maxRank&&current.coins>=node.cost,cls=rank?'purchased':!unlocked?'locked':canBuy?'available':'affordable-later',color=node.lane.color,parent=node.parentId?goldNodeById.get(node.parentId):null,root=node.id==='gold-stat-1-01';if(parent)parts.push(`<path class="tree-link gold-tree-link ${rank?'tree-link-done':''}" data-cull-left="${Math.min(parent.x,node.x)-32-goldMinX}" data-cull-top="${Math.min(parent.y,node.y)-32-goldMinY}" data-cull-right="${Math.max(parent.x,node.x)+32-goldMinX}" data-cull-bottom="${Math.max(parent.y,node.y)+32-goldMinY}" style="--branch-color:${color}" stroke="${color}" d="M ${parent.x} ${parent.y} L ${node.x} ${node.y}"/>`);parts.push(`<g class="tree-node gold-tree-node ${root?'gold-root':''} ${cls}" data-cull-left="${node.x-(root?32:24)-goldMinX}" data-cull-top="${node.y-(root?32:24)-goldMinY}" data-cull-right="${node.x+(root?32:24)-goldMinX}" data-cull-bottom="${node.y+(root?32:24)-goldMinY}" style="--branch-color:${color}" data-gold-id="${node.id}" tabindex="0" role="button" aria-label="${root?'Начало древа · ':''}${node.lane.title}, узел ${node.depth}, ранг ${rank} из ${node.maxRank}, стоимость ${format(node.cost)} золота"><title>${root?'Стартовая нода · ':''}${node.lane.title} · узел ${node.depth} · ранг ${rank}/${node.maxRank} · +${format(node.effect*100)}% за ранг · цена ${format(node.cost)} золотых</title><circle cx="${node.x}" cy="${node.y}" r="${root?24:15.4}" stroke="${color}"/><text x="${node.x}" y="${node.y+4}" text-anchor="middle">${root?'★':rank?rank:'·'}</text></g>`)}parts.push(...labels);graph.innerHTML=parts.join('');goldCullElements=Array.from(graph.querySelectorAll('[data-cull-left]'),el=>({el,left:Number(el.dataset.cullLeft),top:Number(el.dataset.cullTop),right:Number(el.dataset.cullRight),bottom:Number(el.dataset.cullBottom),visible:true}));zoomReadout.textContent=`${Math.round(goldZoom*100)}%`}
  function updateSelected(){const node=tree==='ability'?nodeById.get(selectedId):goldNodeById.get(selectedId);if(!node){detail.textContent=tree==='ability'?'Выбери узел. Ветки статов и гибридных статов усилены; ветка добычи осталась прежней.':'Выбери узел на большом древе. Узлы открываются последовательно, часть можно улучшать до 25 рангов.';buyButton.disabled=true;buyButton.textContent='Выбери узел';return}
    if(tree==='ability'){const current=snapshot(),purchased=new Set(current.purchased),s=status(node,purchased,current.abilityPoints),before=bonuses(current.purchased),after=bonuses([...current.purchased,node.id]),labels={attack:'атака',health:'здоровье',energy:window.GameAPI.getResourceName().toLowerCase(),defense:'защита',drop:'шанс лута',gold:'золото',rarity:'редкость'},totalText=Object.keys(after).filter(key=>after[key]!==before[key]).map(key=>`${labels[key]}: ${format(before[key]*100)}% → ${format(after[key]*100)}%`).join(' · '),laneTitle=node.lane.id==='energy'?window.GameAPI.getResourceName():node.lane.title;detail.innerHTML=`<b>${node.branch.title} · ${laneTitle} ${node.depth}</b><br>${node.detail} за узел.<br>Суммарный бонус после покупки: ${totalText}.<br>Стоимость: ${format(node.cost)} Ability Points.`;buyButton.disabled=s!=='available';buyButton.textContent=s==='purchased'?'Уже улучшено':s==='locked'?'Сначала открой предыдущий узел':s==='affordable-later'?`Нужно ${format(node.cost)} Ability Points`:'Улучшить за Ability Points';return}
    const current=window.GameAPI.getGoldTreeSnapshot(),rank=Math.max(0,Math.floor(Number(current.purchased[node.id])||0)),unlocked=!node.parentId||Number(current.purchased[node.parentId])>0,canBuy=unlocked&&rank<node.maxRank&&current.coins>=node.cost;const percent=format(node.effect*100);detail.innerHTML=`<b>${node.lane.title} · узел ${node.depth}</b><br>Бонус за ранг: +${percent}% · ранг ${rank}/${node.maxRank}. Чем дальше узел по ветке, тем сильнее бонус.<br>Следующий ранг стоит ${format(node.cost)} золота.`;buyButton.disabled=!canBuy;buyButton.textContent=rank>=node.maxRank?'Достигнут максимум':!unlocked?'Сначала открой предыдущий узел':current.coins<node.cost?`Нужно ${format(node.cost)} золота`:`Улучшить за ${format(node.cost)} золота`}
  let goldCameraFrame=0,goldGestureTimer=0;
  function updateGoldCulling(){if(!goldCullElements.length||!goldZoom)return;const padding=90/goldZoom,left=-goldCameraX/goldZoom-padding,top=-goldCameraY/goldZoom-padding,right=(graphScroll.clientWidth-goldCameraX)/goldZoom+padding,bottom=(graphScroll.clientHeight-goldCameraY)/goldZoom+padding;for(const item of goldCullElements){const visible=item.right>=left&&item.left<=right&&item.bottom>=top&&item.top<=bottom;if(visible!==item.visible){item.visible=visible;item.el.style.display=visible?'':'none'}}}
  function applyGoldCamera(){graph.style.transform=`translate3d(${goldCameraX}px,${goldCameraY}px,0) scale(${goldZoom})`;updateGoldCulling();const label=`${Math.round(goldZoom*100)}%`;if(zoomReadout.textContent!==label)zoomReadout.textContent=label}
  function scheduleGoldCamera(){if(goldCameraFrame)return;goldCameraFrame=requestAnimationFrame(()=>{goldCameraFrame=0;applyGoldCamera()})}
  function beginGoldGesture(){clearTimeout(goldGestureTimer);graphScroll.classList.add('gold-tree-gesture')}
  function endGoldGesture(){clearTimeout(goldGestureTimer);goldGestureTimer=setTimeout(()=>graphScroll.classList.remove('gold-tree-gesture'),120)}
  function centerGoldTree(){if(!goldBaseWidth||!goldBaseHeight)return;goldCameraX=(graphScroll.clientWidth-goldBaseWidth*goldZoom)/2;goldCameraY=(graphScroll.clientHeight-goldBaseHeight*goldZoom)/2;applyGoldCamera()}
  function zoomGoldAt(next,focusX,focusY,worldX=(focusX-goldCameraX)/goldZoom,worldY=(focusY-goldCameraY)/goldZoom){goldZoom=Math.max(.35,Math.min(2.5,Math.round(next*100)/100));goldCameraX=focusX-worldX*goldZoom;goldCameraY=focusY-worldY*goldZoom;scheduleGoldCamera()}
  function setGoldZoom(next){zoomGoldAt(next,graphScroll.clientWidth/2,graphScroll.clientHeight/2)}
  function renderGraph(){zoomToolbar.hidden=tree!=='gold';graphScroll.classList.toggle('gold-tree-touch',tree==='gold');if(tree==='ability'){graph.style.transform='';graph.style.position='';graph.style.left='';graph.style.top='';graph.style.height='';graph.style.transformOrigin='';graphScroll.scrollLeft=0;graphScroll.scrollTop=0;renderAbilityGraph()}else{renderGoldGraph();applyGoldCamera()}updateSelected()}
  function selectNode(id){const map=tree==='ability'?nodeById:goldNodeById;if(!map.has(id))return;selectedId=id;panel.querySelectorAll('.tree-node.selected').forEach(el=>el.classList.remove('selected'));panel.querySelector(`[data-${tree==='ability'?'skill':'gold'}-id="${id}"]`)?.classList.add('selected');updateSelected()}
  function openTree(){document.querySelector('#actionMenu')?.classList.add('hidden');document.querySelector('#menuToggle')?.setAttribute('aria-expanded','false');document.querySelectorAll('#logPanel,#bagPanel,#chatPanel,#statsPanel,#abilityTreePanel').forEach(el=>el.classList.add('hidden'));panel.classList.remove('hidden');panel.style.zIndex='4600';renderGraph();if(tree==='gold')requestAnimationFrame(centerGoldTree)}
  button.addEventListener('click',openTree);panel.querySelector('.panel-close').addEventListener('click',()=>panel.classList.add('hidden'));
  panel.querySelectorAll('.tree-tab').forEach(tab=>tab.addEventListener('click',()=>{tree=tab.dataset.tree;selectedId=null;panel.querySelectorAll('.tree-tab').forEach(item=>item.classList.toggle('active',item===tab));renderGraph();if(tree==='gold')requestAnimationFrame(centerGoldTree)}));
  const buttonZoom=delta=>{beginGoldGesture();setGoldZoom(goldZoom+delta);endGoldGesture()};panel.querySelector('#treeZoomIn').addEventListener('click',()=>buttonZoom(.15));panel.querySelector('#treeZoomOut').addEventListener('click',()=>buttonZoom(-.15));panel.querySelector('#treeCenter').addEventListener('click',centerGoldTree);
  graphScroll.addEventListener('wheel',event=>{if(tree!=='gold'||!event.ctrlKey)return;event.preventDefault();beginGoldGesture();endGoldGesture();const rect=graphScroll.getBoundingClientRect();zoomGoldAt(goldZoom+(event.deltaY<0?.1:-.1),event.clientX-rect.left-graphScroll.clientLeft,event.clientY-rect.top-graphScroll.clientTop)},{passive:false});
  const activeTouches=new Map();let touchGesture=null,suppressGraphClickUntil=0;
  const pointerDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),pointerMidpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  function graphPoint(clientX,clientY){const rect=graphScroll.getBoundingClientRect();return{x:clientX-rect.left-graphScroll.clientLeft,y:clientY-rect.top-graphScroll.clientTop}}
  function beginPan(pointerId,point,moved=false){touchGesture={mode:'pan',pointerId,x:point.x,y:point.y,left:goldCameraX,top:goldCameraY,moved}}
  graphScroll.addEventListener('pointerdown',event=>{if(tree!=='gold'||(event.pointerType==='mouse'&&event.button!==0))return;beginGoldGesture();activeTouches.set(event.pointerId,{x:event.clientX,y:event.clientY});const point=graphPoint(event.clientX,event.clientY);if(activeTouches.size===1){beginPan(event.pointerId,point);return}if(activeTouches.size===2){const [a,b]=[...activeTouches.values()],mid=pointerMidpoint(a,b),focus=graphPoint(mid.x,mid.y);touchGesture={mode:'pinch',distance:pointerDistance(a,b),zoom:goldZoom,worldX:(focus.x-goldCameraX)/goldZoom,worldY:(focus.y-goldCameraY)/goldZoom,moved:true}}});
  document.addEventListener('pointermove',event=>{if(!activeTouches.has(event.pointerId)||tree!=='gold')return;activeTouches.set(event.pointerId,{x:event.clientX,y:event.clientY});if(activeTouches.size===1&&touchGesture?.mode==='pan'){const point=graphPoint(event.clientX,event.clientY),dx=point.x-touchGesture.x,dy=point.y-touchGesture.y;if(Math.abs(dx)+Math.abs(dy)>6)touchGesture.moved=true;if(touchGesture.moved){event.preventDefault();goldCameraX=touchGesture.left+dx;goldCameraY=touchGesture.top+dy;scheduleGoldCamera()}return}if(activeTouches.size>=2&&touchGesture?.mode==='pinch'){event.preventDefault();const [a,b]=[...activeTouches.values()],mid=pointerMidpoint(a,b),focus=graphPoint(mid.x,mid.y);zoomGoldAt(touchGesture.zoom*pointerDistance(a,b)/touchGesture.distance,focus.x,focus.y,touchGesture.worldX,touchGesture.worldY)}},{passive:false});
  const finishPointerGesture=event=>{if(!activeTouches.has(event.pointerId))return;if(touchGesture?.moved)suppressGraphClickUntil=Date.now()+350;activeTouches.delete(event.pointerId);if(activeTouches.size===1){const [pointerId,point]=[...activeTouches.entries()][0];beginPan(pointerId,graphPoint(point.x,point.y),true);return}if(activeTouches.size===0){touchGesture=null;endGoldGesture()}};document.addEventListener('pointerup',finishPointerGesture);document.addEventListener('pointercancel',finishPointerGesture);
  graph.addEventListener('click',event=>{if(Date.now()<suppressGraphClickUntil){event.preventDefault();return}const node=event.target.closest('[data-skill-id],[data-gold-id]');if(node)selectNode(node.dataset.skillId||node.dataset.goldId)});
  graph.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-skill-id],[data-gold-id]')){event.preventDefault();selectNode(event.target.dataset.skillId||event.target.dataset.goldId)}});
  buyButton.addEventListener('click',()=>{if(tree==='ability'){const node=nodeById.get(selectedId);if(!node||!window.GameAPI.purchaseSkillNode(node))return}else{const node=goldNodeById.get(selectedId);if(!node||!window.GameAPI.purchaseGoldTreeNode(node))return}renderGraph();selectNode(selectedId)});
  window.addEventListener('game:stats-updated',()=>{if(panel.classList.contains('hidden'))return;if(tree==='ability')renderGraph();else{const current=window.GameAPI.getGoldTreeSnapshot();pointsReadout.textContent=`Золото: ${format(current.coins)}`;updateSelected()}});renderGraph();window.GameAPI.refresh();
})();
