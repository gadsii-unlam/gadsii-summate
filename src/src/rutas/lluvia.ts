import { armarRuta, calcularRuta } from './astar.ts'
import { HeapMin } from './heap.ts'
import type { ConsultaRuta, GrafoRuteable, ResultadoRuta, RutaEncontrada } from './tipos.ts'

/** Consulta de la ruta con lluvia: la misma que `calcularRuta`, sin criterio. */
export type ConsultaConLluvia = Omit<ConsultaRuta, 'criterio'>

/**
 * Ruta recomendada con lluvia (criterio `resguardada`). Es simétrica: la vuelta es la ida
 * invertida.
 *
 * La regla base mira una sola punta, la de llegada: si está dentro de un edificio y la otra punta
 * no está en ese mismo edificio, la ruta entra al edificio por la entrada más cercana a la llegada
 * (medida caminando bajo techo) y, hasta esa entrada, minimiza el tramo al aire libre (desempata
 * por distancia). Así se evita el rodeo largo que daría minimizar el exterior en todo el recorrido
 * (por ejemplo, del Aula 208 al Aula 417 por la pasarela norte). Si la entrada más cercana no se
 * puede usar (cierres), se prueba la siguiente.
 *
 * Para que no dependa del sentido, la regla se aplica tomando como llegada el destino y también el
 * origen (y esa segunda ruta se invierte). Se descartan las que no son más cortas que la
 * resguardada (no ahorran rodeo y tienen más exterior). De las que quedan, se queda con la de menos
 * tramo al aire libre y, a igual exterior, la más corta; si empatan en las dos cosas, con la
 * calculada desde el extremo de menor índice de nodo, como `calcularRuta`.
 *
 * Si no queda ninguna (mismo edificio, las dos puntas al aire libre, sin camino por ninguna
 * entrada, o ninguna más corta) devuelve lo mismo que `calcularRuta` con el criterio `resguardada`.
 *
 * Un "edificio" es un grupo de nodos unidos por aristas bajo techo que tiene al menos un nodo de
 * tipo `entrada`; sus entradas son esos nodos.
 */
export function calcularRutaConLluvia(
  grafo: GrafoRuteable,
  consulta: ConsultaConLluvia,
): ResultadoRuta {
  const resguardada = calcularRuta(grafo, { ...consulta, criterio: 'resguardada' })
  if (resguardada.tipo !== 'ruta') return resguardada

  // La regla está para acortar el rodeo de la resguardada: si no es más corta, no sirve (la
  // resguardada ya tiene el mínimo de exterior, así que sería peor o igual en las dos cosas).
  const sirve = (r: RutaEncontrada | null) =>
    r !== null && r.distanciaPx < resguardada.distanciaPx ? r : null
  const ida = sirve(porEntradaMasCercana(grafo, consulta))
  const vuelta = porEntradaMasCercana(grafo, {
    ...consulta,
    origen: consulta.destino,
    destino: consulta.origen,
  })
  const vueltaInvertida = sirve(vuelta && invertir(grafo, vuelta))
  if (ida === null || vueltaInvertida === null) return ida ?? vueltaInvertida ?? resguardada

  const diferencia =
    ida.exteriorPx - vueltaInvertida.exteriorPx || ida.distanciaPx - vueltaInvertida.distanciaPx
  if (diferencia !== 0) return diferencia < 0 ? ida : vueltaInvertida
  const menor = (ids: readonly string[]) => Math.min(...ids.map((id) => grafo.indiceNodo.get(id)!))
  return menor(consulta.origen) < menor(consulta.destino) ? ida : vueltaInvertida
}

/** La misma ruta recorrida al revés. */
function invertir(grafo: GrafoRuteable, ruta: RutaEncontrada): RutaEncontrada {
  return armarRuta(
    grafo,
    ruta.criterio,
    ruta.nodos.map((id) => grafo.indiceNodo.get(id)!).reverse(),
    ruta.aristas.map((id) => grafo.indiceArista.get(id)!).reverse(),
    ruta.nodosExpandidos,
  )
}

