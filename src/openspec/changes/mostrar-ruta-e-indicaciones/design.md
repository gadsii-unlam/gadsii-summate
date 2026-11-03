## Context

Este cambio se apoya en tres anteriores:

- **`calcular-ruta-astar`** devuelve, para cada criterio, un `ResultadoRuta` con `nodos`, `aristas`, `polilinea` (en px de `mapa-unlam`), `puertaOrigen`, `puertaDestino`, `distanciaM`, `tiempoMin` y `exteriorM`.
- **`adaptar-ruta-al-clima`** (`recomendacion-de-ruta`) decide cuál de las dos rutas es la recomendada, cuál queda como alternativa a un toque y si se muestra una sola.
- **`construir-interfaz-movil`** provee el visor Leaflet con `CRS.Simple`, la tarjeta superior con el panel "Cómo llegar", la hoja inferior de tres alturas (colapsada, media y expandida), el botón recentrar y un lugar reservado en la hoja para el resultado.

Datos del grafo que importan para dibujar e indicar:

- Todas las aristas son horizontales o verticales, así que cada tramo tiene una de cuatro direcciones (este, oeste, norte, sur). En el plano, "norte" es arriba: `entrada-central-la-paz` queda arriba y `entrada-central-principal` abajo.
- Cada arista trae `exterior: true/false`. Es exterior si toca un nodo violeta (`depto: "central"`).
- Las puertas son hojas del grafo: las 283 tienen una sola arista. Una ruta nunca atraviesa una puerta: solo puede empezar o terminar en una.
- Al pasar de interior a exterior, el último nodo interior es de tres tipos. En 15 casos es una `entrada-*`. En 17 casos es una puerta que da directo a la vereda (Biblioteca, Teatro, Gimnasio…). En 3 casos es un pasillo: `pasillo-economicas-10`, `pasillo-economicas-44` y `pasillo-artes-y-medios-25`.
- Hay 11 aristas interiores que unen edificios distintos sin salir al aire libre, por ejemplo `entrada-salud-02`↔`pasillo-derecho-01`, `pasillo-artes-y-medios-16`↔`pasillo-salud-01` y `pasillo-economicas-44`↔`pasillo-formacion-continua-01`.

No hay GPS (brief v1). Las indicaciones son una lista para leer y el usuario avanza mirando el mapa. Nada se actualiza solo mientras camina (brief v3, paso 6).

## Goals / Non-Goals

**Goals:**

- Que la ruta se reconozca de un vistazo en un celular de 390 px, con una mano y bajo el sol.
- Que se vea cuánto del recorrido es al aire libre sin depender del color, llueva o no.
- Indicaciones que un ingresante pueda seguir sin conocer el campus: edificios y entradas con nombre, giros relativos a su marcha y distancias redondas.
- Todo calculado en el dispositivo, en funciones puras y testeables con el grafo real.

**Non-Goals:**

- Navegación giro a giro en vivo, voz o recálculo al desviarse.
- Elegir la ruta recomendada (lo hace `recomendacion-de-ruta`).
- Dibujar los tramos cerrados (lo hace `cierres-temporales`). Este cambio solo respeta el orden de capas.
- Funcionamiento sin conexión (lo hace `tolerar-senal-irregular`). Igual, todo lo de este cambio funciona sin red porque es local.

## Decisions

### 1. Esquema de la vista en un celular de 390 px

**Resultado con ruta (hoja a altura media).** Escenario sin lluvia, Dir. de Alumnos → Dto. de Salud:

```
┌────────────────────────────────────────────┐
│ ┌────────────────────────────────────────┐ │
│ │ ←  ○  Dir. de Alumnos               ⇅  │ │  panel "Cómo llegar"
│ │    ▼  Dto. de Salud                    │ │  (construir-interfaz-movil)
│ └────────────────────────────────────────┘ │
│                          ┌───────────────┐ │
│  ECONÓMICAS      SALUD   │ ━━ Bajo techo │ │  leyenda: solo si hay
│ ┌──────────┐   ┌───────┐ │ ••• Al aire   │ │  tramos al aire libre
│ │          │   │ ▼━━┓  │ │     libre     │ │
│ │          │   │    ┃  │ └───────────────┘ │
│ │          │ •••••━━┛  │                   │
│ │          │ • └───────┘                   │
│ │  ○━━━━━━•••                              │
│ └──────────┘                          (◎)  │  recentrar (cambio 6)
├────────────────────────────────────────────┤
│                   ─────                    │  manija
│  2 min · 165 m                             │  tarjeta resumen
│  Incluye 60 m al aire libre                │
│                                            │
│  (✓ Más rápida · 2 min) (Más resguardada…) │  chips
│                                            │
│  [ ≡ Indicaciones ]    [ Finalizar viaje ] │
└────────────────────────────────────────────┘
```

