/* ===== Claqueta · ventana Agenda (calendario + próximos trabajos + pendientes) =====
   agenda.html → agenda      ?agendar=COTID → abre la hoja para agendar esa cotización */
const P = new URLSearchParams(location.search), V = $('#vista');
let mes = new Date(); mes.setDate(1);
let sel = '';   // día seleccionado (YYYY-MM-DD) o vacío
const pend = () => S.cots.filter(c => c.estado === 'aceptada' && !S.trabajos.some(t => t.cotId === c.id));
const tarjeta = t => {
  const c = S.cots.find(x => x.id === t.cotId) || {}, d = new Date(t.fecha + 'T00:00');
  return `<a href="trabajo.html?id=${t.id}" class="cristal bloque !p-4 flex items-center gap-4">
    <div class="w-14 shrink-0 text-center rounded-2xl bg-white/10 py-2"><p class="text-xs muted">${d.toLocaleDateString('es-CO', { month: 'short' })}</p><p class="num text-xl leading-none">${d.getDate()}</p></div>
    <div class="min-w-0 flex-1"><p class="font-bold truncate">${esc(c.titulo)}</p><p class="text-sm muted truncate">${esc(cli(c.clienteId).nombre)} · ${hora(t.ini)} – ${hora(t.fin)}</p>${t.dir || t.clima ? `<p class="text-xs muted truncate mt-0.5">${esc(t.dir)}${t.clima ? `${t.dir ? ' · ' : ''}${esc(t.clima.condicion)} ${t.clima.max}°` : ''}</p>` : ''}</div>
    <svg class="w-5 h-5 muted shrink-0" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></a>`;
};

function pantalla() {
  V.innerHTML = `<div class="flex items-end justify-between mt-12 mb-5 entra" style="--i:1">${titulo('Agenda')}<button id="agendar" class="btn btn-p !py-2.5">+ Agendar</button></div>
    <section class="cristal bloque entra" style="--i:2" aria-label="Calendario"><div id="cal"></div></section>
    <h2 id="tl" class="text-xl font-extrabold tracking-tight mt-8 mb-3 entra" style="--i:3"></h2><div id="lista" class="grid gap-2.5 entra" style="--i:3"></div>
    <div id="pend"></div>`;
  $('#agendar').onclick = elegir;
  refrescar();
}
const refrescar = () => { calendario(); lista(); pendientes(); };

function calendario() {
  const y = mes.getFullYear(), m = mes.getMonth(), blanco = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
  const con = new Set(S.trabajos.map(t => t.fecha));
  let celdas = '<span></span>'.repeat(blanco);
  for (let d = 1; d <= n; d++) {
    const f = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    celdas += `<button class="dia" data-d="${f}" aria-pressed="${f === sel}" ${f === hoy() ? 'aria-current="date"' : ''} aria-label="${fdl(f)}${con.has(f) ? ', con trabajos' : ''}">${d}${con.has(f) ? '<i></i>' : ''}</button>`;
  }
  const flecha = (v, t, p) => `<button class="cristal btn-ic" data-m="${v}" aria-label="${t}"><svg viewBox="0 0 24 24"><path d="${p}"/></svg></button>`;
  $('#cal').innerHTML = `<div class="flex items-center justify-between mb-3">${flecha(-1, 'Mes anterior', 'M15 6l-6 6 6 6')}<p class="cap font-extrabold">${mes.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</p>${flecha(1, 'Mes siguiente', 'M9 6l6 6-6 6')}</div>
    <div class="cal">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(l => `<small aria-hidden="true">${l}</small>`).join('')}${celdas}</div>`;
  $('#cal').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mes.setMonth(mes.getMonth() + +b.dataset.m); calendario(); });
  $('#cal').querySelectorAll('[data-d]').forEach(b => b.onclick = () => { sel = sel === b.dataset.d ? '' : b.dataset.d; calendario(); lista(); });
}
function lista() {
  const l = (sel ? S.trabajos.filter(t => t.fecha === sel) : S.trabajos.filter(t => t.fecha >= hoy())).sort((a, b) => (a.fecha + a.ini).localeCompare(b.fecha + b.ini));
  $('#tl').textContent = sel ? `Trabajos del ${new Date(sel + 'T00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}` : 'Próximos trabajos';
  $('#lista').innerHTML = l.length ? l.map(tarjeta).join('') : vacio(sel ? 'No tienes trabajos ese día.' : 'Aún no tienes trabajos agendados. Acepta una cotización para agendarla.');
}
function pendientes() {
  const p = pend();
  $('#pend').innerHTML = p.length ? `<h2 class="text-xl font-extrabold tracking-tight mt-8 mb-3">Pendientes de agendar</h2><div class="grid gap-2.5">${p.map(c => `<button class="cristal bloque !p-4 w-full text-left flex items-center justify-between gap-3" data-ag="${c.id}"><div class="min-w-0"><p class="font-bold truncate">${esc(c.titulo)}</p><p class="text-sm muted truncate">${esc(cli(c.clienteId).nombre)}</p></div><span class="text-menta font-bold text-sm">Agendar</span></button>`).join('')}</div>` : '';
  $('#pend').querySelectorAll('[data-ag]').forEach(b => b.onclick = () => agendar(b.dataset.ag, refrescar));
}
function elegir() {
  const p = pend();
  if (!p.length) return aviso('No tienes cotizaciones aceptadas pendientes de agendar.');
  if (p.length === 1) return agendar(p[0].id, refrescar);
  abrirHoja('¿Qué trabajo agendas?', `<div class="mb-3"><label class="lbl" for="c-cotId">Cotización aceptada</label><select class="inp" id="c-cotId" name="cotId">${p.map(c => `<option value="${c.id}">#${c.n} · ${esc(c.titulo)}</option>`).join('')}</select></div>`, 'Continuar',
    d => { setTimeout(() => agendar(d.cotId, refrescar), 420); });   // espera a que cierre esta hoja
}

pantalla();
if (P.get('agendar')) {
  const c = pend().find(x => x.id === P.get('agendar'));
  history.replaceState(null, '', 'agenda.html'); if (c) agendar(c.id, refrescar);
}
