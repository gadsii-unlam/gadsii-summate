import type { CategoriaLugar } from '../../src/datos/tipos.ts'

/** Palabras de los ids que se muestran distinto: tildes, abreviaturas y siglas (design.md, D6). */
const DICCIONARIO: Record<string, string> = {
  lab: 'Lab.',
  labs: 'Labs.',
  dto: 'Dto.',
  dir: 'Dir.',
  cs: 'Cs.',
  cau: 'CAU',
  banos: 'Baños',
  salon: 'Salón',
  marti: 'Martí',
  americas: 'Américas',
  microscopia: 'Microscopía',
  kinesiologia: 'Kinesiología',
  politica: 'Política',
  pedagogia: 'Pedagogía',
  electronica: 'Electrónica',
  fisica: 'Física',
  economicas: 'Económicas',
  clinicas: 'Clínicas',
  formacion: 'Formación',
  extension: 'Extensión',
  enfermeria: 'Enfermería',
  odontologia: 'Odontología',
  tecnologico: 'Tecnológico',
  peron: 'Perón',
}

/** Conectores que van en minúscula (salvo al principio). */
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e'])

const capitalizar = (p: string): string => p.charAt(0).toUpperCase() + p.slice(1)

export const esNumeroAula = (resto: string): boolean => /^\d+$/.test(resto)

/** Número de aula de la parte del id que sigue al departamento (`121` o `aula-121`), o `null`. */
export function numeroAula(resto: string): string | null {
  return /^(?:aula-)?(\d+)$/.exec(resto)?.[1] ?? null
}

/**
 * Nombre visible derivado de la parte del id que sigue al departamento
 * (`lab-de-microscopia` → "Lab. de Microscopía", `121` → "Aula 121").
 */
export function derivarNombre(resto: string): string {
  const numero = numeroAula(resto)
  if (numero !== null) return `Aula ${numero}`
  return resto
    .split('-')
    .filter((p) => p.length > 0)
    .map((palabra, i) => {
      const conocida = DICCIONARIO[palabra]
      if (conocida !== undefined) return conocida
      if (i > 0 && CONECTORES.has(palabra)) return palabra
      if (palabra.length === 1) return palabra.toUpperCase()
      return capitalizar(palabra)
    })
    .join(' ')
}

const SERVICIOS = [
  'biblioteca',
  'buffet',
  'enfermeria',
  'centro-de-copiado',
  'centro-copiado',
  'gimnasio',
  'radio',
  'polo-tecnologico',
  'banco',
  'tesoreria',
  'natatorio',
  'vestuarios',
  'comedor-universitario',
  'canchas-',
  'microestadio-',
  'salon-usos-multiples',
  'salon-musculacion',
  'anses',
]
const AUDITORIOS = ['auditorio-', 'salon-de-las-americas', 'salon-americas', 'teatro', 'aula-magna']

/** Categoría automática según la parte del id que sigue al departamento (corregible a mano). */
export function categoriaPorReglas(resto: string): CategoriaLugar {
  if (numeroAula(resto) !== null) return 'aula'
  if (/^(lab|labs|laboratorio|laboratorios|estudio)-/.test(resto)) return 'laboratorio'
  if (/^banos?(-|$)/.test(resto)) return 'bano'
  const empieza = (prefijo: string) =>
    prefijo.endsWith('-')
      ? resto.startsWith(prefijo)
      : resto === prefijo || resto.startsWith(`${prefijo}-`)
  if (SERVICIOS.some(empieza)) return 'servicio'
  if (AUDITORIOS.some((a) => resto === a || resto.startsWith(a))) return 'auditorio'
  return 'oficina'
}
