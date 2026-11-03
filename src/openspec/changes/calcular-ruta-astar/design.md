## Context

El grafo del campus (`grafo.json`, cargado y validado por `preparar-datos-campus`) tiene 685 nodos (283 puertas, 373 pasillos, 29 entradas) y 722 aristas. Propiedades que este diseño aprovecha:

- **Todas las aristas son horizontales o verticales** (regla del `CLAUDE.md`, verificada con 0,01 px de tolerancia).
- **El peso de cada arista es su longitud** en px del mapa. Hoy ninguna arista tiene `puntos` intermedios: cada una es un segmento recto entre sus dos nodos.
- Las coordenadas tienen como mucho **2 decimales**. En `grafo.json` el `peso` está redondeado a 0,1 px y difiere hasta ±0,05 px de `|dx| + |dy|` (por ejemplo `arista__pasillo-derecho-31__pasillo-derecho-34`). Ese detalle importa para la heurística (ver decisión 3).
- Cada arista tiene `exterior: true/false` (lo calcula `preparar-datos-campus`: es exterior si uno de sus extremos es un nodo violeta, `depto: "central"`). Hoy hay 113 exteriores y 609 interiores.
- Hay una arista de longitud 0 (`pasillo-economicas-19` y `-20` están en la misma posición, caso "A revisar").
- Longitud total de todas las aristas: 20 841,79 px (2 084 179 centésimas de px), de los cuales 9 516,68 px son exteriores.

Ejemplos reales (calculados sobre el grafo actual, `METROS_POR_PX = 0,35`, 1,2 m/s):

| Origen → destino | `mas-corta` | `resguardada` |
|---|---|---|
| `puerta-humanidades-121` → `puerta-humanidades-110` | 240,88 px · 84 m · 1 min · 0 m afuera | igual |
| `entrada-central-principal` → `puerta-humanidades-121` | 668,86 px · 234 m · 3 min · 93 m afuera | igual |
| `puerta-economicas-309` → `puerta-humanidades-103` | 1094,83 px · 383 m · 5 min · 220 m afuera | 1505,23 px · 527 m · 7 min · 91 m afuera |
| `puerta-humanidades-121` → `puerta-derecho-lab-de-microscopia` | 1056,20 px · 370 m · 5 min · 259 m afuera | 2893,72 px · 1013 m · 14 min · 133 m afuera |
| Aula 121 → Gimnasio (3 puertas) | entra por `puerta-servicios-gimnasio-2`: 518,46 px · 181 m · 3 min | — |

Sobre los 39 903 pares de puertas, en 15 909 la ruta resguardada coincide con la más corta y en 23 994 difiere (mediana: 1,38 veces más larga).

Restricciones: SPA estática en React + Vite + TypeScript, sin backend (decisión 2 del plan), uso en celulares de gama media con señal irregular.

## Goals / Non-Goals

**Goals:**

- Ruta **óptima** según el criterio pedido, garantizada (no "casi siempre").
- A\* como algoritmo, por requisito de la cátedra y del equipo.
- Función pura, sin estado ni efectos, fácil de testear y de reusar desde los cambios de cierres, clima e interfaz.
- Resultado determinista y completo para que la interfaz no tenga que recalcular nada.
- Menos de 50 ms por consulta en un celular de gama media (en la práctica, pocos ms).

**Non-Goals:**

- Rutas multipiso, servicio más cercano, navegación en vivo.
- Rutas "alternativas" k-mejores (solo los dos criterios definidos).
- Precálculo de todas las rutas (con este tamaño no hace falta).
- Decidir qué criterio mostrar (lo hace `recomendacion-de-ruta`).

## Decisions

### 1. A\* en lugar de Dijkstra

Con 685 nodos, Dijkstra y A\* son instantáneos. Elegimos A\* por tres motivos:

