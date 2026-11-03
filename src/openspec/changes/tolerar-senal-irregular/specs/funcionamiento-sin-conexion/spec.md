## Purpose

Que la app siga sirviendo con la señal irregular del campus: abrir, ver el mapa y obtener una ruta sin conexión después de la primera visita, avisar los cortes sin perder lo cargado y conservar el recorrido ante una recarga.

## ADDED Requirements

### Requirement: App disponible sin conexión

Después de una primera visita con conexión, la app SHALL guardar en el dispositivo lo necesario para abrir sin conexión: la interfaz, el grafo, el catálogo de lugares y el plano en los niveles de zoom de vista general.

#### Scenario: Abrir sin conexión

- **WHEN** el usuario visitó la app con conexión, la cierra, pierde la señal y la vuelve a abrir
- **THEN** la app abre y muestra el mapa del campus con la búsqueda "¿A dónde vas?"

#### Scenario: Búsqueda sin conexión

- **WHEN** el usuario está sin conexión y busca "dir de alumnos"
- **THEN** la búsqueda muestra Dir. de Alumnos de Económicas entre los resultados

### Requirement: Plano completo sin huecos sin conexión

Sin conexión, el mapa SHALL mostrar el plano en todo el campus y en todos los niveles de zoom; donde falte el detalle de un nivel alto, SHALL mostrar el nivel general ampliado en el lugar correcto, nunca un área vacía.

#### Scenario: Zoom en una zona no visitada

- **WHEN** el usuario sin conexión hace zoom máximo sobre un edificio que nunca miró de cerca
- **THEN** ve el plano de ese edificio ampliado, aunque menos nítido, sin áreas vacías

### Requirement: Detalle del plano de la ruta guardado

Al mostrar una ruta con conexión, la app SHALL guardar en segundo plano el plano de máximo detalle que cubre la ruta, para que esa zona se vea nítida si después se corta la señal, salvo que el dispositivo tenga activado el ahorro de datos.

#### Scenario: Zoom sobre la ruta después del corte

- **WHEN** el usuario obtuvo la ruta de Dir. de Alumnos a Dto. de Salud con conexión, pierde la señal y hace zoom máximo sobre la entrada de Salud
- **THEN** el plano de esa zona se ve nítido

#### Scenario: Ahorro de datos activado

- **WHEN** el dispositivo tiene activado el ahorro de datos y se muestra una ruta
- **THEN** la app no descarga por adelantado el plano de detalle de la ruta

### Requirement: Cálculo de la ruta sin conexión

El sistema SHALL calcular rutas en el dispositivo sin necesitar conexión, usando los cierres más recientes que tenga guardados.

#### Scenario: Ruta nueva sin señal

- **WHEN** el usuario está sin conexión y elige origen Dir. de Alumnos y destino Dto. de Salud
- **THEN** la app muestra una ruta entre los dos lugares

#### Scenario: Cierre guardado respetado sin conexión

- **WHEN** la app guardó un cierre de `entrada-salud-01` antes de perder la señal y el usuario pide una ruta a Dto. de Salud sin conexión
- **THEN** la ruta no pasa por `entrada-salud-01`

### Requirement: Aviso de cierres sin actualizar

Cuando la ruta se calcula con cierres que no se pudieron actualizar desde la red, la app SHALL avisar que los cierres pueden no estar actualizados e indicar la hora de la copia usada.

#### Scenario: Cierres de una copia guardada

- **WHEN** no hay conexión y los cierres usados se guardaron a las 13:40
- **THEN** la app muestra "Cierres sin actualizar desde las 13:40"

#### Scenario: Cierres actualizados

- **WHEN** los cierres se obtuvieron de la red en el último pedido de ruta
- **THEN** la app no muestra el aviso de cierres sin actualizar

### Requirement: Clima sin conexión como error de clima

Sin conexión, el sistema MUST tratar el estado del clima como desconocido y dejar que el usuario elija el criterio de recorrido. MUST NOT usar un estado de clima guardado de una consulta anterior ni asumir que no llueve.

#### Scenario: Pedido de ruta sin señal

