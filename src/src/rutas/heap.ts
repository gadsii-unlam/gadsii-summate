/** Entrada de la cola de A*: `f = g + h`, `h` y el índice del nodo (que sigue el orden de los ids). */
export interface EntradaCola {
  f: number
  h: number
  nodo: number
  /** Costo acumulado con el que se insertó (para descartar entradas viejas). */
  g: number
}

/** `true` si `a` sale antes que `b`: menor `f`, a igual `f` menor `h`, a igual `h` menor id. */
export function antes(a: EntradaCola, b: EntradaCola): boolean {
  if (a.f !== b.f) return a.f < b.f
  if (a.h !== b.h) return a.h < b.h
  return a.nodo < b.nodo
}

/**
 * Heap binario mínimo con inserción perezosa (decisión 8): si un nodo mejora se vuelve a
 * insertar, y quien saca la entrada vieja la descarta porque el nodo ya está cerrado.
 */
export class HeapMin {
  private readonly datos: EntradaCola[] = []

  get tamano(): number {
    return this.datos.length
  }

  insertar(entrada: EntradaCola): void {
    const datos = this.datos
    let i = datos.length
    datos.push(entrada)
    while (i > 0) {
      const padre = (i - 1) >> 1
      if (!antes(entrada, datos[padre]!)) break
      datos[i] = datos[padre]!
      i = padre
    }
    datos[i] = entrada
  }

  extraer(): EntradaCola | undefined {
    const datos = this.datos
    const tope = datos[0]
    const ultimo = datos.pop()
    if (tope === undefined || ultimo === undefined || datos.length === 0) return tope
    const n = datos.length
    let i = 0
    for (;;) {
      const izq = 2 * i + 1
      if (izq >= n) break
      const der = izq + 1
      const hijo = der < n && antes(datos[der]!, datos[izq]!) ? der : izq
      if (!antes(datos[hijo]!, ultimo)) break
      datos[i] = datos[hijo]!
      i = hijo
    }
    datos[i] = ultimo
    return tope
  }
}
