/* ===== Claqueta · ventana Ajustes =====
   Google (próxima etapa) · tarifa por hora · mis equipos (#equipos) · datos */
const V = $('#vista');
// Si google.js no cargó (archivo faltante en el sitio), Ajustes igual se muestra y lo avisa
const G = typeof Goog !== 'undefined' ? Goog : { hayGoogle: () => false, conectado: () => false, mensaje: () => 'Algo salió mal.' };
const sinGoogle = typeof Goog === 'undefined';
const motivo = (window.__fallos || []).find(x => /google/i.test(x));   // por qué falló, si se sabe
const icono = p => `<svg viewBox="0 0 24 24"><path d="${p}"/></svg>`;

function pantalla() {
  const g = S.cfg.google, on = G.conectado();
  V.innerHTML = `<div class="mt-12 mb-5 entra" style="--i:1">${titulo('Ajustes')}</div>

    <section class="cristal bloque entra" style="--i:2" aria-labelledby="t-g">
      <h2 id="t-g" class="font-extrabold">Cuenta de Google</h2>
      <p id="g-estado" class="text-sm muted mt-1">${sinGoogle ? `No se pudo cargar js/google.js${motivo ? ' (' + esc(motivo) + ')' : ''}. Revisa que el archivo se llame exactamente google.js dentro de la carpeta js y vuelve a subir la carpeta completa a Netlify.` : on ? `Conectada como ${esc(g?.nombre)} (${esc(g?.correo)}). Ya puedes enviar cotizaciones por Gmail y agendar en Google Calendar.` : g ? 'Tu sesión venció. Reconecta para seguir usando Gmail y Calendar.' : G.hayGoogle() ? 'Sin conectar. Conéctala para enviar cotizaciones por Gmail y agendar en Google Calendar.' : 'Falta el ID de cliente de Google en js/config.js.'}</p>
      ${on || !G.hayGoogle() ? '' : '<p class="text-xs muted mt-2">Google mostrará un aviso de «app no verificada»: toca «Avanzado» y continúa.</p>'}
      <button id="g-btn" class="btn ${on ? 'btn-x' : 'btn-p'} mt-4">${sinGoogle ? 'Recargar la página' : on ? 'Desconectar' : g ? 'Reconectar' : 'Conectar con Google'}</button>
    </section>

    <section class="cristal bloque mt-3 entra" style="--i:3" aria-labelledby="t-t">
      <h2 id="t-t" class="font-extrabold">Tarifa por hora</h2>
      <p class="text-sm muted mt-1">Se usa por defecto en cada cotización nueva.</p>
      <label class="lbl mt-3" for="tarifa">Tarifa por hora (COP)</label>
      <input id="tarifa" class="inp" type="number" min="0" step="1000" inputmode="numeric" value="${S.cfg.tarifa}"><p class="err" data-e="tarifa"></p>
    </section>

    <div id="equipos" class="flex items-end justify-between mt-8 mb-3 scroll-mt-4"><h2 class="text-xl font-extrabold tracking-tight">Mis equipos</h2><button id="nuevoEq" class="btn btn-p !py-2.5">+ Agregar</button></div>
    <div id="listaEq" class="grid gap-2.5"></div>

    <h2 class="text-xl font-extrabold tracking-tight mt-8 mb-3">Datos</h2>
    <div class="grid gap-3">
      <button id="ejemplo" class="btn btn-s w-full">Cargar datos de ejemplo</button>
      <button id="borrar" class="btn btn-x w-full">Borrar todos los datos</button>
    </div>
    <p class="text-xs muted text-center mt-8">Claqueta v${VERSION} · prototipo académico. Tus datos se guardan solo en este navegador.</p>`;

  $('#tarifa').onchange = e => {
    const v = +e.target.value;
    if (!(v >= 0) || e.target.value === '') return errores(V, { tarifa: 'Escribe un valor de 0 en adelante.' });
    errores(V, {}); S.cfg.tarifa = v; save(); aviso('Tarifa guardada');
  };
  $('#nuevoEq').onclick = () => hojaEquipo();
  $('#g-btn').onclick = async () => {
    if (sinGoogle) return location.reload();
    if (!G.hayGoogle()) return aviso(sinGoogle ? 'No se cargó js/google.js.' : 'Falta el ID de cliente en js/config.js.');
    if (G.conectado()) { G.desconectar(); aviso('Cuenta desconectada'); return pantalla(); }
    try { await G.conectar(); aviso('Cuenta conectada'); pantalla(); }
    catch (e) { aviso(['popup_closed', 'popup_failed_to_open', 'cancelado', 'access_denied'].includes(e.message) ? 'Conexión cancelada.' : G.mensaje(e)); }
  };
  $('#ejemplo').onclick = async () => { if (await confirmar({ titulo: '¿Cargar datos de ejemplo?', texto: 'Se agregarán clientes, equipos, cotizaciones y un trabajo de ejemplo a tus datos.', boton: 'Cargar' })) { ejemplo(); aviso('Datos de ejemplo cargados'); pantalla(); } };
  $('#borrar').onclick = async () => { if (await confirmar({ titulo: '¿Borrar todos los datos?', texto: 'Se eliminarán clientes, equipos, cotizaciones, trabajos y pagos de este navegador. No se puede deshacer.', boton: 'Borrar todo', peligro: true })) { localStorage.removeItem(K); localStorage.removeItem(K + '-dr'); location.href = 'index.html'; } };
  equipos();
  if (location.hash === '#equipos') $('#equipos').scrollIntoView();
}

