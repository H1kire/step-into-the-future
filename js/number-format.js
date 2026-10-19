(() => {
  const suffixes = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'];
  const trimZeros = value => value.toFixed(3).replace(/\.?0+$/, '');
  window.formatGameNumber = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const absolute = Math.abs(number);
    if (absolute < 1000) return trimZeros(number);
    const tier = Math.floor(Math.log10(absolute) / 3);
    if (tier >= suffixes.length) return number.toExponential(3);
    const scaled = number / (10 ** (tier * 3));
    if (Math.abs(scaled) >= 1000 && tier + 1 < suffixes.length) return trimZeros(number / (10 ** ((tier + 1) * 3))) + suffixes[tier + 1];
    return trimZeros(scaled) + suffixes[tier];
  };
})();
