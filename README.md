# Summate

Integrantes: Agasi Alejo, Huergo Estefanía, Naspleda Julián, Panigazzi Agustín, Rios Cristian

Producto: ¿Dónde queda?, una aplicación web que calcula y muestra la ruta más corta entre dos puntos del campus de la UNLaM.

Segmento de la comunidad UNLaM: Ingresantes y estudiantes de primer año que todavía no conocen bien la distribución del campus.

## MVP

**URL pública:** <https://donde-queda.unlam.workers.dev>

El código está en [`src/`](src/); cómo levantarlo, los scripts y la estructura están en [`src/README.md`](src/README.md).

Para ejecutarlo en local (requiere Node 24 LTS, fijado en `src/.nvmrc`):

```sh
cd src
npm ci
npm run dev    # http://localhost:5173
```

Cada push y cada pull request corren lint, tipos, tests, validación de cierres y pruebas E2E. Solo un push a `main` que pasa todo se publica en Cloudflare Workers, sin pasos manuales.

## Documentación

- [`docs/brief.md`](docs/brief.md): Brief de Producto, documento vivo con una versión por TP.
- [`docs/entregas/`](docs/entregas/): informes entregados de cada TP, en `.docx` y `.pdf` (por ejemplo, [`TP6-Summate.pdf`](docs/entregas/TP6-Summate.pdf)). El PDF se genera a partir del `.docx`.
- [`docs/arquitectura/`](docs/arquitectura/): TP6, diagramas (SVG y PNG) de la arquitectura real del MVP (`mvp-real-ci`, con el deploy automático, es la versión actual) y de la gran visión.
- [`docs/evidencia/tp2/`](docs/evidencia/tp2/): resultados de la encuesta de relevamiento del TP2.
- [`docs/evidencia/tp5/`](docs/evidencia/tp5/): evidencia de la prueba con usuarios del TP5 (guion, registro, fricciones y notas de cada sesión).
- [`docs/diseno/`](docs/diseno/): TP3, propuesta final del diseño y wireframe.
- [`docs/prompts.md`](docs/prompts.md): registro del trabajo con IA.

## Cómo se continúa

El brief llegó a la versión 6 en el TP6 (el enunciado del TPI la llama «versión 5»; ver la nota en [`TPI-Summate.pdf`](docs/entregas/TPI-Summate.pdf)). La prueba del TP5 refutó la hipótesis de valor y el equipo pivotó: los ingresantes llegan al edificio con la ruta, y el tiempo se pierde orientándose adentro. La nueva hipótesis todavía no se probó.

**Qué sigue, en orden:**

1. **Aviso del cierre antes de empezar a caminar.** En el TP5, 2 de 3 usuarios no miraron el cierre hasta llegar al tramo cerrado, aunque el desvío estaba en pantalla.
2. **Guía de llegada dentro del edificio:** de la entrada a la puerta del aula (piso, pasillo, puerta). El generador de indicaciones que se sacó del MVP sigue en [`src/src/rutas/indicaciones.ts`](src/src/rutas/indicaciones.ts), pero la interfaz no lo usa.
3. **Probar la nueva hipótesis con ingresantes** en sus primeras semanas, con un tiempo proporcional a la distancia y no el umbral fijo de 5 minutos del TP5.
4. Después, lo que hoy está simulado o diferido: panel y backend de cierres, API de clima real y las funciones 2 y 3 (horarios y servicio más cercano).

**Dónde está cada decisión:**

| Qué | Dónde |
| --- | --- |
| Historia del producto, decisiones y estado | [`docs/entregas/TPI-Summate.pdf`](docs/entregas/TPI-Summate.pdf) y [`docs/brief.md`](docs/brief.md) (una versión por TP, cada una abre con lo que cambió) |
| Usuario y relevamiento | `docs/evidencia/tp2/` y los TP1 y TP2 en `docs/entregas/` |
| Diseño del flujo (por qué un mapa único con panel) | [`docs/diseno/propuesta-final.md`](docs/diseno/propuesta-final.md) |
| Prueba con usuarios y criterio de éxito | `docs/evidencia/tp5/` y el TP5 en `docs/entregas/` |
| Arquitectura y riesgo principal | [`docs/arquitectura/`](docs/arquitectura/) y el TP6 en `docs/entregas/` |
| Decisiones técnicas del MVP | `src/openspec/changes/*/design.md` |
| Trabajo con IA | [`docs/prompts.md`](docs/prompts.md) |

**Quién carga los cierres.** Hoy el equipo: se edita `src/public/data/cierres.json` (guía en [`src/docs/cierres.md`](src/docs/cierres.md)) y se mergea a `main`, que dispara el deploy automático. Cargar un cierre sigue exigiendo tocar el repositorio. En producción debería hacerlo un rol de la UNLaM desde un panel, pero no se relevó quién ni con qué accesos.
