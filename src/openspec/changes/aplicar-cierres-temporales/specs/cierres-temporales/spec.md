## Purpose

Respetar los cierres temporales de pasillos, puertas y veredas que el equipo precarga antes de la prueba: excluirlos de toda ruta mientras estén vigentes, avisar qué lugares quedaron sin acceso y por qué, y mostrarlos en el mapa.

## ADDED Requirements

### Requirement: Cierres precargados

El sistema SHALL obtener al iniciar la lista de cierres precargados por el equipo, donde cada cierre tiene un identificador, un motivo, los nodos y/o aristas que cierra y, en forma opcional, una fecha y hora de inicio y de fin.

#### Scenario: Se cargan los cierres publicados

- **WHEN** la app inicia y la lista publicada contiene el cierre `obra-paso-salud-derecho` sobre el nodo `entrada-salud-02`
- **THEN** ese cierre queda disponible para el cálculo de rutas y para el mapa

#### Scenario: Lista vacía

- **WHEN** la lista publicada no contiene cierres
- **THEN** las rutas se calculan sobre el grafo completo y el mapa no muestra tramos cerrados

### Requirement: Respaldo de los cierres sin conexión

Si no se puede descargar la lista de cierres o la respuesta no es válida, el sistema SHALL usar la copia de la lista incluida en la versión publicada de la app y SHALL registrar una advertencia en consola, sin dejar nunca de aplicar los cierres.

#### Scenario: Falla la descarga

- **WHEN** el pedido de la lista de cierres falla por falta de conexión
- **THEN** la app aplica los cierres de la copia incluida
- **AND** una ruta que pasaba por `entrada-salud-02` lo sigue evitando

### Requirement: Vigencia de los cierres

El sistema SHALL aplicar un cierre solo mientras la fecha y hora del dispositivo estén entre su inicio (inclusive) y su fin (exclusive). Un cierre sin inicio SHALL valer desde siempre y uno sin fin SHALL valer hasta que se quite de la lista.

#### Scenario: Cierre todavía no vigente

- **WHEN** un cierre empieza el 03/11 a las 07:00 y el dispositivo marca el 02/11 a las 18:00
- **THEN** las rutas pueden pasar por los tramos de ese cierre y el mapa no lo muestra

#### Scenario: Cierre vencido

- **WHEN** un cierre termina el 05/11 a las 13:00 y el dispositivo marca el 05/11 a las 13:00
- **THEN** el cierre ya no se aplica en el próximo cálculo de ruta

### Requirement: Fecha simulada para verificar cierres

El sistema SHALL permitir al equipo reemplazar la fecha y hora del dispositivo por una fecha indicada en la dirección de la app, para verificar cierres futuros, y SHALL mostrar una etiqueta visible con la fecha simulada mientras esté activa.

#### Scenario: Verificar un cierre del día de la prueba

- **WHEN** el equipo abre la app con la fecha simulada 05/11 a las 10:00
- **THEN** se aplican los cierres vigentes en esa fecha
- **AND** la pantalla muestra "Fecha simulada: 05/11 10:00"

### Requirement: Exclusión de tramos cerrados

El sistema SHALL calcular toda ruta sin pasar por ningún nodo ni arista de un cierre vigente, con cualquier criterio de ruta y cualquier estado del clima.

#### Scenario: Ruta que evita el paso entre Salud y Derecho

- **WHEN** está vigente el cierre del nodo `entrada-salud-02` y se pide la ruta del Aula 511 al Lab. de Microscopía
- **THEN** la ruta no pasa por `entrada-salud-02`
- **AND** la distancia sube de unos 169 m a unos 196 m

#### Scenario: El cierre vale también con lluvia

- **WHEN** está vigente un cierre y se calcula la ruta resguardada
- **THEN** la ruta resguardada tampoco pasa por los tramos cerrados

### Requirement: Cierre de un nodo

Cerrar un nodo SHALL equivaler a cerrar todas sus aristas; si el nodo es una puerta, esa puerta no SHALL usarse para salir ni para entrar.

#### Scenario: Escalera cerrada

- **WHEN** está vigente el cierre del nodo `pasillo-artes-y-medios-06`
- **THEN** ninguna ruta usa las aristas que llegan a `pasillo-artes-y-medios-06`

### Requirement: Aristas en cualquier sentido

El sistema SHALL reconocer una arista cerrada tanto si se la escribe con sus extremos en el orden del grafo como en el orden inverso.

#### Scenario: Arista escrita al revés

- **WHEN** un cierre indica la arista `arista__pasillo-central-67__pasillo-central-65` y en el grafo existe como `arista__pasillo-central-65__pasillo-central-67`
- **THEN** esa arista queda cerrada

### Requirement: Identificadores desconocidos

