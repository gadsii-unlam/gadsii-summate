import { describe, expect, it } from 'vitest'
import lugaresJson from '../../public/data/lugares.json'
import { recomendar, type EstadoOrquestador } from '../clima/index.ts'
import type { CatalogoLugares } from '../datos/index.ts'
import type { RecorridoGuardado } from '../datos/persistencia.ts'
import { calcularRuta, type RutaEncontrada } from '../rutas/index.ts'
import { grafoReal } from '../rutas/test/datos-reales.ts'
import { recorridoAGuardar, recorridoParaRestaurar } from './restauracion.ts'

const CATALOGO = lugaresJson as CatalogoLugares
const LUGARES = new Map(CATALOGO.lugares.map((l) => [l.id, l]))
const O = 'direccion-alumnos'
const D = 'dpto-cs-salud'
const g = grafoReal()
const consulta = { origen: LUGARES.get(O)!.puertas, destino: LUGARES.get(D)!.puertas }
const corta = calcularRuta(g, { ...consulta, criterio: 'mas-corta' }) as RutaEncontrada
const resguardada = calcularRuta(g, { ...consulta, criterio: 'resguardada' }) as RutaEncontrada

function listo(llueve: boolean): EstadoOrquestador {
  const clima = {
    tipo: 'ok' as const,
    llueve,
    descripcion: '',
    fuente: 'simulado' as const,
    obtenidoEn: '2026-10-22T16:00:00.000Z',
  }
  return {
    tipo: 'listo',
    consulta: { ...consulta, origenId: O, destinoId: D },
    clima,
    plan: recomendar(clima, corta, resguardada),
    rutas: { masCorta: corta, resguardada },
    actualizando: false,
  }
}

describe('recorridoAGuardar', () => {
  it('sin selección no hay nada que guardar', () => {
    expect(
      recorridoAGuardar('v', { origen: null, destino: null }, null, { tipo: 'inactivo' }),
    ).toBeNull()
  })

  it('destino elegido, todavía sin ruta', () => {
    expect(
      recorridoAGuardar('v', { origen: null, destino: D }, null, { tipo: 'inactivo' }),
    ).toEqual({
      versionDatos: 'v',
      destino: D,
      alternativaMostrada: 'mas-corta',
      rutas: [],
      climaUsado: 'seco',
    })
  })

  it('ruta "Más resguardada" con lluvia: guarda las dos rutas y la alternativa mostrada', () => {
    const r = recorridoAGuardar(
      'v',
      { origen: O, destino: D },
      { clave: `${O}|${D}`, criterio: 'resguardada', elegida: resguardada, alternativa: corta },
      listo(true),
    )
    expect(r).toMatchObject({
      origen: O,
      destino: D,
      alternativaMostrada: 'resguardada',
      climaUsado: 'lluvia',
    })
    expect(r?.rutas.map((x) => x.criterio)).toEqual(['resguardada', 'mas-corta'])
    expect(r?.rutas[0]?.nodos).toEqual(resguardada.nodos)
    expect(JSON.stringify(r).length).toBeLessThan(5000)
  })

  it('una ruta de otra selección no se guarda con esta', () => {
    const r = recorridoAGuardar(
      'v',
      { origen: O, destino: 'aula-121' },
      { clave: `${O}|${D}`, criterio: 'mas-corta', elegida: corta, alternativa: null },
      listo(false),
    )
    expect(r?.rutas).toEqual([])
  })
})

describe('recorridoParaRestaurar', () => {
  const guardado: RecorridoGuardado = {
    esquema: 1,
    versionDatos: 'v',
    origen: O,
    destino: D,
    alternativaMostrada: 'resguardada',
    rutas: [
      { criterio: 'resguardada', nodos: resguardada.nodos },
      { criterio: 'mas-corta', nodos: corta.nodos },
    ],
    climaUsado: 'lluvia',
    guardadoEn: '2026-10-22T16:40:00.000Z',
  }

  it('rearma las mismas rutas y el clima, sin recalcular', () => {
    const r = recorridoParaRestaurar(guardado, g, LUGARES)
    expect(r?.rutas.resguardada).toEqual({ ...resguardada, nodosExpandidos: 0 })
    expect(r?.rutas.masCorta).toEqual({ ...corta, nodosExpandidos: 0 })
    expect(r?.clima).toMatchObject({ tipo: 'ok', llueve: true })
    expect(r?.consulta).toMatchObject({ origenId: O, destinoId: D })
    const plan = recomendar(r!.clima, r!.rutas.masCorta, r!.rutas.resguardada)
    expect(plan.criterioPrincipal).toBe('resguardada')
  })

  it('con el clima en error conserva el criterio elegido', () => {
    const r = recorridoParaRestaurar(
      { ...guardado, climaUsado: 'error', criterioElegido: 'resguardada' },
      g,
      LUGARES,
    )
    expect(r?.clima).toEqual({ tipo: 'no-disponible', motivo: 'red' })
    expect(r?.criterioElegido).toBe('resguardada')
  })

  it('una sola ruta guardada sirve para los dos criterios', () => {
    const r = recorridoParaRestaurar(
      { ...guardado, rutas: [{ criterio: 'mas-corta', nodos: corta.nodos }] },
      g,
      LUGARES,
    )
    expect(r?.rutas.resguardada.tipo === 'ruta' && r.rutas.resguardada.nodos).toEqual(corta.nodos)
  })

  it('sin rutas, con nodos que ya no son vecinos o con un lugar inexistente: null', () => {
    expect(recorridoParaRestaurar({ ...guardado, rutas: [] }, g, LUGARES)).toBeNull()
    expect(
      recorridoParaRestaurar(
        {
          ...guardado,
          rutas: [{ criterio: 'mas-corta', nodos: [corta.nodos[0]!, corta.nodos.at(-1)!] }],
        },
        g,
        LUGARES,
      ),
    ).toBeNull()
    expect(recorridoParaRestaurar({ ...guardado, destino: 'no-existe' }, g, LUGARES)).toBeNull()
  })
})
