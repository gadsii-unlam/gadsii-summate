## Purpose

Calcular, con búsqueda A\* sobre el grafo del campus, el recorrido óptimo entre un lugar de origen y un lugar de destino según el criterio elegido (más corta o resguardada), respetando los tramos que no se pueden usar y devolviendo todo lo que la app necesita para mostrarlo.

## ADDED Requirements

### Requirement: Ruta óptima calculada con A\*

El sistema SHALL calcular cada ruta con búsqueda A\* guiada por la distancia Manhattan al destino y SHALL devolver siempre un recorrido de costo mínimo para el criterio pedido: ningún otro camino del grafo disponible puede tener un costo menor.

#### Scenario: Coincide con la búsqueda exhaustiva en todos los pares de puertas

- **WHEN** se calcula la ruta `mas-corta` entre cada par de puertas del campus sin tramos excluidos
- **THEN** la distancia de cada ruta es igual a la distancia mínima obtenida por una búsqueda exhaustiva de referencia sobre el mismo grafo

#### Scenario: La heurística nunca sobreestima

- **WHEN** se evalúa la heurística desde cualquier nodo hacia cualquier puerta destino
- **THEN** su valor es menor o igual a la distancia real más corta entre ambos
- **AND** para cada arista se cumple que la heurística en un extremo es menor o igual al largo de la arista más la heurística en el otro extremo

### Requirement: Criterio más corta

Con el criterio `mas-corta`, el sistema SHALL devolver el recorrido de menor distancia total. Si hay varios recorridos con exactamente la misma distancia, SHALL elegir el que tenga menos metros al aire libre.

#### Scenario: Ruta más corta entre dos aulas de Humanidades

- **WHEN** se pide la ruta `mas-corta` de `puerta-humanidades-121` a `puerta-humanidades-110`
- **THEN** la distancia es 240,88 px y no tiene metros al aire libre

#### Scenario: Empate de distancia resuelto por menos exterior

- **WHEN** se pide la ruta `mas-corta` de `puerta-servicios-biblioteca` a `puerta-economicas-dto-de-economicas`, que tiene dos recorridos de 752,29 px
- **THEN** el sistema devuelve el recorrido con 249,82 px al aire libre y no el de 381,1 px

### Requirement: Criterio resguardada

Con el criterio `resguardada`, el sistema SHALL devolver el recorrido con menos metros al aire libre y, entre los que empatan en metros al aire libre, el de menor distancia total, aunque sea más largo que la ruta más corta.

#### Scenario: Se desvía para reducir la vereda

- **WHEN** se pide la ruta `resguardada` de `puerta-economicas-309` a `puerta-humanidades-103`
- **THEN** el recorrido tiene 261,09 px al aire libre en lugar de los 628,69 px de la ruta más corta
- **AND** su distancia total es 1505,23 px

#### Scenario: Coincide con la más corta cuando no hay forma de reducir el exterior

- **WHEN** se pide la ruta `resguardada` de `entrada-central-principal` a `puerta-humanidades-121`
- **THEN** el recorrido es el mismo que el de la ruta `mas-corta`, con 668,86 px de distancia

### Requirement: Lugares con varias puertas

El sistema SHALL aceptar como origen y como destino un conjunto de puertas, SHALL elegir el par de puertas que da el mejor recorrido según el criterio e SHALL informar qué puerta de origen y qué puerta de destino se usaron.

#### Scenario: Llegar al Gimnasio por la puerta más conveniente

- **WHEN** se pide la ruta `mas-corta` de `puerta-humanidades-121` al Gimnasio, con las puertas `puerta-servicios-gimnasio`, `puerta-servicios-gimnasio-2` y `puerta-servicios-gimnasio-3`
- **THEN** la ruta entra por `puerta-servicios-gimnasio-2` con 518,46 px de distancia
- **AND** el resultado informa `puerta-servicios-gimnasio-2` como puerta de destino

### Requirement: Tramos excluidos

El sistema SHALL recibir un conjunto de nodos y aristas excluidos y SHALL calcular la ruta sin pasar por ninguno de ellos. Excluir un nodo SHALL equivaler a excluir todas sus aristas. Una puerta excluida no se puede usar como puerta de origen ni de destino.

#### Scenario: Desvío cuando se excluye el paso entre Salud y Derecho

- **WHEN** se pide la ruta `mas-corta` de `puerta-salud-511` a `puerta-derecho-lab-de-microscopia` con el nodo `entrada-salud-02` excluido
- **THEN** la ruta no pasa por `entrada-salud-02`
- **AND** su distancia es 560,23 px en lugar de 483,23 px

#### Scenario: Se usa otra puerta del destino

