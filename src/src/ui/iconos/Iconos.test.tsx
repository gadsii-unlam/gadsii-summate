import { render } from '@testing-library/react'
import type { ComponentType } from 'react'
import { describe, expect, it } from 'vitest'
import { CATEGORIAS_LUGAR } from '../../datos/index.ts'
import * as Iconos from './Iconos.tsx'
import type { PropsIcono } from './Iconos.tsx'
import fuente from './Iconos.tsx?raw'

const simples = Object.entries(Iconos).filter(
  ([nombre]) => nombre.startsWith('Icono') && nombre !== 'IconoCategoria',
) as Array<[string, ComponentType<PropsIcono>]>

describe('íconos', () => {
  it('hay un ícono para cada uso pedido', () => {
    const nombres = simples.map(([n]) => n)
    for (const n of [
      'IconoLupa',
      'IconoDirecciones',
      'IconoIntercambiar',
      'IconoRecentrar',
      'IconoAyuda',
      'IconoCerrar',
      'IconoVolver',
      'IconoOrigen',
      'IconoPin',
    ]) {
      expect(nombres).toContain(n)
    }
  })

  it.each(simples)(
    '%s es decorativo sin título y tiene nombre accesible con título',
    (_, Icono) => {
      const { container, rerender } = render(<Icono />)
      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
      rerender(<Icono titulo="Nombre" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('role', 'img')
      expect(svg).toHaveAttribute('aria-label', 'Nombre')
      expect(svg).not.toHaveAttribute('aria-hidden')
    },
  )

  it.each(CATEGORIAS_LUGAR)('la categoría %s tiene ícono decorativo', (categoria) => {
    const { container } = render(<Iconos.IconoCategoria categoria={categoria} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('no incluye logos, nombres ni marcas de terceros', () => {
    expect(fuente).not.toMatch(/google|apple|android|<image|xlink:href|href=/i)
  })
})
