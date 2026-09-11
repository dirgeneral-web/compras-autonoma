import { createClient } from '@/lib/supabase/server';
import CotizadorClient from './CotizadorClient';

export const revalidate = 0;

export default async function CotizacionesPage() {
  const supabase = await createClient();

  // 1. Obtener los IDs de solicitudes que ya existen en "cotizaciones_compras"
  const { data: cotizadasRaw, error: errorCotizadas } = await supabase
    .from('cotizaciones_compras')
    .select('solicitud_id');

  if (errorCotizadas) {
    console.error('❌ Error Supabase en cotizaciones_compras:', errorCotizadas.message);
  }

  const idsCotizados = ((cotizadasRaw as any[]) || [])
    .map((c) => c.solicitud_id)
    .filter(Boolean);

  // 2. Obtener todas las solicitudes sin filtros complejos de PostgREST
  const { data: solicitudesRaw, error: errorSolicitudes } = await supabase
    .from('solicitudes')
    .select('*')
    .order('fecha_creacion', { ascending: false });

  if (errorSolicitudes) {
    console.error('❌ Error Supabase en solicitudes:', errorSolicitudes.message);
  }

  const todasLasSolicitudes = (solicitudesRaw as any[]) || [];

  // Filtrar en el servidor JS: excluye si fue enviada a cotización o si ya tiene registro cotizado
const solicitudesValidas = todasLasSolicitudes.filter((sol) => {
  const esEnviada = sol.enviada_a_cotizacion === true || sol.estado === 'enviada';
  const esCotizada = idsCotizados.includes(sol.id);
  return !esEnviada && !esCotizada;
});

  // 4. Obtener los artículos para las solicitudes filtradas
  let solicitudesConItems = solicitudesValidas;

  if (solicitudesValidas.length > 0) {
    const ids = solicitudesValidas.map((s) => s.id);

    const { data: itemsRaw, error: errorItems } = await supabase
      .from('detalles_articulo')
      .select('*')
      .in('solicitud_id', ids);

    if (errorItems) {
      console.error('❌ Error Supabase en detalles_articulo:', errorItems.message);
    }

    const items = (itemsRaw as any[]) || [];

    solicitudesConItems = solicitudesValidas.map((sol) => ({
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

  // 5. Obtener proveedores
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