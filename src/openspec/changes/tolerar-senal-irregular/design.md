## Context

- **Arquitectura:** SPA estática en React + Vite + TypeScript, servida por Netlify con HTTPS, sin backend (`configurar-base-app`, D1 y D8). El A\* corre en el navegador (`calcular-ruta-astar`).
- **Lo que se pide por red:**
  - La app (HTML, JS, CSS, íconos).
  - Los datos generados en `public/data/` por `preparar-datos-campus`: grafo, catálogo, nombres de entradas y teselas del plano en los niveles de zoom −2 a 2 de `CRS.Simple` (el spec `mapa-base` pide al menos 4 px de imagen por unidad en el zoom máximo), más una imagen de respaldo.
  - `/data/cierres.json` (`aplicar-cierres-temporales`).
  - `/api/clima/<escenario>.json`, con timeout de 5 s en la app (`adaptar-ruta-al-clima`).
- **El contexto del usuario:** en el campus, la señal se corta por momentos, entre edificios o adentro. Los celulares son Android de gama media y algunos iPhone. En iOS, Safari borra el almacenamiento de los sitios no instalados después de 7 días sin uso.
- **Lo que ya existe en otros cambios:**
  - `construir-interfaz-movil` guarda los recientes y el último origen en `localStorage`.
  - `mostrar-ruta-e-indicaciones` expone la ruta mostrada y el evento "Finalizar viaje".
  - `recomendacion-de-ruta` resuelve qué mostrar cuando el clima falla.

## Goals / Non-Goals

**Goals:**

- Después de una primera visita con red, abrir la app, ver el mapa, elegir lugares y obtener una ruta sin conexión.
- Que un corte o una recarga no borre el origen, el destino ni la ruta en pantalla.
- Que el usuario sepa cuándo está sin conexión y pueda reintentar.
- Que, sin red, nunca se asuma que no llueve, ni que no hay cierres porque no se pudieron leer.
- Que la primera instalación sea liviana (alrededor de 1,5 MB), porque se hace con datos móviles.

**Non-Goals:**

- Funcionar en la primera visita sin red.
- Descargar todo el plano en máxima resolución por adelantado.
- Sincronizar estado entre dispositivos o enviar datos al volver la conexión: la app no envía nada.

## Decisions

### 1. `vite-plugin-pwa` en modo `generateSW` con `registerType: 'prompt'`

El plugin genera con Workbox el service worker, la lista de precache con revisiones por hash y el manifiesto web. `generateSW` alcanza porque todas las estrategias son configurables (`runtimeCaching`). La precarga de teselas de la ruta se hace desde la página con `fetch`, y esas peticiones pasan por el service worker y quedan en su caché, así que no hace falta código propio en el service worker.

`registerType: 'prompt'` hace que la versión nueva espere instalada y que la app decida cuándo activarla (decisión 7). Con `autoUpdate`, la página podría recargarse en medio de un recorrido.

*Alternativas:*
- `injectManifest` con un service worker propio: más control, pero más código para mantener. Queda como salida si hiciera falta lógica en el service worker.
- Workbox a mano, sin el plugin: duplica lo que el plugin ya integra con el build de Vite.
- Sin service worker, con caché HTTP: no permite abrir la app sin red.

### 2. Qué se precachea y tamaño estimado del plano

> **Actualización (24/10/2026): el plano pasó a ser un único SVG.** Con teselas raster se notaba cómo se cargaban de a pedazos al mover el mapa y, en pantallas 2× y 3×, el plano se veía pixelado. Ahora `npm run datos:build` publica `public/data/mapa-base.svg` (el plano base con las 126 máscaras de Figma pasadas a `clipPath`, que dibujan igual píxel a píxel y mucho más rápido) y la app lo muestra con un `ImageOverlay` de Leaflet: el navegador lo vuelve a dibujar al terminar cada zoom, así que se ve nítido en cualquier nivel. Ya no se generan teselas, no hay caché `teselas-detalle` ni precarga de la zona de la ruta: el SVG (≈ 1,5 MB, ≈ 450 KB comprimido) entra en el precache al instalar, así que sin conexión se ve el plano entero en cualquier zoom. La imagen de respaldo (`mapa-base.webp`) queda para cuando el SVG no se puede mostrar. Probado en Chromium y WebKit con pantalla 3×: arrastre a 60 cuadros por segundo con el zoom máximo. Lo de abajo describe la decisión original.


