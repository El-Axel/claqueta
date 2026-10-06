/* ===== Claqueta · ventana Cotizar (lista · formulario · detalle) =====
   Qué vista se muestra depende de la URL:
   cotizar.html  →  lista      ?nueva=1 / ?editar=ID  →  formulario      ?id=ID  →  detalle */
const P = new URLSearchParams(location.search), V = $('#vista');
const TIPOS = ['Corporativo', 'Evento', 'Videoclip', 'Publicidad', 'Documental', 'Fotografía', 'Otro'];

/* ---------- LISTA ---------- */
let fil = 'todas', q = '';
function lista() {
  const n = e => e === 'todas' ? S.cots.length : S.cots.filter(c => c.estado === e).length;
  V.innerHTML = `<div class="flex items-end justify-between mt-12 mb-5 entra" style="--i:1">${titulo('Cotizaciones')}<a href="?nueva=1" class="btn btn-p !py-2.5">+ Nueva</a></div>
    <input id="buscar" class="inp entra" style="--i:2" type="search" placeholder="Buscar por título o cliente" aria-label="Buscar cotización">
    <div class="flex gap-2 overflow-x-auto py-4 entra" style="--i:3">${['todas', 'borrador', 'enviada', 'aceptada', 'rechazada'].map(e => `<button class="f" data-f="${e}" aria-pressed="${e === fil}">${e[0].toUpperCase() + e.slice(1)} ${n(e)}</button>`).join('')}</div>
    <div id="lista" class="grid gap-2.5 entra" style="--i:4"></div>`;
  V.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { fil = b.dataset.f; V.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', x === b)); pinta(); });
  $('#buscar').oninput = e => { q = e.target.value.toLowerCase().trim(); pinta(); };
  pinta();
}
function pinta() {
  const l = S.cots.filter(c => (fil === 'todas' || c.estado === fil) && `${c.titulo} ${cli(c.clienteId).nombre}`.toLowerCase().includes(q)).sort((a, b) => b.n - a.n);
  $('#lista').innerHTML = l.length ? l.map(c => `<a href="?id=${c.id}" class="cristal bloque !p-4 block">
      <div class="flex justify-between gap-3 items-start"><p class="font-bold truncate min-w-0">${esc(c.titulo)}</p>${chip(c.estado)}</div>
      <div class="flex justify-between gap-3 mt-1 text-sm"><span class="muted truncate min-w-0">#${c.n} · ${esc(cli(c.clienteId).nombre)}</span><span class="num shrink-0">${cop(c.total)}</span></div></a>`).join('')
    : vacio(S.cots.length ? 'No hay cotizaciones con ese filtro.' : 'Aún no has creado cotizaciones.', S.cots.length ? '' : '<a href="?nueva=1" class="btn btn-p">Crear mi primera cotización</a>');
}

/* ---------- DETALLE ---------- */
function detalle(id) {
  const c = S.cots.find(x => x.id === id); if (!c) return V.innerHTML = noEncontrado('cotizar.html');
  const x = calc(c), t = S.trabajos.find(t => t.cotId === id), cl = cli(c.clienteId);
  const botones = {
    borrador: `<button class="btn btn-p w-full" data-a="enviar">Enviar por correo</button><button class="btn btn-s w-full" data-a="enviada">Ya la envié por otro medio</button><a class="btn btn-s w-full" href="?editar=${id}">Editar</a>`,
    enviada: `<div class="grid grid-cols-2 gap-3"><button class="btn btn-p" data-a="aceptada">Aceptada</button><button class="btn btn-s" data-a="rechazada">Rechazada</button></div><button class="btn btn-s w-full" data-a="enviar">Reenviar por correo</button>`,
    aceptada: `<a class="btn btn-p w-full" href="${t ? 'trabajo.html?id=' + t.id : 'agenda.html?agendar=' + id}">${t ? 'Ver trabajo agendado' : 'Agendar trabajo'}</a>`,
    rechazada: `<button class="btn btn-p w-full" data-a="borrador">Reabrir como borrador</button>`
  }[c.estado];
  V.innerHTML = `<div class="flex items-center gap-3 mt-6 mb-6 entra" style="--i:1">${volver('cotizar.html', 'cotizaciones')}<p class="muted text-sm">Cotización #${c.n} · ${esc(c.tipo)}</p></div>
    <div class="flex justify-between items-start gap-3 entra" style="--i:2"><div class="min-w-0"><h1 class="text-3xl font-extrabold leading-tight tracking-tight break-words">${esc(c.titulo)}</h1><a href="clientes.html?id=${c.clienteId}" class="text-menta font-bold">${esc(cl.nombre)}</a><p class="muted text-sm mt-1">Creada el ${fd(c.fecha)}${c.enviadaEn ? ` · Enviada a ${esc(cl.correo)}` : ''}</p></div>${chip(c.estado)}</div>
    ${c.descripcion ? `<p class="muted mt-3">${esc(c.descripcion)}</p>` : ''}
    <section class="cristal bloque mt-5 grid gap-2.5 text-[.95rem] entra" style="--i:3">
      ${fila(`Tiempo (${c.horas} h × ${cop(c.tarifa)})`, cop(x.t))}
      ${c.items.map(i => fila(`${esc(i.nombre)} (${plural(i.dias, 'día', 'días')})`, cop(i.dias * i.tarifa))).join('')}
      ${c.otros ? fila('Otros costos', cop(c.otros)) : ''}${c.desc ? fila(`Descuento ${c.desc}%`, '− ' + cop(x.d), 'muted') : ''}
      <div class="flex justify-between items-end border-t border-white/15 pt-4 mt-1"><b>Total</b><b class="num text-3xl">${cop(c.total)}</b></div>
    </section>
    <div class="grid gap-3 mt-5 entra" style="--i:4">${botones}
      <div class="grid grid-cols-2 gap-3"><button class="btn btn-s" data-a="duplicar">Duplicar</button><button class="btn btn-x" data-a="eliminar">Eliminar</button></div></div>`;
  V.querySelectorAll('[data-a]').forEach(b => b.onclick = () => accion(c, b.dataset.a, cl, t));
}
const estado = (c, e, msg) => { c.estado = e; save(); aviso(msg); detalle(c.id); };
async function accion(c, a, cl, t) {
  if (a === 'enviar') {
    if (!cl.correo) return aviso('Este cliente no tiene correo. Agrégalo en Clientes.');
    if (!googleListo()) return aviso('Conecta tu cuenta de Google en Ajustes para enviar por correo.');
    const { asunto, cuerpo } = Goog.textoCotizacion(c, cl);   // vista previa: el usuario ve exactamente lo que se enviará
    const ok = await abrirHoja('Enviar cotización', `<p class="lbl">Para</p><p class="mb-3 break-all">${esc(cl.correo)}</p><p class="lbl">Asunto</p><p class="mb-3 font-bold">${esc(asunto)}</p><p class="lbl">Mensaje</p><div class="inp mb-3 text-sm max-h-60 overflow-auto" style="white-space:pre-wrap">${esc(cuerpo)}</div>`, 'Enviar ahora', () => true);
    if (!ok) return;
    aviso('Enviando…');
    try { const r = await Goog.enviarCotizacion(c, cl); c.enviadaEn = new Date().toISOString(); c.mensajeId = r?.mensajeId; estado(c, 'enviada', `Cotización enviada a ${cl.correo}`); }
    catch (e) { aviso(Goog.mensaje(e)); }
  } else if (a === 'duplicar') {
    const n = Math.max(0, ...S.cots.map(x => x.n)) + 1, copia = { ...structuredClone(c), id: uid(), n, estado: 'borrador', fecha: hoy(), enviadaEn: undefined, mensajeId: undefined };
    S.cots.push(copia); save(); location.href = `cotizar.html?id=${copia.id}`;
  } else if (a === 'eliminar') {
    const ok = await confirmar({ titulo: '¿Eliminar esta cotización?', boton: 'Eliminar', peligro: true,
      texto: c.estado === 'aceptada' ? `Está aceptada y cuenta en la cuenta de ${esc(cl.nombre)}: el saldo cambiará.${t ? ' También se quitará su trabajo de la agenda.' : ''}` : 'No se puede deshacer.' });
    if (!ok) return;
    if (t?.eventoId && googleListo()) try { await Goog.borrarEvento(t); } catch { /* si falla, el evento queda en Calendar */ }
    S.cots = S.cots.filter(x => x.id !== c.id); S.trabajos = S.trabajos.filter(x => x.cotId !== c.id); save(); location.href = 'cotizar.html';
  } else estado(c, a, { enviada: 'Marcada como enviada', aceptada: 'Cotización aceptada', rechazada: 'Cotización rechazada', borrador: 'Vuelve a ser borrador' }[a]);
}

/* ---------- FORMULARIO (nueva o editar) ---------- */
const D0 = () => ({ clienteId: '', titulo: '', tipo: 'Corporativo', descripcion: '', horas: 8, tarifa: S.cfg.tarifa, items: [], otros: 0, desc: 0 });
const KD = K + '-dr';   // borrador local: se guarda mientras escribes
function formulario(editId) {
  const ed = editId && S.cots.find(c => c.id === editId && c.estado === 'borrador');
  if (editId && !ed) return V.innerHTML = noEncontrado('cotizar.html');
  const guardado = !ed && localStorage.getItem(KD);
  const dr = ed ? structuredClone(ed) : JSON.parse(guardado || 'null') || D0();
  if (!ed && P.get('cliente')) dr.clienteId = P.get('cliente');
  const opcCli = () => `<option value="">Elige un cliente</option>${S.clientes.map(c => `<option value="${c.id}" ${c.id === dr.clienteId ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}`;
  const sync = () => { if (!ed) localStorage.setItem(KD, JSON.stringify(dr)); resumen(); };
  const resumen = () => {
    const x = calc(dr);
    $('#res').innerHTML = `${fila('Subtotal', cop(x.sub), 'text-sm')}${dr.desc ? fila(`Descuento ${dr.desc}%`, '− ' + cop(x.d), 'text-sm muted') : ''}<div class="flex justify-between items-end mt-2"><b>Total</b><b class="num text-3xl">${cop(x.total)}</b></div>`;
  };
  const pintaEq = () => $('#eq').innerHTML = dr.items.map((i, k) => `<div class="cristal bloque !p-4 flex items-center justify-between gap-3 mb-2"><div class="min-w-0"><p class="font-bold truncate">${esc(i.nombre)}</p><p class="text-sm muted">${plural(i.dias, 'día', 'días')} × ${cop(i.tarifa)}</p></div><div class="flex items-center gap-3 shrink-0"><b class="num">${cop(i.dias * i.tarifa)}</b><button type="button" class="btn-ic cristal" data-del="${k}" aria-label="Quitar ${esc(i.nombre)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div></div>`).join('');
  const num = (l, k, x = '') => `<div><label class="lbl" for="d-${k}">${l}</label><input class="inp" id="d-${k}" name="${k}" data-k="${k}" type="number" min="0" inputmode="decimal" value="${dr[k]}" ${x}><p class="err" data-e="${k}"></p></div>`;

  V.innerHTML = `<div class="flex items-center gap-3 mt-6 mb-5 entra" style="--i:1">${volver('cotizar.html', 'cotizaciones')}${titulo(ed ? `Editar #${ed.n}` : 'Nueva cotización')}</div>
    ${guardado ? `<div class="cristal bloque !p-4 mb-3 flex items-center justify-between gap-3 text-sm"><span>Retomaste tu borrador.</span><button class="font-bold text-menta" id="limpiar" type="button">Empezar de cero</button></div>` : ''}
    <div class="cristal bloque grid gap-3 entra" style="--i:2">
      <div><label class="lbl" for="d-clienteId">Cliente</label><div class="flex gap-2"><select class="inp" id="d-clienteId" name="clienteId" data-k="clienteId">${opcCli()}</select><button type="button" id="nuevoCli" class="btn btn-s shrink-0">+ Nuevo</button></div><p class="err" data-e="clienteId"></p></div>
      <div><label class="lbl" for="d-titulo">Título del trabajo</label><input class="inp" id="d-titulo" name="titulo" data-k="titulo" value="${esc(dr.titulo)}" placeholder="Ej.: Video institucional" maxlength="80"><p class="err" data-e="titulo"></p></div>
      <div><label class="lbl" for="d-tipo">Tipo de producción</label><select class="inp" id="d-tipo" data-k="tipo">${TIPOS.map(t => `<option ${t === dr.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div><label class="lbl" for="d-descripcion">Descripción (opcional)</label><textarea class="inp" id="d-descripcion" data-k="descripcion" rows="2" maxlength="300">${esc(dr.descripcion)}</textarea></div>
      <div class="grid grid-cols-2 gap-3">${num('Horas de trabajo', 'horas')}${num('Tarifa por hora', 'tarifa')}</div>
      <p class="text-xs muted -mt-1">Tu tarifa por defecto es ${cop(S.cfg.tarifa)}. Aquí puedes cambiarla solo para esta cotización.</p>
    </div>
    <h2 class="text-xl font-extrabold tracking-tight mt-7 mb-3">Equipos</h2><div id="eq"></div>
    ${S.equipos.length ? `<div class="flex gap-2"><select id="se" class="inp" aria-label="Equipo">${S.equipos.map(e => `<option value="${e.id}">${esc(e.nombre)} · ${cop(e.tarifa)}/día</option>`).join('')}</select><input id="sd" class="inp !w-20 shrink-0" type="number" min="1" value="1" aria-label="Días de uso"><button type="button" id="addEq" class="btn btn-s shrink-0">Agregar</button></div>`
      : vacio('Aún no tienes equipos registrados.', '<a href="ajustes.html#equipos" class="btn btn-s">Registrar equipos</a>')}
    <div class="cristal bloque grid grid-cols-2 gap-3 mt-4">${num('Otros costos', 'otros')}${num('Descuento %', 'desc', 'max="100"')}</div>
    <section id="res" class="cristal bloque mt-4" aria-live="polite"></section>
    <div class="grid gap-3 mt-4"><button id="guardar" class="btn btn-p w-full">${ed ? 'Guardar cambios' : 'Guardar cotización'}</button>${ed ? '' : '<button id="descartar" class="btn btn-s w-full" type="button">Descartar borrador</button>'}</div>`;

  V.oninput = e => { const k = e.target.dataset.k; if (k) { dr[k] = ['horas', 'tarifa', 'otros', 'desc'].includes(k) ? +e.target.value || 0 : e.target.value; sync(); } };
  V.onclick = e => { const d = e.target.closest('[data-del]'); if (d) { dr.items.splice(+d.dataset.del, 1); sync(); pintaEq(); } };
  $('#addEq')?.addEventListener('click', () => { const eq = S.equipos.find(x => x.id === $('#se').value); if (!eq) return; dr.items.push({ nombre: eq.nombre, dias: Math.max(1, Math.round(+$('#sd').value || 1)), tarifa: eq.tarifa }); sync(); pintaEq(); });
  $('#limpiar')?.addEventListener('click', () => { localStorage.removeItem(KD); location.reload(); });
  $('#descartar')?.addEventListener('click', async () => { if (await confirmar({ titulo: '¿Descartar el borrador?', texto: 'Se borrará lo que escribiste en esta cotización.', boton: 'Descartar', peligro: true })) { localStorage.removeItem(KD); location.reload(); } });
  $('#nuevoCli').onclick = () => abrirHoja('Nuevo cliente', campo('Nombre', 'nombre', 'text', '', 'autocomplete="name" maxlength="60"') + campo('Correo', 'correo', 'email', '', 'autocomplete="email"') + campo('Teléfono', 'tel', 'tel', '', 'autocomplete="tel"'), 'Guardar cliente', (d, f) => {
    const m = {}; if (!d.nombre.trim()) m.nombre = 'Este campo es obligatorio.'; if (d.correo && !emailOk(d.correo)) m.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
    if (Object.keys(m).length) return errores(f, m);
    const c = { id: uid(), nombre: d.nombre.trim(), correo: d.correo.trim(), tel: d.tel.trim(), notas: '' };
    S.clientes.push(c); save(); dr.clienteId = c.id; sync(); $('#d-clienteId').innerHTML = opcCli(); aviso('Cliente guardado');
  });
  $('#guardar').onclick = () => {
    const m = {};
    if (!dr.clienteId) m.clienteId = 'Elige un cliente.';
    if (dr.titulo.trim().length < 3) m.titulo = 'Escribe un título de al menos 3 caracteres.';
    if (dr.desc < 0 || dr.desc > 100) m.desc = 'El descuento debe estar entre 0 y 100.';
    ['horas', 'tarifa', 'otros'].forEach(k => { if (dr[k] < 0) m[k] = 'Escribe un valor de 0 en adelante.'; });
    if (Object.keys(m).length) return errores(V, m);
    const total = calc(dr).total; if (total <= 0) return aviso('El total debe ser mayor a $0.');
    dr.titulo = dr.titulo.trim();
    let id = ed?.id;
    if (ed) Object.assign(ed, dr, { total });
    else { id = uid(); S.cots.push({ ...dr, id, n: Math.max(0, ...S.cots.map(c => c.n)) + 1, total, estado: 'borrador', fecha: hoy() }); }
    save(); localStorage.removeItem(KD); location.href = `cotizar.html?id=${id}&ok=1`;
  };
  pintaEq(); resumen();
}

/* ---------- ¿QUÉ VISTA MOSTRAR? ---------- */
if (P.get('id')) { detalle(P.get('id')); if (P.get('ok')) { aviso('Cotización guardada'); history.replaceState(null, '', '?id=' + P.get('id')); } }
else if (P.get('nueva') || P.get('editar')) formulario(P.get('editar'));
else lista();
