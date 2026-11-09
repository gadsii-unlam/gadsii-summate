## 1. Service worker y precache

- [x] 1.1 Agregar `vite-plugin-pwa` en modo `generateSW` con `registerType: 'prompt'` y `NavigationRoute` a `index.html`, y verificar que `npm run build` genera `sw.js` y el manifiesto, y que la lista de precache incluye `index.html`, los JS y CSS con hash, los íconos y el manifiesto
  - Nota: Config en `scripts/pwa/opciones.ts` (la importa `vite.config.ts`); test del build en `scripts/pwa/precache.test.ts`. El registro lo hace `useVersionNueva` (`virtual:pwa-register/react`), así que el plugin ya no agrega `registerSW.js`.
- [x] 1.2 Incluir en el precache el grafo, el catálogo y los nombres de entradas con hash en el nombre, las teselas de los niveles −2 a 0 y la imagen de respaldo del plano; verificar con un test del build que la lista tiene 114 teselas, que no incluye `/data/cierres.json` ni `/api/clima/` y que el total precacheado es menor a 2 MB
- [x] 1.3 Confirmar con `preparar-datos-campus` que los datos y las teselas se publican con hash o versión en la ruta y con una `versionDatos`; si falta, agregarla al manifiesto de datos y verificar que cambiar un nodo de `grafo.json` cambia `versionDatos` y la revisión en el precache
  - Nota: Los datos no llevan hash en el nombre: Workbox les pone revisión por contenido. `versionDatos(grafo, catalogo)` (`src/datos/persistencia.ts`) se deriva de las versiones que ya publica el pipeline. Test: `scripts/pwa/version-datos.test.ts`.
- [x] 1.4 Medir el plano real generado (teselas WebP por nivel) y actualizar la tabla de tamaños del design.md; verificar que el precache de los niveles −2 a 0 queda en el rango estimado (alrededor de 0,75 MB) o documentar la diferencia

## 2. Estrategias de caché en tiempo de ejecución

- [x] 2.1 Configurar `CacheFirst` para las teselas de los niveles 1 y 2 en la caché `teselas-detalle` con `ExpirationPlugin` (1600 entradas, 30 días, `purgeOnQuotaError`); verificar con un e2e que una tesela de nivel 2 vista con conexión se sirve desde el service worker sin conexión
- [x] 2.2 Configurar `NetworkFirst` con `networkTimeoutSeconds: 4` para `/data/cierres.json` y embeber en el bundle la copia de los cierres del build con su fecha; hacer que `src/cierres/` informe el origen de los datos (red, caché o respaldo) y la hora; verificar con tests unitarios los tres orígenes y con un e2e que sin conexión se usa la copia guardada
  - Nota: El service worker marca la copia guardada (`X-DQ-Origen`, `X-DQ-Guardado-En`); `cargarCierres` devuelve `origen` (`red`, `cache`, `respaldo`) y `guardadoEn` (tests en `src/cierres/carga.test.ts`). E2E: `caches.spec.ts` y "cierre guardado respetado sin conexión" en `recorrido.spec.ts`.
- [x] 2.3 Configurar `NetworkOnly` para `/api/clima/*` y verificar con un e2e que, después de una consulta con `?clima=lluvia`, sin conexión la siguiente consulta termina en error de clima y no devuelve el `lluvia` anterior
- [ ] 2.4 Agregar los headers de Netlify (`no-cache` para `sw.js`, `index.html`, el manifiesto, cierres y clima; `immutable` para los archivos con hash) y verificar con `curl -I` contra la vista previa que cada ruta devuelve el header esperado
  - Nota: Hecho: `public/_headers` sin reglas solapadas y `scripts/pwa/headers.test.ts`. Falta el `curl -I` contra una vista previa de Netlify (necesita Netlify).

## 3. Plano sin huecos y precarga de la ruta

- [x] 3.1 Apilar en el visor la capa general (`maxNativeZoom: 0`) debajo de la capa de detalle (niveles 1 y 2) y verificar con un e2e sin conexión que el zoom máximo sobre una zona no visitada muestra la capa general ampliada, sin áreas vacías (captura comparada)
  - Nota: Dos `TileLayer` en `MapaCampus.tsx` (general `maxNativeZoom: 0` y detalle encima); solo las fallas de la general pasan al respaldo. E2E con captura comparada en `plano.spec.ts`.
- [x] 3.2 Al mostrar una ruta con conexión, calcular las teselas de los niveles 1 y 2 que cubren sus límites más 64 unidades y pedirlas con prioridad baja cuando el navegador está ocioso, salvo con `saveData`; verificar con un test unitario la lista de teselas para la ruta Dir. de Alumnos → Dto. de Salud y con un e2e que después del corte esas teselas salen de la caché
  - Nota: `src/conexion/precarga.ts` (test unitario: 12 + 35 teselas), conectado en `useSinConexionApp`. E2E de la precarga y del ahorro de datos en `plano.spec.ts`.

## 4. Conexión: aviso "Sin conexión" y reintentar

- [x] 4.1 Implementar el estado de conexión basado en fallas reales de las peticiones (error de red o timeout) y en los eventos `online`/`offline`; verificar con tests unitarios que un `TypeError` o un timeout de cierres o clima pasa a "sin conexión" y que `navigator.onLine === true` con peticiones fallidas también
- [x] 4.2 Implementar la barra "Sin conexión" con "Reintentar" (arriba de la hoja, `role="status"`, botón deshabilitado mientras reintenta) y verificar con un test de componente que no tapa el panel "Cómo llegar" ni la tarjeta resumen a 390 × 844
- [x] 4.3 Implementar "Reintentar": vuelve a pedir cierres y clima sin borrar origen, destino, ruta ni alternativa, y aplica la ruta nueva con el mensaje "Actualizamos la ruta con los datos nuevos" si cambió; verificar con un e2e sin red (todo queda igual) y con un cierre nuevo al volver la red (la ruta evita el tramo)
  - Nota: E2E en `recorrido.spec.ts`. El corte "sin salida a internet" se simula con `context.route(...abort)` y el evento `offline`.
