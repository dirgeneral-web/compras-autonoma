'use client';

import { useState, useEffect, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { guardarCotizaciones, type ActionResult } from '@/app/actions/solicitudes';
import { cotizacionesSchema, type CotizacionIndividualInput } from '@/lib/validations/compras';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EstadoSolicitud } from '@/lib/supabase/database.types';

type DetalleArticulo = {
  id: string;
  nombre_articulo: string;
  descripcion: string | null;
  cantidad: number;
  unidad_medida: string | null;
  especificaciones_tecnicas: string | null;
};

type SolicitudDetalle = {
  id: string;
  radicado: string | null;
  nombre_solicitante: string;
  correo_solicitante?: string;
  area_solicitante?: string | null;
  descripcion_general?: string;
  estado: EstadoSolicitud;
  created_at?: string;
  detalles_articulo?: DetalleArticulo[];
};

const ESTADOS_EDITABLES: EstadoSolicitud[] = ['Creada', 'En Cotización'];

function cotizacionVacia(): CotizacionIndividualInput {
  return { proveedor: '', valor: undefined as unknown as number, url_drive: '' };
}

export default function ComprasPage() {
  const [pendientes, setPendientes] = useState<SolicitudDetalle[]>([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(true);
  const [radicadoBuscado, setRadicadoBuscado] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [solicitud, setSolicitud] = useState<SolicitudDetalle | null>(null);

  const [cotizaciones, setCotizaciones] = useState<CotizacionIndividualInput[]>([
    cotizacionVacia(),
    cotizacionVacia(),
    cotizacionVacia(),
  ]);
  const [proveedorDefinitivo, setProveedorDefinitivo] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [mensajesError, setMensajesError] = useState<string[]>([]);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    cargarPendientes();
  }, []);

  async function cargarPendientes() {
    setCargandoPendientes(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('solicitudes')
      .select('id, radicado, nombre_solicitante, correo_solicitante, area_solicitante, descripcion_general, estado')
      .in('estado', ['Creada', 'En Cotización'])
      .order('id', { ascending: false });

    setCargandoPendientes(false);

    if (error) {
      console.error('Error al cargar pendientes:', error.message || error);
      return;
    }

    setPendientes((data as unknown as SolicitudDetalle[]) || []);
  }

  async function obtenerArticulosDeSolicitud(solicitudId: string): Promise<DetalleArticulo[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('detalles_articulo')
      .select('*')
      .eq('solicitud_id', solicitudId);

    if (error) {
      console.error('Error al obtener artículos:', error.message || error);
      return [];
    }

    return (data as unknown as DetalleArticulo[]) || [];
  }

  function resetFormularioCotizacion() {
    setCotizaciones([cotizacionVacia(), cotizacionVacia(), cotizacionVacia()]);
    setProveedorDefinitivo(null);
    setObservaciones('');
    setMensajesError([]);
    setMensajeExito(null);
  }

  async function seleccionarSolicitudPorId(id: string) {
    setErrorCarga(null);
    setCargando(true);

    let seleccionada = pendientes.find((p) => p.id === id);

    if (!seleccionada) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('solicitudes')
        .select('id, radicado, nombre_solicitante, correo_solicitante, area_solicitante, descripcion_general, estado')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        setCargando(false);
        setErrorCarga('No se pudo cargar la información de la solicitud.');
        return;
      }
      seleccionada = data as unknown as SolicitudDetalle;
    }

    const articulos = await obtenerArticulosDeSolicitud(seleccionada.id);
    setCargando(false);

    setSolicitud({
      ...seleccionada,
      detalles_articulo: articulos,
    });
    resetFormularioCotizacion();
  }

  async function buscarSolicitud(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!radicadoBuscado.trim()) return;

    setErrorCarga(null);
    setMensajeExito(null);
    setSolicitud(null);
    setCargando(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('solicitudes')
      .select('id, radicado, nombre_solicitante, correo_solicitante, area_solicitante, descripcion_general, estado')
      .eq('radicado', radicadoBuscado.trim())
      .maybeSingle();

    if (error || !data) {
      setCargando(false);
      setErrorCarga('No se encontró ninguna solicitud con ese radicado.');
      return;
    }

    const solEncontrada = data as unknown as SolicitudDetalle;
    const articulos = await obtenerArticulosDeSolicitud(solEncontrada.id);
    setCargando(false);

    setSolicitud({
      ...solEncontrada,
      detalles_articulo: articulos,
    });
    resetFormularioCotizacion();
  }

  function actualizarCotizacion(indice: number, campo: keyof CotizacionIndividualInput, valor: string) {
    setCotizaciones((prev) =>
      prev.map((cot, i) =>
        i === indice
          ? { ...cot, [campo]: campo === 'valor' ? (valor === '' ? undefined : Number(valor)) : valor }
          : cot
      )
    );
  }

  const proveedoresDisponibles = cotizaciones
    .map((c) => c.proveedor)
    .filter((p): p is string => Boolean(p && p.trim().length > 0));

  function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensajesError([]);
    setMensajeExito(null);

    if (!solicitud) return;

    // 1. Filtrar únicamente las cotizaciones que tienen el proveedor diligenciado
    const cotizacionesValidas = cotizaciones
      .filter((c) => Boolean(c.proveedor && c.proveedor.trim() !== ''))
      .map((c) => ({
        proveedor: c.proveedor!.trim(),
        valor: c.valor ? Number(c.valor) : 0,
        url_drive: c.url_drive ? c.url_drive.trim() : '',
      }));

    // 2. Validación de negocio: Mínimo 2 cotizaciones obligatorias
    if (cotizacionesValidas.length < 2) {
      setMensajesError(['Es obligatorio registrar al menos 2 cotizaciones para guardar.']);
      return;
    }

    const cotizacionGanadora = cotizacionesValidas.find(
      (c) => c.proveedor === proveedorDefinitivo
    );

    // 3. Mapear payload: 1 y 2 obligatorias, 3 opcional (null si no existe)
    const payload = {
      solicitud_id: solicitud.id,
      cotizacion_1: cotizacionesValidas[0],
      cotizacion_2: cotizacionesValidas[1],
      cotizacion_3: cotizacionesValidas[2] ?? null,
      proveedor_definitivo: proveedorDefinitivo || undefined,
      valor_definitivo: cotizacionGanadora ? cotizacionGanadora.valor : undefined,
      observaciones: observaciones.trim() || undefined,
    };

    // 4. Validar payload con Zod
    const parsed = cotizacionesSchema.safeParse(payload);
    if (!parsed.success) {
      setMensajesError(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    // 5. Guardar mediante Server Action
    startTransition(async () => {
      const respuesta: ActionResult<{ solicitud_id: string; estado: EstadoSolicitud }> =
        await guardarCotizaciones(parsed.data);

      if (!respuesta.success) {
        setMensajesError([respuesta.error]);
        return;
      }

      setMensajeExito(`Cotizaciones guardadas correctamente. Nuevo estado: ${respuesta.data.estado}.`);
      setSolicitud((prev) => (prev ? { ...prev, estado: respuesta.data.estado } : prev));

      cargarPendientes();
    });
  }

  const solicitudEditable = solicitud ? ESTADOS_EDITABLES.includes(solicitud.estado) : false;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Compras — Cotizaciones</h1>
        <p className="mt-1 text-slate-500">
          Gestiona las solicitudes pendientes, revisa los artículos solicitados y registra tus cotizaciones.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Bandeja de Entrada de Solicitudes</CardTitle>
          <CardDescription>
            Elige una solicitud pendiente de la lista o busca directamente por su número de radicado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="select_pendiente" className="text-xs font-semibold uppercase text-slate-500 mb-1.5 block">
                Solicitudes Pendientes ({pendientes.length})
              </Label>
              <select
                id="select_pendiente"
                disabled={cargandoPendientes || cargando}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:bg-slate-100"
                value={solicitud?.id || ''}
                onChange={(e) => {
                  if (e.target.value) seleccionarSolicitudPorId(e.target.value);
                }}
              >
                <option value="">
                  {cargandoPendientes ? 'Cargando pendientes...' : '-- Selecciona una solicitud --'}
                </option>
                {pendientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.radicado} — {p.nombre_solicitante} ({p.estado})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="buscar_radicado" className="text-xs font-semibold uppercase text-slate-500 mb-1.5 block">
                Búsqueda Directa por Radicado
              </Label>
              <form onSubmit={buscarSolicitud} className="flex gap-2">
                <Input
                  id="buscar_radicado"
                  value={radicadoBuscado}
                  onChange={(evento: ChangeEvent<HTMLInputElement>) => setRadicadoBuscado(evento.target.value)}
                  placeholder="Ej: SOL-2026-0011"
                />
                <Button type="submit" disabled={cargando || radicadoBuscado.trim().length === 0}>
                  {cargando ? 'Buscando…' : 'Cargar'}
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      {errorCarga && <p className="mb-6 text-sm font-medium text-red-600">{errorCarga}</p>}

      {solicitud && (
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="border-slate-300 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between bg-slate-50 border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-bold text-slate-900">{solicitud.radicado}</CardTitle>
                  <Badge className="bg-slate-900">{solicitud.estado}</Badge>
                </div>
                <CardDescription className="mt-1 text-slate-600">
                  <strong>Solicitante:</strong> {solicitud.nombre_solicitante}
                  {solicitud.correo_solicitante && ` (${solicitud.correo_solicitante})`}
                  {solicitud.area_solicitante && ` — Área: ${solicitud.area_solicitante}`}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Descripción General del Requerimiento
                </h4>
                <p className="text-sm text-slate-800 bg-slate-100/70 p-3 rounded-md border border-slate-200">
                  {solicitud.descripcion_general || 'Sin descripción general provista.'}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Lista de Artículos / Servicios Requeridos
                </h4>
                {solicitud.detalles_articulo && solicitud.detalles_articulo.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 border-b">
                        <tr>
                          <th className="p-2.5 border-r">Artículo</th>
                          <th className="p-2.5 text-center border-r">Cantidad</th>
                          <th className="p-2.5 border-r">Unidad</th>
                          <th className="p-2.5">Especificaciones / Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {solicitud.detalles_articulo.map((art, idx) => (
                          <tr key={art.id || idx}>
                            <td className="p-2.5 font-medium text-slate-900 border-r">{art.nombre_articulo}</td>
                            <td className="p-2.5 text-center font-semibold border-r">{art.cantidad}</td>
                            <td className="p-2.5 text-slate-500 border-r">{art.unidad_medida || '-'}</td>
                            <td className="p-2.5 text-slate-600">
                              {art.especificaciones_tecnicas || art.descripcion || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No hay artículos registrados para esta solicitud.</p>
                )}
              </div>

              {!solicitudEditable && (
                <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                  ⚠️ Esta solicitud se encuentra en estado <strong>{solicitud.estado}</strong>. No es posible guardar cambios en esta etapa.
                </div>
              )}
            </CardContent>
          </Card>

          {[0, 1, 2].map((indice) => (
            <Card key={indice}>
              <CardHeader>
                <CardTitle className="text-lg">Cotización {indice + 1}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`proveedor_${indice}`}>Proveedor</Label>
                  <Input
                    id={`proveedor_${indice}`}
                    disabled={!solicitudEditable}
                    value={cotizaciones[indice].proveedor ?? ''}
                    onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                      actualizarCotizacion(indice, 'proveedor', evento.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`valor_${indice}`}>Valor cotizado</Label>
                  <Input
                    id={`valor_${indice}`}
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={!solicitudEditable}
                    value={cotizaciones[indice].valor ?? ''}
                    onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                      actualizarCotizacion(indice, 'valor', evento.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`url_drive_${indice}`}>Enlace de Drive</Label>
                  <Input
                    id={`url_drive_${indice}`}
                    type="url"
                    disabled={!solicitudEditable}
                    placeholder="https://drive.google.com/…"
                    value={cotizaciones[indice].url_drive ?? ''}
                    onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                      actualizarCotizacion(indice, 'url_drive', evento.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selección definitiva</CardTitle>
              <CardDescription>Elige el proveedor ganador entre las cotizaciones diligenciadas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {proveedoresDisponibles.length === 0 && (
                <p className="text-sm text-slate-500">Diligencia al menos un proveedor para poder seleccionarlo.</p>
              )}
              <div className="flex flex-wrap gap-3">
                {proveedoresDisponibles.map((proveedor) => (
                  <label
                    key={proveedor}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-slate-900"
                  >
                    <input
                      type="radio"
                      name="proveedor_definitivo"
                      disabled={!solicitudEditable}
                      value={proveedor}
                      checked={proveedorDefinitivo === proveedor}
                      onChange={() => setProveedorDefinitivo(proveedor)}
                    />
                    {proveedor}
                  </label>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  rows={3}
                  disabled={!solicitudEditable}
                  value={observaciones}
                  onChange={(evento: ChangeEvent<HTMLTextAreaElement>) => setObservaciones(evento.target.value)}
                  placeholder="Justificación de la selección, condiciones comerciales, etc."
                />
              </div>
            </CardContent>
          </Card>

          {mensajesError.length > 0 && (
            <div role="alert" className="space-y-1 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {mensajesError.map((mensaje, i) => (
                <p key={i}>{mensaje}</p>
              ))}
            </div>
          )}

          {mensajeExito && (
            <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {mensajeExito}
            </p>
          )}

          <Button type="submit" size="lg" disabled={isPending || !solicitudEditable} className="w-full sm:w-auto">
            {isPending ? 'Guardando…' : 'Guardar cotizaciones'}
          </Button>
        </form>
      )}
    </main>
  );
}