/**
 * Espejo en TypeScript de los colores de `tokens.css` que necesita Leaflet (marcadores) y de los
 * pares texto/fondo que la interfaz declara. Si cambia un valor en el CSS, hay que cambiarlo acá:
 * el test `tokens.test.ts` compara los dos archivos.
 */
export const COLORES = {
  primario: '#1A73E8',
  primarioOscuro: '#174EA6',
  sobrePrimario: '#FFFFFF',
  destino: '#EA4335',
  destinoBorde: '#B31412',
  errorTexto: '#C5221F',
  superficie: '#FFFFFF',
  superficieVariante: '#F1F3F4',
  borde: '#DADCE0',
  texto: '#202124',
  textoSecundario: '#5F6368',
  fondoMapa: '#F8F8F8',
  /** Acción sobre la barra oscura "Sin conexión" (tolerar-senal-irregular). */
  primarioSobreOscuro: '#8AB4F8',
} as const

export type NombreColor = keyof typeof COLORES

/** Colores de los marcadores del mapa (pin de destino y círculo de origen). */
export const COLORES_MARCADORES = {
  destino: COLORES.destino,
  destinoBorde: COLORES.destinoBorde,
  origen: COLORES.primario,
  origenBorde: COLORES.superficie,
} as const

/**
 * Pares texto/fondo que usa la interfaz. Todos tienen que cumplir 4,5:1 (WCAG AA, texto normal).
 * `destino` no aparece como texto: es solo gráfico.
 */
export const PARES_TEXTO: ReadonlyArray<readonly [texto: NombreColor, fondo: NombreColor]> = [
  ['texto', 'superficie'],
  ['texto', 'superficieVariante'],
  ['texto', 'fondoMapa'],
  ['textoSecundario', 'superficie'],
  ['textoSecundario', 'superficieVariante'],
  ['errorTexto', 'superficie'],
  ['primario', 'superficie'],
  ['primarioOscuro', 'superficie'],
  ['sobrePrimario', 'primario'],
  ['sobrePrimario', 'primarioOscuro'],
  // Barra "Sin conexión": texto claro y acción celeste sobre fondo oscuro (`--color-texto`).
  ['superficie', 'texto'],
  ['primarioSobreOscuro', 'texto'],
]

/** Luminancia relativa (WCAG 2.1). */
export function luminancia(hex: string): number {
  const valor = hex.replace('#', '')
  const canales = [0, 2, 4].map((i) => parseInt(valor.slice(i, i + 2), 16) / 255)
  const [r, g, b] = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

/** Relación de contraste entre dos colores (de 1 a 21). */
export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return ((claro ?? 0) + 0.05) / ((oscuro ?? 0) + 0.05)
}
