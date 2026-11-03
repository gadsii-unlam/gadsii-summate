import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CLAVES, crearAlmacenEnMemoria } from '../estado/almacen.ts'
import { renderizarPantalla } from '../test/renderizar.tsx'
import BotonInstalar from './BotonInstalar.tsx'
import { ContextoConexion, type ValorConexion } from './contexto.ts'
import OpcionInstalar from './OpcionInstalar.tsx'
import type { Instalacion } from './useInstalacion.ts'

const NOMBRE = 'Instalar app'

/** `BotonInstalar` con un valor de conexión mínimo (solo lo que usa el botón). */
function conInstalacion(instalacion: Partial<Instalacion>, hayRutaEnPantalla = false) {
  const valor = {
    hayRutaEnPantalla,
    instalacion: {
      plataforma: 'otra',
      puedeInstalar: false,
      instalar: () => Promise.resolve(false),
      ...instalacion,
    },
  } as unknown as ValorConexion
  return function BotonDePrueba() {
    return (
      <ContextoConexion.Provider value={valor}>
        <BotonInstalar />
      </ContextoConexion.Provider>
    )
  }
}

function sinPrimerUso() {
  const almacen = crearAlmacenEnMemoria()
  almacen.escribir(CLAVES.primerUsoCerrado, true)
  return almacen
}

describe('BotonInstalar', () => {
  it('con Chrome ofreciendo instalar, el botón flotante abre el diálogo del sistema', async () => {
    const instalar = vi.fn(() => Promise.resolve(true))
    const { usuario } = renderizarPantalla({
      almacen: sinPrimerUso(),
      integraciones: { BotonInstalar: conInstalacion({ puedeInstalar: true, instalar }) },
    })
    await usuario.click(screen.getByRole('button', { name: NOMBRE }))
    expect(instalar).toHaveBeenCalledTimes(1)
  })

  it('en Safari para iOS abre la ayuda con los pasos de Compartir', async () => {
    const { usuario } = renderizarPantalla({
      almacen: sinPrimerUso(),
      integraciones: {
        BotonInstalar: conInstalacion({ plataforma: 'ios' }),
        ExtraAyuda: () => (
          <OpcionInstalar plataforma="ios" puedeInstalar={false} onInstalar={() => {}} />
        ),
      },
    })
    await usuario.click(screen.getByRole('button', { name: NOMBRE }))
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Agregar a la pantalla de inicio' })).toBeVisible()
  })

  it('no aparece instalada, sin evento, con una ruta en pantalla ni en el primer uso', () => {
    const casos = [
      { BotonInstalar: conInstalacion({ plataforma: 'instalada', puedeInstalar: true }) },
      { BotonInstalar: conInstalacion({ puedeInstalar: false }) },
      { BotonInstalar: conInstalacion({ puedeInstalar: true }, true) },
    ]
    for (const integraciones of casos) {
      const { unmount } = renderizarPantalla({ almacen: sinPrimerUso(), integraciones })
      expect(screen.queryByRole('button', { name: NOMBRE })).toBeNull()
      unmount()
    }
    renderizarPantalla({
      integraciones: { BotonInstalar: conInstalacion({ puedeInstalar: true }) },
    })
    expect(screen.queryByRole('button', { name: NOMBRE })).toBeNull()
  })
})