- **WHEN** el usuario pide una ruta sin conexión
- **THEN** la app avisa que no pudo saber si llueve y ofrece elegir entre la ruta más rápida y la más resguardada

#### Scenario: Lluvia consultada antes del corte

- **WHEN** una consulta anterior con conexión informó `lluvia` y ahora el usuario pide otra ruta sin conexión
- **THEN** la app no usa ese `lluvia` guardado y trata el clima como desconocido

### Requirement: Aviso "Sin conexión" con reintentar

Cuando una consulta a la red falla por falta de conexión, la app SHALL mostrar "Sin conexión" con un botón "Reintentar" que vuelve a consultar cierres y clima, sin tapar la ruta ni el panel de origen y destino.

#### Scenario: Corte al pedir la ruta

- **WHEN** el usuario pide una ruta y la consulta de clima falla por falta de conexión
- **THEN** la app muestra "Sin conexión" con el botón "Reintentar"
- **AND** la ruta y el panel de origen y destino siguen visibles

#### Scenario: Reintentar con la señal recuperada

- **WHEN** volvió la señal y el usuario toca "Reintentar"
- **THEN** la app vuelve a consultar cierres y clima
- **AND** el aviso "Sin conexión" desaparece

### Requirement: Reintentar conserva lo cargado

Reintentar o perder la conexión MUST NOT borrar el origen, el destino, la ruta mostrada, la alternativa elegida ni el mapa; si al reintentar los datos nuevos cambian la ruta, la app SHALL mostrar la ruta nueva y avisarlo.

#### Scenario: Reintentar sin señal

- **WHEN** hay una ruta en pantalla, no hay conexión y el usuario toca "Reintentar"
- **THEN** siguen visibles el mismo origen, el mismo destino y la misma ruta

#### Scenario: Reintentar con un cierre nuevo

- **WHEN** el usuario toca "Reintentar", vuelve la conexión y hay un cierre nuevo en un tramo de la ruta mostrada
- **THEN** la app muestra una ruta que evita ese tramo
- **AND** muestra "Actualizamos la ruta con los datos nuevos"

### Requirement: Sin cambios de ruta no pedidos al reconectar

Cuando la conexión vuelve sola, la app SHALL actualizar cierres y clima en segundo plano y MUST NOT reemplazar la ruta en pantalla sin una acción del usuario; si la ruta cambiaría, SHALL ofrecer verla.

#### Scenario: Cierre nuevo en la ruta al reconectar

- **WHEN** la señal vuelve sin que el usuario toque nada y un tramo de la ruta mostrada ahora está cerrado
- **THEN** la ruta en pantalla no cambia sola
- **AND** la app muestra "Un tramo de tu ruta está cerrado" con el botón "Ver ruta actualizada"

#### Scenario: Sin cambios al reconectar

- **WHEN** la señal vuelve y los datos nuevos no cambian la ruta
- **THEN** el aviso "Sin conexión" desaparece y la ruta sigue igual

### Requirement: Recorrido conservado al recargar

La app SHALL guardar en el dispositivo el origen, el destino, la alternativa mostrada y las rutas del recorrido en curso, y SHALL restaurarlos al recargar o reabrir la app dentro de las 2 horas siguientes, con o sin conexión.

#### Scenario: Recarga sin conexión

- **WHEN** el usuario tiene en pantalla la ruta "Más resguardada" de Dir. de Alumnos a Dto. de Salud, pierde la señal y recarga la página
- **THEN** la app muestra el mismo origen, el mismo destino y la misma ruta "Más resguardada"

#### Scenario: El sistema cerró la pestaña

- **WHEN** el sistema operativo cerró la app en segundo plano 20 minutos después de mostrar una ruta y el usuario la vuelve a abrir
- **THEN** la app muestra el mismo recorrido

### Requirement: Vigencia del recorrido guardado

La app MUST NOT restaurar un recorrido guardado hace más de 2 horas ni uno terminado con "Finalizar viaje"; en esos casos SHALL abrir en la pantalla inicial sin ruta.

#### Scenario: Recorrido viejo

