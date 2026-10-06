/* ===== Claqueta · configuración de Google =====
   Llena estos valores TÚ, en este archivo. No los pegues en el chat ni los subas a un repositorio público.
   Si un valor queda vacío, esa función se desactiva y la app sigue funcionando sin ella. */
const CONFIG = {
  GOOGLE_CLIENT_ID: '',   // ID de cliente OAuth (termina en .apps.googleusercontent.com): sirve para Gmail y Calendar
  GOOGLE_API_KEY: '',     // clave de API restringida: sirve para Maps y Places (y para el clima si eliges 'google')
  CLIMA: 'open-meteo',    // 'open-meteo' (sin clave ni facturación) o 'google' (Google Weather API)
  PAIS: 'co',             // limita las sugerencias de dirección a un país (Colombia)
  ZONA_HORARIA: 'America/Bogota'
};
