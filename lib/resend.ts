'use server';

import { Resend } from 'resend';
import type { EstadoSolicitud } from '@/lib/supabase/database.types';

// Inicialización del cliente de Resend con la clave de entorno
const resend = new Resend(process.env.RESEND_API_KEY);

// Obtiene el remitente desde Vercel o usa el de prueba como respaldo
const REMITENTE = process.env.RESEND_FROM_EMAIL || 'Sistema de Compras <onboarding@resend.dev>';
const CORREO_COMPRAS = 'cotizaciones@uniautonoma.edu.co';
const CORREO_PRESUPUESTO = 'presupuesto@uniautonoma.edu.co';
const CORREO_AUTORIZADOR = 'autorizador@uniautonoma.edu.co';

const MENSAJES_POR_ESTADO: Record<EstadoSolicitud, { asunto: string; cuerpo: string }> = {
  Creada: {
    asunto: 'Hemos recibido tu solicitud de compra',
    cuerpo: 'Tu solicitud fue registrada exitosamente y está pendiente de gestión por el área de compras.',
  },
  'En Cotización': {
    asunto: 'Tu solicitud está en proceso de cotización',
    cuerpo: 'El área de compras está gestionando las cotizaciones de tu solicitud.',
  },
  'En Revisión Presupuestal': {
    asunto: 'Tu solicitud pasó a revisión presupuestal',
    cuerpo: 'El área de presupuesto está clasificando la rubración/presupuesto de tu solicitud.',
  },
  'Esperando Aprobación Final': {
    asunto: 'Tu solicitud está a la espera de aprobación final',
    cuerpo: 'Tu solicitud fue enviada al autorizador para su decisión final.',
  },
  Aprobada: {
    asunto: '¡Tu solicitud de compra fue aprobada!',
    cuerpo: 'Tu solicitud fue aprobada y se ha emitido la orden de compra correspondiente.',
  },
  Rechazada: {
    asunto: 'Tu solicitud de compra fue rechazada',
    cuerpo: 'Lamentamos informarte que tu solicitud no fue aprobada en esta ocasión.',
  },
};

interface NotificacionEstadoParams {
  correoSolicitante: string;
  nombreSolicitante: string;
  radicado: string;
  estado: EstadoSolicitud;
  observaciones?: string | null;
  esParaCompras?: boolean;
  esParaPresupuesto?: boolean;
  esParaAutorizador?: boolean;
}

export type ArticuloDetalleEmail = {
  nombre_articulo: string;
  cantidad: number;
  unidad_medida?: string | null;
  especificaciones_tecnicas?: string | null;
  descripcion?: string | null;
};

export type NotificacionProveedorParams = {
  correoProveedor: string;
  nombreProveedor: string;
  radicado: string;
  nombreSolicitante: string;
  articulos: ArticuloDetalleEmail[];
  valorTotal?: number | null;
  observaciones?: string | null;
};

type NotificacionResultado = { success: true } | { success: false; error: string };

/**
 * Envía una notificación por correo electrónico del cambio de estado.
 */