`○` es el círculo de origen, `▼` el pin de destino, `━` el tramo bajo techo y `•••` el tramo al aire libre. La ruta queda encuadrada entre la tarjeta superior y la hoja (decisión 5).

**Misma consulta con lluvia (solo la hoja).** La recomendada va primero y está marcada:

```
├────────────────────────────────────────────┤
│                   ─────                    │
│  4 min · 280 m                             │
│  Incluye 40 m al aire libre                │
│                                            │
│  (✓ Más resguardada · 4 min) (Más rápida)  │
│     Recomendada con lluvia                 │
│                                            │
│  [ ≡ Indicaciones ]    [ Finalizar viaje ] │
└────────────────────────────────────────────┘
```

**Buscando el camino (hoja a altura media).** La ruta anterior ya no se ve:

```
├────────────────────────────────────────────┤
│                   ─────                    │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░░░░░░░░░░░░░░░  │  barra indeterminada
│  Buscando el camino…                       │
│  Dir. de Alumnos → Dto. de Salud           │
└────────────────────────────────────────────┘
```

**Indicaciones (hoja expandida).** El mapa queda visible arriba, como en Google Maps:

```
├────────────────────────────────────────────┤
│  ←  Indicaciones            2 min · 165 m  │
│  ────────────────────────────────────────  │
│  ↰  Salí de Dir. de Alumnos y doblá a la   │
│     izquierda                       30 m   │
│  ↑  Seguí derecho y salí de Económicas     │
│     al aire libre                          │
│     Al aire libre                   10 m   │
│  ↰  Doblá a la izquierda                   │
│     Al aire libre                   10 m   │
│  ↱  Doblá a la derecha                     │
│     Al aire libre                   20 m   │
│  …                                         │
│  ▼  Doblá a la izquierda: llegaste a       │
│     Dto. de Salud                          │
└────────────────────────────────────────────┘
```

**Paso tocado.** La hoja baja a altura media, el paso queda marcado en la lista y el mapa encuadra ese tramo resaltado (decisión 12).

En escritorio, la hoja es el panel lateral izquierdo de `construir-interfaz-movil` y el encuadre deja el margen a la izquierda en lugar de abajo.

### 2. La ruta se dibuja con capas vectoriales de Leaflet

Cada ruta es un conjunto de `Polyline` sobre un renderer Canvas propio del panel de la ruta:

- **Borde:** 10 px, `#174EA6`, extremos y uniones redondeados.
- **Relleno:** 6 px, `#1A73E8`, encima del borde.
- **Orden de capas, de abajo hacia arriba:** plano base → tramos cerrados (`cierres-temporales`) → alternativa en gris → ruta elegida → tramo resaltado → marcadores.
- El renderer usa `tolerance: 12` para que tocar la alternativa en gris funcione con el dedo sin agrandar el trazo.

El borde oscuro sostiene el contraste no textual (WCAG 1.4.11, 3:1) sobre colores claros del plano, como el pasillo naranja `#FED57B`. El azul solo tiene unos 3:1 contra ese pasillo, pero el borde `#174EA6` lo supera con margen.

*Alternativas:* una capa SVG por ruta (más nodos DOM y peor rendimiento al hacer zoom en Safari mobile) o dibujar la ruta dentro de las teselas (no permite cambiar de alternativa sin volver a pedir imágenes).

### 3. Tramos al aire libre: punteado con el mismo azul y leyenda

