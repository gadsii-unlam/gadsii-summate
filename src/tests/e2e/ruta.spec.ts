import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { abrir, arrastrar, caja, comoUsuarioConocido, esperarMapaQuieto } from './ayudas.ts'

// Ruta e indicaciones (mostrar-ruta-e-indicaciones). El ejemplo es Dirección de Alumnos (Edificio
// Oeste) → Dpto. de Cs. de la Salud (Edificio Este): la más corta (2 min · 125 m, cruza la franja
// entre edificios por el hall de Kinesiología) y la resguardada (5 min · 330 m, por los pasillos
// norte; entra al Edificio Este por la entrada oeste del pasillo norte).
//
// El mapa publica en su DOM los nodos de la ruta, las partes
// (bajo-techo/aire-libre), la alternativa y el paso resaltado (`data-ruta-*`), y las posiciones en
// pantalla se calculan con el zoom y el centro que publica el visor.

test.use({ serviceWorkers: 'block' })

const GRAFO = JSON.parse(
  readFileSync(new URL('../../public/data/grafo.json', import.meta.url), 'utf8'),
) as { nodos: { id: string; x: number; y: number }[] }
const POSICION = new Map(GRAFO.nodos.map((n) => [n.id, n]))

/**
 * Punto de la pantalla donde está anclado el marcador de destino: el centro del punto de la
 * puerta (si la sala está resaltada) o la punta del pin (si el lugar no tiene sala).
 */
async function anclaDestino(page: Page) {
  const d = await caja(page, '.ruta__marcador--destino')
  const esPuerta = (await page.locator('.ruta__marcador--puerta').count()) > 0
  return { x: d.x + d.width / 2, y: esPuerta ? d.y + d.height / 2 : d.y + d.height - 1.5 }
}

/**
 * Posición en la pantalla (px CSS) de un nodo del grafo. La escala y el desplazamiento salen de
 * los dos marcadores de la ruta (círculo de origen y marcador de destino), que Leaflet ubica en
 * las puertas que usa la ruta.
 */
async function enPantalla(page: Page, id: string) {
  const n = POSICION.get(id)
  if (!n) throw new Error(`nodo desconocido ${id}`)
  const nodos = (await mapa(page).getAttribute('data-ruta-nodos'))!.split(' ')
  const a = POSICION.get(nodos[0]!)!
  const b = POSICION.get(nodos.at(-1)!)!
  const o = await caja(page, '.ruta__marcador--origen')
  const sa = { x: o.x + o.width / 2, y: o.y + o.height / 2 }
  const sb = await anclaDestino(page)
  const s = Math.hypot(sb.x - sa.x, sb.y - sa.y) / Math.hypot(b.x - a.x, b.y - a.y)
  return { x: sa.x + (n.x - a.x) * s, y: sa.y + (n.y - a.y) * s }
}

/** Franja del mapa que no tapan la tarjeta superior ni la hoja. */
async function franja(page: Page) {
  const tarjeta = await caja(page, '.tarjeta-superior')
  const hoja = await caja(page, '.hoja')
  const vp = page.viewportSize()!
  return { arriba: tarjeta.y + tarjeta.height, abajo: hoja.y, ancho: vp.width }
}

async function enFranja(page: Page, id: string) {
  const p = await enPantalla(page, id)
  const f = await franja(page)
  return p.y >= f.arriba && p.y <= f.abajo && p.x >= 0 && p.x <= f.ancho
}

const mapa = (page: Page) => page.locator('.mapa')
const tarjetaResumen = (page: Page) => page.getByTestId('ruta-resumen')
const chip = (page: Page, nombre: RegExp) =>
  page.getByRole('list', { name: 'Opciones de ruta' }).getByRole('button', { name: nombre })

async function elegir(page: Page, texto: string, opcion: RegExp) {
  await page.getByRole('combobox').fill(texto)
  await page.getByRole('option', { name: opcion }).first().tap()
}

/** Pide la ruta de `origen` a `destino` y espera a que esté dibujada. */
async function pedirRuta(
  page: Page,
  busqueda: string,
  destino: [string, RegExp] = ['Salud', /^Dpto\. de Cs\. de la Salud/],
  origen: [string, RegExp] = ['Alumnos', /^Dirección de Alumnos/],
  { esperarRuta = true } = {},
) {
  await abrir(page, `/${busqueda}`)
  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await elegir(page, ...destino)
  await page.getByRole('button', { name: /^Cómo llegar$/ }).tap()
  await page.getByRole('button', { name: /^Punto de partida/ }).tap()
  await elegir(page, ...origen)
  if (esperarRuta) {
    await expect(mapa(page)).toHaveAttribute('data-ruta-nodos', /puerta-/)
    await esperarMapaQuieto(page)
  }
}

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
})

