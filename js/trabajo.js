/* ===== Claqueta · ventana Trabajo (detalle de un trabajo agendado) =====  trabajo.html?id=ID */
const V = $('#vista'), id = new URLSearchParams(location.search).get('id');
let auto = false;   // el pronóstico se refresca solo una vez por visita
async function actualizarClima(t, silencioso) {
  try { const k = await Goog.pronostico(t.lat, t.lng, t.fecha); if (k) { t.clima = k; save(); trabajo(); if (!silencioso) aviso(t.eventoId ? 'Pronóstico actualizado. Toca «Actualizar evento» para llevarlo a tu Calendar.' : 'Pronóstico actualizado'); } else if (!silencioso) aviso('No hay pronóstico para esa fecha.'); }
  catch (e) { if (!silencioso) aviso(Goog.mensaje(e)); }
}
const climaHtml = t => t.clima ? `<p class="font-bold">${esc(t.clima.condicion)}</p><p class="num">Mín. ${t.clima.min}° · Máx. ${t.clima.max}° · Lluvia ${t.clima.lluvia}%</p><p class="text-xs muted mt-1">Actualizado ${new Date(t.clima.consultadoEn).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>`
  : t.lat == null ? '<p class="muted">Elige una dirección con ubicación (al editar el trabajo) para ver el pronóstico.</p>'
  : typeof Goog !== 'undefined' && !Goog.climaDisponible(t.fecha) ? '<p class="muted">El pronóstico estará disponible desde 15 días antes del trabajo.</p>' : '<p class="muted">Sin pronóstico por ahora.</p>';
const rel = f => { const n = Math.round((new Date(f + 'T00:00') - new Date(hoy() + 'T00:00')) / 864e5); return n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : n > 1 ? `En ${n} días` : 'Ya pasó'; };

