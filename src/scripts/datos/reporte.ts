import type { Problema, Severidad } from './problemas.ts'

const TITULOS: Record<Severidad, string> = {
  error: 'Errores (frenan el build)',
  aviso: 'Avisos (casos a revisar, no frenan)',
  info: 'Información',
}

function agrupar(problemas: readonly Problema[]): Map<string, Problema[]> {
  const grupos = new Map<string, Problema[]>()
  for (const p of problemas) grupos.set(p.tipo, [...(grupos.get(p.tipo) ?? []), p])
  return grupos
}

/** Reporte completo en Markdown (scripts/salida/reporte-datos.md). */
export function reporteMarkdown(
  problemas: readonly Problema[],
  resumen: readonly string[],
  fecha = new Date(),
): string {
  const lineas = [
    '# Reporte de datos del campus',
    '',
    `Generado por \`npm run datos:build\` el ${fecha.toISOString()}.`,
    '',
    '## Resumen',
    '',
    ...resumen.map((r) => `- ${r}`),
    '',
  ]
  for (const severidad of ['error', 'aviso', 'info'] as const) {
    const deEsta = problemas.filter((p) => p.severidad === severidad)
    lineas.push(`## ${TITULOS[severidad]}: ${deEsta.length}`, '')
    if (deEsta.length === 0) {
      lineas.push('Ninguno.', '')
      continue
    }
    for (const [tipo, lista] of agrupar(deEsta)) {
      lineas.push(`### \`${tipo}\` (${lista.length})`, '')
      for (const p of lista) lineas.push(`- ${p.mensaje}`)
      lineas.push('')
    }
  }
  return lineas.join('\n')
}

/** Resumen corto para la consola: todos los errores, y los avisos agrupados por tipo. */
export function reporteConsola(problemas: readonly Problema[], resumen: readonly string[]): string {
  const errores = problemas.filter((p) => p.severidad === 'error')
  const avisos = problemas.filter((p) => p.severidad === 'aviso')
  const infos = problemas.filter((p) => p.severidad === 'info')
  const lineas = ['', '— Datos del campus —', ...resumen.map((r) => `  ${r}`)]
  if (avisos.length > 0) {
    lineas.push('', `Avisos (${avisos.length}, no frenan el build):`)
    for (const [tipo, lista] of agrupar(avisos)) {
      lineas.push(
        `  [${tipo}] ${lista.length}: ${lista[0]?.mensaje ?? ''}${lista.length > 1 ? ' …' : ''}`,
      )
    }
  }
  if (infos.length > 0) {
    lineas.push('', 'Información:')
    for (const p of infos)
      lineas.push(
        `  [${p.tipo}] ${p.mensaje.length > 160 ? `${p.mensaje.slice(0, 157)}…` : p.mensaje}`,
      )
  }
  if (errores.length > 0) {
    lineas.push('', `ERRORES (${errores.length}); el build se detiene:`)
    for (const p of errores) lineas.push(`  ✗ [${p.tipo}] ${p.mensaje}`)
  }
  return lineas.join('\n')
}