- [x] 4.4 Implementar la actualización automática al reconectar sin reemplazar la ruta: aviso "Hay cambios en tu ruta" o "Un tramo de tu ruta está cerrado" con "Ver ruta actualizada"; verificar con un e2e que al volver la red con un cierre nuevo la ruta en pantalla no cambia hasta tocar el botón
- [x] 4.5 Mostrar "Cierres sin actualizar desde las HH:MM" cuando los cierres usados no vienen de la red, y verificar con un test de componente con la hora de la copia y con un caso con cierres de la red, en el que no aparece

## 5. Recorrido guardado

- [x] 5.1 Implementar `src/datos/persistencia.ts` (clave `dq:recorrido:v1`, esquema de la decisión 6, todo en `try/catch`) y verificar con tests unitarios guardar y leer, el JSON roto, el esquema desconocido y el `localStorage` que lanza excepciones
- [x] 5.2 Escribir el recorrido al elegir destino o confirmar origen, al mostrar una ruta y al cambiar de alternativa, y borrarlo con "Finalizar viaje"; verificar con tests de integración del estado que cada evento deja el valor esperado en `localStorage`
- [x] 5.3 Restaurar al arrancar, antes del primer render: dentro de 2 horas y con la misma `versionDatos`, dibujar las rutas guardadas sin recalcular ni esperar la red y luego refrescar en segundo plano; verificar con un e2e que recargar sin conexión muestra la misma ruta "Más resguardada" y con `page.clock` que a las 3 horas no se restaura
- [x] 5.4 Con otra `versionDatos`, recalcular si origen y destino existen o descartar con "No pudimos recuperar tu recorrido anterior"; verificar con tests unitarios de los dos casos
- [x] 5.5 Verificar con un e2e con almacenamiento bloqueado (`localStorage` que lanza en todas las llamadas) que la app calcula y muestra una ruta sin mensajes de error

## 6. Versión nueva

- [x] 6.1 Integrar `useRegisterSW`: buscar actualizaciones al abrir, cada 60 minutos y con `online`, y mostrar "Hay una versión nueva" con "Actualizar" y "Más tarde" solo sin recorrido en pantalla; verificar con tests de componente con el registro simulado (con ruta no aparece; después de "Finalizar viaje" sí)
- [x] 6.2 Hacer que "Actualizar" active la versión en espera y recargue, y que después de recargar se restaure el contexto guardado; verificar con un e2e que sirve dos builds en el mismo puerto y comprueba que el destino elegido sigue después de actualizar
- [x] 6.3 Documentar en el README cómo publicar el plan de salida (`selfDestroying: true`) y verificar en una vista previa que ese build desregistra el service worker y borra las cachés
  - Nota: README, sección "Plan de salida". Verificado con `vite preview` local (test "plan de salida" de `servidor.spec.ts`); no se probó en una vista previa de Netlify.

## 7. Instalación opcional

- [x] 7.1 Completar el manifiesto (nombre, nombre corto, `start_url`, `scope`, `standalone`, `portrait`, colores, `lang` e íconos de 192, 512 y `maskable`) y verificar con un test que valida los campos del manifiesto generado y con el panel Application de Chrome que la app es instalable
  - Nota: La instalabilidad se comprobó con `Page.getInstallabilityErrors` de CDP (lo mismo que muestra el panel Application) en `arranque.spec.ts`.
- [x] 7.2 Capturar `beforeinstallprompt` y ofrecer "Instalar en el celular" en la ayuda, más una única sugerencia después del segundo recorrido terminado, nunca en el primer uso ni con ruta; verificar con tests de componente para los tres casos
- [x] 7.3 Mostrar en la ayuda de iOS los pasos "Compartir → Agregar a inicio" y pedir `navigator.storage.persist()` al detectar la app instalada; verificar con un test de componente con el agente de usuario de Safari para iOS

## 8. Integración

- [ ] 8.1 Suite e2e `tests/e2e/sin-conexion/` contra `vite preview` en Chromium con emulación de celular (390 × 844, táctil): arranque sin red, ruta sin red con elección de criterio, corte con ruta en pantalla y reintentar, recarga con restauración, zoom sin red y cierres sin actualizar; verificar que pasa en CI y que las respuestas clave dicen `fromServiceWorker() === true`
  - Nota: La suite pasa localmente (`npm run test:e2e:sin-conexion` y dentro de `npm run test:e2e`, que es lo que corre el CI), con `fromServiceWorker()` en las respuestas clave. Falta verlo pasar en el CI de GitHub.
- [x] 8.2 Caso e2e con corte real (detener el servidor de preview en medio del recorrido) y verificar que la ruta, el origen y el destino siguen visibles y que aparece "Sin conexión"
- [ ] 8.3 Lista de chequeo manual en un Android y un iPhone reales sobre la vista previa de Netlify: instalar, abrir en modo avión, pedir una ruta, recargar, volver a la señal y actualizar a una versión nueva; verificar que cada punto se cumple y registrar los resultados en `docs/`
  - Nota: Pendiente: necesita un Android y un iPhone reales sobre la vista previa de Netlify.

## Workflow follow-up

- Archivar el cambio con `openspec archive tolerar-senal-irregular` cuando todas las tareas estén hechas y los specs se hayan sincronizado.
