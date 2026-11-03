## 1. Archivo de cierres y validación

- [x] 1.1 Crear `public/data/cierres.json` con `"version": 1` y la lista vacía, y un archivo de ejemplo de tests con los tres cierres del design; verificar que la app compila y que el archivo se sirve en `/data/cierres.json` con `npm run dev`.
- [x] 1.2 Definir los tipos del archivo y una función que lo valida contra el grafo (ids existentes, aristas en cualquier sentido normalizadas, fechas válidas, `hasta` posterior a `desde`, ids de cierre únicos, motivo presente) y verificar con tests cada error y cada normalización.
- [x] 1.3 Crear el script `npm run validar-cierres` que usa esa función en modo estricto, lista los lugares que quedarían "Sin acceso ahora" y termina con error si hay problemas; agregarlo al CI y verificar que falla con un id inventado y pasa con el archivo vacío.

## 2. Carga y vigencia

- [x] 2.1 Implementar la carga por red de `/data/cierres.json` con timeout de 5 s y respaldo en la copia incluida en el bundle, con advertencias en consola ante fallas e ids desconocidos; verificar con tests (red simulada) que con falla de red, JSON inválido o forma incorrecta se aplican los cierres de la copia incluida.
- [x] 2.2 Implementar la evaluación de vigencia (`desde` inclusivo, `hasta` exclusivo, fechas sin zona en hora local, fecha inválida = vigente con advertencia) y verificar con tests los bordes de inicio y fin y los cierres sin `desde` o sin `hasta`.
- [x] 2.3 Implementar la fecha simulada por parámetro `?ahora=` persistida en `sessionStorage`, con etiqueta visible "Fecha simulada: …", y verificar con un test de componente que la etiqueta aparece y que la vigencia usa esa fecha.
- [x] 2.4 Reevaluar la vigencia en cada cálculo de ruta y cada 60 s para el mapa y los estados de acceso, y verificar con timers falsos que un cierre que vence deja de aplicarse en el siguiente cálculo.

## 3. Exclusión y accesibilidad

- [x] 3.1 Convertir los cierres vigentes en el conjunto `excluidos` del motor y pasarlo en todo cálculo de ruta, con los dos criterios; verificar con tests que con `entrada-salud-02` cerrado la ruta Aula 511 → Lab. de Microscopía no pasa por ese nodo y mide ≈ 560 px, también con criterio `resguardada`.
- [x] 3.2 Calcular los lugares "Sin acceso ahora" con un recorrido desde todas las entradas al campus abiertas y verificar con tests que con `pasillo-artes-y-medios-06` cerrado Estudio 2 queda sin acceso y que con solo `puerta-servicios-gimnasio-2` cerrada el Gimnasio sigue accesible.
- [x] 3.3 Implementar la obtención de motivos para "Sin ruta disponible" (lado aislado, cierres en el borde de la zona alcanzable, máximo dos motivos más "y N cierres más") y verificar con tests los casos de Estudio 2 (destino) y de la Entrada principal aislada (origen).
- [x] 3.4 Implementar el aviso de desvío comparando con la ruta sin exclusiones (y omitirlo si no hay cierres vigentes) y verificar con tests que aparece para Aula 511 → Lab. de Microscopía con la obra vigente y no aparece para Aula 121 → Aula 110.

## 4. Datos para la interfaz

Los componentes visuales los construyen `construir-interfaz-movil` y `mostrar-ruta-e-indicaciones`. Si todavía no existen, estas tareas se verifican con tests unitarios sobre los datos expuestos y la verificación visual queda en el grupo 6.

- [x] 4.1 Exponer el estado "Sin acceso ahora" por lugar para la lista de `busqueda-de-lugares` y verificar con un test que, con `pasillo-artes-y-medios-06` cerrado, el estado de Estudio 2 es "Sin acceso ahora" y la etiqueta nunca es un guion.
- [x] 4.2 Exponer el estado "Sin ruta disponible" (motivo, destino a marcar, acciones "Elegir otro destino" y "Volver al mapa") para `mostrar-ruta-e-indicaciones` y verificar con un test el texto del motivo para Estudio 2.
- [x] 4.3 Preparar la capa de tramos cerrados (segmentos en coordenadas del mapa, ícono en el punto medio o sobre el nodo, motivo y vigencia) con línea roja punteada `#D93025` e ícono de paso prohibido de al menos 44 px táctiles, y verificar con tests que solo se incluyen los cierres vigentes y que el detalle trae el motivo y "Cerrado hasta el 14/11 a las 23:00" para la obra de ejemplo.

