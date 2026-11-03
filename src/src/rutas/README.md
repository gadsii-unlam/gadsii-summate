# src/rutas: A\*, criterios de ruta e indicaciones; lógica pura, sin React.

Motor de cálculo de rutas del change `calcular-ruta-astar`. Todo se importa desde `src/rutas/index.ts`.

## Uso

```ts
import { cargarGrafoRuteable, calcularRuta } from '../rutas/index.ts'

const grafo = await cargarGrafoRuteable() // descarga /data/grafo.json y lo prepara una sola vez
const r = calcularRuta(grafo, {
  origen: ['entrada-campus-florencio-varela'], // puertas del lugar de origen (Lugar.puertas)
  destino: ['puerta-aula-121'], // puertas del lugar de destino
  criterio: 'mas-corta', // o 'resguardada'
  excluidos: { nodos: new Set(), aristas: new Set() }, // opcional (cierres)
})
// r.tipo === 'ruta': 1106,57 px, 199,2 m, 3 min, 403,72 px (72,7 m) al aire libre
```

- `prepararGrafoRuteable(grafo: GrafoCampus): GrafoRuteable` arma el grafo ruteable desde un `GrafoCampus` ya cargado (lanza `ErrorGrafoRuteable` si un `px` difiere más de 0,06 px de la longitud recalculada o si la longitud total es ≥ `K_COSTO`). `cargarGrafoRuteable()` hace el `fetch` y lo memoriza.
- `calcularRuta(grafo, consulta): ResultadoRuta` es pura y determinista. Resultados:
  - `ruta`: `nodos`, `aristas`, `polilinea` (`[x, y]` en px de `mapa-unlam.svg`, sin repetidos consecutivos; los tramos son horizontales o verticales salvo las diagonales permitidas), `puertaOrigen`, `puertaDestino`, `distanciaPx`, `distanciaM`, `tiempoSeg`, `tiempoMin` (`max(1, round(seg / 60))` a 1,2 m/s), `exteriorPx`, `exteriorM`, `nodosExpandidos`.
  - `mismo-lugar`: origen y destino comparten una puerta (no se busca nada).
  - `sin-ruta` con `motivo`: `origen-sin-puertas`, `destino-sin-puertas` (vacías o todas excluidas) o `sin-camino`.
  - `consulta-invalida` con `idsDesconocidos` (ids de origen o destino que no están en el grafo; se avisa por consola). Los ids desconocidos en `excluidos` se ignoran.
- Excluir un nodo excluye todas sus aristas y lo saca de las puertas de origen y destino.

## Criterios

Los costos son enteros (centésimas de px) y `K_COSTO = 10⁷` es mayor que la longitud total del grafo (3 805 274), así que cada costo equivale a un orden lexicográfico exacto:

| Criterio      | Costo de una arista                                      | Orden                 | Heurística |
| ------------- | -------------------------------------------------------- | --------------------- | ---------- |
| `mas-corta`   | `K · longitud + (longitud si es exterior)`               | (distancia, exterior) | `K · h`    |
| `resguardada` | `longitud` si es interior, `K · longitud` si es exterior | (exterior, distancia) | `h`        |

Ejemplos (los mismos que verifican los tests de `astar.test.ts`):

| Origen → destino                                      | `mas-corta`                                | `resguardada`                    |
| ----------------------------------------------------- | ------------------------------------------ | -------------------------------- |
| `puerta-aula-121` → `puerta-aula-110`                 | 481,11 px, 0 m afuera, 1 min               | igual                            |
| `entrada-campus-florencio-varela` → `puerta-aula-121` | 1106,57 px, 403,72 px afuera, 3 min        | igual                            |
| `puerta-aula-309` → `puerta-aula-103`                 | 2174,55 px, 1488 px afuera, 5 min          | 3202,07 px, 645 px afuera, 8 min |
| `puerta-aula-121` → `puerta-lab-microscopia`          | 2070,73 px (≈ 373 m), 5 min                | 5489,83 px, 14 min               |
| `puerta-aula-121` → Gimnasio (2 accesos)              | entra por `acceso-gimnasio-sur`, 946,73 px | —                                |
| `entrada-campus-florencio-varela` → `puerta-aula-101` | 458,47 px, usa el camino diagonal          | —                                |