Medimos el plano actual (`mapa-unlam.png`, 6350 × 12019 px, es decir 4× el tamaño de `mapa-unlam`) reescalado a cada nivel, con teselas de 256 px:

| Nivel de zoom | Escala | Imagen (px) | Teselas | WebP sin pérdida | PNG |
|---|---|---|---|---|---|
| −2 | 0,25 | 397 × 752 | 2 × 3 = 6 | ≈ 0,09 MB | ≈ 0,16 MB |
| −1 | 0,5 | 794 × 1503 | 4 × 6 = 24 | ≈ 0,21 MB | ≈ 0,38 MB |
| 0 | 1 | 1588 × 3005 | 7 × 12 = 84 | ≈ 0,44 MB | ≈ 0,88 MB |
| 1 | 2 | 3175 × 6010 | 13 × 24 = 312 | ≈ 0,88 MB | ≈ 2,05 MB |
| 2 | 4 | 6350 × 12019 | 25 × 47 = 1175 | ≈ 0,51 MB | ≈ 1,73 MB |
| **Total** | | | **1601** | **≈ 2,1 MB** | **≈ 5,2 MB** |

Cómo leer la tabla:

- El nivel 2 sale del render nítido de Figma. Los niveles menores salieron de reescalar esa imagen, y el suavizado agrega colores intermedios que comprimen peor. Por eso el nivel 1 pesa más que el 2. Un render directo del SVG en cada nivel debería pesar igual o menos.
- Partir en teselas agrega entre 15 y 30 % de encabezados y bordes. Muchas teselas son fondo uniforme y pesan muy poco.
- El PNG medido incluye los puntos y las aristas. El plano base sin ellos pesa algo menos.
- **Estimación de trabajo:** todo el plano pesa entre 2,5 y 3 MB en WebP y entre 5 y 6 MB en PNG. Las teselas van en WebP (soportado por todos los navegadores objetivo, incluido Safari desde iOS 14).

**Medición del plano real** (versión `8af306a` de `preparar-datos-campus`: render directo del SVG en cada nivel, sin los puntos ni las aristas, WebP sin pérdida):

| Nivel de zoom | Carpeta en la URL | Teselas | WebP sin pérdida |
|---|---|---|---|
| −2 | `0` | 6 | 38,9 KB |
| −1 | `1` | 24 | 66,5 KB |
| 0 | `2` | 84 | 126,3 KB |
| 1 | `3` | 312 | 240,5 KB |
| 2 | `4` | 1175 | 481,7 KB |
| **Total** | | **1601** | **≈ 0,95 MB** |

El render directo pesa bastante menos que lo estimado (≈ 0,95 MB contra 2,5 a 3 MB): el plano base sin puntos ni aristas tiene grandes zonas de color uniforme y no hay colores intermedios de reescalar. Los niveles −2 a 0 suman **≈ 0,23 MB** (no 0,75 MB) y el detalle (niveles 1 y 2) ≈ 0,72 MB. Las cantidades de teselas coinciden con la tabla de arriba.

**Decisión: precache del nivel general y caché a demanda del detalle.**

| Grupo | Contenido | Tamaño aproximado |
|---|---|---|
| App | `index.html`, JS, CSS, íconos, manifiesto | ≈ 0,35 MB comprimido |
| Datos | grafo, catálogo, nombres de entradas (con hash en el nombre) | ≈ 0,1 MB comprimido (el grafo pesa 320 KB sin comprimir) |
| Plano general | teselas de los niveles −2, −1 y 0 (114 archivos) | ≈ 0,75 MB |
| Respaldo | imagen única del plano (`mapa-base`, "Plano de respaldo") | ≈ 0,2 MB (WebP con pérdida al 80 %) |
| **Total de la instalación** | | **≈ 1,4 MB** |

Medido en el build (`scripts/pwa/precache.test.ts` comprueba que queda por debajo de 2 MB): 137 entradas y 1,19 MB sin comprimir en total. La app pesa ≈ 0,48 MB sin comprimir (≈ 0,15 MB con gzip), los datos ≈ 0,27 MB (≈ 0,03 MB con gzip), las teselas −2 a 0 ≈ 0,23 MB, el respaldo 0,16 MB (`mapa-base.webp`, escala 1,5) y los íconos ≈ 0,02 MB. Lo que se descarga al instalar va comprimido por HTTP salvo las imágenes, así que la instalación real ronda los 0,6 MB.

