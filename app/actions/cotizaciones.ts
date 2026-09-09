'use server';

import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface ProveedorInput {
  nombre_proveedor: string;
  identificacion: string;
  direccion?: string;
  telefono?: string;
  contacto?: string;
  correo_electronico: string;
}

export async function registrarProveedor(data: ProveedorInput) {
  const supabase = await createClient();

  const { data: nuevoProveedor, error } = await supabase
    .from('proveedores')
    .insert([data])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: nuevoProveedor };
}

export async function enviarSolicitudCotizacion(solicitudId: string, proveedorId: string) {
  const supabase = await createClient();

  // 1. Obtener la solicitud
  const { data: solicitud, error: errorSolicitud } = await supabase
    .from('solicitudes')
    .select('*')
    .eq('id', solicitudId)
    .single();

  if (errorSolicitud || !solicitud) {
    return { success: false, error: 'No se encontró la solicitud seleccionada.' };
  }

  const solicitudData = solicitud as any;

  // 2. Obtener los artículos asociados desde "detalles_articulo"
  const { data: items, error: errorItems } = await supabase
    .from('detalles_articulo')
    .select('*')
    .eq('solicitud_id', solicitudId);

  if (errorItems) {
    return { success: false, error: 'Error al consultar los artículos de la solicitud.' };
  }

  // 3. Obtener los datos del proveedor
  const { data: proveedor, error: errorProveedor } = await supabase
    .from('proveedores')
    .select('*')
    .eq('id', proveedorId)
    .single();

  if (errorProveedor || !proveedor) {
    return { success: false, error: 'No se encontró el proveedor seleccionado.' };
  }

  const proveedorData = proveedor as any;

  // 4. Generar las filas HTML de los artículos
  const filasArticulosHTML = (items || []).map((item: any) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${item.nombre_articulo}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${item.cantidad}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${item.unidad_medida || 'Unidad'}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${item.especificaciones_tecnicas || item.descripcion || 'N/A'}</td>
    </tr>
  `).join('');

  // 5. Construir la plantilla HTML del correo
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">Solicitud de Cotización</h2>
      <p>Estimado(a) <strong>${proveedorData.contacto || proveedorData.nombre_proveedor}</strong>,</p>
      <p>Nos comunicamos del área de compras de la Corporación Universitaria Autonoma de Cauca, para solicitar formalmente la cotización de los siguientes artículos relacionados en la solicitud <strong>#${solicitudData.radicado || solicitudData.id}</strong>:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8fafc; text-align: left;">
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Artículo</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Cantidad</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Unidad</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Especificaciones</th>
          </tr>
        </thead>
        <tbody>
          ${filasArticulosHTML}
        </tbody>
      </table>

      <p>Agradecemos enviarnos los precios unitarios, tiempos de entrega y condiciones de pago.</p>
      <p style="margin-top: 24px; font-size: 12px; color: #64748b;">Este es un correo automático generado por el Sistema Gestor de Compras.</p>
    </div>
  `;

  // 6. Enviar el correo usando el dominio propio verificado
  try {
    const response = await resend.emails.send({
      from: 'Compras <compras@uniautonoma.edu.co>',
      to: proveedorData.correo_electronico,
      subject: `Solicitud de Cotización - Radicado #${solicitudData.radicado || solicitudData.id}`,
      html: htmlContent,
    });

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al enviar el correo electrónico.' };
  }
}