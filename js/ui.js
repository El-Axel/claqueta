/* ===== Claqueta · componentes compartidos de interfaz ===== */
const fd = s => new Date(s + 'T00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
const chip = e => `<span class="chip chip-${e}">${e}</span>`;
const vacio = (t, b = '') => `<div class="cristal bloque text-center"><p class="muted">${t}</p>${b ? `<div class="mt-4">${b}</div>` : ''}</div>`;
const volver = (href, t) => `<a href="${href}" class="cristal btn-ic" aria-label="Volver a ${t}"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></a>`;
const noEncontrado = href => vacio('No encontramos lo que buscas. Puede que se haya eliminado.', `<a href="${href}" class="btn btn-s">Volver</a>`);
const emailOk = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/* Aviso breve (toast) */
let _t;
function aviso(txt) {
  let a = $('#aviso');
  if (!a) { a = document.createElement('div'); a.id = 'aviso'; a.className = 'aviso'; a.setAttribute('role', 'status'); a.setAttribute('aria-live', 'polite'); document.body.append(a); }
  a.textContent = txt; a.classList.add('on'); clearTimeout(_t); _t = setTimeout(() => a.classList.remove('on'), 2600);
}

/* Campo de formulario con su espacio de error */
const campo = (l, n, t = 'text', v = '', x = '') =>
  `<div class="mb-3"><label class="lbl" for="c-${n}">${l}</label><input class="inp" id="c-${n}" name="${n}" type="${t}" value="${esc(v)}" ${x}><p class="err" data-e="${n}"></p></div>`;

/* Muestra errores bajo cada campo: errores(contenedor, {nombre: 'mensaje'}) y devuelve false */
function errores(box, m) {
  box.querySelectorAll('.err').forEach(p => p.textContent = '');
  box.querySelectorAll('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
  for (const [n, t] of Object.entries(m)) {
    const p = box.querySelector(`[data-e="${n}"]`); if (p) p.textContent = t;
    box.querySelector(`[name="${n}"]`)?.setAttribute('aria-invalid', 'true');
  }
  box.querySelector('[aria-invalid]')?.focus();
  return false;
}

/* Hoja inferior. alGuardar(datos, formulario) puede devolver false para NO cerrar.
   Devuelve una promesa: true si se guardó, false si se cerró sin guardar. */
let _velo, _fin, _foco;
function abrirHoja(titulo, html, boton, alGuardar, peligro = false) {
  if (!_velo) {
    _velo = document.createElement('div'); _velo.className = 'velo';
    _velo.innerHTML = '<form class="hoja" role="dialog" aria-modal="true" aria-labelledby="h-t" novalidate></form>';
    document.body.append(_velo);
    _velo.addEventListener('click', e => { if (e.target === _velo) cerrarHoja(); });
    addEventListener('keydown', e => {
      if (!_velo.classList.contains('on')) return;
      if (e.key === 'Escape') return cerrarHoja();
      if (e.key !== 'Tab') return;   // el foco no se escapa de la hoja
      const el = [..._velo.querySelectorAll('button, input, select, textarea, a[href]')].filter(x => !x.disabled && x.getClientRects().length);
      if (!el.length) return;
      const a = el[0], z = el[el.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
  }
  _foco = document.activeElement;
  const f = _velo.firstChild;
  f.innerHTML = `<div class="asa"></div><div class="flex items-center justify-between mb-4"><h3 id="h-t" class="text-xl font-extrabold">${titulo}</h3><button type="button" class="cristal btn-ic" aria-label="Cerrar" data-x><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>${html}<button class="btn ${peligro ? 'btn-x' : 'btn-p'} w-full mt-2">${boton}</button>`;
  f.querySelector('[data-x]').onclick = () => cerrarHoja();
  f.onsubmit = e => { e.preventDefault(); if (alGuardar(Object.fromEntries(new FormData(f)), f) !== false) cerrarHoja(true); };
  requestAnimationFrame(() => { _velo.classList.add('on'); (f.querySelector('.inp') || f.querySelector('button.btn')).focus({ preventScroll: true }); });
  return new Promise(r => _fin = r);
}
function cerrarHoja(guardado = false) {
  if (!_velo || !_velo.classList.contains('on')) return;
  _velo.classList.remove('on'); _fin?.(guardado); _foco?.focus?.();
}

/* Confirmación (para acciones destructivas). Devuelve una promesa true/false */
const confirmar = ({ titulo, texto, boton = 'Confirmar', peligro = false }) =>
  abrirHoja(titulo, `<p class="muted mb-4">${texto}</p>`, boton, () => true, peligro);

/* ¿Hay sesión de Google lista? (se activa cuando exista js/google.js) */
const googleListo = () => typeof Goog !== 'undefined' && Goog.conectado();

/* Ayudas de maquetación compartidas */
const fila = (a, b, c = '') => `<div class="flex justify-between gap-3 ${c}"><span class="min-w-0">${a}</span><span class="num shrink-0">${b}</span></div>`;
const titulo = t => `<h1 class="text-[2.2rem] font-extrabold leading-none tracking-tight">${t}</h1>`;

/* Fechas y horas largas (para Agenda y Trabajo) */
const fdl = s => new Date(s + 'T00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const hora = s => new Date('2000-01-01T' + s).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

/* Si un archivo falla al cargar, en vez de dejar la pantalla en blanco se muestra el motivo */
window.__fallos = [];   // motivos de los archivos que no cargaron (los lee Ajustes y el diagnóstico)
addEventListener('error', e => {
  window.__fallos.push(e.target && e.target.tagName === 'SCRIPT' ? `no se pudo descargar ${e.target.getAttribute('src')}` : `${e.message || 'error'} (${String(e.filename || '').split('/').pop()}:${e.lineno || '?'})`);
  const v = document.getElementById('vista'); if (!v || v.children.length) return;
  const que = e.target && e.target.tagName === 'SCRIPT' ? `No se pudo cargar el archivo ${esc(e.target.getAttribute('src'))}.` : esc(e.message || 'Error desconocido.');
  v.innerHTML = vacio(`Algo salió mal al cargar esta ventana.<br><span class="text-xs">${que}</span><br><span class="text-xs">Sube de nuevo la carpeta completa y recarga con Ctrl + Shift + R. Abre <b>diagnostico.html</b> para ver qué falta.</span>`);
}, true);
