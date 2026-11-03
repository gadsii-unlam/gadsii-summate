import { describe, expect, it } from 'vitest'
import {
  nombreChip,
  notaRutaUnicaConLluvia,
  redondearDistancia,
  textoAireLibre,
  textoAnuncioRuta,
  textoDistancia,
  textoResumen,
} from './formato.ts'

describe('redondeo de distancias a 5 m', () => {
  it.each([
    [163, '165 m'],
    [31.4, '30 m'],
    [12.6, '15 m'],
    [2.9, '5 m'],
    [17.5, '20 m'],
    [0, '5 m'],
    [1234, '1,2 km'],
  ])('%s m → %s', (metros, texto) => {
    expect(textoDistancia(metros)).toBe(texto)
  })

  it('las mitades van hacia arriba y el mínimo es 5 m', () => {
    expect(redondearDistancia(162.5)).toBe(165)
    expect(redondearDistancia(162.49)).toBe(160)
    expect(redondearDistancia(0.1)).toBe(5)
  })
})

describe('metros al aire libre', () => {
  it.each([
    [62, 'Incluye 60 m al aire libre'],
    [62.4, 'Incluye 60 m al aire libre'],
    [2, 'Incluye 5 m al aire libre'],
    [0, 'Todo bajo techo'],
  ])('%s m → %s', (metros, texto) => {
    expect(textoAireLibre(metros)).toBe(texto)
  })

  it('resumen y anuncio de la ruta de ejemplo', () => {
    const ruta = { tiempoMin: 2, distanciaM: 163.4, exteriorM: 62.4 }
    expect(textoResumen(ruta)).toBe('2 min · 165 m')
    expect(textoAnuncioRuta(ruta)).toBe('Ruta encontrada: 2 min, 165 m, incluye 60 m al aire libre')
    expect(textoAnuncioRuta({ ...ruta, exteriorM: 0 })).toBe(
      'Ruta encontrada: 2 min, 165 m, todo bajo techo',
    )
  })
})

describe('nombres de los chips y texto de ruta única', () => {
  it.each([
    ['resguardada', 0, 'Techada'],
    ['resguardada', 40, 'Más resguardada'],
    ['mas-corta', 0, 'Más rápida'],
    ['mas-corta', 60, 'Más rápida'],
  ] as const)('%s con %s m afuera → %s', (criterio, exteriorM, nombre) => {
    expect(nombreChip(criterio, exteriorM)).toBe(nombre)
  })

  it.each([
    [0, 'Ya es techada'],
    [2, 'Es la opción más resguardada'],
  ])('ruta única con lluvia y %s m afuera → %s', (exteriorM, nota) => {
    expect(notaRutaUnicaConLluvia(exteriorM)).toBe(nota)
  })
})
