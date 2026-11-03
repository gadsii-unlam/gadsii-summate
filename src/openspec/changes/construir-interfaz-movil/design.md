## Context

*¿Dónde queda?* se usa desde el celular, caminando por el campus, muchas veces con poco tiempo antes de una clase y con señal irregular (brief v2, "Necesidades, problemas y contexto de uso"). El flujo principal del brief v4 es: abrir la app y ver el mapa; elegir origen (entre referencias reconocibles o confirmando el último) y destino; calcular solo cuando los dos son válidos; seguir la ruta y corregir sin perder el contexto.

El wireframe del TP3 (`docs/diseno/wireframe/index.html`, alternativa B "Eficiencia") ya fijó la estructura: una pantalla única con el mapa de fondo que no se abandona (P1); los selectores de destino y de origen se abren encima y son el mismo componente (P2 y P5); el resultado aparece en el mismo lugar (P3 y P4, `mostrar-ruta-e-indicaciones`); y hay un estado "Sin ruta disponible" (P6, `aplicar-cierres-temporales`). Este diseño lleva esa estructura a un lenguaje visual parecido a Google Maps y le suma las correcciones del TP4.

Punto de partida:

- `configurar-base-app` deja React + Vite + TypeScript, Vitest + Testing Library, Playwright con el proyecto `movil` (390 × 844, táctil) y la carpeta `src/ui/` para todo lo que usa React.
- `preparar-datos-campus` entrega el catálogo de lugares (nombre visible, edificio, categoría, puertas, alias, piso, si es referencia para el origen) y el plano base en teselas, en el mismo sistema de coordenadas que `grafo.json` (px de `mapa-unlam`, 1587,4 × 3004,7).
- El mapa es vertical y alto: arriba están las canchas y los estacionamientos, y los edificios ocupan aproximadamente de y = 1100 a y = 2850. Los números de aula se leen recién con zoom.

## Goals / Non-Goals

**Goals:**

- Una interfaz mobile-first que se use con una mano y que se parezca a Google Maps en estructura y comportamiento, sin usar su marca.
- Llegar de "abrir la app" a "ruta pedida" en pocos toques sin sacrificar la prevención de errores del TP4: el origen siempre está confirmado por el usuario.
- Estado de pantalla predecible y testeable, con el botón Atrás integrado.
- Búsqueda rápida y tolerante sobre unos 300 lugares, sin red.
- Accesibilidad WCAG 2.1 AA en lo que dependa de esta capa.
- Puntos de integración claros para los cambios 4, 5, 7 y 8.

**Non-Goals:**

- Dibujar la ruta, la tarjeta resumen, las alternativas o las indicaciones (cambio 7).
- Decidir si un lugar tiene acceso (cambio 4) o qué criterio de ruta recomendar (cambio 5).
- Service worker, caché y restauración al recargar (cambio 8).
- Modo oscuro, rotación del mapa, GPS, selección de un punto libre en el mapa.

## Decisions

### D1. Anatomía de la pantalla (celular de 390 px)

El mapa ocupa siempre toda la pantalla y nunca se desmonta. Encima flotan, de abajo hacia arriba: botones circulares, hoja inferior, tarjeta superior y, cuando corresponde, la búsqueda a pantalla completa.

Leyenda de íconos: `⌕` lupa · `⇢` "Cómo llegar" (flecha de direcciones) · `(?)` ayuda · `(◎)` recentrar · `◉` origen (círculo azul con borde blanco) · `▼` destino (pin rojo) · `⇅` intercambiar · `▬▬` manija de la hoja.

**Vista 1 — Inicio** (P1 del wireframe)

```
┌──────────────────────────────────────┐ ← env(safe-area-inset-top)
│ ╭──────────────────────────────────╮ │
│ │ ⌕  ¿A dónde vas?             ⇢   │ │ tarjeta de búsqueda · 48 px · radio 28
│ ╰──────────────────────────────────╯ │
│ (Biblioteca)(Buffet)(Teatro)(Entra…→ │ chips de referencias · scroll horizontal
│                                      │
│                                      │
│          PLANO DEL CAMPUS            │
│     (zona de edificios encuadrada)   │
│                                      │
│                                (?)   │ botones circulares · 48 px
│                                (◎)   │
│╭────────────────────────────────────╮│
││               ▬▬▬▬                 ││ hoja colapsada
││ Recientes                          ││
││ ⟲ Aula 121 · Humanidades           ││
│╰────────────────────────────────────╯│ ← env(safe-area-inset-bottom)
└──────────────────────────────────────┘
```

Si todavía no hay recientes, la hoja muestra en su lugar la indicación de primer uso (D9).

**Vista 2 — Búsqueda abierta** (P2 y P5: mismo componente para destino y origen)

```
┌──────────────────────────────────────┐
│ ←  lab fis▏                       ✕  │ campo con foco · el teclado se abre solo
│──────────────────────────────────────│
│ ▣  Lab. de **Fís**ica                │ fila de 64 px: nombre (coincidencia
│    Arquitectura · Laboratorio        │ en negrita) + edificio · categoría
│ ▣  Dto. de **Fís**ica                │
│    Arquitectura · Departamento       │
│ ▣  Aula 250       ⊘ Sin acceso ahora │ estado a la derecha, texto + ícono
│    Arquitectura · Aula               │
│──────────────────────────────────────│
│         [ teclado del sistema ]      │
└──────────────────────────────────────┘
```

Con el campo vacío, la lista muestra "Recientes" y debajo "Lugares de referencia". Al buscar el origen, el título es "¿Desde dónde salís?", la primera fila es la sugerencia del último origen y siguen las referencias (entradas al campus, Biblioteca, Buffet…).