Las teselas de los niveles 1 y 2 (1487 archivos) no se precachean. Se guardan con `CacheFirst` la primera vez que se ven, en la caché `teselas-detalle` con `ExpirationPlugin` (`maxEntries: 1600`, 30 días, `purgeOnQuotaError`).

Hay dos refuerzos para que el detalle esté cuando hace falta:

1. **Precarga de la zona de la ruta:** al mostrar una ruta con conexión, la app calcula las teselas de los niveles 1 y 2 que cubren los límites de la ruta más un margen de 64 unidades. Una ruta típica pide entre 10 y 40 teselas, que se descargan con prioridad baja cuando el navegador está ocioso. No se hace si el usuario activó el ahorro de datos (`navigator.connection.saveData`). Con eso, la zona del recorrido se puede ampliar sin red.
2. **Capa general debajo del detalle:** el visor apila una capa con los niveles −2 a 0 (`maxNativeZoom: 0`), que se amplía sola en los niveles 1 y 2, debajo de la capa de detalle. Si falta una tesela de detalle, se ve el nivel 0 ampliado: borroso pero en el lugar correcto, nunca un hueco gris.

Las URLs de las teselas llevan la versión del plano (`/data/teselas/<hash>/{z}/{x}/{y}.webp`), para que un plano nuevo no se mezcle con uno viejo en la caché.

*Alternativas:*
- **Precachear los 1601 archivos (2,5 a 3 MB):** garantiza cualquier zoom sin red, pero la instalación de Workbox es todo o nada: con señal irregular puede fallar varias veces seguidas, y entonces no queda nada guardado, ni siquiera la app. Además gasta datos de usuarios que quizá nunca hacen zoom máximo.
- **Solo caché a demanda:** la instalación es mínima, pero la primera apertura sin red muestra el mapa vacío en las zonas que no se miraron.
- **Descargar todo el plano en segundo plano después de instalar, con Wi-Fi:** sería ideal, pero la red no se detecta de forma confiable en iOS. Queda en Open Questions.

### 3. Estrategia por recurso

| Recurso | Estrategia | Detalle |
|---|---|---|
| Navegación (cualquier ruta de la SPA) | Precache + `NavigationRoute` a `index.html` | Abre sin red desde cualquier URL de la app, incluido `?clima=…`. |
| JS, CSS, íconos, manifiesto | Precache con revisión | Cambian solo con un deploy. |
| Grafo, catálogo, nombres de entradas | Precache con revisión | Llevan hash en el nombre y se guardan con la app. |
| Teselas −2 a 0 e imagen de respaldo | Precache | Decisión 2. |
| Teselas 1 y 2 | `CacheFirst` en tiempo de ejecución | Decisión 2. |
| `/data/cierres.json` | `NetworkFirst` con `networkTimeoutSeconds: 4`, caché `cierres` | Si la red falla o tarda, la última copia guardada. Si nunca se guardó ninguna, la copia de respaldo embebida en el bundle al hacer el build, con su fecha. |
| `/api/clima/*` | `NetworkOnly` | Nunca se guarda: un "seco" viejo sería mentir. El timeout de 5 s y el error los maneja `clima-simulado`. Sin red, la petición falla enseguida y se llega al error de clima. |

Los cierres no van en la lista de precache: Workbox respondería primero desde el precache y nunca iría a la red. Por eso la copia de respaldo viaja dentro del JS, que sí está precacheado. Son pocos KB.

La app sabe de dónde salieron los cierres usados (red, caché o respaldo) y cuándo se guardaron. Si no vienen de la red, muestra "Cierres sin actualizar desde las HH:MM" junto al aviso de conexión. Usar la última copia conocida es mejor que rutear sin cierres: el equipo los precarga antes de la prueba (brief v3), así que la copia del build está al día ese día.

*Alternativa:* `StaleWhileRevalidate` para los cierres. Es más rápido, pero con red usaría la copia vieja en el primer cálculo, y un cierre recién cargado no se respetaría hasta el siguiente.

### 4. Detección del corte y aviso "Sin conexión"

