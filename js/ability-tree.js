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
  const goldNodes = [];
  goldLanes.forEach((lane, laneIndex) => {
    for (let depth=1;depth<=50;depth++) {
      const magnitude = 1 + (depth-1)*.045;
      const base = lane.kind==='stat' ? .0012 : lane.key==='gold' ? .0016 : .001;
      const effect = base*magnitude;
      const maxRank = 5 + ((depth-1)%5)*5;
      const id=`gold-${lane.id}-${String(depth).padStart(2,'0')}`;
      goldNodes.push({id,lane,depth,laneIndex,x:75+laneIndex*108,y:145+(depth-1)*64,maxRank,effect,
        cost:Math.floor((60+depth*depth*1.4)*(1+(depth-1)/12)),parentId:depth>1?`gold-${lane.id}-${String(depth-1).padStart(2,'0')}`:null});
    }
  });
  const goldNodeById = new Map(goldNodes.map(node=>[node.id,node]));
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
    <div class="ability-graph-scroll" id="abilityGraphScroll"><svg id="abilityGraph" role="img" aria-label="Древо из 250 улучшений"></svg></div>
    <div class="ability-detail" id="abilityDetail">Выбери доступный узел на графе.</div><button type="button" class="primary full" id="abilityBuy" disabled>Выбери узел</button>`;
  document.body.append(panel);window.registerFloatingPanel?.(panel);
  let tree='ability',selectedId=null;
  const pointsReadout=panel.querySelector('#abilityPointsReadout'),progressReadout=panel.querySelector('#abilityProgressReadout'),detail=panel.querySelector('#abilityDetail'),buyButton=panel.querySelector('#abilityBuy'),graph=panel.querySelector('#abilityGraph');
  const snapshot=()=>window.GameAPI.getSkillSnapshot();
  function status(node,purchased,points){if(purchased.has(node.id))return'purchased';if(node.parentId&&!purchased.has(node.parentId))return'locked';return points>=node.cost?'available':'affordable-later'}
  function renderAbilityGraph(){const current=snapshot(),purchased=new Set(current.purchased);graph.style.width='1240px';pointsReadout.textContent=`Свободно: ${format(current.abilityPoints)} Ability Points`;progressReadout.textContent=`Улучшено: ${purchased.size} / 250`;button.textContent=`🌿 Древо · ${format(current.abilityPoints)}`;graph.setAttribute('viewBox',`0 0 1240 ${firstY+(rowCount-1)*rowGap+52}`);graph.setAttribute('aria-label','Изначальное древо из 250 улучшений');const parts=[];
    for(const branch of branches){parts.push(`<text class="tree-branch-title" x="${branch.center}" y="28" text-anchor="middle" fill="${branch.color}">${branch.title}</text><text class="tree-branch-root" x="${branch.center}" y="75" text-anchor="middle">ВЕТКА</text>`);for(let i=0;i<branch.lanes.length;i++){const lane=branch.lanes[i],x=branch.xs[i];parts.push(`<path class="tree-link" stroke="${branch.color}" d="M ${branch.center} 82 C ${branch.center} 112, ${x} 112, ${x} ${firstY-15}"/><text class="tree-lane-title" x="${x}" y="125" text-anchor="middle">${lane.id==='energy'?window.GameAPI.getResourceName():lane.title}</text>`);}}
    for(const node of nodes){const s=status(node,purchased,current.abilityPoints);if(node.parentId){const parent=nodeById.get(node.parentId);parts.push(`<path class="tree-link ${purchased.has(node.id)?'tree-link-done':''}" stroke="${node.branch.color}" d="M ${parent.x} ${parent.y+14} L ${node.x} ${node.y-14}"/>`)}parts.push(`<g class="tree-node ${s}" data-skill-id="${node.id}" tabindex="0" role="button" aria-label="${node.lane.title}, уровень ${node.depth}, стоимость ${node.cost} Ability Points"><title>${node.lane.title} ${node.depth}: ${node.detail}; стоимость ${node.cost} Ability Points</title><circle cx="${node.x}" cy="${node.y}" r="14" stroke="${node.branch.color}"/><text x="${node.x}" y="${node.y+4}" text-anchor="middle">${node.depth}</text></g>`)}graph.innerHTML=parts.join('')}
  function renderGoldGraph(){const current=window.GameAPI.getGoldTreeSnapshot(),purchased=current.purchased;pointsReadout.textContent=`Золото: ${format(current.coins)}`;progressReadout.textContent=`Улучшено: ${Object.values(purchased).reduce((a,b)=>a+(Number(b)||0),0)} рангов · ${goldNodes.length} узлов`;button.textContent='🪙 Древо за золото';const width=75+(goldLanes.length-1)*108+75,height=145+49*64+65;graph.style.width=`${width}px`;graph.setAttribute('viewBox',`0 0 ${width} ${height}`);graph.setAttribute('aria-label','Древо за золото из 1 500 улучшений');const parts=[];
    for(const lane of goldLanes){const x=75+goldLanes.indexOf(lane)*108;parts.push(`<text class="gold-lane-title" transform="translate(${x} 128) rotate(-48)" text-anchor="start">${lane.title}</text>`)}
    for(const node of goldNodes){const rank=Math.max(0,Math.floor(Number(purchased[node.id])||0)),unlocked=!node.parentId||Number(purchased[node.parentId])>0,canBuy=unlocked&&rank<node.maxRank&&current.coins>=node.cost;const cls=rank?'purchased':!unlocked?'locked':canBuy?'available':'affordable-later';if(node.parentId){const parent=goldNodeById.get(node.parentId);parts.push(`<path class="tree-link ${rank?'tree-link-done':''}" d="M ${parent.x} ${parent.y+11} L ${node.x} ${node.y-11}"/>`)}parts.push(`<g class="tree-node ${cls}" data-gold-id="${node.id}" tabindex="0" role="button" aria-label="${node.lane.title}, узел ${node.depth}, ранг ${rank} из ${node.maxRank}, стоимость ${format(node.cost)} золота"><title>${node.lane.title} · узел ${node.depth} · ранг ${rank}/${node.maxRank} · +${format(node.effect*100)}% за ранг · цена ${format(node.cost)} золотых</title><circle cx="${node.x}" cy="${node.y}" r="11" stroke="${node.lane.color}"/><text x="${node.x}" y="${node.y+3}" text-anchor="middle">${rank?rank:'·'}</text></g>`)}graph.innerHTML=parts.join('')}
  function updateSelected(){const node=tree==='ability'?nodeById.get(selectedId):goldNodeById.get(selectedId);if(!node){detail.textContent=tree==='ability'?'Выбери узел. Ветки статов и гибридных статов усилены; ветка добычи осталась прежней.':'Выбери узел на большом древе. Узлы открываются последовательно, часть можно улучшать до 25 рангов.';buyButton.disabled=true;buyButton.textContent='Выбери узел';return}
    if(tree==='ability'){const current=snapshot(),purchased=new Set(current.purchased),s=status(node,purchased,current.abilityPoints),before=bonuses(current.purchased),after=bonuses([...current.purchased,node.id]),labels={attack:'атака',health:'здоровье',energy:window.GameAPI.getResourceName().toLowerCase(),defense:'защита',drop:'шанс лута',gold:'золото',rarity:'редкость'},totalText=Object.keys(after).filter(key=>after[key]!==before[key]).map(key=>`${labels[key]}: ${format(before[key]*100)}% → ${format(after[key]*100)}%`).join(' · '),laneTitle=node.lane.id==='energy'?window.GameAPI.getResourceName():node.lane.title;detail.innerHTML=`<b>${node.branch.title} · ${laneTitle} ${node.depth}</b><br>${node.detail} за узел.<br>Суммарный бонус после покупки: ${totalText}.<br>Стоимость: ${format(node.cost)} Ability Points.`;buyButton.disabled=s!=='available';buyButton.textContent=s==='purchased'?'Уже улучшено':s==='locked'?'Сначала открой предыдущий узел':s==='affordable-later'?`Нужно ${format(node.cost)} Ability Points`:'Улучшить за Ability Points';return}
    const current=window.GameAPI.getGoldTreeSnapshot(),rank=Math.max(0,Math.floor(Number(current.purchased[node.id])||0)),unlocked=!node.parentId||Number(current.purchased[node.parentId])>0,canBuy=unlocked&&rank<node.maxRank&&current.coins>=node.cost;const percent=format(node.effect*100);detail.innerHTML=`<b>${node.lane.title} · узел ${node.depth}</b><br>Бонус за ранг: +${percent}% · ранг ${rank}/${node.maxRank}. Чем дальше узел по ветке, тем сильнее бонус.<br>Следующий ранг стоит ${format(node.cost)} золота.`;buyButton.disabled=!canBuy;buyButton.textContent=rank>=node.maxRank?'Достигнут максимум':!unlocked?'Сначала открой предыдущий узел':current.coins<node.cost?`Нужно ${format(node.cost)} золота`:`Улучшить за ${format(node.cost)} золота`}
  function renderGraph(){if(tree==='ability')renderAbilityGraph();else renderGoldGraph();updateSelected()}
  function selectNode(id){const map=tree==='ability'?nodeById:goldNodeById;if(!map.has(id))return;selectedId=id;panel.querySelectorAll('.tree-node.selected').forEach(el=>el.classList.remove('selected'));panel.querySelector(`[data-${tree==='ability'?'skill':'gold'}-id="${id}"]`)?.classList.add('selected');updateSelected()}
  function openTree(){document.querySelector('#actionMenu')?.classList.add('hidden');document.querySelector('#menuToggle')?.setAttribute('aria-expanded','false');document.querySelectorAll('#logPanel,#bagPanel,#chatPanel,#statsPanel,#abilityTreePanel').forEach(el=>el.classList.add('hidden'));panel.classList.remove('hidden');panel.style.zIndex='4600';renderGraph()}
  button.addEventListener('click',openTree);panel.querySelector('.panel-close').addEventListener('click',()=>panel.classList.add('hidden'));
  panel.querySelectorAll('.tree-tab').forEach(tab=>tab.addEventListener('click',()=>{tree=tab.dataset.tree;selectedId=null;panel.querySelectorAll('.tree-tab').forEach(item=>item.classList.toggle('active',item===tab));renderGraph()}));
  graph.addEventListener('click',event=>{const node=event.target.closest('[data-skill-id],[data-gold-id]');if(node)selectNode(node.dataset.skillId||node.dataset.goldId)});
  graph.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-skill-id],[data-gold-id]')){event.preventDefault();selectNode(event.target.dataset.skillId||event.target.dataset.goldId)}});
  buyButton.addEventListener('click',()=>{if(tree==='ability'){const node=nodeById.get(selectedId);if(!node||!window.GameAPI.purchaseSkillNode(node))return}else{const node=goldNodeById.get(selectedId);if(!node||!window.GameAPI.purchaseGoldTreeNode(node))return}renderGraph();selectNode(selectedId)});
  window.addEventListener('game:stats-updated',()=>{if(panel.classList.contains('hidden'))return;if(tree==='ability')renderGraph();else{const current=window.GameAPI.getGoldTreeSnapshot();pointsReadout.textContent=`Золото: ${format(current.coins)}`;updateSelected()}});renderGraph();window.GameAPI.refresh();
})();
