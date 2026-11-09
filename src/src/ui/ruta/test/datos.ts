/** Datos reales para los tests de la vista de ruta (grafo, catálogo y planes de ejemplo). */
import catalogoJson from '../../../../public/data/lugares.json'
import { recomendar, type EstadoClima, type PlanDeRuta } from '../../../clima/index.ts'
import type { CatalogoLugares, Lugar } from '../../../datos/index.ts'
import {
  NOMBRES_ENTRADAS,
  calcularRuta,
  prepararDatosIndicaciones,
  type Criterio,
} from '../../../rutas/index.ts'
import { GRAFO_CAMPUS, grafoReal } from '../../../rutas/test/datos-reales.ts'

export const CATALOGO_REAL = catalogoJson as CatalogoLugares

export const DATOS_REALES = prepararDatosIndicaciones({
  grafo: grafoReal(),
  nodos: GRAFO_CAMPUS.nodos,
  catalogo: CATALOGO_REAL,
  entradas: NOMBRES_ENTRADAS,
})

export function lugarReal(id: string): Lugar {
  const l = CATALOGO_REAL.lugares.find((x) => x.id === id)
  if (!l) throw new Error(`no está el lugar ${id}`)
  return l
}

export const CLIMA = {
  seco: {
    tipo: 'ok',
    llueve: false,
    descripcion: 'Despejado',
    fuente: 'simulado',
    obtenidoEn: '2026-10-22T10:00:00-03:00',
  },
  lluvia: {
    tipo: 'ok',
    llueve: true,
    descripcion: 'Lluvia',
    fuente: 'simulado',
    obtenidoEn: '2026-10-22T10:00:00-03:00',
  },
  caido: { tipo: 'no-disponible', motivo: 'timeout' },
} satisfies Record<string, EstadoClima>

/** Plan real de `recomendacion-de-ruta` entre dos lugares del catálogo. */
export function planReal(
  origenId: string,
  destinoId: string,
  clima: EstadoClima,
  criterioElegido?: Criterio,
): { plan: PlanDeRuta; origen: Lugar; destino: Lugar } {
  const origen = lugarReal(origenId)
  const destino = lugarReal(destinoId)
  const base = { origen: origen.puertas, destino: destino.puertas }
  const g = grafoReal()
  const plan = recomendar(
    clima,
    calcularRuta(g, { ...base, criterio: 'mas-corta' }),
    calcularRuta(g, { ...base, criterio: 'resguardada' }),
    criterioElegido,
  )
  return { plan, origen, destino }
}
