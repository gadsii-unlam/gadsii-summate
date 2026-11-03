/** Ayudas para los tests de componentes: la pantalla con el catálogo de prueba y el doble del mapa. */
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PlanoBase } from '../../datos/index.ts'
import { CATALOGO_DE_PRUEBA } from '../../test/catalogoDePrueba.ts'
import { crearCatalogoUI } from '../catalogo.ts'
import { crearAlmacenEnMemoria } from '../estado/almacen.ts'
import type { Almacen } from '../estado/almacen.ts'
import type { Integraciones } from '../integraciones.ts'
import MapaDoble from '../mapa/MapaDoble.tsx'
import Pantalla from '../Pantalla.tsx'

export const PLANO_DE_PRUEBA: PlanoBase = {
  version: 'prueba',
  ancho: 2810,
  alto: 3745,
  url: '/data/mapa-base.svg',
  respaldo: { url: '/data/mapa-base.webp', escala: 1, ancho: 2810, alto: 3745 },
}

export interface OpcionesRender {
  integraciones?: Partial<Integraciones>
  almacen?: Almacen
  hash?: string
}

export function renderizarPantalla({ integraciones, almacen, hash = '' }: OpcionesRender = {}) {
  window.history.replaceState(null, '', `/${hash}`)
  const alm = almacen ?? crearAlmacenEnMemoria()
  const usuario = userEvent.setup()
  const catalogo = crearCatalogoUI(CATALOGO_DE_PRUEBA)
  const resultado = render(
    <Pantalla
      catalogo={catalogo}
      plano={PLANO_DE_PRUEBA}
      Mapa={MapaDoble}
      almacen={alm}
      {...(integraciones ? { integraciones } : {})}
    />,
  )
  return { ...resultado, usuario, almacen: alm, catalogo }
}

/** Espera el `popstate` que dispara `history.back()` / `go()` en jsdom. */
export function esperarPopstate(): Promise<void> {
  return new Promise((r) => window.addEventListener('popstate', () => r(), { once: true }))
}
