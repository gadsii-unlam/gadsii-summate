## Purpose

Proveer a la app el grafo de pasillos y veredas del campus UNLaM ya validado, con cada tramo clasificado como interior o exterior y con su distancia en metros, para que el cálculo de rutas trabaje sobre datos confiables.

## ADDED Requirements

### Requirement: Carga del grafo del campus

La app SHALL disponer de un grafo del campus con todos los nodos exportados del plano (puertas, pasillos y entradas), cada uno con su id, tipo, departamento y posición en las coordenadas del plano, y con todas las aristas que unen nodos vecinos.

#### Scenario: Grafo completo a partir del plano actual

- **WHEN** se preparan los datos a partir del grafo exportado actual
- **THEN** el grafo de la app tiene 685 nodos (283 puertas, 373 pasillos y 29 entradas) y 722 aristas
- **AND** cada nodo conserva el id que tiene en el plano, por ejemplo `puerta-humanidades-121` o `pasillo-central-07`

#### Scenario: Posición de un nodo

- **WHEN** se consulta el nodo `entrada-central-principal`
- **THEN** su posición es x = 578, y = 2868 en las coordenadas del plano

### Requirement: Grafo conexo

La preparación de datos MUST rechazar un grafo en el que exista algún nodo al que no se pueda llegar desde los demás, e informar qué nodos quedaron separados.

#### Scenario: Grafo conexo aceptado

- **WHEN** se preparan los datos con el grafo actual, en el que se puede ir de cualquier nodo a cualquier otro
- **THEN** la preparación termina sin error de conectividad

#### Scenario: Componente separado rechazado

- **WHEN** se agregan dos nodos de pasillo unidos entre sí por una arista pero sin ninguna arista hacia el resto del grafo
- **THEN** la preparación falla
- **AND** el mensaje nombra los nodos que quedaron separados

### Requirement: Aristas solo horizontales o verticales

La preparación de datos MUST rechazar cualquier arista cuyos extremos difieran a la vez en x y en y en más de 0,6 px, e informar el id de cada arista en diagonal.

#### Scenario: Arista recta aceptada

- **WHEN** una arista une dos nodos con la misma y y distinta x
- **THEN** la arista se acepta

#### Scenario: Arista en diagonal rechazada

- **WHEN** una arista une dos nodos que difieren 10 px en x y 3 px en y
- **THEN** la preparación falla
- **AND** el mensaje incluye el id de esa arista

#### Scenario: Desfase dentro de la tolerancia

- **WHEN** una arista casi horizontal une dos nodos que difieren 40 px en x y 0,5 px en y
- **THEN** la arista se acepta como recta

### Requirement: Sin nodos aislados

La preparación de datos MUST rechazar un grafo en el que algún nodo no tenga ninguna arista, e informar el id de ese nodo.

#### Scenario: Nodo sin aristas rechazado

- **WHEN** se agrega un nodo de pasillo nuevo sin conectarlo con ninguna arista
- **THEN** la preparación falla
- **AND** el mensaje nombra ese nodo

### Requirement: Identificadores únicos y referencias válidas

La preparación de datos MUST rechazar un grafo con ids de nodo repetidos, ids de arista repetidos o aristas cuyos extremos no existan como nodos.

#### Scenario: Id de nodo repetido

- **WHEN** dos nodos distintos tienen el id `pasillo-economicas-19`
- **THEN** la preparación falla nombrando el id repetido

#### Scenario: Arista hacia un nodo inexistente

- **WHEN** una arista une `pasillo-salud-03` con `pasillo-salud-99` y `pasillo-salud-99` no existe
- **THEN** la preparación falla nombrando la arista y el nodo faltante

### Requirement: Reporte de casos a revisar

La preparación de datos SHALL informar, sin detenerse, los casos dudosos del grafo: nodos distintos en la misma posición, aristas de longitud cero y cualquier otro caso anotado como pendiente de revisión por el equipo.

#### Scenario: Duplicados en la misma posición

- **WHEN** se preparan los datos con el grafo actual
- **THEN** el reporte lista los pares `puerta-humanidades-130` / `puerta-humanidades-130-2` y `pasillo-economicas-19` / `pasillo-economicas-20`
- **AND** la preparación termina con éxito y genera los datos

#### Scenario: Arista de longitud cero

- **WHEN** se preparan los datos con el grafo actual
- **THEN** el reporte lista la arista entre `pasillo-economicas-19` y `pasillo-economicas-20` como de longitud cero

### Requirement: Longitud de cada tramo

Cada arista SHALL tener como longitud la distancia entre sus dos extremos en las coordenadas del plano, de modo que nunca sea menor que la distancia horizontal más la vertical entre ellos.

#### Scenario: Longitud de una arista horizontal

- **WHEN** una arista une un nodo en (100, 200) con otro en (160, 200)
- **THEN** su longitud es 60 px

#### Scenario: Longitud registrada distinta de la geométrica

- **WHEN** el grafo exportado indica para una arista una longitud que difiere en más de 0,1 px de la distancia entre sus extremos
- **THEN** la arista toma la distancia entre sus extremos
- **AND** el reporte de casos a revisar menciona la diferencia

### Requirement: Clasificación interior o exterior de cada tramo

Cada arista SHALL quedar marcada como exterior si al menos uno de sus extremos es un nodo de la red de veredas del campus (los nodos `pasillo-central-*` y `entrada-central-*`), y como interior en cualquier otro caso, incluidos los pasos entre edificios.

#### Scenario: Tramo de vereda

- **WHEN** una arista une `entrada-arquitectura-01` con `pasillo-central-41`
- **THEN** la arista es exterior

#### Scenario: Paso interno entre edificios

- **WHEN** una arista une `entrada-salud-02` con un pasillo de Derecho
- **THEN** la arista es interior

#### Scenario: Totales con el grafo actual

- **WHEN** se preparan los datos con el grafo actual
- **THEN** hay 113 aristas exteriores y 609 interiores

### Requirement: Distancia en metros

Cada arista SHALL incluir su distancia en metros, calculada como su longitud en px multiplicada por un factor de metros por px que el equipo puede cambiar sin tocar el resto de la app.

#### Scenario: Conversión con el factor inicial

- **WHEN** el factor es 0,35 m por px y una arista mide 100 px
- **THEN** su distancia es 35 m

#### Scenario: Cambio del factor tras calibrar

- **WHEN** el equipo cambia el factor a 0,30 m por px y vuelve a preparar los datos
- **THEN** esa misma arista de 100 px pasa a medir 30 m
- **AND** el grafo de la app informa el factor usado
