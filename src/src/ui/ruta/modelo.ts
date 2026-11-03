/**
 * Qué muestra la hoja de resultado a partir del plan de `recomendacion-de-ruta` (decisión 7):
 * opciones para los chips (la recomendada primero), ruta única con su nota y la ruta que se ve
 * según el chip elegido. Puro, sin React.
 */
import type { EstadoOrquestador, PlanDeRuta } from '../../clima/index.ts'
import {
  nombreChip,
  textoDistancia,
  type Paso,
  notaRutaUnicaConLluvia,
  textoTiempo,
  type Criterio,
  type NombreChip,
  type RutaEncontrada,
} from '../../rutas/index.ts'
import { TEXTOS_RUTA } from './textos.ts'

export interface OpcionRuta {
  criterio: Criterio
  ruta: RutaEncontrada
  nombre: NombreChip
  /** "Más resguardada · 4 min". */
  etiqueta: string
  /** "Recomendada con lluvia" en la recomendada cuando llueve. */
  subtitulo: string | null
  /**
   * Comparación (decisión 6 de adaptar-ruta-al-clima), solo con dos rutas: "90 m al aire libre ·
   * +2 min · 130 m menos al aire libre" en la resguardada y "220 m al aire libre" en la más rápida.
   */
  detalle: string | null
}

export type ModeloResultado =
  | { tipo: 'nada' }
  | { tipo: 'buscando' }
  | {
      tipo: 'ruta'
      plan: PlanDeRuta
      /** Una opción si hay una sola ruta; dos (la recomendada primero) si hay alternativa. */
      opciones: OpcionRuta[]
      /** "Ya es techada" / "Es la opción más resguardada" con lluvia y ruta única. */
      nota: string | null
      llueve: boolean
    }

const esRuta = (r: unknown): r is RutaEncontrada =>
  typeof r === 'object' && r !== null && (r as { tipo?: string }).tipo === 'ruta'

export function esPlan(valor: EstadoOrquestador | PlanDeRuta): valor is PlanDeRuta {
  return 'principal' in valor
}

function opcion(ruta: RutaEncontrada, recomendada: boolean, llueve: boolean): OpcionRuta {
  const nombre = nombreChip(ruta.criterio, ruta.exteriorM)
  return {
    criterio: ruta.criterio,
    ruta,
    nombre,
    etiqueta: `${nombre} · ${textoTiempo(ruta.tiempoMin)}`,
    subtitulo: recomendada && llueve ? TEXTOS_RUTA.recomendadaConLluvia : null,
    detalle: null,
  }
}

/**
 * Modelo de la hoja. Devuelve `nada` cuando la hoja la ocupa otro cambio: la elección de criterio
 * con el clima caído (`requiereEleccion`, `adaptar-ruta-al-clima`) o "Sin ruta disponible"
 * (`aplicar-cierres-temporales`).
 */
export function modeloResultado(estado: EstadoOrquestador | PlanDeRuta): ModeloResultado {
  let plan: PlanDeRuta
  if (esPlan(estado)) plan = estado
  else if (estado.tipo === 'esperando-clima') return { tipo: 'buscando' }
  else if (estado.tipo === 'listo') plan = estado.plan
  else return { tipo: 'nada' }

  if (plan.requiereEleccion || !esRuta(plan.principal)) return { tipo: 'nada' }
  const llueve = plan.estadoClima === 'llueve'
  const principal = opcion(plan.principal, true, llueve)
  if (!plan.rutaUnica && esRuta(plan.alternativa)) {
    const alternativa = opcion(plan.alternativa, false, llueve)
    const c = plan.comparacion
    if (c) {
      for (const o of [principal, alternativa]) {
        o.detalle =
          o.criterio === 'resguardada'
            ? `${c.resguardada.textoAireLibre} · ${c.diferencia.texto}`
            : c.masRapida.textoAireLibre
      }
    }
    return {
      tipo: 'ruta',
      plan,
      opciones: [principal, alternativa],
      nota: null,
      llueve,
    }
  }
  return {
    tipo: 'ruta',
    plan,
    opciones: [{ ...principal, subtitulo: null }],
    nota: llueve ? notaRutaUnicaConLluvia(plan.principal.exteriorM) : null,
    llueve,
  }
}

/** Texto que lee el lector de pantalla para un paso. */
export function textoAccesiblePaso(paso: Paso): string {
  const partes = [paso.texto]
  if (paso.distanciaM !== undefined && !paso.distanciaEnTexto)
    partes.push(textoDistancia(paso.distanciaM))
  if (paso.alAireLibre) partes.push(TEXTOS_RUTA.alAireLibre.toLowerCase())
  return partes.join(', ')
}