/** Índices de los nodos unidos a `desde` por aristas bajo techo (sin mirar los cierres). */
function zonaBajoTecho(grafo: GrafoRuteable, desde: readonly number[]): Set<number> {
  const zona = new Set(desde)
  const pendientes = [...desde]
  for (let u = pendientes.pop(); u !== undefined; u = pendientes.pop()) {
    for (const { nodo: v, arista } of grafo.nodos[u]!.vecinos) {
      if (grafo.aristas[arista]!.exterior || zona.has(v)) continue
      zona.add(v)
      pendientes.push(v)
    }
  }
  return zona
}

/** Regla base (en un solo sentido): entra al edificio destino por la entrada más cercana. */
function porEntradaMasCercana(
  grafo: GrafoRuteable,
  consulta: ConsultaConLluvia,
): RutaEncontrada | null {
  const nodosExcluidos = consulta.excluidos?.nodos ?? new Set<string>()
  const aristasExcluidas = consulta.excluidos?.aristas ?? new Set<string>()
  const indice = (id: string) => grafo.indiceNodo.get(id)!

  const destinos = [...new Set(consulta.destino)].filter((id) => !nodosExcluidos.has(id))
  if (destinos.length === 0) return null
  const indicesDestino = destinos.map(indice)

  // El edificio destino: todas las puertas de destino tienen que estar en el mismo edificio.
  const edificio = zonaBajoTecho(grafo, [indicesDestino[0]!])
  if (!indicesDestino.every((d) => edificio.has(d))) return null
  if (![...edificio].some((i) => grafo.nodos[i]!.tipo === 'entrada')) return null
  if (consulta.origen.some((id) => edificio.has(indice(id)))) return null

  // Dijkstra bajo techo desde las puertas de destino: distancia de cada entrada al destino.
  const n = grafo.nodos.length
  const distancia = new Float64Array(n).fill(Infinity)
  const siguiente = new Int32Array(n).fill(-1)
  const aristaSiguiente = new Int32Array(n).fill(-1)
  const cerrado = new Uint8Array(n)
  const cola = new HeapMin()
  for (const d of indicesDestino) {
    distancia[d] = 0
    cola.insertar({ f: 0, h: 0, nodo: d, g: 0 })
  }
  let expandidos = 0
  for (let e = cola.extraer(); e !== undefined; e = cola.extraer()) {
    const u = e.nodo
    if (cerrado[u] === 1 || e.g !== distancia[u]) continue
    cerrado[u] = 1
    expandidos++
    for (const { nodo: v, arista } of grafo.nodos[u]!.vecinos) {
      const a = grafo.aristas[arista]!
      if (a.exterior || cerrado[v] === 1) continue
      if (nodosExcluidos.has(grafo.nodos[v]!.id) || aristasExcluidas.has(a.id)) continue
      const dv = distancia[u]! + a.longitud
      if (dv < distancia[v]!) {
        distancia[v] = dv
        siguiente[v] = u
        aristaSiguiente[v] = arista
        cola.insertar({ f: dv, h: 0, nodo: v, g: dv })
      }
    }
  }

  const entradas = [...edificio]
    .filter((i) => grafo.nodos[i]!.tipo === 'entrada' && distancia[i] !== Infinity)
    .sort((a, b) => distancia[a]! - distancia[b]! || a - b)

  // Hasta la entrada no se puede pasar por adentro del edificio destino: se llega desde afuera.
  const resto = [...edificio].map((i) => grafo.nodos[i]!.id)
  for (const entrada of entradas) {
    const idEntrada = grafo.nodos[entrada]!.id
    const excluidos = new Set(nodosExcluidos)
    for (const id of resto) if (id !== idEntrada) excluidos.add(id)
    const hastaEntrada = calcularRuta(grafo, {
      origen: consulta.origen,
      destino: [idEntrada],
      criterio: 'resguardada',
      excluidos: { nodos: excluidos, aristas: aristasExcluidas },
    })
    if (hastaEntrada.tipo !== 'ruta') continue

    const nodos = hastaEntrada.nodos.map(indice)
    const aristas = hastaEntrada.aristas.map((id) => grafo.indiceArista.get(id)!)
    for (let v = entrada; siguiente[v]! !== -1; v = siguiente[v]!) {
      aristas.push(aristaSiguiente[v]!)
      nodos.push(siguiente[v]!)
    }
    return armarRuta(
      grafo,
      'resguardada',
      nodos,
      aristas,
      hastaEntrada.nodosExpandidos + expandidos,
    )
  }
  return null
}
