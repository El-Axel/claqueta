/* ===== Claqueta · hoja «Agendar trabajo» (la usan Agenda y Trabajo) =====
   agendar(cotId, despues) abre la hoja para crear o editar el trabajo de una cotización aceptada.
   «despues» se ejecuta al guardar. Aquí se conectarán después Maps, clima y Calendar. */
const SUGERENCIAS = ['Baterías extra', 'Tarjetas de memoria', 'Impermeable', 'Trípode', 'Permiso de acceso'];
function agendar(cotId, despues) {
  const cot = S.cots.find(c => c.id === cotId); if (!cot) return;
  const t = S.trabajos.find(x => x.cotId === cotId);
  let avisado = false;
  const on = googleListo();
  const cal = `<label class="flex items-start gap-3 mb-3 text-sm"><input type="checkbox" name="cal" class="mt-0.5 w-5 h-5 shrink-0" style="accent-color:#5BE08A" ${on ? 'checked' : 'disabled'}><span>${t?.eventoId ? 'Actualizar el evento en Google Calendar' : 'Crear evento en Google Calendar'}${on ? '' : '<span class="block muted text-xs">Conecta tu cuenta de Google en Ajustes para activarlo.</span>'}</span></label>`;
  const p = abrirHoja(t ? 'Editar trabajo' : 'Agendar trabajo',
    `<p class="text-sm muted mb-4">#${cot.n} · ${esc(cot.titulo)} · ${esc(cli(cot.clienteId).nombre)}</p>` +
    campo('Fecha', 'fecha', 'date', t?.fecha, t ? '' : `min="${hoy()}"`) +
    `<div class="grid grid-cols-2 gap-3">${campo('Hora de inicio', 'ini', 'time', t?.ini || '08:00')}${campo('Hora de fin', 'fin', 'time', t?.fin || '14:00')}</div>` +
    `<div class="mb-3"><label class="lbl" for="c-dir">Dirección del trabajo</label><input class="inp" id="c-dir" name="dir" value="${esc(t?.dir)}" placeholder="Escribe la dirección o el lugar" autocomplete="off" maxlength="160">
       <ul id="sug" class="mt-1 rounded-2xl overflow-hidden bg-[#16241c] empty:hidden"></ul><p id="dir-estado" class="text-xs muted mt-1" aria-live="polite"></p><p class="err" data-e="dir"></p></div>
     <div id="mapa-h" class="mapa hidden h-40 rounded-2xl overflow-hidden mb-3"></div><div id="clima-h" class="mb-3"></div>` +
    `<div class="mb-3"><label class="lbl" for="c-notas">Notas (qué llevar)</label><textarea class="inp" id="c-notas" name="notas" rows="3" maxlength="400">${esc(t?.notas || '')}</textarea>
       <div class="flex flex-wrap gap-2 mt-2">${SUGERENCIAS.map(s => `<button type="button" class="f" data-s="${s}">+ ${s}</button>`).join('')}</div></div>` + cal,
    t ? 'Guardar cambios' : 'Guardar trabajo', (d, f) => {
      const m = {};
      if (!d.fecha) m.fecha = 'Este campo es obligatorio.';
      else if (d.fecha < hoy() && !(t && t.fecha === d.fecha)) m.fecha = 'Elige una fecha de hoy en adelante.';
      if (!d.ini) m.ini = 'Este campo es obligatorio.';
      if (!d.fin) m.fin = 'Este campo es obligatorio.';
      else if (d.ini && d.fin <= d.ini) m.fin = 'La hora de fin debe ser posterior a la de inicio.';
      if (Object.keys(m).length) return errores(f, m);
      // Cruce de fechas: otro trabajo el mismo día en un horario que se traslapa
      const choque = S.trabajos.find(x => x.cotId !== cotId && x.fecha === d.fecha && x.ini < d.fin && d.ini < x.fin);
      if (choque && !avisado) {
        avisado = true; const o = S.cots.find(c => c.id === choque.cotId);
        return errores(f, { ini: `Ya tienes «${o?.titulo}» ese día de ${hora(choque.ini)} a ${hora(choque.fin)} Si quieres agendar de todos modos, toca Guardar de nuevo.` });
      }
      const u = ub();   // lugar elegido (coordenadas) y pronóstico, si los hay
      const datos = { fecha: d.fecha, ini: d.ini, fin: d.fin, dir: d.dir.trim(), notas: d.notas.trim(),
        ...(u.lugar ? { lat: u.lugar.lat, lng: u.lugar.lng, placeId: u.lugar.placeId } : {}), ...(u.clima ? { clima: u.clima } : {}) };
      let nuevo = t;
      if (t) {   // si cambia el lugar o la fecha, lo calculado con Maps y clima ya no sirve
        if (t.dir !== datos.dir) { delete t.lat; delete t.lng; delete t.placeId; }
        if (t.dir !== datos.dir || t.fecha !== datos.fecha) delete t.clima;
        Object.assign(t, datos);
      } else { nuevo = { id: uid(), cotId, ...datos }; S.trabajos.push(nuevo); }
      save(); aviso(t ? 'Trabajo actualizado' : 'Trabajo agendado'); despues?.(nuevo);
      if (d.cal) sincronizar(nuevo, despues);
    });
  const ub = ubicacion(document.querySelector('.hoja'), t);   // sugerencias de dirección, mapa y clima
  // Las sugerencias suman una línea a las notas
  document.querySelector('.hoja').onclick = e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const ta = document.querySelector('.hoja [name="notas"]'); ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + b.dataset.s;
  };
  return p;
}

