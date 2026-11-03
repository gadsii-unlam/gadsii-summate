## Context

Los datos del campus salen de Figma (archivo copia `HjAApNyFMe6qOjAZVcLp1f`, ver `CLAUDE.md`) y hoy están en tres archivos en la raíz del proyecto:

| Archivo | Contenido | Problema para la app |
|---|---|---|
| `grafo.json` (322 KB) | 685 nodos (283 puertas, 373 pasillos, 29 entradas) en 12 departamentos; 722 aristas con `peso` en px; `adyacencia`. Conexo y sin diagonales. | No marca tramos exteriores ni da metros. Los lugares no existen como tales: hay que deducirlos de los ids de puerta. |
| `mapa-unlam.svg` (1,6 MB) | Plano completo, `viewBox` 1588 × 3005, 3737 paths, 536 círculos, sin `<text>` (las etiquetas son paths). | Incluye los puntos (`#9ADCFF`, `#C79AFF`) y 721 aristas (`stroke="#2563EB"`). Demasiado pesado para manipular como SVG en un celular. |
| `mapa-unlam.png` | Render 4x (6350 × 12019) del SVG anterior. | También tiene los puntos y las aristas dibujados. |

Datos concretos que condicionan el diseño (sacados de `grafo.json`):

- **Red exterior:** los 74 nodos de `depto: "central"` (69 `pasillo-central-NN` y 5 `entrada-central-*`, los puntos violetas). Con la regla de la decisión 3 del plan, **113 aristas son exteriores** (9516,7 px) y **609 interiores** (11 326,5 px), sobre 20 843,2 px en total.
- **Lugares:** las 283 puertas forman **272 lugares**; **8 tienen varias puertas** (Gimnasio, Labs. de Idiomas y Sector Administrativo de Artes y Medios con 3; Sector Administrativo, Dto. Arqui, Buffet, Dto. de Económicas y Aula 130 de Humanidades con 2). De los 272, **219 son aulas numeradas** y **53 tienen nombre** (laboratorios, baños, oficinas, servicios), que son los que más necesitan curación.
- **Casos raros:** `pasillo-economicas-19` y `-20` están en la misma posición y su arista pesa 0; `puerta-humanidades-130` y `-130-2` también coinciden; `puerta-formacion-continua-230-3` no tiene puerta `-230` ni `-230-2`; varios ids terminan en `-N` sin ser una segunda puerta (`estudio-2`, `estudio-3`, `lab-1`, `lab-2`, `arquitectura-1` a `-9`).
- **Pesos:** el `peso` exportado difiere como máximo 0,05 px de la distancia entre extremos (es un redondeo).

Este cambio arma el pipeline que convierte esas fuentes en los datos que usan `calcular-ruta-astar`, `construir-interfaz-movil` y los demás cambios.

## Goals / Non-Goals

**Goals:**

- Un comando (`npm run datos:build`) que valida el grafo, genera el grafo enriquecido, el catálogo de lugares y el plano en teselas, y emite un reporte de casos a revisar.
- Que un grafo roto **no llegue nunca a producción** (el build falla) y que un caso dudoso **no frene** al equipo (se reporta).
- Nombres legibles para los 277 lugares desde el primer build, aunque nadie haya curado nada, y un lugar claro donde curarlos.
- Un plano limpio y nítido, alineado con el grafo.
- Un procedimiento corto y repetible para cuando el equipo cambia el grafo en Figma.

**Non-Goals:**

- Editar Figma, agregar puntos o resolver los casos "A revisar".
- Multipiso real (nodos de otros pisos unidos por escaleras): queda como trabajo futuro; acá solo se cargan a mano lugares de otros pisos con su acceso de PB.
- El A\*, los cierres, el visor y la caché offline (otros cambios).

## Decisions

### D1. Pipeline en el build, no en el navegador

Un script de Node + TypeScript en `scripts/datos/` lee las fuentes de `datos-fuente/` y escribe en `public/data/`. Se ejecuta con `npm run datos:build` y está enganchado antes de `dev` y `build`. Termina con código de error si alguna validación grave falla, así el CI y el deploy se frenan solos.

