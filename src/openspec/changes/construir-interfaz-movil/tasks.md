## 1. Tokens visuales y estilos base

- [x] 1.1 Crear `src/ui/tema/tokens.css` con la paleta, la elevación, la tipografía, los radios, el espaciado y las capas de design.md (D3), y espejar los colores de marcadores en `src/ui/tema/tokens.ts`, y verificar con un test que los pares texto/fondo declarados cumplen 4,5:1 (y que `--color-destino` no se usa como color de texto).
- [x] 1.2 Configurar `index.html` con `lang="es-AR"`, `viewport-fit=cover` sin bloquear el zoom del navegador y el `body` con `overflow: hidden` y `overscroll-behavior: none`, y verificar en Playwright `movil` que la página no scrollea ni hace "tirar para recargar" al arrastrar.
- [x] 1.3 Agregar utilidades de área segura (`env(safe-area-inset-*)`), alturas con `dvh` y respaldo `vh`, campos de texto de 16 px y el estilo de foco visible, y verificar con una captura en WebKit emulando un iPhone que la tarjeta superior y la hoja no quedan bajo la muesca ni la barra de inicio.
- [x] 1.4 Crear los íconos SVG embebidos (lupa, direcciones, intercambiar, recentrar, ayuda, cerrar, volver, categorías, origen, pin) en `src/ui/iconos/`, y verificar que ninguno tiene logos ni marcas de terceros y que todos tienen `aria-hidden` o un nombre accesible.
- [x] 1.5 Crear `src/ui/estado/almacen.ts` (lectura y escritura de `localStorage` con `try/catch`, respaldo en memoria y claves versionadas `dq:*:v1`), y verificar con tests que funciona cuando `localStorage` lanza excepción o devuelve JSON inválido.

## 2. Estado de pantalla e historial

- [x] 2.1 Implementar en `src/ui/estado/pantalla.ts` el reductor puro de `Vista` y `Seleccion` con la fase derivada de "Cómo llegar" (D5), y verificar con tests en entorno `node` cada fila de la tabla de transiciones, que los eventos inválidos se ignoran y que la fase es `ruta` solo con origen y destino válidos y distintos.
- [x] 2.2 Implementar las reglas de selección en el reductor (intercambiar, cambiar origen conserva destino, borrar destino, origen igual al destino, la sugerencia no es origen), y verificar con tests cada escenario de `seleccion-de-recorrido`.
- [x] 2.3 Sincronizar el reductor con `history` (`pushState` al avanzar, `history.back()` desde los botones de volver, `popstate` como única fuente de cambio de vista, `go(-profundidad)` para `✕`, sin entrada para la fase de ruta), y verificar con tests de componentes en jsdom que Atrás desde la ruta vuelve a la ficha sin pedir otra ruta.
- [x] 2.4 Resolver la carga en frío con hash (`replaceState` con inicio + `pushState` con la vista pedida; hash desconocido → inicio), y verificar con un test e2e que abrir `#lugar/puerta-humanidades-121` y presionar Atrás muestra el inicio.
- [x] 2.5 Exponer el estado en un contexto de React (`PantallaProvider`, `usePantalla`) y dejar `Vista` y `Seleccion` serializables a JSON, y verificar con un test que `JSON.parse(JSON.stringify(estado))` reconstruye un estado equivalente.

## 3. Hoja inferior y disposición de la pantalla

- [x] 3.1 Implementar la función pura `elegirAnclaje(posición, velocidad, anclajes)` con proyección de 200 ms y umbral de 0,5 px/ms, y verificar con una tabla de tests los casos de soltar cerca de cada altura y de deslizamiento rápido.
- [x] 3.2 Construir el componente de hoja inferior (`src/ui/hoja/`) con tres alturas, arrastre desde la manija y la cabecera, arrastre desde la lista con scroll en cero, animación de 250 ms y ninguna animación con `prefers-reduced-motion`, y verificar con un test e2e de gestos (CDP, Chromium `movil`) que arrastrar y soltar ancla en la altura esperada.
- [ ] 3.3 Hacer accesible la manija (`<button>`, `aria-valuetext`, `Enter`/`Espacio` y flechas) y marcar `inert` el contenido oculto en la altura colapsada, y verificar con Testing Library que el teclado cambia la altura y que el foco no entra en contenido oculto.
- [x] 3.4 Publicar el alto visible de la hoja y de la tarjeta superior (por ejemplo con `ResizeObserver`) para el encuadre del mapa y el cálculo de la altura expandida, y verificar con un test que el valor cambia al anclar en otra altura.
- [x] 3.5 Implementar la disposición de escritorio (≥ 1024 px: panel lateral izquierdo de 408 px sin manija, búsqueda dentro del panel; de 600 a 1023 px: hoja de 560 px como máximo), y verificar con capturas de Playwright a 1280 × 800 y 768 × 1024.
- [x] 3.6 Dejar el espacio `ContenidoRuta` en la hoja para la fase de ruta, con un marcador provisional, y verificar con un test que aparece solo en la fase `ruta`.