**Vista 3 — Ficha del lugar** (hoja en altura media)

```
┌──────────────────────────────────────┐
│ ╭──────────────────────────────────╮ │
│ │ ←  Aula 121                   ✕  │ │ la tarjeta superior pasa a ser título
│ ╰──────────────────────────────────╯ │
│                                      │
│          PLANO DEL CAMPUS            │
│                ▼                     │ pin rojo en la puerta del lugar
│                                (◎)   │
│╭────────────────────────────────────╮│
││               ▬▬▬▬                 ││
││ Aula 121                           ││ título 22 px
││ Humanidades · Aula · Planta baja   ││ 14 px gris secundario
││ ╭────────────────╮                 ││
││ │ ⇢  Cómo llegar │                 ││ botón primario azul · 44 px
││ ╰────────────────╯                 ││
││────────────────────────────────────││
││ Tiene 2 puertas                    ││ (solo en altura media y expandida)
│╰────────────────────────────────────╯│
└──────────────────────────────────────┘
```

**Vista 4 — Panel "Cómo llegar"**

```
┌──────────────────────────────────────┐
│ ╭──────────────────────────────────╮ │
│ │ ←  ◉  Elegí desde dónde salís    │ │ campo de origen (botón)
│ │    ┊                         ⇅   │ │ intercambiar
│ │    ▼  Aula 121                   │ │ campo de destino (botón)
│ ╰──────────────────────────────────╯ │
│          PLANO DEL CAMPUS            │
│╭────────────────────────────────────╮│
││               ▬▬▬▬                 ││
││ ¿Salís de Entrada principal?       ││ sugerencia del último origen (hallazgo 1)
││ Es el último punto que usaste.     ││
││ ╭──────────────────╮               ││
││ │ Usar este origen │               ││ confirma con un toque
││ ╰──────────────────╯               ││
││ Lugares para ubicarte              ││ referencias (hallazgo 2)
││ ⊙ Entrada principal                ││
││ ⊙ Biblioteca                       ││
│╰────────────────────────────────────╯│
└──────────────────────────────────────┘
```

Cuando el origen está confirmado y el destino es válido, el contenido de la hoja se reemplaza por el **lugar reservado para el resultado** de `mostrar-ruta-e-indicaciones` ("Buscando el camino…", tarjeta "4 min · 280 m", chips de alternativas, pasos). El panel de arriba no se mueve: corregir un dato sigue costando un toque, como en P3 del wireframe.

**Desvío consciente respecto del brief.** El brief v3 y v4 dice que al abrir se ven "los campos de origen y destino". Google Maps muestra solo la barra de búsqueda. Elegimos el patrón de Google Maps porque es familiar y ahorra espacio de mapa. Lo compensamos así: la barra "¿A dónde vas?" **es** el campo de destino; el botón `⇢` de la barra abre directamente el panel con los dos campos; y el panel aparece apenas se elige un destino. Se observa en la prueba del TP5.

### D2. Hoja inferior de tres alturas

Componente propio en `src/ui/hoja/`, hecho con Pointer Events y `transform: translateY()` (solo propiedades que componen en GPU).

| Altura | Valor (390 × 844, iPhone con insets 47/34) | Qué se ve |
|---|---|---|
| **Colapsada** | `96px + env(safe-area-inset-bottom)` ≈ 130 px | Manija y la primera fila: título de la ficha con el botón "Cómo llegar", el primer reciente o el título de la indicación de primer uso. |
| **Media** | `50dvh` ≈ 422 px | El contenido principal: lista de recientes y referencias, ficha completa, sugerencia de origen y referencias, o resultado de ruta. |
| **Expandida** | `100dvh − (alto de la tarjeta superior + inset superior + 16 px)` ≈ 730 px en inicio y ficha, ≈ 650 px en "Cómo llegar" | Todo, con scroll interno. La tarjeta superior sigue visible. |

Altura inicial según la vista: inicio → colapsada (o media si se muestra la indicación de primer uso); ficha → media; "Cómo llegar" → media; resultado de ruta → la decide el cambio 7.

Arrastre y anclaje:

- Se arrastra desde la manija y desde la cabecera de la hoja. Zona táctil de la manija: 44 px de alto por todo el ancho.
- Al soltar, se proyecta la posición con la velocidad (`posición + velocidad × 200 ms`) y se ancla a la altura más cercana. Un deslizamiento rápido (más de 0,5 px/ms) avanza una altura en esa dirección aunque no haya llegado a la mitad.
- En la altura expandida el contenido scrollea. Si el scroll está arriba de todo y el dedo baja, arrastra la hoja (como Google Maps). `touch-action: pan-y` en la lista y `overscroll-behavior: contain` para que no se dispare el "tirar para recargar".
- La animación de anclaje usa una curva *ease-out* de 250 ms. Con `prefers-reduced-motion` el cambio es instantáneo.
- La lógica de anclaje es una función pura (`elegirAnclaje(posición, velocidad, anclajes)`), testeable sin DOM.
- Cuando cambia la altura, el mapa recibe el alto visible de la hoja para encuadrar con `padding` (D4).

**Escritorio (≥ 1024 px):** la hoja pasa a ser un **panel lateral izquierdo** de 408 px de ancho y alto completo, con la tarjeta superior arriba y el contenido con scroll. No tiene manija ni alturas. La búsqueda se abre dentro del panel, no a pantalla completa. Se ven los controles de zoom `+`/`−`. Entre 600 y 1023 px se usa la disposición móvil, con la hoja y la tarjeta limitadas a 560 px de ancho y pegadas a la izquierda con 16 px de margen.

