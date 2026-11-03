## Purpose

Permitir indicar desde dónde sale y a dónde va el usuario en el panel "Cómo llegar", con origen y destino siempre visibles y editables, evitando partir de un origen equivocado y pidiendo la ruta solo cuando los dos datos son válidos.

## ADDED Requirements

### Requirement: Panel "Cómo llegar"
El sistema SHALL abrir el panel "Cómo llegar" desde el botón de la ficha de un lugar, con ese lugar como destino, o desde el botón de direcciones de la barra de búsqueda. El panel SHALL mostrar el origen con un ícono de círculo y el destino con un ícono de pin, apilados y visibles al mismo tiempo.

#### Scenario: Desde la ficha
- **WHEN** el usuario toca "Cómo llegar" en la ficha del Aula 121
- **THEN** se abre el panel con "Aula 121" como destino y el origen arriba

#### Scenario: Desde la barra de búsqueda
- **WHEN** el usuario toca el botón de direcciones de la barra en el inicio
- **THEN** se abre el panel con los campos de origen y destino visibles

### Requirement: Origen y destino editables
Tocar el campo de origen o el de destino SHALL abrir la búsqueda para ese campo. Al elegir un lugar, el sistema SHALL volver al panel con ese campo actualizado y el otro sin cambios.

#### Scenario: Cambiar el destino
- **WHEN** el panel tiene el origen "Biblioteca" y el destino "Aula 121", y el usuario toca el destino y elige "Aula 302"
- **THEN** el panel muestra el origen "Biblioteca" y el destino "Aula 302"

#### Scenario: Búsqueda de origen
- **WHEN** el usuario toca el campo de origen
- **THEN** se abre la búsqueda con el título "¿Desde dónde salís?"

### Requirement: Último origen como sugerencia a confirmar
El sistema SHALL ofrecer el último origen usado como una sugerencia visible en el panel, que el usuario tiene que confirmar con un toque. El sistema MUST NOT usar la sugerencia como origen ni pedir una ruta hasta que el usuario la confirme o elija otro origen.

#### Scenario: Sugerencia sin confirmar
- **WHEN** el usuario usó la "Entrada principal" como origen en una visita anterior y abre el panel con el destino "Aula 121"
- **THEN** el campo de origen dice "Elegí desde dónde salís"
- **AND** la hoja ofrece "¿Salís de Entrada principal?" con el botón "Usar este origen"
- **AND** no se pide ninguna ruta

#### Scenario: Confirmar la sugerencia
- **WHEN** el usuario toca "Usar este origen"
- **THEN** el campo de origen muestra "Entrada principal" y se pide la ruta hasta el Aula 121

#### Scenario: Primera vez, sin sugerencia
- **WHEN** el usuario nunca eligió un origen y abre el panel
- **THEN** no se muestra ninguna sugerencia de origen

#### Scenario: Recorrido en curso restaurado
- **WHEN** el usuario recarga la app en medio de un recorrido que sigue vigente
- **THEN** el origen ya confirmado de ese recorrido se restaura sin pedir confirmación de nuevo
- **AND** la sugerencia a confirmar solo aparece cuando el recorrido guardado ya no está vigente

### Requirement: Referencias reconocibles para el origen
Al elegir el origen, el sistema SHALL ofrecer primero lugares fáciles de reconocer: las entradas al campus y referencias como la Biblioteca, el Buffet, el Salón de las Américas, el Teatro, el Gimnasio y el Sector Administrativo. Cualquier otro lugar del campus SHALL poder elegirse como origen buscándolo.

#### Scenario: Lista de referencias
- **WHEN** el usuario abre la búsqueda de origen sin escribir nada
- **THEN** ve la sugerencia del último origen, si existe, y después las entradas al campus y las referencias

#### Scenario: Elegir una referencia
- **WHEN** el destino es "Aula 121" y el usuario elige "Buffet" en la lista de referencias
- **THEN** el campo de origen muestra "Buffet" y se pide la ruta hasta el Aula 121