Los tramos exteriores se dibujan como **puntos redondeados**: el mismo azul con el mismo borde oscuro, separados por huecos (`dashArray` de 1 px de guion y 12 px de hueco, con `lineCap: round` en el borde y en el relleno). Es el código que Google Maps usa para los tramos a pie, así que es familiar. Una **leyenda** chica ("━━ Bajo techo / ••• Al aire libre") aparece en una esquina del mapa solo si la ruta tiene algún tramo al aire libre.

**Por qué punteado y no un tono distinto:**

- **Contraste:** los tramos exteriores pasan casi siempre por la vereda `#F8F8F8`. Un celeste claro como `#8AB4F8` tiene alrededor de 2:1 contra ese gris casi blanco, debajo del 3:1 que pide WCAG 1.4.11. Un azul más oscuro se confunde con el borde de la ruta.
- **No depender del color** (WCAG 1.4.1): la diferencia entre punteado y continuo se ve con daltonismo, con el brillo bajo o en blanco y negro.
- **Rojo y gris ya tienen dueño:** el rojo es del pin de destino, el gris es de la alternativa no elegida y los cierres usan su propio código de color.

**Pensado para la lluvia:** la codificación es la misma con lluvia y sin lluvia, porque el wireframe del TP3 definió el tramo descubierto como "una propiedad de la ruta y no del clima". Con lluvia, el usuario mira justamente los puntos para decidir si le conviene la alternativa. Por eso no los atenuamos ni los cambiamos de color según el clima. Lo que sí cambia con lluvia es el resumen: los metros al aire libre se muestran con un ícono de paraguas, y la recomendada pasa a ser la más resguardada (decisión 7).

*Alternativas:* tono más claro (descartada por contraste); color distinto como naranja (choca con el pasillo naranja del plano y con los cierres); ícono de nube sobre cada tramo (ensucia el mapa cuando hay muchos tramos cortos, como los cuatro giros seguidos de la vereda entre Económicas y Salud).

### 4. Marcadores

- **Origen:** círculo de 16 px, relleno `#1A73E8`, borde blanco de 3 px y sombra suave.
- **Destino:** pin de 28 × 40 px, relleno `#EA4335`, borde `#B31412` y punto blanco central. Se ancla en la punta.
- Se ubican en `puertaOrigen` y `puertaDestino` del resultado, es decir, en la puerta que efectivamente usa la ruta cuando el lugar tiene varias.
- Si el origen es una entrada al campus (`entrada-central-*`), se agrega una flecha chica sobre el primer tramo que marca el sentido de marcha (decisión 11).

### 5. Encuadre automático

Cuando aparece una ruta nueva o se cambia de alternativa, se llama a `fitBounds` con los límites de la polilínea y con márgenes calculados:

- **Margen superior:** la altura real de la tarjeta superior + 16 px.
- **Margen inferior:** la altura de la hoja a altura media + 16 px.
- **Márgenes laterales:** 24 px.
- En escritorio: margen izquierdo igual al ancho del panel lateral + 24 px.
- **Zoom máximo del encuadre:** limitado al nivel en que se leen los números de aula, para que una ruta de 10 m no quede gigante.

El encuadre no se repite si el usuario mueve el mapa o cambia la altura de la hoja; para volver se usa recentrar (`construir-interfaz-movil`), que con ruta activa vuelve a este mismo encuadre. Este cambio le pasa al visor los límites de la ruta.

*Alternativa:* encuadrar sin márgenes y dejar que la hoja tape parte de la ruta. Descartada porque el destino suele quedar debajo de la hoja.

### 6. Estado "Buscando el camino…"

- Se muestra en la hoja cuando se pide una ruta y la respuesta no llega en **150 ms**. Así no parpadea cuando todo está en caché.
- Una vez visible, queda al menos **400 ms**, para que no aparezca y desaparezca en un instante.
- La espera real la marcan los cierres y el clima (hasta 5 s de timeout, o unos 3 s en el escenario `lento`). El A\* tarda pocos milisegundos.
- La ruta anterior se quita del mapa apenas se pide una nueva: una ruta vieja con el origen nuevo sería un error.
- Se anuncia con `aria-live="polite"` y la barra tiene `role="progressbar"` sin valor.
- Si el clima falla, la espera termina y aparece la elección de criterio de `recomendacion-de-ruta`; si no hay red, el aviso de `tolerar-senal-irregular`.

