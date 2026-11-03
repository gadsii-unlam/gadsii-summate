/**
 * Normalización de textos para la búsqueda (design.md de construir-interfaz-movil, D6). Es la
 * misma para la consulta y para el índice: minúsculas, sin diacríticos, puntuación como espacio y
 * espacios colapsados.
 */

const NO_ALFANUMERICO = /[^\p{L}\p{N}]/u

export interface TextoNormalizado {
  texto: string
  /** Para cada carácter de `texto`, el índice del carácter del original del que salió. */
  origen: number[]
}

/** Normaliza y guarda de qué carácter del original sale cada carácter (para resaltar). */
export function normalizarConMapa(original: string): TextoNormalizado {
  const salida: string[] = []
  const origen: number[] = []
  let previoEspacio = true

  for (let i = 0; i < original.length; i++) {
    const base = (original[i] ?? '').toLocaleLowerCase('es').normalize('NFD').replace(/\p{M}/gu, '')
    for (const c of base) {
      if (NO_ALFANUMERICO.test(c)) {
        if (!previoEspacio) {
          salida.push(' ')
          origen.push(i)
        }
        previoEspacio = true
      } else {
        salida.push(c)
        origen.push(i)
        previoEspacio = false
      }
    }
  }
  if (salida[salida.length - 1] === ' ') {
    salida.pop()
    origen.pop()
  }
  return { texto: salida.join(''), origen }
}

/** "Lab. de Física" → "lab de fisica"; "BIBLIOTÉCA" → "biblioteca"; "ñ" → "n". */
export function normalizar(texto: string): string {
  return normalizarConMapa(texto).texto
}

/**
 * Normaliza lo que escribe el usuario: además descarta la palabra "aula" cuando viene seguida de
 * un número ("aula 121" → "121").
 */
export function normalizarConsulta(texto: string): string {
  const palabras = normalizar(texto).split(' ').filter(Boolean)
  return palabras.filter((p, i) => !(p === 'aula' && /^\d/.test(palabras[i + 1] ?? ''))).join(' ')
}
