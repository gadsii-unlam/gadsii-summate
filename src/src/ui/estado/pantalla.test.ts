// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  INICIO,
  enComoLlegar,
  esVista,
  estadoInicial,
  faseComoLlegar,
  hashDeVista,
  reducir,
  vistaDeHash,
} from './pantalla.ts'
import type { EstadoPantalla, EventoPantalla, Seleccion, Vista } from './pantalla.ts'

function estado(vista: Vista, seleccion: Partial<Seleccion> = {}, consulta = ''): EstadoPantalla {
  return {
    vista,
    seleccion: { origen: null, destino: null, sugerenciaOrigen: null, ...seleccion },
    consulta,
  }
}

const COMO: Vista = { tipo: 'como-llegar' }
const BUSCAR_ORIGEN: Vista = { tipo: 'buscando', campo: 'origen', desde: 'como-llegar' }
const BUSCAR_DESTINO: Vista = { tipo: 'buscando', campo: 'destino', desde: 'como-llegar' }

describe('reductor: tabla de transiciones (D5)', () => {
  it('la vista inicial es "Cómo llegar"', () => {
    expect(INICIO).toEqual(COMO)
    expect(estadoInicial().vista).toEqual(COMO)
  })

  const filas: Array<[string, EstadoPantalla, EventoPantalla, Vista]> = [
    [
      'como-llegar + tocar origen',
      estado(COMO),
      { tipo: 'abrir-busqueda', campo: 'origen' },
      BUSCAR_ORIGEN,
    ],
    [
      'como-llegar + tocar destino',
      estado(COMO),
      { tipo: 'abrir-busqueda', campo: 'destino' },
      BUSCAR_DESTINO,
    ],
    [
      'buscando (desde como-llegar) + elegir: la vista vuelve con popstate',
      estado(BUSCAR_ORIGEN),
      { tipo: 'elegir-resultado', lugarId: 'servicios-biblioteca' },
      BUSCAR_ORIGEN,
    ],
    [
      'como-llegar + intercambiar',
      estado(COMO, { origen: 'a', destino: 'b' }),
      { tipo: 'intercambiar' },
      COMO,
    ],
    ['cualquiera + ayuda', estado(COMO), { tipo: 'abrir-ayuda' }, { tipo: 'ayuda', sobre: COMO }],
    [
      'popstate restaura la vista',
      estado(COMO),
      { tipo: 'restaurar', vista: BUSCAR_DESTINO },
      BUSCAR_DESTINO,
    ],
    // Entradas del historial guardadas con las vistas que ya no existen.
    [
      'popstate con el inicio viejo cae en Cómo llegar',
      estado(BUSCAR_DESTINO),
      { tipo: 'restaurar', vista: { tipo: 'inicio' } },
      COMO,
    ],
    [
      'popstate con una ficha vieja cae en Cómo llegar',
      estado(BUSCAR_DESTINO),
      { tipo: 'restaurar', vista: { tipo: 'ficha', lugarId: 'humanidades-121' } },
      COMO,
    ],
  ]

  it.each(filas)('%s', (_, desde, evento, hacia) => {
    expect(reducir(desde, evento).vista).toEqual(hacia)
  })

  it('abrir la búsqueda limpia la consulta; volver con popstate la conserva', () => {
    const conTexto = estado(COMO, {}, 'viejo')
    expect(reducir(conTexto, { tipo: 'abrir-busqueda', campo: 'destino' }).consulta).toBe('')
    const enPanel = estado(COMO, {}, '121')
    expect(reducir(enPanel, { tipo: 'restaurar', vista: BUSCAR_DESTINO }).consulta).toBe('121')
  })
})