## Por qué la heurística es admisible

`h(n)` es la distancia euclídea (en centésimas enteras, redondeada hacia abajo) desde `n` hasta la puerta destino más cercana. Casi todas las aristas son horizontales o verticales y miden exactamente `|dx| + |dy|`, que en ese caso es su distancia euclídea; las pocas diagonales (caminos diagonales de verdad, declarados en `diagonalesPermitidas`) miden su distancia euclídea redondeada **hacia arriba**. La longitud se recalcula desde las coordenadas, no se usa el `px` redondeado del JSON. Entonces ninguna arista mide menos que la distancia euclídea entre sus extremos, y:

- **Admisible:** ningún camino entre dos puntos mide menos que la recta que los une, así que `h` nunca sobreestima la distancia real; como el costo de cada arista es ≥ su longitud (en `mas-corta`, ≥ `K · longitud`), tampoco sobreestima el costo.
- **Consistente:** por la desigualdad triangular, `⌊d(u, t)⌋ ≤ ⌊longitud(u, v) + d(v, t)⌋ = longitud(u, v) + ⌊d(v, t)⌋` (la longitud es entera), o sea `h(u) ≤ longitud(u, v) + h(v)` en cada arista, y el mínimo sobre varias puertas sigue siendo consistente. Por eso cada nodo se cierra una sola vez y la primera puerta destino que sale de la cola es óptima.

## Determinismo

La cola (`heap.ts`, heap binario con inserción perezosa) ordena por `(f, h, id)`. Los nodos y los vecinos se ordenan por id al preparar el grafo, y un nodo solo mejora con costo estrictamente menor. La misma consulta devuelve la misma secuencia de nodos sin importar el orden de las aristas en el JSON.

## Tests

- `optimalidad.test.ts`: A\* contra un Dijkstra de referencia (`test/dijkstra-referencia.ts`) en los 42 195 pares de puertas, con los dos criterios.
- `heuristica.test.ts`: consistencia en todas las aristas (50 destinos) y admisibilidad contra Dijkstra.
- `determinismo.test.ts`, `rendimiento.test.ts` (promedio de 1 000 consultas < 5 ms), `carga.test.ts` (integración con el `grafo.json` real).

## Indicaciones y tramos (`mostrar-ruta-e-indicaciones`)

```ts
import { NOMBRES_ENTRADAS, generarIndicaciones, prepararDatosIndicaciones } from '../rutas/index.ts'

const datos = prepararDatosIndicaciones({
  grafo,
  nodos: grafoCampus.nodos,
  catalogo,
  entradas: NOMBRES_ENTRADAS,
})
const pasos = generarIndicaciones(ruta, datos, { origen: lugarOrigen, destino: lugarDestino })
// [{ tipo: 'salir-lugar', texto: 'Salí de Dirección de Alumnos y doblá a la izquierda', distanciaM: 30, alAireLibre: false, tramo: { desde: 0, hasta: 4 } }, …]
```

- `tramos.ts`: `armarTramos` (dirección, metros, exterior y departamento de cada tramo), `partesDeRuta` (partes bajo techo / al aire libre para el trazo) y `puntosEntre`.
- `formato.ts`: redondeo a 5 m, "2 min · 165 m", "Incluye 60 m al aire libre" / "Todo bajo techo", anuncio accesible, nombres de chips y nota de ruta única con lluvia.
- `indicaciones.ts`: `generarIndicaciones` (desvíos < 3 m absorbidos, giros por producto vectorial, "y enseguida" a < 4 m, salida/entrada de edificio, cambio de edificio bajo techo, escalera entre pisos ("Subí la escalera al 1er piso", cuando la ruta pasa por una arista entre nodos de distinto piso), llegada con el lado de la puerta y, para lugares de pisos sin nodos, el paso de piso con la indicación curada). Los nombres de edificio con artículo están en `EDIFICIOS_CORTOS` (`contraer` arma "al" y "del").
- `entradas.ts`: `NOMBRES_ENTRADAS`, de `datos-fuente/entradas.json` (validado por `npm run datos:build`).
- Tests: `indicaciones-reales.test.ts` (test de referencia del design.md y 500 pares al azar), `indicaciones.test.ts` (caminos de prueba), `tramos.test.ts`, `formato.test.ts`.