- **WHEN** se pide la ruta de `puerta-humanidades-121` al Gimnasio con `puerta-servicios-gimnasio-2` excluida
- **THEN** la ruta entra por `puerta-servicios-gimnasio-3`

### Requirement: Recorrido devuelto

Cuando hay ruta, el sistema SHALL devolver la secuencia ordenada de nodos y de aristas desde la puerta de origen hasta la puerta de destino, y la polilínea en coordenadas del mapa del campus, sin puntos repetidos consecutivos, lista para dibujarse sobre el plano.

#### Scenario: La polilínea sigue los nodos del recorrido

- **WHEN** se obtiene una ruta
- **THEN** el primer punto de la polilínea es la posición de la puerta de origen y el último es la posición de la puerta de destino
- **AND** cada tramo consecutivo de la polilínea es horizontal o vertical

### Requirement: Distancia y tiempo estimado

El sistema SHALL informar la distancia de la ruta en px del mapa y en metros, usando la conversión de px a metros del grafo, y el tiempo estimado a 1,2 m/s redondeado al minuto más cercano, con un mínimo de 1 minuto.

#### Scenario: Ruta de cinco minutos

- **WHEN** se obtiene la ruta `mas-corta` de `puerta-humanidades-121` a `puerta-derecho-lab-de-microscopia` con una conversión de 0,35 m por px
- **THEN** la distancia es 1056,2 px, unos 370 m, y el tiempo estimado es 5 min

#### Scenario: Ruta muy corta

- **WHEN** se obtiene una ruta de menos de 30 segundos de caminata
- **THEN** el tiempo estimado es 1 min

### Requirement: Metros al aire libre

El sistema SHALL informar cuánto del recorrido pasa por tramos exteriores, en px y en metros, sumando el largo de las aristas clasificadas como exteriores en el grafo.

#### Scenario: Ruta que cruza la vereda

- **WHEN** se obtiene la ruta `mas-corta` de `entrada-central-principal` a `puerta-humanidades-121`
- **THEN** el resultado informa 266,25 px al aire libre, unos 93 m

#### Scenario: Ruta totalmente interior

- **WHEN** se obtiene la ruta de `puerta-salud-511` a `puerta-derecho-lab-de-microscopia` sin tramos excluidos
- **THEN** el resultado informa 0 m al aire libre

### Requirement: Resultado determinista

El sistema SHALL devolver exactamente la misma ruta cada vez que recibe la misma consulta sobre el mismo grafo, aunque existan varios recorridos de igual costo, y sin depender del orden en que estén cargadas las aristas.

#### Scenario: Misma consulta, mismo resultado

- **WHEN** se repite cien veces la misma consulta, cargando las aristas en un orden distinto cada vez
- **THEN** las cien respuestas tienen la misma secuencia de nodos

### Requirement: Sin ruta

Si ninguna puerta de origen puede llegar a ninguna puerta de destino con los tramos disponibles, el sistema SHALL devolver un resultado "sin ruta" que indique si el problema es que no quedan puertas de origen, que no quedan puertas de destino o que no hay camino entre ellas.

#### Scenario: Destino aislado por exclusiones

- **WHEN** se pide la ruta de `entrada-central-principal` a `puerta-artes-y-medios-estudio-2` con `pasillo-artes-y-medios-06` excluido
- **THEN** el resultado es "sin ruta" por falta de camino

#### Scenario: Todas las puertas del destino excluidas

- **WHEN** se pide la ruta al Gimnasio con sus tres puertas excluidas
- **THEN** el resultado es "sin ruta" porque no quedan puertas de destino

### Requirement: Origen igual al destino

Si el origen y el destino comparten alguna puerta, el sistema SHALL devolver un resultado "mismo lugar" sin calcular ningún recorrido.

#### Scenario: Mismo lugar

- **WHEN** se pide la ruta de `puerta-humanidades-121` a `puerta-humanidades-121`
- **THEN** el resultado es "mismo lugar" con distancia 0

### Requirement: Consulta con nodos inexistentes

Si la consulta incluye ids de nodos que no existen en el grafo, el sistema SHALL devolver un resultado de consulta inválida con la lista de ids desconocidos y no SHALL intentar calcular la ruta.

#### Scenario: Puerta que no existe

- **WHEN** se pide una ruta con origen `puerta-humanidades-999`
- **THEN** el resultado es una consulta inválida que menciona `puerta-humanidades-999`

### Requirement: Tiempo de cálculo

El sistema SHALL calcular cada ruta en menos de 50 ms en un celular de gama media, para cualquier par de lugares y cualquier criterio, sin bloquear la interfaz de forma perceptible.

#### Scenario: Peor caso con el criterio resguardada

- **WHEN** se calcula la ruta `resguardada` entre los dos lugares más alejados del campus en un celular de gama media emulado
- **THEN** el cálculo termina en menos de 50 ms