describe('reductor: eventos inválidos se ignoran', () => {
  const casos: Array<[string, EstadoPantalla, EventoPantalla]> = [
    ['abrir la ficha desde el panel', estado(COMO), { tipo: 'abrir-ficha', lugarId: 'x' }],
    ['elegir resultado sin búsqueda', estado(COMO), { tipo: 'elegir-resultado', lugarId: 'x' }],
    ['intercambiar sin nada', estado(COMO), { tipo: 'intercambiar' }],
    ['confirmar sin sugerencia', estado(COMO), { tipo: 'confirmar-sugerencia' }],
    [
      'confirmar con origen ya elegido',
      estado(COMO, { origen: 'a', sugerenciaOrigen: 'b' }),
      { tipo: 'confirmar-sugerencia' },
    ],
    ['borrar destino vacío', estado(COMO), { tipo: 'borrar-destino' }],
    ['cancelar sin origen ni destino', estado(COMO), { tipo: 'limpiar' }],
    ['escribir fuera de la búsqueda', estado(COMO), { tipo: 'escribir', consulta: 'x' }],
    ['ayuda sobre ayuda', estado({ tipo: 'ayuda', sobre: INICIO }), { tipo: 'abrir-ayuda' }],
    ['Cómo llegar desde el panel', estado(COMO), { tipo: 'abrir-como-llegar' }],
    ['Cómo llegar desde la búsqueda', estado(BUSCAR_DESTINO), { tipo: 'abrir-como-llegar' }],
    [
      'elegir origen fuera del panel',
      estado({ tipo: 'ayuda', sobre: COMO }),
      { tipo: 'elegir-origen', lugarId: 'x' },
    ],
  ]
  it.each(casos)('%s', (_, desde, evento) => {
    expect(reducir(desde, evento)).toBe(desde)
  })
})

describe('fase derivada', () => {
  it('es ruta solo con origen y destino válidos y distintos', () => {
    const base = { sugerenciaOrigen: 'x' }
    expect(faseComoLlegar({ ...base, origen: 'a', destino: 'b' })).toBe('ruta')
    expect(faseComoLlegar({ ...base, origen: null, destino: 'b' })).toBe('eligiendo')
    expect(faseComoLlegar({ ...base, origen: 'a', destino: null })).toBe('eligiendo')
    expect(faseComoLlegar({ ...base, origen: 'a', destino: 'a' })).toBe('eligiendo')
  })
  it('la sugerencia no es origen', () => {
    expect(faseComoLlegar({ origen: null, destino: 'b', sugerenciaOrigen: 'a' })).toBe('eligiendo')
  })
  it('el contexto de "Cómo llegar" incluye la búsqueda y la ayuda abiertas desde el panel', () => {
    expect(enComoLlegar(COMO)).toBe(true)
    expect(enComoLlegar(BUSCAR_ORIGEN)).toBe(true)
    expect(enComoLlegar({ tipo: 'ayuda', sobre: COMO })).toBe(true)
  })
})

describe('reglas de selección (seleccion-de-recorrido)', () => {
  it('intercambiar con los dos datos', () => {
    const s = reducir(estado(COMO, { origen: 'biblioteca', destino: 'aula-121' }), {
      tipo: 'intercambiar',
    })
    expect(s.seleccion).toMatchObject({ origen: 'aula-121', destino: 'biblioteca' })
    expect(faseComoLlegar(s.seleccion)).toBe('ruta')
  })

  it('intercambiar con el origen vacío deja el destino vacío y no hay ruta', () => {
    const s = reducir(estado(COMO, { destino: 'aula-121' }), { tipo: 'intercambiar' })
    expect(s.seleccion).toMatchObject({ origen: 'aula-121', destino: null })
    expect(faseComoLlegar(s.seleccion)).toBe('eligiendo')
  })

  it('cambiar el origen conserva el destino', () => {
    const s = reducir(estado(BUSCAR_ORIGEN, { origen: 'biblioteca', destino: 'aula-121' }), {
      tipo: 'elegir-resultado',
      lugarId: 'teatro',
    })
    expect(s.seleccion).toMatchObject({ origen: 'teatro', destino: 'aula-121' })
  })

  it('cambiar el destino conserva el origen', () => {
    const s = reducir(estado(BUSCAR_DESTINO, { origen: 'biblioteca', destino: 'aula-121' }), {
      tipo: 'elegir-resultado',
      lugarId: 'aula-302',
    })
    expect(s.seleccion).toMatchObject({ origen: 'biblioteca', destino: 'aula-302' })
  })

  it('elegir origen desde la hoja conserva el destino', () => {
    const s = reducir(estado(COMO, { destino: 'aula-121' }), {
      tipo: 'elegir-origen',
      lugarId: 'buffet',
    })
    expect(s.seleccion).toMatchObject({ origen: 'buffet', destino: 'aula-121' })
  })

  it('borrar el destino conserva el origen y deja la fase en eligiendo', () => {
    const s = reducir(estado(COMO, { origen: 'biblioteca', destino: 'aula-121' }), {
      tipo: 'borrar-destino',
    })
    expect(s.seleccion).toMatchObject({ origen: 'biblioteca', destino: null })
    expect(faseComoLlegar(s.seleccion)).toBe('eligiendo')
  })

  it('Cancelar borra el origen y el destino y deja la fase en eligiendo', () => {
    const s = reducir(estado(COMO, { origen: 'biblioteca', destino: 'aula-121' }), {
      tipo: 'limpiar',
    })
    expect(s.seleccion).toMatchObject({ origen: null, destino: null })
    expect(s.vista).toEqual(COMO)
    expect(faseComoLlegar(s.seleccion)).toBe('eligiendo')
  })

  it('origen igual al destino no es fase ruta', () => {
    const s = reducir(estado(BUSCAR_ORIGEN, { destino: 'biblioteca' }), {
      tipo: 'elegir-resultado',
      lugarId: 'biblioteca',
    })
    expect(faseComoLlegar(s.seleccion)).toBe('eligiendo')
  })

  it('la sugerencia solo es origen al confirmarla', () => {
    const conSugerencia = estado(COMO, { destino: 'aula-121', sugerenciaOrigen: 'entrada' })
    expect(faseComoLlegar(conSugerencia.seleccion)).toBe('eligiendo')
    const s = reducir(conSugerencia, { tipo: 'confirmar-sugerencia' })
    expect(s.seleccion.origen).toBe('entrada')
    expect(faseComoLlegar(s.seleccion)).toBe('ruta')
  })

  it('Atrás (restaurar) no deshace la selección', () => {
    const s = reducir(estado(COMO, { origen: 'a', destino: 'b' }), {
      tipo: 'restaurar',
      vista: INICIO,
    })
    expect(s.seleccion).toMatchObject({ origen: 'a', destino: 'b' })
  })
})

