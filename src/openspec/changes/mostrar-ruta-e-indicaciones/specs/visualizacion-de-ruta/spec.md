## Purpose

Mostrar sobre el mapa y en la hoja inferior la ruta obtenida: la espera mientras se calcula, el trazado con sus tramos al aire libre, el origen y el destino, el resumen de tiempo y distancia y las alternativas para elegir con un toque.

## ADDED Requirements

### Requirement: Indicador de búsqueda del camino

Mientras se obtiene una ruta, el sistema SHALL mostrar "Buscando el camino…" con un indicador de progreso en la hoja inferior si la espera supera 150 ms. Una vez visible, el indicador MUST permanecer al menos 400 ms.

#### Scenario: Espera visible con clima lento

- **WHEN** el usuario confirma origen Dir. de Alumnos y destino Dto. de Salud con el escenario de clima `lento`
- **THEN** la hoja muestra "Buscando el camino…" con un indicador de progreso
- **AND** el indicador desaparece cuando aparece la ruta

#### Scenario: Respuesta inmediata sin parpadeo

- **WHEN** la ruta se obtiene en menos de 150 ms
- **THEN** el indicador "Buscando el camino…" no aparece

#### Scenario: La ruta anterior se quita al pedir otra

- **WHEN** hay una ruta en pantalla y el usuario cambia el origen
- **THEN** la ruta anterior deja de verse en el mapa mientras se obtiene la nueva

### Requirement: Dibujo de la ruta elegida

El sistema SHALL dibujar la ruta elegida sobre el mapa como una línea azul `#1A73E8` con borde más oscuro, que une en orden todos los puntos de la ruta desde la puerta de origen hasta la puerta de destino.

#### Scenario: Ruta entre dos edificios

- **WHEN** se obtiene la ruta más corta de Dir. de Alumnos a Dto. de Salud
- **THEN** el mapa muestra una línea azul con borde oscuro que sale de la puerta de Dir. de Alumnos, pasa por `entrada-salud-01` y termina en la puerta de Dto. de Salud

#### Scenario: Ruta por encima de los tramos cerrados

- **WHEN** la ruta pasa junto a un tramo cerrado que se muestra en el mapa
- **THEN** la línea de la ruta se ve por encima del tramo cerrado

### Requirement: Tramos al aire libre diferenciados

El sistema SHALL dibujar los tramos de la ruta que van al aire libre con un trazo punteado del mismo azul, distinguible sin depender del color, y los tramos bajo techo con trazo continuo, llueva o no.

#### Scenario: Tramo por la vereda punteado

- **WHEN** se muestra la ruta más corta de Dir. de Alumnos a Dto. de Salud
- **THEN** el tramo entre `pasillo-economicas-44` y `entrada-salud-01` se ve punteado
- **AND** los tramos dentro de Económicas y de Salud se ven continuos

#### Scenario: Mismo trazo sin lluvia

- **WHEN** el escenario de clima es `seco` y la ruta tiene tramos al aire libre
- **THEN** esos tramos se ven punteados igual que con lluvia

### Requirement: Leyenda de tramos al aire libre

Cuando la ruta mostrada tiene algún tramo al aire libre, el sistema SHALL mostrar en el mapa una leyenda que explique el trazo continuo ("Bajo techo") y el punteado ("Al aire libre"), sin tapar la ruta ni los controles.

#### Scenario: Ruta con tramos exteriores

- **WHEN** se muestra una ruta que incluye 60 m al aire libre
- **THEN** el mapa muestra la leyenda "Bajo techo" y "Al aire libre"

#### Scenario: Ruta toda bajo techo

- **WHEN** se muestra la ruta de Aula 121 a Aula 110 de Humanidades, sin tramos al aire libre
- **THEN** el mapa no muestra la leyenda

### Requirement: Marcadores de origen y destino

El sistema SHALL marcar el origen con un círculo azul con borde blanco y el destino con un pin rojo `#EA4335`, ubicados en las puertas que usa la ruta.

#### Scenario: Marcadores en las puertas usadas

- **WHEN** se muestra la ruta de Dir. de Alumnos a Dto. de Salud
- **THEN** hay un círculo azul con borde blanco en la puerta de Dir. de Alumnos
- **AND** hay un pin rojo en la puerta de Dto. de Salud

#### Scenario: Lugar con varias puertas

- **WHEN** la ruta al Gimnasio llega por la puerta `puerta-servicios-gimnasio-2`
- **THEN** el pin rojo se ubica en esa puerta y no en las otras puertas del Gimnasio

### Requirement: Encuadre automático de la ruta

Al mostrar una ruta nueva o al cambiar de alternativa, el sistema SHALL ajustar el mapa para que la ruta completa quede visible en la zona que no tapan la tarjeta superior ni la hoja inferior a altura media.

#### Scenario: Ruta visible en un celular

- **WHEN** aparece la ruta de Dir. de Alumnos a Dto. de Salud en una pantalla de 390 × 844 px
- **THEN** el origen, el destino y toda la línea quedan dentro del área visible del mapa
- **AND** ninguna parte de la ruta queda debajo de la tarjeta superior ni de la hoja inferior

#### Scenario: Sin reencuadre al mover el mapa

- **WHEN** el usuario arrastra el mapa después de que apareció la ruta
- **THEN** el mapa no vuelve solo al encuadre de la ruta

### Requirement: Tarjeta resumen de la ruta

El sistema SHALL mostrar en la hoja inferior una tarjeta resumen con el tiempo estimado y la distancia redondeada a 5 m, y con "Incluye N m al aire libre" o "Todo bajo techo" según los metros al aire libre de la ruta mostrada.

