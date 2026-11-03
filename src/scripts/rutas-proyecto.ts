import { fileURLToPath } from 'node:url'

/** Rutas absolutas compartidas por los scripts del pipeline de datos. */
export const RAIZ = fileURLToPath(new URL('..', import.meta.url))
export const DIR_DATOS_FUENTE = fileURLToPath(new URL('../datos-fuente/', import.meta.url))
export const DIR_PUBLIC_DATA = fileURLToPath(new URL('../public/data/', import.meta.url))