export async function notificarCambioEstado(
  params: NotificacionEstadoParams
): Promise<NotificacionResultado> {
  const {
    correoSolicitante,
    nombreSolicitante,
    radicado,
    estado,
    observaciones,
    esParaCompras,
    esParaPresupuesto,
    esParaAutorizador,
  } = params;

  if (!process.env.RESEND_API_KEY) {
    console.warn('[resend] RESEND_API_KEY no está configurada; se omite el envío de correo.');
    return { success: false, error: 'RESEND_API_KEY no configurada.' };
  }

  const plantilla = MENSAJES_POR_ESTADO[estado];

  if (!plantilla) {
    console.error(`[resend] Estado desconocido o sin plantilla definida: ${estado}`);
    return { success: false, error: `Estado ${estado} no reconocido.` };
  }

  const esCorreoCompras =
    esParaCompras === true || correoSolicitante.toLowerCase() === CORREO_COMPRAS.toLowerCase();

  const esCorreoPresupuesto =
    esParaPresupuesto === true || correoSolicitante.toLowerCase() === CORREO_PRESUPUESTO.toLowerCase();

  const esCorreoAutorizador =
    esParaAutorizador === true || correoSolicitante.toLowerCase() === CORREO_AUTORIZADOR.toLowerCase();

  try {
    console.log(`[resend] Enviando notificación a ${correoSolicitante} para radicado ${radicado}...`);

    const { data, error } = await resend.emails.send({
      from: REMITENTE,
      to: correoSolicitante,
      subject: `${plantilla.asunto} — ${radicado}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e293b; margin-top: 0;">Sistema de Gestión de Compras</h2>
          <p>Hola <strong>${nombreSolicitante}</strong>,</p>
          <p>${plantilla.cuerpo}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p><strong>Número de Radicado:</strong> ${radicado}</p>
          <p><strong>Estado Actual:</strong> <span style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${estado}</span></p>
          ${observaciones ? `<p><strong>Observaciones:</strong> ${observaciones}</p>` : ''}
          
          ${
            esCorreoCompras
              ? `
            <div style="margin: 25px 0; text-align: center;">
              <a href="https://compras-autonoma.vercel.app/compras" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                📋 Gestionar Cotizaciones en el Módulo de Compras
              </a>
              <p style="margin-top: 8px; font-size: 0.8rem; color: #64748b;">
                Enlace directo: <a href="https://compras-autonoma.vercel.app/compras" style="color: #2563eb;">https://compras-autonoma.vercel.app/compras</a>
              </p>
            </div>
            `
              : ''
          }

          ${
            esCorreoPresupuesto
              ? `
            <div style="margin: 25px 0; text-align: center;">
              <a href="https://compras-autonoma.vercel.app/presupuesto" target="_blank" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                📊 Clasificar en Módulo de Presupuesto
              </a>
              <p style="margin-top: 8px; font-size: 0.8rem; color: #64748b;">
                Enlace directo: <a href="https://compras-autonoma.vercel.app/presupuesto" style="color: #059669;">https://compras-autonoma.vercel.app/presupuesto</a>
              </p>
            </div>
            `
              : ''
          }

          ${
            esCorreoAutorizador
              ? `
            <div style="margin: 25px 0; text-align: center;">
              <a href="https://compras-autonoma.vercel.app/autorizador" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                ✍️ Revisar y Aprobar en Módulo Autorizador
              </a>
              <p style="margin-top: 8px; font-size: 0.8rem; color: #64748b;">
                Enlace directo: <a href="https://compras-autonoma.vercel.app/autorizador" style="color: #4f46e5;">https://compras-autonoma.vercel.app/autorizador</a>
              </p>
            </div>
            `
              : ''
          }

          <br/>
          <p style="font-size: 0.85rem; color: #64748b;">Puedes consultar el estado de tu solicitud en cualquier momento ingresando tu radicado en el buscador público del sistema.</p>
        </div>
      `,
    });

    if (error) {
      console.error('[resend] Error devuelto por la API de Resend:', error);
      return { success: false, error: error.message };
    }

    console.log(`[resend] Correo enviado exitosamente (ID: ${data?.id})`);
    return { success: true };
  } catch (err) {
    console.error('[resend] Excepción inesperada al procesar el correo:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

/**
 * Notificación formal de Orden de Compra enviada directamente al PROVEEDOR GANADOR.
 */
export async function notificarOrdenCompraProveedor(
  params: NotificacionProveedorParams
): Promise<NotificacionResultado> {
  const { correoProveedor, nombreProveedor, radicado, nombreSolicitante, articulos, valorTotal, observaciones } = params;

  if (!process.env.RESEND_API_KEY) {
    console.warn('[resend] RESEND_API_KEY no está configurada; se omite el envío de correo.');
    return { success: false, error: 'RESEND_API_KEY no configurada.' };
  }

  try {
    console.log(`[resend] Enviando Orden de Compra a proveedor ${correoProveedor} para radicado ${radicado}...`);

    const filasArticulosHTML = articulos
      .map(
        (art) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${art.nombre_articulo}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${art.cantidad}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${art.unidad_medida || '-'}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 0.85rem;">${art.especificaciones_tecnicas || art.descripcion || '-'}</td>
        </tr>
      `
      )
      .join('');

    const { data, error } = await resend.emails.send({
      from: REMITENTE,
      to: correoProveedor,
      subject: `Orden de Compra Confirmada — Radicado ${radicado}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e293b; margin-top: 0; border-b: 2px solid #2563eb; padding-bottom: 8px;">Confirmación de Orden de Compra</h2>
          <p>Estimados(as) <strong>${nombreProveedor}</strong>,</p>
          <p>Nos complace informarles que la cotización presentada para la solicitud con radicado <strong>${radicado}</strong> ha sido <strong>APROBADA</strong> por la institución.</p>
          
          <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Número de Radicado:</strong> ${radicado}</p>
            <p style="margin: 4px 0;"><strong>Solicitante Interno:</strong> ${nombreSolicitante}</p>
            ${valorTotal ? `<p style="margin: 4px 0;"><strong>Valor Total Aprobado:</strong> $ ${valorTotal.toLocaleString('es-CO')}</p>` : ''}
            ${observaciones ? `<p style="margin: 4px 0;"><strong>Observaciones adicionales:</strong> ${observaciones}</p>` : ''}
          </div>

          <h3 style="color: #1e293b; margin-top: 20px; font-size: 1rem;">Detalle de Artículos / Servicios Solicitados:</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 0.9rem;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 8px; border: 1px solid #cbd5e1;">Artículo</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Cantidad</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1;">Unidad</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1;">Especificaciones</th>
              </tr>
            </thead>
            <tbody>
              ${filasArticulosHTML}
            </tbody>
          </table>

          <br/>
          <p style="font-size: 0.85rem; color: #64748b;">Por favor ponerse en contacto con el área correspondiente para coordinar la entrega y facturación de los ítems detallados.</p>
        </div>
      `,
    });

    if (error) {
      console.error('[resend] Error al enviar orden de compra a proveedor:', error);
      return { success: false, error: error.message };
    }

    console.log(`[resend] Orden de compra enviada al proveedor ${correoProveedor} (ID: ${data?.id})`);
    return { success: true };
  } catch (err) {
    console.error('[resend] Excepción inesperada enviando correo a proveedor:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

export async function notificarNuevaSolicitud(params: {
  correoSolicitante: string;
  nombreSolicitante: string;
  radicado: string;
  observaciones?: string | null;
}): Promise<NotificacionResultado> {
  const { correoSolicitante, nombreSolicitante, radicado, observaciones } = params;

  await notificarCambioEstado({
    correoSolicitante,
    nombreSolicitante,
    radicado,
    estado: 'Creada',
    observaciones,
    esParaCompras: false,
    esParaPresupuesto: false,
    esParaAutorizador: false,
  });

  await notificarCambioEstado({
    correoSolicitante: CORREO_COMPRAS,
    nombreSolicitante: 'Equipo de Compras',
    radicado,
    estado: 'Creada',
    observaciones: `Nueva solicitud registrada por ${nombreSolicitante} (${correoSolicitante}).`,
    esParaCompras: true,
  });

  return { success: true };
}

export async function notificarRevisionPresupuestal(params: {
  correoSolicitante: string;
  nombreSolicitante: string;
  radicado: string;
  observaciones?: string | null;
}): Promise<NotificacionResultado> {
  const { correoSolicitante, nombreSolicitante, radicado, observaciones } = params;

  await notificarCambioEstado({
    correoSolicitante,
    nombreSolicitante,
    radicado,
    estado: 'En Revisión Presupuestal',
    observaciones,
    esParaCompras: false,
    esParaPresupuesto: false,
    esParaAutorizador: false,
  });

  await notificarCambioEstado({
    correoSolicitante: CORREO_PRESUPUESTO,
    nombreSolicitante: 'Equipo de Presupuesto',
    radicado,
    estado: 'En Revisión Presupuestal',
    observaciones: `Solicitud remitida a revisión presupuestal. Solicitante: ${nombreSolicitante} (${correoSolicitante}).`,
    esParaPresupuesto: true,
  });

  return { success: true };
}

export async function notificarAprobacionFinal(params: {
  correoSolicitante: string;
  nombreSolicitante: string;
  radicado: string;
  observaciones?: string | null;
}): Promise<NotificacionResultado> {
  const { correoSolicitante, nombreSolicitante, radicado, observaciones } = params;

  await notificarCambioEstado({
    correoSolicitante,
    nombreSolicitante,
    radicado,
    estado: 'Esperando Aprobación Final',
    observaciones,
    esParaCompras: false,
    esParaPresupuesto: false,
    esParaAutorizador: false,
  });

  await notificarCambioEstado({
    correoSolicitante: CORREO_AUTORIZADOR,
    nombreSolicitante: 'Autorizador General',
    radicado,
    estado: 'Esperando Aprobación Final',
    observaciones: `Solicitud pendiente de tu aprobación final. Solicitante: ${nombreSolicitante} (${correoSolicitante}).`,
    esParaAutorizador: true,
  });

  return { success: true };
}