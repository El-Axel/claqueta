/* ===== Claqueta · núcleo compartido =====
   Todas las ventanas cargan este archivo. Los datos viven en localStorage
   (en este prototipo el navegador hace de base de datos). */
const K = 'claqueta-v1';
const VERSION = '1.0.8';   // se muestra al pie de Ajustes para saber qué versión está publicada
/* Carga segura: si los datos están dañados o incompletos, se completan con valores por defecto
   (y se guarda una copia de lo dañado por si hiciera falta recuperarlo). */
const S = (() => {
  const base = { cfg: { tarifa: 60000 }, clientes: [], equipos: [], cots: [], trabajos: [], pagos: [] };
  let d = null;
  try { d = JSON.parse(localStorage.getItem(K)); }
  catch { try { localStorage.setItem(K + '-corrupto', localStorage.getItem(K)); } catch { /* sin almacenamiento */ } }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return base;
  for (const k of Object.keys(base)) if (d[k] == null || typeof d[k] !== typeof base[k] || Array.isArray(d[k]) !== Array.isArray(base[k])) d[k] = base[k];
  if (!(d.cfg.tarifa >= 0)) d.cfg.tarifa = 60000;
  return d;
})();
const save = () => {
  try { localStorage.setItem(K, JSON.stringify(S)); }
  catch { window.aviso?.('No se pudo guardar: el almacenamiento del navegador no está disponible.'); }
};

const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9);
// Fecha de hoy en hora local (YYYY-MM-DD), no en UTC
const hoy = (d = new Date()) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const cop = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
const cli = id => S.clientes.find(c => c.id === id) || { nombre: '—', correo: '' };

/* Fórmula: horas × tarifa + equipos (tarifa por día × días) + otros costos − descuento */
const calc = c => {
  const t = c.horas * c.tarifa, e = c.items.reduce((a, i) => a + i.dias * i.tarifa, 0);
  const sub = t + e + (+c.otros || 0), d = sub * (c.desc || 0) / 100;
  return { t, e, sub, d, total: Math.round(sub - d) };
};
/* El saldo no se guarda: se calcula (cotizaciones aceptadas − pagos) */
const acordado = id => S.cots.filter(c => c.clienteId === id && c.estado === 'aceptada').reduce((a, c) => a + c.total, 0);
const pagado = id => S.pagos.filter(p => p.clienteId === id).reduce((a, p) => a + p.monto, 0);
const saldo = id => acordado(id) - pagado(id);
