/**
 * Estilo de la ruta en el mapa (design.md de mostrar-ruta-e-indicaciones, decisiones 2 a 4, 8 y
 * 12). No importa Leaflet: lo usan también los tests de contraste y de orden de capas.
 */
import { PANES } from '../mapa/config.ts'
import { COLORES } from '../tema/tokens.ts'

export const ESTILO_RUTA = {
  borde: COLORES.primarioOscuro, // #174EA6
  relleno: COLORES.primario, // #1A73E8
  grosorBorde: 7,
  grosorRelleno: 4,
  /**
   * Tramos al aire libre: la misma línea continua, con el relleno en un celeste más claro. El
   * borde oscuro no cambia, así el trazo mantiene el contraste sobre la vereda.
   */
  rellenoAireLibre: '#7CB4F8',
} as const

export const ESTILO_ALTERNATIVA = {
  borde: '#5F6368',
  relleno: '#80868B',
  grosorBorde: 7,
  grosorRelleno: 4,
} as const

export const ESTILO_RESALTADO = {
  halo: COLORES.superficie,
  relleno: COLORES.primario,
  grosorRelleno: 6,
  /** Halo blanco de 2 px a cada lado del relleno. */
  grosorHalo: 10,
} as const

/**
 * Margen de toque a cada lado de la alternativa gris (px de pantalla): encima va una línea
 * invisible de `grosorBorde + 2 × TOLERANCIA_TOQUE` que recibe el toque.
 */
export const TOLERANCIA_TOQUE = 12

/** Zoom máximo del encuadre de una ruta: se leen los números de aula sin que quede gigante. */
export const ZOOM_MAXIMO_ENCUADRE = 0

/** Colores del plano contra los que se mide el contraste del trazo (WCAG 1.4.11). */
export const FONDOS_PLANO = { pasillo: '#FFD27C', vereda: '#FFFFFF' } as const

/**
 * Los mismos fondos con el plano en gris (`grayscale(1) contrast(0.9) brightness(1.04)`, en
 * `ruta.css`), que es como se ven mientras hay una ruta.
 */
export const FONDOS_PLANO_EN_GRIS = { pasillo: '#D5D5D5', vereda: '#FCFCFC' } as const

/**
 * Sala del lugar de destino, resaltada en lugar del pin (el plano queda en gris mientras hay una
 * ruta: ver `.mapa--con-ruta` en `ruta.css`).
 */
export const ESTILO_SALA_DESTINO = {
  relleno: COLORES.destino,
  opacidadRelleno: 0.55,
  borde: COLORES.destinoBorde,
  grosorBorde: 3,
} as const

/**
 * Panes propios de la ruta, de abajo hacia arriba: plano → cierres → sala de destino →
 * alternativa → ruta → resaltado → marcadores. `ruta` y `marcadores` son los del visor (`PANES`);
 * los otros se crean dentro de la capa.
 */
export const PANES_RUTA = {
  destino: { nombre: 'ruta-destino', zIndex: 430 },
  alternativa: { nombre: 'ruta-alternativa', zIndex: 440 },
  ruta: PANES.ruta,
  resaltado: { nombre: 'ruta-resaltado', zIndex: 460 },
  marcadores: PANES.marcadores,
} as const

export const ORDEN_CAPAS = [
  PANES.plano,
  PANES.cierres,
  PANES_RUTA.destino,
  PANES_RUTA.alternativa,
  PANES_RUTA.ruta,
  PANES_RUTA.resaltado,
  PANES_RUTA.marcadores,
] as const

/** Marcadores (decisión 4). */
export const MARCADOR_ORIGEN = { diametro: 16, borde: 3 } as const
export const MARCADOR_DESTINO = { ancho: 28, alto: 40 } as const
/** Punto en la puerta de destino cuando la sala está resaltada (reemplaza al pin). */
export const MARCADOR_PUERTA_DESTINO = { diametro: 10, borde: 2 } as const