1. **Requisito explícito** de la cátedra y del usuario del proyecto.
2. **La geometría lo favorece:** con aristas ortogonales y peso = longitud, la distancia Manhattan es una cota inferior exacta en ausencia de paredes, así que la búsqueda va "derecho" al destino. En los ejemplos, A\* expande 77 nodos para Aula 121 → Lab. de Microscopía (Dijkstra: 297), 71 para Aula 309 → Aula 103 (Dijkstra: 623) y 35 para Entrada principal → Aula 121 (Dijkstra: 139).
3. **Escala** si se agregan pisos (Humanidades 1er piso, Odontología, decisión 4 del plan): el grafo puede multiplicar su tamaño y la heurística se extiende sumando un término por cambio de piso sin cambiar el algoritmo.

**Alternativas consideradas:** Dijkstra (más simple, igual de óptimo; lo usamos como **referencia en los tests**); BFS (ignora pesos, no sirve); Floyd–Warshall o tabla precalculada de todos los pares (≈ 470 000 entradas, no soporta tramos excluidos que cambian sin recalcular todo); búsqueda bidireccional (más compleja, sin beneficio a este tamaño).

### 2. Heurística: distancia Manhattan al destino más cercano

`h(n) = min sobre las puertas destino t de |x_n − x_t| + |y_n − y_t|`.

- **Admisible:** cualquier camino entre dos puntos formado solo por tramos horizontales y verticales mide al menos `|dx| + |dy|`. Como el peso de cada arista es exactamente su longitud ortogonal, ningún camino real es más corto que la Manhattan, así que `h` nunca sobreestima.
- **Consistente:** para una arista (u, v) de peso `w = |x_u − x_v| + |y_u − y_v|`, la desigualdad triangular de la métrica L1 da `h(u) ≤ w + h(v)`. El mínimo de heurísticas consistentes también es consistente, así que vale con varias puertas destino.
- **Consecuencia práctica:** con heurística consistente, cada nodo se expande una sola vez (conjunto cerrado sin reaperturas) y el primer destino que sale de la cola tiene el costo óptimo.

**Alternativas:** euclídea (admisible pero menos informada en una grilla ortogonal: expande más nodos); `h = 0` (equivale a Dijkstra); heurísticas con landmarks (ALT), innecesarias a este tamaño.

### 3. Pesos en enteros (centésimas de px) recalculados desde las coordenadas

El motor **no usa el `peso` redondeado** del JSON: al preparar el grafo para rutear calcula la longitud de cada arista como `|dx| + |dy|` en **centésimas de px enteras** (las coordenadas tienen 2 decimales, así que es exacto). Si en el futuro una arista trae `puntos`, su longitud es la suma de sus tramos.

- Con el `peso` redondeado a 0,1 px, la consistencia se rompería por hasta 0,05 px en algunas aristas (la Manhattan entre los extremos supera al peso). Con la longitud exacta, `h` es consistente sin tolerancias.
- La aritmética entera evita comparaciones con épsilon y hace los empates exactos, que es lo que permite el determinismo (decisión 7).
- Se verifica que `peso` del JSON y la longitud recalculada no difieran más de 0,06 px; si difieren más, es un error de datos que reporta la validación del grafo.

**Alternativa:** usar `peso` tal cual con una tolerancia en las comparaciones. Más frágil y no garantiza consistencia estricta.

### 4. Criterio `resguardada`: costo = interior + K · exterior, con K = 10⁷

Queremos minimizar primero los metros al aire libre y, a igualdad, la distancia total. En vez de un A\* con costos de dos componentes, usamos un solo número:

`costo(arista) = longitud` si es interior, `K · longitud` si es exterior.

