'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import {
  crearSolicitudSchema,
  cotizacionesSchema,
  presupuestoSchema,
  aprobacionSchema,
  type CrearSolicitudInput,
  type CotizacionesInput,
  type PresupuestoInput,
  type AprobacionInput,
} from '@/lib/validations/compras';
import type { Database, EstadoSolicitud, Json } from '@/lib/supabase/database.types';
import { notificarCambioEstado } from '@/lib/resend';

/* -------------------------------------------------------------------- */
/* Tipo de resultado uniforme para todas las Server Actions             */
/* -------------------------------------------------------------------- */

export async function obtenerSolicitudesPresupuesto() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('solicitudes')
    .select('*')
    .eq('estado', 'En Revisión Presupuestal') // 👈 Solo trae las pendientes por Presupuesto
    .order('fecha_creacion', { ascending: false });

  if (error) {
    console.error('Error al obtener solicitudes de presupuesto:', error);
    return [];
  }

  return data;
}


export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

function errorDeValidacion(error: z.ZodError): ActionResult<never> {
  const { fieldErrors } = error.flatten();
  return { success: false, error: 'Datos inválidos.', fieldErrors };
}

/* -------------------------------------------------------------------- */
/* 1. Consulta pública de radicado                                      */
/* -------------------------------------------------------------------- */

type ConsultaRadicadoResult = Database['public']['Functions']['fn_consultar_radicado']['Returns'][number];