```
datos-fuente/                         public/data/   (generado, no se versiona)
├── grafo.json        ─┐              ├── grafo.json         ← grafo enriquecido
├── mapa-base.svg      ├─► datos:build ├── lugares.json       ← catálogo
├── lugares-curados.json               ├── teselas/<version>/{z}/{x}/{y}.webp
└── config.json       ─┘              ├── mapa-base.webp     ← imagen de respaldo
                                      └── plano.json         ← versión del plano, URL de teselas y respaldo
                                      + scripts/salida/reporte-datos.md (no se publica)
```

- `grafo.json` se **mueve** de la raíz a `datos-fuente/` (y se actualiza `CLAUDE.md`).
- `config.json` guarda los parámetros: `metrosPorPx` (0,35), `toleranciaOrtogonalPx` (0,6), niveles de zoom de las teselas.
- Los tipos de los archivos generados viven en `src/datos/` y los importan tanto el script como la app: si cambia el formato, TypeScript avisa en los dos lados.

*Alternativas:*
- *Procesar `grafo.json` en el navegador al cargar:* manda más código y datos al celular, repite el trabajo en cada carga y no frena un grafo roto antes de publicarlo. Descartada.
- *Versionar los archivos generados:* diffs enormes en cada cambio de Figma y riesgo de que queden desactualizados respecto de la fuente. Descartada; el CI los regenera.

### D2. Formato del grafo generado

Igual al original pero sin `adyacencia` (la app la arma al cargar en menos de 1 ms) y con tres campos nuevos por arista: `px`, `m` y `exterior`.

```json
{
  "version": "3f9c2a1",
  "metrosPorPx": 0.35,
  "ancho": 1587.4,
  "alto": 3004.7,
  "nodos": [
    { "id": "entrada-arquitectura-01", "tipo": "entrada", "depto": "arquitectura", "x": 299.0, "y": 2091.0 }
  ],
  "aristas": [
    {
      "id": "arista__entrada-arquitectura-01__pasillo-central-41",
      "a": "entrada-arquitectura-01",
      "b": "pasillo-central-41",
      "px": 22.0,
      "m": 7.7,
      "exterior": true
    }
  ]
}
```

`version` es un hash corto del contenido; sirve para invalidar cachés (lo usa `tolerar-senal-irregular`) y para saber con qué datos se calculó una ruta. Tamaño estimado: ~130 KB sin comprimir, ~20 KB con gzip.

### D3. Clasificación exterior: por nodo violeta

Regla (decisión 3 del plan): **una arista es exterior si al menos uno de sus extremos tiene `depto: "central"`**. Incluye la arista que une cada entrada de edificio con su punto violeta (por ejemplo `entrada-arquitectura-01` ↔ `pasillo-central-41`) y deja como interiores los pasos entre edificios (`entrada-salud-02` ↔ `pasillo-derecho-01`). Resultado actual: 113 exteriores, 609 interiores.

`lugares-curados.json` admite una lista de excepciones (`exteriorForzado: { "<idArista>": true | false }`) para casos como una galería techada, sin tener que tocar Figma.

*Alternativas:*
- *Mirar el color del plano bajo cada arista* (vereda `#F8F8F8` vs. pasillo `#FED57B`): más fino, pero depende del render y falla en las flechas rojas de las entradas. Descartada para el MVP.
- *Etiquetar cada arista a mano en Figma:* 722 aristas, trabajo manual y propenso a olvidos. Descartada.

### D4. Longitud en px recalculada y metros

`px` se recalcula como `|xa − xb| + |ya − yb|` (como todas las aristas son ortogonales, es su longitud real) en lugar de copiar el `peso` exportado. Así se garantiza que la heurística Manhattan del A\* nunca supere el costo real de un tramo, aunque el `peso` exportado esté redondeado. Si `peso` difiere en más de 0,1 px, se reporta (hoy la diferencia máxima es 0,05).

`m = round(px × metrosPorPx, 1)`. El factor es único para todo el plano y se guarda en el grafo generado, así la app y los datos usan siempre el mismo. Valor inicial 0,35 m/px (a calibrar, ver Open Questions).

### D5. Validaciones

