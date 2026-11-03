import { expect, test } from '@playwright/test'

interface Respuesta {
  url: string
  estado: number
  tipo: string
}

// Los datos que genera `npm run datos:build` se publican con el build (dist/data/).
// Se piden desde el navegador, como lo hará la app.
test('sirve el grafo, los lugares, el plano y su SVG con el tipo de contenido correcto', async ({
  page,
}) => {
  await page.goto('/')
  const respuestas = await page.evaluate(async (): Promise<Respuesta[]> => {
    const pedir = async (url: string): Promise<Respuesta> => {
      const r = await fetch(url)
      return { url, estado: r.status, tipo: r.headers.get('content-type') ?? '' }
    }
    const plano = (await (await fetch('/data/plano.json')).json()) as {
      url: string
      respaldo: { url: string }
    }
    return Promise.all(
      [
        '/data/grafo.json',
        '/data/lugares.json',
        '/data/plano.json',
        plano.url,
        plano.respaldo.url,
      ].map(pedir),
    )
  })

  expect(respuestas.map((r) => r.estado)).toEqual([200, 200, 200, 200, 200])
  expect(respuestas.map((r) => r.tipo.split(';')[0])).toEqual([
    'application/json',
    'application/json',
    'application/json',
    'image/svg+xml',
    'image/webp',
  ])

  const grafo = (await (await page.request.get('/data/grafo.json')).json()) as {
    nodos: unknown[]
    aristas: unknown[]
  }
  expect(grafo.nodos).toHaveLength(660)
  expect(grafo.aristas).toHaveLength(690)
})
