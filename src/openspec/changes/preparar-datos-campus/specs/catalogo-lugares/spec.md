## Purpose

Definir qué lugares del campus puede elegir el usuario como origen o destino y cómo se presentan: nombre legible, edificio, categoría, puertas, alias, referencias reconocibles y piso, con los mismos nombres en toda la interfaz.

## ADDED Requirements

### Requirement: Un lugar por cada aula o espacio con puerta

El catálogo SHALL contener un lugar por cada aula o espacio que tenga al menos un punto de puerta en el grafo, identificado de forma estable a partir del id de su puerta principal sin el prefijo `puerta-`.

#### Scenario: Aula con una puerta

- **WHEN** el grafo tiene el nodo `puerta-humanidades-121`
- **THEN** el catálogo tiene el lugar `humanidades-121` con esa única puerta

#### Scenario: Cantidad de lugares con el grafo actual

- **WHEN** se preparan los datos con el grafo actual y sin curaciones que cambien agrupaciones
- **THEN** el catálogo tiene 272 lugares derivados de las 283 puertas, además de las entradas al campus

### Requirement: Lugares con varias puertas

Una puerta cuyo id termina en `-2`, `-3`, etc. SHALL agruparse con el lugar cuya puerta tiene el mismo id sin ese sufijo cuando esa puerta existe o cuando lo que queda es un número de aula; en otro caso el sufijo forma parte del nombre y la puerta es un lugar propio.

#### Scenario: Gimnasio con tres puertas

- **WHEN** el grafo tiene `puerta-servicios-gimnasio`, `puerta-servicios-gimnasio-2` y `puerta-servicios-gimnasio-3`
- **THEN** el catálogo tiene un solo lugar Gimnasio con esas tres puertas

#### Scenario: Sufijo que es parte del nombre

- **WHEN** el grafo tiene `puerta-artes-y-medios-estudio-2` y no existe `puerta-artes-y-medios-estudio`
- **THEN** el catálogo tiene el lugar "Estudio 2" con una sola puerta

#### Scenario: Aula numerada con sufijo y sin puerta base

- **WHEN** el grafo tiene `puerta-formacion-continua-230-3` y no tiene `puerta-formacion-continua-230`
- **THEN** el catálogo tiene el lugar "Aula 230" con esa puerta
- **AND** el reporte de casos a revisar menciona la puerta con sufijo sin puerta base

#### Scenario: Agrupación definida a mano

- **WHEN** el equipo indica a mano qué puertas forman un lugar
- **THEN** el catálogo usa esa agrupación en lugar de la automática

### Requirement: Nombre visible del lugar

Cada lugar SHALL tener un nombre visible legible, con tildes y mayúsculas: el nombre cargado a mano por el equipo si existe y, si no, uno derivado del id de la puerta.

#### Scenario: Nombre derivado de un aula numerada

- **WHEN** el lugar `humanidades-121` no tiene nombre cargado a mano
- **THEN** su nombre visible es "Aula 121"

#### Scenario: Nombre derivado con tildes y abreviaturas

- **WHEN** el lugar `derecho-lab-de-microscopia` no tiene nombre cargado a mano
- **THEN** su nombre visible es "Lab. de Microscopía"

#### Scenario: Nombre cargado a mano

- **WHEN** el equipo carga el nombre "Baños de mujeres" para el lugar `humanidades-banos-mujeres`
- **THEN** su nombre visible es "Baños de mujeres"

### Requirement: Edificio del lugar

Cada lugar SHALL indicar el edificio visible al que pertenece, con un nombre legible definido por el equipo para cada departamento; los servicios con edificio propio, como Biblioteca o Teatro, usan su propio nombre como edificio.

#### Scenario: Aula de un departamento

- **WHEN** se consulta el lugar `economicas-320`
- **THEN** su edificio es el nombre visible definido para el departamento de Económicas

#### Scenario: Servicio con edificio propio

- **WHEN** se consulta el lugar `servicios-teatro`
- **THEN** su edificio es "Teatro"

### Requirement: Categoría del lugar

Cada lugar SHALL tener una categoría entre aula, laboratorio, baño, oficina, servicio, auditorio y entrada, asignada automáticamente según su id y corregible a mano.

#### Scenario: Categorías automáticas

- **WHEN** se preparan los lugares `humanidades-121`, `derecho-lab-1` y `salud-banos`
- **THEN** sus categorías son aula, laboratorio y baño respectivamente

#### Scenario: Categoría corregida a mano

- **WHEN** el equipo asigna la categoría servicio al lugar `centro-estudiantes-buffet`
- **THEN** el catálogo usa la categoría servicio para ese lugar

### Requirement: Alias de búsqueda

