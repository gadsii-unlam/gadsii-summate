## 1. Nombres de las entradas de edificio

- [x] 1.1 Crear `datos-fuente/entradas.json` con las 24 entradas de edificio (`entrada-*` que no son `central`) y cargar los nombres que documenta el `CLAUDE.md` (por ejemplo `entrada-salud-01` → "entrada oeste", `entrada-artes-y-medios-02` → "entrada oeste", `entrada-economicas-01` → "entrada oeste de arriba"), y verificar que el archivo sea JSON válido y que cada clave sea un id de entrada del grafo
- [x] 1.2 Sumar al build de datos de `preparar-datos-campus` la validación de `entradas.json`: falla si una clave no existe en el grafo y reporta sin frenar las entradas sin nombre; verificar con un test que un id inexistente hace fallar el build y que una entrada sin nombre solo aparece en el reporte
- [x] 1.3 Reportar en el mismo build los nodos frontera que no son `entrada-*` ni puerta (hoy `pasillo-economicas-10`, `pasillo-economicas-44` y `pasillo-artes-y-medios-25`), y verificar que el reporte del grafo actual lista exactamente esos tres
- [ ] 1.4 Recorrer el campus para confirmar los nombres de las entradas que se van a usar en la prueba y verificar que cada nombre confirmado quede marcado en el archivo (las no confirmadas se quitan)
  - Nota: Pendiente (trabajo de campo): los 24 nombres de `datos-fuente/entradas.json` son una propuesta (posición + CLAUDE.md). Confirmarlos en el campus y quitar los que no se confirmen.

## 2. Tramos y formato (lógica pura en `src/rutas/`)

- [x] 2.1 Implementar `tramos.ts`: a partir de `ResultadoRuta.nodos` arma los tramos con dirección (este, oeste, norte, sur), longitud en metros, exterior y departamento de cada extremo, y separa la polilínea en partes bajo techo y al aire libre; verificar con Vitest que la ruta más corta Dir. de Alumnos → Dto. de Salud da 62 m exteriores en una sola parte al aire libre entre `pasillo-economicas-44` y `entrada-salud-01`
- [x] 2.2 Implementar `formato.ts` con el redondeo de distancia a 5 m (mitades hacia arriba, mínimo 5 m) y los textos "Incluye N m al aire libre" / "Todo bajo techo"; verificar con tests que 163 → "165 m", 31,4 → "30 m", 12,6 → "15 m", 2,9 → "5 m", 62 → "Incluye 60 m al aire libre", 2 → "Incluye 5 m al aire libre" y 0 → "Todo bajo techo"
- [x] 2.3 Implementar la regla de nombres de los chips ("Techada" si la resguardada tiene 0 m al aire libre, "Más resguardada" si tiene; "Más rápida" para la más corta) y el texto de ruta única con lluvia ("Ya es techada" / "Es la opción más resguardada"); verificar con tests de tabla para los cuatro casos

## 3. Generación de indicaciones (`src/rutas/indicaciones.ts`)

