## Purpose

Saber si llueve en el campus consultando un servicio meteorológico simulado que el moderador de la prueba controla, con la misma conducta ante demoras y fallas que tendría un servicio real.

## ADDED Requirements

### Requirement: Consulta del clima al calcular una ruta

El sistema SHALL consultar el estado del clima por red cada vez que calcula una ruta y SHALL obtener si llueve o no llueve. Una respuesta válida SHALL reutilizarse durante 5 minutos para los cálculos siguientes, salvo que cambie el escenario.

#### Scenario: Primera ruta de la sesión

- **WHEN** el usuario completa origen y destino por primera vez
- **THEN** la app consulta el servicio de clima antes de mostrar la recomendación

#### Scenario: Cambio de destino dentro de los 5 minutos

- **WHEN** el usuario cambia el destino 2 minutos después de una consulta válida y el escenario no cambió
- **THEN** la app reutiliza el estado del clima sin volver a consultarlo

### Requirement: Escenarios simulados

El servicio simulado SHALL ofrecer cuatro escenarios: `seco` (no llueve), `lluvia` (llueve), `error` (la respuesta falla) y `lento` (responde que llueve después de unos 3 segundos).

#### Scenario: Escenario lluvia

- **WHEN** el escenario activo es `lluvia` y se consulta el clima
- **THEN** el estado obtenido es "llueve"

#### Scenario: Escenario seco

- **WHEN** el escenario activo es `seco` y se consulta el clima
- **THEN** el estado obtenido es "no llueve"

#### Scenario: Escenario lento

- **WHEN** el escenario activo es `lento` y se consulta el clima
- **THEN** la respuesta llega entre 3 y 5 segundos después con el estado "llueve"

#### Scenario: Escenario error

- **WHEN** el escenario activo es `error` y se consulta el clima
- **THEN** el estado obtenido es "clima no disponible"

### Requirement: Escenario por defecto

Si el moderador no eligió ningún escenario en la sesión, el sistema SHALL usar el escenario `seco`.

#### Scenario: Sesión nueva sin parámetros

- **WHEN** se abre la app en una pestaña nueva sin indicar escenario
- **THEN** el escenario activo es `seco`

### Requirement: Escenario elegido desde la dirección

El sistema SHALL permitir elegir el escenario agregando a la dirección de la app el parámetro `clima` con uno de los cuatro valores; un valor desconocido SHALL ignorarse y mantener el escenario anterior.

#### Scenario: Link de prueba con lluvia

- **WHEN** el moderador abre la app con `?clima=lluvia`
- **THEN** el escenario activo es `lluvia`

#### Scenario: Valor desconocido

- **WHEN** el moderador abre la app con `?clima=nieve`
- **THEN** el escenario activo sigue siendo el que estaba guardado en la sesión, o `seco` si no había ninguno

### Requirement: Panel de prueba oculto

El sistema SHALL ofrecer al moderador un panel de prueba que no forma parte de la interfaz del usuario, se abre con un gesto oculto o con un parámetro de la dirección, muestra el escenario activo y permite cambiarlo.

#### Scenario: Abrir el panel con el gesto oculto

- **WHEN** el moderador mantiene presionado 3 segundos el botón de ayuda
- **THEN** se abre el panel de prueba con las opciones Seco, Lluvia, Error y Lento y la activa marcada

#### Scenario: El usuario no ve el panel

- **WHEN** el usuario usa la app con toques normales, incluido un toque corto en el botón de ayuda
- **THEN** el panel de prueba no aparece

### Requirement: Escenario recordado durante la sesión

El sistema SHALL recordar el escenario elegido mientras la pestaña del navegador siga abierta, incluso si se recarga la página, y SHALL olvidarlo al cerrarla. El parámetro de la dirección SHALL tener prioridad sobre el escenario recordado.

#### Scenario: Recarga durante la prueba

- **WHEN** el moderador eligió `lluvia` desde el panel y la página se recarga sin parámetros
- **THEN** el escenario activo sigue siendo `lluvia`

#### Scenario: Pestaña nueva

- **WHEN** se cierra la pestaña y se abre la app en otra sin parámetros
- **THEN** el escenario activo es `seco`

### Requirement: Cambio de escenario con una ruta en pantalla

Cuando el moderador cambia el escenario con una ruta en pantalla, el sistema SHALL volver a consultar el clima y actualizar la recomendación sin cambiar el origen ni el destino.

#### Scenario: Empieza a llover en medio de la prueba

- **WHEN** hay una ruta del Aula 309 al Aula 103 en pantalla con escenario `seco` y el moderador elige `lluvia`
- **THEN** la recomendación pasa a la ruta techada con el mismo origen y destino

### Requirement: Tiempo máximo de espera

El sistema SHALL esperar como máximo 5 segundos la respuesta del servicio de clima; si no llega, SHALL cancelar la consulta y tratar el clima como no disponible.

#### Scenario: Servicio que no responde

- **WHEN** el servicio de clima tarda más de 5 segundos en responder
- **THEN** a los 5 segundos el estado es "clima no disponible"

### Requirement: Falla de la consulta

Si la consulta falla por falta de conexión, por un error del servicio o porque la respuesta no indica claramente si llueve, el sistema SHALL tratar el clima como no disponible y no SHALL interpretarlo como "no llueve".

#### Scenario: Sin conexión

- **WHEN** el dispositivo no tiene conexión y se calcula una ruta
- **THEN** el estado del clima es "clima no disponible"

#### Scenario: Respuesta sin dato de lluvia

- **WHEN** el servicio responde sin indicar si llueve
- **THEN** el estado del clima es "clima no disponible"

### Requirement: Reintentar la consulta del clima

Cuando el clima no está disponible, el sistema SHALL permitir reintentar la consulta sin perder el origen, el destino ni la ruta ya mostrada.

#### Scenario: Reintento exitoso

- **WHEN** el clima no estaba disponible, el moderador cambia el escenario a `lluvia` y el usuario toca "Reintentar"
- **THEN** el estado pasa a "llueve" y se mantienen el origen y el destino
