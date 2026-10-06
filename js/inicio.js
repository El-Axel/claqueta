/* ===== Claqueta · lógica de la ventana de Inicio ===== */

// Saludo según la hora y fecha de hoy
const h = new Date().getHours();
$('#saludo').textContent = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
$('#fecha').textContent = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

// Cálculos a partir de los datos guardados
const hoyStr = hoy();
const en7dias = hoy(new Date(Date.now() + 7 * 864e5));
const proximos = S.trabajos.filter(t => t.fecha >= hoyStr).sort((a, b) => a.fecha.localeCompare(b.fecha));
const semana = proximos.filter(t => t.fecha <= en7dias).length;
const porCobrar = S.clientes.reduce((a, c) => a + Math.max(0, saldo(c.id)), 0);
const abiertas = S.cots.filter(c => c.estado === 'borrador' || c.estado === 'enviada').length;
const aceptadas = S.cots.filter(c => c.estado === 'aceptada').length;
const totalAcordado = S.clientes.reduce((a, c) => a + acordado(c.id), 0);
const totalPagado = S.clientes.reduce((a, c) => a + Math.min(pagado(c.id), acordado(c.id)), 0);
const pct = totalAcordado ? Math.round(totalPagado / totalAcordado * 100) : 0;

// Textos y números
$('#resumen').textContent = semana
  ? `Tienes ${plural(semana, 'trabajo', 'trabajos')} esta semana y ${cop(porCobrar)} por cobrar.`
  : porCobrar ? `No tienes trabajos esta semana. Te deben ${cop(porCobrar)}.` : 'Todo en orden. Crea una cotización para empezar.';
$('#porCobrar').textContent = cop(porCobrar);
$('#abiertas').textContent = abiertas;
$('#proxNum').textContent = proximos.length;
$('#nClientes').textContent = S.clientes.length;
$('#nEquipos').textContent = S.equipos.length;
$('#nAceptadas').textContent = aceptadas;
$('#cobradoPct').textContent = pct + '%';
$('#cobradoTxt').textContent = totalAcordado ? `${cop(totalPagado)} de ${cop(totalAcordado)}` : 'Aún no hay cotizaciones aceptadas';
requestAnimationFrame(() => setTimeout(() => $('#cobradoBarra').style.width = pct + '%', 350)); // la barra se llena al entrar

// Lista de próximos trabajos (los 3 más cercanos)
const lista = proximos.slice(0, 3).map(t => {
  const c = S.cots.find(x => x.id === t.cotId) || {};
  const d = new Date(t.fecha + 'T00:00');
  return `<a href="trabajo.html?id=${t.id}" class="cristal bloque !p-4 flex items-center gap-4">
    <div class="w-14 shrink-0 text-center rounded-2xl bg-white/10 py-2">
      <p class="text-xs muted">${d.toLocaleDateString('es-CO', { month: 'short' })}</p>
      <p class="num text-xl leading-none">${d.getDate()}</p>
    </div>
    <div class="min-w-0 flex-1">
      <p class="font-bold truncate">${esc(c.titulo)}</p>
      <p class="text-sm muted truncate">${esc(cli(c.clienteId).nombre)} · ${hora(t.ini)}</p>
    </div>
    <svg class="w-5 h-5 muted shrink-0" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
  </a>`;
});
$('#proximos').innerHTML = lista.length ? lista.join('') :
  `<div class="cristal bloque text-center">
     <p class="muted">Aún no tienes trabajos agendados.</p>
     <a href="cotizar.html?nueva=1" class="inline-block mt-4 rounded-full bg-menta text-noche font-bold px-5 py-2.5 text-sm">Crear una cotización</a>
   </div>`;
