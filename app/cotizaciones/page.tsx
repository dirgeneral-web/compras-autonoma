import { createClient } from '@/lib/supabase/server';
import CotizadorClient from './CotizadorClient';

export const revalidate = 0;

export default async function CotizacionesPage() {
  const supabase = await createClient();

  // 1. Obtener solicitudes ordenadas por fecha_creacion
  const { data: solicitudes, error: errorSolicitudes } = await supabase
    .from('solicitudes')
    .select('*')
    .order('fecha_creacion', { ascending: false });

  if (errorSolicitudes) {
    console.error('❌ Error Supabase en solicitudes:', errorSolicitudes.message);
  }

  // 2. Obtener los artículos desde la tabla "detalles_articulo"
  let solicitudesConItems = solicitudes || [];

  if (solicitudes && solicitudes.length > 0) {
    const ids = solicitudes.map((s) => s.id);

    const { data: items, error: errorItems } = await supabase
      .from('detalles_articulo')
      .select('*')
      .in('solicitud_id', ids);

    if (errorItems) {
      console.error('❌ Error Supabase en detalles_articulo:', errorItems.message);
    }

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
  const { data: proveedores, error: errorProveedores } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre_proveedor', { ascending: true });

  if (errorProveedores) {
    console.error('❌ Error Supabase en proveedores:', errorProveedores.message);
  }

  return (
    <CotizadorClient
      solicitudesIniciales={solicitudesConItems}
      proveedoresIniciales={proveedores || []}
    />
  );
}