- **Cuándo se considera sin conexión:** cuando una petición real falla por red (cierres o clima con `TypeError` o timeout), o cuando llega el evento `offline`. `navigator.onLine` solo no alcanza: en el Wi-Fi del campus puede decir "en línea" sin salida a internet.
- **Cómo se ve:** una barra oscura tipo snackbar, arriba de la hoja inferior, con el texto "Sin conexión" y el botón "Reintentar". No tapa la ruta ni el panel "Cómo llegar". Tiene `role="status"`.
- **Qué hace "Reintentar":** vuelve a pedir cierres y clima. Mientras tanto, el botón muestra un indicador y no se puede tocar dos veces. No borra el origen, el destino, la ruta ni el mapa.
  - Si se recupera la conexión y la ruta no cambia, el aviso desaparece.
  - Si cambia (un cierre nuevo o lluvia), se aplica, porque el usuario lo pidió, con el mensaje "Actualizamos la ruta con los datos nuevos".
- **Reconexión automática:** con el evento `online`, la app vuelve a pedir los datos sola. Si la ruta en pantalla cambiaría, **no la reemplaza**: muestra "Hay cambios en tu ruta" con el botón "Ver ruta actualizada". Si el cambio es un tramo cerrado que la ruta actual atraviesa, el aviso lo dice: "Un tramo de tu ruta está cerrado".
- **Sin ruta todavía:** el mapa sigue usable, la búsqueda funciona porque el catálogo está precacheado y, si se elige un recorrido, se calcula localmente (decisión 5).

### 5. Cálculo sin conexión

El pedido de ruta consulta en paralelo los cierres (red con respaldo) y el clima (solo red). Sin conexión:

- Los cierres salen de la caché o del respaldo (decisión 3).
- El clima falla y queda en error. `recomendacion-de-ruta` muestra el aviso y deja elegir el criterio. Nunca se asume `seco`.
- El A\* corre igual: el grafo está en memoria y precacheado.

El tiempo de espera sin red es corto, porque las peticiones fallan enseguida y no esperan los 5 s del timeout. "Buscando el camino…" casi no se llega a ver.

### 6. Recorrido guardado en `localStorage`

Clave `dq:recorrido:v1`:

```ts
interface RecorridoGuardado {
  esquema: 1;
  versionDatos: string;            // hash de grafo + catálogo + entradas
  origen?: string;                 // id de lugar del catálogo, solo si está confirmado
  destino?: string;
  criterioElegido?: 'mas-corta' | 'resguardada'; // si el usuario eligió (p. ej. clima con error)
  alternativaMostrada: 'mas-corta' | 'resguardada';
  rutas: { criterio: string; nodos: string[] }[]; // las que se estaban mostrando
  climaUsado: 'seco' | 'lluvia' | 'error';
  guardadoEn: string;              // ISO 8601
}
```

- **Cuándo se escribe:** al elegir el destino o confirmar el origen (todavía sin rutas), al mostrar una ruta y al cambiar de alternativa. Pesa menos de 5 KB. Un origen que es solo la sugerencia sin confirmar no se guarda acá.
- **Cuándo se borra:** con "Finalizar viaje" y cuando vence.
- **Vigencia: 2 horas desde `guardadoEn`.** Dentro de ese plazo, una recarga es parte del mismo recorrido: se restauran el origen, el destino, la alternativa mostrada y las rutas guardadas, **dibujadas directamente desde los nodos**, sin recalcular ni esperar la red. Después, en segundo plano, se actualizan cierres y clima con la lógica de la decisión 4: avisar sin reemplazar.
- **Vencido:** se descarta. El último origen queda solo como la sugerencia que hay que confirmar, que ya maneja `seleccion-de-recorrido` (brief v4, hallazgos 1 y 2). Así la restauración no contradice esa corrección: restaurar es continuidad dentro de un mismo recorrido, no un origen precargado días después.
- **Otra `versionDatos`:** si el origen y el destino siguen existiendo en el catálogo, se recalcula localmente. Si no, se descarta y se muestra "No pudimos recuperar tu recorrido anterior".
- **Esquema desconocido o JSON roto:** se descarta sin error visible.
- **Lectura sincrónica al arrancar**, antes del primer render, para no mostrar un instante la pantalla vacía.
- **Fallas de almacenamiento:** todas las lecturas y escrituras van en `try/catch`. Si `localStorage` no está disponible (navegación privada o cuota llena), la app funciona igual sin restaurar.