describe('hash y serialización', () => {
  const existe = (id: string) => id === 'humanidades-121'

  it('cada vista tiene su hash', () => {
    expect(hashDeVista(INICIO)).toBe('#como-llegar')
    expect(hashDeVista(BUSCAR_DESTINO)).toBe('#buscar')
    expect(hashDeVista(BUSCAR_ORIGEN)).toBe('#buscar-origen')
    expect(hashDeVista({ tipo: 'ayuda', sobre: COMO })).toBe('#ayuda')
  })

  it('carga en frío: #buscar abre la búsqueda del destino; todo lo demás cae en Cómo llegar', () => {
    expect(vistaDeHash('#buscar', existe)).toEqual(BUSCAR_DESTINO)
    expect(vistaDeHash('#ayuda', existe)).toEqual({ tipo: 'ayuda', sobre: COMO })
    // Los enlaces viejos a una ficha (por id de lugar o de puerta) ya no abren la ficha.
    expect(vistaDeHash('#lugar/humanidades-121', existe)).toEqual(INICIO)
    expect(vistaDeHash('#lugar/puerta-humanidades-121', existe)).toEqual(INICIO)
    expect(vistaDeHash('#lugar/no-existe', existe)).toEqual(INICIO)
    expect(vistaDeHash('#como-llegar', existe)).toEqual(INICIO)
    expect(vistaDeHash('#cualquier-cosa', existe)).toEqual(INICIO)
    expect(vistaDeHash('#lugar/%E0%A4%A', existe)).toEqual(INICIO)
    expect(vistaDeHash('', existe)).toEqual(INICIO)
  })

  it('el estado se serializa a JSON y se reconstruye equivalente', () => {
    const estados: EstadoPantalla[] = [
      estadoInicial('entrada-central-principal'),
      estado({ tipo: 'ayuda', sobre: BUSCAR_ORIGEN }, { origen: 'a', destino: 'b' }, 'lab'),
      estado(BUSCAR_DESTINO, { destino: 'b' }, '121'),
    ]
    for (const e of estados) {
      const copia = JSON.parse(JSON.stringify(e)) as EstadoPantalla
      expect(copia).toEqual(e)
      expect(esVista(copia.vista)).toBe(true)
      expect(faseComoLlegar(copia.seleccion)).toBe(faseComoLlegar(e.seleccion))
    }
  })

  it('esVista rechaza lo que no es una vista', () => {
    expect(esVista(null)).toBe(false)
    expect(esVista({ tipo: 'otra' })).toBe(false)
    expect(esVista({ tipo: 'buscando', campo: 'x', desde: 'inicio' })).toBe(false)
    expect(esVista({ tipo: 'ayuda', sobre: { tipo: 'ayuda', sobre: INICIO } })).toBe(false)
  })
})