- **Equivale al orden lexicográfico** (exterior, distancia) si K supera cualquier longitud interior posible de un camino. Un camino simple no puede tener más longitud interior que la suma de todas las aristas (2 084 179 centésimas). Como las longitudes son enteras, dos caminos con distinto exterior difieren en al menos 1 centésima de exterior, es decir en al menos K de costo, que es más que cualquier diferencia de longitud interior. Por eso ninguna cantidad de pasillo interior "compensa" un centímetro más de vereda. Y a igual exterior, como `total = interior + exterior`, minimizar interior es minimizar la distancia total.
- **K = 10⁷ (≥ 10⁵ que pide el plan):** con pesos en centésimas hace falta K > 2,08 · 10⁶; 10⁷ deja margen. El costo máximo (≈ 2 · 10¹³) queda muy por debajo de 2⁵³, así que los enteros son exactos en un `number` de JavaScript. Al cargar el grafo se verifica que la longitud total sea menor que K; si se agregan pisos y se supera, se sube K.
- **Conserva la admisibilidad:** como K ≥ 1, el costo de un camino es siempre ≥ su longitud, y la longitud es ≥ Manhattan. La misma `h` sirve sin cambios y sigue siendo consistente (`h(u) ≤ longitud(u,v) + h(v) ≤ costo(u,v) + h(v)`).
- **Trade-off:** para este criterio la heurística está mucho menos informada (el costo real es enorme comparado con `h`), así que A\* expande casi todo el grafo (≈ 570 de 685 nodos en los ejemplos). Sigue siendo de pocos milisegundos.

**Alternativas:** A\* con costos en tupla (exterior, total) y comparación lexicográfica (correcto pero menos legible y la heurística igual de débil); penalizar el exterior con un factor moderado (×3, ×5): deja de ser "minimizar el exterior" y el resultado depende de un número arbitrario; excluir las aristas exteriores (no hay ruta entre edificios separados por veredas).

### 5. Criterio `mas-corta` con desempate por menos exterior

`costo(arista) = K · longitud + (longitud si es exterior, 0 si no)`.

Es el orden lexicográfico (distancia, exterior). En una grilla ortogonal hay muchos caminos con exactamente la misma longitud (rodear una manzana por un lado o por el otro). Ejemplo real: Biblioteca → Dto. de Económicas tiene dos caminos de 752,29 px; uno pasa 133 m por la vereda y el otro 87 m. Con este desempate, `mas-corta` elige el de 87 m y, además, coincide más seguido con `resguardada`, lo que evita mostrar dos alternativas que no aportan nada. La heurística se multiplica por K (`K · h`), que sigue siendo admisible y consistente.

**Alternativa:** desempate solo por id (decisión 7). Lo mantenemos como último criterio, para empates exactos en distancia y exterior.

### 6. Multi-origen y multi-destino

Origen y destino son conjuntos de nodos (las puertas del lugar, según el catálogo).

- **Origen:** todas las puertas de origen entran a la cola inicial con costo 0. Es equivalente a un nodo virtual unido a cada puerta con peso 0, sin tener que modificar el grafo.
- **Destino:** `h` es el mínimo de la Manhattan a cada puerta destino; la búsqueda termina cuando sale de la cola cualquier puerta destino.
- **Resultado:** informa qué puerta de origen y qué puerta de destino quedaron usadas (la interfaz las marca y las indicaciones dicen "salí por…", "entrá por…").
- Las puertas excluidas se descartan antes de empezar. Si no queda ninguna puerta de origen o destino, el resultado es "sin ruta" con el lado correspondiente.

**Alternativa:** correr un A\* por cada par de puertas y quedarse con el mejor. Correcto, pero multiplica el trabajo (Gimnasio × Buffet = 6 corridas) y complica el desempate.

### 7. Determinismo

- La cola de prioridad ordena por `(f, h, id del nodo)`: a igual `f`, primero el de menor `h` (más cerca del destino) y, a igual `h`, el de id menor en orden de código Unicode.
- La lista de vecinos de cada nodo se ordena por id al preparar el grafo, para no depender del orden de las aristas en el JSON.
- Un vecino solo se actualiza si el nuevo costo es **estrictamente** menor (enteros, sin épsilon).
- Con esto, la misma consulta sobre el mismo grafo devuelve siempre la misma secuencia de nodos, en cualquier navegador.

