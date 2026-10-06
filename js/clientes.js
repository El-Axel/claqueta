/* ===== Claqueta · ventana Clientes (lista · cuenta del cliente) =====
   clientes.html → lista     ?nuevo=1 → lista con la hoja «Nuevo cliente»     ?id=ID → cuenta */
const P = new URLSearchParams(location.search), V = $('#vista');
const sal = id => saldo(id) > 0 ? `<span class="num text-aviso">${cop(saldo(id))}</span>` : '<span class="muted text-sm">Al día</span>';

/* ---------- LISTA ---------- */
let q = '';
function lista() {
  V.innerHTML = `<div class="flex items-end justify-between mt-12 mb-5 entra" style="--i:1">${titulo('Clientes')}<button id="nuevo" class="btn btn-p !py-2.5">+ Nuevo</button></div>
    <input id="buscar" class="inp entra" style="--i:2" type="search" placeholder="Buscar cliente" aria-label="Buscar cliente">
    <div id="lista" class="grid gap-2.5 mt-4 entra" style="--i:3"></div>`;
  $('#nuevo').onclick = () => hojaCliente();
  $('#buscar').oninput = e => { q = e.target.value.toLowerCase().trim(); pinta(); };
  pinta();
}
function pinta() {
  const l = S.clientes.filter(c => `${c.nombre} ${c.correo}`.toLowerCase().includes(q)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  $('#lista').innerHTML = l.length ? l.map(c => `<a href="?id=${c.id}" class="cristal bloque !p-4 flex items-center justify-between gap-3">
      <div class="min-w-0"><p class="font-bold truncate">${esc(c.nombre)}</p><p class="text-sm muted truncate">${esc(c.correo) || 'Sin correo'}</p></div><div class="shrink-0 text-right">${sal(c.id)}</div></a>`).join('')
    : vacio(S.clientes.length ? 'Ningún cliente coincide con tu búsqueda.' : 'Aún no tienes clientes.', S.clientes.length ? '' : '<button class="btn btn-p" id="primero">Agregar mi primer cliente</button>');
  $('#primero')?.addEventListener('click', () => hojaCliente());
}

/* Hoja para crear o editar un cliente */
function hojaCliente(c) {
  abrirHoja(c ? 'Editar cliente' : 'Nuevo cliente',
    campo('Nombre', 'nombre', 'text', c?.nombre, 'autocomplete="name" maxlength="60"') + campo('Correo', 'correo', 'email', c?.correo, 'autocomplete="email"') +
    campo('Teléfono', 'tel', 'tel', c?.tel, 'autocomplete="tel"') + campo('Notas (opcional)', 'notas', 'text', c?.notas, 'maxlength="120"'),
    c ? 'Guardar cambios' : 'Guardar cliente', (d, f) => {
      const m = {};
      if (!d.nombre.trim()) m.nombre = 'Este campo es obligatorio.';
      if (d.correo && !emailOk(d.correo)) m.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
      if (Object.keys(m).length) return errores(f, m);
      const datos = { nombre: d.nombre.trim(), correo: d.correo.trim(), tel: d.tel.trim(), notas: d.notas.trim() };
      if (c) Object.assign(c, datos); else S.clientes.push({ id: uid(), ...datos });
      save(); aviso('Guardado'); c ? cuenta(c.id) : lista();
    });
}

/* ---------- CUENTA DEL CLIENTE ---------- */
function cuenta(id) {
  const c = S.clientes.find(x => x.id === id); if (!c) return V.innerHTML = noEncontrado('clientes.html');
  const ac = acordado(id), pg = pagado(id), sl = saldo(id), pct = ac ? Math.min(100, Math.round(pg / ac * 100)) : 0;
  const cs = S.cots.filter(x => x.clienteId === id).sort((a, b) => b.n - a.n);
  const ps = S.pagos.filter(x => x.clienteId === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const tile = (l, v, cl = '') => `<div class="${cl || 'cristal'} bloque !p-4 min-w-0"><p class="text-xs muted">${l}</p><p class="num text-lg mt-1 truncate">${cop(v)}</p></div>`;
  V.innerHTML = `<div class="flex items-center gap-3 mt-6 mb-6 entra" style="--i:1">${volver('clientes.html', 'clientes')}<p class="muted text-sm">Cuenta del cliente</p></div>
    <div class="entra" style="--i:2"><h1 class="text-3xl font-extrabold leading-tight tracking-tight break-words">${esc(c.nombre)}</h1>
      <p class="text-sm mt-1 flex flex-wrap gap-x-4">${c.correo ? `<a class="text-menta font-bold" href="mailto:${esc(c.correo)}">${esc(c.correo)}</a>` : '<span class="muted">Sin correo</span>'}${c.tel ? `<a class="text-menta font-bold" href="tel:${esc(c.tel)}">${esc(c.tel)}</a>` : ''}</p>
      ${c.notas ? `<p class="muted text-sm mt-1">${esc(c.notas)}</p>` : ''}</div>
    <section class="grid grid-cols-3 gap-2.5 mt-5 entra" style="--i:3" aria-label="Resumen de la cuenta">${tile('Acordado', ac)}${tile('Pagado', pg)}${sl < 0 ? tile('A favor', -sl, 'tile-verde') : tile('Saldo', sl, sl > 0 ? 'tile-verde' : '')}</section>
    <div class="barra mt-4 entra" style="--i:3" role="img" aria-label="${pct}% cobrado"><i id="barra"></i></div>
    <div class="grid grid-cols-2 gap-3 mt-4 entra" style="--i:4"><button id="pagar" class="btn btn-p">+ Registrar pago</button><a class="btn btn-s" href="cotizar.html?nueva=1&cliente=${id}">Nueva cotización</a></div>
    <h2 class="text-xl font-extrabold tracking-tight mt-8 mb-3">Cotizaciones</h2>
    <div class="grid gap-2.5">${cs.length ? cs.map(x => `<a href="cotizar.html?id=${x.id}" class="cristal bloque !p-4 flex items-center justify-between gap-3"><div class="min-w-0"><p class="font-bold truncate">${esc(x.titulo)}</p><p class="text-sm muted">#${x.n} · ${cop(x.total)}</p></div>${chip(x.estado)}</a>`).join('') : vacio('Este cliente aún no tiene cotizaciones.')}</div>
    <h2 class="text-xl font-extrabold tracking-tight mt-8 mb-3">Pagos</h2>
    <div class="grid gap-2.5">${ps.length ? ps.map(p => { const k = S.cots.find(x => x.id === p.cotId); return `<div class="cristal bloque !p-4 flex items-center justify-between gap-3"><div class="min-w-0"><p class="num font-bold">${cop(p.monto)}</p><p class="text-sm muted truncate">${fd(p.fecha)}${p.nota ? ' · ' + esc(p.nota) : ''}${k ? ' · #' + k.n : ''}</p></div><button class="cristal btn-ic" data-p="${p.id}" aria-label="Eliminar pago de ${cop(p.monto)}"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div>`; }).join('') : vacio('Aún no hay pagos registrados.')}</div>
    <div class="grid grid-cols-2 gap-3 mt-8"><button id="editar" class="btn btn-s">Editar cliente</button><button id="borrar" class="btn btn-x">Eliminar cliente</button></div>`;
  requestAnimationFrame(() => setTimeout(() => $('#barra') && ($('#barra').style.width = pct + '%'), 300));
  $('#pagar').onclick = () => hojaPago(c);
  $('#editar').onclick = () => hojaCliente(c);
  V.querySelectorAll('[data-p]').forEach(b => b.onclick = async () => {
    if (!await confirmar({ titulo: '¿Eliminar este pago?', texto: 'El saldo del cliente se recalculará.', boton: 'Eliminar', peligro: true })) return;
    S.pagos = S.pagos.filter(p => p.id !== b.dataset.p); save(); aviso('Eliminado'); cuenta(id);
  });
  $('#borrar').onclick = async () => {
    if (cs.length || ps.length) return aviso('Este cliente tiene cotizaciones o pagos. No se puede eliminar.');
    if (!await confirmar({ titulo: '¿Eliminar este cliente?', texto: 'No se puede deshacer.', boton: 'Eliminar', peligro: true })) return;
    S.clientes = S.clientes.filter(x => x.id !== id); save(); location.href = 'clientes.html';
  };
}

/* Hoja para registrar un pago. Si supera el saldo, avisa y pide confirmar tocando Guardar otra vez */
function hojaPago(c) {
  const acept = S.cots.filter(x => x.clienteId === c.id && x.estado === 'aceptada');
  let avisado = false;
  abrirHoja('Registrar pago',
    campo('Monto (COP)', 'monto', 'number', '', 'inputmode="numeric" min="1" step="1"') + campo('Fecha', 'fecha', 'date', hoy()) +
    `<div class="mb-3"><label class="lbl" for="c-cotId">Cotización (opcional)</label><select class="inp" id="c-cotId" name="cotId"><option value="">Sin asignar</option>${acept.map(x => `<option value="${x.id}">#${x.n} · ${esc(x.titulo)}</option>`).join('')}</select></div>` +
    campo('Nota (opcional)', 'nota', 'text', '', 'placeholder="Anticipo, abono..." maxlength="80"'), 'Guardar pago', (d, f) => {
      const monto = +d.monto, m = {};
      if (!(monto > 0)) m.monto = 'El monto debe ser mayor a $0.';
      if (!d.fecha) m.fecha = 'Este campo es obligatorio.';
      if (Object.keys(m).length) return errores(f, m);
      const max = Math.max(0, saldo(c.id));
      if (monto > max && !avisado) { avisado = true; return errores(f, { monto: `Supera el saldo pendiente (${cop(max)}). Si es correcto, toca Guardar de nuevo.` }); }
      S.pagos.push({ id: uid(), clienteId: c.id, cotId: d.cotId, monto, fecha: d.fecha, nota: d.nota.trim() });
      save(); aviso('Pago registrado'); cuenta(c.id);
    });
}

/* ---------- ¿QUÉ VISTA MOSTRAR? ---------- */
if (P.get('id')) cuenta(P.get('id'));
else { lista(); if (P.get('nuevo')) { history.replaceState(null, '', 'clientes.html'); hojaCliente(); } }