| Chequeo | Severidad | Resultado con el grafo actual |
|---|---|---|
| Ids de nodo y de arista únicos | Error | OK |
| Extremos de cada arista existen; sin aristas de un nodo a sí mismo; sin aristas repetidas | Error | OK |
| Grafo conexo | Error | OK |
| Ningún nodo sin aristas | Error | OK |
| Aristas ortogonales (desvío ≤ 0,6 px en x o en y) | Error | OK, 0 diagonales |
| Puertas y accesos de cada lugar existen como nodos | Error | OK |
| Plano base sin puntos ni aristas (D8) | Error | — (falta reexportar) |
| Alineación plano ↔ grafo (D8) | Error | — |
| Nodos distintos en la misma posición | Aviso | 2 pares: `puerta-humanidades-130`/`130-2`, `pasillo-economicas-19`/`20` |
| Aristas de longitud 0 | Aviso | 1: `pasillo-economicas-19`↔`20` |
| `peso` exportado ≠ longitud geométrica (> 0,1 px) | Aviso | 0 |
| Id de arista distinto de `arista__<a>__<b>` | Aviso | 0 |
| Puerta con más de una arista | Aviso | 0 (todas tienen exactamente 1) |
| Puerta con sufijo `-N` sin puerta base | Aviso | `puerta-formacion-continua-230-3` |
| Lugares pendientes anotados a mano (lista "A revisar" del `CLAUDE.md`) | Aviso | 218, 219 y Aula Magna (Centro de Estudiantes), 340 (Económicas), Call Center (Salud), sala bajo el 408 (Derecho), Estudio 1 y salas rosas (Artes y Medios), baños de Arquitectura |
| Número de aula que falta entre dos existentes | Aviso | 10, 205, 250, 264, 307, 340 |
| Curación de un lugar que no existe | Aviso | — |
| Mismo nombre visible en el mismo edificio | Aviso | — |
| Lugar de otro piso sin indicación verificada | Aviso | — |
| Lugares con nombre derivado (sin curar) | Informativo | 277 al empezar |

El reporte se imprime resumido en consola y completo en `scripts/salida/reporte-datos.md` (ignorado por git, subido como artefacto del CI). Los errores listan **todos** los problemas encontrados, no solo el primero, para corregirlos de una vez.

### D6. Catálogo de lugares

**Agrupación de puertas.** Para cada puerta `puerta-<depto>-<resto>`:
1. Si `<resto>` termina en `-N` (N de 2 a 9) y existe la puerta sin ese sufijo, o si lo que queda es un número, se saca el sufijo y se repite. Así `gimnasio-3` → `gimnasio`, `sector-administrativo-2-2` → `sector-administrativo-2` → `sector-administrativo`, y `230-3` → `230`.
2. Si no, el sufijo es parte del nombre: `estudio-2`, `lab-1`, `arquitectura-1`.
3. `lugares-curados.json` puede fijar a mano las puertas de un lugar (pisa la regla).

El id del lugar es el id de la puerta base sin `puerta-` (`servicios-gimnasio`, `humanidades-121`). Las 5 entradas al campus se agregan como lugares de categoría `entrada` con su propio nodo como puerta.

**Nombre derivado** (cuando no hay nombre curado), a partir de `<resto>`:
- Número → `Aula <número>` (`121` → "Aula 121").
- Si no, se parte por `-` y cada palabra pasa por un diccionario que repone tildes y abreviaturas; los conectores (`de`, `del`, `la`, `las`, `y`) van en minúscula, la primera palabra en mayúscula, las letras sueltas en mayúscula y las siglas conocidas enteras en mayúscula.

| Palabra en el id | Se muestra | Palabra en el id | Se muestra |
|---|---|---|---|
| `lab` / `labs` | Lab. / Labs. | `banos` | Baños |
| `dto` / `dir` | Dto. / Dir. | `microscopia` | Microscopía |
| `cs` | Cs. | `kinesiologia` | Kinesiología |
| `cau` | CAU | `americas` | Américas |
| `salon` | Salón | `politica`, `pedagogia` | Política, Pedagogía |
| `marti` | Martí | `electronica`, `fisica` | Electrónica, Física |
| `economicas`, `clinicas` | Económicas, Clínicas | `formacion`, `extension` | Formación, Extensión |
| `enfermeria`, `odontologia` | Enfermería, Odontología | `tecnologico` | Tecnológico |