### 7. Tarjeta resumen, chips y formato de números

- **Tiempo:** el `tiempoMin` del resultado ("2 min"; mínimo "1 min").
- **Distancia:** `distanciaM` redondeada al múltiplo de 5 m más cercano, con las mitades hacia arriba ("163 m" → "165 m"). Desde 1000 m se muestra con un decimal en km, aunque en el campus no ocurre.
- **Al aire libre:** si `exteriorM > 0`, "Incluye N m al aire libre", con el mismo redondeo y un mínimo de 5 m. Si es 0, "Todo bajo techo".
- **Chips:** aparecen solo cuando `recomendacion-de-ruta` entrega dos rutas distintas. La recomendada va primero.
  - La ruta resguardada se llama **"Techada"** si no tiene metros al aire libre y **"Más resguardada"** si tiene alguno. En el ejemplo real la resguardada igual pasa 40 m por la vereda, y llamarla "Techada" sería prometer algo falso bajo la lluvia.
  - La más corta se llama **"Más rápida"**.
  - Cada chip muestra su tiempo. La recomendada por lluvia lleva el subtítulo "Recomendada con lluvia".
  - Si el clima falló y el usuario eligió un criterio, ningún chip lleva "Recomendada".
- **Ruta única:** si solo hay una ruta (no llueve, o las dos coinciden), no hay chips. Con lluvia y una sola ruta se agrega una línea que dice por qué: "Ya es techada" si no tiene metros al aire libre, o "Es la opción más resguardada" si tiene.
- **Cambiar de chip** no recalcula: las dos rutas ya están calculadas. Redibuja la ruta, actualiza el resumen, regenera las indicaciones (memoizadas por ruta) y vuelve a encuadrar.

### 8. Alternativa en gris, tocable

La ruta no elegida se dibuja por debajo con relleno `#80868B` y borde `#5F6368` (unos 3,4:1 contra la vereda), sin punteado: es información secundaria y su detalle está en el chip. Tocarla equivale a tocar su chip. Si los dos trazados se superponen en un tramo, la elegida queda arriba y solo se ve la parte distinta de la alternativa.

### 9. Generación de indicaciones: función pura en `src/rutas/indicaciones.ts`

```ts
type TipoPaso = 'salir-lugar' | 'seguir' | 'girar' | 'salir-edificio'
  | 'entrar-edificio' | 'cambiar-edificio' | 'llegar' | 'piso';

interface Paso {
  tipo: TipoPaso;
  texto: string;              // "Doblá a la izquierda"
  giro?: 'izquierda' | 'derecha';
  distanciaM?: number;        // ya redondeada a 5 m; ausente en 'llegar' y 'piso'
  alAireLibre: boolean;       // el tramo que sigue a la maniobra es exterior
  tramo: { desde: number; hasta: number }; // índices en ruta.nodos, para encuadrar
}

function generarIndicaciones(ruta: ResultadoRuta, grafo: GrafoRuteable,
  catalogo: Catalogo, entradas: NombresEntradas): Paso[];
```

Pasos del algoritmo:

1. **Tramos:** cada par de nodos consecutivos da un tramo con dirección (vector unitario sobre un eje), longitud, si es exterior y el departamento de cada extremo.
2. **Absorber desvíos mínimos:** un tramo de menos de **3 m** entre dos tramos con la misma dirección se suma a ellos y no genera giros. Por ejemplo, `pasillo-central-22`→`pasillo-central-17` mide 1,5 m hacia el norte entre dos tramos hacia el este.
3. **Agrupar colineales:** los tramos seguidos con la misma dirección forman una corrida, aunque cambie interior/exterior. Ese cambio no corta la corrida en dos giros, pero sí genera un evento (paso 5).
4. **Giros:** entre dos corridas con direcciones `d1` y `d2` se calcula el producto vectorial en coordenadas de pantalla, donde la y crece hacia abajo como en el plano: `c = d1.x · d2.y − d1.y · d2.x`.
   - `c > 0` → derecha. Ejemplo: ir al este `(1, 0)` y seguir al sur `(0, 1)` da `c = 1`.
   - `c < 0` → izquierda.
   - `c = 0` → sigue derecho y no hay paso.
   - Un giro de 180° (`c = 0` con producto escalar negativo) no debería aparecer en una ruta óptima; si aparece, se escribe "Volvé sobre tus pasos" y se registra en consola.
   - **Giros seguidos:** si la corrida entre dos giros mide menos de 4 m, se combinan en un paso: "Doblá a la izquierda y enseguida a la derecha".
