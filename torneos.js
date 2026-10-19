// Torneos: formato "Puntos acumulados por juegos" con MVP y puntos extra
const evs = () => (db.eventos = db.eventos || []);

function calcular(e) {
  const t = {};
  e.participantes.forEach(p => t[p.id] = { p, pts: 0, mvp: 0, oros: 0 });
  e.juegos.forEach(j => Object.entries(j.res).forEach(([pid, l]) => {
    if (!t[pid]) return;
    t[pid].pts += e.puntosLugar[l - 1] || 0;
    if (l === 1) t[pid].oros++;
  }));
  e.mvps.forEach(m => { if (t[m.pid]) { t[m.pid].mvp++; t[m.pid].pts += e.mvpPuntos; } });
  e.extras.forEach(x => { if (t[x.pid]) t[x.pid].pts += x.pts; });
  return Object.values(t).sort((a, b) => b.pts - a.pts || b.mvp - a.mvp || b.oros - a.oros || a.p.nombre.localeCompare(b.p.nombre));
}

function listaEventos() {
  $.innerHTML = `<h1>Torneos</h1><div class="list"><a class="row" href="#/ranking"><span>Ranking general</span></a></div><h2>Eventos</h2>
  <div class="list">${evs().filter(visEv).length ? evs().filter(visEv).map(e => `<a class="row" href="#/torneos/${e.id}"><span>${esc(e.nombre)}<br><span class="sub">${e.participantes.length} participantes · ${FMT[e.formato || 'puntos']}</span></span></a>`).join('') : '<div class="row sub">Aún no hay eventos</div>'}</div>
  <form class="add" id="f" style="flex-wrap:wrap"><input id="n" placeholder="Nombre del evento" required><select id="fm"><option value="puntos">Puntos por juegos</option><option value="liga">Liga (todos contra todos)</option><option value="elim">Eliminación directa</option><option value="grupos">Grupos + eliminatoria</option></select><button>Crear</button></form>`;
  el('f').onsubmit = x => {
    x.preventDefault();
    const n = el('n').value.trim();
    if (!n) return;
    const e = { id: uid(), linea: localStorage.getItem('yolteotl-linea'), nombre: n, formato: el('fm').value, partidos: [], llave: null, grupos: null, nGrupos: 2, avanzan: 2, ptsG: 3, ptsE: 1, ptsP: 0, participantes: [], juegos: [], mvps: [], extras: [], puntosLugar: [10, 7, 5, 3, 2, 1], mvpPuntos: 3 };
    evs().push(e); save(); location.hash = '#/torneos/' + e.id;
  };
}