Ejemplos: `lab-de-microscopia` → "Lab. de Microscopía"; `dto-de-humanidades-y-cs-sociales` → "Dto. de Humanidades y Cs. Sociales"; `salon-de-las-americas` → "Salón de las Américas"; `labs-a-y-b` → "Labs. A y B"; `banos-hombres` → "Baños Hombres" (correcto pero mejorable: se cura a "Baños de hombres"). Un test recorre los 53 nombres no numéricos y compara contra una lista revisada por el equipo.

**Edificio.** `lugares-curados.json` define el nombre visible de cada departamento (`edificios: { "economicas": "Ciencias Económicas", ... }`), que tiene que coincidir con lo que dice el plano (brief v4, hallazgo 12). Para `servicios` el edificio es el nombre del propio lugar (Biblioteca, Teatro, Gimnasio). Si un departamento no tiene nombre curado, se usa el id con mayúscula inicial y se reporta.

**Categoría** por reglas sobre `<resto>`, corregible a mano:

| Categoría | Regla | Cantidad hoy |
|---|---|---|
| `aula` | número | 219 |
| `laboratorio` | empieza con `lab-`, `labs-`, `estudio-` | 13 |
| `bano` | empieza con `banos` | 8 |
| `servicio` | biblioteca, buffet, enfermería, centro de copiado, gimnasio, radio, polo tecnológico, banco | 8 |
| `auditorio` | auditorio Martí y Nicoletti, Salón de las Américas, Teatro | 4 |
| `oficina` | el resto (direcciones, departamentos, gremios, rectorado, graduados, CAU…) | 20 |
| `entrada` | entradas al campus | 5 |

**Alias:** el número para las aulas numeradas, más los cargados a mano (por ejemplo "Dirección de Alumnos"). La búsqueda tolerante a tildes y mayúsculas es de `busqueda-de-lugares`; acá solo se proveen los alias.

**Referencias reconocibles** (brief v4, hallazgos 1 y 2), 11 al empezar: las 5 entradas al campus, `servicios-biblioteca`, `centro-estudiantes-buffet`, `servicios-salon-de-las-americas`, `servicios-teatro`, `servicios-gimnasio` y `administracion-sector-administrativo`. La lista vive en `lugares-curados.json` y se puede editar.

**Piso e indicación.** Todos los lugares derivados son de planta baja (`"PB"`). Los de otros pisos (Humanidades 1er piso, Odontología pisos 1 a 3) se cargan a mano en `otrosPisos` con su piso, los nodos de PB por los que se llega (puerta de la escalera o del edificio) y un texto de indicación. Solo entran al catálogo si tienen `verificado: true` (brief v4, hallazgo 3: "con datos verificados"); si no, se reportan.

**Caja:** cada lugar lleva el rectángulo que contiene todas sus puertas, para que la interfaz pueda encuadrarlo (en un lugar de una sola puerta, la caja es un punto).

Ejemplo de un lugar en `public/data/lugares.json`:

```json
{
  "id": "servicios-gimnasio",
  "nombre": "Gimnasio",
  "edificio": "Gimnasio",
  "depto": "servicios",
  "categoria": "servicio",
  "puertas": ["puerta-servicios-gimnasio", "puerta-servicios-gimnasio-2", "puerta-servicios-gimnasio-3"],
  "caja": { "x1": 649.5, "y1": 2268.5, "x2": 1055.5, "y2": 2349.0 },
  "alias": [],
  "piso": "PB",
  "referencia": true,
  "indicacion": null,
  "nombreCurado": false
}
```

Ejemplo de entrada en `datos-fuente/lugares-curados.json`:

```json
{
  "edificios": { "humanidades": "Humanidades", "economicas": "Ciencias Económicas" },
  "lugares": {
    "humanidades-banos-mujeres": { "nombre": "Baños de mujeres" },
    "economicas-dir-de-alumnos": { "nombre": "Dirección de Alumnos", "alias": ["Dir. de Alumnos", "alumnos"] }
  },
  "referencias": ["entrada-central-principal", "servicios-biblioteca", "centro-estudiantes-buffet"],
  "otrosPisos": [
    {
      "id": "humanidades-201",
      "nombre": "Aula 201",
      "edificio": "Humanidades",
      "piso": "1",
      "accesos": ["puerta-humanidades-…"],
      "indicacion": "(a completar y verificar en el campus)",
      "verificado": false
    }
  ],
  "pendientes": [{ "depto": "economicas", "lugar": "340", "nota": "Sin punto de puerta en Figma" }],
  "exteriorForzado": {}
}
```

Un JSON Schema acompaña al archivo para tener autocompletado y validación en el editor.

*Alternativas:* YAML para el archivo curado (admite comentarios, pero suma un parser y es fácil romper la indentación); guardar los nombres en Figma (los nombres de capa no admiten bien tildes ni alias y obligaría a reexportar para cada corrección de texto). Descartadas.

### D7. Nombres unificados

El catálogo es la **única fuente** de nombres de lugares y edificios: ningún componente arma un nombre por su cuenta a partir de un id. Las etiquetas del plano vienen dibujadas desde Figma, así que la curación de nombres se revisa contra el plano (tarea de revisión manual por departamento).

### D8. Plano base y teselas

> **Actualización (24/10/2026): el plano pasó a ser un único SVG.** Con teselas raster se notaba cómo se cargaban de a pedazos al mover el mapa y, en pantallas 2× y 3×, el plano se veía pixelado. Ahora `npm run datos:build` publica `public/data/mapa-base.svg` (el plano base con las 126 máscaras de Figma pasadas a `clipPath`, que dibujan igual píxel a píxel y mucho más rápido) y la app lo muestra con un `ImageOverlay` de Leaflet: el navegador lo vuelve a dibujar al terminar cada zoom, así que se ve nítido en cualquier nivel. Ya no se generan teselas, no hay caché `teselas-detalle` ni precarga de la zona de la ruta: el SVG (≈ 1,5 MB, ≈ 450 KB comprimido) entra en el precache al instalar, así que sin conexión se ve el plano entero en cualquier zoom. La imagen de respaldo (`mapa-base.webp`) queda para cuando el SVG no se puede mostrar. Probado en Chromium y WebKit con pantalla 3×: arrastre a 60 cuadros por segundo con el zoom máximo. Lo de abajo describe la decisión original.


**Fuente limpia.** Se reexporta el frame `mapa-unlam` desde Figma con los grupos `PUNTOS` y `ARISTAS` ocultos y se guarda como `datos-fuente/mapa-base.svg` (preferido: no hay heurística). Si no se puede reexportar, un script filtra `mapa-unlam.svg`: saca los elementos con relleno `#9ADCFF` o `#C79AFF` cuya caja mide entre 3 y 7 px, y los paths con `stroke="#2563EB"`. El tamaño importa porque `#9ADCFF` también rellena formas grandes que son parte del plano (por ejemplo un rectángulo de 120 × 166).

**Chequeos (errores):**
- *Plano limpio:* el SVG base no tiene ningún elemento que cumpla el criterio de punto o de arista.
- *Alineación:* se renderiza `mapa-unlam.svg` (con puntos) a 4x y, para cada nodo, se mira el color en su posición × 4 con ±2 px de margen: tiene que ser celeste o violeta. Hace falta el render porque 108 círculos traen `transform="rotate(...)"` y unos 136 puntos son paths, así que comparar coordenadas del SVG no alcanza (hoy coinciden directo 428 de 685).

**Sistema de coordenadas.** 1 unidad del SVG = 1 px de `grafo.json`, origen arriba a la izquierda. Figma redondea el tamaño exportado (1588 × 3005 contra 1587,4 × 3004,7) pero el origen y la escala son los mismos. Para Leaflet con `CRS.Simple` (decisión del cambio `construir-interfaz-movil`) un punto `(x, y)` se ubica en `[-y, x]` y los límites son `[[-3004.7, 0], [0, 1587.4]]`; con esa convención, el zoom `z` equivale a escala `2^z` y las teselas se cortan desde el origen.

**Teselas.** Se rasteriza el SVG base con resvg (render fiel de SVG en Node, sin navegador) y se corta con sharp en teselas de 256 px:

| Zoom | Escala | Imagen | Teselas |
|---|---|---|---|
| −2 | 0,25 | 397 × 752 | 2 × 3 = 6 |
| −1 | 0,5 | 794 × 1503 | 4 × 6 = 24 |
| 0 | 1 | 1588 × 3005 | 7 × 12 = 84 |
| 1 | 2 | 3175 × 6010 | 13 × 24 = 312 |
| 2 | 4 | 6350 × 12019 | 25 × 47 = 1175 |

Total 1601 teselas. Formato WebP sin pérdida (el plano tiene colores planos y comprime muy bien; Safari lo soporta desde iOS 14). **Contrato de URL** compartido con `construir-interfaz-movil` y `tolerar-senal-irregular`: `/data/teselas/<version>/{z}/{x}/{y}.webp`, donde `<version>` es el hash del plano (un plano nuevo no se mezcla con uno viejo en la caché) y `z` va de 0 a 4 en la URL, que corresponde a los niveles nativos −2 a 2 (el visor usa `zoomOffset: 2` porque la URL no admite niveles negativos); se mide el peso total en la implementación (objetivo: < 15 MB en total y < 5 MB hasta el zoom 1, que es lo que conviene precachear en `tolerar-senal-irregular`). El zoom 2 da 4 píxeles por unidad, suficiente para etiquetas nítidas en un celular 3x.

**Medición (implementación, plano filtrado de `mapa-unlam.svg`):** 1601 teselas, **0,91 MB en total** y **0,45 MB hasta el zoom 1** (z −2: 6 teselas, 38 KB; z −1: 24, 65 KB; z 0: 84, 123 KB; z 1: 312, 235 KB; z 2: 1175, 470 KB). Los niveles −2 a 0 (114 teselas) suman ≈ 0,22 MB. La imagen de respaldo mide 2381 × 4507 y pesa 0,16 MB. Las zonas fuera de los edificios que el frame de Figma no pinta quedan transparentes, igual que el relleno de las teselas del borde (el visor pone debajo el fondo `#F8F8F8`). La app encuentra la `version` del plano y la plantilla de URL en `public/data/plano.json` (tipo `PlanoBase` en `src/datos/tipos.ts`).

**Respaldo:** una única imagen WebP a escala 1,5 (≈ 2381 × 4507, ~10,7 MP, por debajo de los límites de decodificación de Safari en iOS) para cuando las teselas no cargan.

*Alternativas:* SVG directo con pan y zoom propio (1,6 MB y 3737 paths: lento en Safari móvil y sin carga por zonas); una sola imagen grande (o se ve borrosa o pesa demasiado); MapLibre con teselas vectoriales (pensado para geodatos, mucha más complejidad para un plano fijo). Descartadas.

### D9. Regeneración cuando el equipo cambia el grafo en Figma

1. Editar en Figma la copia de trabajo siguiendo las reglas del `CLAUDE.md` (puntos dentro de `PUNTOS`, nombres únicos, aristas ortogonales, crear las aristas nuevas antes de borrar las viejas).
2. Regenerar `datos-fuente/grafo.json` desde Figma tomando las aristas del grupo `ARISTAS` (no a mano: `pasillo-economicas-19` y `-20` pueden intercambiar nombres).
3. Si cambió el dibujo del plano, reexportar `datos-fuente/mapa-base.svg` con `PUNTOS` y `ARISTAS` ocultos (y `mapa-unlam.svg` completo, que se usa para el chequeo de alineación).
4. Correr `npm run datos:build`. Si falla, el mensaje dice qué nodo o arista corregir en Figma.
5. Leer el reporte: lugares nuevos con nombre derivado, curaciones huérfanas (un lugar renombrado en Figma cambia de id), pendientes resueltos.
6. Actualizar `lugares-curados.json` si hace falta, commitear fuentes y curación en el mismo PR; el CI vuelve a validar y el deploy publica los datos nuevos con otra `version`.

Este procedimiento se documenta en el README y en `CLAUDE.md`.

## Risks / Trade-offs

