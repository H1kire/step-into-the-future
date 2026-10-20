(() => {
  const trigger = document.getElementById('ascensionOpen');
  if (!trigger || !window.GameAPI) return;
  const classes = [
    { id: 'adventurer', name: 'Авантюрист', x: 440, y: 110, description: 'Начальный путь вознесения.' },
    { id: 'warrior', name: 'Воин', x: 150, y: 300, description: 'Сила и стойкость в ближнем бою.' },
    { id: 'archer', name: 'Стрелок', x: 440, y: 300, description: 'Точность и ловкость.' },
    { id: 'mage', name: 'Маг', x: 730, y: 300, description: 'Магический путь. Энергия персонажа станет маной.' }
  ];
  const panel = document.createElement('section');
  panel.id = 'ascensionPanel';
  panel.className = 'card floating-panel hidden ascension-panel';
  panel.innerHTML = '<div class="panel-title"><h2>Вознесение</h2><button type="button" class="secondary" id="ascensionClose" aria-label="Закрыть">✕</button></div><div class="ability-summary"><span id="ascensionPoints"></span><span id="ascensionClassStatus"></span></div><div class="ascension-graph-scroll"><svg id="ascensionGraph" viewBox="0 0 880 390" role="img" aria-label="Древо вознесения и выбор класса"></svg></div><div class="ability-detail" id="ascensionDetail">Выбери доступный класс на графе.</div><button type="button" class="primary full" id="ascensionChoose" disabled>Выбери класс</button>';
  document.body.append(panel);
  window.registerFloatingPanel?.(panel);
  const graph = panel.querySelector('#ascensionGraph');
  const detail = panel.querySelector('#ascensionDetail');
  const choose = panel.querySelector('#ascensionChoose');
  let selectedId = '';
  const format = n => window.formatGameNumber ? window.formatGameNumber(n) : String(n);
  function snapshot() { return window.GameAPI.getAscensionSnapshot(); }
  function isAvailable(node, current) {
    if (current.classId) return false;
    if (node.id === 'adventurer') return current.level >= 10 && current.points > 0;
    return current.classId === 'adventurer' && current.level >= 25 && current.points > 0;
  }
  function render() {
    const current = snapshot();
    panel.querySelector('#ascensionPoints').textContent = `Свободно: ${format(current.points)} поинтов вознесения`;
    const names = { adventurer: 'Авантюрист', warrior: 'Воин', archer: 'Стрелок', mage: 'Маг' };
    panel.querySelector('#ascensionClassStatus').textContent = `Класс: ${names[current.classId] || 'не выбран'}`;
    const edges = `<path class="ascension-link" d="M440 150 C440 220 150 220 150 265"/><path class="ascension-link" d="M440 150 L440 265"/><path class="ascension-link" d="M440 150 C440 220 730 220 730 265"/>`;
    const nodesSvg = classes.map(node => {
      const available = isAvailable(node, current), owned = current.classId === node.id;
      const state = owned ? 'purchased' : available ? 'available' : 'locked';
      return `<g class="ascension-node ${state} ${selectedId === node.id ? 'selected' : ''}" data-class-id="${node.id}" tabindex="0" role="button" aria-label="${node.name}"><circle cx="${node.x}" cy="${node.y}" r="62"/><text x="${node.x}" y="${node.y + 5}" text-anchor="middle">${node.name}</text></g>`;
    }).join('');
    graph.innerHTML = `${edges}${nodesSvg}`;
    const selected = classes.find(node => node.id === selectedId);
    const allowed = selected && isAvailable(selected, current);
    choose.disabled = !allowed;
    choose.textContent = allowed ? `Выбрать класс: ${selected.name} · 1 поинт` : current.classId ? `Выбран класс: ${names[current.classId]}` : current.level < 10 ? 'Откроется на 10 уровне' : 'Выбери доступный путь';
    if (selected) {
      const requirement = selected.id === 'adventurer' ? 'Требование: 10 уровень.' : 'Требование: сначала выбрать Авантюриста, затем достичь 25 уровня.';
      detail.innerHTML = `<b>${selected.name}</b><br>${selected.description}<br>${requirement}`;
    } else {
      detail.textContent = current.classId ? 'Класс уже выбран. Дополнительные ветви вознесения появятся позже.' : 'На 10 уровне откроется Авантюрист. После выбора на 25 уровне откроются ветви Воина, Стрелка и Мага.';
    }
  }
  function open() {
    document.querySelector('#actionMenu')?.classList.add('hidden');
    document.querySelector('#menuToggle')?.setAttribute('aria-expanded', 'false');
    document.querySelectorAll('#logPanel,#bagPanel,#chatPanel,#statsPanel,#abilityTreePanel,#ascensionPanel').forEach(element => element.classList.add('hidden'));
    panel.classList.remove('hidden'); panel.style.zIndex = '4600'; render();
  }
  trigger.addEventListener('click', open);
  panel.querySelector('#ascensionClose').addEventListener('click', () => panel.classList.add('hidden'));
  graph.addEventListener('click', event => { const node = event.target.closest('[data-class-id]'); if (node) { selectedId = node.dataset.classId; render(); } });
  graph.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-class-id]')) { event.preventDefault(); selectedId = event.target.dataset.classId; render(); } });
  choose.addEventListener('click', () => { if (window.GameAPI.chooseAscensionClass(selectedId)) { selectedId = ''; render(); } });
  window.addEventListener('game:stats-updated', render);
  render();
})();
