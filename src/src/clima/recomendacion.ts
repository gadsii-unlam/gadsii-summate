import type { Criterio, ResultadoRuta, RutaEncontrada } from '../rutas/index.ts'
import type { EstadoClima } from './tipos.ts'

/**
 * Reglas de recomendación según el clima (design.md de adaptar-ruta-al-clima, decisiones 5 a 7).
 * Todo es puro: no consulta el clima ni calcula rutas.
 */

export type EtiquetaRuta = 'Más rápida' | 'Techada' | 'Más resguardada'
export type NotaRutaUnica = 'Ya es techada' | 'Es la más resguardada posible'
export type EstadoClimaPlan = 'llueve' | 'no-llueve' | 'no-disponible'

export interface ResumenOpcion {
  criterio: Criterio
  etiqueta: EtiquetaRuta
  tiempoMin: number
  /** Metros al aire libre redondeados a la decena. */
  exteriorM: number
  /** "90 m al aire libre" o "Sin tramos al aire libre". */
  textoAireLibre: string
  /** "7 min · 90 m" o "7 min · Sin tramos al aire libre". */
  texto: string
}

export interface ComparacionAlternativas {
  resguardada: ResumenOpcion
  masRapida: ResumenOpcion
  /** Diferencia de la resguardada respecto de la más rápida, sobre los valores redondeados. */
  diferencia: {
    minutos: number
    /** "+2 min" o "mismo tiempo". */
    textoMinutos: string
    /** Metros al aire libre que se ahorran (redondeados a la decena, nunca negativo). */
    metrosMenosAlAireLibre: number
    /** "+2 min · 130 m menos al aire libre" (sin la parte de metros si no ahorra). */
    texto: string
  }
}

export interface PlanDeRuta {
  /** `null` mientras el usuario no elige (clima no disponible y rutas distintas). */
  principal: ResultadoRuta | null
  alternativa: ResultadoRuta | null
  /**
   * Nombre de la principal. Con `requiereEleccion` es el nombre de la opción resguardada. Con ruta
   * única: "Más rápida" si no llueve; si llueve o el clima falla, el nombre de la resguardada.
   */
  etiquetaPrincipal: EtiquetaRuta
  /** Nombre de la alternativa (`null` si no hay). */
  etiquetaAlternativa: EtiquetaRuta | null
  /** Criterio de la principal (`null` mientras se espera la elección). */
  criterioPrincipal: Criterio | null
  notaRutaUnica?: NotaRutaUnica
  estadoClima: EstadoClimaPlan
  requiereEleccion: boolean
  /** Las dos alternativas coinciden (misma secuencia de nodos) o no hay ruta. */
  rutaUnica: boolean
  /**
   * Comparación entre las dos opciones cuando son distintas. Está también sin lluvia (aunque no
   * se ofrezca alternativa) por si la interfaz la necesita.
   */
  comparacion: ComparacionAlternativas | null
}

export function etiquetaResguardada(ruta: RutaEncontrada): 'Techada' | 'Más resguardada' {
  return ruta.exteriorM === 0 ? 'Techada' : 'Más resguardada'
}

export function etiquetaDe(criterio: Criterio, resguardada: RutaEncontrada): EtiquetaRuta {
  return criterio === 'mas-corta' ? 'Más rápida' : etiquetaResguardada(resguardada)
}

/** Dos resultados son la misma ruta si recorren la misma secuencia de nodos. */
export function mismaRuta(a: ResultadoRuta, b: ResultadoRuta): boolean {
  if (a.tipo !== 'ruta' || b.tipo !== 'ruta') return a.tipo === b.tipo
  return a.nodos.length === b.nodos.length && a.nodos.every((n, i) => n === b.nodos[i])
}

export function redondearDecena(metros: number): number {
  return Math.round(metros / 10) * 10
}

function textoAireLibre(metros: number): string {
  return metros === 0 ? 'Sin tramos al aire libre' : `${metros} m al aire libre`
}

export function resumirOpcion(ruta: RutaEncontrada, etiqueta: EtiquetaRuta): ResumenOpcion {
  const exteriorM = redondearDecena(ruta.exteriorM)
  return {
    criterio: ruta.criterio,
    etiqueta,
    tiempoMin: ruta.tiempoMin,
    exteriorM,
    textoAireLibre: textoAireLibre(exteriorM),
    texto: `${ruta.tiempoMin} min · ${exteriorM === 0 ? 'Sin tramos al aire libre' : `${exteriorM} m`}`,
  }
}