export async function consultarRadicadoPublico(
  radicado: string
): Promise<ActionResult<ConsultaRadicadoResult>> {
  const parsed = z
    .string()
    .trim()
    .min(1, 'Debe indicar un radicado.')
    .safeParse(radicado);

  if (!parsed.success) {
    return errorDeValidacion(parsed.error);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('fn_consultar_radicado', {
    p_radicado: parsed.data,
  });

  if (error) {
    console.error('[consultarRadicadoPublico] Error Supabase:', error);
    return { success: false, error: error.message };
  }

  const registro = Array.isArray(data) ? data[0] : data;

  if (!registro) {
    return { success: false, error: 'No se encontró ninguna solicitud con ese radicado.' };
  }

  return { success: true, data: registro };
}

/* -------------------------------------------------------------------- */
/* 2. Crear solicitud                                                   */
/* -------------------------------------------------------------------- */

type CrearSolicitudResult = { id: string; radicado: string };

export async function crearSolicitud(
  data: CrearSolicitudInput
): Promise<ActionResult<CrearSolicitudResult>> {
  const parsed = crearSolicitudSchema.safeParse(data);
  if (!parsed.success) {
    return errorDeValidacion(parsed.error);
  }

  const supabase = await createClient();

  // Se obtiene el usuario si existe sesión, pero no se bloquea si el formulario es público
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { articulos, ...encabezado } = parsed.data;

  const { data: solicitudData, error: errorSolicitud } = await supabase
    .from('solicitudes')
    .insert({
      solicitante_id: user?.id ?? null,
      nombre_solicitante: encabezado.nombre_solicitante,
      correo_solicitante: encabezado.correo_solicitante,
      area_solicitante: encabezado.area_solicitante ?? null,
      descripcion_general: encabezado.descripcion_general,
      fecha_limite_cotizacion: encabezado.fecha_limite_cotizacion ?? null,
    })
    .select('id, radicado')
    .single();

  if (errorSolicitud || !solicitudData) {
    console.error('[crearSolicitud] Error al insertar cabecera:', errorSolicitud);
    return { success: false, error: errorSolicitud?.message ?? 'No se pudo crear la solicitud.' };
  }

  const solicitud = solicitudData as unknown as { id: string; radicado: string | null };

  const { error: errorArticulos } = await supabase.from('detalles_articulo').insert(
    articulos.map((articulo) => ({
      solicitud_id: solicitud.id,
      nombre_articulo: articulo.nombre_articulo,
      descripcion: articulo.descripcion ?? null,
      cantidad: articulo.cantidad,
      unidad_medida: articulo.unidad_medida ?? null,
      especificaciones_tecnicas: articulo.especificaciones_tecnicas ?? null,
    }))
  );

  if (errorArticulos) {
    console.error('[crearSolicitud] Error al insertar artículos:', errorArticulos);
    await supabase.from('solicitudes').delete().eq('id', solicitud.id);
    return { success: false, error: errorArticulos.message };
  }

  revalidatePath('/solicitudes');

  if (!solicitud.radicado) {
    console.error('[crearSolicitud] No se pudo obtener el radicado generado');
    return { success: false, error: 'La solicitud se creó pero no se generó el radicado.' };
  }

  // Notificaciones vía Resend protegidas contra fallos
  try {
    // 1. Notificar al Solicitante
    await notificarCambioEstado({
      correoSolicitante: encabezado.correo_solicitante,
      nombreSolicitante: encabezado.nombre_solicitante,
      radicado: solicitud.radicado,
      estado: 'Creada',
    });

    // 2. Notificar al área de Compras
    if (process.env.CORREO_COMPRAS) {
      await notificarCambioEstado({
        correoSolicitante: process.env.CORREO_COMPRAS,
        nombreSolicitante: 'Equipo de Compras',
        radicado: solicitud.radicado,
        estado: 'Creada',
      });
    }
  } catch (emailError) {
    console.error('[crearSolicitud] Error enviando correo con Resend:', emailError);
  }

  return { success: true, data: { id: solicitud.id, radicado: solicitud.radicado } };
}

/* -------------------------------------------------------------------- */
/* 3. Guardar cotizaciones (rol: compras)                               */
/* -------------------------------------------------------------------- */

export async function guardarCotizaciones(
  data: CotizacionesInput
): Promise<ActionResult<{ solicitud_id: string; estado: EstadoSolicitud }>> {
  const parsed = cotizacionesSchema.safeParse(data);
  if (!parsed.success) {
    return errorDeValidacion(parsed.error);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Debe iniciar sesión para registrar cotizaciones.' };
  }

  const {
    solicitud_id,
    cotizacion_1,
    cotizacion_2,
    cotizacion_3,
    proveedor_definitivo,
    valor_definitivo,
    observaciones,
  } = parsed.data;

  const { error: errorUpsert } = await supabase.from('cotizaciones_compras').upsert(
    {
      solicitud_id,
      proveedor_1: cotizacion_1.proveedor ?? null,
      valor_1: cotizacion_1.valor ?? null,
      url_drive_1: cotizacion_1.url_drive ?? null,
      proveedor_2: cotizacion_2.proveedor ?? null,
      valor_2: cotizacion_2.valor ?? null,
      url_drive_2: cotizacion_2.url_drive ?? null,
      proveedor_3: cotizacion_3?.proveedor ?? null,
      valor_3: cotizacion_3?.valor ?? null,
      url_drive_3: cotizacion_3?.url_drive ?? null,
      proveedor_definitivo: proveedor_definitivo ?? null,
      valor_definitivo: valor_definitivo ?? null,
      observaciones: observaciones ?? null,
      registrado_por: user.id,
    },
    { onConflict: 'solicitud_id' }
  );

  if (errorUpsert) {
    console.error('[guardarCotizaciones] Error al guardar cotización:', errorUpsert);
    return { success: false, error: errorUpsert.message };
  }

  const nuevoEstado: EstadoSolicitud = proveedor_definitivo
    ? 'En Revisión Presupuestal'
    : 'En Cotización';

  const { data: solicitudData, error: errorEstado } = await supabase
    .from('solicitudes')
    .update({ estado: nuevoEstado })
    .eq('id', solicitud_id)
    .select('id, estado, radicado, nombre_solicitante, correo_solicitante')
    .single();

  if (errorEstado || !solicitudData) {
    console.error('[guardarCotizaciones] Error al actualizar estado:', errorEstado);
    return { success: false, error: errorEstado?.message ?? 'No se pudo actualizar el estado de la solicitud.' };
  }

  const solicitud = solicitudData as unknown as {
    id: string;
    estado: EstadoSolicitud;
    radicado: string | null;
    nombre_solicitante: string;
    correo_solicitante: string;
  };

 // 🔴 CAMBIO: Revalidación completa del layout y rutas
  revalidatePath('/', 'layout');
  revalidatePath('/solicitudes');
  revalidatePath(`/solicitudes/${solicitud_id}`);


  if (solicitud.radicado) {
    try {
      // 1. Notificar al Solicitante
      await notificarCambioEstado({
        correoSolicitante: solicitud.correo_solicitante,
        nombreSolicitante: solicitud.nombre_solicitante,
        radicado: solicitud.radicado,
        estado: solicitud.estado,
      });

      // 2. Notificar al equipo de Presupuesto si avanzó de etapa
      if (nuevoEstado === 'En Revisión Presupuestal' && process.env.CORREO_PRESUPUESTO) {
        await notificarCambioEstado({
          correoSolicitante: process.env.CORREO_PRESUPUESTO,
          nombreSolicitante: 'Equipo de Presupuesto',
          radicado: solicitud.radicado,
          estado: 'En Revisión Presupuestal',
        });
      }
    } catch (emailError) {
      console.error('[guardarCotizaciones] Error enviando correo:', emailError);
    }
  }

  return { success: true, data: { solicitud_id: solicitud.id, estado: solicitud.estado } };
}

/* -------------------------------------------------------------------- */
/* 4. Guardar clasificación presupuestal (rol: presupuesto)             */
/* -------------------------------------------------------------------- */

export async function guardarPresupuesto(
  data: PresupuestoInput
): Promise<ActionResult<{ solicitud_id: string; estado: EstadoSolicitud }>> {
  const parsed = presupuestoSchema.safeParse(data);
  if (!parsed.success) {
    return errorDeValidacion(parsed.error);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Debe iniciar sesión para clasificar el presupuesto.' };
  }

  const { solicitud_id, proyecto, centro_costo, unidad_negocio, producto, campos_adicionales } = parsed.data;

  const { error: errorUpsert } = await supabase.from('clasificacion_presupuesto').upsert(
    {
      solicitud_id,
      proyecto,
      centro_costo,
      unidad_negocio,
      producto,
      campos_adicionales: (campos_adicionales ?? {}) as Json,
      clasificado_por: user.id,
    },
    { onConflict: 'solicitud_id' }
  );

  if (errorUpsert) {
    console.error('[guardarPresupuesto] Error al clasificar presupuesto:', errorUpsert);
    return { success: false, error: errorUpsert.message };
  }

  const { data: solicitudData, error: errorEstado } = await supabase
    .from('solicitudes')
    .update({ estado: 'Esperando Aprobación Final' })
    .eq('id', solicitud_id)
    .select('id, estado, radicado, nombre_solicitante, correo_solicitante')
    .single();

  if (errorEstado || !solicitudData) {
    console.error('[guardarPresupuesto] Error al actualizar estado:', errorEstado);
    return { success: false, error: errorEstado?.message ?? 'No se pudo actualizar el estado de la solicitud.' };
  }

  const solicitud = solicitudData as unknown as {
    id: string;
    estado: EstadoSolicitud;
    radicado: string | null;
    nombre_solicitante: string;
    correo_solicitante: string;
  };

  revalidatePath('/solicitudes');
  revalidatePath(`/solicitudes/${solicitud_id}`);

  if (solicitud.radicado) {
    try {
      // 1. Notificar al Solicitante
      await notificarCambioEstado({
        correoSolicitante: solicitud.correo_solicitante,
        nombreSolicitante: solicitud.nombre_solicitante,
        radicado: solicitud.radicado,
        estado: solicitud.estado,
      });

      // 2. Notificar al Autorizador / Director
      if (process.env.CORREO_AUTORIZADOR) {
        await notificarCambioEstado({
          correoSolicitante: process.env.CORREO_AUTORIZADOR,
          nombreSolicitante: 'Dirección / Autorizador',
          radicado: solicitud.radicado,
          estado: 'Esperando Aprobación Final',
        });
      }
    } catch (emailError) {
      console.error('[guardarPresupuesto] Error enviando correo:', emailError);
    }
  }

  return { success: true, data: { solicitud_id: solicitud.id, estado: solicitud.estado } };
}

/* -------------------------------------------------------------------- */
/* 5. Aprobar o rechazar solicitud (rol: autorizador)                   */
/* -------------------------------------------------------------------- */

export async function aprobarORechazarSolicitud(
  id: string,
  estado: 'Aprobada' | 'Rechazada',
  observaciones?: string
): Promise<ActionResult<{ id: string; estado: EstadoSolicitud }>> {
  const parsed = aprobacionSchema.safeParse({ id, estado, observaciones });
  if (!parsed.success) {
    return errorDeValidacion(parsed.error);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Debe iniciar sesión para aprobar o rechazar una solicitud.' };
  }

  const { data: solicitudData, error } = await supabase
    .from('solicitudes')
    .update({
      estado: parsed.data.estado,
      observaciones_finales: parsed.data.observaciones ?? null,
    } as any)
    .eq('id', parsed.data.id)
    .select('id, estado, radicado, nombre_solicitante, correo_solicitante')
    .single();

  if (error || !solicitudData) {
    console.error('[aprobarORechazarSolicitud] Error al cambiar estado:', error);
    return {
      success: false,
      error: error?.message ?? 'No se pudo actualizar la solicitud. Verifique su rol y el estado actual.',
    };
  }

  const solicitud = solicitudData as unknown as {
    id: string;
    estado: EstadoSolicitud;
    radicado: string | null;
    nombre_solicitante: string;
    correo_solicitante: string;
  };

  revalidatePath('/solicitudes');
  revalidatePath(`/solicitudes/${parsed.data.id}`);

  if (solicitud.radicado) {
    try {
      // Notificar decisión final al solicitante
      await notificarCambioEstado({
        correoSolicitante: solicitud.correo_solicitante,
        nombreSolicitante: solicitud.nombre_solicitante,
        radicado: solicitud.radicado,
        estado: solicitud.estado,
        observaciones: parsed.data.observaciones ?? null,
      });
    } catch (emailError) {
      console.error('[aprobarORechazarSolicitud] Error enviando correo:', emailError);
    }
  }

  return { success: true, data: { id: solicitud.id, estado: solicitud.estado } };
}

// Inicializamos el cliente de correo con la API Key configurada en .env.local
const resend = new Resend(process.env.RESEND_API_KEY);

export async function rechazarSolicitudPresupuesto(solicitudId: string, motivo: string) {
  try {
    const supabase = await createClient();

    // 1. Consultar la información del solicitante en la base de datos
    const { data: solicitud, error: fetchError } = await (supabase as any)
      .from('solicitudes')
      .select('id, radicado, correo_solicitante, nombre_solicitante, descripcion_general')
      .eq('id', solicitudId)
      .single();

    if (fetchError || !solicitud) {
      console.error('Error al obtener datos de la solicitud:', fetchError);
      return { success: false, error: 'No se encontró la solicitud a rechazar.' };
    }

    // 2. Actualizar el estado de la solicitud a 'Rechazada'
    const { error: updateError } = await (supabase as any)
      .from('solicitudes')
      .update({
        estado: 'Rechazada',
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id', solicitudId);

    if (updateError) {
      console.error('Error al actualizar estado en Supabase:', updateError);
      return { success: false, error: 'No se pudo actualizar el estado de la solicitud en la base de datos.' };
    }

    // 3. Despachar el correo electrónico de notificación
    if (solicitud.correo_solicitante) {
      const emailResult = await resend.emails.send({
        from: 'Presupuesto Institucional <onboarding@resend.dev>', // Dirección o remitente verificado
        to: [solicitud.correo_solicitante],
        subject: `Notificación de rechazo de solicitud: ${solicitud.radicado || solicitud.id}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; color: #1e293b; line-height: 1.5;">
            <h2 style="color: #dc2626; border-bottom: 2px solid #fecdd3; padding-bottom: 8px;">
              Solicitud No Aprobada por Presupuesto
            </h2>
            <p>Estimado(a) <strong>${solicitud.nombre_solicitante || 'Solicitante'}</strong>,</p>
            <p>
              Le informamos que su solicitud con radicado 
              <strong>${solicitud.radicado || solicitud.id}</strong> ha sido marcada como 
              <span style="color: #dc2626; font-weight: bold;">RECHAZADA</span> debido a falta de disponibilidad presupuestal.
            </p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 20px 0; border-radius: 0 6px 6px 0;">
              <strong style="color: #991b1b;">Motivo / Observación del área de Presupuesto:</strong>
              <p style="margin-top: 6px; margin-bottom: 0; color: #7f1d1d; white-space: pre-wrap;">${motivo}</p>
            </div>

            <p style="font-size: 0.875rem; color: #64748b; margin-top: 24px;">
              Este es un mensaje automático. Si requiere orientación adicional, por favor comuníquese con la División Financiera.
            </p>
          </div>
        `,
      });

      if (emailResult.error) {
        console.error('Error al enviar correo de notificación:', emailResult.error);
        return { 
          success: true, 
          warning: 'La solicitud se rechazó en el sistema, pero falló el envío del correo de notificación.' 
        };
      }
    } else {
      console.warn('La solicitud no registra un correo de solicitante para enviar la notificación.');
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error inesperado al rechazar solicitud:', err);
    return { success: false, error: 'Ocurrió un error inesperado al procesar el rechazo.' };
  }
}

// Obtener los artículos detallados de una solicitud
export async function obtenerDetallesArticulo(solicitudId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('detalles_articulo')
    .select('*')
    .eq('solicitud_id', solicitudId);

  if (error) {
    console.error('Error al obtener artículos:', error);
    return [];
  }
  return data || [];
}

// Obtener las cotizaciones y decisión cargadas por Compras
export async function obtenerCotizacionCompra(solicitudId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cotizaciones_compras')
    .select('*')
    .eq('solicitud_id', solicitudId)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener cotizaciones de compras:', error);
    return null;
  }
  return data;
}
// -------------------------------------------------------------
// FUNCIÓN AUXILIAR PARA ENVIAR EL CORREO DE RECHAZO
// -------------------------------------------------------------
async function enviarCorreoRechazoPresupuesto({
  para,
  nombreSolicitante,
  radicado,
  motivo,
}: {
  para: string;
  nombreSolicitante: string;
  radicado: string;
  motivo: string;
}) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #991b1b; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px;">Solicitud Rechazada por Presupuesto</h2>
      </div>
      
      <div style="padding: 24px; color: #334155;">
        <p>Hola, <strong>${nombreSolicitante}</strong>:</p>
        
        <p>Te informamos que tu solicitud con radicado <strong>${radicado}</strong> ha sido <span style="color: #dc2626; font-weight: bold;">RECHAZADA</span> por el área de Presupuesto debido a falta de disponibilidad presupuestal.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <strong style="color: #991b1b; display: block; margin-bottom: 4px;">Motivo / Observación del rechazo:</strong>
          <p style="margin: 0; color: #7f1d1d; font-style: italic;">"${motivo}"</p>
        </div>

        <p style="font-size: 13px; color: #64748b;"> Si tienes dudas o requieres ajustar el requerimiento, por favor ponte en contacto con la Dirección Financiera / Presupuesto.</p>
      </div>

      <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Sistema de Gestión de Compras y Presupuesto — Uniautónoma
      </div>
    </div>
  `;

  await resend.emails.send({
    from: 'Presupuesto <notificaciones@tu-dominio.com>', // Cambia por tu remitente verificado en Resend
    to: [para],
    subject: `❌ Solicitud Rechazada [${radicado}] - Falta de Presupuesto`,
    html: htmlContent,
  });
}