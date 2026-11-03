# src/clima: consulta del clima simulado y recomendación de ruta según el clima (sin React).

Change `adaptar-ruta-al-clima`. Todo se importa desde `src/clima/index.ts`.

## Piezas

| Archivo                | Qué hace                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `tipos.ts`             | `EstadoClima`, `ServicioClima`, `EscenarioClima` (`seco` · `lluvia` · `error` · `lento`).                                            |
| `servicio-simulado.ts` | `crearServicioClimaSimulado`: pide `/api/clima/<escenario>.json`, espera 3 s en `lento`, valida y corta a los 5 s. Nunca rechaza.    |
| `cache.ts`             | `conCacheDeClima`: reutiliza una respuesta `ok` 5 min mientras no cambie el escenario. Las fallas no se guardan.                     |
| `escenario.ts`         | `crearControlEscenario`: `?clima=` > `sessionStorage` (`donde-queda:clima`) > `seco`; `pidePanelDePrueba` (`?panel=prueba`).         |
| `recomendacion.ts`     | `recomendar` (tabla de la decisión 5), `compararAlternativas` (decisión 6) y `textoEstadoClima` (decisión 7). Puras.                 |
| `memoria-criterio.ts`  | Recuerda el criterio elegido con el clima caído; un `ok` lo descarta.                                                                |
| `orquestacion.ts`      | `crearOrquestadorRuta`: clima en paralelo con los dos A\*, mismos tramos excluidos, estados `esperando-clima` / `listo`, Reintentar. |
| `app.ts`               | `crearClimaDeLaApp`: control + servicio simulado con caché + aviso de cambio de escenario.                                           |

## Uso

```ts
import { cargarGrafoRuteable } from '../rutas/index.ts'
import { excluidosDeControlador } from '../cierres/index.ts'
import { crearClimaDeLaApp, crearOrquestadorRuta, textoEstadoClima } from '../clima/index.ts'

const clima = crearClimaDeLaApp() // lee location.search y sessionStorage
const orquestador = crearOrquestadorRuta({
  grafo: cargarGrafoRuteable(), // GrafoRuteable o promesa: los cálculos esperan a que llegue
  servicio: clima.servicio,
  excluidos: () => excluidosDeControlador(controladorCierres), // reevalúa en cada cálculo
})
clima.alCambiarEscenario(() => void orquestador.recalcular()) // cambio en caliente del moderador
orquestador.suscribir((estado) => {
  // 'esperando-clima' → "Buscando el camino…" (sin ruta)
  // 'listo' → estado.plan (recomendada, alternativa, comparación), textoEstadoClima(estado.plan)
})
await orquestador.calcular({ origen: lugarA.puertas, destino: lugarB.puertas })
orquestador.elegirCriterio('resguardada') // con el clima caído
orquestador.reintentar() // "Reintentar": conserva origen, destino y la ruta mostrada
```

## Respuestas simuladas

`public/api/clima/{seco,lluvia,lento,error}.json`. `error.json` no trae `llueve`, así que la validación lo rechaza (`respuesta-invalida`). Un hosting estático no puede devolver un 503 ni demorar: los 5xx, la red caída y el timeout se prueban en `servicio-simulado.test.ts` con un `fetch` simulado. El service worker (`tolerar-senal-irregular`) tiene que tratar `/api/clima/*` como solo red, sin caché.

## Reemplazar la simulación por una API real (no integrado)

Ejemplo con **Open-Meteo**, que no pide clave y tiene CORS abierto (`access-control-allow-origin: *`), así que se llama directo desde el navegador:

```
https://api.open-meteo.com/v1/forecast?latitude=-34.67&longitude=-58.56&current=precipitation,weather_code&timezone=America/Argentina/Buenos_Aires
```

Responde, por ejemplo, `{"current":{"time":"2026-10-22T06:00","precipitation":0.00,"weather_code":3}}`. Regla:

```
llueve = precipitation > 0 || weather_code ∈ {51–67, 80–82, 95–99}
```

(lloviznas, lluvias, chaparrones y tormentas). Pasos:

1. Escribir `crearServicioClimaOpenMeteo(): ServicioClima` con el mismo esqueleto que `crearServicioClimaSimulado`: `AbortController` con `TIMEOUT_CLIMA_MS` (5 s), `fetch(url, { signal, cache: 'no-store' })`, HTTP 2xx, JSON válido y `current.precipitation` numérico y `current.weather_code` entero; cualquier otra cosa es `no-disponible` (`respuesta-invalida`), un rechazo de `fetch` es `red` y el vencimiento es `timeout`. Devolver `fuente: 'real'` y `obtenidoEn` con `current.time`.
2. En `app.ts`, cambiar `crearServicioClimaSimulado(...)` por el servicio nuevo dentro de `conCacheDeClima` (5 min es menor que la resolución típica de la precipitación actual). La recomendación, el orquestador y la interfaz no cambian.
3. El escenario del moderador deja de tener efecto; el panel de prueba se puede ocultar en ese build.

Una API con clave secreta necesitaría una función serverless como proxy (disparador de backend de la decisión 2 del plan).

## En la interfaz (`src/ui/clima/`)

`App` crea el clima y el orquestador, conecta `Integraciones.solicitarRuta` (`crearSolicitarRuta`) y `AvisoClima`, recalcula al cambiar el escenario y monta `<PanelPrueba>` con el gesto en el botón `(?)`. Los componentes leen el orquestador con:

- `useOrquestadorRuta(): OrquestadorRuta | null`
- `useEstadoRuta(): EstadoOrquestador` (`inactivo` sin proveedor)
- `useEstadoRutaDe(origenId, destinoId): EstadoOrquestador`: el estado solo si es de ese par de lugares (lo que conviene usar en `ContenidoRuta`).
