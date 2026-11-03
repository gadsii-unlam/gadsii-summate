import type { Criterio } from '../rutas/index.ts'
import type { EstadoClima } from './tipos.ts'

export interface MemoriaCriterio {
  /** Criterio que eligió el usuario con el clima caído (`undefined` si no eligió o se descartó). */
  elegido(): Criterio | undefined
  elegir(criterio: Criterio): void
  /** Se llama con cada estado de clima obtenido: un `ok` descarta la elección. */
  registrarClima(clima: EstadoClima): void
}

/**
 * Recuerda el criterio elegido mientras el clima siga no disponible, para no volver a preguntar
 * en cada destino (decisión 5). Vive en memoria: dura lo que dura la sesión de la app.
 */
export function crearMemoriaCriterio(): MemoriaCriterio {
  let elegido: Criterio | undefined
  return {
    elegido: () => elegido,
    elegir(criterio) {
      elegido = criterio
    },
    registrarClima(clima) {
      if (clima.tipo === 'ok') elegido = undefined
    },
  }
}
