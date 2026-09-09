import { createClient } from '@/lib/supabase/server';
import CotizadorClient from './CotizadorClient';

export const revalidate = 0;

export default async function CotizacionesPage() {
  const supabase = await createClient();

  // 1. Obtener solicitudes
  const { data: solicitudesRaw, error: errorSolicitudes } = await supabase
    .from('solicitudes')
    .select('*')
    .order('fecha_creacion', { ascending: false });

  if (errorSolicitudes) {
    console.error('❌ Error Supabase en solicitudes:', errorSolicitudes.message);
  }

  const solicitudes = (solicitudesRaw as any[]) || [];

  // 2. Obtener los artículos desde la tabla "detalles_articulo"
  let solicitudesConItems = solicitudes;

  if (solicitudes.length > 0) {
    const ids = solicitudes.map((s) => s.id);

    const { data: itemsRaw, error: errorItems } = await supabase
      .from('detalles_articulo')
      .select('*')
      .in('solicitud_id', ids);

    if (errorItems) {
      console.error('❌ Error Supabase en detalles_articulo:', errorItems.message);
    }

    const items = (itemsRaw as any[]) || [];

    solicitudesConItems = solicitudes.map((sol) => ({
      ...sol,
      items: items
        ? items
            .filter((item) => item.solicitud_id === sol.id)
            .map((item) => ({
              id: item.id,
              articulo: item.nombre_articulo,
              cantidad: item.cantidad,
              unidad: item.unidad_medida || 'Unidad',
              especificaciones: item.especificaciones_tecnicas || item.descripcion || '-',
            }))
        : [],
    }));
  }

  // 3. Obtener proveedores
  const { data: proveedoresRaw, error: errorProveedores } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre_proveedor', { ascending: true });

  if (errorProveedores) {
    console.error('❌ Error Supabase en proveedores:', errorProveedores.message);
  }

  const proveedores = (proveedoresRaw as any[]) || [];

  return (
    <CotizadorClient
      solicitudesIniciales={solicitudesConItems}
      proveedoresIniciales={proveedores}
    />
  );
}