test('recorrido completo con lluvia: espera, resguardada encuadrada, más rápida y finalizar', async ({
  page,
}) => {
  // El clima tarda 1,2 s: se ve "Buscando el camino…".
  await page.route('**/api/clima/lluvia.json', async (ruta) => {
    await new Promise((r) => setTimeout(r, 1200))
    await ruta.continue()
  })
  await pedirRuta(page, '?clima=lluvia', undefined, undefined, { esperarRuta: false })
  await expect(page.getByText('Buscando el camino…')).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Buscando el camino' })).toBeVisible()
  await expect(mapa(page)).not.toHaveAttribute('data-ruta-nodos', /.+/)
  await expect(mapa(page)).toHaveAttribute('data-ruta-nodos', /entrada-ed-este-norte-lado-oeste/)
  await expect(page.getByText('Buscando el camino…')).toHaveCount(0)
  await esperarMapaQuieto(page)

  // Más resguardada, recomendada, encuadrada, con el tramo de vereda en celeste y la leyenda.
  await expect(chip(page, /^Más resguardada · 5 min/)).toHaveAttribute('aria-pressed', 'true')
  await expect(chip(page, /^Más resguardada/)).toContainText('Recomendada con lluvia')
  await expect(tarjetaResumen(page)).toContainText('5 min · 330 m')
  await expect(mapa(page)).toHaveAttribute('data-ruta-partes', 'bajo-techo aire-libre bajo-techo')
  await expect(page.getByRole('list', { name: 'Referencias de la ruta' })).toBeVisible()
  expect(await enFranja(page, 'puerta-direccion-alumnos')).toBe(true)
  expect(await enFranja(page, 'puerta-dpto-cs-salud')).toBe(true)

  // Más rápida.
  await chip(page, /^Más rápida/).tap()
  await expect(tarjetaResumen(page)).toContainText('2 min · 125 m')
  await expect(tarjetaResumen(page)).toContainText('Incluye 55 m al aire libre')
  await expect(mapa(page)).toHaveAttribute('data-ruta-nodos', /entrada-ed-este-kinesiologia/)

  // Sin indicaciones paso a paso: el camino se sigue en el mapa.
  await expect(page.getByRole('button', { name: 'Indicaciones' })).toHaveCount(0)

  // Finalizar viaje: vuelve al inicio sin ruta.
  await page.getByRole('button', { name: 'Iniciar', exact: true }).tap()
  await page.getByRole('button', { name: 'Finalizar viaje' }).tap()
  await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
  await expect(mapa(page)).not.toHaveAttribute('data-ruta-nodos', /.+/)
  await expect(page.locator('.ruta__marcador')).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Referencias de la ruta' })).toHaveCount(0)
})

test('?clima=lento: "Buscando el camino…" con barra y después la ruta', async ({ page }) => {
  await pedirRuta(page, '?clima=lento', undefined, undefined, { esperarRuta: false })
  await expect(page.getByTestId('contenido-ruta')).toContainText('Buscando el camino…')
  await expect(page.getByRole('progressbar')).toBeVisible()
  await expect(tarjetaResumen(page)).toContainText('5 min · 330 m', { timeout: 6000 })
  await expect(page.getByText('Buscando el camino…')).toHaveCount(0)
})

