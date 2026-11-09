# Cómo precargar cierres temporales

Los cierres son pasillos, puertas, escaleras o veredas que no se pueden usar por un tiempo (una obra, mantenimiento, una puerta con llave). La app los saca de todas las rutas mientras estén vigentes, marca "Sin acceso ahora" en los lugares que quedan aislados y los dibuja en el mapa con una línea roja punteada y un ícono de paso prohibido.

No hay panel de administración: los cierres se escriben a mano en `public/data/cierres.json` y se publican con la app. Esta guía explica cómo hacerlo antes de una prueba con usuarios.

## 1. Formato del archivo

`public/data/cierres.json` (es el único archivo de `public/data/` que se versiona; los demás los genera `npm run datos:build`):

```json
{
  "version": 1,
  "actualizado": "2026-11-02T18:00:00-03:00",
  "cierres": [
    {
      "id": "obra-entrada-edificio-sur",
      "motivo": "Obra en la entrada oeste del Edificio Sur",
      "nodos": ["entrada-ed-sur-oeste-sur"],
      "desde": "2026-11-03T07:00:00-03:00",
      "hasta": "2026-11-14T23:00:00-03:00"
    },
    {
      "id": "vereda-entrada-principal",
      "motivo": "Vereda en reparación frente a la entrada principal",
      "aristas": [
        "arista__cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste"
      ]
    },
    {
      "id": "escalera-radio",
      "motivo": "Escalera junto a la Radio cerrada por mantenimiento",
      "nodos": ["escalera-radio-primer-piso"],
      "hasta": "2026-11-05T13:00:00-03:00"
    }
  ]
}
```

| Campo     | Obligatorio            | Qué va                                                                                                    |
| --------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `id`      | Sí, único              | Un nombre corto en minúsculas y con guiones. Aparece en las advertencias.                                 |
| `motivo`  | Sí                     | Texto corto en términos del campus. Se muestra **tal cual** al usuario ("Evitamos un tramo cerrado: …"). |
| `nodos`   | Al menos uno de los dos | Ids de puntos del grafo (puertas, accesos, entradas, puntos de pasillo, cruces, escaleras).               |
| `aristas` | Al menos uno de los dos | Ids de aristas, `arista__<nodoA>__<nodoB>`. Se aceptan en cualquier sentido.                              |
| `desde`   | No                     | Fecha y hora de inicio (inclusive). Sin `desde`, vale desde ya.                                           |
| `hasta`   | No                     | Fecha y hora de fin (exclusive). Sin `hasta`, vale hasta que se saque del archivo.                        |

Este mismo ejemplo está en `src/cierres/test/cierres-ejemplo.json`. La arista de la vereda está escrita al revés a propósito: la app la normaliza al id del grafo. El cierre de la escalera deja sin acceso todo el 1er piso (la galería de laboratorios, el comedor y los salones deportivos), porque es el único acceso.

**Fechas:** siempre con la zona de Argentina, `-03:00` al final (`2026-11-05T13:00:00-03:00`). Sin zona se interpretan en la hora del celular, que puede estar mal configurado. Un cierre con `hasta: 13:00` deja de valer justo a las 13:00.

**Si algo está mal escrito, la app no se rompe:** un id que no existe se ignora (con una advertencia `[cierres] id desconocido: …` en la consola), una fecha inválida hace que el cierre valga siempre, y un cierre sin ningún id válido se descarta. Pero para eso está el paso 5: `npm run validar-cierres` no deja pasar ninguno de esos errores.

Para sacar todos los cierres: dejar `"cierres": []` y publicar.

## 2. Procedimiento antes de la prueba

1. **Relevar** los cierres reales el día anterior: recorrer el campus, sacar una foto de cada uno y anotar el motivo y hasta cuándo dura.
2. **Ubicar los ids** de lo que está cerrado. El grafo está dibujado en el plano, en el grupo `grafo` de `mapa-unlam.svg` (en la raíz del repo); `grafo.svg` tiene solo ese grupo, con el mismo tamaño, y es más liviano para esto:
   - Abrir `mapa-unlam.svg` o `grafo.svg` en el navegador, clic derecho sobre el punto o la línea → Inspeccionar.
   - **Nodo:** el `id` del `<circle>` (por ejemplo `entrada-ed-sur-oeste-sur`, `acceso-gimnasio-sur`, `escalera-radio-primer-piso`). El atributo `data-nombre` dice en palabras qué es.
   - **Arista:** la `<line>` tiene `data-desde` y `data-hasta`; el id es `arista__<data-desde>__<data-hasta>` (por ejemplo `arista__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste__entrada-campus-florencio-varela`). **No** usar el `id` de la `<line>` (`arista--…`, separado con guiones en vez de guiones bajos): ese formato no es el de la app. El orden de los extremos da igual.
   - Si se cambió el plano, correr antes `npm run datos:importar` y `npm run datos:build`, así los ids del archivo y los de la app coinciden.
