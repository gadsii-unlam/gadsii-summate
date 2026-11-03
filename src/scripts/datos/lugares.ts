import type {
  Caja,
  CatalogoLugares,
  GrafoCampus,
  Lugar,
  NodoCampus,
  Piso,
} from '../../src/datos/tipos.ts'
import type { Departamentos, LugaresCurados, NodoFuente } from './fuentes.ts'
import { DEPTO_VEREDAS } from './grafo.ts'
import { categoriaPorReglas, derivarNombre, numeroAula } from './nombres.ts'
import { aviso, error, info, type Problema } from './problemas.ts'
import { hashCorto } from './version.ts'

/** Departamento cuyos lugares son edificios propios (Biblioteca, Teatro, Gimnasio…). */
const DEPTO_SERVICIOS = 'servicios'

const comparar = (a: string, b: string): number =>
  a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })

/**
 * Parte del id de la puerta que no es del lugar: `puerta-<depto>-` (ids con el departamento,
 * como `puerta-humanidades-121`), `puerta-` o `acceso-` (`puerta-aula-121`, `acceso-buffet`).
 */
export function prefijoDePuerta(nodo: Pick<NodoCampus, 'id' | 'depto'>): string {
  const conDepto = `puerta-${nodo.depto}-`
  if (nodo.id.startsWith(conDepto)) return conDepto
  return /^(puerta|acceso)-/.exec(nodo.id)?.[0] ?? ''
}

/** Parte del id de la puerta que nombra al lugar (`121`, `aula-121`, `buffet`). */
export function restoDePuerta(nodo: Pick<NodoCampus, 'id' | 'depto'>): string {
  return nodo.id.slice(prefijoDePuerta(nodo).length)
}

export interface GrupoPuertas {
  /** Id del lugar: `<depto>-<base>` si el id de la puerta tiene el departamento; si no, `<base>`. */
  id: string
  depto: string
  /** Parte del id sin el depto ni los sufijos de puerta (`gimnasio`, `230`, `estudio-2`). */
  base: string
  puertas: string[]
}

/**
 * Agrupa las puertas por sufijo (design.md, D6): `-N` (N de 2 a 9) se saca si existe la puerta
 * sin ese sufijo o si lo que queda es un número de aula; si no, el sufijo es parte del nombre.
 */
export function agruparPuertas(puertas: readonly Pick<NodoCampus, 'id' | 'depto'>[]): {
  grupos: GrupoPuertas[]
  problemas: Problema[]
} {
  const problemas: Problema[] = []
  const existentes = new Set(puertas.map((p) => p.id))
  const grupos = new Map<string, GrupoPuertas>()

  const principales = new Map<string, string>()
  for (const p of puertas) {
    const prefijo = prefijoDePuerta(p)
    let base = restoDePuerta(p)
    for (;;) {
      const m = /^(.*)-([2-9])$/.exec(base)
      if (!m) break
      const sinSufijo = m[1] as string
      const existeBase = existentes.has(`${prefijo}${sinSufijo}`)
      if (!existeBase && numeroAula(sinSufijo) === null) break
      if (!existeBase) {
        problemas.push(
          aviso(
            'puerta-sufijo-sin-base',
            `La puerta ${p.id} tiene sufijo -${m[2]} pero no existe ${prefijo}${sinSufijo}; se agrupa en el aula ${sinSufijo}.`,
            [p.id],
          ),
        )
      }
      base = sinSufijo
    }
    const id = prefijo === `puerta-${p.depto}-` ? `${p.depto}-${base}` : base
    const grupo = grupos.get(id) ?? { id, depto: p.depto, base, puertas: [] }
    grupo.puertas.push(p.id)
    grupos.set(id, grupo)
    principales.set(id, `${prefijo}${base}`)
  }

  for (const g of grupos.values()) {
    const principal = principales.get(g.id)
    g.puertas.sort((a, b) => (a === principal ? -1 : b === principal ? 1 : comparar(a, b)))
  }
  return { grupos: [...grupos.values()], problemas }
}

export function cajaDe(nodos: readonly Pick<NodoCampus, 'x' | 'y'>[]): Caja {
  const xs = nodos.map((n) => n.x)
  const ys = nodos.map((n) => n.y)
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) }
}

const unicos = (lista: readonly string[]): string[] => [...new Set(lista)]