## 4. Visor de mapa

- [x] 4.1 Agregar `leaflet` y `react-leaflet` (versión compatible con el React que fijó `configurar-base-app`) y crear el CRS simple con y hacia abajo y la conversión `aLatLng` en `src/ui/mapa/coordenadas.ts`, y verificar con un test que un nodo de `grafo.json` cae en el píxel esperado del plano.
- [x] 4.2 Montar el mapa a pantalla completa con la capa de teselas (`/data/teselas/<version>/{z}/{x}/{y}.webp`, niveles nativos −2 a 2, `zoomOffset: 2`), el fondo `#F8F8F8` y sin control de atribución, y verificar en e2e que el plano ocupa todo el viewport de 390 × 844.
- [x] 4.3 Configurar zoom mínimo calculado, máximo 3, `maxBounds` con margen y viscosidad 1, inercia, doble toque y teclado, sin rotación, y verificar con e2e de gestos que pellizcar acerca, que arrastrar más allá del borde se detiene y que alejar se frena con el campus entero visible.
- [x] 4.4 Implementar el encuadre inicial `ENCUADRE_INICIAL` con `padding` según la tarjeta y la hoja, ajustando el rectángulo sobre el plano real, y verificar con una captura de referencia que se ven todos los edificios y ninguno queda tapado.
- [x] 4.5 Implementar el botón para recentrar según la vista activa (campus, lugar o el encuadre que provea la ruta), y verificar con e2e que después de mover el plano vuelve al encuadre esperado en el inicio y en la ficha.
- [x] 4.6 Implementar el pin rojo del lugar seleccionado sobre su puerta principal y el desplazamiento para dejarlo en la franja visible, y verificar con e2e que al abrir la ficha de un lugar lejano el pin queda por encima de la hoja y desaparece al cerrarla.
- [x] 4.7 Crear los panes `plano`, `cierres`, `ruta` y `marcadores` y exponerlos como espacios para otros cambios, y verificar con un test que el orden de apilado es el documentado.
- [x] 4.8 Implementar el respaldo a imagen única cuando fallan varias teselas seguidas, y verificar con e2e bloqueando `/data/teselas/*` que el plano sigue visible.
- [x] 4.9 Crear el doble del mapa para jsdom, para usarlo en los tests de componentes, y verificar que los tests de búsqueda y panel corren sin cargar Leaflet.

## 5. Búsqueda de lugares y ficha

- [x] 5.1 Implementar `normalizar` en `src/busqueda/` (minúsculas, sin diacríticos, puntuación a espacios, "aula" antes de un número), y verificar con una tabla de tests ("Lab. de Física", "BIBLIOTÉCA", "aula 121", "Martí", ñ).
- [x] 5.2 Implementar el índice y `buscar` con coincidencia por prefijo de palabras, subcadena de 3 caracteres o más, los seis niveles de orden y el desempate con `Intl.Collator` numérico, y verificar con tests sobre un catálogo de prueba cada escenario de "Búsqueda por número de aula", "Búsqueda por alias y edificio" y "Orden de los resultados", y que buscar sobre 300 lugares tarda menos de 5 ms.
- [x] 5.3 Implementar los recientes (máximo 8, sin repetidos, ids desconocidos descartados, guardado al abrir una ficha o elegir un destino), y verificar con tests que elegir un origen no guarda un reciente y que con almacenamiento bloqueado no hay errores.
- [x] 5.4 Construir la barra flotante del inicio ("¿A dónde vas?" + botón de direcciones) y la fila de chips de referencias desde el catálogo, y verificar con Testing Library que cada chip abre la ficha correcta y "Entradas" lista las cinco entradas al campus.
- [x] 5.5 Construir la búsqueda a pantalla completa con el patrón *combobox* (`role="dialog"`, `combobox`, `listbox`, `aria-activedescendant`, región `aria-live`), foco automático, flechas, `Enter`, `Esc` y retorno del foco, y verificar con Testing Library y axe que no hay violaciones y que el anuncio de cantidad de resultados ocurre.
- [x] 5.6 Construir las filas de resultado (ícono de categoría, coincidencia en negrita, "Edificio · Categoría", 64 px de alto) y el estado "Sin acceso ahora" con texto e ícono a partir de `estadoAcceso(lugarId)` (por defecto, accesible), y verificar con un test que un lugar sin acceso conserva su posición y muestra el texto.
- [x] 5.7 Construir el estado "sin resultados" con el texto buscado, la sugerencia y las referencias, y verificar con Testing Library el escenario "zzz".
- [ ] 5.8 Ajustar la búsqueda con el teclado abierto usando `visualViewport`, y verificar en WebKit `movil` que la primera fila de resultados queda visible por encima del teclado.
- [x] 5.9 Construir la ficha del lugar en la hoja (nombre, edificio, categoría, piso, "Cómo llegar", "Sin acceso ahora", cantidad de puertas en la altura media) y la tarjeta superior en modo título (`←` nombre `✕`), con el foco en el título al abrir, y verificar con Testing Library que el lector anuncia el nombre.
- [x] 5.10 Verificar con un test de componentes que el nombre y el edificio de un lugar son idénticos en la fila del resultado, los recientes, la ficha, la tarjeta superior y el campo de destino del panel (por ejemplo "Lab. de Microscopía").

