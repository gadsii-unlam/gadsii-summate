import { describe, expect, it } from 'vitest'
import {
  calcularRuta,
  type Criterio,
  type ResultadoRuta,
  type RutaEncontrada,
} from '../rutas/index.ts'
import { grafoReal } from '../rutas/test/datos-reales.ts'
import { crearMemoriaCriterio } from './memoria-criterio.ts'
import { compararAlternativas, recomendar, textoEstadoClima } from './recomendacion.ts'
import type { EstadoClima } from './tipos.ts'

const LLUEVE: EstadoClima = {
  tipo: 'ok',
  llueve: true,
  descripcion: 'Lluvia',
  fuente: 'simulado',
  obtenidoEn: '2026-11-05T13:00:00.000Z',
}
const SECO: EstadoClima = { ...LLUEVE, llueve: false, descripcion: 'Sin lluvia' }
const CAIDO: EstadoClima = { tipo: 'no-disponible', motivo: 'respuesta-invalida' }

function rutas(origen: string, destino: string) {
  const g = grafoReal()
  const r = (criterio: Criterio) =>
    calcularRuta(g, { origen: [origen], destino: [destino], criterio })
  return { corta: r('mas-corta'), resguardada: r('resguardada') }
}

function ruta(r: ResultadoRuta): RutaEncontrada {
  if (r.tipo !== 'ruta') throw new Error(`se esperaba una ruta, llegó ${r.tipo}`)
  return r
}

const ECO_HUM = rutas('puerta-aula-309', 'puerta-aula-103') // distintas
const INTERIOR = rutas('puerta-aula-121', 'puerta-aula-110') // iguales, 0 m afuera
const ENTRADA = rutas('entrada-campus-florencio-varela', 'puerta-aula-121') // iguales, con vereda

describe('datos de los ejemplos', () => {
  it('coinciden con el design', () => {
    expect(ruta(ECO_HUM.corta)).toMatchObject({ tiempoMin: 5 })
    expect(ruta(ECO_HUM.resguardada)).toMatchObject({ tiempoMin: 8 })
    expect(ruta(INTERIOR.corta).exteriorM).toBe(0)
    expect(ruta(ENTRADA.corta).exteriorM).toBeGreaterThan(0)
  })
})

