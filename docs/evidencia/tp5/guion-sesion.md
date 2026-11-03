# Guion de la sesión con usuarios — TP5, punto 3

Prueba de _¿Dónde queda?_ (https://donde-queda.donde-queda.workers.dev) con U1, U2 y U3, los mismos usuarios del TP2. Una sesión individual por usuario, de unos 25 minutos, en el campus.

## Tareas (situaciones que el moderador lee tal cual)

El orden es fijo (T1 → T2 → T3) para poder comparar entre usuarios. No se nombra ningún control de la aplicación.

| Tarea | Situación que se lee en voz alta | Origen → destino | Clima | Cierre | Qué mide |
| --- | --- | --- | --- | --- | --- |
| **T1** | «Hoy empezás una materia nueva y te toca en el Aula 255. Nunca estuviste ahí. Acabás de entrar por la entrada principal, la de Florencio Varela, y la clase empieza en 10 minutos. Tenés la aplicación abierta en el celular.» | Entrada Florencio Varela → Aula 255 | Seco | Ninguno | M1. Primer uso sin explicación. |
| **T2** | «Saliste de la Biblioteca y te avisan por el grupo de la materia que la clase de hoy se pasó al Aula 418. Tenés 10 minutos para llegar.» | Biblioteca → Aula 418 | Seco | Entrada del Edificio Este (pasillo 400/500, lado oeste), cerrada y señalizada con cinta | M2 y M1. |
| **T3** | «Imaginá que está lloviendo fuerte y no tenés paraguas. Estás en el Buffet y tenés que llegar al Aula 108 antes de que empiece la clase.» | Buffet → Aula 108 | Lluvia | Ninguno | M1 y alternativa según el clima. |

Rutas de referencia calculadas con el motor del MVP (sirven para leer el umbral de 5 minutos):

| Tarea | Ruta más corta | Ruta resguardada |
| --- | --- | --- |
| T1 | 334 m (≈ 4,3 min) | 334 m (la misma) |
| T2 sin cierre | 185,5 m (≈ 2,4 min), por la entrada del Edificio Este | 238 m |
| T2 con cierre | 238 m (≈ 3,1 min): la app rodea la entrada cerrada | — |
| T3 | 211 m (≈ 2,7 min) | 254 m (≈ 3,3 min) |

**Reglas de la prueba:**

- En T2 no se menciona el cierre: que el usuario lo descubra (o no) es lo que mide M2.
- Si pregunta cómo se usa algo, el moderador responde «¿Cómo lo harías si no estuviéramos acá?».
- Se da la tarea por terminada a los 10 minutos o si el usuario abandona, y se registra «No llegó».
- Si el usuario ya conocía el aula de una tarea, se cambia el destino para él y se anota.

## Preparación

El día anterior se carga el cierre de T2 en `src/public/data/cierres.json`, se corre `npm run validar-cierres` y se publica. Se camina cada recorrido para anotar el tiempo de referencia.

```json
{
  "version": 1,
  "actualizado": "(fecha del día anterior)-03:00",
  "cierres": [
    {
      "id": "prueba-entrada-este-400-500",
      "motivo": "Entrada del Edificio Este (pasillo 400/500) cerrada",
      "nodos": ["entrada-ed-este-400-500-lado-oeste"]
    }
  ]
}
```

Antes de cada usuario: pestaña nueva con la aplicación, escenario seco y grabación de pantalla con audio. Entre T2 y T3, sin que el usuario vea, el moderador pasa el clima simulado a lluvia.

## Qué se observa

Dónde duda, dónde se equivoca, dónde pide ayuda y qué hace distinto de lo esperado. En particular:

- si confirma o corrige el origen, y si reconoce las referencias (Biblioteca, Buffet, entradas);
- si la indicación de entrada y piso le alcanza para llegar a la puerta del aula;
- en T2, si ve el cierre en el mapa y si camina el desvío o va al tramo cerrado;
- en T3, qué ruta camina con lluvia;
- si abre la ayuda y cómo reacciona ante «Buscando el camino…» y ante un corte de señal.

## Cómo se registra

- **Moderador:** lee, entrega el celular y no ayuda. Si se queda callado: «¿Qué estás pensando?».
- **Observador 1:** cronómetro; en cada tarea anota tres momentos (hora de entrega del celular, hora en que aparece la ruta en pantalla y hora de llegada a la puerta), de donde salen los minutos totales → [`registro.md`](registro.md).
- **Observador 2:** sigue al usuario a distancia y anota por dónde camina, cada duda, error o pedido de ayuda, con la hora → [`fricciones.md`](fricciones.md). Lo que hizo y lo que dijo van separados.
- **Grabación:** pantalla del celular con audio (pensar en voz alta). Archivos `TP5-U1-AAAA-MM-DD`, `TP5-U2-…`, `TP5-U3-…`.
- Los registros se completan el mismo día, con la grabación al lado.

## Qué se pregunta (se lee tal cual, sin ofrecer opciones ni ejemplos)

1. Después de T1: «Contame cómo hiciste para llegar.»
2. Después de T2: «¿Cómo decidiste por dónde ir?» Si menciona el mapa: «¿Qué viste en la pantalla en ese momento?»
3. Después de T3: «¿Por qué fuiste por ese camino?»
4. Al final: «¿Hubo algún momento en el que no supiste qué hacer? ¿Cuál?»
5. «¿Hubo algo que esperabas que hiciera la aplicación y no hizo?»
6. «En la encuesta nos contaste que la última vez que no encontraste un lugar perdiste entre 5 y 10 minutos. ¿Cómo lo resolviste esa vez? ¿Y hoy?»
7. «Pensá en la próxima vez que tengas que ir a un aula que no conocés. ¿Qué vas a hacer?»
8. «¿Hay algo más que quieras contarnos?»

No se pregunta «¿viste el cierre?», «¿te sirvió la ruta resguardada?», «¿te gustó?» ni «¿te resultó fácil?». Si lo que dice contradice lo que hizo, no se discute: vale lo que hizo.
