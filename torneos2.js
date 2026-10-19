// Torneos: formatos Liga (todos contra todos) y Eliminación directa
const ausenteHoy = c => ((db.ausentes || {})[new Date().toLocaleDateString('en-CA')] || {})[c.id];
const FMT = { puntos: 'Puntos por juegos', liga: 'Liga', elim: 'Eliminación directa', grupos: 'Grupos + eliminatoria' };

function roundRobin(ids) {
  const a = ids.slice();
  if (a.length % 2) a.push(null);
  const n = a.length, rs = [];
  for (let r = 0; r < n - 1; r++) {
    const m = [];
    for (let i = 0; i < n / 2; i++) {
      const x = a[i], y = a[n - 1 - i];
      if (x && y) m.push(r % 2 ? [y, x] : [x, y]);
    }
    rs.push(m);
    a.splice(1, 0, a.pop());
  }
  return rs;
}

function tablaLiga(e) {
  const t = {};
  e.participantes.forEach(p => t[p.id] = { p, pj: 0, g: 0, em: 0, pe: 0, gf: 0, gc: 0, pts: 0 });
  e.partidos.forEach(m => {
    if (m.ga == null || m.gb == null || !t[m.a] || !t[m.b]) return;
    const A = t[m.a], B = t[m.b];
    A.pj++; B.pj++; A.gf += m.ga; A.gc += m.gb; B.gf += m.gb; B.gc += m.ga;
    if (m.ga > m.gb) { A.g++; B.pe++; A.pts += e.ptsG; B.pts += e.ptsP; }
    else if (m.ga < m.gb) { B.g++; A.pe++; B.pts += e.ptsG; A.pts += e.ptsP; }
    else { A.em++; B.em++; A.pts += e.ptsE; B.pts += e.ptsE; }
  });
  return Object.values(t).sort((x, y) => y.pts - x.pts || (y.gf - y.gc) - (x.gf - x.gc) || y.gf - x.gf || x.p.nombre.localeCompare(y.p.nombre));
}

function resolver(e) {
  const R = e.llave.map(() => []);
  e.llave.forEach((ronda, r) => ronda.forEach((m, k) => {
    const a = r === 0 ? m.a : R[r - 1][2 * k].w, b = r === 0 ? m.b : R[r - 1][2 * k + 1].w;
    let w = null;
    if (r === 0 && (!a || !b)) w = a || b;
    else if (m.w && (m.w === a || m.w === b)) w = m.w;
    R[r][k] = { a, b, w };
  }));
  return R;
}

function partUI(e) {
  const pp = e.participantes;
  return `<h2>Participantes</h2><div class="list">${pp.length ? pp.map(p => `<div class="row"><span>${esc(p.nombre)}</span><button class="del" data-k="participantes" data-id="${p.id}">Quitar</button></div>`).join('') : '<div class="row sub">Sin participantes</div>'}</div>
  <form class="add" id="fp"><input id="np" placeholder="Nombre del participante" required><button>Añadir</button></form>
  <form class="add" id="fi"><select id="li">${lineasVis().map(l => `<option value="${l.id}">${esc(l.nombre)} ${esc(l.division)}</option>`).join('')}</select><button>Importar sus células</button></form>
  <h2></h2><button class="sec red" id="del">Eliminar evento</button>`;
}

function cablePart(e, re) {
  const pp = e.participantes;
  $.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { e.participantes = e.participantes.filter(x => x.id !== b.dataset.id); re(); });
  el('fp').onsubmit = x => { x.preventDefault(); const n = el('np').value.trim(); if (n) { pp.push({ id: uid(), nombre: n }); re(); } };
  el('fi').onsubmit = x => {
    x.preventDefault();
    const l = db.lineas.find(z => z.id === el('li').value);
    l.celulas.forEach(c => { if (!ausenteHoy(c) && !pp.some(p => p.nombre === c.nombre)) pp.push({ id: uid(), nombre: c.nombre }); });
    re();
  };
  el('del').onclick = () => {
    if (confirm('¿Eliminar este evento?')) { db.eventos = evs().filter(z => z.id !== e.id); save(); location.hash = '#/torneos'; }
  };
}