3. **Preferir cerrar nodos** antes que aristas sueltas. Cerrar un nodo cierra todas sus aristas:
   - Puerta cerrada con llave → el nodo `puerta-…` o `acceso-…` (si el lugar tiene otra puerta, la ruta usa esa; por ejemplo el Gimnasio tiene `acceso-gimnasio-norte` y `acceso-gimnasio-sur`).
   - Entrada de un edificio cerrada → el nodo `entrada-ed-…`.
   - Escalera o paso cerrado → el punto de pasillo del paso (la escalera al 1er piso: `escalera-radio-primer-piso`).
   - Un tramo de pasillo o de vereda en obra (con paso por los dos extremos) → la arista.
4. **Editar** `public/data/cierres.json`: un cierre por cada situación, con un motivo que entienda alguien que no conoce el campus ("Escalera junto a la Radio cerrada por mantenimiento", no "cierre escalera-radio-primer-piso") y fechas con `-03:00`. Actualizar `actualizado`.
5. **Validar:**

   ```sh
   npm run validar-cierres
   ```

   Falla (código 1) si hay un id que no existe, una fecha inválida, un `hasta` que no es posterior a `desde`, dos cierres con el mismo id o un cierre sin motivo. También lista, para cada cierre, los lugares que quedarían **"Sin acceso ahora"**: si aparece un lugar que no debería quedar aislado, el cierre es demasiado amplio (por ejemplo, se cerró un punto de vereda muy conectado). Para revisar otro archivo: `npm run validar-cierres -- --archivo=<ruta>`. Necesita los datos generados (`npm run datos:build`). El chequeo también corre en CI.

6. **Verificar en la vista previa** con la fecha y hora de la prueba, agregando `?ahora=` a la dirección:

   ```
   http://localhost:5173/?ahora=2026-11-05T10:00-03:00
   ```

   Arriba aparece la etiqueta **"Fecha simulada: 05/11 10:00"**. Con esa fecha, revisar que:
   - el tramo se ve cerrado en el mapa (línea roja punteada e ícono de paso prohibido) y al tocar el ícono aparece el motivo y "Cerrado hasta el …";
   - una ruta que antes pasaba por ahí ahora lo evita y muestra "Evitamos un tramo cerrado: <motivo>";
   - los lugares aislados dicen "Sin acceso ahora" en la lista y, si se eligen, llevan a "Sin ruta disponible" con el motivo.

   La fecha simulada queda guardada en la pestaña (`sessionStorage`) aunque se navegue. Para volver al reloj real: `?ahora=real` (o `?ahora=` vacío), o cerrar la pestaña. **Nunca** dejar un enlace con `?ahora=` en el celular de la prueba.

7. **Publicar** y, el día de la prueba, abrir la app en un celular **sin** `?ahora` y confirmar que los cierres se ven en el mapa. Si no aparecen, recargar (el service worker puede haber servido la versión anterior).

## 3. Qué pasa si falla la red

La app pide `/data/cierres.json` al iniciar (espera hasta 5 s). Si no puede descargarlo o el archivo está roto, usa la copia que quedó incluida en la app al compilar, que es la misma que se publicó. Por eso **siempre** hay que volver a publicar la app después de cambiar el archivo: así la copia incluida coincide con la última precarga.

## 4. Recomendaciones

- Para la prueba, si el cierre dura todo el día, no poner `hasta`: depender del reloj del celular es un riesgo innecesario. Sacarlo del archivo después.
- Si un cierre tiene horario, dejar margen (empezar un rato antes, terminar un rato después).
- Un cierre por situación real: el motivo de cada uno es lo que lee el usuario.
