import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import lugaresJson from '../../../public/data/lugares.json'
import { crearClimaDeLaApp, crearOrquestadorRuta, type FetchClima } from '../../clima/index.ts'
import type { CatalogoLugares } from '../../datos/index.ts'
import { grafoReal } from '../../rutas/test/datos-reales.ts'
import { crearCatalogoUI } from '../catalogo.ts'
import { crearAlmacenEnMemoria } from '../estado/almacen.ts'
import MapaDoble from '../mapa/MapaDoble.tsx'
import Pantalla from '../Pantalla.tsx'
import { PLANO_DE_PRUEBA } from '../test/renderizar.tsx'
import AvisoClima from './AvisoClima.tsx'
import { ContextoOrquestadorRuta, useEstadoRuta } from './contexto.ts'
import { crearSolicitarRuta } from './solicitarRuta.ts'

const fetchSimulado: FetchClima = (url) => {
  const nombre = /(\w+)\.json$/.exec(url)?.[1] ?? ''
  const cuerpo =
    nombre === 'error'
      ? '{ "error": "servicio no disponible" }'
      : JSON.stringify({ fuente: 'simulado', llueve: nombre !== 'seco', descripcion: nombre })
  return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(cuerpo) })
}

/** Muestra el criterio de la recomendada (lo que va a dibujar `mostrar-ruta-e-indicaciones`). */
function ContenidoRutaDePrueba() {
  const estado = useEstadoRuta()
  if (estado.tipo !== 'listo') return <p role="status">Buscando el camino…</p>
  return (
    <p data-testid="recomendada">
      {estado.plan.principal ? estado.plan.etiquetaPrincipal : 'ninguna ruta'}
    </p>
  )
}

function montar(busqueda: string, recalcularAlCambiar = true) {
  window.history.replaceState(null, '', '/')
  const catalogo = crearCatalogoUI(lugaresJson as CatalogoLugares)
  const clima = crearClimaDeLaApp({ busqueda, almacen: null, fetch: fetchSimulado })
  const orquestador = crearOrquestadorRuta({ grafo: grafoReal(), servicio: clima.servicio })
  const recalcular = vi.fn(() => void orquestador.recalcular())
  if (recalcularAlCambiar) clima.alCambiarEscenario(recalcular)
  render(
    <ContextoOrquestadorRuta.Provider value={orquestador}>
      <Pantalla
        catalogo={catalogo}
        plano={PLANO_DE_PRUEBA}
        Mapa={MapaDoble}
        almacen={crearAlmacenEnMemoria()}
        seleccionInicial={{ origen: 'aula-309', destino: 'aula-103' }}
        abrirComoLlegar
        integraciones={{
          solicitarRuta: crearSolicitarRuta(orquestador, catalogo),
          AvisoClima,
          ContenidoRuta: ContenidoRutaDePrueba,
        }}
      />
    </ContextoOrquestadorRuta.Provider>,
  )
  return { clima, orquestador, recalcular }
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('clima conectado a la pantalla (Aula 309 → Aula 103)', () => {
  it('pasar de seco a lluvia con la ruta en pantalla recomienda la resguardada sin tocar origen ni destino', async () => {
    const { clima, orquestador } = montar('?clima=seco')
    expect(await screen.findByText('No llueve · ruta más rápida')).toBeInTheDocument()
    expect(screen.getByTestId('recomendada')).toHaveTextContent('Más rápida')
    const consulta = orquestador.estado()

    act(() => clima.control.elegir('lluvia'))
    expect(
      await screen.findByText('Llueve · te recomendamos la ruta más resguardada'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('recomendada')).toHaveTextContent('Más resguardada')
    const despues = orquestador.estado()
    expect(despues.tipo === 'listo' && despues.consulta.origenId).toBe('aula-309')
    expect(despues.tipo === 'listo' && despues.consulta.destinoId).toBe('aula-103')
    expect(consulta.tipo === 'listo' && despues.tipo === 'listo' && consulta.consulta).toBe(
      despues.tipo === 'listo' && despues.consulta,
    )
    expect(screen.getByRole('button', { name: /^Punto de partida: Aula 309/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Destino: Aula 103/ })).toBeInTheDocument()
  })

  it('clima caído: pregunta sin preseleccionar, elegir dibuja esa y Reintentar aplica las reglas', async () => {
    const { clima } = montar('?clima=error', false)
    expect(
      await screen.findByText('No pudimos consultar el clima. ¿Cómo querés ir?'),
    ).toBeInTheDocument()
    const resguardada = screen.getByRole('button', { name: /^Más resguardada/ })
    const rapida = screen.getByRole('button', { name: /^Más rápida/ })
    expect(resguardada).toHaveAttribute('aria-pressed', 'false')
    expect(rapida).toHaveAttribute('aria-pressed', 'false')
    expect(resguardada).toHaveTextContent('8 min · 120 m al aire libre')
    expect(resguardada).toHaveTextContent('+3 min · 150 m menos al aire libre')
    expect(rapida).toHaveTextContent('5 min · 270 m al aire libre')
    expect(screen.getByTestId('recomendada')).toHaveTextContent('ninguna ruta')
    expect(screen.queryByText('No pudimos consultar el clima')).not.toBeInTheDocument()

    fireEvent.click(rapida)
    expect(screen.getByRole('button', { name: /^Más rápida/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByTestId('recomendada')).toHaveTextContent('Más rápida')
    expect(screen.getByText('No pudimos consultar el clima')).toBeInTheDocument()

    clima.control.elegir('lluvia') // el moderador arregla el servicio…
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() =>
      expect(
        screen.getByText('Llueve · te recomendamos la ruta más resguardada'),
      ).toBeInTheDocument(),
    )
    expect(screen.getByTestId('recomendada')).toHaveTextContent('Más resguardada')
  })
})