function ligaVista(e) {
  const y = scrollY, nom = id => (e.participantes.find(p => p.id === id) || {}).nombre || '?';
  const tabla = tablaLiga(e), rondas = [...new Set(e.partidos.map(m => m.ronda))];
  const re = () => { save(); ligaVista(e); };
  const inp = (m, c) => `<input type="number" min="0" inputmode="numeric" data-m="${m.id}" data-l="${c}" value="${m[c] ?? ''}" style="flex:none;width:52px;text-align:center;background:var(--bg)" aria-label="Goles">`;
  $.innerHTML = `<a class="back" href="#/torneos">‹ Torneos</a><h1>${esc(e.nombre)}</h1><p class="sub">Liga · todos contra todos</p>
  <h2>Tabla de posiciones</h2>
  <div class="list">${tabla.length ? tabla.map((t, i) => `<div class="row"><span>${i + 1}. ${esc(t.p.nombre)}<br><span class="sub">PJ ${t.pj} · G ${t.g} · E ${t.em} · P ${t.pe} · GF ${t.gf} · GC ${t.gc} · DG ${t.gf - t.gc > 0 ? '+' : ''}${t.gf - t.gc}</span></span><b>${t.pts}</b></div>`).join('') : '<div class="row sub">Agrega participantes</div>'}</div>
  ${rondas.map(r => `<h2>Jornada ${r}</h2><div class="list">${e.partidos.filter(m => m.ronda === r).map(m => `<div class="row"><span style="flex:1">${esc(nom(m.a))}</span>${inp(m, 'ga')}<b>-</b>${inp(m, 'gb')}<span style="flex:1;text-align:right">${esc(nom(m.b))}</span></div>`).join('')}</div>`).join('')}
  <form class="add" id="fg" style="flex-wrap:wrap"><label class="sub" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="iv" style="flex:none"> Ida y vuelta</label><button>${e.partidos.length ? 'Regenerar calendario' : 'Generar calendario'}</button></form>
  ${partUI(e)}
  <h2>Puntos por victoria, empate y derrota</h2>
  <form class="add" id="fr"><input id="pg" type="number" value="${e.ptsG}" aria-label="Victoria"><input id="pe" type="number" value="${e.ptsE}" aria-label="Empate"><input id="pp" type="number" value="${e.ptsP}" aria-label="Derrota"><button>Guardar</button></form>
  <p class="sub" style="margin:8px 16px">Desempate: diferencia de goles y luego goles a favor. Si cambias participantes, regenera el calendario.</p>`;
  $.querySelectorAll('[data-m]').forEach(i => i.onchange = () => {
    const m = e.partidos.find(x => x.id === i.dataset.m), v = parseInt(i.value, 10);
    m[i.dataset.l] = isNaN(v) ? null : Math.max(0, v);
    re();
  });
  el('fg').onsubmit = x => {
    x.preventDefault();
    if (e.participantes.length < 2) return alert('Agrega al menos 2 participantes');
    if (e.partidos.length && !confirm('Se borrarán los resultados capturados. ¿Continuar?')) return;
    const rs = roundRobin(e.participantes.map(p => p.id));
    e.partidos = [];
    rs.forEach((ms, r) => ms.forEach(([a, b]) => e.partidos.push({ id: uid(), ronda: r + 1, a, b, ga: null, gb: null })));
    if (el('iv').checked) rs.forEach((ms, r) => ms.forEach(([a, b]) => e.partidos.push({ id: uid(), ronda: rs.length + r + 1, a: b, b: a, ga: null, gb: null })));
    re();
  };
  el('fr').onsubmit = x => { x.preventDefault(); e.ptsG = +el('pg').value || 0; e.ptsE = +el('pe').value || 0; e.ptsP = +el('pp').value || 0; re(); };
  cablePart(e, re);
  scrollTo(0, y);
}

