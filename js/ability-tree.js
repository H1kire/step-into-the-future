(() => {
  const branches = [
    {
      id: 'hero', title: 'I · Статы героя', color: '#7dc8ff', xs: [90, 190, 290, 390], center: 240,
      lanes: [
        { id: 'attack', title: 'Атака', effects: { attack: 0.04 }, detail: '+4% к базовой атаке' },
        { id: 'health', title: 'Здоровье', effects: { health: 0.04 }, detail: '+4% к максимальному здоровью' },
        { id: 'energy', title: 'Энергия', effects: { energy: 0.04 }, detail: '+4% к максимальной энергии' },
        { id: 'defense', title: 'Защита', effects: { defense: 0.04 }, detail: '+4% к защите' }
      ]
    },
    {
      id: 'loot', title: 'II · Добыча и золото', color: '#ffd166', xs: [570, 670, 770], center: 670,
      lanes: [
        { id: 'drop', title: 'Шанс лута', effects: { drop: 0.04 }, detail: '+4% к базовому шансу выпадения' },
        { id: 'gold', title: 'Золото', effects: { gold: 0.05 }, detail: '+5% к золоту с монстров' },
        { id: 'rarity', title: 'Редкость', effects: { rarity: 0.025 }, detail: '+2.5% к шансам повышения редкости' }
      ]
    },
    {
      id: 'hybrid', title: 'III · Гибридные статы', color: '#d59aff', xs: [950, 1050, 1150], center: 1050,
      lanes: [
        { id: 'force', title: 'Сила и здоровье', effects: { attack: 0.02, health: 0.02 }, detail: '+2% к атаке и здоровью' },
        { id: 'guard', title: 'Защита и энергия', effects: { defense: 0.02, energy: 0.02 }, detail: '+2% к защите и энергии' },
        { id: 'balance', title: 'Баланс', effects: { attack: 0.015, health: 0.015, defense: 0.015, energy: 0.015 }, detail: '+1.5% к атаке, здоровью, защите и энергии' }
      ]
    }
  ];
  const rowCount = 25;
  const rowGap = 52;
  const firstY = 150;
  const nodes = [];
  for (const branch of branches) {
    branch.lanes.forEach((lane, laneIndex) => {
      for (let depth = 1; depth <= rowCount; depth++) {
        nodes.push({
          id: `${branch.id}-${lane.id}-${String(depth).padStart(2, '0')}`,
          branch, lane, laneIndex, depth,
          cost: 1 + Math.floor((depth - 1) / 5),
          effects: lane.effects,
          detail: lane.detail,
          x: branch.xs[laneIndex],
          y: firstY + (depth - 1) * rowGap,
          parentId: depth > 1 ? `${branch.id}-${lane.id}-${String(depth - 1).padStart(2, '0')}` : null
        });
      }
    });
  }
  const nodeById = new Map(nodes.map(node => [node.id, node]));

  function bonuses(purchasedIds) {
    const totals = { attack: 0, health: 0, energy: 0, defense: 0, drop: 0, gold: 0, rarity: 0 };
    for (const id of purchasedIds) {
      const node = nodeById.get(id);
      if (!node) continue;
      for (const [key, value] of Object.entries(node.effects)) totals[key] += value;
    }
    return totals;
  }
  window.AbilityTree = {
    getBonuses() {
      return bonuses(window.GameAPI?.getSkillSnapshot().purchased || []);
    }
  };

  const format = value => window.formatGameNumber ? window.formatGameNumber(value) : Number(value).toFixed(3);
  const tools = document.querySelector('.hud-tools');
  if (!tools || !window.GameAPI) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.id = 'abilityTreeOpen';
  button.textContent = '🌿 Древо';
  tools.append(button);

  const panel = document.createElement('section');
  panel.id = 'abilityTreePanel';
  panel.className = 'card floating-panel hidden ability-tree-panel';
  panel.innerHTML = `
    <div class="panel-title ability-tree-title"><h2>Древо улучшений</h2><button type="button" class="secondary panel-close" aria-label="Закрыть">✕</button></div>
    <div class="ability-summary"><span id="abilityPointsReadout"></span><span id="abilityProgressReadout"></span></div>
    <div class="ability-graph-scroll" id="abilityGraphScroll"><svg id="abilityGraph" role="img" aria-label="Древо из 250 улучшений"></svg></div>
    <div class="ability-detail" id="abilityDetail">Выбери доступный узел на графе.</div>
    <button type="button" class="primary full" id="abilityBuy" disabled>Выбери узел</button>`;
  document.body.append(panel);

  let selectedId = null;
  const pointsReadout = panel.querySelector('#abilityPointsReadout');
  const progressReadout = panel.querySelector('#abilityProgressReadout');
  const detail = panel.querySelector('#abilityDetail');
  const buyButton = panel.querySelector('#abilityBuy');
  const graph = panel.querySelector('#abilityGraph');

  function snapshot() { return window.GameAPI.getSkillSnapshot(); }
  function isUnlocked(node, purchased) { return !node.parentId || purchased.has(node.parentId); }
  function nodeStatus(node, purchased, points) {
    if (purchased.has(node.id)) return 'purchased';
    if (!isUnlocked(node, purchased)) return 'locked';
    return points >= node.cost ? 'available' : 'affordable-later';
  }
  function renderGraph() {
    const current = snapshot();
    const purchased = new Set(current.purchased);
    pointsReadout.textContent = `Свободно: ${format(current.abilityPoints)} Ability Points`;
    progressReadout.textContent = `Улучшено: ${purchased.size} / 250`;
    button.textContent = `🌿 Древо · ${format(current.abilityPoints)}`;
    const height = firstY + (rowCount - 1) * rowGap + 52;
    graph.setAttribute('viewBox', `0 0 1240 ${height}`);
    const parts = [];
    for (const branch of branches) {
      parts.push(`<text class="tree-branch-title" x="${branch.center}" y="28" text-anchor="middle" fill="${branch.color}">${branch.title}</text>`);
      parts.push(`<text class="tree-branch-root" x="${branch.center}" y="75" text-anchor="middle">ВЕТКА</text>`);
      for (let i = 0; i < branch.lanes.length; i++) {
        const lane = branch.lanes[i], x = branch.xs[i];
        parts.push(`<path class="tree-link" stroke="${branch.color}" d="M ${branch.center} 82 C ${branch.center} 112, ${x} 112, ${x} ${firstY - 15}"/>`);
        parts.push(`<text class="tree-lane-title" x="${x}" y="125" text-anchor="middle">${lane.title}</text>`);
      }
    }
    for (const node of nodes) {
      const status = nodeStatus(node, purchased, current.abilityPoints);
      if (node.parentId) {
        const parent = nodeById.get(node.parentId);
        parts.push(`<path class="tree-link ${purchased.has(node.id) ? 'tree-link-done' : ''}" stroke="${node.branch.color}" d="M ${parent.x} ${parent.y + 14} L ${node.x} ${node.y - 14}"/>`);
      }
      parts.push(`<g class="tree-node ${status}" data-skill-id="${node.id}" tabindex="0" role="button" aria-label="${node.lane.title}, уровень ${node.depth}, стоимость ${node.cost} Ability Points"><title>${node.lane.title} ${node.depth}: ${node.detail}; стоимость ${node.cost} Ability Points</title><circle cx="${node.x}" cy="${node.y}" r="14" stroke="${node.branch.color}"/><text x="${node.x}" y="${node.y + 4}" text-anchor="middle">${node.depth}</text></g>`);
    }
    graph.innerHTML = parts.join('');
  }

  function updateSelected() {
    const current = snapshot();
    const purchased = new Set(current.purchased);
    const node = nodeById.get(selectedId);
    if (!node) {
      detail.textContent = 'Выбери доступный узел на графе. Улучшения постоянные и применяются автоматически.';
      buyButton.disabled = true;
      buyButton.textContent = 'Выбери узел';
      return;
    }
    const status = nodeStatus(node, purchased, current.abilityPoints);
    const currentTotal = bonuses(current.purchased);
    const afterTotal = bonuses([...current.purchased, node.id]);
    const labels = { attack: 'атака', health: 'здоровье', energy: 'энергия', defense: 'защита', drop: 'шанс лута', gold: 'золото', rarity: 'редкость' };
    const totalText = Object.keys(afterTotal).filter(key => afterTotal[key] !== currentTotal[key]).map(key => `${labels[key]}: ${format(currentTotal[key] * 100)}% → ${format(afterTotal[key] * 100)}%`).join(' · ');
    detail.innerHTML = `<b>${node.branch.title} · ${node.lane.title} ${node.depth}</b><br>${node.detail} за узел.<br>Суммарный бонус после покупки: ${totalText}.<br>Стоимость: ${format(node.cost)} Ability Points.`;
    buyButton.disabled = status !== 'available';
    buyButton.textContent = status === 'purchased' ? 'Уже улучшено' : status === 'locked' ? 'Сначала открой предыдущий узел' : status === 'affordable-later' ? `Нужно ${format(node.cost)} Ability Points` : 'Улучшить';
  }

  function selectNode(id) {
    if (!nodeById.has(id)) return;
    selectedId = id;
    panel.querySelectorAll('.tree-node.selected').forEach(node => node.classList.remove('selected'));
    panel.querySelector(`[data-skill-id="${id}"]`)?.classList.add('selected');
    updateSelected();
  }

  function openTree() {
    document.querySelectorAll('#logPanel,#bagPanel,#chatPanel,#statsPanel,#abilityTreePanel').forEach(item => item.classList.add('hidden'));
    panel.classList.remove('hidden');
    panel.style.zIndex = '4600';
    renderGraph();
    updateSelected();
  }
  button.addEventListener('click', openTree);
  panel.querySelector('.panel-close').addEventListener('click', () => panel.classList.add('hidden'));
  graph.addEventListener('click', event => {
    const node = event.target.closest('[data-skill-id]');
    if (node) selectNode(node.dataset.skillId);
  });
  graph.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-skill-id]')) {
      event.preventDefault();
      selectNode(event.target.dataset.skillId);
    }
  });
  buyButton.addEventListener('click', () => {
    const node = nodeById.get(selectedId);
    if (!node || !window.GameAPI.purchaseSkillNode(node)) return;
    renderGraph();
    selectNode(node.id);
  });
  window.addEventListener('game:stats-updated', () => { updateSelected(); });

  const titleBar = panel.querySelector('.ability-tree-title');
  let drag = null;
  titleBar.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    const rect = panel.getBoundingClientRect();
    panel.style.transform = 'none';
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    titleBar.setPointerCapture(event.pointerId);
  });
  titleBar.addEventListener('pointermove', event => {
    if (!drag) return;
    panel.style.left = `${Math.max(0, Math.min(innerWidth - panel.offsetWidth, event.clientX - drag.x))}px`;
    panel.style.top = `${Math.max(8, Math.min(innerHeight - 70, event.clientY - drag.y))}px`;
  });
  titleBar.addEventListener('pointerup', () => { drag = null; });
  titleBar.addEventListener('pointercancel', () => { drag = null; });

  renderGraph();
  window.GameAPI.refresh();
})();