describe('recomendar', () => {
  type Caso = {
    nombre: string
    clima: EstadoClima
    par: { corta: ResultadoRuta; resguardada: ResultadoRuta }
    elegido?: Criterio
    principal: 'corta' | 'resguardada' | null
    alternativa: 'corta' | 'resguardada' | null
    etiquetaPrincipal: string
    etiquetaAlternativa: string | null
    nota?: string
    requiereEleccion: boolean
    estado: string
    texto: string
  }
  const casos: Caso[] = [
    {
      nombre: 'lluvia, rutas distintas (309 → 103)',
      clima: LLUEVE,
      par: ECO_HUM,
      principal: 'resguardada',
      alternativa: 'corta',
      etiquetaPrincipal: 'Más resguardada',
      etiquetaAlternativa: 'Más rápida',
      requiereEleccion: false,
      estado: 'llueve',
      texto: 'Llueve · te recomendamos la ruta más resguardada',
    },
    {
      nombre: 'sin lluvia, rutas distintas: solo la más rápida',
      clima: SECO,
      par: ECO_HUM,
      principal: 'corta',
      alternativa: null,
      etiquetaPrincipal: 'Más rápida',
      etiquetaAlternativa: null,
      requiereEleccion: false,
      estado: 'no-llueve',
      texto: 'No llueve · ruta más rápida',
    },
    {
      nombre: 'clima caído sin elección: pide elegir, ninguna dibujada',
      clima: CAIDO,
      par: ECO_HUM,
      principal: null,
      alternativa: null,
      etiquetaPrincipal: 'Más resguardada',
      etiquetaAlternativa: 'Más rápida',
      requiereEleccion: true,
      estado: 'no-disponible',
      texto: 'No pudimos consultar el clima',
    },
    {
      nombre: 'clima caído, eligió la resguardada',
      clima: CAIDO,
      par: ECO_HUM,
      elegido: 'resguardada',
      principal: 'resguardada',
      alternativa: 'corta',
      etiquetaPrincipal: 'Más resguardada',
      etiquetaAlternativa: 'Más rápida',
      requiereEleccion: false,
      estado: 'no-disponible',
      texto: 'No pudimos consultar el clima',
    },
    {
      nombre: 'clima caído, eligió la más rápida',
      clima: CAIDO,
      par: ECO_HUM,
      elegido: 'mas-corta',
      principal: 'corta',
      alternativa: 'resguardada',
      etiquetaPrincipal: 'Más rápida',
      etiquetaAlternativa: 'Más resguardada',
      requiereEleccion: false,
      estado: 'no-disponible',
      texto: 'No pudimos consultar el clima',
    },
    {
      nombre: 'clima ok ignora una elección vieja',
      clima: LLUEVE,
      par: ECO_HUM,
      elegido: 'mas-corta',
      principal: 'resguardada',
      alternativa: 'corta',
      etiquetaPrincipal: 'Más resguardada',
      etiquetaAlternativa: 'Más rápida',
      requiereEleccion: false,
      estado: 'llueve',
      texto: 'Llueve · te recomendamos la ruta más resguardada',
    },
    {
      nombre: 'lluvia, iguales sin vereda (121 → 110): "Ya es techada"',
      clima: LLUEVE,
      par: INTERIOR,
      principal: 'corta',
      alternativa: null,
      etiquetaPrincipal: 'Techada',
      etiquetaAlternativa: null,
      nota: 'Ya es techada',
      requiereEleccion: false,
      estado: 'llueve',
      texto: 'Llueve · Ya es techada',
    },
    {
      nombre: 'lluvia, iguales con vereda (Entrada Florencio Varela → 121)',
      clima: LLUEVE,
      par: ENTRADA,
      principal: 'corta',
      alternativa: null,
      etiquetaPrincipal: 'Más resguardada',
      etiquetaAlternativa: null,
      nota: 'Es la más resguardada posible',
      requiereEleccion: false,
      estado: 'llueve',
      texto: 'Llueve · Es la más resguardada posible',
    },
    {
      nombre: 'sin lluvia, iguales: una sola sin nota',
      clima: SECO,
      par: INTERIOR,
      principal: 'corta',
      alternativa: null,
      etiquetaPrincipal: 'Más rápida',
      etiquetaAlternativa: null,
      requiereEleccion: false,
      estado: 'no-llueve',
      texto: 'No llueve · ruta más rápida',
    },
    {
      nombre: 'clima caído, iguales: una sola con nota, sin preguntar',
      clima: CAIDO,
      par: ENTRADA,
      principal: 'corta',
      alternativa: null,
      etiquetaPrincipal: 'Más resguardada',
      etiquetaAlternativa: null,
      nota: 'Es la más resguardada posible',
      requiereEleccion: false,
      estado: 'no-disponible',
      texto: 'No pudimos consultar el clima',
    },
  ]

  it.each(casos)('$nombre', (c) => {
    const plan = recomendar(c.clima, c.par.corta, c.par.resguardada, c.elegido)
    const de = (k: 'corta' | 'resguardada' | null) => (k === null ? null : c.par[k])
    expect(plan.principal).toBe(de(c.principal))
    expect(plan.alternativa).toBe(de(c.alternativa))
    expect(plan.etiquetaPrincipal).toBe(c.etiquetaPrincipal)
    expect(plan.etiquetaAlternativa).toBe(c.etiquetaAlternativa)
    expect(plan.notaRutaUnica).toBe(c.nota)
    expect(plan.requiereEleccion).toBe(c.requiereEleccion)
    expect(plan.estadoClima).toBe(c.estado)
    expect(textoEstadoClima(plan)).toBe(c.texto)
  })

  it('las iguales se detectan por secuencia de nodos, no por identidad', () => {
    const otra = { ...ruta(INTERIOR.resguardada), nodos: [...ruta(INTERIOR.resguardada).nodos] }
    expect(recomendar(LLUEVE, INTERIOR.corta, otra).rutaUnica).toBe(true)
  })

  it('una resguardada distinta con 0 m al aire libre se llama "Techada"', () => {
    const techada: RutaEncontrada = { ...ruta(ECO_HUM.resguardada), exteriorM: 0, exteriorPx: 0 }
    const plan = recomendar(LLUEVE, ECO_HUM.corta, techada)
    expect(plan.etiquetaPrincipal).toBe('Techada')
    expect(plan.comparacion?.resguardada.texto).toBe('8 min · Sin tramos al aire libre')
    expect(plan.comparacion?.resguardada.textoAireLibre).toBe('Sin tramos al aire libre')
  })

  it('sin ruta: se pasa el resultado tal cual, sin alternativa', () => {
    const sin: ResultadoRuta = { tipo: 'sin-ruta', motivo: 'sin-camino' }
    const plan = recomendar(LLUEVE, sin, sin)
    expect(plan.principal).toBe(sin)
    expect(plan.requiereEleccion).toBe(false)
  })
})