function equipos() {
  $('#listaEq').innerHTML = S.equipos.length ? S.equipos.map(e => `<div class="cristal bloque !p-4 flex items-center justify-between gap-3">
      <div class="min-w-0"><p class="font-bold truncate">${esc(e.nombre)}</p><p class="text-sm muted num">${cop(e.tarifa)} / día</p></div>
      <div class="flex gap-2 shrink-0"><button class="cristal btn-ic" data-e="${e.id}" aria-label="Editar ${esc(e.nombre)}">${icono('M4 20h4L19 9l-4-4L4 16zM13 7l4 4')}</button><button class="cristal btn-ic" data-d="${e.id}" aria-label="Eliminar ${esc(e.nombre)}">${icono('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3')}</button></div></div>`).join('')
    : vacio('Registra los equipos que usas para cotizar más rápido.');
  $('#listaEq').querySelectorAll('[data-e]').forEach(b => b.onclick = () => hojaEquipo(S.equipos.find(e => e.id === b.dataset.e)));
  $('#listaEq').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
    if (!await confirmar({ titulo: '¿Eliminar este equipo?', texto: 'Las cotizaciones que ya lo usan no cambian.', boton: 'Eliminar', peligro: true })) return;
    S.equipos = S.equipos.filter(e => e.id !== b.dataset.d); save(); aviso('Eliminado'); equipos();
  });
}

function hojaEquipo(e) {
  abrirHoja(e ? 'Editar equipo' : 'Nuevo equipo',
    campo('Nombre', 'nombre', 'text', e?.nombre, 'placeholder="Ej.: Cámara mirrorless" maxlength="60"') + campo('Tarifa por día (COP)', 'tarifa', 'number', e?.tarifa, 'inputmode="numeric" min="0" step="1000"'),
    e ? 'Guardar cambios' : 'Guardar equipo', (d, f) => {
      const m = {};
      if (!d.nombre.trim()) m.nombre = 'Este campo es obligatorio.';
      if (d.tarifa === '' || +d.tarifa < 0) m.tarifa = 'Escribe un valor de 0 en adelante.';
      if (Object.keys(m).length) return errores(f, m);
      if (e) Object.assign(e, { nombre: d.nombre.trim(), tarifa: +d.tarifa }); else S.equipos.push({ id: uid(), nombre: d.nombre.trim(), tarifa: +d.tarifa });
      save(); aviso('Guardado'); equipos();
    });
}

/* Datos de ejemplo para probar y para la sustentación */
function ejemplo() {
  const c1 = { id: uid(), nombre: 'Estudio Aurora', correo: 'aurora@correo.co', tel: '300 111 2233', notas: 'Cliente frecuente' };
  const c2 = { id: uid(), nombre: 'Café del Parque', correo: 'hola@cafedelparque.co', tel: '', notas: '' };
  const eq = [['Cámara mirrorless', 200000], ['Kit de luces LED', 120000], ['Micrófono de solapa', 50000]].map(([nombre, tarifa]) => ({ id: uid(), nombre, tarifa }));
  const n0 = Math.max(0, ...S.cots.map(c => c.n));
  const cot = (i, cl, titulo, tipo, horas, items, otros, desc, estado) => { const c = { id: uid(), n: n0 + i, clienteId: cl.id, titulo, tipo, descripcion: '', horas, tarifa: 60000, items, otros, desc, estado, fecha: hoy() }; c.total = calc(c).total; return c; };
  const k1 = cot(1, c1, 'Video institucional', 'Corporativo', 16, [{ nombre: eq[0].nombre, dias: 2, tarifa: eq[0].tarifa }, { nombre: eq[1].nombre, dias: 2, tarifa: eq[1].tarifa }], 80000, 5, 'aceptada');
  const k2 = cot(2, c2, 'Cobertura de evento', 'Evento', 10, [{ nombre: eq[0].nombre, dias: 1, tarifa: eq[0].tarifa }], 0, 0, 'enviada');
  const k3 = cot(3, c1, 'Spot para redes', 'Publicidad', 6, [], 0, 0, 'borrador');
  S.clientes.push(c1, c2); S.equipos.push(...eq); S.cots.push(k1, k2, k3);
  S.trabajos.push({ id: uid(), cotId: k1.id, fecha: hoy(new Date(Date.now() + 3 * 864e5)), ini: '08:00', fin: '14:00', dir: 'Cra. 7 # 12-34', notas: 'Baterías extra\nImpermeable para los equipos' });
  S.pagos.push({ id: uid(), clienteId: c1.id, cotId: k1.id, monto: 1000000, fecha: hoy(), nota: 'Anticipo' });
  save();
}

pantalla();
