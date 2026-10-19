// Herramientas Ronda 1: marcador, carrera por equipos, señal de salida, contador
let ac;
function sonido(tipo) {
  try {
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.connect(g); g.connect(ac.destination);
    o.type = tipo === 'sirena' ? 'sawtooth' : 'sine';
    g.gain.value = tipo === 'pip' ? 0.3 : 0.5;
    const f = { pip: [880], ya: [1320], silbato: [2700, 3000, 2700], sirena: [600, 1200, 600, 1200, 600] }[tipo];
    const d = { pip: 0.15, ya: 0.7, silbato: 0.7, sirena: 2.4 }[tipo];
    o.frequency.setValueAtTime(f[0], t);
    f.slice(1).forEach((v, k) => o.frequency.linearRampToValueAtTime(v, t + d * (k + 1) / (f.length - 1)));
    o.start(t); o.stop(t + d);
  } catch (e) {}
}
const vibra = ms => { if (navigator.vibrate) navigator.vibrate(ms); };

let marc = [{ n: 'Equipo 1', p: 0 }, { n: 'Equipo 2', p: 0 }];
function marcador() {
  const pinta = () => {
    $.innerHTML = `${volver}<h1>Marcador</h1>${marc.map((m, i) => `<div class="card" style="margin-bottom:12px"><input style="width:100%" data-n="${i}" value="${esc(m.n)}" aria-label="Nombre del equipo"><div class="big mono" style="text-align:center;margin:8px 0">${m.p}</div><div class="grid" style="margin:0"><button class="sec" data-s="${i}" data-d="-1">−1</button><button data-s="${i}" data-d="1">+1</button></div></div>`).join('')}
    <div class="grid"><button class="sec" id="a">Añadir equipo</button><button class="sec red" id="r">Reiniciar</button></div>`;
    $.querySelectorAll('[data-n]').forEach(x => x.onchange = () => { marc[x.dataset.n].n = x.value; });
    $.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { marc[b.dataset.s].p += +b.dataset.d; vibra(15); pinta(); });
    el('a').onclick = () => { marc.push({ n: 'Equipo ' + (marc.length + 1), p: 0 }); pinta(); };
    el('r').onclick = () => { marc.forEach(m => m.p = 0); pinta(); };
  };
  pinta();
}

function carrera() {
  let nombres = ['Equipo 1', 'Equipo 2', 'Equipo 3'], t0 = 0, lleg = [];
  const arma = () => {
    parar();
    $.innerHTML = `${volver}<h1>Carrera por equipos</h1><textarea id="t" rows="4" placeholder="Un equipo por línea">${esc(nombres.join('\n'))}</textarea>
    <button id="ok" style="margin-top:12px;width:100%">Preparar carrera</button>`;
    el('ok').onclick = () => {
      nombres = el('t').value.split('\n').map(s => s.trim()).filter(Boolean);
      if (nombres.length) corre();
    };
  };
  const corre = () => {
    t0 = 0; lleg = []; parar();
    $.innerHTML = `${volver}<h1>Carrera por equipos</h1><div class="card"><div class="big mono" id="d">00:00.00</div></div>
    <button id="g" style="width:100%;margin-top:12px">Salida</button><h2>Toca el equipo que llega</h2><div class="grid" id="b" style="margin:0"></div>
    <h2>Resultados</h2><div class="list" id="l"></div><button class="sec" id="r" style="margin-top:12px">Cambiar equipos</button>`;
    const pinta = () => {
      el('b').innerHTML = nombres.map((n, i) => {
        const off = !reloj || lleg.some(x => x.i === i);
        return `<button class="sec" data-e="${i}" ${off ? 'disabled' : ''} style="opacity:${off ? 0.4 : 1}">${esc(n)}</button>`;
      }).join('');
      el('l').innerHTML = lleg.length ? lleg.map((x, k) => `<div class="row"><span>${k + 1}. ${esc(nombres[x.i])}</span><b class="mono">${fmtCrono(x.t)}</b></div>`).join('') : '<div class="row sub">Aún sin llegadas</div>';
      $.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
        lleg.push({ i: +b.dataset.e, t: performance.now() - t0 });
        vibra(30);
        if (lleg.length === nombres.length) { parar(); el('d').textContent = fmtCrono(lleg[lleg.length - 1].t); el('g').textContent = 'Terminó'; }
        pinta();
      });
    };
    el('g').onclick = () => {
      if (reloj || lleg.length) return;
      t0 = performance.now();
      reloj = setInterval(() => { el('d').textContent = fmtCrono(performance.now() - t0); }, 30);
      el('g').textContent = 'En carrera';
      pinta();
    };
    el('r').onclick = arma;
    pinta();
  };
  arma();
}

function salida() {
  $.innerHTML = `${volver}<h1>Señal de salida</h1><div class="card" id="c" style="text-align:center;transition:background .2s"><div class="big" id="d" style="font-size:80px">Listo</div></div>
  <button id="g" style="width:100%;margin-top:12px">Iniciar cuenta regresiva</button>
  <div class="grid"><button class="sec" id="s1">Silbato</button><button class="sec" id="s2">Sirena</button></div>`;
  const col = (c, t) => { el('c').style.background = c; el('d').textContent = t; el('d').style.color = c ? '#fff' : ''; };
  el('g').onclick = () => {
    parar(); let n = 3;
    const paso = () => {
      if (n > 0) { col('#ff3b30', n); sonido('pip'); vibra(100); n--; }
      else { col('#34c759', '¡YA!'); sonido('ya'); vibra(500); parar(); setTimeout(() => { if (el('c')) col('', 'Listo'); }, 2500); }
    };
    paso(); reloj = setInterval(paso, 1000);
  };
  el('s1').onclick = () => sonido('silbato');
  el('s2').onclick = () => sonido('sirena');
}

let cuenta = 0;
function contador() {
  $.innerHTML = `${volver}<h1>Contador</h1><div class="card" style="text-align:center"><div class="big mono" id="d" style="font-size:96px">${cuenta}</div></div>
  <button id="m" style="width:100%;margin-top:12px;padding:44px 16px;font-size:28px">+1</button>
  <div class="grid"><button class="sec" id="n">−1</button><button class="sec red" id="r">Reiniciar</button></div>`;
  const pinta = () => { el('d').textContent = cuenta; };
  el('m').onclick = () => { cuenta++; vibra(15); pinta(); };
  el('n').onclick = () => { cuenta = Math.max(0, cuenta - 1); pinta(); };
  el('r').onclick = () => { if (cuenta === 0 || confirm('¿Reiniciar el contador?')) { cuenta = 0; pinta(); } };
}