test('el tramo al aire libre se ve en celeste y los interiores en azul, ambos continuos (390 × 844)', async ({
  page,
}) => {
  await pedirRuta(page, '?clima=seco')
  await expect(mapa(page)).toHaveAttribute('data-ruta-partes', 'bajo-techo aire-libre bajo-techo')
  await expect(page.getByRole('list', { name: 'Referencias de la ruta' })).toBeVisible()
  const imagen = await page.screenshot({ scale: 'css' })
  const { data, info } = await sharp(imagen).raw().toBuffer({ resolveWithObject: true })
  const color = (x: number, y: number) => {
    const i = (Math.round(y) * info.width + Math.round(x)) * info.channels
    return [data[i]!, data[i + 1]!, data[i + 2]!] as const
  }
  // #1A73E8 (bajo techo) y #7CB4F8 (al aire libre); el borde #174EA6 cuenta en los dos.
  const azul = ([r, g, b]: readonly number[]) => b! > 140 && r! < 80 && g! < 150
  const celeste = ([r, g, b]: readonly number[]) => b! > 220 && r! > 90 && r! < 160 && g! > 150
  /** Fracción de píxeles que cumplen `es` en el 60 % central del tramo entre dos nodos. */
  const cubierto = async (a: string, b: string, es: (c: readonly number[]) => boolean) => {
    const p = await enPantalla(page, a)
    const q = await enPantalla(page, b)
    let si = 0
    const n = 60
    for (let k = 0; k < n; k++) {
      const t = 0.2 + (0.6 * k) / (n - 1)
      if (es(color(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t))) si++
    }
    return si / n
  }
  expect(
    await cubierto(
      'cruce--ext-cruce-franjas-1773--ext-franja-entre-edificios-oeste',
      'cruce--ext-cruce-franjas-1773--ext-franja-entre-edificios-este',
      celeste,
    ),
  ).toBeGreaterThan(0.95)
  expect(
    await cubierto(
      'pasillo-frente-direccion-alumnos',
      'cruce--oeste-hall-auditorios--oeste-pasillo-309-325',
      azul,
    ),
  ).toBeGreaterThan(0.95)
})

test('al arrastrar con la ruta cargada, lo que entra a la pantalla ya está dibujado (sin pedacitos)', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'arrastra con eventos táctiles de CDP (solo Chromium)')
  await pedirRuta(page, '?clima=seco')
  // Zoom máximo (2): la ruta sale bastante de la pantalla.
  await mapa(page).focus()
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Equal')
    await page.waitForTimeout(350)
  }
  await esperarMapaQuieto(page)
  await expect(mapa(page)).toHaveAttribute('data-zoom', '2')

  // Un tramo de la ruta bien afuera del lienzo que Leaflet dibuja por defecto (pantalla + 10 %).
  const vp = page.viewportSize()!
  const nodos = (await mapa(page).getAttribute('data-ruta-nodos'))!.split(' ')
  const lejos = (p: { x: number; y: number }) =>
    p.x < -0.25 * vp.width ||
    p.x > 1.25 * vp.width ||
    p.y < -0.25 * vp.height ||
    p.y > 1.25 * vp.height
  let tramo: [string, string] | null = null
  for (let i = 0; i + 1 < nodos.length && !tramo; i++) {
    const [p, q] = [await enPantalla(page, nodos[i]!), await enPantalla(page, nodos[i + 1]!)]
    const largo = Math.hypot(q.x - p.x, q.y - p.y)
    if (lejos(p) && lejos(q) && largo > 40 && largo < 0.6 * vp.width)
      tramo = [nodos[i]!, nodos[i + 1]!]
  }
  expect(tramo, 'hay un tramo de la ruta fuera de la pantalla').not.toBeNull()

  // Arrastra con el dedo hasta traer el tramo al centro de la franja, sin soltar: Leaflet todavía
  // no volvió a dibujar nada, así que lo que se ve es lo que ya estaba dibujado.
  const [a, b] = [await enPantalla(page, tramo![0]), await enPantalla(page, tramo![1])]
  const f = await franja(page)
  const centro = { x: f.ancho / 2, y: (f.arriba + f.abajo) / 2 }
  const delta = { x: centro.x - (a.x + b.x) / 2, y: centro.y - (a.y + b.y) / 2 }
  const desde = { x: vp.width / 2, y: (f.arriba + f.abajo) / 2 }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...desde, id: 1 }],
  })
  const pasos = 30
  for (let i = 1; i <= pasos; i++) {
    const p = { x: desde.x + (delta.x * i) / pasos, y: desde.y + (delta.y * i) / pasos }
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ ...p, id: 1 }],
    })
    await page.waitForTimeout(16)
  }
  await page.waitForTimeout(100)

  const imagen = await page.screenshot({ scale: 'css' })
  const { data, info } = await sharp(imagen).raw().toBuffer({ resolveWithObject: true })
  const [p, q] = [await enPantalla(page, tramo![0]), await enPantalla(page, tramo![1])]
  // El tramo quedó dentro de la franja visible.
  for (const punto of [p, q]) {
    expect(punto.y).toBeGreaterThan(f.arriba)
    expect(punto.y).toBeLessThan(f.abajo)
  }
  // Azul (#1A73E8, borde #174EA6) o celeste (#7CB4F8, al aire libre).
  const deRuta = (x: number, y: number) => {
    const i = (Math.round(y) * info.width + Math.round(x)) * info.channels
    const [r, g, bl] = [data[i]!, data[i + 1]!, data[i + 2]!]
    return (bl > 140 && r < 80 && g < 150) || (bl > 220 && r > 90 && r < 160 && g > 150)
  }
  let si = 0
  const n = 60
  for (let k = 0; k < n; k++) {
    const t = 0.1 + (0.8 * k) / (n - 1)
    if (deRuta(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t)) si++
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  expect(si / n).toBeGreaterThan(0.95)
})

