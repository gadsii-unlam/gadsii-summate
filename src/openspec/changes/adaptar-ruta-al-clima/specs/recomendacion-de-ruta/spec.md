## Purpose

Decidir, según el clima, qué ruta se recomienda y cuál queda como alternativa, para que quien quiere no mojarse y quien quiere llegar rápido encuentren su opción sin pasos extra y con la diferencia a la vista.

## ADDED Requirements

### Requirement: Con lluvia se recomienda la ruta resguardada

Cuando llueve y la ruta resguardada es distinta de la más corta, el sistema SHALL mostrar como recomendada la ruta resguardada.

#### Scenario: Lluvia entre Económicas y Humanidades

- **WHEN** llueve y el usuario pide la ruta del Aula 309 al Aula 103
- **THEN** la ruta recomendada es la resguardada, de unos 7 min y unos 90 m al aire libre

### Requirement: Nombre de la ruta resguardada

El sistema SHALL nombrar la ruta resguardada "Techada" solo cuando no tiene tramos al aire libre, y "Más resguardada" cuando tiene alguno, para no prometer un recorrido bajo techo que no lo es.

#### Scenario: Resguardada con tramos de vereda

- **WHEN** llueve y se muestra la ruta resguardada del Aula 309 al Aula 103, con unos 90 m al aire libre
- **THEN** la ruta se llama "Más resguardada"

#### Scenario: Resguardada sin tramos al aire libre

- **WHEN** la ruta resguardada tiene 0 m al aire libre y es distinta de la más corta
- **THEN** la ruta se llama "Techada"

### Requirement: La más rápida como alternativa con lluvia

Cuando llueve y las rutas difieren, el sistema SHALL ofrecer la ruta más corta como alternativa, con la etiqueta "Más rápida", seleccionable con un solo toque y sin pedir confirmación.

#### Scenario: El usuario prefiere llegar rápido

- **WHEN** llueve, se muestra la ruta "Más resguardada" del Aula 309 al Aula 103 y el usuario toca "Más rápida"
- **THEN** se muestra la ruta más corta, de unos 5 min y unos 220 m al aire libre
- **AND** la ruta resguardada queda disponible para volver con un toque

### Requirement: Sin lluvia solo la más rápida

Cuando no llueve, el sistema SHALL mostrar únicamente la ruta más corta, sin ofrecer la ruta resguardada como alternativa.

#### Scenario: Día seco

- **WHEN** no llueve y el usuario pide la ruta del Aula 309 al Aula 103
- **THEN** se muestra solo la ruta más rápida, de unos 5 min
- **AND** no se ofrece ninguna alternativa

### Requirement: Ruta única cuando coinciden

Cuando la ruta resguardada y la más corta son el mismo recorrido, el sistema SHALL mostrar una sola ruta; si llueve o el clima no está disponible, SHALL indicar "Ya es techada" si no tiene tramos al aire libre o "Es la más resguardada posible" si los tiene.

#### Scenario: Ruta interior con lluvia

- **WHEN** llueve y el usuario pide la ruta del Aula 121 al Aula 110
- **THEN** se muestra una sola ruta con la indicación "Ya es techada"

#### Scenario: Ruta con vereda inevitable

- **WHEN** llueve y el usuario pide la ruta de la Entrada principal al Aula 121
- **THEN** se muestra una sola ruta con la indicación "Es la más resguardada posible" y unos 90 m al aire libre

### Requirement: Espera del clima antes de recomendar

Mientras no se conoce el estado del clima, el sistema SHALL mostrar que está buscando el camino y no SHALL dibujar una ruta provisoria que después pueda cambiar por el clima.

#### Scenario: Escenario lento

- **WHEN** el escenario de clima es `lento` y el usuario completa origen y destino
- **THEN** durante la espera se muestra "Buscando el camino…" sin ninguna ruta dibujada
- **AND** al llegar la respuesta se muestra la ruta resguardada como recomendada

### Requirement: Elección del criterio si el clima no está disponible

Cuando el clima no está disponible y las rutas difieren, el sistema SHALL avisar que no pudo consultar el clima y SHALL pedir al usuario que elija entre la ruta resguardada (con su nombre "Techada" o "Más resguardada") y "Más rápida", sin preseleccionar ninguna ni asumir que no llueve.

#### Scenario: Falla el servicio de clima

- **WHEN** el escenario de clima es `error` y el usuario pide la ruta del Aula 309 al Aula 103
- **THEN** se muestra "No pudimos consultar el clima" con las opciones "Más resguardada" y "Más rápida" y la opción de reintentar
- **AND** no se dibuja ninguna ruta hasta que el usuario elige

#### Scenario: El usuario elige la resguardada

- **WHEN** el clima no está disponible y el usuario elige "Más resguardada"
- **THEN** se dibuja la ruta resguardada y "Más rápida" queda como alternativa

### Requirement: Criterio elegido recordado mientras falla el clima

Si el usuario eligió un criterio porque el clima no estaba disponible, el sistema SHALL usar ese criterio en las rutas siguientes de la sesión mientras el clima siga sin estar disponible, manteniendo el aviso y la otra opción como alternativa.

#### Scenario: Cambio de destino con el clima caído

- **WHEN** el usuario eligió "Más rápida" con el clima no disponible y luego cambia el destino
- **THEN** la nueva ruta se muestra con el criterio "Más rápida" sin volver a preguntar
- **AND** se mantiene el aviso de que no se pudo consultar el clima

### Requirement: Comparación entre alternativas

Cuando hay dos alternativas, el sistema SHALL mostrar para cada una el tiempo estimado y los metros al aire libre redondeados a la decena, y para la resguardada la diferencia de minutos y de metros al aire libre respecto de la más rápida.

#### Scenario: Comparación con lluvia

- **WHEN** llueve y se muestra la ruta del Aula 309 al Aula 103
- **THEN** la resguardada indica 7 min, 90 m al aire libre, +2 min y 130 m menos al aire libre
- **AND** la más rápida indica 5 min y 220 m al aire libre

#### Scenario: Mismo tiempo estimado

- **WHEN** las dos alternativas difieren en recorrido pero redondean al mismo minuto
- **THEN** la resguardada indica "mismo tiempo" en lugar de "+0 min"

### Requirement: Estado del clima a la vista

El sistema SHALL mostrar junto a la ruta una línea breve con el estado del clima y el criterio aplicado: "Llueve · te recomendamos la ruta más resguardada" (o "Llueve" con la indicación de ruta única si coinciden), "No llueve · ruta más rápida" o "No pudimos consultar el clima".

#### Scenario: Indicador con lluvia

- **WHEN** llueve y se muestra la ruta resguardada recomendada del Aula 309 al Aula 103
- **THEN** junto a la ruta se lee "Llueve · te recomendamos la ruta más resguardada"

#### Scenario: Indicador con lluvia y ruta única

- **WHEN** llueve y se muestra la ruta del Aula 121 al Aula 110
- **THEN** junto a la ruta se lee "Llueve · Ya es techada"

#### Scenario: Indicador sin lluvia

- **WHEN** no llueve y se muestra una ruta
- **THEN** junto a la ruta se lee "No llueve · ruta más rápida"
