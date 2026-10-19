// Fichas de integrantes y buscador
const sinAc = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const quienEs = id => {
  for (const l of db.lineas) for (const c of l.celulas) {
    const p = c.integrantes.find(x => x.id === id);
    if (p) return { p, c, l };
  }
  return null;
};
const atrasB = '<a class="back" href="#/">‹ Inicio</a>';

function buscar() {
  $.innerHTML = `${atrasB}<h1>Buscar</h1>
  <input id="q" style="width:100%" placeholder="Nombre o célula" aria-label="Buscar integrante">
  <div class="list" id="r" style="margin-top:12px"></div>`;
  const todos = lineasVis().flatMap(l => l.celulas.flatMap(c => c.integrantes.map(p => ({ p, c, l }))));
  const pinta = () => {
    const q = sinAc(el('q').value.trim());
    const r = todos.filter(x => !q || sinAc(x.p.nombre).includes(q) || sinAc(x.c.nombre).includes(q)).slice(0, 50);
    el('r').innerHTML = r.length ? r.map(x => `<a class="row" href="#/persona/${x.p.id}"><span>${esc(x.p.nombre)}<br><span class="sub">${esc(x.c.nombre)} · ${esc(x.l.division)}${x.p.edad ? ' · ' + x.p.edad + ' años' : ''}</span></span></a>`).join('') : '<div class="row sub">Sin resultados</div>';
  };
  el('q').oninput = pinta;
  pinta();
}

function ficha(id, ok) {
  const q = quienEs(id);
  if (!q) { location.hash = '#/buscar'; return; }
  const { p, c, l } = q;
  const fechas = Object.keys(db.asistencia || {}).sort().filter(f => !((db.ausentes || {})[f] || {})[c.id]);
  const pres = fechas.filter(f => db.asistencia[f][id]);
  const mvp = evs().reduce((n, e) => n + e.mvps.filter(m => sinAc(m.persona) === sinAc(p.nombre)).length, 0);
  const porc = fechas.length ? Math.round(100 * pres.length / fechas.length) : 0;
  $.innerHTML = `<a class="back" href="#/lineas/${l.id}/${c.id}">‹ ${esc(c.nombre)}</a><h1>${esc(p.nombre)}</h1>
  <p class="sub">${esc(c.nombre)} · ${esc(l.nombre)} ${esc(l.division)}</p>
  <div class="grid"><div class="card"><div class="big">${porc}%</div><div class="sub">Asistencia (${pres.length}/${fechas.length})</div></div>
  <div class="card"><div class="big">${mvp}</div><div class="sub">MVP</div></div></div>
  <h2>Datos</h2>
  <form id="f"><div class="list"><div class="row"><input id="n" value="${esc(p.nombre)}" aria-label="Nombre o apodo" required></div>
  <div class="row"><input id="e" type="number" min="0" max="99" inputmode="numeric" placeholder="Edad" value="${p.edad || ''}" aria-label="Edad"></div></div>
  <textarea id="t" rows="4" style="margin-top:12px" placeholder="Notas (sin teléfonos, domicilios ni datos médicos)">${esc(p.notas || '')}</textarea>
  <button style="width:100%;margin-top:12px">Guardar</button>${ok ? '<p class="sub" style="text-align:center;margin-top:8px">Guardado ✓</p>' : ''}</form>
  <h2>Últimas asistencias</h2>
  <div class="list">${fechas.length ? fechas.slice(-8).reverse().map(f => `<div class="row"><span>${esc(f)}</span><b style="color:${db.asistencia[f][id] ? 'var(--ac)' : 'var(--sub)'}">${db.asistencia[f][id] ? 'Presente' : 'Ausente'}</b></div>`).join('') : '<div class="row sub">Aún no hay asistencias registradas</div>'}</div>
  <p class="sub" style="margin:8px 16px">Los MVP se cuentan por nombre; usa siempre el mismo nombre al darlos en un torneo.</p>`;
  el('f').onsubmit = x => {
    x.preventDefault();
    const n = el('n').value.trim();
    if (!n) return;
    p.nombre = n;
    const e = parseInt(el('e').value, 10);
    if (isNaN(e)) delete p.edad; else p.edad = e;
    p.notas = el('t').value.trim();
    save(); ficha(id, true);
  };
}

function rutaFichas() {
  const [, r, id] = location.hash.split('/');
  if (r !== 'buscar' && r !== 'persona') return;
  document.querySelectorAll('#tabs a').forEach(x => x.classList.toggle('on', x.dataset.t === 'inicio'));
  if (r === 'buscar') buscar(); else ficha(id);
}
addEventListener('hashchange', rutaFichas);
rutaFichas();