### 8. Cola de prioridad: heap binario propio

Heap binario mínimo con inserción "perezosa" (si un nodo mejora, se vuelve a insertar y la entrada vieja se descarta al salir si el nodo ya está cerrado). Unas 40 líneas, sin dependencias.

**Alternativas:** arreglo ordenado o búsqueda lineal del mínimo (O(n²), funcionaría a este tamaño pero no escala con pisos); heap con `decrease-key` (más complejo, sin ganancia real); librería externa (dependencia innecesaria para algo tan chico).

### 9. Interfaz pura

```ts
type Criterio = 'mas-corta' | 'resguardada';

interface ConsultaRuta {
  origen: readonly string[];          // ids de nodos (puertas del lugar de origen)
  destino: readonly string[];         // ids de nodos (puertas del lugar de destino)
  criterio: Criterio;
  excluidos?: { nodos: ReadonlySet<string>; aristas: ReadonlySet<string> };
}

type ResultadoRuta =
  | { tipo: 'ruta'; criterio: Criterio; nodos: string[]; aristas: string[];
      polilinea: [number, number][]; puertaOrigen: string; puertaDestino: string;
      distanciaPx: number; distanciaM: number; tiempoSeg: number; tiempoMin: number;
      exteriorPx: number; exteriorM: number }
  | { tipo: 'mismo-lugar'; nodo: string }
  | { tipo: 'sin-ruta'; motivo: 'origen-sin-puertas' | 'destino-sin-puertas' | 'sin-camino' }
  | { tipo: 'consulta-invalida'; idsDesconocidos: string[] };

function calcularRuta(grafo: GrafoRuteable, consulta: ConsultaRuta): ResultadoRuta;
```

- `GrafoRuteable` se arma **una vez** al cargar los datos (adyacencia ordenada, longitudes enteras, coordenadas en centésimas) y se reutiliza en cada consulta.
- `excluidos` acepta ids de aristas (`arista__A__B`) y de nodos; excluir un nodo excluye todas sus aristas. La función no sabe que vienen de cierres.
- **Polilínea:** coordenadas de los nodos en orden (y los `puntos` de cada arista si los hubiera, orientados en el sentido del recorrido), sin puntos repetidos consecutivos (la arista de longitud 0 de Económicas no genera un punto duplicado). Está en px de `mapa-unlam`, el mismo sistema que usa el visor.
- **Metros y tiempo:** `distanciaM = distanciaPx × METROS_POR_PX` (constante de `preparar-datos-campus`, ≈ 0,35 a calibrar). `tiempoSeg = distanciaM / 1,2`. `tiempoMin = max(1, round(tiempoSeg / 60))`. `exteriorPx` es la suma de las aristas con `exterior: true` y `exteriorM` su equivalente en metros.
- **Mismo lugar:** si algún nodo está a la vez en origen y destino, no se busca nada y se devuelve `mismo-lugar` (la pantalla la resuelve `seleccion-de-recorrido`).
- **Consulta inválida:** ids que no existen en el grafo. Es un error de programación o de datos, no del usuario; se registra en consola.

### 10. En el hilo principal, sin Web Worker

Una consulta tarda pocos milisegundos (presupuesto: < 50 ms en gama media; en la medición con el grafo actual, muy por debajo). `adaptar-ruta-al-clima` hace dos consultas por cálculo y `aplicar-cierres-temporales` una más para detectar desvíos: sigue siendo imperceptible. Un Worker agrega serialización del grafo, mensajes asíncronos y complejidad en los tests sin beneficio visible. Si con pisos el tiempo supera los 50 ms, la función pura se mueve a un Worker sin cambiar su interfaz.

### 11. Estrategia de tests