- **WHEN** el usuario reabre la app 3 horas después de haber visto una ruta
- **THEN** la app abre sin ruta ni destino elegido

#### Scenario: Viaje finalizado

- **WHEN** el usuario tocó "Finalizar viaje" y después recarga la página
- **THEN** la app abre sin ruta

### Requirement: Recorrido guardado con datos de otra versión

Si el recorrido guardado corresponde a otra versión de los datos del campus, la app SHALL recalcular la ruta con los datos actuales cuando el origen y el destino siguen existiendo, y SHALL descartarlo con un aviso cuando no.

#### Scenario: Lugares que siguen existiendo

- **WHEN** se publicó una versión nueva del grafo y el recorrido guardado va de Dir. de Alumnos a Dto. de Salud
- **THEN** la app restaura el origen y el destino y muestra la ruta calculada con el grafo nuevo

#### Scenario: Lugar que ya no existe

- **WHEN** el destino del recorrido guardado ya no existe en el catálogo nuevo
- **THEN** la app abre sin ruta y muestra "No pudimos recuperar tu recorrido anterior"

### Requirement: Funcionamiento sin almacenamiento local

Si el dispositivo no permite guardar datos locales, la app SHALL funcionar igual, sin restaurar el recorrido y sin mostrar errores.

#### Scenario: Navegación privada

- **WHEN** el navegador bloquea el almacenamiento local y el usuario pide una ruta
- **THEN** la ruta se muestra normalmente
- **AND** no aparece ningún mensaje de error

### Requirement: Aviso de versión nueva sin interrumpir

Cuando hay una versión nueva de la app o de los datos, la app SHALL ofrecer "Hay una versión nueva" con "Actualizar" solo si no hay un recorrido en pantalla, y MUST NOT recargarse sola.

#### Scenario: Versión nueva sin recorrido

- **WHEN** se publicó una versión nueva y el usuario está en la pantalla inicial
- **THEN** la app muestra "Hay una versión nueva" con el botón "Actualizar"

#### Scenario: Versión nueva durante un recorrido

- **WHEN** se publicó una versión nueva mientras el usuario sigue una ruta
- **THEN** la app no muestra el aviso ni se recarga
- **AND** muestra el aviso después de que el usuario toca "Finalizar viaje"

#### Scenario: Actualizar conserva el contexto

- **WHEN** el usuario toca "Actualizar" con un destino elegido y sin ruta
- **THEN** la app se recarga con la versión nueva y el destino sigue elegido

### Requirement: Instalación opcional en la pantalla de inicio

La app SHALL poder instalarse en la pantalla de inicio de Android e iOS y abrirse a pantalla completa como una app. La opción de instalar SHALL ofrecerse desde la ayuda y desde un botón flotante "Instalar app" arriba del de ayuda, y MUST NOT aparecer en el primer uso ni con una ruta en pantalla.

#### Scenario: Instalar desde la ayuda en Android

- **WHEN** el usuario abre la ayuda en Chrome para Android y toca "Instalar en el celular"
- **THEN** el sistema ofrece agregar "Dónde queda" a la pantalla de inicio

#### Scenario: Botón flotante "Instalar app"

- **WHEN** el usuario toca el botón "Instalar app" en Chrome para Android
- **THEN** el sistema ofrece agregar "Dónde queda" a la pantalla de inicio
- **WHEN** lo toca en Safari para iOS
- **THEN** se abre la ayuda en los pasos para agregar la app desde el menú Compartir

#### Scenario: Instrucciones en iPhone

- **WHEN** el usuario abre la ayuda en Safari para iOS
- **THEN** ve los pasos para agregar la app a la pantalla de inicio desde el menú Compartir

#### Scenario: Primer uso sin sugerencia

- **WHEN** el usuario abre la app por primera vez
- **THEN** no aparece ninguna sugerencia de instalación

#### Scenario: App instalada sin conexión

- **WHEN** el usuario abre la app instalada desde la pantalla de inicio sin conexión
- **THEN** la app abre a pantalla completa, sin la barra del navegador, y muestra el mapa