*Alternativas:* `vaul` (pensado como diálogo modal: atrapa el foco y bloquea el mapa, y nosotros necesitamos una hoja no modal); `react-modal-sheet` (depende de una librería de animación de unos 30 kB y el anclaje no se adapta tan fácil al alto de la tarjeta superior); CSS `scroll-snap` sobre un contenedor (no da control de la velocidad ni del arrastre desde el contenido). El componente propio es chico (unas 200 líneas) y queda totalmente testeado.

### D3. Tokens visuales

Definidos como variables CSS en `src/ui/tema/tokens.css` y espejados en un objeto TypeScript para Leaflet (colores de marcadores). Solo modo claro. Las variables están preparadas para un modo oscuro futuro (todo color pasa por un token).

**Paleta**

| Token | Valor | Uso | Contraste sobre `#FFFFFF` |
|---|---|---|---|
| `--color-primario` | `#1A73E8` | Botón "Cómo llegar", foco, chips activos, ruta (cambio 7), círculo de origen | 4,5:1 (AA texto normal, justo) |
| `--color-primario-oscuro` | `#174EA6` | Borde de la ruta, estado presionado | 7,8:1 |
| `--color-sobre-primario` | `#FFFFFF` | Texto sobre azul | 4,5:1 |
| `--color-destino` | `#EA4335` | Pin de destino (gráfico) | 3,9:1: **solo gráfico**, nunca texto |
| `--color-destino-borde` | `#B31412` | Borde y punto interior del pin | — |
| `--color-error-texto` | `#C5221F` | Texto "Sin acceso ahora", errores | 5,8:1 |
| `--color-superficie` | `#FFFFFF` | Tarjetas, hoja, búsqueda | — |
| `--color-superficie-variante` | `#F1F3F4` | Fondo de chips, campos, separadores gruesos | — |
| `--color-borde` | `#DADCE0` | Bordes y divisores | — |
| `--color-texto` | `#202124` | Texto principal | 16:1 |
| `--color-texto-secundario` | `#5F6368` | Edificio, categoría, ayudas breves | 6,0:1 |
| `--color-fondo-mapa` | `#F8F8F8` | Fondo mientras cargan las teselas (el color de la vereda) | — |

`#80868B` (3,7:1) queda prohibido para texto. El estado nunca se comunica solo con color: "Sin acceso ahora" lleva texto e ícono.

**Elevación** (sombras al estilo Material, con el gris `rgb(60 64 67)`):

- `--elevacion-1` (chips, campos): `0 1px 2px rgb(60 64 67 / .3), 0 1px 3px 1px rgb(60 64 67 / .15)`
- `--elevacion-2` (tarjeta superior, botones circulares): `0 1px 2px rgb(60 64 67 / .3), 0 2px 6px 2px rgb(60 64 67 / .15)`
- `--elevacion-3` (hoja inferior): `0 -1px 3px rgb(60 64 67 / .3), 0 -4px 8px 3px rgb(60 64 67 / .15)`

**Tipografía:** `font-family: Roboto, system-ui, -apple-system, "Segoe UI", sans-serif`, sin fuentes web (Roboto está en Android; en iOS cae en San Francisco). No se descarga nada, así funciona sin red y no hay salto de fuente. Escala en `rem`: título de ficha 1,375 rem (22 px) / 500; título de sección 1 rem / 500; cuerpo 1 rem (16 px) / 400; secundario 0,875 rem (14 px); leyenda 0,75 rem (12 px). **Todo campo de texto usa 16 px** para que Safari en iOS no haga zoom al enfocarlo.

**Radios:** tarjeta de búsqueda 28 px (píldora); hoja inferior 16 px arriba; chips 16 px; botones 22 px (píldora de 44 px); filas sin radio.

**Espaciado:** base de 4 px (`4, 8, 12, 16, 24, 32`). Margen lateral de 16 px en celular.

**Objetivos táctiles:** al menos 44 × 44 px. Los chips miden 36 px de alto visibles y su zona táctil se extiende a 44 px con un pseudo-elemento. Los botones circulares miden 48 px. Las filas de resultado miden 64 px. La separación entre objetivos es de al menos 8 px.

**Áreas seguras de iOS:** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. La tarjeta superior va en `top: calc(env(safe-area-inset-top) + 8px)` y la hoja suma `env(safe-area-inset-bottom)` a su relleno inferior. Los botones circulares se ubican encima de la hoja colapsada. Las alturas usan `dvh` con `vh` como respaldo, para que la barra de direcciones de Safari no tape la hoja. Se escucha `visualViewport` para que, con el teclado abierto, la lista de resultados quede por encima del teclado.

**Íconos:** SVG embebidos dibujados con el estilo de Material Symbols (licencia Apache 2.0). No usamos logos, nombre ni marcas de Google en ningún lado. La identidad es la de *¿Dónde queda?*.

**Capas (z-index):** mapa 0 · botones circulares 10 · hoja 20 · tarjeta superior 30 · búsqueda a pantalla completa y ayuda 40 · avisos 50.

### D4. Mapa: Leaflet `CRS.Simple` con react-leaflet y teselas raster

Decisión del plan compartido (punto 11). `leaflet` 1.9 con `react-leaflet` (v4 si el cambio 1 fija React 18; v5 si fija React 19).

