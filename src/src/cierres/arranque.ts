/**
 * Arranque de los cierres en la app: carga el archivo (con respaldo), lee la fecha simulada y
 * crea el controlador que reevalúa la vigencia.
 */
import type { Lugar } from '../datos/index.ts'
import type { GrafoRuteable } from '../rutas/index.ts'
import { cargarCierres, type CierresCargados, type OpcionesCargaCierres } from './carga.ts'
import { crearControladorCierres, type ControladorCierres } from './controlador.ts'
import { crearReloj } from './fecha-simulada.ts'

export interface OpcionesInicioCierres {
  grafo: GrafoRuteable
  lugares: readonly Pick<Lugar, 'id' | 'puertas'>[]
  /** Fecha simulada (`leerFechaSimulada()`), o `null` para el reloj del dispositivo. */
  fechaSimulada: number | null
  carga?: OpcionesCargaCierres
  /** Se llama con el resultado de la carga (origen y hora de la copia: tolerar-senal-irregular). */
  alCargar?: (cargados: CierresCargados) => void
}

/** Nunca rechaza por el archivo de cierres: ante fallas usa la copia incluida. */
export async function iniciarCierres(opciones: OpcionesInicioCierres): Promise<ControladorCierres> {
  const cargados = await cargarCierres(opciones.grafo, opciones.carga)
  opciones.alCargar?.(cargados)
  const { cierres } = cargados
  return crearControladorCierres({
    grafo: opciones.grafo,
    cierres,
    lugares: opciones.lugares,
    reloj: crearReloj(opciones.fechaSimulada),
  })
}