5. **Eventos de edificio:** al recorrer los nodos se detecta:
   - **Interior → exterior en el nodo n:** paso `salir-edificio`. Si n es una `entrada-*` con nombre curado: "Salí de Salud por la entrada oeste". Si no tiene nombre curado o es uno de los 3 pasillos frontera: "Salí de Económicas al aire libre". Si n es la puerta de origen y da a la vereda, el evento se funde con el primer paso: "Salí de Biblioteca a la vereda".
   - **Exterior → interior:** paso `entrar-edificio` con la misma lógica: "Entrá a Salud por la entrada oeste".
   - **Interior → interior con otro departamento:** paso `cambiar-edificio`, fundido con el giro o la corrida en curso: "Doblá a la derecha y seguí por el pasillo hasta Salud". Los nombres de edificio salen del catálogo (nombre visible del departamento). `central` nunca se nombra: se dice "al aire libre".
6. **Primer paso:**
   - Si el origen es una puerta, la dirección de salida es la del tramo puerta → pasillo, y el giro se calcula contra la primera corrida: "Salí de Dir. de Alumnos y doblá a la izquierda".
   - Si el origen es una entrada al campus, ver la decisión 11.
7. **Último paso:** el tramo pasillo → puerta del destino da el lado: "Doblá a la izquierda: llegaste a Dto. de Salud". Si el tramo final sigue la misma dirección: "Seguí derecho: llegaste a …". Si la puerta destino da a la vereda: "Llegaste a Biblioteca".
8. **Distancias:** cada paso lleva la longitud de la corrida que sigue a la maniobra, redondeada al múltiplo de 5 m más cercano (mitades hacia arriba, mínimo 5 m). La suma de los pasos puede diferir unos metros del total de la tarjeta resumen, que se redondea una sola vez. Es el mismo comportamiento de Google Maps.
9. **Al aire libre:** cada paso cuya corrida es exterior lleva `alAireLibre: true` y la lista lo muestra con el rótulo "Al aire libre".
10. **Otros pisos:** si el lugar destino tiene piso distinto de planta baja, se agrega al final un paso `piso` con la indicación de llegada curada del catálogo. El catálogo solo incluye esos lugares si la indicación está verificada (spec `catalogo-lugares`). Si faltara la indicación, el paso dice solo el piso ("El lugar está en el 1er piso") y no se inventan escaleras.

*Alternativas:* textos armados en la interfaz React (difícil de testear y de reusar); indicaciones precalculadas en el build para todos los pares (≈ 40 000 pares por criterio, y dejan de servir si hay cierres); umbrales en px en lugar de metros (dependerían de la escala del plano, que todavía se calibra con `METROS_POR_PX`).

### 10. Nombres de entradas: curados a mano, con texto genérico de respaldo

Las 24 entradas de edificio (`entrada-*` que no son `central`) tienen un nombre visible en `datos-fuente/entradas.json`, por ejemplo `{"entrada-salud-01": "entrada oeste", "entrada-economicas-01": "entrada oeste de arriba"}`. El build de datos valida que cada id exista en el grafo y reporta las entradas sin nombre sin frenar.

*Alternativa descartada:* derivar el punto cardinal comparando la posición de la entrada con el rectángulo que ocupan los nodos del edificio. Lo probamos sobre el grafo real y falla en casos que el `CLAUDE.md` documenta:

- `entrada-economicas-01` sale "norte", pero es la "oeste de arriba".
- `entrada-artes-y-medios-02` sale "sur" porque los nodos de Artes y Medios forman una franja angosta, pero es la entrada oeste que da al pasillo central.

Un nombre equivocado es peor que ninguno, así que, sin nombre curado, el texto no menciona la entrada.

