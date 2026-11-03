/**
 * Genera los íconos de la app instalable (tolerar-senal-irregular, decisión 8) a partir del
 * marcador de `public/favicon.svg`. Se corre a mano cuando cambia el ícono:
 *
 *   npx tsx scripts/pwa/iconos.ts
 *
 * Escribe en `public/icons/`: 192 y 512 px (`any`), 512 px `maskable` (con margen de zona segura)
 * y 180 px para iOS (`apple-touch-icon`).
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { RAIZ } from '../rutas-proyecto.ts'

const AZUL = '#1A73E8'
const DIR = join(RAIZ, 'public', 'icons')

/** Marcador blanco sobre fondo azul. `escala` es la fracción del lado que ocupa el marcador. */
function svg(lado: number, escala: number, redondeo: number): string {
  const s = (lado * escala) / 24
  const desplazamiento = (lado - 24 * s) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <rect width="${lado}" height="${lado}" rx="${lado * redondeo}" fill="${AZUL}"/>
  <g transform="translate(${desplazamiento} ${desplazamiento}) scale(${s})">
    <path fill="#fff" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z"/>
    <circle cx="12" cy="9" r="2.5" fill="${AZUL}"/>
  </g>
</svg>`
}

const iconos = [
  { archivo: 'icono-192.png', lado: 192, escala: 0.72, redondeo: 0.18 },
  { archivo: 'icono-512.png', lado: 512, escala: 0.72, redondeo: 0.18 },
  // `maskable`: el sistema recorta hasta un círculo del 80 % del lado; el fondo llena todo.
  { archivo: 'icono-maskable-512.png', lado: 512, escala: 0.5, redondeo: 0 },
  // iOS redondea solo las esquinas: fondo lleno, sin transparencia.
  { archivo: 'apple-touch-icon-180.png', lado: 180, escala: 0.66, redondeo: 0 },
]

mkdirSync(DIR, { recursive: true })
for (const i of iconos) {
  await sharp(Buffer.from(svg(i.lado, i.escala, i.redondeo)))
    .png({ compressionLevel: 9 })
    .toFile(join(DIR, i.archivo))
  console.log(`public/icons/${i.archivo}`)
}