- [Riesgo] `metrosPorPx` mal estimado hace que distancias y tiempos no coincidan con la realidad → Mitigación: es un solo número en `config.json`; se calibra midiendo un pasillo real antes de la prueba con usuarios (Open Questions).
- [Riesgo] Los nombres derivados tienen errores (tildes que faltan, abreviaturas raras) y contradicen el plano (brief v4, hallazgo 12) → Mitigación: diccionario de palabras, test sobre los 53 nombres no numéricos, reporte de lugares sin curar y revisión manual contra el plano por departamento.
- [Riesgo] La regla de sufijos agrupa mal un lugar (por ejemplo si "Sector Administrativo 2" de Artes y Medios es una sala distinta) → Mitigación: el reporte lista todas las agrupaciones de varias puertas para revisarlas; la curación puede fijar las puertas a mano.
- [Riesgo] La regla "exterior si toca un nodo violeta" marca como exterior un tramo techado → Mitigación: lista `exteriorForzado` en la curación.
- [Riesgo] Las teselas pesan más de lo previsto y complican el modo sin conexión → Mitigación: se mide en la implementación; se puede pasar a WebP con pérdida, sacar el zoom 2 del precache o limitar niveles.
- [Riesgo] Se reexporta el plano sin ocultar los puntos → Mitigación: el chequeo de plano limpio frena el build.
- [Riesgo] Un cambio de nombre en Figma cambia el id de un lugar y deja huérfanos los recientes guardados en el navegador → Mitigación: el reporte avisa las curaciones huérfanas; la app ignora ids guardados que ya no existen (lo especifican los cambios de interfaz).
- [Riesgo] Mover `grafo.json` rompe el flujo actual del equipo con Figma → Mitigación: se actualiza `CLAUDE.md` en la misma tarea y el pipeline da un error claro si no encuentra el archivo.

## Migration Plan

1. Crear `datos-fuente/`, mover `grafo.json` y actualizar `CLAUDE.md`.
2. Implementar el pipeline con un plano base filtrado por script, para no bloquearse esperando la reexportación.
3. Reexportar el plano desde Figma con `PUNTOS` y `ARISTAS` ocultos y reemplazar el filtrado.
4. Cargar la primera curación (edificios, referencias, pendientes del `CLAUDE.md`) y revisar nombres contra el plano.

Volver atrás es borrar `public/data/`: la app todavía no depende de estos datos hasta los cambios 3 y 6.

## Open Questions

- **Calibración de `metrosPorPx`.** 0,35 es una estimación: puertas de aulas vecinas quedan a ~25 px (`puerta-humanidades-121` y `-122`, `puerta-derecho-401` y `-402`), lo que da aulas de ~8,8 m de frente. Hay que medir un tramo real (por ejemplo el pasillo de Humanidades entre dos aulas conocidas, con cinta o contando pasos, o el largo de un edificio en una imagen satelital) y ajustar.
- **El comedor no tiene nodo.** El brief v4 (hallazgos 1 y 2) nombra el comedor como referencia, pero en Figma hay un edificio `comedor-canchas` sin punto de puerta. Opciones: agregar la puerta en Figma o, si los estudiantes llaman "comedor" al Buffet del Centro de Estudiantes, sumarlo como alias. Hay que decidirlo con el equipo.
- **Capa "250" / Gremio Docente.** La capa `8:167` de Arquitectura se llama "250" pero en el plano dice "Gremio Docente". En el grafo no hay `puerta-arquitectura-250`, el reporte de huecos marca el 250 y existe `puerta-formacion-continua-gremio-docente`. Falta confirmar si es la misma sala y en qué edificio va.
- **Duplicados.** `puerta-humanidades-130` / `130-2` y `pasillo-economicas-19` / `20` están en la misma posición. No rompen nada (el A\* los recorre igual), pero conviene confirmar si sobra uno de cada par.
- **Agrupaciones dudosas.** Sector Administrativo de Artes y Medios (`-2` y `-2-2`): ¿una sala con 3 puertas o dos salas? `puerta-formacion-continua-230-3`: ¿qué pasó con las puertas 1 y 2 del aula 230?
- **Nombres de edificios.** Qué nombre visible usa cada departamento (por ejemplo `arquitectura` es el edificio de laboratorios): tiene que coincidir con el plano.