- [x] 3.1 Implementar el agrupado de tramos colineales y la absorción de desvíos de menos de 3 m; verificar con un test que `pasillo-economicas-41`…`44` forma un solo tramo de 30 m y que el desvío `pasillo-central-22`→`pasillo-central-17` no genera giros
- [x] 3.2 Implementar el cálculo de giro por producto vectorial en coordenadas con y hacia abajo (`c > 0` derecha, `c < 0` izquierda) y la combinación "y enseguida" para giros a menos de 4 m; verificar con tests de las cuatro combinaciones de direcciones, con un caso de giros a 3 m y con el giro en U, que se registra en consola
- [x] 3.3 Implementar los eventos de salida y entrada de edificio (interior ↔ exterior) con el nombre curado de la entrada o el texto genérico, y el evento de cambio de edificio bajo techo; verificar con tests que `entrada-salud-01` da "Entrá a Salud por la entrada oeste", que `pasillo-economicas-44` da "salí de Económicas al aire libre", que una entrada sin nombre no se menciona y que `pasillo-artes-y-medios-16`→`pasillo-salud-01` da "…hasta Salud"
- [x] 3.4 Implementar el primer paso (puerta con lado de giro, puerta que da a la vereda y entrada al campus con "seguí la línea azul") y el último paso (lado de la puerta o "Seguí derecho"); verificar con tests para `puerta-economicas-dir-de-alumnos`, `puerta-servicios-biblioteca` y `entrada-central-principal` y para las llegadas a izquierda, derecha y de frente
- [x] 3.5 Agregar el paso de piso con la indicación curada del catálogo para destinos fuera de planta baja, y solo el piso si faltara la indicación; verificar con un catálogo de prueba que hay un paso final con el texto tal cual y que un destino de planta baja no tiene ese paso
- [ ] 3.6 Escribir el test de referencia (golden test) con el grafo real: Dir. de Alumnos → Dto. de Salud en los dos criterios debe producir exactamente las tablas del design.md (11 y 7 pasos, textos, distancias y marca "Al aire libre"), y verificar que pasa en CI
  - Nota: Pasa en local (`src/rutas/indicaciones-reales.test.ts`). Falta: verlo en CI y decidir el nombre de la oficina (el catálogo dice "Dirección de Alumnos"; el design.md, "Dir. de Alumnos").
- [x] 3.7 Agregar un test de propiedades sobre una muestra de 500 pares de puertas al azar con semilla fija: todas las rutas generan indicaciones sin errores, el primer paso es de salida, el último es de llegada (o de piso) y la suma de distancias de los pasos difiere del total en menos de 5 m por paso; verificar que corre en menos de 2 s

## 4. Capa de la ruta en el mapa (`src/ui/ruta/`)

- [x] 4.1 Dibujar la ruta elegida con borde `#174EA6` de 10 px y relleno `#1A73E8` de 6 px sobre un renderer Canvas con `tolerance: 12`, y los tramos al aire libre punteados con el mismo azul; verificar con una captura e2e a 390 × 844 que la ruta de ejemplo muestra el tramo de la vereda punteado y los interiores continuos
- [x] 4.2 Mostrar la leyenda "Bajo techo / Al aire libre" solo cuando la ruta tiene tramos exteriores; verificar con tests de componente para Aula 121 → Aula 110 (sin leyenda) y Dir. de Alumnos → Dto. de Salud (con leyenda)
- [x] 4.3 Dibujar los marcadores de origen (círculo azul con borde blanco) y destino (pin `#EA4335` anclado en la punta) en `puertaOrigen` y `puertaDestino`, y la flecha de sentido cuando el origen es una entrada al campus; verificar con un test e2e que el pin de la ruta al Gimnasio queda sobre `puerta-servicios-gimnasio-2`
- [x] 4.4 Dibujar la alternativa no elegida en gris (`#80868B` con borde `#5F6368`) debajo de la elegida y seleccionarla al tocarla; verificar con un test e2e que tocar la línea gris cambia el chip seleccionado
- [x] 4.5 Respetar el orden de capas (plano → cierres → alternativa → ruta → resaltado → marcadores) y verificar con un test de componente que la capa de la ruta queda por encima de la capa de cierres

## 5. Encuadre automático

- [x] 5.1 Calcular los márgenes del encuadre con la altura real de la tarjeta superior y de la hoja a altura media (o el ancho del panel lateral en escritorio) y llamar a `fitBounds` al aparecer una ruta o cambiar de alternativa, con zoom máximo limitado; verificar con un test e2e a 390 × 844 y a 375 × 667 que origen y destino quedan dentro del área visible no tapada
- [x] 5.2 Pasarle los límites de la ruta al botón recentrar de `construir-interfaz-movil` y no reencuadrar cuando el usuario mueve el mapa; verificar con un test e2e que después de arrastrar el mapa no vuelve solo, y que recentrar devuelve al encuadre de la ruta

## 6. Hoja de resultado