#### Scenario: Resumen con tramo exterior

- **WHEN** se muestra la ruta más corta de Dir. de Alumnos a Dto. de Salud, de 163 m con 62 m al aire libre
- **THEN** la tarjeta muestra "2 min · 165 m"
- **AND** muestra "Incluye 60 m al aire libre"

#### Scenario: Resumen sin tramo exterior

- **WHEN** se muestra una ruta sin metros al aire libre
- **THEN** la tarjeta muestra "Todo bajo techo"

#### Scenario: Pocos metros al aire libre

- **WHEN** la ruta tiene 2 m al aire libre
- **THEN** la tarjeta muestra "Incluye 5 m al aire libre" y no "Todo bajo techo"

### Requirement: Alternativas como chips

Cuando hay dos rutas distintas, el sistema SHALL mostrarlas como chips con su nombre y tiempo, con la recomendada primero. La resguardada se llama "Techada" si no tiene metros al aire libre y "Más resguardada" si tiene; la más corta, "Más rápida".

#### Scenario: Con lluvia y dos rutas distintas

- **WHEN** llueve y la ruta de Dir. de Alumnos a Dto. de Salud tiene una alternativa resguardada con 40 m al aire libre
- **THEN** el primer chip dice "Más resguardada · 4 min" con el subtítulo "Recomendada con lluvia" y está seleccionado
- **AND** el segundo chip dice "Más rápida · 2 min"

#### Scenario: Resguardada sin metros al aire libre

- **WHEN** la ruta resguardada recomendada no tiene metros al aire libre
- **THEN** su chip dice "Techada"

#### Scenario: Clima desconocido

- **WHEN** falló la consulta del clima y el usuario eligió un criterio
- **THEN** ningún chip muestra "Recomendada con lluvia"

### Requirement: Cambio entre alternativas

Al tocar un chip de alternativa, el sistema SHALL mostrar esa ruta con su trazado, su tarjeta resumen y sus indicaciones, sin volver a calcularla ni a consultar la red.

#### Scenario: Elegir la más rápida con lluvia

- **WHEN** llueve, se muestra la ruta "Más resguardada" y el usuario toca "Más rápida · 2 min"
- **THEN** el mapa muestra la ruta más corta encuadrada
- **AND** la tarjeta muestra "2 min · 165 m" e "Incluye 60 m al aire libre"
- **AND** no aparece "Buscando el camino…"

#### Scenario: Cambio sin conexión

- **WHEN** el dispositivo está sin conexión y el usuario toca el otro chip
- **THEN** la otra ruta se muestra igual

### Requirement: Alternativa no elegida visible

Cuando hay dos rutas distintas, el sistema SHALL dibujar la ruta no elegida en gris, por debajo de la elegida, y SHALL seleccionarla si el usuario la toca en el mapa.

#### Scenario: Alternativa en gris

- **WHEN** se muestra la ruta "Más resguardada" y existe la "Más rápida"
- **THEN** la ruta más rápida se ve en gris debajo de la azul

#### Scenario: Tocar la línea gris

- **WHEN** el usuario toca la línea gris de la alternativa
- **THEN** esa ruta pasa a ser la elegida, igual que si hubiera tocado su chip

### Requirement: Ruta única con su motivo

Cuando hay una sola ruta para mostrar, el sistema SHALL omitir los chips. Si llueve, SHALL explicar por qué hay una sola: "Ya es techada" cuando no tiene metros al aire libre y "Es la opción más resguardada" cuando tiene.

#### Scenario: Sin lluvia

- **WHEN** el escenario de clima es `seco`
- **THEN** la hoja muestra una sola ruta sin chips de alternativas

#### Scenario: Con lluvia y ruta ya techada

- **WHEN** llueve y la ruta de Aula 121 a Aula 110 de Humanidades no tiene tramos al aire libre
- **THEN** la hoja muestra la ruta sin chips y el texto "Ya es techada"

### Requirement: Acceso a las indicaciones

La hoja de resultado SHALL ofrecer un botón "Indicaciones" que abre la lista paso a paso de la ruta mostrada, y SHALL permitir volver a la vista de resultado sin perder la ruta.

#### Scenario: Abrir y volver

- **WHEN** el usuario toca "Indicaciones" y luego vuelve con la flecha atrás
- **THEN** ve la lista paso a paso y después la tarjeta resumen con la misma ruta y la misma alternativa elegida

### Requirement: Finalizar el viaje

La hoja de resultado SHALL ofrecer "Finalizar viaje", que quita la ruta, los marcadores y la leyenda del mapa y vuelve a la pantalla inicial.

#### Scenario: Cerrar el recorrido al llegar

- **WHEN** el usuario toca "Finalizar viaje"
- **THEN** el mapa deja de mostrar la ruta y los marcadores
- **AND** la pantalla vuelve al estado inicial con la búsqueda "¿A dónde vas?"

### Requirement: Anuncio accesible de la ruta

Cuando aparece una ruta, el sistema SHALL anunciar a los lectores de pantalla el tiempo, la distancia y los metros al aire libre, y todos los controles de la vista de resultado MUST medir al menos 44 × 44 px.

#### Scenario: Lector de pantalla

- **WHEN** aparece la ruta más corta de Dir. de Alumnos a Dto. de Salud con un lector de pantalla activo
- **THEN** se anuncia "Ruta encontrada: 2 min, 165 m, incluye 60 m al aire libre"

#### Scenario: Objetivos táctiles

- **WHEN** se miden los chips y los botones "Indicaciones" y "Finalizar viaje"
- **THEN** cada uno tiene un área táctil de al menos 44 × 44 px
