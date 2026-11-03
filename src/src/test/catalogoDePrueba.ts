/** Catálogo de prueba para los tests de búsqueda y de la interfaz (no se usa en la app). */
import type { CatalogoLugares, CategoriaLugar, Lugar } from '../datos/index.ts'

export function lugar(
  id: string,
  nombre: string,
  edificio: string,
  categoria: CategoriaLugar = 'aula',
  extra: Partial<Lugar> = {},
): Lugar {
  return {
    id,
    nombre,
    edificio,
    depto: id.split('-')[0] ?? 'central',
    categoria,
    puertas: [`puerta-${id}`],
    caja: { x1: 100, y1: 1500, x2: 110, y2: 1510 },
    alias: [],
    piso: 'PB',
    referencia: false,
    indicacion: null,
    nombreCurado: true,
    departamento: null,
    sala: null,
    ...extra,
  }
}

const H = 'Humanidades'

export const LUGARES_DE_PRUEBA: Lugar[] = [
  ...Array.from({ length: 10 }, (_, i) => lugar(`humanidades-12${i}`, `Aula 12${i}`, H)),
  lugar('humanidades-1', 'Aula 1', H),
  lugar('humanidades-2', 'Aula 2', H),
  lugar('humanidades-10', 'Aula 10', H),
  lugar('economicas-302', 'Aula 302', 'Ciencias Económicas'),
  lugar(
    'derecho-lab-de-microscopia',
    'Lab. de Microscopía',
    'Derecho y Ciencia Política',
    'laboratorio',
  ),
  lugar('arquitectura-lab-de-fisica', 'Lab. de Física', 'Arquitectura', 'laboratorio'),
  lugar('arquitectura-dto-de-fisica', 'Dto. de Física', 'Arquitectura', 'oficina'),
  lugar('arquitectura-250', 'Aula 250', 'Arquitectura'),
  lugar('salud-salud-mental', 'Salud Mental', 'Ciencias de la Salud', 'oficina'),
  lugar('salud-401', 'Aula 401', 'Ciencias de la Salud'),
  lugar('salud-dto-de-salud', 'Dto. de Salud', 'Ciencias de la Salud', 'oficina'),
  lugar('buffet', 'Buffet', 'Edificio Oeste', 'servicio', {
    alias: ['cantina', 'comedor estudiantil'],
    referencia: true,
    puertas: ['acceso-buffet'],
  }),
  lugar('biblioteca', 'Biblioteca', 'Campus', 'servicio', {
    alias: ['Biblioteca Leopoldo Marechal'],
    referencia: true,
    puertas: ['acceso-biblioteca-oeste', 'acceso-biblioteca-este'],
  }),
  lugar('teatro', 'Teatro', 'Campus', 'auditorio', {
    referencia: true,
    puertas: ['acceso-teatro'],
  }),
  lugar('gimnasio', 'Gimnasio', 'Campus', 'servicio', {
    referencia: true,
    puertas: ['acceso-gimnasio-norte', 'acceso-gimnasio-sur'],
  }),
  lugar('salon-americas', 'Salón de las Américas', 'Edificio Oeste', 'auditorio', {
    referencia: true,
    puertas: ['acceso-salon-americas'],
  }),
  lugar('rectorado', 'Rectorado', 'Edificio Sur', 'oficina', {
    referencia: true,
    puertas: ['puerta-rectorado-interior', 'puerta-rectorado-exterior'],
  }),
  lugar('economicas-auditorio-marti', 'Auditorio Martí', 'Ciencias Económicas', 'auditorio'),
  lugar('entrada-campus-florencio-varela', 'Entrada Florencio Varela', 'Campus', 'entrada', {
    alias: ['Entrada principal', 'Florencio Varela 1903'],
    referencia: true,
    puertas: ['entrada-campus-florencio-varela'],
  }),
  lugar('entrada-campus-la-paz', 'Entrada La Paz', 'Campus', 'entrada', {
    referencia: true,
    puertas: ['entrada-campus-la-paz'],
  }),
  lugar('entrada-campus-peron-norte', 'Entrada Pte. Perón (norte)', 'Campus', 'entrada', {
    referencia: true,
    puertas: ['entrada-campus-peron-norte'],
  }),
  lugar('entrada-campus-peron-sur', 'Entrada Pte. Perón (sur)', 'Campus', 'entrada', {
    referencia: true,
    puertas: ['entrada-campus-peron-sur'],
  }),
  lugar('salud-callcenter', 'Año Ñandú', 'Ciencias de la Salud', 'oficina'),
]

export const CATALOGO_DE_PRUEBA: CatalogoLugares = {
  version: 'prueba',
  versionGrafo: 'prueba',
  lugares: LUGARES_DE_PRUEBA,
}
