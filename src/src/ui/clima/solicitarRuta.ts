import type { ConsultaOrigenDestino, OrquestadorRuta } from '../../clima/index.ts'
import type { Lugar } from '../../datos/index.ts'
import type { SolicitarRuta } from '../integraciones.ts'

/**
 * `Integraciones.solicitarRuta` sobre el orquestador: traduce ids de `Lugar` a sus puertas y lanza
 * el cálculo. Si la `signal` se aborta (cambió la selección o se salió del panel) y el estado
 * todavía es de este pedido, el orquestador vuelve a `inactivo`.
 */
export function crearSolicitarRuta(
  orquestador: OrquestadorRuta,
  lugares: { porId: ReadonlyMap<string, Pick<Lugar, 'puertas'>> },
): SolicitarRuta {
  return ({ origen, destino, signal }) => {
    if (signal.aborted) return
    const lugarOrigen = lugares.porId.get(origen)
    const lugarDestino = lugares.porId.get(destino)
    if (!lugarOrigen || !lugarDestino) return
    const consulta: ConsultaOrigenDestino = {
      origen: lugarOrigen.puertas,
      destino: lugarDestino.puertas,
      origenId: origen,
      destinoId: destino,
    }
    void orquestador.calcular(consulta)
    signal.addEventListener(
      'abort',
      () => {
        const estado = orquestador.estado()
        if (estado.tipo !== 'inactivo' && estado.consulta === consulta) orquestador.limpiar()
      },
      { once: true },
    )
  }
}