Los 3 nodos frontera que son pasillos (`pasillo-economicas-10`, `pasillo-economicas-44` y `pasillo-artes-y-medios-25`) quedan con el texto genérico. Además se anotan en Open Questions para que el equipo decida si son entradas sin marcar.

### 11. Primer paso cuando el origen es una entrada al campus

En una entrada al campus no hay puerta que defina hacia dónde mira el usuario, y sin GPS no se puede saber su orientación. El primer paso dice "Desde Entrada principal, seguí la línea azul 40 m". En el mapa, una flecha sobre el primer tramo marca el sentido. Los giros siguientes ya son relativos a la marcha.

*Alternativas:* puntos cardinales ("caminá hacia el norte"), que un ingresante no puede traducir en el lugar; o referencias visibles ("hacia el Teatro"), que se evalúan en Open Questions.

### 12. Tocar un paso

- La hoja baja a altura media y el paso queda marcado (`aria-current="step"`).
- El mapa encuadra el tramo del paso con los márgenes de la decisión 5. El tramo va desde el nodo de la maniobra hasta el de la maniobra siguiente.
- El tramo se dibuja resaltado (relleno 8 px y halo blanco de 2 px) y aparece un punto en el lugar de la maniobra.
- Tocar otro paso mueve el resaltado. Volver a la vista de resultado o cambiar de alternativa lo quita.
- Los pasos `llegar` y `piso` encuadran el destino.

### 13. Ejemplo real: Dir. de Alumnos (Económicas) → Dto. de Salud

Calculado sobre `grafo.json` con `METROS_POR_PX = 0,35` y 1,2 m/s.

**Ruta más corta:** 466,94 px, es decir 163 m. La tarjeta muestra "2 min · 165 m" e "Incluye 60 m al aire libre" (62 m reales). Nodos:

`puerta-economicas-dir-de-alumnos` → `pasillo-economicas-41`…`44` → `pasillo-central-33` → `-31` → `-32` → `-30` → `entrada-salud-01` → `pasillo-salud-35` → `-26` → `-27` → `-23` → `-20` → `-19` → `puerta-salud-dto-de-salud`

| # | Indicación | Distancia | Nodo de la maniobra |
|---|---|---|---|
| 1 | Salí de Dir. de Alumnos y doblá a la izquierda | 30 m | `pasillo-economicas-41` (sur → este) |
| 2 | Seguí derecho y salí de Económicas al aire libre · *Al aire libre* | 10 m | `pasillo-economicas-44` (frontera sin entrada con nombre) |
| 3 | Doblá a la izquierda · *Al aire libre* | 10 m | `pasillo-central-33` (este → norte) |
| 4 | Doblá a la derecha · *Al aire libre* | 20 m | `pasillo-central-31` (norte → este) |
| 5 | Doblá a la izquierda · *Al aire libre* | 15 m | `pasillo-central-32` (este → norte) |
| 6 | Doblá a la derecha · *Al aire libre* | 10 m | `pasillo-central-30` (norte → este) |
| 7 | Entrá a Salud por la entrada oeste | 5 m | `entrada-salud-01` |
| 8 | Doblá a la izquierda | 5 m | `pasillo-salud-35` (este → norte) |
| 9 | Doblá a la derecha | 20 m | `pasillo-salud-26` (norte → este) |
| 10 | Doblá a la izquierda | 20 m | `pasillo-salud-27` (este → norte) |
| 11 | Doblá a la izquierda: llegaste a Dto. de Salud | — | `pasillo-salud-19` (norte → oeste) |

Comprobación del primer giro: salir hacia el sur `(0, 1)` y seguir hacia el este `(1, 0)` da `c = 0·0 − 1·1 = −1`, es decir izquierda. Si mirás hacia abajo del plano, el este queda a tu izquierda.

**Ruta resguardada:** 797,96 px, es decir 279 m. El chip muestra "Más resguardada · 4 min" y la tarjeta "4 min · 280 m · Incluye 40 m al aire libre". No hay camino 100 % techado entre los dos edificios.