## 5. Procedimiento de precarga

- [ ] 5.1 Escribir `docs/cierres.md` con el formato del archivo, el ejemplo, cómo encontrar los ids en Figma o en `grafo.svg`, la preferencia por cerrar nodos, el uso de `-03:00`, `npm run validar-cierres` y la verificación con `?ahora=`; verificar que otra persona del equipo carga un cierre de prueba siguiendo solo la guía.

## 6. Integración

- [x] 6.1 Escribir un test e2e con Playwright (390×844, touch) que carga un archivo de cierres de prueba con `entrada-salud-02` y `pasillo-artes-y-medios-06` cerrados y verificar que la ruta Aula 511 → Lab. de Microscopía muestra el aviso de desvío, que el tramo cerrado se ve en el mapa y que Estudio 2 aparece como "Sin acceso ahora" y lleva a "Sin ruta disponible".
- [x] 6.2 Correr `npm run lint`, `npm run test`, `npm run validar-cierres` y `npm run build` y verificar que pasan.

## Estado de la integración

- Conectado en `App`: el controlador (`iniciarCierres` → `ContextoCierres`), `estadoAcceso` ("Sin acceso ahora" en la búsqueda, la hoja y la ficha), la capa del mapa (`CapasMapa = componerCapas(CapaCierresPerezosa)`, pane `cierres`), el símbolo de la leyenda y la etiqueta "Fecha simulada". `npm run validar-cierres` corre en CI después del build.
- **4.2 hecha (la conectó `mostrar-ruta-e-indicaciones`):** `ContenidoRutaApp` muestra el desvío (`avisoDeDesvio`) y "Sin ruta disponible" (`explicarSinRuta`) sobre el plan del orquestador; test en `src/ui/ruta/ContenidoRutaApp.test.tsx` (Estudio 2). Texto original de la nota: la tarjeta de resultado debe mostrar `resultado.desvio.texto` y, para `tipo: 'sin-ruta'`, `resultado.sinRuta` (título, texto, destino marcado y las acciones "Elegir otro destino" / "Volver al mapa"). Los datos ya salen de `calcularRutaConCierres` / `controlador.calcularRuta`. Su capa de ruta se agrega con `componerCapas(CapaCierresPerezosa, CapaRuta)` en `App`.
- **`solicitarRuta` pendiente (lo conecta `adaptar-ruta-al-clima`):** el orquestador toma el controlador con `useControladorCierres()` (o el estado de `App`) y usa `excluidosDeControlador(controlador)` en cada cálculo, o directamente `controlador.calcularRuta(...)`.
- **6.1 completa:** se agregaron el desvío de Aula 511 → Lab. de Microscopía y "Sin ruta disponible" de Estudio 2 en `tests/e2e/cierres.spec.ts`. Nota anterior: `tests/e2e/cierres.spec.ts` cubre la capa (vigencia, íconos de 44 px, burbuja con "Cerrado hasta…"), "Sin acceso ahora" de Estudio 2 en la búsqueda y la ficha, la fecha simulada, la lista vacía, el respaldo sin red y la leyenda. Faltan el aviso de desvío de Aula 511 → Lab. de Microscopía y "Sin ruta disponible" al elegir Estudio 2, que dependen de 4.2.
- **5.1:** la guía está escrita; falta que otra persona del equipo cargue un cierre de prueba siguiendo solo la guía.
- **6.2:** `lint`, `test` y `build` pasan con 4.2 y 6.1 cerradas, y `npm run validar-cierres` también.

## Workflow follow-up

- Archivar el cambio con `openspec archive aplicar-cierres-temporales` cuando esté implementado y verificado.
