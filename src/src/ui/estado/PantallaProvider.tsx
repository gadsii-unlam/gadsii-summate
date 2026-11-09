import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { crearAlmacen } from './almacen.ts'
import type { Almacen } from './almacen.ts'
import { ControladorPantalla } from './controlador.ts'
import type { SolicitarRuta } from './controlador.ts'
import { ContextoPantalla } from './contexto.ts'
import type { ValorPantalla } from './contexto.ts'
import type { Seleccion } from './pantalla.ts'

export interface PropsPantallaProvider {
  existeLugar: (id: string) => boolean
  solicitarRuta: SolicitarRuta
  almacen?: Almacen
  seleccionInicial?: Pick<Seleccion, 'origen' | 'destino'>
  /** Con `seleccionInicial`, abrir "Cómo llegar" (recorrido restaurado). */
  abrirComoLlegar?: boolean
  /** Se llama cada vez que cambia la selección de origen y destino (recorrido guardado). */
  alCambiarSeleccion?: (seleccion: Seleccion) => void
  children: ReactNode
}

/** Crea el controlador de pantalla, lo conecta al historial y lo expone en un contexto. */
export default function PantallaProvider({
  existeLugar,
  solicitarRuta,
  almacen,
  seleccionInicial,
  abrirComoLlegar,
  alCambiarSeleccion,
  children,
}: PropsPantallaProvider) {
  const [controlador] = useState(
    () =>
      new ControladorPantalla({
        existeLugar,
        almacen: almacen ?? crearAlmacen(),
        solicitarRuta,
        ...(seleccionInicial ? { seleccionInicial } : {}),
        ...(abrirComoLlegar ? { abrirComoLlegar } : {}),
      }),
  )

  useEffect(() => controlador.usarSolicitarRuta(solicitarRuta), [controlador, solicitarRuta])
  useEffect(() => controlador.conectar(), [controlador])

  const instantanea = useSyncExternalStore(controlador.suscribir, controlador.obtener)
  const seleccion = instantanea.pantalla.seleccion
  useEffect(() => alCambiarSeleccion?.(seleccion), [seleccion, alCambiarSeleccion])

  const valor = useMemo<ValorPantalla>(
    () => ({
      ...instantanea,
      despachar: controlador.despachar,
      volver: controlador.volver,
      cerrar: controlador.cerrar,
      cerrarPrimerUso: controlador.cerrarPrimerUso,
      controlador,
    }),
    [instantanea, controlador],
  )

  return <ContextoPantalla.Provider value={valor}>{children}</ContextoPantalla.Provider>
}