describe('comparación entre alternativas', () => {
  it('309 → 103 con lluvia: "8 min · 120 m" (+3 min · 150 m menos) frente a "5 min · 270 m"', () => {
    const c = compararAlternativas(ruta(ECO_HUM.resguardada), ruta(ECO_HUM.corta))
    expect(c.resguardada.texto).toBe('8 min · 120 m')
    expect(c.resguardada.textoAireLibre).toBe('120 m al aire libre')
    expect(c.masRapida.texto).toBe('5 min · 270 m')
    expect(c.diferencia).toEqual({
      minutos: 3,
      textoMinutos: '+3 min',
      metrosMenosAlAireLibre: 150,
      texto: '+3 min · 150 m menos al aire libre',
    })
  })

  it('mismo minuto redondeado: "mismo tiempo"', () => {
    const corta = ruta(ECO_HUM.corta)
    const igualTiempo = { ...ruta(ECO_HUM.resguardada), tiempoMin: corta.tiempoMin }
    const c = compararAlternativas(igualTiempo, corta)
    expect(c.diferencia.textoMinutos).toBe('mismo tiempo')
    expect(c.diferencia.texto).toBe('mismo tiempo · 150 m menos al aire libre')
  })

  it('la diferencia usa los valores redondeados que ve el usuario', () => {
    const corta = { ...ruta(ECO_HUM.corta), exteriorM: 224.9 } // se ve 220
    const resg = { ...ruta(ECO_HUM.resguardada), exteriorM: 95.1 } // se ve 100
    expect(compararAlternativas(resg, corta).diferencia.metrosMenosAlAireLibre).toBe(120)
  })
})

describe('criterio recordado mientras falla el clima', () => {
  it('al cambiar de destino no se vuelve a preguntar', () => {
    const memoria = crearMemoriaCriterio()
    memoria.registrarClima(CAIDO)
    expect(
      recomendar(CAIDO, ECO_HUM.corta, ECO_HUM.resguardada, memoria.elegido()).requiereEleccion,
    ).toBe(true)
    memoria.elegir('mas-corta')
    const otroDestino = rutas('puerta-aula-309', 'puerta-lab-microscopia')
    memoria.registrarClima(CAIDO)
    const plan = recomendar(CAIDO, otroDestino.corta, otroDestino.resguardada, memoria.elegido())
    expect(plan.requiereEleccion).toBe(false)
    expect(plan.principal).toBe(otroDestino.corta)
    expect(plan.estadoClima).toBe('no-disponible')
    expect(textoEstadoClima(plan)).toBe('No pudimos consultar el clima')
  })

  it('tras un reintento exitoso se aplican las reglas normales y se olvida la elección', () => {
    const memoria = crearMemoriaCriterio()
    memoria.elegir('mas-corta')
    memoria.registrarClima(LLUEVE)
    expect(memoria.elegido()).toBeUndefined()
    const plan = recomendar(LLUEVE, ECO_HUM.corta, ECO_HUM.resguardada, memoria.elegido())
    expect(plan.principal).toBe(ECO_HUM.resguardada)
    memoria.registrarClima(CAIDO)
    expect(
      recomendar(CAIDO, ECO_HUM.corta, ECO_HUM.resguardada, memoria.elegido()).requiereEleccion,
    ).toBe(true)
  })
})