/* Crea o actualiza el evento de Calendar sin bloquear la pantalla */
async function sincronizar(t, despues) {
  try { await Goog.guardarEvento(t); aviso('Evento guardado en tu Google Calendar'); despues?.(t); }
  catch (e) { aviso('Trabajo guardado. ' + Goog.mensaje(e)); }
}

/* Dirección con sugerencias reales (Maps), mapa de vista previa y pronóstico del día (clima).
   Devuelve una función que entrega el lugar y el clima elegidos al guardar. */
function ubicacion(f, t) {
  const GG = typeof Goog !== 'undefined' ? Goog : null, $f = s => f.querySelector(s);
  let lugar = t?.lat != null ? { dir: t.dir, lat: t.lat, lng: t.lng, placeId: t.placeId } : null;
  let clima = t?.clima || null, climaFecha = t?.clima ? t.fecha : '', sug = [], tmp;
  const estado = txt => { const e = $f('#dir-estado'); if (e) e.textContent = txt; };
  const pintaClima = txt => { const c = $f('#clima-h'); if (!c) return; c.innerHTML = txt ? `<p class="text-xs muted">${txt}</p>` : clima ? `<div class="cristal bloque !p-4"><p class="lbl">Pronóstico del día</p><p class="font-bold">${esc(clima.condicion)}</p><p class="num text-sm">Mín. ${clima.min}° · Máx. ${clima.max}° · Lluvia ${clima.lluvia}%</p></div>` : ''; };
  const mostrarMapa = () => { const m = $f('#mapa-h'); if (!m) return; m.classList.toggle('hidden', !lugar); if (lugar) GG.mapa(m, lugar.lat, lugar.lng).catch(() => m.classList.add('hidden')); };
  async function actualizarClima() {
    const fecha = $f('#c-fecha')?.value;
    if (!lugar || !fecha) { clima = null; return pintaClima(''); }
    if (!GG.climaDisponible(fecha)) { clima = null; return pintaClima('El pronóstico estará disponible desde 15 días antes de la fecha del trabajo.'); }
    pintaClima('Consultando el clima…');
    try { clima = await GG.pronostico(lugar.lat, lugar.lng, fecha); climaFecha = fecha; pintaClima(clima ? '' : 'No hay pronóstico para esa fecha.'); }
    catch (e) { clima = null; pintaClima(GG.mensaje(e)); }
  }
  if (GG) {
    f.addEventListener('input', e => {
      if (e.target.name !== 'dir') return;
      if (lugar && e.target.value !== lugar.dir) { lugar = null; clima = null; mostrarMapa(); pintaClima(''); }   // cambió el texto: la ubicación elegida ya no vale
      clearTimeout(tmp); const q = e.target.value.trim(); $f('#sug').innerHTML = '';
      if (q.length < 4) return estado('');
      estado('Buscando…');
      tmp = setTimeout(async () => {   // se espera a que dejes de escribir (y respeta el límite de OpenStreetMap)
        try {
          sug = await GG.sugerencias(q); estado(sug.length ? 'Elige una sugerencia para confirmar el lugar.' : 'No encontramos esa dirección. Prueba con más datos (ciudad, barrio).');
          $f('#sug').innerHTML = sug.map((s, i) => `<li><button type="button" data-i="${i}" class="w-full text-left px-4 py-3 text-sm border-b border-white/10 last:border-0">${esc(s.texto)}</button></li>`).join('');
        } catch (err) { estado(GG.mensaje(err)); }
      }, 650);
    });
    f.addEventListener('click', async e => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      const s = sug[+b.dataset.i]; $f('#sug').innerHTML = ''; estado('Ubicando…');
      try { lugar = await GG.lugar(s); $f('#c-dir').value = lugar.dir; estado('Ubicación confirmada ✓'); mostrarMapa(); actualizarClima(); }
      catch (err) { estado(GG.mensaje(err)); }
    });
    f.addEventListener('change', e => { if (e.target.name === 'fecha') actualizarClima(); });
    mostrarMapa(); if (lugar && !clima) actualizarClima(); else pintaClima('');
  }
  return () => ({ lugar, clima: clima && climaFecha === $f('#c-fecha')?.value ? clima : null });
}
