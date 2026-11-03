// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COLORES, PARES_TEXTO, contraste } from './tokens.ts'

// Todos los estilos y componentes de la interfaz, como texto (Vitest vacía los `.css?raw`).
const RUTAS = Object.keys(
  import.meta.glob(['../**/*.{css,ts,tsx}', '../../index.css', '!../**/*.test.*']),
)
const FUENTES: Record<string, string> = Object.fromEntries(
  RUTAS.map((r) => [r, readFileSync(new URL(r, import.meta.url), 'utf8')]),
)
const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

function variableCss(nombre: string): string | undefined {
  const m = new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})`).exec(css)
  return m?.[1]?.toUpperCase()
}

function aKebab(nombre: string): string {
  return nombre.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`)
}

describe('tokens visuales', () => {
  it('el espejo de TypeScript coincide con tokens.css', () => {
    for (const [nombre, valor] of Object.entries(COLORES)) {
      expect(variableCss(`color-${aKebab(nombre)}`), nombre).toBe(valor)
    }
  })

  it.each(PARES_TEXTO)('el texto %s sobre %s cumple 4,5:1', (texto, fondo) => {
    expect(contraste(COLORES[texto], COLORES[fondo])).toBeGreaterThanOrEqual(4.5)
  })

  it('el color del pin de destino no se usa como texto', () => {
    expect(PARES_TEXTO.some(([texto]) => texto === 'destino')).toBe(false)
    expect(Object.keys(FUENTES).length).toBeGreaterThan(10)
    const usos = Object.entries(FUENTES)
      .filter(([, texto]) => /(^|[^-])color:\s*var\(--color-destino\)/.test(texto))
      .map(([ruta]) => ruta)
    expect(usos).toEqual([])
  })

  // #80868B (3,7:1) está prohibido para texto (D3). La única excepción es gráfica: el relleno de la
  // ruta alternativa en el mapa (mostrar-ruta-e-indicaciones, decisión 8; 3,4:1 contra la vereda,
  // que cumple el 3:1 del contraste no textual).
  it('el gris #80868B no se usa como texto, solo como trazo de la ruta alternativa', () => {
    const usos = Object.entries(FUENTES)
      .filter(([, texto]) => /#80868b/i.test(texto))
      .map(([ruta]) => ruta)
    expect(usos).toEqual(['../ruta/estilo.ts'])
    const comoTexto = Object.entries(FUENTES)
      .filter(([, texto]) => /(^|[^-])color:\s*['"]?#80868b/i.test(texto))
      .map(([ruta]) => ruta)
    expect(comoTexto).toEqual([])
  })
})
