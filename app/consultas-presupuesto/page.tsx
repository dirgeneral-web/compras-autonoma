'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Cambia esta variable si tu columna de fecha en Supabase se llama diferente ('fecha_solicitud', 'fecha', etc.)
const CAMPO_FECHA_BD = 'fecha_creacion';

type ReportePresupuesto = {
  id: string;
  radicado: string;
  nombre_solicitante: string;
  area_solicitante: string;
  proyecto: string;
  centro_costo: string;
  unidad_negocio: string;
  producto_articulo: string;
  estado_presupuesto: 'Autorizado' | 'Rechazado' | 'En Revisión';
  proveedor_seleccionado: string;
  valor_total: number;
  fecha_registro: string;
};

export default function ConsultasPresupuestoPage() {
  const [cargando, setCargando] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [datos, setDatos] = useState<ReportePresupuesto[]>([]);

  // Catálogos para desplegables
  const [catRadicados, setCatRadicados] = useState<string[]>([]);
  const [catSolicitantes, setCatSolicitantes] = useState<string[]>([]);
  const [catAreas, setCatAreas] = useState<string[]>([]);
  const [catProyectos, setCatProyectos] = useState<string[]>([]);
  const [catCentrosCosto, setCatCentrosCosto] = useState<string[]>([]);
  const [catUnidadesNegocio, setCatUnidadesNegocio] = useState<string[]>([]);
  const [catProductos, setCatProductos] = useState<string[]>([]);
  const [catProveedores, setCatProveedores] = useState<string[]>([]);

  // Filtros del usuario
  const [filtroRadicado, setFiltroRadicado] = useState('');
  const [filtroSolicitante, setFiltroSolicitante] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [filtroCentroCosto, setFiltroCentroCosto] = useState('');
  const [filtroUnidadNegocio, setFiltroUnidadNegocio] = useState('');
  const [filtroProducto, setFiltroProducto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');

  // Función para exportar a Excel
  const descargarXLSX = () => {
    if (!datos || datos.length === 0) return;

    const datosExcel = datos.map((item) => ({
      'Radicado': item.radicado,
      'Solicitante': item.nombre_solicitante,
      'Área': item.area_solicitante,
      'Proyecto': item.proyecto,
      'Centro de Costo': item.centro_costo,
      'Unidad de Negocio': item.unidad_negocio,
      'Producto / Artículo': item.producto_articulo,
      'Proveedor': item.proveedor_seleccionado,
      'Estado': item.estado_presupuesto,
      'Valor Total': item.valor_total,
      'Fecha de Registro': item.fecha_registro,
    }));

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Consultas');

    const fechaHoy = new Date().toISOString().split('T')[0];
    XLSX.writeFile(libro, `reporte_consultas_${fechaHoy}.xlsx`);
  };

  // Cargar catálogos iniciales
  useEffect(() => {
    async function cargarCatalogos() {
      setCargandoCatalogos(true);
      const supabase = createClient();

      try {
        const [
          resSolicitudes,
          resCentros,
          resUnidades,
          resProductos,
          resProveedores,
          resClasificacion
        ] = await Promise.all([
          supabase.from('solicitudes').select('radicado, nombre_solicitante, area_solicitante'),
          supabase.from('centros_costo').select('nombre'),
          supabase.from('unidades_negocio').select('nombre'),
          supabase.from('productos').select('nombre'),
          supabase.from('proveedores').select('nombre_proveedor'),
          supabase.from('clasificacion_presupuesto').select('proyecto')
        ]);

        if (resSolicitudes.data) {
          setCatRadicados(Array.from(new Set(resSolicitudes.data.map((i: any) => i.radicado).filter(Boolean))));
          setCatSolicitantes(Array.from(new Set(resSolicitudes.data.map((i: any) => i.nombre_solicitante).filter(Boolean))));
          setCatAreas(Array.from(new Set(resSolicitudes.data.map((i: any) => i.area_solicitante).filter(Boolean))));
        }

        if (resCentros.data) {
          setCatCentrosCosto(Array.from(new Set(resCentros.data.map((i: any) => i.nombre).filter(Boolean))));
        }

        if (resUnidades.data) {
          setCatUnidadesNegocio(Array.from(new Set(resUnidades.data.map((i: any) => i.nombre).filter(Boolean))));
        }

        if (resProductos.data) {
          setCatProductos(Array.from(new Set(resProductos.data.map((i: any) => i.nombre).filter(Boolean))));
        }

        if (resProveedores.data) {
          setCatProveedores(Array.from(new Set(resProveedores.data.map((i: any) => i.nombre_proveedor).filter(Boolean))));
        }

        if (resClasificacion.data) {
          setCatProyectos(Array.from(new Set(resClasificacion.data.map((i: any) => i.proyecto).filter(Boolean))));
        }
      } catch (err: any) {
        console.error('Error al cargar opciones:', err);
      } finally {
        setCargandoCatalogos(false);
      }
    }

    cargarCatalogos();
  }, []);

  // Función principal de consulta
  const ejecutarConsulta = useCallback(async () => {
    setCargando(true);
    setMensajeError(null);
    const supabase = createClient();

    try {
      let query = supabase.from('solicitudes').select(`
        id,
        radicado,
        nombre_solicitante,
        area_solicitante,
        estado,
        ${CAMPO_FECHA_BD},
        clasificacion_presupuesto (
          proyecto,
          centro_costo,
          unidad_negocio,
          producto
        ),
        cotizaciones_compras (
          proveedor_definitivo,
          valor_definitivo
        ),
        detalles_articulo (
          nombre_articulo
        )
      `);

      if (filtroRadicado) query = query.eq('radicado', filtroRadicado);
      if (filtroSolicitante) query = query.eq('nombre_solicitante', filtroSolicitante);
      if (filtroArea) query = query.eq('area_solicitante', filtroArea);

      if (filtroEstado === 'Autorizado') query = query.eq('estado', 'Aprobada');
      if (filtroEstado === 'Rechazado') query = query.eq('estado', 'Rechazada');

      if (fechaInicio) query = query.gte(CAMPO_FECHA_BD, `${fechaInicio}T00:00:00`);
      if (fechaFin) query = query.lte(CAMPO_FECHA_BD, `${fechaFin}T23:59:59`);

      const { data, error } = await query.order(CAMPO_FECHA_BD, { ascending: false });

      if (error) {
        console.error('Error en consulta Supabase:', error);
        setMensajeError(`Error de Supabase: ${error.message} (${error.code || 'BD'})`);
        setDatos([]);
        setCargando(false);
        return;
      }

      const formateados: ReportePresupuesto[] = (data || []).map((item: any) => {
        const clas = Array.isArray(item.clasificacion_presupuesto)
          ? item.clasificacion_presupuesto[0]
          : item.clasificacion_presupuesto;
        const coti = Array.isArray(item.cotizaciones_compras)
          ? item.cotizaciones_compras[0]
          : item.cotizaciones_compras;

        const articulos = item.detalles_articulo?.map((a: any) => a.nombre_articulo).filter(Boolean).join(', ') || clas?.producto || 'N/A';

        const rawFecha = item[CAMPO_FECHA_BD] || item.fecha_registro || item.fecha_solicitud || item.fecha;

        return {
          id: item.id,
          radicado: item.radicado || 'Sin radicado',
          nombre_solicitante: item.nombre_solicitante || 'Sin nombre',
          area_solicitante: item.area_solicitante || 'N/A',
          proyecto: clas?.proyecto || 'N/A',
          centro_costo: clas?.centro_costo || 'N/A',
          unidad_negocio: clas?.unidad_negocio || 'N/A',
          producto_articulo: articulos,
          estado_presupuesto: item.estado === 'Aprobada' ? 'Autorizado' : item.estado === 'Rechazada' ? 'Rechazado' : 'En Revisión',
          proveedor_seleccionado: coti?.proveedor_definitivo || 'Pendiente',
          valor_total: coti?.valor_definitivo || 0,
          fecha_registro: rawFecha ? new Date(rawFecha).toLocaleDateString('es-CO') : 'N/A',
        };
      });

      // Filtros en cliente para tablas secundarias
      let resultado = formateados;
      if (filtroProyecto) resultado = resultado.filter((f) => f.proyecto === filtroProyecto);
      if (filtroCentroCosto) resultado = resultado.filter((f) => f.centro_costo === filtroCentroCosto);
      if (filtroUnidadNegocio) resultado = resultado.filter((f) => f.unidad_negocio === filtroUnidadNegocio);
      if (filtroProducto) resultado = resultado.filter((f) => f.producto_articulo.toLowerCase().includes(filtroProducto.toLowerCase()));
      if (filtroProveedor) resultado = resultado.filter((f) => f.proveedor_seleccionado === filtroProveedor);

      setDatos(resultado);
    } catch (err: any) {
      console.error('Error inesperado:', err);
      setMensajeError(`Error inesperado: ${err.message || 'Error de conexión'}`);
    } finally {
      setCargando(false);
    }
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
  }, []);

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
    setMensajeError(null);
  }

  // Métricas
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
            Dashboard — Módulo de Consultas de Presupuesto
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Filtra por cualquier combinación de campos para consultar solicitudes y presupuestos.
          </p>
        </div>
        <Link
          href="/compras"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          &larr; Volver a Compras
        </Link>
      </div>

      {/* Tarjetas KPI */}
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

      {/* Panel de Filtros */}
      <Card className="border-slate-300">
        <CardHeader className="bg-slate-50 border-b pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-semibold text-slate-900">
              Panel de Filtros Avanzados
            </CardTitle>
            <Button variant="outline" size="sm" onClick={limpiarFiltros}>
              Limpiar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Radicado */}
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-600">1. Radicado</Label>
              <select
                disabled={cargandoCatalogos}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={filtroRadicado}
                onChange={(e) => setFiltroRadicado(e.target.value)}
              >
                <option value="">-- Todos los Radicados --</option>
                {catRadicados.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* 2. Solicitante */}
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-600">2. Solicitante</Label>
              <select
                disabled={cargandoCatalogos}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={filtroSolicitante}
                onChange={(e) => setFiltroSolicitante(e.target.value)}
              >
                <option value="">-- Todos los Solicitantes --</option>
                {catSolicitantes.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* 3. Área */}
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-600">3. Área</Label>
              <select
                disabled={cargandoCatalogos}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={filtroArea}
                onChange={(e) => setFiltroArea(e.target.value)}
              >
                <option value="">-- Todas las Áreas --</option>
                {catAreas.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* 4. Proyecto */}
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-600">4. Proyecto</Label>
              <select
                disabled={cargandoCatalogos}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={filtroProyecto}
                onChange={(e) => setFiltroProyecto(e.target.value)}
              >
                <option value="">-- Todos los Proyectos --</option>
                {catProyectos.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* 5. Centro de Costo */}
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-600">5. Centro de Costo</Label>
              <select
                disabled={cargandoCatalogos}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={filtroCentroCosto}
                onChange={(e) => setFiltroCentroCosto(e.target.value)}
              >
                <option value="">-- Todos los Centros de Costo --</option>
                {catCentrosCosto.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* 6. Unidad de Negocio */}
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-600">6. Unidad de Negocio</Label>
              <select
                disabled={cargandoCatalogos}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={filtroUnidadNegocio}
                onChange={(e) => setFiltroUnidadNegocio(e.target.value)}
              >
                <option value="">-- Todas las Unidades --</option>
                {catUnidadesNegocio.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* 7. Producto */}
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-600">7. Producto / Artículo</Label>
              <select
                disabled={cargandoCatalogos}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={filtroProducto}
                onChange={(e) => setFiltroProducto(e.target.value)}
              >
                <option value="">-- Todos los Productos --</option>
                {catProductos.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
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

            {/* Fechas */}
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-600">Fecha Desde</Label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase text-slate-600">Fecha Hasta</Label>
              <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>

            {/* 10. Proveedor Seleccionado */}
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold uppercase text-slate-600">10. Proveedor Seleccionado</Label>
              <select
                disabled={cargandoCatalogos}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={filtroProveedor}
                onChange={(e) => setFiltroProveedor(e.target.value)}
              >
                <option value="">-- Todos los Proveedores --</option>
                {catProveedores.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              onClick={descargarXLSX}
              disabled={datos.length === 0 || cargando}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              📊 Descargar Excel (.xlsx)
            </Button>

            <Button
              type="button"
              onClick={ejecutarConsulta}
              disabled={cargando}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2"
            >
              {cargando ? 'Buscando...' : '🔍 Ejecutar Consulta'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerta de error */}
      {mensajeError && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200 text-red-800 text-sm font-medium">
          ⚠️ {mensajeError}
        </div>
      )}

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
                      Cargando información filtrada...
                    </td>
                  </tr>
                ) : datos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No se encontraron registros que coincidan con los filtros seleccionados.
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

