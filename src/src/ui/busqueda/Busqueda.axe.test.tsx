import { screen } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import { TEXTOS } from '../textos.ts'
import { renderizarPantalla } from '../test/renderizar.tsx'

async function violaciones(contexto: Element) {
  const r = await axe.run(contexto, {
    // jsdom no calcula colores ni layout: el contraste se revisa en e2e y con los tokens.
    rules: { 'color-contrast': { enabled: false } },
  })
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

describe('búsqueda: accesibilidad con axe', () => {
  it('sin violaciones con la lista vacía, con resultados y sin resultados', async () => {
    const { usuario } = renderizarPantalla()
    await usuario.click(screen.getByRole('button', { name: TEXTOS.barraNombre }))
    const dialogo = screen.getByRole('dialog')
    expect(await violaciones(dialogo)).toEqual([])
    await usuario.type(screen.getByRole('combobox'), '12')
    await usuario.keyboard('{ArrowDown}')
    expect(await violaciones(dialogo)).toEqual([])
    await usuario.clear(screen.getByRole('combobox'))
    await usuario.type(screen.getByRole('combobox'), 'zzz')
    expect(await violaciones(dialogo)).toEqual([])
  })

  it('la pantalla de inicio no tiene violaciones', async () => {
    const { container } = renderizarPantalla()
    expect(await violaciones(container)).toEqual([])
  })
})
