/* ===== Claqueta · conexión con Google (Calendar, Gmail, Maps) y con el clima =====
   Todo se activa solo si js/config.js tiene las claves. Si algo falla, la app sigue funcionando. */
const Goog = (() => {
  const C = typeof CONFIG !== 'undefined' ? CONFIG : {};
  const ZONA = C.ZONA_HORARIA || 'America/Bogota', KT = 'claqueta-gtoken';
  const SCOPES = 'openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.events';
  const CAL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const GIS = 'https://accounts.google.com/gsi/client';
  const hayGoogle = () => !!C.GOOGLE_CLIENT_ID, hayMapas = () => !!C.GOOGLE_API_KEY;
  const script = src => new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('RED')); document.head.append(s); });
  const falla = r => Object.assign(new Error('HTTP ' + r.status), { estado: r.status });
  const pedir = async (url, o) => { try { return await fetch(url, o); } catch { throw new Error('RED'); } };

  /* ---------- Sesión: el token vive solo en sessionStorage y dura cerca de 1 hora ---------- */
  const token = () => { try { const t = JSON.parse(sessionStorage.getItem(KT)); return t && t.vence > Date.now() + 30000 ? t.token : null; } catch { return null; } };
  const conectado = () => !!token();
  async function conectar() {
    if (!hayGoogle()) throw new Error('CONFIG');
    if (!window.google?.accounts?.oauth2) await script(GIS);   // normalmente ya está cargado desde que se abrió la página
    await new Promise((ok, mal) => google.accounts.oauth2.initTokenClient({
      client_id: C.GOOGLE_CLIENT_ID, scope: SCOPES,
      callback: r => { if (r.error) return mal(new Error(r.error)); sessionStorage.setItem(KT, JSON.stringify({ token: r.access_token, vence: Date.now() + r.expires_in * 1000 })); ok(); },
      error_callback: e => mal(new Error(e?.type || 'cancelado'))
    }).requestAccessToken());
    try { const p = await api('https://www.googleapis.com/oauth2/v3/userinfo'); S.cfg.google = { nombre: p.name, correo: p.email, foto: p.picture }; save(); } catch { /* el perfil es opcional */ }
  }
  function desconectar() {
    const t = token(); if (t) try { google.accounts.oauth2.revoke(t); } catch { /* sin conexión */ }
    sessionStorage.removeItem(KT); delete S.cfg.google; save();
  }
  async function api(url, o = {}) {   // llamada a Google con el token
    const t = token(); if (!t) throw Object.assign(new Error('SESION'), { estado: 401 });
    const r = await pedir(url, { ...o, headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', ...o.headers } });
    if (r.status === 401) sessionStorage.removeItem(KT);
    if (!r.ok) throw falla(r);
    return r.status === 204 ? null : r.json();
  }
  const mensaje = e => e.message === 'RED' ? 'Parece que no hay internet. Revisa tu conexión e inténtalo de nuevo.'
    : e.estado === 401 || e.message === 'SESION' ? 'Tu sesión de Google venció. Vuelve a conectarla en Ajustes.'
    : e.estado === 403 ? 'Google no permitió la acción. Revisa que la API esté habilitada y los permisos.' : 'Algo salió mal. Inténtalo de nuevo.';

  /* ---------- Gmail: envío real de la cotización ---------- */
  const b64 = s => { let b = ''; new TextEncoder().encode(s).forEach(x => b += String.fromCharCode(x)); return btoa(b); };
  const b64mime = s => b64(s).replace(/.{1,76}/g, '$&\r\n').trim();   // líneas de 76 caracteres, como pide el estándar de correo
  const b64url = s => b64(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function textoCotizacion(c, cl) {
    const x = calc(c), l = [`Hola ${cl.nombre},`, '', `Te comparto la cotización #${c.n} «${c.titulo}».`, '', 'Detalle:', `- Tiempo: ${c.horas} h × ${cop(c.tarifa)} = ${cop(x.t)}`,
      ...c.items.map(i => `- ${i.nombre} (${plural(i.dias, 'día', 'días')}): ${cop(i.dias * i.tarifa)}`)];
    if (c.otros) l.push(`- Otros costos: ${cop(c.otros)}`);
    if (c.desc) l.push(`- Descuento ${c.desc}%: − ${cop(x.d)}`);
    l.push('', `Total: ${cop(c.total)}`, '', 'Quedo atento a tu respuesta.', S.cfg.google?.nombre || '');
    return { asunto: `Cotización #${c.n} · ${c.titulo}`, cuerpo: l.join('\n') };
  }
  async function enviarCotizacion(c, cl) {
    if (!emailOk(cl.correo)) throw new Error('CORREO');
    const { asunto, cuerpo } = textoCotizacion(c, cl);
    const raw = ['To: ' + cl.correo, `Subject: =?UTF-8?B?${b64(asunto)}?=`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', b64mime(cuerpo)].join('\r\n');
    const r = await api('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', body: JSON.stringify({ raw: b64url(raw) }) });
    return { mensajeId: r.id };
  }

  /* ---------- Calendar: el trabajo aparece en tu calendario real ---------- */
  const descripcion = (t, c, cl) => [`Cliente: ${cl.nombre}`, `Cotización #${c.n}: ${c.titulo}`,
    t.clima ? `Clima: ${t.clima.condicion}, ${t.clima.min}°–${t.clima.max}°, lluvia ${t.clima.lluvia}%` : '',
    t.notas ? `\nQué llevar:\n${t.notas.split('\n').filter(Boolean).map(n => '• ' + n).join('\n')}` : '', '\nCreado con Claqueta'].filter(Boolean).join('\n');
  async function guardarEvento(t) {   // crea el evento o, si ya existe, lo actualiza
    const c = S.cots.find(x => x.id === t.cotId), cl = cli(c.clienteId);
    const cuerpo = JSON.stringify({ summary: `${c.titulo} · ${cl.nombre}`, location: t.dir || undefined, description: descripcion(t, c, cl),
      start: { dateTime: `${t.fecha}T${t.ini}:00`, timeZone: ZONA }, end: { dateTime: `${t.fecha}T${t.fin}:00`, timeZone: ZONA } });
    let r;
    if (t.eventoId) try { r = await api(`${CAL}/${t.eventoId}`, { method: 'PATCH', body: cuerpo }); } catch (e) { if (e.estado !== 404 && e.estado !== 410) throw e; }
    if (!r) r = await api(CAL, { method: 'POST', body: cuerpo });
    t.eventoId = r.id; t.eventoLink = r.htmlLink; save(); return r;
  }
  async function borrarEvento(t) {
    if (!t.eventoId) return;
    try { await api(`${CAL}/${t.eventoId}`, { method: 'DELETE' }); } catch (e) { if (e.estado !== 404 && e.estado !== 410) throw e; }
    delete t.eventoId; delete t.eventoLink;
  }

  /* ---------- Maps: Google (con clave) u OpenStreetMap (sin clave, gratis) ---------- */
  const nuevaSesion = () => crypto.randomUUID?.() || String(Math.random()); let sesion = nuevaSesion();   // agrupa las consultas de una misma búsqueda
  async function sugerencias(texto) {   // devuelve [{id, texto, lat?, lng?}]
    if (!hayMapas()) {   // sin clave de Google: OpenStreetMap (Nominatim), que ya trae las coordenadas
      const r = await pedir(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=es&countrycodes=${C.PAIS || 'co'}&q=${encodeURIComponent(texto)}`);
      if (!r.ok) throw falla(r);
      return (await r.json()).map(x => ({ id: String(x.place_id), texto: x.display_name, lat: +x.lat, lng: +x.lon }));
    }
    const r = await pedir('https://places.googleapis.com/v1/places:autocomplete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': C.GOOGLE_API_KEY },
      body: JSON.stringify({ input: texto, languageCode: 'es', includedRegionCodes: [C.PAIS || 'co'], sessionToken: sesion }) });
    if (!r.ok) throw falla(r);
    return ((await r.json()).suggestions || []).filter(s => s.placePrediction).map(s => ({ id: s.placePrediction.placeId, texto: s.placePrediction.text.text }));
  }
  async function lugar(s) {   // dirección completa y coordenadas de la sugerencia elegida
    if (typeof s === 'string') s = { id: s };
    if (s.lat != null) return { dir: s.texto, lat: s.lat, lng: s.lng, placeId: s.id };
    const r = await pedir(`https://places.googleapis.com/v1/places/${s.id}?languageCode=es&sessionToken=${sesion}`, { headers: { 'X-Goog-Api-Key': C.GOOGLE_API_KEY, 'X-Goog-FieldMask': 'id,formattedAddress,location' } });
    if (!r.ok) throw falla(r);
    const j = await r.json(); sesion = nuevaSesion();
    return { dir: j.formattedAddress, lat: j.location.latitude, lng: j.location.longitude, placeId: j.id };
  }
  const leaflet = () => window.L ? Promise.resolve() : new Promise((ok, mal) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.append(l);
    script('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js').then(ok, mal);
  });
  async function mapa(el, lat, lng) {   // dibuja el mapa con un marcador dentro del elemento «el»
    el._m?.remove?.(); el._m = null; el.innerHTML = '';
    if (hayMapas()) {
      if (!window.google?.maps?.importLibrary) await script(`https://maps.googleapis.com/maps/api/js?key=${C.GOOGLE_API_KEY}&loading=async&v=weekly`);
      const { Map } = await google.maps.importLibrary('maps'), { Marker } = await google.maps.importLibrary('marker');
      new Marker({ position: { lat, lng }, map: new Map(el, { center: { lat, lng }, zoom: 16, disableDefaultUI: true, gestureHandling: 'cooperative' }) });
    } else {
      await leaflet();
      const m = L.map(el, { zoomControl: false }).setView([lat, lng], 16);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m); L.marker([lat, lng]).addTo(m); el._m = m;
    }
  }

  /* ---------- Clima (Open-Meteo: sin clave; pronóstico de hoy a 15 días) ---------- */
  const WMO = c => c === 0 ? 'Despejado' : c <= 2 ? 'Parcialmente nublado' : c === 3 ? 'Nublado' : c <= 48 ? 'Niebla' : c <= 57 ? 'Llovizna' : c <= 67 ? 'Lluvia' : c <= 77 ? 'Nieve' : c <= 82 ? 'Chubascos' : c <= 86 ? 'Chubascos de nieve' : 'Tormenta eléctrica';
  const climaDisponible = f => { const n = Math.round((new Date(f + 'T00:00') - new Date(hoy() + 'T00:00')) / 864e5); return n >= 0 && n <= 15; };
  async function pronostico(lat, lng, f) {   // devuelve null si la fecha está fuera del rango del servicio
    if (!climaDisponible(f)) return null;
    const r = await pedir(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=${encodeURIComponent(ZONA)}&start_date=${f}&end_date=${f}`);
    if (!r.ok) throw falla(r);
    const d = (await r.json()).daily; if (!d?.time?.length) return null;
    return { condicion: WMO(d.weather_code[0]), min: Math.round(d.temperature_2m_min[0]), max: Math.round(d.temperature_2m_max[0]), lluvia: Math.round(d.precipitation_probability_max[0] ?? 0), consultadoEn: new Date().toISOString() };
  }

  // Se precarga el script de inicio de sesión: así la ventana de Google se abre al instante con el clic
  // (si se cargara después del clic, algunos navegadores, sobre todo Safari, la bloquean como «ventana emergente»)
  if (hayGoogle() && !window.google?.accounts?.oauth2) script(GIS).catch(() => { /* se reintenta al conectar */ });

  return { hayGoogle, hayMapas, conectado, conectar, desconectar, mensaje, textoCotizacion, enviarCotizacion, guardarEvento, borrarEvento, sugerencias, lugar, mapa, climaDisponible, pronostico };
})();
