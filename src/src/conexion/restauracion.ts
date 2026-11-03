/**
 * Del recorrido guardado a lo que necesita la app para mostrarlo (design.md de
 * tolerar-senal-irregular, decisión 6), y de lo que se ve al recorrido a guardar. Sin React.
 */
import type { EstadoOrquestador, RecorridoRestaurado } from '../clima/index.ts'
import type { RecorridoAGuardar, RecorridoGuardado } from '../datos/persistencia.ts'
import type { Lugar } from '../datos/index.ts'
import {
  rutaDesdeNodos,
  type Criterio,
  type GrafoRuteable,
  type ResultadoRuta,
  type RutaEncontrada,
} from '../rutas/index.ts'

/** Arma el recorrido para `orquestador.restaurar`, o `null` si las rutas no se pueden rearmar. */
export function recorridoParaRestaurar(
  guardado: RecorridoGuardado,
  grafo: GrafoRuteable,
  lugares: ReadonlyMap<string, Pick<Lugar, 'puertas'>>,
): RecorridoRestaurado | null {
  const { origen, destino } = guardado
  if (!origen || !destino || guardado.rutas.length === 0) return null
  const lugarOrigen = lugares.get(origen)
  const lugarDestino = lugares.get(destino)
  if (!lugarOrigen || !lugarDestino) return null

  const porCriterio = new Map<Criterio, ResultadoRuta>()
  for (const r of guardado.rutas) {
    if (r.criterio !== 'mas-corta' && r.criterio !== 'resguardada') continue
    const ruta = rutaDesdeNodos(grafo, r.criterio, r.nodos)
    if (!ruta) return null
    porCriterio.set(r.criterio, ruta)
  }
  const unaSola = porCriterio.get('mas-corta') ?? porCriterio.get('resguardada')
  if (!unaSola) return null
  // Si se guardó una sola (las dos eran la misma), sirve para los dos criterios.
  const masCorta = porCriterio.get('mas-corta') ?? { ...unaSola, criterio: 'mas-corta' }
  const resguardada = porCriterio.get('resguardada') ?? { ...unaSola, criterio: 'resguardada' }

  const clima: RecorridoRestaurado['clima'] =
    guardado.climaUsado === 'error'
      ? { tipo: 'no-disponible', motivo: 'red' }
      : {
          tipo: 'ok',
          llueve: guardado.climaUsado === 'lluvia',
          descripcion: guardado.climaUsado === 'lluvia' ? 'Lluvia' : 'Seco',
          fuente: 'simulado',
          obtenidoEn: guardado.guardadoEn,
        }

  return {
    consulta: {
      origen: lugarOrigen.puertas,
      destino: lugarDestino.puertas,
      origenId: origen,
      destinoId: destino,
    },
    clima,
    rutas: { masCorta, resguardada },
    ...(guardado.criterioElegido ? { criterioElegido: guardado.criterioElegido } : {}),
  }
}

export interface SeleccionGuardable {
  origen: string | null
  destino: string | null
}

export interface RutaEnPantalla {
  clave: string
  criterio: Criterio
  elegida: RutaEncontrada
  alternativa: RutaEncontrada | null
}

/**
 * Lo que hay que guardar ahora: la selección confirmada y, si se ve una ruta de esa selección,
 * las rutas, la alternativa mostrada y el clima. `null` si no hay nada que guardar.
 */
export function recorridoAGuardar(
  versionDatos: string,
  seleccion: SeleccionGuardable,
  ruta: RutaEnPantalla | null,
  orquestador: EstadoOrquestador,
): RecorridoAGuardar | null {
  const { origen, destino } = seleccion
  if (!origen && !destino) return null
  const base: RecorridoAGuardar = {
    versionDatos,
    ...(origen ? { origen } : {}),
    ...(destino ? { destino } : {}),
    alternativaMostrada: 'mas-corta',
    rutas: [],
    climaUsado: 'seco',
  }
  if (!ruta || ruta.clave !== `${origen}|${destino}` || orquestador.tipo !== 'listo') return base
  const { clima, plan } = orquestador
  const climaUsado = clima.tipo === 'ok' ? (clima.llueve ? 'lluvia' : 'seco') : 'error'
  const rutas = [ruta.elegida, ruta.alternativa]
    .filter((r): r is RutaEncontrada => r !== null)
    .map((r) => ({ criterio: r.criterio, nodos: [...r.nodos] }))
  return {
    ...base,
    alternativaMostrada: ruta.criterio,
    rutas,
    climaUsado,
    // Con el clima caído, el criterio con el que se armó el plan lo eligió el usuario.
    ...(clima.tipo !== 'ok' && plan.criterioPrincipal
      ? { criterioElegido: plan.criterioPrincipal }
      : {}),
  }
}