## 6. Panel "Cómo llegar"

- [x] 6.1 Construir la tarjeta superior del panel (origen con círculo, destino con pin, línea punteada, botón `⇅`, nombres accesibles "Punto de partida: …" y "Destino: …"), y verificar con Testing Library que se abre con el destino correcto desde la ficha y vacío desde la barra.
- [x] 6.2 Conectar los campos con la búsqueda en modo origen o destino ("¿Desde dónde salís?" para el origen) con vuelta por `history.back()`, y verificar con e2e que elegir un lugar actualiza solo ese campo.
- [x] 6.3 Mostrar la sugerencia del último origen ("¿Salís de …?" + "Usar este origen") y guardar `dq:ultimo-origen:v1` al pedir una ruta, y verificar con Testing Library que sin confirmar no se llama a `solicitarRuta` y que al confirmar se llama una vez.
- [x] 6.4 Listar en la hoja y al principio de la búsqueda de origen las entradas al campus y las referencias del catálogo, y verificar con Testing Library el orden: sugerencia, entradas, referencias.
- [x] 6.5 Implementar el pedido automático con el *stub* `solicitarRuta(origen, destino)` (una vez por combinación, se cancela si la selección queda incompleta), y verificar con tests que abrir y cerrar la búsqueda sin elegir no repite el pedido y que cambiar el origen sí.
- [x] 6.6 Implementar intercambiar, borrar el destino y el mensaje "Ya estás en <lugar>", con anuncio para el lector de pantalla, y verificar con Testing Library los escenarios de intercambiar, sin destino y origen igual al destino.
- [x] 6.7 Verificar con un test e2e el recorrido inicio → buscar "121" → ficha → "Cómo llegar" → elegir "Biblioteca" como origen → `solicitarRuta` llamado, y que Atrás vuelve a la ficha y después al inicio.

## 7. Ayuda contextual

- [x] 7.1 Construir la indicación de primer uso en la hoja del inicio (altura media, ejemplo de búsqueda, "Entendido" que guarda `dq:primer-uso-cerrado:v1`), y verificar con Testing Library que aparece sin recientes, que no aparece con recientes y que después de cerrarla no vuelve.
- [x] 7.2 Agregar las ayudas breves: el ejemplo en la búsqueda vacía, el texto de origen vacío ("No usamos tu ubicación…") y el `(i)` de "Sin acceso ahora", y verificar con Testing Library que cada texto aparece solo en su condición.
- [x] 7.3 Construir el botón `(?)` y la hoja de ayuda (tres pasos, leyenda de símbolos con su dibujo, aviso de que no se usa la ubicación y crédito del plano) con entrada `#ayuda` en el historial, y verificar con e2e que se abre desde el inicio, la ficha y el panel, y que Atrás la cierra sin cambiar la selección.
- [ ] 7.4 Revisar los textos de ayuda y de estados con el equipo (español rioplatense, una línea, sin jerga técnica), y verificar que cada texto final quedó en un único archivo de textos de la interfaz.

## 8. Integración y verificación final

- [x] 8.1 Correr la suite completa (`npm test` y `npm run test:e2e` en `movil` y WebKit) y verificar que pasa sin tests saltados.
- [x] 8.2 Correr `@axe-core/playwright` en las vistas inicio, búsqueda, ficha, "Cómo llegar" y ayuda, y verificar que no hay violaciones serias ni críticas.
- [ ] 8.3 Correr Lighthouse móvil sobre el build de producción y verificar accesibilidad ≥ 95 y "Time to Interactive" < 3 s con 4G lenta.
- [x] 8.4 Generar las capturas de referencia de las cuatro vistas a 390 × 844 y verificar que coinciden con los esquemas de design.md (D1).
- [ ] 8.5 Probar a mano en un iPhone y un Android reales el recorrido completo, los gestos del mapa y de la hoja y el botón Atrás, y verificar que no hay conflictos de gestos ni controles tapados.
- [x] 8.6 Correr `openspec validate construir-interfaz-movil --strict` y verificar que pasa.

## Workflow follow-up

- Archivar el cambio con `openspec archive construir-interfaz-movil` cuando esté implementado y verificado.
- Avisar a `mostrar-ruta-e-indicaciones` que el espacio `ContenidoRuta`, el pane `ruta` y `solicitarRuta` están listos para reemplazar el marcador y el *stub*.
