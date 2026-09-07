'use server';

import { Resend } from 'resend';
import type { EstadoSolicitud } from '@/lib/supabase/database.types';

// Inicialización del cliente de Resend con la clave de entorno
const resend = new Resend(process.env.RESEND_API_KEY);

// Obtiene el remitente desde Vercel o usa el de prueba como respaldo
const REMITENTE = process.env.RESEND_FROM_EMAIL || 'Sistema de Compras <onboarding@resend.dev>';

const MENSAJES_POR_ESTADO: Record<EstadoSolicitud, { asunto: string; cuerpo: string }> = {
  Creada: {
    asunto: 'Hemos recibido tu solicitud de compra',
    cuerpo: 'Tu solicitud fue registrada exitosamente y está pendiente de cotización.',
  },
  'En Cotización': {
    asunto: 'Tu solicitud está en proceso de cotización',
    cuerpo: 'El área de compras está gestionando las cotizaciones de tu solicitud.',
  },
  'En Revisión Presupuestal': {
    asunto: 'Tu solicitud pasó a revisión presupuestal',
    cuerpo: 'El área de presupuesto está clasificando tu solicitud.',
  },
  'Esperando Aprobación Final': {
    asunto: 'Tu solicitud está a la espera de aprobación final',
    cuerpo: 'Tu solicitud fue enviada al autorizador para su decisión final.',
  },
  Aprobada: {
    asunto: '¡Tu solicitud de compra fue aprobada!',
    cuerpo: 'Tu solicitud fue aprobada y continuará con el proceso de compra.',
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
}

type NotificacionResultado = { success: true } | { success: false; error: string };

/**
 * Envía un correo transaccional al `correo_solicitante` cuando cambia el
 * estado de su solicitud.
 */
export async function notificarCambioEstado(
  params: NotificacionEstadoParams
): Promise<NotificacionResultado> {
  const { correoSolicitante, nombreSolicitante, radicado, estado, observaciones } = params;

  if (!process.env.RESEND_API_KEY) {
    console.warn('[resend] RESEND_API_KEY no está configurada; se omite el envío de correo.');
    return { success: false, error: 'RESEND_API_KEY no configurada.' };
  }

  const plantilla = MENSAJES_POR_ESTADO[estado];

  if (!plantilla) {
    console.error(`[resend] Estado desconocido o sin plantilla definida: ${estado}`);
    return { success: false, error: `Estado ${estado} no reconocido.` };
  }

  try {
    console.log(`[resend] Intentando enviar notificación a ${correoSolicitante} para radicado ${radicado}...`);

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