function elimVista(e) {
  const y = scrollY, nom = id => id ? ((e.participantes.find(p => p.id === id) || {}).nombre || '?') : '';
  const R = e.llave ? resolver(e) : [], N = R.length, camp = N ? R[N - 1][0].w : null;
  const nr = r => N - r === 1 ? 'Final' : N - r === 2 ? 'Semifinales' : N - r === 3 ? 'Cuartos de final' : 'Ronda ' + (r + 1);
  const re = () => { save(); elimVista(e); };
  $.innerHTML = `<a class="back" href="#/torneos">‹ Torneos</a><h1>${esc(e.nombre)}</h1><p class="sub">Eliminación directa · toca al equipo que gana</p>
  ${camp ? `<div class="card" style="text-align:center;margin-top:12px"><div class="sub">Campeón</div><div class="big" style="font-size:30px">${esc(nom(camp))}</div></div>` : ''}
  ${R.map((ronda, r) => `<h2>${nr(r)}</h2>${ronda.map((m, k) => `<div class="list" style="margin-top:8px">${['a', 'b'].map(s => {
    const id = m[s], gana = m.w && m.w === id, vivo = id && m.a && m.b;
    return `<div class="row" ${vivo ? `data-r="${r}" data-k="${k}" data-s="${s}"` : ''} style="${gana ? 'font-weight:700;color:var(--ac)' : ''}"><span>${id ? esc(nom(id)) : `<span class="sub">${r === 0 ? 'Pase directo' : 'Por definir'}</span>`}</span><b>${gana ? '✓' : ''}</b></div>`;
  }).join('')}</div>`).join('')}`).join('')}
  <form class="add" id="fg" style="flex-wrap:wrap"><label class="sub" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="mz" style="flex:none"> Mezclar al azar</label><button>${e.llave ? 'Regenerar llave' : 'Generar llave'}</button></form>
  <p class="sub" style="margin:8px 16px">Sin mezclar, el orden de la lista es el ranking de siembra: los primeros reciben los pases directos si el número no es exacto.</p>
  ${partUI(e)}`;
  $.querySelectorAll('[data-r]').forEach(d => d.onclick = () => {
    const m = e.llave[+d.dataset.r][+d.dataset.k], id = R[+d.dataset.r][+d.dataset.k][d.dataset.s];
    m.w = m.w === id ? null : id;
    re();
  });
  el('fg').onsubmit = x => {
    x.preventDefault();
    const ids = e.participantes.map(p => p.id);
    if (ids.length < 2) return alert('Agrega al menos 2 participantes');
    if (e.llave && !confirm('Se borrará la llave actual. ¿Continuar?')) return;
    if (el('mz').checked) for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    let size = 2; while (size < ids.length) size *= 2;
    let ord = [1];
    for (let l = 1; l < size; l *= 2) ord = ord.flatMap(v => [v, 2 * l + 1 - v]);
    const ll = [Array.from({ length: size / 2 }, (_, k) => ({ a: ids[ord[2 * k] - 1] || null, b: ids[ord[2 * k + 1] - 1] || null, w: null }))];
    for (let n = size / 4; n >= 1; n /= 2) ll.push(Array.from({ length: n }, () => ({ w: null })));
    e.llave = ll;
    re();
  };
  cablePart(e, re);
  scrollTo(0, y);
}

// ---- Formato Grupos + eliminatoria ----
function construirLlave(ids) {
  let size = 2; while (size < ids.length) size *= 2;
  let ord = [1];
  for (let l = 1; l < size; l *= 2) ord = ord.flatMap(v => [v, 2 * l + 1 - v]);
  const ll = [Array.from({ length: size / 2 }, (_, k) => ({ a: ids[ord[2 * k] - 1] || null, b: ids[ord[2 * k + 1] - 1] || null, w: null }))];
  for (let n = size / 4; n >= 1; n /= 2) ll.push(Array.from({ length: n }, () => ({ w: null })));
  return ll;
}