- **Optimalidad contra referencia:** un Dijkstra simple (solo en tests) calcula, para **todos los pares de puertas** (39 903 pares, ≈ 280 corridas de Dijkstra desde cada puerta), la distancia mínima y el exterior mínimo. Se compara: con `mas-corta`, la distancia de A\* = la de Dijkstra; con `resguardada`, el exterior de A\* = el mínimo de Dijkstra con costo lexicográfico y, a igualdad, la distancia. Con el grafo actual corre en pocos segundos; si se vuelve lento, se toma una muestra fija con semilla (≥ 5 000 pares) más los pares de los ejemplos.
- **Heurística:** para cada arista y cada nodo destino de una muestra, se verifica `h(u) ≤ longitud(u,v) + h(v)` (consistencia) y, para todos los nodos, `h(n) ≤ distancia real` según Dijkstra (admisibilidad). También se testea que cada arista es ortogonal y que su longitud entera coincide con `peso` ± 0,06 px.
- **Casos reales:** los de la tabla de Contexto (con tolerancia ± 0,01 px), Gimnasio con sus tres puertas, exclusión de `entrada-salud-02` (Aula 511 → Lab. de Microscopía pasa de 483,23 px sin salir a la vereda a 560,23 px con 63 m afuera), Estudio 2 inalcanzable al excluir `pasillo-artes-y-medios-06`, origen = destino, ids desconocidos.
- **Determinismo:** se corre la misma consulta con la adyacencia en distinto orden (aristas mezcladas con semilla) y el resultado debe ser idéntico.
- **Rendimiento:** un test mide el promedio de 1 000 consultas aleatorias y falla si supera 5 ms en la máquina de CI (orientativo del presupuesto de 50 ms en el celular).

## Risks / Trade-offs

- [La ruta resguardada puede ser un desvío enorme para ahorrar poco: Aula 121 → Lab. de Microscopía pasa de 5 a 14 min para ahorrar 126 m de vereda; Lab. 1 de Derecho → Banco pasa de 1 a 8 min para ahorrar 26 m] → El motor cumple el criterio tal como está definido; la comparación de minutos extra y metros al aire libre la muestra `recomendacion-de-ruta` para que el usuario elija. Un umbral de desvío máximo queda como pregunta abierta de ese cambio.
- [Los pesos redondeados del JSON rompen la consistencia por centésimas] → Se recalculan en enteros desde las coordenadas (decisión 3) y un test lo cubre.
- [La clasificación interior/exterior es gruesa: un tramo entre edificios cubierto por un alero cuenta como exterior y un pasillo abierto dentro de un edificio cuenta como interior] → La regla vive en `preparar-datos-campus`; el motor solo usa el campo `exterior`, así que corregir la clasificación no toca este cambio.
- [`METROS_POR_PX` es una estimación] → Es una constante única; calibrarla cambia metros y minutos en todos lados sin tocar el algoritmo (las rutas no cambian, porque se calculan en px).
- [Duplicados en la misma posición (`pasillo-economicas-19`/`20`) generan una arista de longitud 0] → No afecta la optimalidad; la polilínea descarta puntos repetidos.
- [Si se agregan pisos y la longitud total supera K] → Verificación al cargar el grafo que falla con un mensaje claro.

## Migration Plan

No hay versión anterior: es código nuevo detrás de una función. Se integra cuando `preparar-datos-campus` entrega el grafo ruteable. Para revertir, basta con no llamar a la función (la interfaz todavía no depende de ella hasta `mostrar-ruta-e-indicaciones`).

## Open Questions

- ¿Conviene que el tiempo estimado redondee hacia arriba (más conservador para "llegar a horario") en vez de al minuto más cercano? Se puede decidir después de calibrar `METROS_POR_PX` con un recorrido real, sin cambiar la interfaz.
- Cuando haya pisos: ¿qué costo fijo se le asigna a una escalera o un ascensor? Diferible hasta que haya puntos en otros pisos.