- **Sistema de coordenadas:** `L.CRS.Simple` extendido con `transformation: new L.Transformation(1, 0, 1, 0)`, para que la y crezca hacia abajo como en Figma. Un `LatLng` es `[y, x]` en px de `mapa-unlam`, así que los nodos de `grafo.json` se ubican sin convertir. Hay una única función de conversión `aLatLng({x, y})` en `src/ui/mapa/coordenadas.ts`.
- **Teselas:** capa de teselas de 256 px que lee `/data/teselas/<version>/{z}/{x}/{y}.webp` (`<version>` es el hash del plano). Los niveles nativos van de −2 (1/4) a 2 (4×, la escala del render `mapa-unlam.png`). Como la URL no lleva números negativos, se usa `zoomOffset: 2` (z de la URL de 0 a 4). Se cargan solo las teselas visibles (`keepBuffer: 2`) y se usa `updateWhenZooming: false` para no pedir de más durante el pellizco. Este formato es un **contrato con `preparar-datos-campus`**, que genera la pirámide. Si allá cambia, se ajusta una constante.
- **Respaldo:** si fallan varias teselas seguidas (por ejemplo más de 5), se cambia a una imagen única de 1× con `ImageOverlay`. Más resolución en una sola imagen supera límites de memoria de Safari en iOS.
- **Zoom:** `minZoom` se calcula para que entre el mapa entero en la pantalla (≈ −2 en 390 px); `maxZoom` 3 (por encima de 2 se agranda la tesela de nivel 2); `zoomSnap` 0,25, `zoomDelta` 0,5.
- **Límites:** `maxBounds` es el rectángulo del mapa (0, 0)–(1587,4, 3004,7) con un margen del 10 % y `maxBoundsViscosity: 1`, así el plano no se puede perder de vista.
- **Encuadre inicial:** la zona de edificios, como constante configurable `ENCUADRE_INICIAL` (aproximadamente x 200–1200, y 1100–2850; se ajusta mirando el mapa). Se encuadra con `fitBounds` y `padding` que descuenta la tarjeta superior y la hoja: `paddingTopLeft: [16, altoTarjeta + 16]`, `paddingBottomRight: [16, altoHoja + 16]`.
- **Gestos:** pellizcar (`touchZoom`), doble toque para acercar (doble toque emulado por Leaflet), arrastre con inercia (`inertia: true`), rueda en escritorio. Sin rotación. Teclado activo en escritorio (flechas y `+`/`−`). El contenedor del mapa tiene `touch-action: none` y el `body` `overflow: hidden; overscroll-behavior: none`. No bloqueamos el zoom del navegador en el `viewport` (accesibilidad).
- **Recentrar:** el botón `(◎)` vuelve al encuadre de la vista activa: el campus en inicio, el lugar en la ficha y la ruta cuando la hay (ese encuadre lo provee el cambio 7).
- **Lugar seleccionado:** en la ficha se muestra un pin rojo en la puerta principal del lugar (la primera de su lista de puertas) y el mapa se mueve para que quede en la franja visible entre la tarjeta y la hoja, sin cambiar el zoom si ya está visible.
- **Capas para otros cambios** (panes de Leaflet, de abajo hacia arriba): `plano`, `cierres` (cambio 4), `ruta` (cambio 7) y `marcadores`. Se exponen como espacios donde los otros cambios montan sus capas.
- **Sin control de atribución** (no hay teselas de terceros). El crédito del plano va en la ayuda.
- **Rendimiento:** el mapa tiene que ser interactivo en menos de 3 s con la emulación "4G lenta" de Lighthouse para celular. El primer pedido carga solo las teselas del encuadre inicial (unas 6 a 12 a nivel −2/−1). El bundle de Leaflet ronda los 40 kB comprimido.

*Alternativas descartadas:*

- **SVG directo con pan-zoom propio:** `mapa-unlam.svg` pesa 1,6 MB y tiene 3737 paths. Safari en iOS se traba al pellizcar, hay que escribir los gestos y los límites a mano, y además el SVG incluye puntos y aristas que habría que filtrar.
- **MapLibre GL:** pensado para geodatos y teselas vectoriales con estilos JSON. Usarlo con un plano en px obliga a inventar una proyección, el bundle es varias veces más grande y exige WebGL.
- **OpenLayers:** soporta bien proyecciones en px, pero es más pesado y su integración con React es más pobre que react-leaflet.
- **Imagen única con una librería de pan-zoom (`react-zoom-pan-pinch`) más SVG encima:** simple, pero una imagen nítida a 4× no entra en memoria en iOS, y hay que resolver a mano la ubicación de marcadores y el encuadre.
- **API de Google Maps con un tipo de mapa propio:** requiere clave y red, y trae la marca de Google, que no queremos.

### D5. Estado de pantalla: máquina de estados simple con el historial del navegador

Dos estados separados, en un `useReducer` con reductor puro (`src/ui/estado/`) y un contexto de React:

```ts
type Vista =
  | { tipo: 'inicio' }
  | { tipo: 'buscando'; campo: 'destino' | 'origen' }
  | { tipo: 'ficha'; lugarId: string }
  | { tipo: 'como-llegar' }            // fase derivada: 'eligiendo' | 'ruta'
  | { tipo: 'ayuda'; sobre: Vista };   // capa encima de cualquier vista

interface Seleccion {
  origen: string | null;              // id de lugar, SOLO si el usuario lo eligió o confirmó
  destino: string | null;
  sugerenciaOrigen: string | null;    // último origen guardado; nunca se usa sin confirmar
}
```

La fase de "Cómo llegar" se deriva: es `'ruta'` cuando `origen && destino && origen !== destino`. Si no, es `'eligiendo'`.