test('Aula 121 → Aula 110 es toda bajo techo: sin leyenda', async ({ page }) => {
  await pedirRuta(page, '?clima=seco', ['110', /^Aula 110/], ['121', /^Aula 121/])
  await expect(tarjetaResumen(page)).toContainText('Todo bajo techo')
  await expect(mapa(page)).toHaveAttribute('data-ruta-partes', 'bajo-techo')
  await expect(page.getByRole('list', { name: 'Referencias de la ruta' })).toHaveCount(0)
})

test('ruta al Gimnasio: la sala resaltada, el punto en acceso-gimnasio-sur, el plano en gris y ningún pin', async ({
  page,
}) => {
  await pedirRuta(page, '?clima=seco', ['Gimnasio', /^Gimnasio/], ['121', /^Aula 121/])
  await expect(mapa(page)).toHaveAttribute('data-ruta-nodos', /acceso-gimnasio-sur$/)
  await expect(page.locator('path.ruta__sala-destino')).toHaveCount(1)
  await expect(page.locator('.ruta__marcador--puerta')).toHaveCount(1)
  await expect(page.locator('.ruta__marcador--destino svg')).toHaveCount(0)
  await expect(mapa(page)).toHaveClass(/mapa--con-ruta/)
  expect(
    await page.locator('.leaflet-plano-pane').evaluate((pane) => getComputedStyle(pane).filter),
  ).toContain('grayscale(1)')
  // El punto de la puerta está sobre el último punto de la línea, a la izquierda del origen y
  // arriba, como el acceso sur respecto del Aula 121.
  const punto = await anclaDestino(page)
  const origen = await caja(page, '.ruta__marcador--origen')
  const g2 = POSICION.get('acceso-gimnasio-sur')!
  const a121 = POSICION.get('puerta-aula-121')!
  const escalaX = (origen.x + origen.width / 2 - punto.x) / (a121.x - g2.x)
  const escalaY = (origen.y + origen.height / 2 - punto.y) / (a121.y - g2.y)
  expect(escalaX).toBeGreaterThan(0)
  expect(Math.abs(escalaX - escalaY) / escalaX).toBeLessThan(0.05)
  await expect(page.locator('.mapa__pin')).toHaveCount(0)
  await expect(page.locator('.ruta__marcador--origen')).toHaveCount(1)
})

test('un destino sin sala en el plano (una entrada al campus) sigue con el pin', async ({
  page,
}) => {
  await pedirRuta(page, '?clima=seco', ['La Paz', /^Entrada La Paz/], ['121', /^Aula 121/])
  await expect(page.locator('path.ruta__sala-destino')).toHaveCount(0)
  await expect(page.locator('.ruta__marcador--destino svg')).toHaveCount(1)
  // Al terminar el viaje el plano vuelve a color.
  await page.getByRole('button', { name: 'Iniciar', exact: true }).tap()
  await page.getByRole('button', { name: 'Finalizar viaje' }).tap()
  await expect(mapa(page)).not.toHaveClass(/mapa--con-ruta/)
})

