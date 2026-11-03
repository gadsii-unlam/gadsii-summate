// Tipos mínimos de `node:fs` para los tests que leen CSS (Vitest devuelve vacío un `.css?raw`).
// La app no usa Node: este archivo solo existe para el chequeo de tipos de los tests.
declare module 'node:fs' {
  export function readFileSync(ruta: URL | string, codificacion: 'utf8'): string
}