```
                 tocar barra                elegir lugar
   ┌────────┐ ─────────────► ┌──────────────────┐ ─────────► ┌───────┐
   │ inicio │                │ buscando:destino │            │ ficha │
   └────────┘ ◄──── Atrás ── └──────────────────┘ ◄── Atrás ─ └───────┘
     │  ▲  ▲ chip / reciente ───────────────────────────────►   │  │
     │  │  └──────────────────── ✕ (vuelve al inicio) ──────────┘  │ "Cómo llegar"
     │  │                                                          ▼
     │  │          botón ⇢ de la barra            ┌───────────────────────────┐
     └──┼───────────────────────────────────────► │ como-llegar               │
        └──────────────── Atrás / ✕ ───────────── │  eligiendo ──► ruta (auto)│
                                                  └───────────────────────────┘
                                          tocar campo │   ▲ elegir (Atrás interno)
                                                      ▼   │
                                             ┌───────────────────────────┐
                                             │ buscando:origen | destino │
                                             └───────────────────────────┘
```

| Desde | Evento | Hacia | Historial |
|---|---|---|---|
| inicio | tocar la barra | buscando:destino | `pushState` `#buscar` |
| inicio | tocar un chip o un reciente | ficha | `pushState` `#lugar/<id>` |
| inicio | botón `⇢` de la barra | como-llegar (conserva la selección previa) | `pushState` `#como-llegar` |
| buscando:destino (desde inicio) | elegir un resultado | ficha | `pushState` (Atrás vuelve a la lista con el texto, para corregir una elección equivocada) |
| ficha | "Cómo llegar" | como-llegar con `destino = lugarId` | `pushState` |
| como-llegar | tocar el campo de origen o de destino | buscando:origen / buscando:destino | `pushState` `#buscar-origen` / `#buscar` |
| buscando (desde como-llegar) | elegir un resultado | como-llegar con la selección actualizada | `history.back()` |
| como-llegar | `⇅` | como-llegar (intercambia) | sin cambio |
| como-llegar:eligiendo | queda `origen` y `destino` válidos | como-llegar:ruta (pide la ruta) | **sin entrada nueva** |
| cualquiera | `(?)` | ayuda | `pushState` `#ayuda` |
| cualquiera menos inicio | `←` de la interfaz, Atrás del navegador o de Android, `Esc` en escritorio | vista anterior | `history.back()` → `popstate` |
| ficha, como-llegar | `✕` | inicio | `history.go(-profundidad)` |

Reglas:

- **Un solo camino para volver:** los botones `←` de la interfaz llaman a `history.back()`, y el reductor solo cambia de vista en el evento `popstate`. Así el botón de la interfaz, el de Android y el gesto de deslizar de iOS se comportan igual. `history.state` guarda `{ vista, profundidad }`.
- **"Ruta" no tiene entrada propia en el historial.** Si la tuviera, al volver a "Cómo llegar" con los dos datos válidos se pediría la ruta de nuevo y se volvería a avanzar, sin salida. Como en Google Maps, el panel y el resultado son la misma pantalla: Atrás desde la ruta vuelve a la ficha o al inicio.
- **Atrás no deshace la selección.** El historial guarda solo la vista. Volver de la ficha al inicio no borra el origen confirmado, que sirve para la próxima consulta.
- **Cambiar la altura de la hoja no crea entradas** en el historial.
- **Carga en frío con un hash** (por ejemplo, un enlace a `#lugar/puerta-humanidades-121`): se hace `replaceState` con `inicio` y después `pushState` con la vista pedida si es válida, para que Atrás vuelva al inicio en lugar de salir de la app. Un hash desconocido o un `#como-llegar` sin selección cae en inicio. Restaurar la selección al recargar es del cambio 8, que usa este mismo estado serializable.
- Desde inicio, Atrás sale de la app, como en Google Maps.

*Alternativas:* **XState** (buen visualizador, pero es una dependencia y un modelo nuevo para el equipo cuando la máquina tiene cinco vistas); **Zustand** (no aporta sobre `useReducer` + contexto a este tamaño); **React Router** (modela páginas, y acá el mapa nunca se desmonta y las "rutas" son capas; además el pedido automático de ruta pelearía con la navegación).

### D6. Búsqueda

Lógica pura en `src/busqueda/` (sin React, con tests en entorno `node`). La interfaz está en `src/ui/busqueda/`.

**Normalización** (`normalizar(texto)`), igual para la consulta y para el índice:

1. `toLowerCase('es')`.
2. `normalize('NFD')` y quitar marcas diacríticas (`\p{M}`): "Física" → "fisica", "Martí" → "marti", "ñ" → "n".
3. Reemplazar la puntuación (`. , - _ / ( )`) por espacios: "Lab. de Física" → "lab de fisica".
4. Colapsar espacios y recortar.
5. En la consulta, la palabra "aula" se descarta si viene seguida de un número ("aula 121" → "121").

**Índice:** se arma una vez al cargar el catálogo. Por cada lugar guarda el nombre normalizado, sus palabras, el número de aula (si el nombre es solo un número), los alias normalizados y el edificio normalizado. Con unos 300 lugares, buscar en cada tecla tarda menos de 1 ms: no hace falta *debounce*, solo `useDeferredValue` para no trabar el tipeo.

**Coincidencia:** cada palabra de la consulta tiene que ser **prefijo** de alguna palabra del nombre, de un alias, del edificio o del número ("lab fis" encuentra "Lab. de Física"). Se aceptan además subcadenas del nombre de 3 caracteres o más.