*Alternativas:*
- IndexedDB: asincrónico, haría parpadear la primera pantalla y es demasiado para 5 KB.
- `sessionStorage`: se pierde si el sistema cierra la pestaña o si la PWA instalada se reabre, que es justo el caso que queremos cubrir.
- Guardar solo el origen y el destino y recalcular: sin red no habría clima, y la ruta restaurada podría ser distinta de la que el usuario venía siguiendo.

### 7. Versión nueva sin interrumpir

- **Cuándo se busca:** al abrir la app, cada 60 minutos con la app abierta (`registration.update()`) y con el evento `online`.
- **Qué cambia la versión:** el hash de cualquier archivo precacheado, sea código o datos.
- Cuando la versión nueva queda instalada y en espera:
  - **Sin recorrido en pantalla:** aparece una barra discreta "Hay una versión nueva" con "Actualizar". Tocarla activa la versión nueva (`updateServiceWorker(true)`), que recarga la página. El estado se recupera con la decisión 6.
  - **Con recorrido en pantalla:** no se muestra nada hasta "Finalizar viaje". La versión nueva también se activa sola cuando se cierran todas las pestañas de la app.
  - **"Más tarde":** la barra se cierra y vuelve a aparecer en la próxima apertura.
- Si la versión nueva trae otros datos, el recorrido restaurado se recalcula según la decisión 6.

*Alternativa:* `skipWaiting` automático. Es simple, pero mezcla en caliente archivos de dos versiones, o recarga la página en medio del recorrido.

### 8. Instalación opcional

- **Manifiesto:**
  - `name` "¿Dónde queda?" y `short_name` "Dónde queda".
  - `start_url` y `scope` en `/`.
  - `display: standalone` y `orientation: portrait`.
  - `theme_color` `#1A73E8` y `background_color` `#FFFFFF`.
  - Íconos de 192 y 512 px, más uno `maskable`.
  - `lang: es-AR`.
- **Android / Chrome:** se captura `beforeinstallprompt` y se ofrece "Instalar en el celular" en el menú de ayuda (`ayuda-contextual`). Además hay un botón flotante "Instalar app" arriba del de ayuda (`BotonInstalar`), que no aparece instalada, en el primer uso ni con una ruta en pantalla; en iOS abre la ayuda en los pasos de Compartir. Como mucho una vez, aparece una sugerencia chica después de terminar un segundo recorrido con "Finalizar viaje". Nunca en el primer uso ni con una ruta en pantalla.
- **iOS / Safari:** no existe ese evento. La ayuda muestra los pasos "Compartir → Agregar a inicio".
- **Al instalarse:** se pide `navigator.storage.persist()` para que el navegador no borre la caché, lo que es clave en iOS.
- **Sin instalar,** la app funciona exactamente igual.

### 9. Headers de hosting

En `_headers` de Netlify:

- `/sw.js`, `/index.html` y `/manifest.webmanifest`: `Cache-Control: no-cache`, para que siempre se revise la versión.
- Archivos con hash (`/assets/*`, `/data/teselas/*` y los datos con hash): `max-age=31536000, immutable`.
- `/data/cierres.json` y `/api/clima/*`: `no-cache`.

### 10. Pruebas sin conexión con Playwright

- Se corren contra el build de producción servido con `vite preview`, porque en desarrollo el service worker está apagado.
- Proyecto Chromium con emulación de celular (390 × 844, táctil) y `serviceWorkers: 'allow'`.
- Antes de cada caso se espera `navigator.serviceWorker.ready` y el fin del precache.

Casos:

1. **Arranque sin red:** primera visita con red, `context.setOffline(true)` y recarga → la app abre, el mapa se ve y las respuestas de teselas y datos dicen `response.fromServiceWorker() === true`.
2. **Ruta sin red:** sin conexión, elegir Dir. de Alumnos → Dto. de Salud → hay ruta, aparece el aviso de clima con elección de criterio y aparece "Sin conexión".
3. **Corte con ruta en pantalla:** ruta mostrada, corte y "Reintentar" → la ruta, el origen y el destino siguen. Al reconectar, el aviso desaparece.
4. **Recarga:** con una ruta mostrada, recargar (con y sin red) → se restaura la misma ruta. Con el reloj adelantado 3 horas (`page.clock`) no se restaura.
5. **Zoom sin red:** en la zona de la ruta, las teselas de nivel 2 vienen de la caché. Fuera de esa zona se ve la capa general ampliada y no hay huecos (captura comparada).
6. **Cierres sin red:** se ve la fecha de la copia usada.
7. **Versión nueva:** se sirven dos builds en el mismo puerto (el segundo con un dato cambiado) → con un recorrido en pantalla no aparece el aviso; después de "Finalizar viaje", sí.