/** Números de la comparación (decisión 6). El texto final lo arma `mostrar-ruta-e-indicaciones`. */
export function compararAlternativas(
  resguardada: RutaEncontrada,
  masRapida: RutaEncontrada,
): ComparacionAlternativas {
  const r = resumirOpcion(resguardada, etiquetaResguardada(resguardada))
  const m = resumirOpcion(masRapida, 'Más rápida')
  const minutos = r.tiempoMin - m.tiempoMin
  const textoMinutos =
    minutos === 0 ? 'mismo tiempo' : `${minutos > 0 ? '+' : '−'}${Math.abs(minutos)} min`
  const metrosMenosAlAireLibre = Math.max(0, m.exteriorM - r.exteriorM)
  return {
    resguardada: r,
    masRapida: m,
    diferencia: {
      minutos,
      textoMinutos,
      metrosMenosAlAireLibre,
      texto:
        metrosMenosAlAireLibre > 0
          ? `${textoMinutos} · ${metrosMenosAlAireLibre} m menos al aire libre`
          : textoMinutos,
    },
  }
}

function estadoDelPlan(clima: EstadoClima): EstadoClimaPlan {
  if (clima.tipo !== 'ok') return 'no-disponible'
  return clima.llueve ? 'llueve' : 'no-llueve'
}

/**
 * Qué ruta se recomienda y cuál queda como alternativa (tabla de la decisión 5).
 *
 * `corta` y `resguardada` son los resultados de `calcularRuta` con los criterios `mas-corta` y
 * `resguardada` y los mismos tramos excluidos. `criterioElegido` solo se usa con el clima no
 * disponible (la elección del usuario); con clima `ok` se ignora.
 */
export function recomendar(
  clima: EstadoClima,
  corta: ResultadoRuta,
  resguardada: ResultadoRuta,
  criterioElegido?: Criterio,
): PlanDeRuta {
  const estadoClima = estadoDelPlan(clima)

  // Sin ruta, mismo lugar o consulta inválida: los dos criterios dan lo mismo.
  if (corta.tipo !== 'ruta' || resguardada.tipo !== 'ruta') {
    return {
      principal: corta,
      alternativa: null,
      etiquetaPrincipal: 'Más rápida',
      etiquetaAlternativa: null,
      criterioPrincipal: null,
      estadoClima,
      requiereEleccion: false,
      rutaUnica: true,
      comparacion: null,
    }
  }

  if (mismaRuta(corta, resguardada)) {
    const conNota = estadoClima !== 'no-llueve'
    return {
      principal: corta,
      alternativa: null,
      etiquetaPrincipal: conNota ? etiquetaResguardada(corta) : 'Más rápida',
      etiquetaAlternativa: null,
      criterioPrincipal: 'mas-corta',
      ...(conNota && {
        notaRutaUnica: corta.exteriorM === 0 ? 'Ya es techada' : 'Es la más resguardada posible',
      }),
      estadoClima,
      requiereEleccion: false,
      rutaUnica: true,
      comparacion: null,
    }
  }

  const comparacion = compararAlternativas(resguardada, corta)
  const nombreResguardada = etiquetaResguardada(resguardada)
  const base = { estadoClima, rutaUnica: false, comparacion } as const

  if (estadoClima === 'llueve') {
    return {
      ...base,
      principal: resguardada,
      alternativa: corta,
      etiquetaPrincipal: nombreResguardada,
      etiquetaAlternativa: 'Más rápida',
      criterioPrincipal: 'resguardada',
      requiereEleccion: false,
    }
  }
  if (estadoClima === 'no-llueve') {
    return {
      ...base,
      principal: corta,
      alternativa: null,
      etiquetaPrincipal: 'Más rápida',
      etiquetaAlternativa: null,
      criterioPrincipal: 'mas-corta',
      requiereEleccion: false,
    }
  }
  if (!criterioElegido) {
    return {
      ...base,
      principal: null,
      alternativa: null,
      etiquetaPrincipal: nombreResguardada,
      etiquetaAlternativa: 'Más rápida',
      criterioPrincipal: null,
      requiereEleccion: true,
    }
  }
  const eligioResguardada = criterioElegido === 'resguardada'
  return {
    ...base,
    principal: eligioResguardada ? resguardada : corta,
    alternativa: eligioResguardada ? corta : resguardada,
    etiquetaPrincipal: eligioResguardada ? nombreResguardada : 'Más rápida',
    etiquetaAlternativa: eligioResguardada ? 'Más rápida' : nombreResguardada,
    criterioPrincipal: criterioElegido,
    requiereEleccion: false,
  }
}

export const TEXTO_CLIMA_NO_DISPONIBLE = 'No pudimos consultar el clima'
export const PREGUNTA_CLIMA_NO_DISPONIBLE = 'No pudimos consultar el clima. ¿Cómo querés ir?'

/** Línea breve con el clima y el criterio aplicado (decisión 7). */
export function textoEstadoClima(plan: PlanDeRuta): string {
  if (plan.estadoClima === 'no-disponible') return TEXTO_CLIMA_NO_DISPONIBLE
  if (plan.estadoClima === 'no-llueve') return 'No llueve · ruta más rápida'
  if (plan.notaRutaUnica) return `Llueve · ${plan.notaRutaUnica}`
  return 'Llueve · te recomendamos la ruta más resguardada'
}