- [x] 6.1 Implementar el estado "Buscando el camino…" con 150 ms de demora para aparecer, 400 ms mínimos visible, barra indeterminada y `aria-live`, quitando la ruta anterior al pedir otra; verificar con un test de componente con relojes falsos y con un e2e con el escenario `lento` (`?clima=lento`)
- [x] 6.2 Implementar la tarjeta resumen con tiempo, distancia y metros al aire libre; verificar con un test de componente que la ruta de ejemplo muestra "2 min · 165 m" e "Incluye 60 m al aire libre"
- [x] 6.3 Implementar los chips de alternativas (recomendada primero, subtítulo "Recomendada con lluvia", `aria-pressed`) y el cambio instantáneo entre alternativas sin pedir nada a la red; verificar con un e2e con `?clima=lluvia` que tocar "Más rápida · 2 min" cambia la tarjeta a "2 min · 165 m" sin mostrar "Buscando el camino…" y con la red cortada
- [x] 6.4 Implementar la ruta única sin chips y su texto con lluvia; verificar con tests de componente para `seco`, lluvia con Aula 121 → Aula 110 ("Ya es techada") y lluvia con resguardada idéntica con metros exteriores ("Es la opción más resguardada")
- [x] 6.5 Implementar "Finalizar viaje", que quita la ruta, los marcadores y la leyenda, vuelve al estado inicial y emite el evento que usa `tolerar-senal-irregular` para borrar el recorrido guardado; verificar con un e2e que después de tocarlo se ve "¿A dónde vas?" y el mapa no tiene ruta

## 7. Lista de indicaciones

- [x] 7.1 Implementar la vista "Indicaciones" en la hoja expandida (lista ordenada, íconos decorativos, rótulo "Al aire libre", distancia a la derecha, encabezado con el resumen y flecha para volver); verificar con un test de componente que la ruta de ejemplo muestra 11 pasos y que los pasos 2 a 6 tienen "Al aire libre"
- [x] 7.2 Implementar el toque sobre un paso: la hoja baja a altura media, el paso queda con `aria-current="step"`, el mapa encuadra el tramo y lo resalta con halo blanco; verificar con un e2e que tocar "Entrá a Salud por la entrada oeste" encuadra el tramo desde `entrada-salud-01` por encima de la hoja
- [x] 7.3 Verificar con un e2e que, al volver de la lista y al cambiar de alternativa, el resaltado del paso desaparece y la lista se regenera con los pasos de la ruta nueva

## 8. Accesibilidad

- [x] 8.1 Anunciar el resumen al aparecer una ruta ("Ruta encontrada: 2 min, 165 m, incluye 60 m al aire libre") y verificar con un test de componente que la región `aria-live` contiene ese texto
- [x] 8.2 Correr axe en la vista de resultado y en la lista de indicaciones y medir los objetivos táctiles; verificar que no hay violaciones serias y que chips y botones miden al menos 44 × 44 px
- [x] 8.3 Verificar el contraste: el borde de la ruta contra `#FED57B` y `#F8F8F8` y el gris de la alternativa contra `#F8F8F8` dan al menos 3:1, con un test que calcula la relación de luminancia

## 9. Integración

- [ ] 9.1 Recorrido e2e completo en un celular emulado (390 × 844, táctil) con `?clima=lluvia`: elegir Dir. de Alumnos y Dto. de Salud, ver "Buscando el camino…", ver la ruta "Más resguardada" encuadrada con el tramo punteado y la leyenda, cambiar a "Más rápida", abrir las indicaciones, tocar un paso y finalizar el viaje; verificar que pasa en CI
  - Nota: `tests/e2e/ruta.spec.ts` ("recorrido completo con lluvia") pasa en local. Falta verlo en CI.
- [x] 9.2 Recorrido e2e con un cierre precargado que corta la ruta más corta del ejemplo: verificar que la ruta mostrada no pasa por el tramo cerrado y que las indicaciones corresponden a la ruta nueva
- [ ] 9.3 Prueba manual en un Android y un iPhone reales con sol directo: verificar que se distinguen el trazo continuo y el punteado, y que la lista se puede usar con una mano
  - Nota: Pendiente: prueba manual en un Android y un iPhone reales.

## Workflow follow-up

- Archivar el cambio con `openspec archive mostrar-ruta-e-indicaciones` cuando todas las tareas estén hechas y los specs se hayan sincronizado.
