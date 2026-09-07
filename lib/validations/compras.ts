import { z } from 'zod';

/* -------------------------------------------------------------------- */
/* Utilidades                                                           */
/* -------------------------------------------------------------------- */

/** Hosts aceptados como "URL de Drive" válida para adjuntar cotizaciones. */
const HOSTS_DRIVE_VALIDOS = [
  'drive.google.com',
  'docs.google.com',
  'drive.usercontent.google.com',
];

function esUrlDeDriveValida(valor: string): boolean {
  try {
    const url = new URL(valor);
    return HOSTS_DRIVE_VALIDOS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

/** Zod schema reutilizable: string de URL que además debe apuntar a Drive. */
const urlDriveSchema = z
  .string()
  .url({ message: 'Debe ser una URL válida.' })
  .refine(esUrlDeDriveValida, {
    message: 'La URL debe corresponder a un enlace de Google Drive/Docs.',
  });

/* -------------------------------------------------------------------- */
/* 1. Creación de solicitud                                              */
/* -------------------------------------------------------------------- */

export const articuloSchema = z.object({
  nombre_articulo: z
    .string()
    .min(3, 'El nombre del artículo debe tener al menos 3 caracteres.')
    .max(200),
  descripcion: z.string().max(1000).optional(),
  cantidad: z
    .number()
    .positive('La cantidad debe ser mayor a 0.'),
  unidad_medida: z.string().max(50).optional(),
  especificaciones_tecnicas: z.string().max(2000).optional(),
});

export const crearSolicitudSchema = z.object({
  // Datos del solicitante
  nombre_solicitante: z.string().min(3, 'El nombre es obligatorio.').max(200),
  correo_solicitante: z.string().email('Correo electrónico inválido.'),
  area_solicitante: z.string().max(150).optional(),

  // Justificante / contexto de la solicitud
  descripcion_general: z
    .string()
    .min(10, 'La justificación debe tener al menos 10 caracteres.')
    .max(3000),
  fecha_limite_cotizacion: z.string().optional(), // formato ISO (YYYY-MM-DD)

  // Artículos solicitados (al menos 1)
  articulos: z
    .array(articuloSchema)
    .min(1, 'Debe agregar al menos un artículo a la solicitud.'),
});

export type ArticuloInput = z.infer<typeof articuloSchema>;
export type CrearSolicitudInput = z.infer<typeof crearSolicitudSchema>;

/* -------------------------------------------------------------------- */
/* 2. Registro de cotizaciones (compras)                                 */
/* -------------------------------------------------------------------- */

/** Cotización obligatoria: Proveedor, valor y URL de Drive estrictamente requeridos. */
const cotizacionObligatoriaSchema = z.object({
  proveedor: z.string().min(2, 'El proveedor es obligatorio.').max(200),
  valor: z.number().positive('El valor cotizado debe ser mayor a 0.'),
  url_drive: urlDriveSchema,
});

/** Cotización opcional (Cotización 3): Puede dejarse vacía/null o completarse con los 3 datos. */
const cotizacionOpcionalSchema = z
  .object({
    proveedor: z.string().min(2, 'El proveedor es obligatorio.').max(200).optional(),
    valor: z.number().positive('El valor cotizado debe ser mayor a 0.').optional(),
    url_drive: urlDriveSchema.optional(),
  })
  .nullable()
  .optional()
  .refine(
    (cot) => {
      if (!cot) return true; // Si es null o undefined, es totalmente válido
      const completos = [cot.proveedor, cot.valor, cot.url_drive].filter(
        (v) => v !== undefined && v !== null && v !== ''
      ).length;
      return completos === 0 || completos === 3;
    },
    { message: 'Si diligencia la tercera cotización, debe completar proveedor, valor y URL de Drive.' }
  );

export const cotizacionesSchema = z
  .object({
    solicitud_id: z.string().uuid('ID de solicitud inválido.'),

    // Cotizaciones 1 y 2 OBLIGATORIAS
    cotizacion_1: cotizacionObligatoriaSchema,
    cotizacion_2: cotizacionObligatoriaSchema,

    // Cotización 3 OPCIONAL
    cotizacion_3: cotizacionOpcionalSchema,

    // Selección definitiva
    proveedor_definitivo: z.string().min(2).max(200).optional(),
    valor_definitivo: z.number().positive('El valor definitivo debe ser mayor a 0.').optional(),
    observaciones: z.string().max(2000).optional(),
  })
  .refine(
    (data) => {
      if (!data.proveedor_definitivo) return true;
      const proveedores = [
        data.cotizacion_1.proveedor,
        data.cotizacion_2.proveedor,
        data.cotizacion_3?.proveedor,
      ].filter((p): p is string => Boolean(p));

      return proveedores.includes(data.proveedor_definitivo);
    },
    {
      message: 'El proveedor definitivo debe coincidir con una de las cotizaciones registradas.',
      path: ['proveedor_definitivo'],
    }
  );

export type CotizacionIndividualInput = z.infer<typeof cotizacionObligatoriaSchema>;
export type CotizacionesInput = z.infer<typeof cotizacionesSchema>;

/* -------------------------------------------------------------------- */
/* 3. Clasificación de presupuesto                                       */
/* -------------------------------------------------------------------- */

export const presupuestoSchema = z.object({
  solicitud_id: z.string().uuid('ID de solicitud inválido.'),
  proyecto: z.string().min(1, 'El proyecto es obligatorio.').max(150),
  centro_costo: z.string().min(1, 'El centro de costo es obligatorio.').max(150),
  unidad_negocio: z.string().min(1, 'La unidad de negocio es obligatoria.').max(150),
  producto: z.string().min(1, 'El producto es obligatorio.').max(150),
  campos_adicionales: z.record(z.string(), z.unknown()).optional(),
});

export type PresupuestoInput = z.infer<typeof presupuestoSchema>;

/* -------------------------------------------------------------------- */
/* 4. Aprobación / rechazo final                                         */
/* -------------------------------------------------------------------- */

export const aprobacionSchema = z.object({
  id: z.string().uuid('ID de solicitud inválido.'),
  estado: z.enum(['Aprobada', 'Rechazada']),
  observaciones: z.string().max(2000).optional(),
});

export type AprobacionInput = z.infer<typeof aprobacionSchema>;