function evento(id) {
  const e = evs().find(x => x.id === id);
  if (!e) { location.hash = '#/torneos'; return; }
  if (e.formato === 'liga') return ligaVista(e);
  if (e.formato === 'elim') return elimVista(e);
  if (e.formato === 'grupos') return gruposVista(e);
  const y = scrollY, pp = e.participantes, tabla = calcular(e);
  const nombreP = pid => (pp.find(p => p.id === pid) || {}).nombre || '?';
  const opP = pp.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
  const quitar = (k, i) => `<button class="del" data-k="${k}" data-id="${i}">Quitar</button>`;

  $.innerHTML = `<a class="back" href="#/torneos">‹ Torneos</a><h1>${esc(e.nombre)}</h1>
  <h2>Tabla de posiciones</h2>
  <div class="list">${tabla.length ? tabla.map((t, i) => `<div class="row"><span>${i + 1}. ${esc(t.p.nombre)}<br><span class="sub">${t.mvp} MVP · ${t.oros} primeros lugares</span></span><b>${t.pts}</b></div>`).join('') : '<div class="row sub">Agrega participantes para ver la tabla</div>'}</div>

  ${e.juegos.map(j => `<h2>${esc(j.nombre)} ${quitar('juegos', j.id)}</h2><div class="list">${pp.map(p => `<div class="row"><span>${esc(p.nombre)}</span><select data-j="${j.id}" data-p="${p.id}" style="flex:none;background:var(--bg)"><option value="">Lugar</option>${pp.map((_, k) => `<option value="${k + 1}" ${j.res[p.id] === k + 1 ? 'selected' : ''}>${k + 1}º</option>`).join('')}</select></div>`).join('')}</div>`).join('')}
  <form class="add" id="fj"><input id="nj" placeholder="Nuevo juego" required><button>Añadir juego</button></form>

  <h2>MVP</h2>
  <div class="list">${e.mvps.length ? e.mvps.map(m => `<div class="row"><span>${esc(m.persona)}<br><span class="sub">${esc(nombreP(m.pid))} · ${esc((e.juegos.find(j => j.id === m.jid) || {}).nombre || 'Evento completo')}</span></span>${quitar('mvps', m.id)}</div>`).join('') : '<div class="row sub">Sin MVP todavía</div>'}</div>
  <form class="add" id="fm" style="flex-wrap:wrap"><input id="mp" placeholder="Nombre de la persona" required><select id="ms">${opP}</select><select id="mg"><option value="">Evento completo</option>${e.juegos.map(j => `<option value="${j.id}">${esc(j.nombre)}</option>`).join('')}</select><button>Dar MVP</button></form>

  <h2>Puntos extra o penalizaciones</h2>
  <div class="list">${e.extras.length ? e.extras.map(x => `<div class="row"><span>${esc(nombreP(x.pid))}<br><span class="sub">${esc(x.nota || 'Sin nota')}</span></span><b>${x.pts > 0 ? '+' : ''}${x.pts}</b>${quitar('extras', x.id)}</div>`).join('') : '<div class="row sub">Sin puntos extra</div>'}</div>
  <form class="add" id="fx" style="flex-wrap:wrap"><select id="xs">${opP}</select><input id="xv" type="number" step="any" placeholder="Puntos (negativo resta)" required><input id="xn" placeholder="Motivo (opcional)"><button>Añadir</button></form>

  <h2>Participantes</h2>
  <div class="list">${pp.length ? pp.map(p => `<div class="row"><span>${esc(p.nombre)}</span>${quitar('participantes', p.id)}</div>`).join('') : '<div class="row sub">Sin participantes</div>'}</div>
  <form class="add" id="fp"><input id="np" placeholder="Nombre del participante" required><button>Añadir</button></form>
  <form class="add" id="fi"><select id="li">${lineasVis().map(l => `<option value="${l.id}">${esc(l.nombre)} ${esc(l.division)}</option>`).join('')}</select><button>Importar sus células</button></form>

  <h2>Reglas de puntos</h2>
  <form class="add" id="fr" style="flex-wrap:wrap"><input id="rl" value="${e.puntosLugar.join(', ')}" aria-label="Puntos por lugar"><input id="rm" type="number" step="any" value="${e.mvpPuntos}" aria-label="Puntos por MVP"><button>Guardar</button></form>
  <p class="sub" style="margin:8px 16px">Primer campo: puntos por lugar (1º, 2º, 3º...) separados por comas. Segundo campo: puntos que da cada MVP a su célula. Desempate: MVP y luego primeros lugares.</p>
  <h2></h2><button class="sec red" id="del">Eliminar evento</button>`;

  const re = () => { save(); evento(id); };
  $.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { e[b.dataset.k] = e[b.dataset.k].filter(x => x.id !== b.dataset.id); re(); });
  $.querySelectorAll('[data-j]').forEach(s => s.onchange = () => {
    const r = e.juegos.find(j => j.id === s.dataset.j).res;
    if (s.value) r[s.dataset.p] = +s.value; else delete r[s.dataset.p];
    re();
  });
  el('fj').onsubmit = x => { x.preventDefault(); const n = el('nj').value.trim(); if (n) { e.juegos.push({ id: uid(), nombre: n, res: {} }); re(); } };
  el('fp').onsubmit = x => { x.preventDefault(); const n = el('np').value.trim(); if (n) { pp.push({ id: uid(), nombre: n }); re(); } };
  el('fi').onsubmit = x => {
    x.preventDefault();
    const l = db.lineas.find(z => z.id === el('li').value);
    l.celulas.forEach(c => { if (!ausenteHoy(c) && !pp.some(p => p.nombre === c.nombre)) pp.push({ id: uid(), nombre: c.nombre }); });
    re();
  };
  el('fm').onsubmit = x => {
    x.preventDefault();
    const n = el('mp').value.trim(), pid = el('ms').value;
    if (n && pid) { e.mvps.push({ id: uid(), persona: n, pid, jid: el('mg').value }); re(); }
  };
  el('fx').onsubmit = x => {
    x.preventDefault();
    const pid = el('xs').value, v = parseFloat(el('xv').value);
    if (pid && !isNaN(v)) { e.extras.push({ id: uid(), pid, pts: v, nota: el('xn').value.trim() }); re(); }
  };
  el('fr').onsubmit = x => {
    x.preventDefault();
    const a = el('rl').value.split(',').map(s => parseFloat(s)).filter(n => !isNaN(n));
    if (a.length) e.puntosLugar = a;
    e.mvpPuntos = parseFloat(el('rm').value) || 0;
    re();
  };
  el('del').onclick = () => {
    if (confirm('¿Eliminar este evento?')) { db.eventos = evs().filter(z => z.id !== id); save(); location.hash = '#/torneos'; }
  };
  scrollTo(0, y);
}

function rutaTorneos() {
  const [, r, id] = location.hash.split('/');
  if (r !== 'torneos') return;
  if (id) evento(id); else listaEventos();
}
addEventListener('hashchange', rutaTorneos);
rutaTorneos();