#### Scenario: Origen que no es referencia
- **WHEN** el usuario escribe "302" en la búsqueda de origen y elige "Aula 302"
- **THEN** el campo de origen muestra "Aula 302"

### Requirement: Intercambiar origen y destino
El panel SHALL tener un botón para intercambiar origen y destino. Después de intercambiar, los dos lugares SHALL quedar elegidos y, si ambos son válidos, se SHALL pedir la ruta en el sentido nuevo.

#### Scenario: Intercambiar con los dos datos
- **WHEN** el origen es "Biblioteca", el destino es "Aula 121" y el usuario toca intercambiar
- **THEN** el origen pasa a ser "Aula 121", el destino "Biblioteca" y se pide la ruta en ese sentido

#### Scenario: Intercambiar con el origen vacío
- **WHEN** el origen está vacío, el destino es "Aula 121" y el usuario toca intercambiar
- **THEN** el origen pasa a ser "Aula 121", el destino queda vacío y no se pide ninguna ruta

### Requirement: Pedido automático de la ruta
Cuando el origen está elegido por el usuario y el destino es válido y distinto del origen, el sistema SHALL pedir la ruta automáticamente, sin un botón "Calcular", y SHALL hacerlo una sola vez por cada combinación de origen y destino.

#### Scenario: Completar el segundo dato
- **WHEN** el destino es "Aula 121" y el usuario elige "Biblioteca" como origen
- **THEN** se pide la ruta de "Biblioteca" a "Aula 121" sin tocar ningún otro botón

#### Scenario: Volver al panel sin cambios
- **WHEN** la ruta ya se pidió y el usuario abre y cierra la búsqueda sin elegir nada
- **THEN** no se pide la ruta otra vez

### Requirement: Cambiar el origen conserva el destino
Al cambiar el origen, el sistema SHALL conservar el destino ya elegido, visible en su campo, y SHALL pedir la ruta con el origen nuevo. Al cambiar el destino, SHALL conservar el origen.

#### Scenario: Cambiar el origen con la ruta pedida
- **WHEN** la ruta de "Biblioteca" a "Aula 121" ya se pidió y el usuario cambia el origen a "Teatro"
- **THEN** el destino sigue siendo "Aula 121" y se pide la ruta de "Teatro" a "Aula 121"

### Requirement: Sin destino no se pide la ruta
Si no hay destino elegido, el sistema MUST NOT pedir ninguna ruta, aunque el origen esté elegido o cambie. El panel SHALL quedar con el campo de destino vacío y el mapa sin ruta. Atrás SHALL volver al inicio.

#### Scenario: Elegir origen sin destino
- **WHEN** el usuario abre el panel desde la barra sin destino y elige "Biblioteca" como origen
- **THEN** el destino queda vacío con el texto "¿A dónde vas?" y no se pide ninguna ruta

#### Scenario: Borrar el destino
- **WHEN** la ruta de "Biblioteca" a "Aula 121" está pedida y el usuario borra el destino
- **THEN** el pedido de ruta se cancela, el mapa queda sin ruta y el origen sigue siendo "Biblioteca"

#### Scenario: Volver al inicio sin destino
- **WHEN** el panel no tiene destino y el usuario presiona Atrás
- **THEN** se ve el inicio sin ninguna ruta dibujada

### Requirement: Origen igual al destino
Si el origen y el destino son el mismo lugar, el sistema MUST NOT pedir una ruta y SHALL avisar que ya está en ese lugar, invitando a cambiar uno de los dos.

#### Scenario: Mismo lugar en los dos campos
- **WHEN** el destino es "Biblioteca" y el usuario elige "Biblioteca" como origen
- **THEN** se lee "Ya estás en Biblioteca" con la invitación a elegir otro destino o cambiar el punto de partida
- **AND** no se pide ninguna ruta
