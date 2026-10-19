// Herramientas: cronómetro, temporizador, sorteo de equipos, moneda y dado
let reloj = null;
const parar = () => { clearInterval(reloj); reloj = null; };
const dos = n => String(n).padStart(2, '0');
const fmtCrono = ms => `${dos(Math.floor(ms / 60000))}:${dos(Math.floor(ms / 1000) % 60)}.${dos(Math.floor(ms / 10) % 100)}`;
const fmtTemp = ms => { const s = Math.ceil(ms / 1000); return `${dos(Math.floor(s / 60))}:${dos(s % 60)}`; };
const volver = '<a class="back" href="#/herramientas">‹ Sábado</a>';

function aviso() {
  if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
  try {
    const c = new AudioContext(), o = c.createOscillator();
    o.connect(c.destination); o.frequency.value = 880; o.start(); o.stop(c.currentTime + 0.8);
  } catch (e) {}
}

function menuHerr() {
  const C = [
    ['Registro', [['/asistencia', 'Asistencia', 'Pasa lista por célula y fecha']]],
    ['Juegos', [['marcador', 'Marcador', 'Puntos por equipo'], ['carrera', 'Carrera por equipos', 'Orden de llegada y tiempos'], ['salida', 'Señal de salida', '3, 2, 1, ¡ya! con silbato y sirena'], ['cronometro', 'Cronómetro', 'Mide tiempos y vueltas'], ['temporizador', 'Temporizador', 'Cuenta regresiva con aviso']]],
    ['Azar', [['sorteo', 'Sorteo de equipos', 'Reparte nombres en equipos'], ['azar', 'Moneda y dado', 'Decide al azar']]],
    ['Organización', [['contador', 'Contador de personas', 'Suma y resta con un toque']]]
  ];
  $.innerHTML = `<h1>Sábado</h1>${C.map(([c, T]) => `<h2>${c}</h2><div class="list">${T.map(([k, n, d]) => `<a class="row" href="${k[0] === '/' ? '#' + k : '#/herramientas/' + k}"><span>${n}<br><span class="sub">${d}</span></span></a>`).join('')}</div>`).join('')}`;
}

function cronometro() {
  let t0 = 0, acum = 0, vueltas = [];
  $.innerHTML = `${volver}<h1>Cronómetro</h1><div class="card"><div class="big mono" id="d">00:00.00</div></div>
  <div class="grid"><button id="a">Iniciar</button><button class="sec" id="v">Vuelta</button></div>
  <button class="sec" id="r" style="margin-top:12px">Reiniciar</button><h2>Vueltas</h2><div class="list" id="l"></div>`;
  const ahora = () => acum + (reloj ? performance.now() - t0 : 0);
  const pinta = () => { el('d').textContent = fmtCrono(ahora()); };
  const lista = () => { el('l').innerHTML = vueltas.length ? vueltas.map((m, i) => `<div class="row"><span>Vuelta ${i + 1}</span><b class="mono">${fmtCrono(m)}</b></div>`).reverse().join('') : '<div class="row sub">Sin vueltas</div>'; };
  el('a').onclick = () => {
    if (reloj) { acum = ahora(); parar(); el('a').textContent = 'Continuar'; }
    else { t0 = performance.now(); reloj = setInterval(pinta, 30); el('a').textContent = 'Pausar'; }
  };
  el('v').onclick = () => { if (ahora() > 0) { vueltas.push(ahora()); lista(); } };
  el('r').onclick = () => { parar(); acum = 0; vueltas = []; pinta(); lista(); el('a').textContent = 'Iniciar'; };
  lista();
}

function temporizador() {
  $.innerHTML = `${volver}<h1>Temporizador</h1><div class="card"><div class="big mono" id="d">00:00</div></div>
  <form class="add" id="f"><input id="m" type="number" min="0" inputmode="numeric" value="1" aria-label="Minutos"><input id="s" type="number" min="0" max="59" inputmode="numeric" value="0" aria-label="Segundos"><button>Iniciar</button></form>
  <button class="sec" id="p" style="margin-top:12px">Detener</button>
  <p class="sub" style="margin:8px 16px">Minutos y segundos. Al terminar suena y vibra si el dispositivo lo permite.</p>`;
  el('f').onsubmit = x => {
    x.preventDefault(); parar();
    const ms = ((+el('m').value || 0) * 60 + (+el('s').value || 0)) * 1000;
    if (!ms) return;
    const fin = performance.now() + ms;
    el('d').textContent = fmtTemp(ms);
    reloj = setInterval(() => {
      const r = fin - performance.now();
      if (r <= 0) { parar(); el('d').textContent = '00:00'; aviso(); }
      else el('d').textContent = fmtTemp(r);
    }, 100);
  };
  el('p').onclick = parar;
}

function sorteo() {
  $.innerHTML = `${volver}<h1>Sorteo de equipos</h1>
  <textarea id="t" rows="6" placeholder="Un nombre por línea"></textarea>
  <form class="add" id="f" style="flex-wrap:wrap"><select id="li"><option value="">Cargar integrantes de...</option>${lineasVis().map(l => `<option value="${l.id}">${esc(l.nombre)} ${esc(l.division)}</option>`).join('')}</select><input id="n" type="number" min="2" value="2" inputmode="numeric" aria-label="Número de equipos"><button>Sortear</button></form>
  <div id="o"></div>`;
  el('li').onchange = () => {
    const l = db.lineas.find(z => z.id === el('li').value);
    if (l) el('t').value = l.celulas.filter(c => !ausenteHoy(c)).flatMap(c => c.integrantes.map(p => p.nombre)).join('\n');
  };
  el('f').onsubmit = x => {
    x.preventDefault();
    const nom = el('t').value.split('\n').map(s => s.trim()).filter(Boolean);
    const n = Math.max(2, Math.min(+el('n').value || 2, nom.length || 2));
    for (let i = nom.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nom[i], nom[j]] = [nom[j], nom[i]]; }
    const eq = Array.from({ length: n }, () => []);
    nom.forEach((p, i) => eq[i % n].push(p));
    el('o').innerHTML = eq.map((g, i) => `<h2>Equipo ${i + 1} · ${g.length}</h2><div class="list">${g.map(p => `<div class="row">${esc(p)}</div>`).join('') || '<div class="row sub">Vacío</div>'}</div>`).join('');
  };
}

function azar() {
  $.innerHTML = `${volver}<h1>Moneda y dado</h1><div class="card"><div class="big" id="d">?</div></div>
  <div class="grid"><button id="m">Moneda</button><button id="x">Dado</button></div>`;
  el('m').onclick = () => { el('d').textContent = Math.random() < 0.5 ? 'Cara' : 'Cruz'; };
  el('x').onclick = () => { el('d').textContent = 1 + Math.floor(Math.random() * 6); };
}

function rutaHerr() {
  const [, r, t] = location.hash.split('/');
  parar();
  if (r !== 'herramientas') return;
  ({ cronometro, temporizador, sorteo, azar, marcador, carrera, salida, contador }[t] || menuHerr)();
}
addEventListener('hashchange', rutaHerr);
rutaHerr();