**Orden por niveles** (gana el mejor nivel que cumpla el lugar):

1. Número de aula igual a la consulta ("121" → Aula 121).
2. El nombre empieza con la consulta completa.
3. Todas las palabras son prefijo de palabras del nombre.
4. Coincidencia por alias.
5. Coincidencia por edificio (devuelve los lugares de ese edificio).
6. Subcadena del nombre.

A igual nivel, se ordena por nombre con `Intl.Collator('es', { numeric: true, sensitivity: 'base' })`, así "Aula 2" va antes que "Aula 10". Los lugares "Sin acceso ahora" **no** se esconden ni se mandan al final: aparecen en su lugar con el estado visible. Máximo 50 resultados.

**Filas:** ícono de categoría, nombre con la parte coincidente en negrita, segunda línea "Edificio · Categoría" y, a la derecha, "Sin acceso ahora" si corresponde. El estado lo da una función `estadoAcceso(lugarId)` que inyecta el cambio 4. Hasta que exista, todos los lugares figuran como accesibles.

**Recientes:** clave `dq:recientes:v1` en `localStorage`, lista de `{ id, cuando }` con un máximo de 8, del más nuevo al más viejo y sin repetidos. Se guarda un reciente cuando se abre la ficha de un lugar o cuando se elige un destino en "Cómo llegar"; elegir un origen no guarda reciente. Al leer, se descartan los ids que ya no están en el catálogo.

**Chips de referencias en el inicio:** Biblioteca, Buffet, Salón de las Américas, Teatro, Gimnasio, Sector Administrativo y "Entradas". Los primeros abren la ficha del lugar. "Entradas" abre la búsqueda con las cinco entradas al campus. Los toma del catálogo (lugares marcados como referencia).

**Almacenamiento:** todo acceso a `localStorage` pasa por `src/ui/estado/almacen.ts`, con `try/catch` y respaldo en memoria. En modo privado o con el almacenamiento bloqueado la app funciona igual, solo que sin recientes guardados entre sesiones.

### D7. Ficha del lugar

Muestra el nombre visible, el edificio, la categoría y el piso, tal cual vienen del catálogo, y el botón "Cómo llegar". Si el lugar no tiene acceso, muestra "Sin acceso ahora" con un texto breve. Igual deja tocar "Cómo llegar", porque el motivo detallado y "Sin ruta disponible" los muestra el cambio 4. En la altura media y la expandida agrega la cantidad de puertas y, para lugares de otro piso, el texto de piso que carga el catálogo. El nombre de la tarjeta superior, el título de la ficha, la fila del resultado y el campo del panel usan **el mismo texto** del catálogo (hallazgo 12): no hay abreviaturas propias de la interfaz.

### D8. Panel "Cómo llegar" y selección

- **Origen y destino apilados**, con el círculo `◉` y el pin `▼` unidos por una línea punteada vertical, y el botón `⇅` a la derecha. Cada campo es un botón: tocarlo abre la búsqueda para ese campo.
- **Sin GPS:** el campo de origen vacío dice "Elegí desde dónde salís" y, debajo, una ayuda breve: "No usamos tu ubicación. Elegí una entrada, la Biblioteca o el aula de la que salís."
- **Sugerencia del último origen** (hallazgo 1): si hay `sugerenciaOrigen` y todavía no hay origen, la hoja muestra "¿Salís de <lugar>?" con el botón "Usar este origen". Tocarlo es la confirmación. Mientras no se confirme, **no se pide ninguna ruta**. El último origen se guarda (`dq:ultimo-origen:v1`) cada vez que se pide una ruta.
- **Referencias reconocibles** (hallazgo 2): debajo de la sugerencia y al principio de la búsqueda de origen, las entradas al campus y las referencias del catálogo.
- **Pedido automático:** cuando la fase pasa a `'ruta'`, se llama una sola vez a `solicitarRuta(origen, destino)`, el punto de integración que conectan los cambios 3, 5 y 7. Si cambia el origen o el destino, se vuelve a pedir. Si queda incompleto, se cancela lo pendiente y la hoja vuelve a la fase "eligiendo". En este cambio, `solicitarRuta` es un *stub* que el cambio 7 reemplaza.
- **Intercambiar:** cambia origen por destino. El nuevo origen queda confirmado, porque el usuario lo eligió antes como lugar. Si un lado estaba vacío, el vacío pasa al otro lado y no se pide ruta.
- **Cambiar el origen conserva el destino** (hallazgo 11) y viceversa. Si se borra el destino (`✕` del campo), el panel queda con el destino vacío, la hoja vuelve a la sugerencia y las referencias, y no se pide nada. Atrás desde ahí vuelve al inicio sin ruta.
- **Origen igual al destino:** no se pide ruta. La hoja muestra "Ya estás en <lugar>. Elegí otro destino o cambiá el punto de partida."

### D9. Ayuda contextual

- **Indicación de primer uso** (hallazgo 10): mientras no haya recientes y no se haya cerrado, la hoja del inicio abre en altura media con una tarjeta: "Buscá el aula o el lugar al que tenés que ir. Podés escribir el número (por ejemplo, 121) o el nombre (Biblioteca). Después elegí desde dónde salís." Tiene el botón "Entendido". Cerrarla guarda `dq:primer-uso-cerrado:v1`.
- **Ayuda breve junto a los controles** (hallazgo 6): el campo de búsqueda vacío muestra "Por ejemplo: 121, Biblioteca, Lab. de Física"; el origen vacío muestra la ayuda de D8; "Sin acceso ahora" tiene un botón `(i)` que explica "Por ahora no se puede entrar: sus accesos están cerrados". Son textos de una línea. No hay *tours* ni tutoriales (brief v4, propuesta 6).
- **Volver a abrir:** el botón `(?)` está siempre visible en inicio, ficha y "Cómo llegar". Abre una hoja de ayuda con tres pasos (buscá el destino → elegí desde dónde salís → seguí la línea azul), una leyenda de símbolos (círculo de origen, pin de destino, línea de la ruta y, cuando existan, los símbolos de tramo al aire libre y tramo cerrado de los cambios 4 y 7), la aclaración de que no se usa la ubicación y el crédito del plano. Se cierra con `✕` o con Atrás.

