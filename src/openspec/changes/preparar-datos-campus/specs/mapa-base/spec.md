## Purpose

Proveer el plano del campus que ve el usuario debajo de la ruta: limpio de los elementos de construcción del grafo, alineado con las coordenadas de los nodos y nítido al acercarse en el celular.

## ADDED Requirements

### Requirement: Plano sin elementos de construcción

El plano que ve el usuario MUST NOT mostrar los puntos de puerta, pasillo y entrada ni las aristas del grafo; solo muestra edificios, aulas, pasillos, veredas, exteriores y sus etiquetas.

#### Scenario: Puertas y pasillos sin puntos

- **WHEN** el usuario mira el plano cerca de la puerta del aula 121 de Humanidades
- **THEN** no ve ningún punto celeste ni violeta ni líneas azules del grafo

#### Scenario: Formas grandes del mismo color se conservan

- **WHEN** el plano tiene una forma del mismo celeste que los puntos pero de más de 7 px de lado
- **THEN** esa forma se sigue viendo en el plano

### Requirement: Etiquetas del plano visibles

El plano SHALL mostrar los nombres y números de aulas, edificios y espacios tal como están dibujados en el mapa original del campus.

#### Scenario: Número de aula legible

- **WHEN** el usuario se acerca al aula 121 de Humanidades
- **THEN** ve la etiqueta "121" dibujada sobre el aula

### Requirement: Mismo sistema de coordenadas que el grafo

El plano SHALL usar el mismo sistema de coordenadas que el grafo (origen arriba a la izquierda, 1587,4 × 3004,7 unidades), de modo que la posición de cada nodo caiga sobre el lugar que representa con un error menor a 1 unidad.

#### Scenario: Nodo sobre su puerta

- **WHEN** se dibuja un marcador en la posición del nodo `puerta-humanidades-121`
- **THEN** el marcador queda sobre la puerta del aula 121 en el plano

#### Scenario: Chequeo automático de alineación

- **WHEN** se comparan las posiciones de todos los nodos con el mapa original que todavía tiene los puntos dibujados
- **THEN** cada posición coincide con un punto celeste o violeta del mapa original
- **AND** la preparación de datos falla si alguna posición no coincide

### Requirement: Nitidez al hacer zoom

El plano SHALL verse nítido en todos los niveles de zoom del visor, con al menos 4 píxeles de imagen por unidad del plano en el zoom máximo, y se carga por partes según la zona visible.

#### Scenario: Etiqueta pequeña en zoom máximo

- **WHEN** el usuario hace zoom máximo sobre una etiqueta de aula
- **THEN** los bordes del texto se ven definidos, sin pixelado visible en un celular de densidad 3x

#### Scenario: Carga de la zona visible

- **WHEN** el usuario está mirando solo el edificio de Humanidades con zoom alto
- **THEN** la app descarga solo las partes del plano que cubren esa zona y sus alrededores

### Requirement: Plano de respaldo

Si las partes del plano por nivel de zoom no se pueden cargar, la app SHALL mostrar el plano completo como una única imagen de menor resolución, en el mismo sistema de coordenadas.

#### Scenario: Falla al cargar las partes del plano

- **WHEN** las partes del plano no se pueden descargar
- **THEN** el usuario ve el plano completo en una sola imagen
- **AND** la ruta se sigue dibujando en el lugar correcto
