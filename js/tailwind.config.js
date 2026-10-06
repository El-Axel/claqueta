/* Paleta y fuentes de Claqueta para Tailwind (se carga justo después del CDN) */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        noche: '#0D1511',   // fondo base
        verde: '#2F7A55',   // tarjeta principal
        menta: '#5BE08A',   // acento: activo, progreso, botón principal
        hoja:  '#EEF2EC',   // texto principal
        alerta: '#FF8A6B',  // errores y acciones destructivas
        aviso: '#F2C25B'    // advertencias
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif']
      }
    }
  }
}
