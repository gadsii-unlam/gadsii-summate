import { describe, expect, it } from 'vitest'
import { contraste } from '../tema/tokens.ts'
import {
  ESTILO_ALTERNATIVA,
  ESTILO_RUTA,
  ESTILO_SALA_DESTINO,
  FONDOS_PLANO,
  FONDOS_PLANO_EN_GRIS,
} from './estilo.ts'

// WCAG 1.4.11: contraste no textual de al menos 3:1 contra los colores claros del plano.
describe('contraste del trazo de la ruta', () => {
  it.each([
    ['borde de la ruta', ESTILO_RUTA.borde, FONDOS_PLANO.pasillo],
    ['borde de la ruta', ESTILO_RUTA.borde, FONDOS_PLANO.vereda],
    ['gris de la alternativa', ESTILO_ALTERNATIVA.relleno, FONDOS_PLANO.vereda],
    ['borde de la alternativa', ESTILO_ALTERNATIVA.borde, FONDOS_PLANO.vereda],
    // Con el plano en gris (mientras hay una ruta).
    ['borde de la ruta', ESTILO_RUTA.borde, FONDOS_PLANO_EN_GRIS.pasillo],
    ['borde de la ruta', ESTILO_RUTA.borde, FONDOS_PLANO_EN_GRIS.vereda],
    ['borde de la alternativa', ESTILO_ALTERNATIVA.borde, FONDOS_PLANO_EN_GRIS.pasillo],
    ['borde de la sala de destino', ESTILO_SALA_DESTINO.borde, FONDOS_PLANO_EN_GRIS.pasillo],
  ])('%s %s contra %s ≥ 3:1', (_, color, fondo) => {
    expect(contraste(color, fondo)).toBeGreaterThanOrEqual(3)
  })
})
