// Official catalogue of the 32 Mexican Federal Entities
// Includes both user-friendly label and canonical INE uppercase name used by candidatos & backend
export interface EstadoCatalogo {
  id: number;
  nombre: string;
  entidad: string;
}

export const ESTADOS_MEXICO: EstadoCatalogo[] = [
  { id: 1, nombre: 'Aguascalientes', entidad: 'AGUASCALIENTES' },
  { id: 2, nombre: 'Baja California', entidad: 'BAJA CALIFORNIA' },
  { id: 3, nombre: 'Baja California Sur', entidad: 'BAJA CALIFORNIA SUR' },
  { id: 4, nombre: 'Campeche', entidad: 'CAMPECHE' },
  { id: 5, nombre: 'Coahuila', entidad: 'COAHUILA' },
  { id: 6, nombre: 'Colima', entidad: 'COLIMA' },
  { id: 7, nombre: 'Chiapas', entidad: 'CHIAPAS' },
  { id: 8, nombre: 'Chihuahua', entidad: 'CHIHUAHUA' },
  { id: 9, nombre: 'Ciudad de México', entidad: 'CIUDAD DE MEXICO' },
  { id: 10, nombre: 'Durango', entidad: 'DURANGO' },
  { id: 11, nombre: 'Guanajuato', entidad: 'GUANAJUATO' },
  { id: 12, nombre: 'Guerrero', entidad: 'GUERRERO' },
  { id: 13, nombre: 'Hidalgo', entidad: 'HIDALGO' },
  { id: 14, nombre: 'Jalisco', entidad: 'JALISCO' },
  { id: 15, nombre: 'Estado de México', entidad: 'MEXICO' },
  { id: 16, nombre: 'Michoacán', entidad: 'MICHOACAN' },
  { id: 17, nombre: 'Morelos', entidad: 'MORELOS' },
  { id: 18, nombre: 'Nayarit', entidad: 'NAYARIT' },
  { id: 19, nombre: 'Nuevo León', entidad: 'NUEVO LEON' },
  { id: 20, nombre: 'Oaxaca', entidad: 'OAXACA' },
  { id: 21, nombre: 'Puebla', entidad: 'PUEBLA' },
  { id: 22, nombre: 'Querétaro', entidad: 'QUERETARO' },
  { id: 23, nombre: 'Quintana Roo', entidad: 'QUINTANA ROO' },
  { id: 24, nombre: 'San Luis Potosí', entidad: 'SAN LUIS POTOSI' },
  { id: 25, nombre: 'Sinaloa', entidad: 'SINALOA' },
  { id: 26, nombre: 'Sonora', entidad: 'SONORA' },
  { id: 27, nombre: 'Tabasco', entidad: 'TABASCO' },
  { id: 28, nombre: 'Tamaulipas', entidad: 'TAMAULIPAS' },
  { id: 29, nombre: 'Tlaxcala', entidad: 'TLAXCALA' },
  { id: 30, nombre: 'Veracruz', entidad: 'VERACRUZ' },
  { id: 31, nombre: 'Yucatán', entidad: 'YUCATAN' },
  { id: 32, nombre: 'Zacatecas', entidad: 'ZACATECAS' },
];