function trabajo() {
  const t = S.trabajos.find(x => x.id === id); if (!t) return V.innerHTML = noEncontrado('agenda.html');
  const c = S.cots.find(x => x.id === t.cotId) || {}, cl = cli(c.clienteId);
  const ruta = t.lat != null ? `${t.lat},${t.lng}` : t.dir;
  const puedeClima = t.lat != null && typeof Goog !== 'undefined' && Goog.climaDisponible(t.fecha);
  const notas = (t.notas || '').split('\n').filter(Boolean);
  V.innerHTML = `<div class="flex items-center justify-between gap-3 mt-6 mb-6 entra" style="--i:1"><div class="flex items-center gap-3">${volver('agenda.html', 'la agenda')}<p class="muted text-sm">Trabajo agendado</p></div><span class="chip chip-enviada">${rel(t.fecha)}</span></div>
    <div class="entra" style="--i:2"><h1 class="text-3xl font-extrabold leading-tight tracking-tight break-words">${esc(c.titulo)}</h1>
      <a href="clientes.html?id=${c.clienteId}" class="text-menta font-bold">${esc(cl.nombre)}</a>
      <p class="mt-2"><span class="cap block">${fdl(t.fecha)}</span><span class="muted num">${hora(t.ini)} – ${hora(t.fin)}</span></p></div>

    <section class="cristal bloque mt-5 entra" style="--i:3" aria-labelledby="t-u"><h2 id="t-u" class="font-extrabold">Ubicación</h2>
      <p class="mt-1 ${t.dir ? '' : 'muted'}">${esc(t.dir) || 'Sin dirección. Edita el trabajo para agregarla.'}</p>
      ${t.lat != null ? '<div id="mapa" class="mapa h-44 rounded-2xl overflow-hidden mt-3"></div>' : ''}
      ${ruta ? `<div class="grid grid-cols-2 gap-3 mt-4"><a class="btn btn-p" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ruta)}">Cómo llegar</a><button class="btn btn-s" id="copiar">Copiar dirección</button></div>` : ''}${t.lat == null && t.dir && typeof Goog !== 'undefined' ? '<button class="btn btn-s w-full mt-3" id="ubicar">Ubicar en el mapa</button>' : ''}</section>

    <section class="cristal bloque mt-3 entra" style="--i:4" aria-labelledby="t-c"><h2 id="t-c" class="font-extrabold">Pronóstico del día</h2>
      <div id="clima" class="mt-1">${climaHtml(t)}</div>${puedeClima ? '<button class="btn btn-s mt-3" id="actClima">Actualizar pronóstico</button>' : ''}</section>

    <section class="cristal bloque mt-3 entra" style="--i:5" aria-labelledby="t-n"><h2 id="t-n" class="font-extrabold">Notas y recordatorios</h2>
      ${notas.length ? `<ul class="grid gap-1.5 mt-2">${notas.map(l => `<li class="flex gap-2"><span class="text-menta" aria-hidden="true">•</span><span>${esc(l)}</span></li>`).join('')}</ul>` : '<p class="muted mt-1">Sin notas. Edita el trabajo para agregar lo que debes llevar.</p>'}</section>

    <section class="cristal bloque mt-3 entra" style="--i:6" aria-labelledby="t-g"><h2 id="t-g" class="font-extrabold">Google Calendar</h2>
      <p id="gcal" class="text-sm muted mt-1">${t.eventoId ? 'Este trabajo ya está en tu Google Calendar.' : googleListo() ? 'Este trabajo aún no está en tu Google Calendar.' : 'Este trabajo aún no está en tu Google Calendar. Conecta tu cuenta en Ajustes.'}</p>
      ${googleListo() || t.eventoId ? `<div class="grid grid-cols-2 gap-3 mt-4">${t.eventoLink ? `<a class="btn btn-s" target="_blank" rel="noopener" href="${esc(t.eventoLink)}">Abrir en Calendar</a>` : ''}<button class="btn ${t.eventoId ? 'btn-s' : 'btn-p col-span-2'}" id="evento" ${googleListo() ? '' : 'disabled'}>${t.eventoId ? 'Actualizar evento' : 'Crear evento en Calendar'}</button></div>` : ''}</section>

    <div class="grid gap-3 mt-5 entra" style="--i:7"><a class="btn btn-s" href="cotizar.html?id=${t.cotId}">Ver cotización</a>
      <div class="grid grid-cols-2 gap-3"><button class="btn btn-s" id="editar">Editar trabajo</button><button class="btn btn-x" id="quitar">Quitar de la agenda</button></div></div>`;

  $('#copiar')?.addEventListener('click', () => navigator.clipboard?.writeText(t.dir || ruta).then(() => aviso('Dirección copiada'), () => aviso('No se pudo copiar.')));
  if (t.lat != null && typeof Goog !== 'undefined') Goog.mapa($('#mapa'), t.lat, t.lng).catch(() => { const m = $('#mapa'); if (m) m.innerHTML = '<p class="muted text-sm p-3">No se pudo cargar el mapa.</p>'; });
  $('#actClima')?.addEventListener('click', () => actualizarClima(t, false));
  $('#ubicar')?.addEventListener('click', async () => {   // busca la dirección escrita y guarda sus coordenadas
    aviso('Buscando…');
    try { const r = await Goog.sugerencias(t.dir); if (!r.length) return aviso('No encontramos esa dirección. Edita el trabajo y elige una sugerencia.'); const l = await Goog.lugar(r[0]); Object.assign(t, { lat: l.lat, lng: l.lng, placeId: l.placeId }); delete t.clima; save(); trabajo(); }
    catch (e) { aviso(Goog.mensaje(e)); }
  });
  if (!auto && puedeClima && (!t.clima || Date.now() - Date.parse(t.clima.consultadoEn) > 3 * 36e5)) { auto = true; actualizarClima(t, true); }
  $('#evento')?.addEventListener('click', async () => {
    aviso('Guardando en Calendar…');
    try { await Goog.guardarEvento(t); aviso('Evento guardado en tu Google Calendar'); trabajo(); } catch (e) { aviso(Goog.mensaje(e)); }
  });
  $('#editar').onclick = () => agendar(t.cotId, trabajo);
  $('#quitar').onclick = async () => {
    if (!await confirmar({ titulo: '¿Quitar de la agenda?', texto: 'La cotización seguirá aceptada y podrás agendarla de nuevo.' + (t.eventoId ? (googleListo() ? ' También se borrará el evento de tu Google Calendar.' : ' El evento seguirá en tu Calendar porque tu cuenta no está conectada.') : ''), boton: 'Quitar', peligro: true })) return;
    if (t.eventoId && googleListo()) try { await Goog.borrarEvento(t); } catch { aviso('El evento no se pudo borrar de Calendar; bórralo a mano.'); }
    S.trabajos = S.trabajos.filter(x => x.id !== t.id); save(); location.href = 'agenda.html';
  };
}
trabajo();