Cada lugar SHALL tener alias de búsqueda: el número del aula cuando el lugar es un aula numerada, más los alias que el equipo cargue a mano.

#### Scenario: Número de aula como alias

- **WHEN** se consulta el lugar `formacion-continua-232`
- **THEN** sus alias incluyen "232"

#### Scenario: Alias cargado a mano

- **WHEN** el equipo carga el alias "Dirección de Alumnos" para el lugar `economicas-dir-de-alumnos`
- **THEN** sus alias incluyen "Dirección de Alumnos"

### Requirement: Referencias reconocibles para el origen

El catálogo SHALL marcar como referencias reconocibles las cinco entradas al campus, la Biblioteca, el Buffet del Centro de Estudiantes, el Salón de las Américas, el Teatro, el Gimnasio y el Sector Administrativo, y SHALL permitir que el equipo agregue o quite referencias a mano.

#### Scenario: Entradas al campus como lugares

- **WHEN** se preparan los datos con el grafo actual
- **THEN** el catálogo incluye cinco lugares de categoría entrada, uno por cada nodo `entrada-central-principal`, `entrada-central-oeste`, `entrada-central-peron-1`, `entrada-central-peron-2` y `entrada-central-la-paz`
- **AND** los cinco están marcados como referencia reconocible

#### Scenario: Referencias del edificio

- **WHEN** se consulta el lugar `servicios-biblioteca`
- **THEN** está marcado como referencia reconocible

### Requirement: Piso del lugar

Cada lugar SHALL indicar su piso; los lugares derivados de puertas del grafo están en planta baja salvo que el equipo cargue otro piso a mano.

#### Scenario: Lugar de planta baja

- **WHEN** se consulta el lugar `humanidades-121`
- **THEN** su piso es planta baja

### Requirement: Lugares en otros pisos

El catálogo SHALL incluir un lugar de un piso sin puntos en el grafo solo si el equipo cargó a mano su piso, las puertas o escaleras de planta baja por las que se llega y una indicación de llegada marcada como verificada.

#### Scenario: Aula del primer piso verificada

- **WHEN** el equipo carga un aula del primer piso de Humanidades con su acceso por una escalera de planta baja y una indicación verificada
- **THEN** el catálogo incluye el lugar con piso 1, esa indicación y como puertas los nodos de acceso de planta baja

#### Scenario: Indicación sin verificar

- **WHEN** el equipo carga un aula de otro piso con una indicación que no está marcada como verificada
- **THEN** el lugar no aparece en el catálogo
- **AND** el reporte de casos a revisar lo menciona

### Requirement: Puertas existentes en el grafo

La preparación de datos MUST rechazar un catálogo en el que algún lugar tenga una puerta o un acceso que no exista como nodo del grafo, e informar el lugar y el id faltante.

#### Scenario: Acceso inexistente

- **WHEN** el equipo carga un lugar con el acceso `pasillo-humanidades-99` y ese nodo no existe
- **THEN** la preparación falla nombrando el lugar y `pasillo-humanidades-99`

#### Scenario: Curación de un lugar que ya no existe

- **WHEN** el equipo tiene cargado un nombre para `humanidades-999` y no existe ninguna puerta para ese lugar
- **THEN** la preparación termina con éxito
- **AND** el reporte de casos a revisar menciona la curación sin lugar

### Requirement: Nombres únicos en toda la interfaz

Toda la interfaz SHALL mostrar cada lugar y cada edificio con el nombre visible del catálogo, sin variantes entre la búsqueda, el panel de recorrido, las indicaciones y el resumen de la ruta.

#### Scenario: Mismo nombre en búsqueda y recorrido

- **WHEN** el usuario elige "Lab. de Microscopía" en la búsqueda y obtiene la ruta
- **THEN** el panel de recorrido, la tarjeta resumen y la última indicación muestran "Lab. de Microscopía"

#### Scenario: Nombre repetido en un mismo edificio

- **WHEN** dos lugares distintos del mismo edificio terminan con el mismo nombre visible
- **THEN** el reporte de casos a revisar menciona los dos lugares

### Requirement: Reporte de lugares pendientes

La preparación de datos SHALL informar, sin detenerse, los lugares que el equipo anotó como pendientes de puerta y los números de aula que faltan entre dos aulas existentes del campus.

#### Scenario: Aula conocida sin puerta

- **WHEN** el equipo anotó como pendiente el aula 340 de Económicas y el grafo no tiene `puerta-economicas-340`
- **THEN** el reporte menciona el aula 340 de Económicas como pendiente
- **AND** la preparación termina con éxito

#### Scenario: Hueco en la numeración

- **WHEN** se preparan los datos con el grafo actual
- **THEN** el reporte menciona como posibles aulas faltantes los números 10, 205, 250, 264, 307 y 340