### D10. Accesibilidad

- `lang="es-AR"`. Puntos de referencia: `<main>`, el mapa con `role="region"` y `aria-label="Mapa del campus"`, y la barra con `role="search"`.
- **Barra del inicio:** es un botón con nombre accesible "Buscar un lugar".
- **Búsqueda:** `role="dialog"`, `aria-modal="true"` y `aria-label="Buscar lugar"` (o "Elegir punto de partida"). El campo usa el patrón *combobox* (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`); la lista usa `role="listbox"` y cada fila `role="option"`, con el edificio y el estado en `aria-describedby`. Una región `aria-live="polite"` anuncia "12 resultados" o "No hay resultados para «…»" medio segundo después de dejar de tipear. Las flechas recorren, `Enter` elige y `Esc` cierra. Al cerrar, el foco vuelve al control que abrió la búsqueda.
- **Hoja inferior:** no es modal (el mapa sigue usable). Es un `<section>` con `aria-labelledby` apuntando al título de su contenido. La manija es un `<button>` con `aria-label="Cambiar altura del panel"` y `aria-valuetext` para la altura actual ("Panel a media altura"). `Enter` o `Espacio` pasan a la altura siguiente, y las flechas arriba y abajo suben o bajan una altura. Lo que queda oculto en la altura colapsada se marca `inert` para que el foco no caiga en contenido invisible.
- **Ficha:** al abrir, el foco va al título (`h2` con `tabindex="-1"`), así el lector de pantalla lee el nombre del lugar.
- **Panel:** los campos se anuncian "Punto de partida: Biblioteca. Cambiar" y "Destino: Aula 121. Cambiar". `⇅` se llama "Intercambiar punto de partida y destino" y, al usarlo, se anuncia el resultado.
- **Mapa:** los marcadores son decorativos (`aria-hidden`). Toda la información del mapa está también como texto en la hoja: con lector de pantalla se puede completar la tarea sin ver el mapa.
- `prefers-reduced-motion` desactiva las animaciones de la hoja y del mapa. Las unidades en `rem` soportan texto al 200 %. El foco se ve siempre (anillo de 2 px en `--color-primario` con separación).

### D11. Pruebas

- **Unitarias (Vitest, entorno `node`):**
  - `normalizar`, con una tabla de casos: tildes, mayúsculas, puntuación, "aula 121", ñ.
  - `buscar`, con un catálogo de prueba: "121" → Aula 121 primero; "12" → aulas 120 a 129 en orden numérico; "MICROSCOPÍA" ↔ "microscopia"; "lab fis"; alias; edificio; "zzz" → vacío; los lugares sin acceso conservan su lugar en el orden.
  - Recientes: máximo, sin repetidos, ids desconocidos y almacenamiento que lanza excepción.
  - Reductor de pantalla: cada fila de la tabla de D5; eventos inválidos ignorados; fase derivada; intercambiar; origen igual al destino.
  - `elegirAnclaje`: posición y velocidad → altura.
- **Componentes (Testing Library + `user-event`, entorno `jsdom`)**, por rol y texto en español:
  - Búsqueda: atributos ARIA del *combobox*, filtrado al tipear, `Enter` y `Esc`, foco al cerrar.
  - Hoja: teclado sobre la manija, `inert` en la altura colapsada.
  - Panel: la sugerencia no pide ruta hasta confirmarla, `⇅`, sin destino no hay pedido, mensaje de origen igual al destino, `solicitarRuta` llamado una sola vez.
  - Ayuda: aparece sin recientes, se cierra y se vuelve a abrir.
  - Sincronización con `history`: `pushState`, `popstate` y `go`.
  - Leaflet se reemplaza por un doble en jsdom; el mapa real se prueba en e2e.
- **E2E (Playwright, proyecto `movil` 390 × 844 con `hasTouch` e `isMobile`):**
  - Recorridos: inicio → buscar "121" → ficha → "Cómo llegar" → confirmar sugerencia o elegir referencia → se pide la ruta; y Atrás (`page.goBack()`) en cada capa.
  - Toques con `locator.tap()`.
  - Gestos (pellizco, arrastre del mapa y de la hoja) con eventos táctiles de CDP (`Input.dispatchTouchEvent`), por eso corren en Chromium; el proyecto WebKit corre los recorridos sin gestos.
  - `@axe-core/playwright` en cada vista, sin violaciones serias ni críticas.
  - Capturas de referencia (`toHaveScreenshot`) de las cuatro vistas.
- **Calidad:** Lighthouse móvil en CI con accesibilidad ≥ 95 y "Time to Interactive" < 3 s.

### D12. Contratos con otros cambios

| Cambio | Qué provee o consume | Forma |
|---|---|---|
| `preparar-datos-campus` | Catálogo de lugares y referencias; teselas | Lista tipada de lugares; `/data/teselas/<version>/{z}/{x}/{y}.webp` (D4) |
| `aplicar-cierres-temporales` | Estado de acceso por lugar; capa de cierres | `estadoAcceso(lugarId)`; pane `cierres` |
| `calcular-ruta-astar` / `mostrar-ruta-e-indicaciones` | Pedido de ruta; contenido de la hoja en fase "ruta"; encuadre de la ruta para recentrar | `solicitarRuta(origen, destino)`; espacio `ContenidoRuta`; pane `ruta` |
| `adaptar-ruta-al-clima` | Aviso de clima | Espacio en la hoja de "Cómo llegar" sobre el resultado |
| `tolerar-senal-irregular` | Restaurar vista y selección al recargar | `Vista` y `Seleccion` serializables a JSON |

### Correcciones del brief v4 cubiertas por este cambio

| Hallazgo | Corrección | Requisito |
|---|---|---|
| 1 — Origen precargado | El último origen es una sugerencia que hay que confirmar | `seleccion-de-recorrido`: "Último origen como sugerencia a confirmar" |
| 2 — Reconocer el punto de partida | Referencias reconocibles al elegir el origen (el punto libre en el mapa queda postergado) | `seleccion-de-recorrido`: "Referencias reconocibles para el origen" |
| 6 — Ayuda insuficiente | Ayuda breve junto a los controles y botón para reabrirla | `ayuda-contextual`: "Ayuda breve junto a los controles", "Volver a abrir la ayuda", "Leyenda de símbolos del mapa" |
| 9 — Destino sin acceso con "-" | "Sin acceso ahora" en la lista (lo determina `cierres-temporales`) | `busqueda-de-lugares`: "Estado Sin acceso ahora en los resultados" |
| 10 — Primer uso | Indicación inicial mientras no haya recientes | `ayuda-contextual`: "Indicación de primer uso" |
| 11 — Cambio de origen | Conservar el destino; sin destino no se calcula | `seleccion-de-recorrido`: "Cambiar el origen conserva el destino", "Sin destino no se pide la ruta" |
| 12 — Nombres inconsistentes | El mismo nombre en todas las partes de la interfaz (la fuente es `catalogo-lugares`) | `busqueda-de-lugares`: "Mismo nombre en toda la interfaz" |

## Risks / Trade-offs

- [Riesgo] El arrastre de la hoja, el scroll de su lista y el arrastre del mapa compiten por el mismo dedo → Mitigación: la hoja captura el puntero (`setPointerCapture`) solo desde la manija, la cabecera o la lista con scroll en cero; `touch-action` explícito en cada zona; pruebas e2e de gestos en Chromium y prueba manual en un iPhone y un Android reales.
- [Riesgo] Safari en iOS: `100vh` con la barra de direcciones, zoom al enfocar campos de menos de 16 px, el teclado tapando la lista → Mitigación: `dvh` con respaldo, campos de 16 px, `visualViewport` para ajustar la búsqueda y prueba en un iPhone antes de la prueba con usuarios.
- [Riesgo] Quien conoce Google Maps espera "Tu ubicación" como origen → Mitigación: el campo dice "Elegí desde dónde salís" con la ayuda "No usamos tu ubicación", y la sugerencia del último origen aparece a un toque (brief v1 y hallazgo 1).
- [Riesgo] El brief pide ver los dos campos al abrir y el patrón elegido muestra solo la barra → Mitigación: botón `⇢` en la barra, panel apenas se elige destino y observación específica en la prueba del TP5 (D1).
- [Riesgo] Un parecido visual muy fuerte se confunde con un producto de Google → Mitigación: sin logos, sin nombre ni íconos de marca, nombre propio de la app en el título y en la ayuda.
- [Riesgo] Inconsistencias entre el historial y el estado si el usuario recarga en medio de una capa → Mitigación: carga en frío con `replaceState` + `pushState` y caída segura al inicio (D5); el cambio 8 completa la restauración.
- [Riesgo] Leaflet no corre bien en jsdom → Mitigación: doble del mapa en tests de componentes; el mapa real se prueba solo en e2e.
- [Riesgo] Teselas pesadas con señal irregular → Mitigación: WebP, carga solo de lo visible, fondo `#F8F8F8` mientras cargan y respaldo a imagen única; el precacheo es del cambio 8.
- [Riesgo] `localStorage` bloqueado o lleno → Mitigación: acceso centralizado con `try/catch` y respaldo en memoria (D6).
- [Riesgo] El azul `#1A73E8` está justo en 4,5:1 → Mitigación: texto azul solo en 16 px o más; para estados presionados y bordes, `#174EA6`.

## Migration Plan

No hay interfaz previa ni datos de usuarios: se despliega con el resto de la app. Las claves de `localStorage` llevan versión (`:v1`) para poder cambiar su formato más adelante descartando lo viejo. Si algo falla en producción, se vuelve al deploy anterior desde el hosting.

## Open Questions

- **Comedor:** el brief v4 lo nombra como referencia para el origen, pero todavía no tiene nodo en el grafo. Hasta que lo tenga no aparece entre los chips ni entre las referencias.
- **Errores de tipeo:** ¿hace falta tolerancia difusa (por ejemplo, una letra de diferencia)? Se decide después de la prueba del TP5 según los "sin resultados" observados.
- **Tiempo en la lista de resultados:** el wireframe P2 mostraba minutos por destino. Requiere un origen confirmado y calcular una ruta por resultado. Diferible.
- **Orígenes recientes:** ¿guardar más de un origen? Por ahora solo el último, como pide el hallazgo 1.
- **Modo oscuro:** los tokens lo permiten. Queda para después del MVP.