Para cortar la red de verdad, además de `setOffline`, un caso detiene el servidor de preview. En Chromium, `page.route` no intercepta las peticiones que hace el propio service worker, así que el error de clima se prueba con el escenario `?clima=error` y no interceptando la petición.

La instalación y el comportamiento en iOS se verifican a mano, con una lista de chequeo en Android y en iPhone reales: Playwright WebKit no reproduce el service worker de Safari en iOS.

*Alternativa:* auditar con Lighthouse. La categoría PWA se quitó en Lighthouse 12; la instalabilidad se revisa en el panel Application de Chrome y con un test que valida los campos del manifiesto.

## Risks / Trade-offs

- [La instalación del service worker falla con señal irregular y no queda nada guardado] → Precache chico (≈ 1,4 MB). La app funciona con red mientras tanto y Workbox reintenta en la próxima carga.
- [Un service worker con errores deja a todos con una versión rota en caché] → `index.html` y `sw.js` sin caché HTTP. Plan de salida con `selfDestroying: true` de `vite-plugin-pwa` (ver Migration Plan).
- [Sin red se rutea con cierres viejos y la ruta pasa por un tramo recién cerrado] → Aviso "Cierres sin actualizar desde las HH:MM". "Reintentar" al alcance. Al reconectar, aviso "Un tramo de tu ruta está cerrado". El equipo precarga los cierres antes de la prueba.
- [Zoom alto sin red en una zona nunca vista] → Capa general ampliada debajo (borrosa pero ubicada) y precarga de la zona de la ruta.
- [`navigator.onLine` dice "en línea" en un Wi-Fi sin salida] → El aviso se basa en fallas reales de las peticiones con timeout, no solo en ese valor.
- [Un recorrido restaurado confunde a quien abre la app horas después] → Vigencia de 2 horas. Después, solo queda la sugerencia de origen que hay que confirmar.
- [iOS borra la caché de sitios no instalados después de 7 días sin uso] → Sugerencia de instalación y `storage.persist()`. Si se borró, la app vuelve a cargar con red como en la primera visita.
- [`localStorage` no disponible] → `try/catch` en todo acceso. La app sigue sin restaurar.
- [La emulación sin conexión de Playwright no cubre todo lo que hace el service worker] → Caso con el servidor detenido, `fromServiceWorker()` en las aserciones y lista de chequeo manual en dispositivos reales.
- [Cuota de almacenamiento] → En total se usan menos de 5 MB, muy por debajo de la cuota habitual (decenas de MB o más). `purgeOnQuotaError` en la caché de detalle.

## Migration Plan

1. Deploy en una vista previa de Netlify. Correr los e2e sin conexión y la lista de chequeo en Android y iPhone.
2. Merge a `main`. Las visitas siguientes registran el service worker. Quien ya tenía la app abierta lo recibe en la próxima carga.
3. **Plan de salida:** si el service worker causa problemas, se publica un build con `selfDestroying: true`, que reemplaza al service worker por uno que borra las cachés y se desregistra. La app vuelve a funcionar solo con red, sin que el usuario tenga que hacer nada.
4. `localStorage` usa una clave con versión (`dq:recorrido:v1`). Un cambio de formato futuro usa `v2` y descarta lo anterior.

## Open Questions

- ¿Conviene ofrecer "Descargar el plano completo" (2,5 a 3 MB) en la ayuda, para quien quiera el zoom máximo sin red en todo el campus?
- ¿Las 2 horas de vigencia del recorrido guardado son adecuadas? Se puede ajustar después de la prueba del TP5; es una constante.
- ¿Cuándo sugerir la instalación? La propuesta es después del segundo recorrido terminado; se revisa con lo que se observe.
- ¿Mostrar siempre la hora de los cierres usados, o solo cuando no vienen de la red?