Si un cierre menciona un nodo o arista que no existe en el grafo, el sistema SHALL ignorar ese identificador, SHALL registrar una advertencia en consola con el identificador y el cierre, y SHALL aplicar el resto del cierre.

#### Scenario: Id con error de tipeo

- **WHEN** un cierre lista los nodos `entrada-salud-02` y `entrada-salud-99`
- **THEN** se cierra `entrada-salud-02`
- **AND** la consola muestra una advertencia que menciona `entrada-salud-99`
- **AND** la app sigue funcionando sin mostrar errores al usuario

### Requirement: Otra puerta del mismo lugar

Si un lugar tiene varias puertas y alguna está cerrada, el sistema SHALL calcular la ruta por las puertas que siguen abiertas.

#### Scenario: Puerta del Gimnasio cerrada

- **WHEN** está vigente el cierre de `puerta-servicios-gimnasio-2` y se pide la ruta del Aula 121 al Gimnasio
- **THEN** la ruta entra por `puerta-servicios-gimnasio-3`

### Requirement: Lugar sin acceso ahora

El sistema SHALL marcar como "Sin acceso ahora" a todo lugar al que no se puede llegar desde ninguna entrada al campus abierta con los cierres vigentes, y SHALL mostrar ese texto en las listas de lugares en lugar de un guion.

#### Scenario: Estudio 2 queda aislado

- **WHEN** está vigente el cierre de `pasillo-artes-y-medios-06`
- **THEN** Estudio 2 aparece como "Sin acceso ahora" en la lista de destinos

#### Scenario: Lugar con otra puerta abierta

- **WHEN** solo está cerrada `puerta-servicios-gimnasio-2`
- **THEN** el Gimnasio no aparece como "Sin acceso ahora"

### Requirement: Sin ruta disponible

Cuando no hay ningún camino posible entre origen y destino por los cierres, el sistema SHALL mostrar "Sin ruta disponible" con el motivo de los cierres que lo impiden, SHALL mantener el destino marcado en el mapa y SHALL ofrecer elegir otro destino o volver al mapa.

#### Scenario: Destino sin acceso elegido igual

- **WHEN** está vigente el cierre "Escalera de Artes y Medios cerrada por mantenimiento" sobre `pasillo-artes-y-medios-06` y el usuario elige Estudio 2 como destino
- **THEN** se muestra "Sin ruta disponible" con el texto "Escalera de Artes y Medios cerrada por mantenimiento"
- **AND** Estudio 2 queda marcado en el mapa
- **AND** se ofrecen las acciones "Elegir otro destino" y "Volver al mapa"

#### Scenario: Origen aislado

- **WHEN** está cerrada la única arista de `entrada-central-principal` y el usuario parte de la Entrada principal
- **THEN** se muestra "Sin ruta disponible" con el motivo de ese cierre

### Requirement: Aviso de desvío por cierre

Si la ruta que se habría calculado sin cierres pasa por algún tramo cerrado vigente, el sistema SHALL acompañar la ruta con el aviso "Evitamos un tramo cerrado" y el motivo del cierre.

#### Scenario: Desvío por la obra entre Salud y Derecho

- **WHEN** está vigente el cierre `obra-paso-salud-derecho` y se pide la ruta del Aula 511 al Lab. de Microscopía
- **THEN** el resultado muestra "Evitamos un tramo cerrado: Obra en el paso entre Salud y Derecho"

#### Scenario: Ruta no afectada

- **WHEN** hay cierres vigentes pero la ruta del Aula 121 al Aula 110 no los cruzaría
- **THEN** el resultado no muestra aviso de desvío

### Requirement: Tramos cerrados visibles en el mapa

El sistema SHALL mostrar en el mapa cada tramo cerrado vigente con una línea roja punteada y un ícono de paso prohibido, haya o no una ruta dibujada, de modo que no dependa solo del color.

#### Scenario: Cierre de una arista de vereda

- **WHEN** está vigente el cierre de `arista__pasillo-central-65__pasillo-central-67`
- **THEN** el mapa muestra ese tramo con línea roja punteada y un ícono de paso prohibido en su punto medio

#### Scenario: Cierre vencido no se dibuja

- **WHEN** un cierre ya no está vigente
- **THEN** el mapa no lo muestra

### Requirement: Detalle del cierre

Al tocar el ícono de un tramo cerrado, el sistema SHALL mostrar el motivo del cierre y, si tiene fecha de fin, hasta cuándo está cerrado.

#### Scenario: Consultar un cierre con fecha de fin

- **WHEN** el usuario toca el ícono del cierre `obra-paso-salud-derecho`, que termina el 14/11 a las 23:00
- **THEN** se muestra "Obra en el paso entre Salud y Derecho" y "Cerrado hasta el 14/11 a las 23:00"