| # | Indicación | Distancia |
|---|---|---|
| 1 | Salí de Dir. de Alumnos y doblá a la izquierda | 15 m |
| 2 | Doblá a la izquierda | 105 m |
| 3 | Doblá a la derecha | 20 m |
| 4 | Seguí derecho y salí de Económicas al aire libre · *Al aire libre* | 40 m (incluye el desvío de 1,5 m absorbido) |
| 5 | Entrá a Artes y Medios por la entrada oeste | 25 m |
| 6 | Doblá a la derecha y seguí por el pasillo hasta Salud | 60 m |
| 7 | Doblá a la derecha: llegaste a Dto. de Salud | — |

Este ejemplo se usa como **test de referencia** (golden test) de `generarIndicaciones` con el grafo real. Si cambia `METROS_POR_PX`, se actualizan las distancias esperadas.

### 14. Accesibilidad

- La lista de indicaciones es una lista ordenada. Cada paso es un botón con el texto completo, incluidos la distancia y "al aire libre". Los íconos de giro son decorativos (`aria-hidden`).
- Al aparecer una ruta se anuncia el resumen: "Ruta encontrada: 2 min, 165 m, incluye 60 m al aire libre".
- Los chips son botones con `aria-pressed`.
- Todos los controles miden al menos 44 × 44 px.

## Risks / Trade-offs

- [Muchos giros cortos en la vereda (4 giros en 55 m en el ejemplo) hacen la lista larga] → Desvíos de menos de 3 m absorbidos, giros a menos de 4 m combinados con "enseguida", y la línea en el mapa como guía principal. Si la prueba del TP5 muestra que confunde, se sube el umbral de absorción (es una constante).
- [`METROS_POR_PX` todavía no está calibrado (≈ 0,35)] → Las distancias se muestran redondeadas a 5 m y todos los umbrales están en metros, así que recalibrar no cambia el código. El golden test se regenera con la constante nueva.
- [Nombre de entrada equivocado o sin cargar] → Sin nombre curado, el texto omite la entrada en lugar de adivinar. El build reporta las entradas sin nombre. El equipo verifica los nombres en el campus antes de la prueba.
- [Giro izquierda/derecha mal calculado si alguna arista dejara de ser ortogonal] → `grafo-campus` valida la ortogonalidad en el build. Además, la dirección se toma del eje dominante del tramo, así que un desfase menor a 1 px no cambia el resultado.
- [La hoja tapa el destino en pantallas bajas (por ejemplo, 667 px de alto)] → Los márgenes del encuadre se calculan con la altura real de la hoja. Con la hoja a altura media siempre queda al menos el 45 % del alto para el mapa.
- [Tocar la alternativa gris por error cambia la ruta] → Tolerancia de toque moderada y cambio reversible al instante con el chip. Las dos rutas siguen visibles.
- [El punteado se pierde en zoom muy lejano] → En los niveles de zoom más alejados el patrón se escala con el ancho del trazo. La leyenda y el resumen dicen los metros igual.

## Migration Plan

Cambio nuevo, sin datos previos que migrar. Se implementa después de `calcular-ruta-astar`, `adaptar-ruta-al-clima` y `construir-interfaz-movil`. `datos-fuente/entradas.json` se crea con las 24 entradas de edificio; las que el equipo no confirme en el campus quedan sin nombre (texto genérico). Para volver atrás alcanza con revertir el cambio: la hoja vuelve a mostrar el lugar reservado vacío.

## Open Questions

- **Hora estimada de llegada** ("llegás 13:56", presente en el wireframe del TP3): ¿vale la pena si la ruta queda abierta mientras se camina y la hora se desactualiza? Se puede agregar sin tocar los specs de este cambio.
- **Nodos frontera que son pasillos** (`pasillo-economicas-10`, `pasillo-economicas-44` y `pasillo-artes-y-medios-25`): ¿son entradas sin marcar en Figma? Si se convierten en `entrada-*`, las indicaciones pueden nombrarlas.
- **Primer paso desde una entrada al campus:** ¿alcanza con "seguí la línea azul" o conviene nombrar una referencia visible ("hacia el Teatro")? Se decide después de la prueba con usuarios.
- **Umbrales de absorción (3 m) y de "enseguida" (4 m):** valores iniciales; se ajustan con lo que se observe en el TP5.
