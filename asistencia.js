// Asistencia por célula y fecha, y ranking general de torneos
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
let fechaA = new Date().toLocaleDateString('en-CA');
const atras = '<a class="back" href="#/herramientas">‹ Sábado</a>';

function asistencia() {
  const y = scrollY;
  const reg = (db.asistencia || {})[fechaA] || {};
  const aus = (db.ausentes || {})[fechaA] || {};
  const ls = lineasVis().filter(l => l.celulas.length);
  const todasC = ls.flatMap(l => l.celulas);
  const todos = todasC.filter(c => !aus[c.id]).flatMap(c => c.integrantes);
  const pres = todos.filter(p => reg[p.id]).length;
  const nAus = todasC.filter(c => aus[c.id]).length;
  const fechas = Object.keys(db.asistencia || {});

  const bloques = ls.map(l => l.celulas.map(c => {
    if (aus[c.id]) return `<h2>${esc(c.nombre)} · ${esc(l.division)} <button class="del" style="color:var(--ac)" data-a="${c.id}">Incluir</button></h2><div class="list"><div class="row sub">No asistió este día</div></div>`;
    const n = c.integrantes.filter(p => reg[p.id]).length;
    return `<h2>${esc(c.nombre)} · ${esc(l.division)} · ${n}/${c.integrantes.length} (${pct(n, c.integrantes.length)}%) <button class="del" data-a="${c.id}">No asistió</button></h2>
    <div class="list">${c.integrantes.length ? c.integrantes.map(p => `<div class="row" data-p="${p.id}"><span>${esc(p.nombre)}</span><b style="font-size:26px;color:${reg[p.id] ? 'var(--ac)' : 'var(--sub)'}">${reg[p.id] ? '●' : '○'}</b></div>`).join('') : '<div class="row sub">Sin integrantes</div>'}</div>`;
  }).join('')).join('');

  const resumen = fechas.length ? `<h2>Resumen histórico · ${fechas.length} sesiones</h2><div class="list">${ls.flatMap(l => l.celulas.map(c => {
    const ses = fechas.filter(f => !((db.ausentes || {})[f] || {})[c.id]);
    const marcas = ses.reduce((s, f) => s + c.integrantes.filter(p => db.asistencia[f][p.id]).length, 0);
    return `<div class="row"><span>${esc(c.nombre)}<br><span class="sub">${esc(l.division)} · ${ses.length} sesiones</span></span><b>${pct(marcas, c.integrantes.length * ses.length)}%</b></div>`;
  })).join('')}</div><p class="sub" style="margin:8px 16px">Porcentaje = presencias entre integrantes por sesiones. Los días en que una célula está marcada como "No asistió" no cuentan para ella.</p>` : '';

  $.innerHTML = `${atras}<h1>Asistencia</h1>
  <form class="add"><input type="date" id="f" value="${fechaA}" aria-label="Fecha"></form>
  <p class="sub" style="margin:12px 16px 0">Presentes: <b>${pres}</b> de ${todos.length} (${pct(pres, todos.length)}%)${nAus ? ` · ${nAus} célula(s) no asistieron` : ''}</p>
  ${bloques || '<div class="list" style="margin-top:12px"><div class="row sub">Aún no hay células con integrantes. Agrégalos en Líneas.</div></div>'}${resumen}`;

  el('f').onchange = () => { if (el('f').value) { fechaA = el('f').value; asistencia(); } };
  $.querySelectorAll('[data-p]').forEach(r => r.onclick = () => {
    db.asistencia = db.asistencia || {};
    const d = db.asistencia[fechaA] = db.asistencia[fechaA] || {};
    if (d[r.dataset.p]) delete d[r.dataset.p]; else d[r.dataset.p] = true;
    if (!Object.keys(d).length) delete db.asistencia[fechaA];
    save(); asistencia();
  });
  $.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    db.ausentes = db.ausentes || {};
    const d = db.ausentes[fechaA] = db.ausentes[fechaA] || {};
    if (d[b.dataset.a]) delete d[b.dataset.a];
    else {
      d[b.dataset.a] = true;
      const r = (db.asistencia || {})[fechaA];
      if (r) {
        todasC.find(x => x.id === b.dataset.a).integrantes.forEach(p => delete r[p.id]);
        if (!Object.keys(r).length) delete db.asistencia[fechaA];
      }
    }
    if (!Object.keys(d).length) delete db.ausentes[fechaA];
    save(); asistencia();
  });
  scrollTo(0, y);
}

function ranking() {
  const tot = {};
  evs().filter(e => !e.formato || e.formato === 'puntos').filter(visEv).forEach(e => calcular(e).forEach(t => {
    const r = tot[t.p.nombre] = tot[t.p.nombre] || { pts: 0, mvp: 0, ev: 0 };
    r.pts += t.pts; r.mvp += t.mvp; r.ev++;
  }));
  const lin = n => (db.lineas.find(l => l.celulas.some(c => c.nombre === n)) || {}).division || 'Sin línea';
  const filas = Object.entries(tot).sort((a, b) => b[1].pts - a[1].pts || b[1].mvp - a[1].mvp);
  const porLinea = {};
  filas.forEach(([n, r]) => { porLinea[lin(n)] = (porLinea[lin(n)] || 0) + r.pts; });
  $.innerHTML = `<a class="back" href="#/torneos">‹ Torneos</a><h1>Ranking general</h1><p class="sub">Suma de todos los torneos registrados.</p>
  <h2>Por célula o equipo</h2>
  <div class="list">${filas.length ? filas.map(([n, r], i) => `<div class="row"><span>${i + 1}. ${esc(n)}<br><span class="sub">${esc(lin(n))} · ${r.ev} eventos · ${r.mvp} MVP</span></span><b>${r.pts}</b></div>`).join('') : '<div class="row sub">Aún no hay torneos con participantes</div>'}</div>
  <h2>Por línea</h2>
  <div class="list">${Object.entries(porLinea).sort((a, b) => b[1] - a[1]).map(([n, p]) => `<div class="row"><span>${esc(n)}</span><b>${p}</b></div>`).join('') || '<div class="row sub">Sin datos</div>'}</div>
  <p class="sub" style="margin:8px 16px">Los equipos se identifican por su nombre, así que usa siempre el mismo nombre de célula en cada evento.</p>`;
}

function rutaAsis() {
  const r = location.hash.split('/')[1];
  if (r !== 'asistencia' && r !== 'ranking') return;
  document.querySelectorAll('#tabs a').forEach(x => x.classList.toggle('on', x.dataset.t === (r === 'ranking' ? 'torneos' : 'herramientas')));
  if (r === 'asistencia') asistencia(); else ranking();
}
addEventListener('hashchange', rutaAsis);
rutaAsis();