function llaveHTML(R, nom) {
  const N = R.length, camp = N ? R[N - 1][0].w : null;
  const nr = r => N - r === 1 ? 'Final' : N - r === 2 ? 'Semifinales' : N - r === 3 ? 'Cuartos de final' : 'Ronda ' + (r + 1);
  return (camp ? `<div class="card" style="text-align:center;margin-top:12px"><div class="sub">Campeón</div><div class="big" style="font-size:30px">${esc(nom(camp))}</div></div>` : '') +
    R.map((ronda, r) => `<h2>${nr(r)}</h2>${ronda.map((m, k) => `<div class="list" style="margin-top:8px">${['a', 'b'].map(s => {
      const id = m[s], gana = m.w && m.w === id, vivo = id && m.a && m.b;
      return `<div class="row" ${vivo ? `data-r="${r}" data-k="${k}" data-s="${s}"` : ''} style="${gana ? 'font-weight:700;color:var(--ac)' : ''}"><span>${id ? esc(nom(id)) : `<span class="sub">${r === 0 ? 'Pase directo' : 'Por definir'}</span>`}</span><b>${gana ? '✓' : ''}</b></div>`;
    }).join('')}</div>`).join('')}`).join('');
}

function cableLlave(e, R, re) {
  $.querySelectorAll('[data-r]').forEach(d => d.onclick = () => {
    const m = e.llave[+d.dataset.r][+d.dataset.k], id = R[+d.dataset.r][+d.dataset.k][d.dataset.s];
    m.w = m.w === id ? null : id;
    re();
  });
}

