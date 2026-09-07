'use client';

import { useEffect, useState, useTransition } from 'react';
import type { ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  aprobarORechazarSolicitud,
  obtenerDetallesArticulo,
  obtenerCotizacionCompra,
} from '@/app/actions/solicitudes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Database } from '@/lib/supabase/database.types';

type SolicitudPendiente = Pick<
  Database['public']['Tables']['solicitudes']['Row'],
  | 'id'
  | 'radicado'
  | 'nombre_solicitante'
  | 'correo_solicitante'
  | 'area_solicitante'
  | 'descripcion_general'
  | 'fecha_creacion'
>;

function formatearMoneda(valor: any) {
  if (!valor || isNaN(Number(valor))) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor));
}

export default function AutorizadorPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [observacionesPorId, setObservacionesPorId] = useState<Record<string, string>>({});
  const [idEnProceso, setIdEnProceso] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function cargarPendientes() {
    setCargando(true);
    setError(null);

    const supabase = createClient();
    const { data, error: errorConsulta } = await supabase
      .from('solicitudes')
      .select(
        'id, radicado, nombre_solicitante, correo_solicitante, area_solicitante, descripcion_general, fecha_creacion'
      )
      .eq('estado', 'Esperando Aprobación Final')
      .order('fecha_creacion', { ascending: true })
      .returns<SolicitudPendiente[]>();

    setCargando(false);

    if (errorConsulta) {
      setError(errorConsulta.message);
      return;
    }

    setSolicitudes(data ?? []);
  }

  useEffect(() => {
    cargarPendientes();
  }, []);

  function resolver(id: string, estado: 'Aprobada' | 'Rechazada') {
    setIdEnProceso(id);
    const observaciones = observacionesPorId[id];

    startTransition(async () => {
      const respuesta = await aprobarORechazarSolicitud(id, estado, observaciones || undefined);
      setIdEnProceso(null);

      if (!respuesta.success) {
        setError(respuesta.error);
        return;
      }

      // Quita la tarjeta resuelta de la lista
      setSolicitudes((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Aprobaciones pendientes
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {solicitudes.length} solicitud{solicitudes.length === 1 ? '' : 'es'} esperando tu decisión.
        </p>
      </div>

      {error && <p className="mb-4 text-sm font-medium text-red-600">{error}</p>}

      {cargando && <p className="text-sm text-slate-500">Cargando…</p>}

      {!cargando && solicitudes.length === 0 && !error && (
        <p className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No hay solicitudes pendientes de aprobación. 🎉
        </p>
      )}

      <div className="space-y-6">
        {solicitudes.map((solicitud) => (
          <TarjetaSolicitud
            key={solicitud.id}
            solicitud={solicitud}
            observacion={observacionesPorId[solicitud.id] ?? ''}
            onObservacionChange={(val) =>
              setObservacionesPorId((prev) => ({ ...prev, [solicitud.id]: val }))
            }
            enProceso={isPending && idEnProceso === solicitud.id}
            onResolver={resolver}
          />
        ))}
      </div>
    </main>
  );
}

// ----------------------------------------------------------------------
// COMPONENTE PARA CADA TARJETA DE SOLICITUD (CON ARTÍCULOS Y COTIZACIONES)
// ----------------------------------------------------------------------
interface TarjetaSolicitudProps {
  solicitud: SolicitudPendiente;
  observacion: string;
  onObservacionChange: (val: string) => void;
  enProceso: boolean;
  onResolver: (id: string, estado: 'Aprobada' | 'Rechazada') => void;
}

function TarjetaSolicitud({
  solicitud,
  observacion,
  onObservacionChange,
  enProceso,
  onResolver,
}: TarjetaSolicitudProps) {
  const [articulos, setArticulos] = useState<any[]>([]);
  const [cotizacion, setCotizacion] = useState<any | null>(null);
  const [cargandoDetalles, setCargandoDetalles] = useState(true);

  useEffect(() => {
    async function cargarInformacionAdicional() {
      setCargandoDetalles(true);
      try {
        const [articulosData, cotizacionData] = await Promise.all([
          obtenerDetallesArticulo(solicitud.id),
          obtenerCotizacionCompra(solicitud.id),
        ]);
        setArticulos(articulosData || []);
        setCotizacion(cotizacionData || null);
      } catch (err) {
        console.error('Error al cargar detalles de la solicitud:', err);
      } finally {
        setCargandoDetalles(false);
      }
    }

    cargarInformacionAdicional();
  }, [solicitud.id]);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-900">
            {solicitud.radicado || `SOL-${solicitud.id.substring(0, 8)}`}
          </CardTitle>
          <Badge className="bg-slate-800">{solicitud.area_solicitante ?? 'Sin área'}</Badge>
        </div>
        <CardDescription className="text-xs text-slate-500">
          Solicitado por: <span className="font-medium text-slate-700">{solicitud.nombre_solicitante}</span> ({solicitud.correo_solicitante})
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1. DESCRIPCIÓN Y JUSTIFICACIÓN INICIAL */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Justificación / Descripción General
          </h4>
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
            {solicitud.descripcion_general || 'Sin descripción proporcionada.'}
          </p>
        </div>

        {/* 2. ARTÍCULOS DESGLOSADOS */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Artículos / Servicios Solicitados
          </h4>
          {cargandoDetalles ? (
            <p className="text-xs italic text-slate-400">Cargando artículos...</p>
          ) : articulos.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-semibold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Artículo</th>
                    <th className="px-3 py-2 text-center">Cant.</th>
                    <th className="px-3 py-2 text-center">Unidad</th>
                    <th className="px-3 py-2">Especificaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                  {articulos.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="px-3 py-2 font-medium text-slate-900">{item.nombre_articulo || '-'}</td>
                      <td className="px-3 py-2 text-center font-bold">{item.cantidad ?? 1}</td>
                      <td className="px-3 py-2 text-center text-slate-500">{item.unidad_medida || 'Unid'}</td>
                      <td className="px-3 py-2 text-slate-600">{item.especificaciones_tecnicas || item.descripcion || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs italic text-slate-400">No hay artículos detallados registrados.</p>
          )}
        </div>

        {/* 3. GESTIÓN REALIZADA POR COMPRAS */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Gestión y Selección de Compras
          </h4>

          {cargandoDetalles ? (
            <p className="text-xs italic text-slate-400">Cargando información de compras...</p>
          ) : cotizacion ? (
            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/30 p-3.5">
              {/* SELECCIÓN DEFINITIVA */}
              <div className="rounded-md border border-green-200 bg-green-50/80 p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-green-800">
                  ★ Decisión Final de Compras
                </span>
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">
                    Proveedor: {cotizacion.proveedor_definitivo || 'No especificado'}
                  </p>
                  <p className="text-base font-extrabold text-green-700">
                    {formatearMoneda(cotizacion.valor_definitivo)}
                  </p>
                </div>
                {cotizacion.observaciones && (
                  <p className="mt-2 text-xs text-slate-600 border-t border-green-200/60 pt-2">
                    <strong className="text-slate-700">Justificación de Compras:</strong> "{cotizacion.observaciones}"
                  </p>
                )}
              </div>

              {/* OPCIONES Y DRIVE LINKS */}
              <div className="grid gap-2 sm:grid-cols-3">
                {[1, 2, 3].map((num) => {
                  const prov = cotizacion[`proveedor_${num}`];
                  const val = cotizacion[`valor_${num}`];
                  const url = cotizacion[`url_drive_${num}`];

                  if (!prov && !val && !url) return null;

                  const esSeleccionado =
                    cotizacion.proveedor_definitivo &&
                    prov &&
                    cotizacion.proveedor_definitivo.trim().toLowerCase() === prov.trim().toLowerCase();

                  return (
                    <div
                      key={num}
                      className={`rounded border p-2.5 text-xs bg-white ${
                        esSeleccionado ? 'border-green-400 ring-1 ring-green-300' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-400 mb-1">
                        <span>Cotización {num}</span>
                        {esSeleccionado && (
                          <span className="rounded bg-green-100 text-green-800 px-1 text-[10px] font-bold">
                            Elegida
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-800 truncate">{prov || 'Sin nombre'}</p>
                      <p className="mt-0.5 font-semibold text-slate-900">{formatearMoneda(val)}</p>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-block text-[11px] font-semibold text-blue-600 hover:underline truncate max-w-full"
                        >
                          🔗 Ver en Drive
                        </a>
                      ) : (
                        <span className="mt-1.5 block text-[10px] text-slate-400 italic">Sin enlace</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs italic text-slate-400">No se encontraron cotizaciones registradas por compras.</p>
          )}
        </div>

        {/* 4. CAMPO DE OBSERVACIONES DEL AUTORIZADOR */}
        <div className="pt-2 border-t border-slate-100">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">
            Observaciones o Comentarios del Autorizador:
          </label>
          <Textarea
            rows={2}
            placeholder="Escribe comentarios u observaciones de la decisión (opcional para aprobar, recomendado para rechazar)..."
            value={observacion}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onObservacionChange(e.target.value)}
          />
        </div>
      </CardContent>

      <CardFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          size="lg"
          disabled={enProceso}
          onClick={() => onResolver(solicitud.id, 'Aprobada')}
          className="w-full bg-green-600 text-white hover:bg-green-700"
        >
          ✅ Aprobar Compra
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={enProceso}
          onClick={() => onResolver(solicitud.id, 'Rechazada')}
          className="w-full border-red-300 text-red-700 hover:bg-red-50"
        >
          ↩ Rechazar / Devolver
        </Button>
      </CardFooter>
    </Card>
  );
}