test('tocar la línea gris de la alternativa la elige', async ({ page }) => {
  await pedirRuta(page, '?clima=lluvia')
  await expect(chip(page, /^Más resguardada/)).toHaveAttribute('aria-pressed', 'true')
  await expect(mapa(page)).toHaveAttribute(
    'data-ruta-alternativa',
    /cruce--ext-cruce-franjas-1773--ext-franja-entre-edificios-oeste/,
  )
  await page.waitForTimeout(500)
  await esperarMapaQuieto(page)
  // El cruce de la franja junto al hall de los auditorios solo está en la más rápida (la línea gris).
  const punto = await enPantalla(
    page,
    'cruce--ext-cruce-franjas-1773--ext-franja-entre-edificios-oeste',
  )
  expect(
    await enFranja(page, 'cruce--ext-cruce-franjas-1773--ext-franja-entre-edificios-oeste'),
  ).toBe(true)
  await page.touchscreen.tap(punto.x, punto.y)
  await expect(chip(page, /^Más rápida/)).toHaveAttribute('aria-pressed', 'true')
  await expect(tarjetaResumen(page)).toContainText('2 min · 125 m')
})

test('lluvia: cambiar a "Más rápida" sin red no muestra "Buscando el camino…"', async ({
  page,
  context,
}) => {
  await pedirRuta(page, '?clima=lluvia')
  await context.setOffline(true)
  await chip(page, /^Más rápida · 2 min/).tap()
  await expect(tarjetaResumen(page)).toContainText('2 min · 125 m')
  await expect(page.getByText('Buscando el camino…')).toHaveCount(0)
  await expect(mapa(page)).toHaveAttribute('data-ruta-nodos', /entrada-ed-este-kinesiologia/)
  await context.setOffline(false)
})

for (const [ancho, alto] of [
  [390, 844],
  [375, 667],
] as const) {
  test(`a ${ancho} × ${alto} el origen y el destino quedan en la franja visible`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: ancho, height: alto })
    await pedirRuta(page, '?clima=seco')
    expect(await enFranja(page, 'puerta-direccion-alumnos')).toBe(true)
    expect(await enFranja(page, 'puerta-dpto-cs-salud')).toBe(true)
  })
}

test('después de arrastrar el mapa no vuelve solo; recentrar vuelve al encuadre de la ruta', async ({
  page,
}) => {
  await pedirRuta(page, '?clima=seco')
  await page.waitForTimeout(500)
  await esperarMapaQuieto(page)
  const antes = await caja(page, '.ruta__marcador--destino')
  await arrastrar(page, { x: 300, y: 350 }, { x: 100, y: 250 }, 10)
  await esperarMapaQuieto(page)
  await page.waitForTimeout(600)
  const despues = await caja(page, '.ruta__marcador--destino')
  // Se movió con el dedo y no volvió.
  expect(Math.hypot(antes.x - despues.x, antes.y - despues.y)).toBeGreaterThan(80)

  await page.getByRole('button', { name: 'Recentrar el mapa' }).tap()
  await esperarMapaQuieto(page)
  expect(await enFranja(page, 'puerta-direccion-alumnos')).toBe(true)
  expect(await enFranja(page, 'puerta-dpto-cs-salud')).toBe(true)
})

test('accesibilidad: sin violaciones serias en el resultado; controles de 44 × 44 px', async ({
  page,
}) => {
  const graves = async () => {
    const r = await new AxeBuilder({ page }).analyze()
    return r.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  }
  await pedirRuta(page, '?clima=lluvia')
  expect(await graves(), 'resultado').toEqual([])
  const controles = [
    chip(page, /^Más resguardada/),
    chip(page, /^Más rápida/),
    page.getByRole('button', { name: 'Iniciar', exact: true }),
  ]
  for (const c of controles) {
    const b = (await c.boundingBox())!
    expect(b.width).toBeGreaterThanOrEqual(44)
    expect(b.height).toBeGreaterThanOrEqual(44)
  }
})

test('con un cierre que corta la más corta, la ruta lo evita', async ({ page }) => {
  await page.route('**/data/cierres.json', (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        version: 1,
        cierres: [
          {
            id: 'vereda-franja',
            motivo: 'Vereda en obra',
            nodos: ['cruce--ext-cruce-franjas-1773--ext-franja-entre-edificios-oeste'],
          },
        ],
      }),
    }),
  )
  await pedirRuta(page, '?clima=seco')
  await expect(page.getByTestId('ruta-desvio')).toHaveText(
    'Evitamos un tramo cerrado: Vereda en obra',
  )
  const nodos = (await mapa(page).getAttribute('data-ruta-nodos'))!.split(' ')
  expect(nodos).not.toContain('cruce--ext-cruce-franjas-1773--ext-franja-entre-edificios-oeste')
  expect(nodos.at(-1)).toBe('puerta-dpto-cs-salud')
})