function gruposVista(e) {
  const y = scrollY, pp = e.participantes, nom = id => id ? ((pp.find(p => p.id === id) || {}).nombre || '?') : '';
  const re = () => { save(); gruposVista(e); };
  const G = e.grupos || [], letra = g => String.fromCharCode(65 + g);
  const tablas = G.map((ids, g) => tablaLiga({ participantes: ids.map(id => pp.find(p => p.id === id)).filter(Boolean), partidos: e.partidos.filter(m => m.g === g), ptsG: e.ptsG, ptsE: e.ptsE, ptsP: e.ptsP }));
  const R = e.llave ? resolver(e) : [];
  const falta = e.partidos.filter(m => m.ga == null || m.gb == null).length;
  const inp = (m, c) => `<input type="number" min="0" inputmode="numeric" data-m="${m.id}" data-l="${c}" value="${m[c] ?? ''}" style="flex:none;width:52px;text-align:center;background:var(--bg)" aria-label="Goles">`;
  $.innerHTML = `<a class="back" href="#/torneos">‹ Torneos</a><h1>${esc(e.nombre)}</h1><p class="sub">Grupos + eliminatoria · avanzan ${e.avanzan} por grupo</p>
  ${tablas.map((t, g) => `<h2>Grupo ${letra(g)}</h2><div class="list">${t.map((x, i) => `<div class="row"><span>${i + 1}. ${esc(x.p.nombre)}${i < e.avanzan ? ' <b style="color:var(--ac)">→</b>' : ''}<br><span class="sub">PJ ${x.pj} · G ${x.g} · E ${x.em} · P ${x.pe} · DG ${x.gf - x.gc > 0 ? '+' : ''}${x.gf - x.gc}</span></span><b>${x.pts}</b></div>`).join('')}</div>`).join('') || '<h2>Grupos</h2><div class="list"><div class="row sub">Agrega participantes y genera los grupos</div></div>'}
  ${G.map((_, g) => `<h2>Grupo ${letra(g)} · partidos</h2><div class="list">${e.partidos.filter(m => m.g === g).map(m => `<div class="row"><span style="flex:1">${esc(nom(m.a))}</span>${inp(m, 'ga')}<b>-</b>${inp(m, 'gb')}<span style="flex:1;text-align:right">${esc(nom(m.b))}</span></div>`).join('')}</div>`).join('')}
  ${G.length ? `<h2>Eliminatoria</h2>${R.length ? llaveHTML(R, nom) : '<div class="list"><div class="row sub">Se genera con los mejores de cada grupo</div></div>'}<button class="sec" id="ge" style="margin-top:12px">${e.llave ? 'Regenerar eliminatoria' : 'Generar eliminatoria'}</button>` : ''}
  <h2>Configuración</h2>
  <form class="add" id="fg" style="flex-wrap:wrap"><input id="ng" type="number" min="2" value="${e.nGrupos}" aria-label="Número de grupos"><input id="av" type="number" min="1" value="${e.avanzan}" aria-label="Avanzan por grupo"><label class="sub" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="mz" style="flex:none"> Mezclar</label><button>Generar grupos</button></form>
  <p class="sub" style="margin:8px 16px">Primer número: cuántos grupos. Segundo: cuántos avanzan por grupo. Sin mezclar, el orden de la lista reparte a los mejores en grupos distintos.</p>
  ${partUI(e)}
  <h2>Puntos por victoria, empate y derrota</h2>
  <form class="add" id="fr"><input id="pg" type="number" value="${e.ptsG}" aria-label="Victoria"><input id="pe" type="number" value="${e.ptsE}" aria-label="Empate"><input id="pp" type="number" value="${e.ptsP}" aria-label="Derrota"><button>Guardar</button></form>`;
  $.querySelectorAll('[data-m]').forEach(i => i.onchange = () => {
    const m = e.partidos.find(x => x.id === i.dataset.m), v = parseInt(i.value, 10);
    m[i.dataset.l] = isNaN(v) ? null : Math.max(0, v);
    re();
  });
  el('fg').onsubmit = x => {
    x.preventDefault();
    const g = Math.max(2, parseInt(el('ng').value, 10) || 2), k = Math.max(1, parseInt(el('av').value, 10) || 1);
    if (pp.length < g * 2) return alert('Se necesitan al menos 2 participantes por grupo');
    if (e.grupos && !confirm('Se borrarán grupos, resultados y eliminatoria. ¿Continuar?')) return;
    const ids = pp.map(p => p.id);
    if (el('mz').checked) for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const G2 = Array.from({ length: g }, () => []);
    ids.forEach((id, i) => { const f = Math.floor(i / g), c = i % g; G2[f % 2 ? g - 1 - c : c].push(id); });
    e.grupos = G2; e.nGrupos = g; e.avanzan = k; e.llave = null; e.partidos = [];
    G2.forEach((gi, gx) => roundRobin(gi).forEach((ms, r) => ms.forEach(([a, b]) => e.partidos.push({ id: uid(), g: gx, ronda: r + 1, a, b, ga: null, gb: null }))));
    re();
  };
  if (el('ge')) el('ge').onclick = () => {
    if (falta && !confirm(`Faltan ${falta} partidos por capturar. ¿Generar de todos modos?`)) return;
    if (e.llave && !confirm('Se borrará la eliminatoria actual. ¿Continuar?')) return;
    const ids = [];
    for (let pos = 0; pos < e.avanzan; pos++) tablas.forEach(t => { if (t[pos]) ids.push(t[pos].p.id); });
    if (ids.length < 2) return alert('Faltan equipos para la eliminatoria');
    e.llave = construirLlave(ids);
    re();
  };
  el('fr').onsubmit = x => { x.preventDefault(); e.ptsG = +el('pg').value || 0; e.ptsE = +el('pe').value || 0; e.ptsP = +el('pp').value || 0; re(); };
  cableLlave(e, R, re);
  cablePart(e, re);
  scrollTo(0, y);
}
