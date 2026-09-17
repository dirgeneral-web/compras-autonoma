'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ReportePresupuesto = {
  id: string;
  radicado: string;
  nombre_solicitante: string;
  area_solicitante: string;
  proyecto: string;
  centro_costo: string;
  unidad_negocio: string;
  producto_articulo: string;
  estado_presupuesto: 'Autorizado' | 'Rechazado' | 'En Revisión' | 'Pendiente';
  proveedor_seleccionado: string;
  valor_total: number;
  fecha_registro: string;
};

export default function ConsultasPresupuestoPage() {
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState<ReportePresupuesto[]>([]);

  // 10 Filtros de Consulta
  const [filtroRadicado, setFiltroRadicado] = useState('');
  const [filtroSolicitante, setFiltroSolicitante] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [filtroCentroCosto, setFiltroCentroCosto] = useState('');
  const [filtroUnidadNegocio, setFiltroUnidadNegocio] = useState('');
  const [filtroProducto, setFiltroProducto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos'); // 'Autorizado', 'Rechazado', 'todos'
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');

  const ejecutarConsulta = useCallback(async () => {
    setCargando(true);
    const supabase = createClient();

    let query = supabase.from('solicitudes').select(`
      id,
      radicado,
      nombre_solicitante,
      area_solicitante,
      proyecto,
      centro_costo,
      unidad_negocio,
      estado,
      proveedor_definitivo,
      valor_definitivo,
      created_at,
      detalles_articulo (
        nombre_articulo
      )
    `);

    // Aplica los filtros activos en la consulta a Supabase
    if (filtroRadicado.trim()) query = query.ilike('radicado', `%${filtroRadicado.trim()}%`);
    if (filtroSolicitante.trim()) query = query.ilike('nombre_solicitante', `%${filtroSolicitante.trim()}%`);
    if (filtroArea.trim()) query = query.ilike('area_solicitante', `%${filtroArea.trim()}%`);
    if (filtroProyecto.trim()) query = query.ilike('proyecto', `%${filtroProyecto.trim()}%`);
    if (filtroCentroCosto.trim()) query = query.ilike('centro_costo', `%${filtroCentroCosto.trim()}%`);
    if (filtroUnidadNegocio.trim()) query = query.ilike('unidad_negocio', `%${filtroUnidadNegocio.trim()}%`);
    if (filtroProveedor.trim()) query = query.ilike('proveedor_definitivo', `%${filtroProveedor.trim()}%`);
    
    if (filtroEstado === 'Autorizado') query = query.eq('estado', 'Aprobada');
    if (filtroEstado === 'Rechazado') query = query.eq('estado', 'Rechazada');
    
    if (fechaInicio) query = query.gte('created_at', `${fechaInicio}T00:00:00`);
    if (fechaFin) query = query.lte('created_at', `${fechaFin}T23:59:59`);

    const { data, error } = await query.order('created_at', { ascending: false });

    setCargando(false);

    if (error) {
      console.error('Error al consultar datos de presupuesto:', error);
      return;
    }

    // Mapeo normalizado de respuestas
    const formateados: ReportePresupuesto[] = (data || []).map((item: any) => {
      const articulos = item.detalles_articulo?.map((a: any) => a.nombre_articulo).join(', ') || 'N/A';
      
      return {
        id: item.id,
        radicado: item.radicado || 'Sin radicado',
        nombre_solicitante: item.nombre_solicitante || 'Sin nombre',
        area_solicitante: item.area_solicitante || 'N/A',
        proyecto: item.proyecto || 'N/A',
        centro_costo: item.centro_costo || 'N/A',
        unidad_negocio: item.unidad_negocio || 'N/A',
        producto_articulo: articulos,
        estado_presupuesto: item.estado === 'Aprobada' ? 'Autorizado' : item.estado === 'Rechazada' ? 'Rechazado' : 'En Revisión',
        proveedor_seleccionado: item.proveedor_definitivo || 'Pendiente',
        valor_total: item.valor_definitivo || 0,
        fecha_registro: new Date(item.created_at).toLocaleDateString('es-CO'),
      };
    });

    // Filtro secundario en memoria para productos
    const resultadoFinal = filtroProducto.trim()
      ? formateados.filter((f) => f.producto_articulo.toLowerCase().includes(filtroProducto.toLowerCase().trim()))
      : formateados;

    setDatos(resultadoFinal);
  }, [
    filtroRadicado,
    filtroSolicitante,
    filtroArea,
    filtroProyecto,
    filtroCentroCosto,
    filtroUnidadNegocio,
    filtroProducto,
    filtroEstado,
    fechaInicio,
    fechaFin,
    filtroProveedor,
  ]);

  useEffect(() => {
    ejecutarConsulta();
  }, [ejecutarConsulta]);

  function limpiarFiltros() {
    setFiltroRadicado('');
    setFiltroSolicitante('');
    setFiltroArea('');
    setFiltroProyecto('');
    setFiltroCentroCosto('');
    setFiltroUnidadNegocio('');
    setFiltroProducto('');
    setFiltroEstado('todos');
    setFechaInicio('');
    setFechaFin('');
    setFiltroProveedor('');
  }

  // Cálculos dinámicos del Dashboard
  const totalRegistros = datos.length;
  const totalAutorizados = datos.filter((d) => d.estado_presupuesto === 'Autorizado').length;
  const totalRechazados = datos.filter((d) => d.estado_presupuesto === 'Rechazado').length;
  const montoTotalAprobado = datos
    .filter((d) => d.estado_presupuesto === 'Autorizado')
    .reduce((acc, curr) => acc + curr.valor_total, 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard — Consultas de Presupuesto
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Filtra y analiza todos los registros, aprobaciones y rechazos procesados por el área de presupuesto.
          </p>
        </div>
        <Link
          href="/compras"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          &larr; Volver a Compras
        </Link>
      </div>

      {/* Tarjetas del Dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">Solicitudes Consultadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalRegistros}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-green-600">Autorizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalAutorizados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-red-600">Rechazadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalRechazados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-blue-600">Monto Aprobado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-900">
              ${montoTotalAprobado.toLocaleString('es-CO')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel de Filtros Interactivos (10 Criterios) */}
      <Card className="border-slate-300">
        <CardHeader className="bg-slate-50 border-b pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-semibold text-slate-900">
              Panel de Búsqueda y Filtros Avanzados
            </CardTitle>
            <Button variant="outline" size="sm" onClick={limpiarFiltros}>
              Limpiar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs font-semibold uppercase text-slate-600">1. Radicado / Solicitud</Label>
            <Input
              placeholder="SOL-2026-0001"
              value={filtroRadicado}
              onChange={(e) => setFiltroRadicado(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase text-slate-600">2. Solicitante</Label>
            <Input
              placeholder="Nombre del solicitante"
              value={filtroSolicitante}
              onChange={(e) => setFiltroSolicitante(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase text-slate-600">3. Área</Label>
            <Input
              placeholder="Ej: Tecnología, Gestión Humana"
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase text-slate-600">4. Proyecto</Label>
            <Input
              placeholder="Nombre del proyecto"
              value={filtroProyecto}
              onChange={(e) => setFiltroProyecto(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase text-slate-600">5. Centro de Costo</Label>
            <Input
              placeholder="Ej: CC-102"
              value={filtroCentroCosto}
              onChange={(e) => setFiltroCentroCosto(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase text-slate-600">6. Unidad de Negocio</Label>
            <Input
              placeholder="Ej: Sede Principal"
              value={filtroUnidadNegocio}
              onChange={(e) => setFiltroUnidadNegocio(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase text-slate-600">7. Producto / Artículo</Label>
            <Input
              placeholder="Ej: Computador, Papelería"
              value={filtroProducto}
              onChange={(e) => setFiltroProducto(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase text-slate-600">8 y 9. Estado Presupuestal</Label>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos los Estados</option>
              <option value="Autorizado">Autorizados únicamente</option>
              <option value="Rechazado">Rechazados únicamente</option>
            </select>
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase text-slate-600">Fecha Desde</Label>
            <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase text-slate-600">Fecha Hasta</Label>
            <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold uppercase text-slate-600">10. Proveedor Seleccionado</Label>
            <Input
              placeholder="Nombre del proveedor"
              value={filtroProveedor}
              onChange={(e) => setFiltroProveedor(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Resultados */}
      <Card className="border-slate-300">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 border-b">
                <tr>
                  <th className="p-3">Radicado</th>
                  <th className="p-3">Solicitante</th>
                  <th className="p-3">Área / Proyecto</th>
                  <th className="p-3">CC / UN</th>
                  <th className="p-3">Producto(s)</th>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Valor Aprobado</th>
                  <th className="p-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {cargando ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      Cargando información del presupuesto...
                    </td>
                  </tr>
                ) : datos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No se encontraron registros que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  datos.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{item.radicado}</td>
                      <td className="p-3">{item.nombre_solicitante}</td>
                      <td className="p-3">
                        <span className="font-medium">{item.area_solicitante}</span>
                        <div className="text-xs text-slate-500">{item.proyecto}</div>
                      </td>
                      <td className="p-3 text-xs">
                        <div>CC: {item.centro_costo}</div>
                        <div>UN: {item.unidad_negocio}</div>
                      </td>
                      <td className="p-3 text-xs max-w-xs truncate" title={item.producto_articulo}>
                        {item.producto_articulo}
                      </td>
                      <td className="p-3 text-xs font-medium">{item.proveedor_seleccionado}</td>
                      <td className="p-3">
                        {item.estado_presupuesto === 'Autorizado' && (
                          <Badge className="bg-green-600">Autorizado</Badge>
                        )}
                        {item.estado_presupuesto === 'Rechazado' && (
                          <Badge className="bg-red-600">Rechazado</Badge>
                        )}
                        {item.estado_presupuesto === 'En Revisión' && (
                          <Badge variant="outline" className="text-slate-700">En Revisión</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-900">
                        ${item.valor_total.toLocaleString('es-CO')}
                      </td>
                      <td className="p-3 text-xs text-slate-500">{item.fecha_registro}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}