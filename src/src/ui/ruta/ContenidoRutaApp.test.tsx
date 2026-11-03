import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  crearControladorCierres,
  tramosDeCierres,
  type Cierre,
  type ControladorCierres,
} from '../../cierres/index.ts'
import {
  recomendar,
  type EstadoClima,
  type EstadoOrquestador,
  type OrquestadorRuta,
} from '../../clima/index.ts'
import { calcularRuta } from '../../rutas/index.ts'
import { grafoReal } from '../../rutas/test/datos-reales.ts'
import { ContextoCierres } from '../cierres/contexto.ts'
import { ContextoOrquestadorRuta } from '../clima/contexto.ts'
import { ContextoPantalla, type ValorPantalla } from '../estado/contexto.ts'
import { ContextoVistaPantalla } from '../estado/vistaPantalla.ts'
import { ContextoDatosIndicaciones, ContextoVistaRuta, crearVistaRuta } from './conexion.ts'
import ContenidoRutaApp from './ContenidoRutaApp.tsx'
import { CATALOGO_REAL, CLIMA, DATOS_REALES, lugarReal } from './test/datos.ts'

const OBRA: Cierre = {
  id: 'obra-entrada-400-500',
  motivo: 'Obra en la entrada oeste del pasillo 400/500',
  nodos: ['entrada-ed-este-400-500-lado-oeste'],
  aristas: [],
  desde: null,
  hasta: null,
  siempreVigente: false,
}
const ESCALERA: Cierre = {
  id: 'escalera-radio',
  motivo: 'Escalera junto a la Radio cerrada por mantenimiento',
  nodos: ['escalera-radio-planta-baja'],
  aristas: [],
  desde: null,
  hasta: null,
  siempreVigente: false,
}

function escenario(origenId: string, destinoId: string, cierres: Cierre[], clima: EstadoClima) {
  const grafo = grafoReal()
  const origen = lugarReal(origenId)
  const destino = lugarReal(destinoId)
  const controlador: ControladorCierres = crearControladorCierres({
    grafo,
    cierres,
    lugares: CATALOGO_REAL.lugares,
  })
  const excluidos = tramosDeCierres(controlador.estado().vigentes)
  const base = { origen: origen.puertas, destino: destino.puertas, excluidos }
  const masCorta = calcularRuta(grafo, { ...base, criterio: 'mas-corta' })
  const resguardada = calcularRuta(grafo, { ...base, criterio: 'resguardada' })
  const estado: EstadoOrquestador = {
    tipo: 'listo',
    consulta: {
      origen: origen.puertas,
      destino: destino.puertas,
      origenId,
      destinoId,
    },
    clima,
    plan: recomendar(clima, masCorta, resguardada),
    rutas: { masCorta, resguardada },
    actualizando: false,
  }
  const orquestador = {
    estado: () => estado,
    suscribir: () => () => {},
  } as unknown as OrquestadorRuta
  const pantalla = { despachar: vi.fn(), cerrar: vi.fn() } as unknown as ValorPantalla
  const pedirAltura = vi.fn()
  const vista = crearVistaRuta()
  const envolver = (hijo: ReactNode) => (
    <ContextoPantalla.Provider value={pantalla}>
      <ContextoVistaPantalla.Provider
        value={{
          margenes: { arriba: 120, abajo: 300, izquierda: 0, derecha: 0, abajoColapsada: 96 },
          escritorio: false,
          pedirAltura,
        }}
      >
        <ContextoCierres.Provider value={controlador}>
          <ContextoOrquestadorRuta.Provider value={orquestador}>
            <ContextoVistaRuta.Provider value={vista}>
              <ContextoDatosIndicaciones.Provider value={DATOS_REALES}>
                {hijo}
              </ContextoDatosIndicaciones.Provider>
            </ContextoVistaRuta.Provider>
          </ContextoOrquestadorRuta.Provider>
        </ContextoCierres.Provider>
      </ContextoVistaPantalla.Provider>
    </ContextoPantalla.Provider>
  )
  const r = render(envolver(<ContenidoRutaApp origen={origen} destino={destino} />))
  return { ...r, pantalla, pedirAltura, vista, usuario: userEvent.setup() }
}

describe('ContenidoRutaApp: cierres', () => {
  it('Aula 309 → Aula 401 con la entrada del pasillo 400/500 cerrada muestra el aviso de desvío', () => {
    escenario('aula-309', 'aula-401', [OBRA, ESCALERA], CLIMA.seco)
    expect(screen.getByTestId('ruta-desvio')).toHaveTextContent(
      'Evitamos un tramo cerrado: Obra en la entrada oeste del pasillo 400/500',
    )
    expect(screen.getByTestId('ruta-resumen')).toBeInTheDocument()
  })

  it('sin cierres vigentes no hay aviso de desvío', () => {
    escenario('aula-309', 'aula-401', [], CLIMA.seco)
    expect(screen.queryByTestId('ruta-desvio')).toBeNull()
  })

  it('Lab. de Química (1er piso) con la escalera cerrada: "Sin ruta disponible" con el motivo y las acciones', async () => {
    const { pantalla, usuario, vista } = escenario(
      'aula-121',
      'lab-quimica',
      [OBRA, ESCALERA],
      CLIMA.seco,
    )
    const aviso = screen.getByTestId('ruta-sin-ruta')
    expect(aviso).toHaveTextContent('Sin ruta disponible')
    expect(aviso).toHaveTextContent(
      'Los accesos a Laboratorio de Química están cerrados: Escalera junto a la Radio cerrada por mantenimiento.',
    )
    expect(vista.estado().seleccion).toBeNull()
    await usuario.click(screen.getByRole('button', { name: 'Elegir otro destino' }))
    expect(pantalla.despachar).toHaveBeenCalledWith({ tipo: 'abrir-busqueda', campo: 'destino' })
    await usuario.click(screen.getByRole('button', { name: 'Volver al mapa' }))
    expect(pantalla.cerrar).toHaveBeenCalledTimes(1)
  })
})

describe('ContenidoRutaApp: mapa y hoja', () => {
  it('publica la ruta elegida para el mapa y no ofrece indicaciones paso a paso', () => {
    const { vista } = escenario('direccion-alumnos', 'dpto-cs-salud', [], CLIMA.lluvia)
    const e = vista.estado()
    expect(e.clave).toBe('direccion-alumnos|dpto-cs-salud')
    expect(e.seleccion?.criterio).toBe('resguardada')
    expect(e.seleccion?.alternativa?.criterio).toBe('mas-corta')
    expect(e.encuadre?.objetivo).toBe('ruta')

    // Tocar la línea gris (desde el mapa) equivale al chip.
    act(() => vista.elegir(e.plan!, 'mas-corta'))
    expect(screen.getByRole('button', { name: /Más rápida/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(vista.estado().seleccion?.criterio).toBe('mas-corta')

    expect(screen.queryByRole('button', { name: 'Indicaciones' })).toBeNull()
  })

  it('"Finalizar viaje" limpia la ruta del mapa y vuelve al inicio', async () => {
    const { vista, pantalla, usuario } = escenario(
      'direccion-alumnos',
      'dpto-cs-salud',
      [],
      CLIMA.seco,
    )
    expect(vista.estado().seleccion).not.toBeNull()
    await usuario.click(screen.getByRole('button', { name: 'Iniciar' }))
    expect(vista.estado().encuadre?.objetivo).toBe('inicio')
    await usuario.click(screen.getByRole('button', { name: 'Finalizar viaje' }))
    expect(vista.estado().seleccion).toBeNull()
    expect(pantalla.cerrar).toHaveBeenCalledTimes(1)
  })
})
