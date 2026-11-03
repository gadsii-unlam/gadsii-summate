/**
 * Nombres visibles de las entradas de edificio, cargados a mano en `datos-fuente/entradas.json`
 * (design.md de mostrar-ruta-e-indicaciones, decisión 10). El build de datos los valida contra el
 * grafo; acá se incluyen en el bundle (como `config.json`), así que funcionan sin conexión.
 */
import fuente from '../../datos-fuente/entradas.json'
import type { NombresEntradas } from './indicaciones.ts'

function limpiar(datos: Record<string, string>): NombresEntradas {
  const nombres: Record<string, string> = {}
  for (const [id, nombre] of Object.entries(datos)) {
    if (id.startsWith('entrada-') && nombre.trim() !== '') nombres[id] = nombre.trim()
  }
  return Object.freeze(nombres)
}

export const NOMBRES_ENTRADAS: NombresEntradas = limpiar(fuente as Record<string, string>)