/** Números de aula que faltan entre dos aulas existentes del campus (huecos de uno solo). */
export function huecosDeNumeracion(numeros: readonly number[]): number[] {
  const orden = [...new Set(numeros)].sort((a, b) => a - b)
  const huecos: number[] = []
  for (let i = 1; i < orden.length; i++) {
    const anterior = orden[i - 1] as number
    if ((orden[i] as number) - anterior === 2) huecos.push(anterior + 1)
  }
  return huecos
}

const PISOS: readonly Piso[] = ['PB', '1', '2', '3']

/**
 * Arma el catálogo de lugares (design.md, D6) a partir de las puertas del grafo, las entradas al
 * campus y la curación a mano. `fuente` son los nodos de `datos-fuente/grafo.json`: de ahí salen
 * el nombre y la categoría que trae el plano (la curación los pisa).
 */
export function armarCatalogo(
  grafo: GrafoCampus,
  curados: LugaresCurados,
  fuente: readonly Pick<NodoFuente, 'id' | 'nombre' | 'categoria' | 'sala'>[] = [],
  departamentos: Departamentos | null = null,
): { catalogo: CatalogoLugares; problemas: Problema[] } {
  const problemas: Problema[] = []
  const nodos = new Map(grafo.nodos.map((n) => [n.id, n]))
  const delPlano = new Map(fuente.map((n) => [n.id, n]))
  const sinSala = new Set(curados.sinSala ?? [])
  const curacion = curados.lugares
  const pisoDe = (id: string): Piso => {
    const piso = nodos.get(id)?.piso ?? 0
    const nombre = PISOS[piso]
    if (nombre === undefined) {
      problemas.push(
        error('lugar-piso', `La puerta ${id} está en el piso ${piso}, que no se conoce.`, [id]),
      )
      return 'PB'
    }
    return nombre
  }

  // 1. Agrupación automática y agrupación a mano (pisa la automática).
  const puertas = grafo.nodos.filter((n) => n.tipo === 'puerta')
  const agrupacion = agruparPuertas(puertas)
  problemas.push(...agrupacion.problemas)
  let grupos = agrupacion.grupos

  for (const [id, c] of Object.entries(curacion)) {
    if (!c.puertas) continue
    const faltantes = c.puertas.filter((p) => !nodos.has(p))
    for (const f of faltantes) {
      problemas.push(
        error(
          'lugar-puerta-inexistente',
          `El lugar ${id} tiene la puerta ${f}, que no existe en el grafo.`,
          [id, f],
        ),
      )
    }
    if (faltantes.length > 0) continue
    const fijadas = new Set(c.puertas)
    grupos = grupos
      .map((g) => ({ ...g, puertas: g.puertas.filter((p) => !fijadas.has(p)) }))
      .filter((g) => g.puertas.length > 0 && g.id !== id)
    const primera = nodos.get(c.puertas[0] as string) as NodoCampus
    const depto = primera.depto
    const base = id.startsWith(`${depto}-`) ? id.slice(depto.length + 1) : id
    grupos.push({ id, depto, base, puertas: [...c.puertas] })
  }

  // 2. Edificios.
  const deptosSinNombre = new Set<string>()
  const edificioDe = (depto: string, nombreLugar: string): string => {
    if (depto === DEPTO_SERVICIOS) return nombreLugar
    const curado = curados.edificios[depto]
    if (curado !== undefined) return curado
    deptosSinNombre.add(depto)
    return depto.charAt(0).toUpperCase() + depto.slice(1).replaceAll('-', ' ')
  }

  const referencias = new Set(curados.referencias)
  const lugares: Lugar[] = []
  const armar = (
    id: string,
    depto: string,
    base: string,
    idsPuertas: string[],
    categoriaFija?: Lugar['categoria'],
  ): Lugar => {
    const c = curacion[id]
    const principal = delPlano.get(idsPuertas[0] as string)
    const nombre = c?.nombre ?? principal?.nombre ?? derivarNombre(base)
    const numero = numeroAula(base)
    return {
      id,
      nombre,
      edificio: c?.edificio ?? edificioDe(depto, nombre),
      depto,
      categoria: c?.categoria ?? categoriaFija ?? principal?.categoria ?? categoriaPorReglas(base),
      puertas: idsPuertas,
      caja: cajaDe(idsPuertas.map((p) => nodos.get(p) as NodoCampus)),
      alias: unicos([...(numero !== null ? [numero] : []), ...(c?.alias ?? [])]),
      piso: pisoDe(idsPuertas[0] as string),
      referencia: referencias.has(id),
      indicacion: null,
      nombreCurado: c?.nombre !== undefined || principal?.nombre !== undefined,
      departamento: null,
      sala: sinSala.has(id) ? null : (principal?.sala ?? null),
    }
  }

  for (const g of grupos) lugares.push(armar(g.id, g.depto, g.base, g.puertas))

  // 3. Entradas al campus: un lugar por cada nodo `entrada-central-*`, con su propio nodo como puerta.
  for (const n of grafo.nodos) {
    if (n.tipo !== 'entrada' || n.depto !== DEPTO_VEREDAS) continue
    const resto = n.id.replace(`entrada-${DEPTO_VEREDAS}-`, '')
    const lugar = armar(n.id, n.depto, resto, [n.id], 'entrada')
    if (!lugar.nombreCurado) lugar.nombre = `Entrada ${derivarNombre(resto)}`
    lugares.push(lugar)
  }

  // 4. Lugares de otros pisos (solo los verificados).
  for (const op of curados.otrosPisos) {
    const faltantes = op.accesos.filter((a) => !nodos.has(a))
    for (const f of faltantes) {
      problemas.push(
        error(
          'lugar-puerta-inexistente',
          `El lugar ${op.id} (piso ${op.piso}) tiene el acceso ${f}, que no existe en el grafo.`,
          [op.id, f],
        ),
      )
    }
    if (faltantes.length > 0) continue
    if (!op.verificado) {
      problemas.push(
        aviso(
          'otro-piso-sin-verificar',
          `El lugar ${op.id} (${op.nombre}, piso ${op.piso}) no tiene la indicación verificada; no entra al catálogo.`,
          [op.id],
        ),
      )
      continue
    }
    const base = op.id.startsWith(`${op.depto}-`) ? op.id.slice(op.depto.length + 1) : op.id
    const numero = numeroAula(base)
    lugares.push({
      id: op.id,
      nombre: op.nombre,
      edificio: op.edificio ?? edificioDe(op.depto, op.nombre),
      depto: op.depto,
      categoria: op.categoria ?? categoriaPorReglas(base),
      puertas: [...op.accesos],
      caja: cajaDe(op.accesos.map((a) => nodos.get(a) as NodoCampus)),
      alias: unicos([...(numero !== null ? [numero] : []), ...(op.alias ?? [])]),
      piso: op.piso,
      referencia: referencias.has(op.id),
      indicacion: op.indicacion,
      nombreCurado: true,
      departamento: null,
      sala: null,
    })
  }

  if (departamentos) problemas.push(...asignarDepartamentos(lugares, departamentos))
  for (const id of sinSala) {
    if (!lugares.some((l) => l.id === id)) {
      problemas.push(
        aviso('curacion-sin-lugar', `sinSala menciona ${id}, que no es un lugar.`, [id]),
      )
    }
  }

  // Ids únicos.
  const vistos = new Set<string>()
  for (const l of lugares) {
    if (vistos.has(l.id))
      problemas.push(error('lugar-repetido', `Hay dos lugares con el id ${l.id}.`, [l.id]))
    vistos.add(l.id)
  }

  // 5. Avisos del catálogo.
  for (const d of [...deptosSinNombre].sort()) {
    problemas.push(
      aviso(
        'edificio-sin-nombre',
        `El departamento ${d} no tiene nombre de edificio en lugares-curados.json.`,
        [d],
      ),
    )
  }
  for (const id of Object.keys(curacion)) {
    if (!vistos.has(id)) {
      problemas.push(
        aviso(
          'curacion-sin-lugar',
          `lugares-curados.json tiene datos para ${id}, pero ese lugar no existe.`,
          [id],
        ),
      )
    }
  }
  for (const id of curados.referencias) {
    if (!vistos.has(id)) {
      problemas.push(
        aviso('referencia-sin-lugar', `La referencia ${id} no corresponde a ningún lugar.`, [id]),
      )
    }
  }
  const porNombre = new Map<string, string[]>()
  for (const l of lugares) {
    const clave = `${l.edificio}|${l.nombre.toLocaleLowerCase('es')}`
    porNombre.set(clave, [...(porNombre.get(clave) ?? []), l.id])
  }
  for (const [clave, ids] of porNombre) {
    if (ids.length > 1) {
      const [edificio] = clave.split('|')
      problemas.push(
        aviso('nombre-repetido', `Mismo nombre visible en ${edificio}: ${ids.join(', ')}.`, ids),
      )
    }
  }
  for (const p of curados.pendientes) {
    problemas.push(
      aviso('lugar-pendiente', `Pendiente en ${p.depto}: ${p.lugar}. ${p.nota}`, [
        `${p.depto}:${p.lugar}`,
      ]),
    )
  }
  const numeros = lugares
    .filter((l) => l.piso === 'PB' && l.categoria === 'aula')
    .map((l) => numeroAula(l.id.startsWith(`${l.depto}-`) ? l.id.slice(l.depto.length + 1) : l.id))
    .filter((n) => n !== null)
    .map(Number)
  const huecos = huecosDeNumeracion(numeros)
  if (huecos.length > 0) {
    problemas.push(
      aviso(
        'hueco-numeracion',
        `Posibles aulas faltantes (número ausente entre dos aulas existentes): ${huecos.join(', ')}.`,
        huecos.map(String),
      ),
    )
  }
  const varias = lugares.filter((l) => l.puertas.length > 1)
  problemas.push(
    info(
      'lugares-varias-puertas',
      `${varias.length} lugares con varias puertas (revisar la agrupación): ${varias.map((l) => `${l.id} (${l.puertas.length})`).join(', ')}.`,
      varias.map((l) => l.id),
    ),
  )
  const derivados = lugares.filter((l) => !l.nombreCurado)
  problemas.push(
    info(
      'nombre-derivado',
      `${derivados.length} de ${lugares.length} lugares usan el nombre derivado del id (sin curar).`,
      derivados.map((l) => l.id),
    ),
  )

  lugares.sort((a, b) => comparar(a.id, b.id))
  const version = hashCorto(JSON.stringify({ versionGrafo: grafo.version, lugares }))
  return { catalogo: { version, versionGrafo: grafo.version, lugares }, problemas }
}

/**
 * Departamento de cada lugar (`departamentos.json`): el cargado por id de lugar o, en las aulas,
 * el de su número. Devuelve los problemas: errores si el archivo se contradice, avisos para lo que
 * no se pudo asignar.
 */
export function asignarDepartamentos(lugares: Lugar[], departamentos: Departamentos): Problema[] {
  const problemas: Problema[] = []
  const nombre = (slug: string, donde: string): string | null => {
    const n = departamentos.nombres[slug]
    if (n === undefined) {
      problemas.push(
        error(
          'departamento-sin-nombre',
          `departamentos.json usa el departamento ${slug} (${donde}) pero no tiene nombre en "nombres".`,
          [slug],
        ),
      )
    }
    return n ?? null
  }
  const porNumero = new Map<number, string>()
  for (const [slug, numeros] of Object.entries(departamentos.aulas)) {
    for (const numero of numeros) {
      const previo = porNumero.get(numero)
      if (previo !== undefined && previo !== slug) {
        problemas.push(
          error(
            'departamento-aula-repetida',
            `El aula ${numero} está en dos departamentos de departamentos.json: ${previo} y ${slug}.`,
            [String(numero)],
          ),
        )
      }
      porNumero.set(numero, slug)
    }
  }
  const ids = new Set(lugares.map((l) => l.id))
  for (const id of Object.keys(departamentos.lugares)) {
    if (!ids.has(id)) {
      problemas.push(
        aviso('curacion-sin-lugar', `departamentos.json tiene el lugar ${id}, que no existe.`, [
          id,
        ]),
      )
    }
  }
  const sinDepartamento: string[] = []
  for (const l of lugares) {
    const base = l.id.startsWith(`${l.depto}-`) ? l.id.slice(l.depto.length + 1) : l.id
    const numero = numeroAula(base)
    const slug =
      departamentos.lugares[l.id] ?? (numero !== null ? porNumero.get(Number(numero)) : undefined)
    if (slug !== undefined) l.departamento = nombre(slug, l.id)
    else if (l.categoria === 'aula') sinDepartamento.push(l.id)
  }
  if (sinDepartamento.length > 0) {
    problemas.push(
      aviso(
        'aula-sin-departamento',
        `${sinDepartamento.length} aulas sin departamento en departamentos.json: ${sinDepartamento.join(', ')}.`,
        sinDepartamento,
      ),
    )
  }
  return problemas
}
