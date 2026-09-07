'use client';

import { useState, useEffect, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  obtenerSolicitudesPresupuesto,
  guardarPresupuesto,
  obtenerDetallesArticulo,
  obtenerCotizacionCompra,
  rechazarSolicitudPresupuesto,
  type ActionResult,
} from '@/app/actions/solicitudes';
import { crearCentroCosto, obtenerCentrosCosto } from '@/app/actions/centros-costo';
import { crearUnidadNegocio, obtenerUnidadesNegocio } from '@/app/actions/unidades-negocio';
import { crearProducto, obtenerProductos } from '@/app/actions/productos';
import { presupuestoSchema } from '@/lib/validations/compras';
import { PROYECTOS_INSTITUCIONALES } from '@/lib/datos-maestros';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EstadoSolicitud } from '@/lib/supabase/database.types';

type ItemSolicitud = Record<string, any>;
type SolicitudCompleta = Record<string, any>;

interface CampoAdicional {
  clave: string;
  valor: string;
}

export default function PresupuestoPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCompleta[]>([]);
  const [solicitud, setSolicitud] = useState<SolicitudCompleta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Modo de acción: 'clasificar' (aprobar) o 'rechazar'
  const [modoAccion, setModoAccion] = useState<'clasificar' | 'rechazar'>('clasificar');

  // Combos dinámicos
  const [centrosCostoLista, setCentrosCostoLista] = useState<string[]>([]);
  const [mostrandoNuevoCentro, setMostrandoNuevoCentro] = useState(false);
  const [nuevoCentroNombre, setNuevoCentroNombre] = useState('');
  const [errorNuevoCentro, setErrorNuevoCentro] = useState<string | null>(null);
  const [guardandoCentro, setGuardandoCentro] = useState(false);

  const [unidadesNegocioLista, setUnidadesNegocioLista] = useState<string[]>([]);
  const [mostrandoNuevaUnidad, setMostrandoNuevaUnidad] = useState(false);
  const [nuevaUnidadNombre, setNuevaUnidadNombre] = useState('');
  const [errorNuevaUnidad, setErrorNuevaUnidad] = useState<string | null>(null);
  const [guardandoUnidad, setGuardandoUnidad] = useState(false);

  const [productosLista, setProductosLista] = useState<string[]>([]);
  const [mostrandoNuevoProducto, setMostrandoNuevoProducto] = useState(false);
  const [nuevoProductoNombre, setNuevoProductoNombre] = useState('');
  const [errorNuevoProducto, setErrorNuevoProducto] = useState<string | null>(null);
  const [guardandoProducto, setGuardandoProducto] = useState(false);

  // Formulario Clasificación
  const [proyecto, setProyecto] = useState('');
  const [centroCosto, setCentroCosto] = useState('');
  const [unidadNegocio, setUnidadNegocio] = useState('');
  const [producto, setProducto] = useState('');
  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // Formulario Rechazo
  const [motivoRechazo, setMotivoRechazo] = useState(
    'No se cuenta con disponibilidad presupuestal para atender esta solicitud.'
  );
  const [isPendingRechazo, startTransitionRechazo] = useTransition();

  const [mensajesError, setMensajesError] = useState<string[]>([]);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [articulos, setArticulos] = useState<any[]>([]);
  const [cotizacion, setCotizacion] = useState<any | null>(null);
  const [cargandoDetalles, setCargandoDetalles] = useState(false);

  // Cargar artículos y cotización cada vez que se seleccione una solicitud
  useEffect(() => {
    // Si no hay solicitud seleccionada, limpiamos estados y salimos
    if (!solicitud) {
      setArticulos([]);
      setCotizacion(null);
      return;
    }

    // Guardamos el ID en una constante para que TypeScript sepa que no es null
    const id = solicitud.id;

    async function cargarDetallesAdicionales() {
      setCargandoDetalles(true);
      
      const [articulosData, cotizacionData] = await Promise.all([
        obtenerDetallesArticulo(id),   // 👈 Usamos 'id' en lugar de 'solicitud.id'
        obtenerCotizacionCompra(id)    // 👈 Usamos 'id' en lugar de 'solicitud.id'
      ]);

      setArticulos(articulosData);
      setCotizacion(cotizacionData);
      setCargandoDetalles(false);
    }

    cargarDetallesAdicionales();
  }, [solicitud]);

  useEffect(() => {
    cargarSolicitudesPendientes();
    cargarListaCentrosCosto();
    cargarListaUnidadesNegocio();
    cargarListaProductos();
  }, []);

  async function cargarListaCentrosCosto() {
    const datos = await obtenerCentrosCosto();
    setCentrosCostoLista(datos);
  }

  async function cargarListaUnidadesNegocio() {
    const datos = await obtenerUnidadesNegocio();
    setUnidadesNegocioLista(datos);
  }

  async function cargarListaProductos() {
    const datos = await obtenerProductos();
    setProductosLista(datos);
  }

  async function cargarSolicitudesPendientes() {
    setCargando(true);
    setErrorCarga(null);

    try {
      const datos = await obtenerSolicitudesPresupuesto();
      setSolicitudes((datos as unknown as SolicitudCompleta[]) || []);
    } catch (err: any) {
      console.error('Error al cargar solicitudes:', err);
      setErrorCarga('Error al obtener la lista de solicitudes.');
    } finally {
      setCargando(false);
    }
  }

  async function handleAgregarCentroCosto() {
    if (!nuevoCentroNombre.trim()) return;
    setGuardandoCentro(true);
    setErrorNuevoCentro(null);

    const res = await crearCentroCosto(nuevoCentroNombre);
    setGuardandoCentro(false);

    if (!res.success) {
      setErrorNuevoCentro(res.error || 'No se pudo guardar');
      return;
    }

    const nuevoNombre = nuevoCentroNombre.trim();
    await cargarListaCentrosCosto();
    setCentroCosto(nuevoNombre);
    setNuevoCentroNombre('');
    setMostrandoNuevoCentro(false);
  }

  async function handleAgregarUnidadNegocio() {
    if (!nuevaUnidadNombre.trim()) return;
    setGuardandoUnidad(true);
    setErrorNuevaUnidad(null);

    const res = await crearUnidadNegocio(nuevaUnidadNombre);
    setGuardandoUnidad(false);

    if (!res.success) {
      setErrorNuevaUnidad(res.error || 'No se pudo guardar');
      return;
    }

    const nuevoNombre = nuevaUnidadNombre.trim();
    await cargarListaUnidadesNegocio();
    setUnidadNegocio(nuevoNombre);
    setNuevaUnidadNombre('');
    setMostrandoNuevaUnidad(false);
  }

  async function handleAgregarProducto() {
    if (!nuevoProductoNombre.trim()) return;
    setGuardandoProducto(true);
    setErrorNuevoProducto(null);

    const res = await crearProducto(nuevoProductoNombre);
    setGuardandoProducto(false);

    if (!res.success) {
      setErrorNuevoProducto(res.error || 'No se pudo guardar');
      return;
    }

    const nuevoNombre = nuevoProductoNombre.trim();
    await cargarListaProductos();
    setProducto(nuevoNombre);
    setNuevoProductoNombre('');
    setMostrandoNuevoProducto(false);
  }

  function handleSeleccionarSolicitud(solicitudId: string) {
  setErrorCarga(null);
  setMensajeExito(null);
  setMensajesError([]);
  setModoAccion('clasificar');

  const seleccionada =
    solicitudes.find((s) => String(s.id) === String(solicitudId)) || null;

  setSolicitud(seleccionada);
  setProyecto('');
  setCentroCosto('');
  setUnidadNegocio('');
  setProducto('');
  setCamposAdicionales([]);
}

function handleRechazarSolicitud() {
    if (!solicitud || !motivoRechazo.trim()) return;

    setMensajesError([]);
    setMensajeExito(null);

    startTransitionRechazo(async () => {
      const res = await rechazarSolicitudPresupuesto(solicitud.id, motivoRechazo);

      if (!res.success) {
        setMensajesError([res.error || 'No se pudo rechazar la solicitud.']);
        return;
      }

      setMensajeExito(
        'La solicitud ha sido RECHAZADA exitosamente y se ha notificado la falta de disponibilidad presupuestal.'
      );
      setSolicitud(null);
      cargarSolicitudesPendientes();
    });
  }

  function agregarCampoAdicional() {
    setCamposAdicionales((prev) => [...prev, { clave: '', valor: '' }]);
  }

  function actualizarCampoAdicional(indice: number, campo: keyof CampoAdicional, valor: string) {
    setCamposAdicionales((prev) => prev.map((c, i) => (i === indice ? { ...c, [campo]: valor } : c)));
  }

  function eliminarCampoAdicional(indice: number) {
    setCamposAdicionales((prev) => prev.filter((_, i) => i !== indice));
  }

  function formatearMoneda(valor: any) {
    if (!valor || isNaN(Number(valor))) return '-';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(valor));
  }

  function handleSubmitClasificacion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensajesError([]);
    setMensajeExito(null);

    if (!solicitud) return;

    const camposAdicionalesObjeto = camposAdicionales.reduce<Record<string, string>>((acumulado, campo) => {
      if (campo.clave.trim().length > 0) {
        acumulado[campo.clave.trim()] = campo.valor;
      }
      return acumulado;
    }, {});

    const payload = {
      solicitud_id: solicitud.id,
      proyecto,
      centro_costo: centroCosto,
      unidad_negocio: unidadNegocio,
      producto,
      campos_adicionales: camposAdicionalesObjeto,
    };

    const parsed = presupuestoSchema.safeParse(payload);
    if (!parsed.success) {
      setMensajesError(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    startTransition(async () => {
      const respuesta: ActionResult<{ solicitud_id: string; estado: EstadoSolicitud }> =
        await guardarPresupuesto(parsed.data);

      if (!respuesta.success) {
        setMensajesError([respuesta.error]);
        return;
      }

      setMensajeExito(`Clasificación guardada correctamente. Nuevo estado: ${respuesta.data.estado}.`);
      setSolicitud(null);
      cargarSolicitudesPendientes();
    });
  }

  const nombreSolicitante = solicitud?.nombre_solicitante || 'Sin nombre';
  const emailSolicitante = solicitud?.correo_solicitante;
  const dependenciaSolicitante = solicitud?.area_solicitante || 'No especificada';
  const descripcionJustificacion = solicitud?.descripcion_general || 'Sin descripción proporcionada';
  // ✅ DA PRIORIDAD A 'articulos' OBTENIDOS DE LA BASE DE DATOS:
  const itemsLista: ItemSolicitud[] =
  articulos.length > 0
    ? articulos
    : Array.isArray(solicitud?.items)
    ? solicitud.items
    : []; 
  
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Presupuesto — Clasificación y Revisión
        </h1>
        <p className="mt-1 text-slate-500">
          Revisa el detalle de la solicitud recibida, aprueba clasificando los rubros o recházala directamente si no hay recursos.
        </p>
      </div>

      <div className="mb-8 space-y-2">
        <Label htmlFor="select-solicitud">Solicitud pendiente por clasificar</Label>
        <select
          id="select-solicitud"
          value={solicitud?.id || ''}
          onChange={(e) => handleSeleccionarSolicitud(e.target.value)}
          disabled={cargando}
          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">
            {cargando
              ? 'Cargando solicitudes pendientes…'
              : solicitudes.length === 0
              ? '-- No hay solicitudes pendientes de presupuesto --'
              : '-- Selecciona una solicitud para ver sus detalles --'}
          </option>
          {solicitudes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.radicado ? `[${s.radicado}]` : '[Sin radicado]'} — {s.nombre_solicitante || 'Solicitud'}{' '}
              {s.area_solicitante ? `(${s.area_solicitante})` : ''}
            </option>
          ))}
        </select>
      </div>

      {errorCarga && <p className="mb-6 text-sm font-medium text-red-600">{errorCarga}</p>}

      {solicitud && (
        <div className="space-y-8">
          {/* DETALLE COMPLETO DE LA SOLICITUD */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {solicitud.radicado || `SOL-${String(solicitud.id).substring(0, 8)}`}
              </h2>
              <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                {solicitud.estado || 'En Revisión Presupuestal'}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Solicitante:</span> {nombreSolicitante}{' '}
              {emailSolicitante && <span className="text-slate-500">({emailSolicitante})</span>} —{' '}
              <span className="font-semibold text-slate-800">Área:</span> {dependenciaSolicitante}
            </p>

            <hr className="my-5 border-slate-100" />

            {/* DESCRIPCIÓN GENERAL */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Descripción general del requerimiento
              </h3>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-800 leading-relaxed">
                {descripcionJustificacion}
              </div>
            </div>

            {/* ARTÍCULOS */}
            <div className="mt-6 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Lista de artículos / servicios requeridos
              </h3>

              {itemsLista.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-slate-200/80">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-700">
                      <tr>
                        <th className="px-4 py-3">Artículo</th>
                        <th className="px-4 py-3 text-center">Cantidad</th>
                        <th className="px-4 py-3 text-center">Unidad</th>
                        <th className="px-4 py-3">Especificaciones / Descripción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                      {itemsLista.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {item.nombre_articulo || 'Artículo sin especificar'}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">{item.cantidad ?? 1}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{item.unidad_medida || 'Unidad'}</td>
                          <td className="px-4 py-3 text-slate-600">{item.especificaciones_tecnicas || item.descripcion || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-4 text-xs italic text-slate-500">
                  No hay artículos desglosados en esta solicitud.
                </div>
              )}
            </div>

            {/* INFORMACIÓN DE COTIZACIONES Y SELECCIÓN DE COMPRAS */}
            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Información de Cotizaciones y Proveedor (Compras)
              </h3>

              {cotizacion ? (
                <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                  <div className="rounded-lg border border-green-200 bg-green-50/80 p-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-green-700">
                      ★ Selección Definitiva de Compras
                    </span>
                    <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-base font-bold text-slate-900">
                        {cotizacion.proveedor_definitivo || 'No especificado'}
                      </p>
                      <p className="text-lg font-extrabold text-green-700">
                        {formatearMoneda(cotizacion.valor_definitivo)}
                      </p>
                    </div>
                    {cotizacion.observaciones && (
                      <p className="mt-2 text-xs text-slate-600 border-t border-green-200/60 pt-2">
                        <span className="font-semibold text-slate-700">Justificación/Observaciones:</span>{' '}
                        {cotizacion.observaciones}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
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
                          className={`rounded-lg border p-3 text-xs bg-white ${
                            esSeleccionado ? 'border-green-400 ring-2 ring-green-200' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold text-slate-500 mb-1">
                            <span>Cotización {num}</span>
                            {esSeleccionado && (
                              <span className="rounded bg-green-100 text-green-800 px-1.5 py-0.5 text-[10px] font-bold">
                                Seleccionado
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-800 text-sm">{prov || 'Sin nombre'}</p>
                          <p className="mt-1 font-semibold text-slate-900">{formatearMoneda(val)}</p>
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block font-medium text-blue-600 hover:underline truncate max-w-full"
                            >
                              📄 Ver archivo / Drive
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-4 text-xs italic text-slate-500">
                  Aún no se han registrado cotizaciones para esta solicitud.
                </div>
              )}
            </div>
          </div>

          {/* BOTONES DE DECISIÓN DE ACCIÓN */}
          <div className="flex border-b border-slate-200 gap-4">
            <button
              type="button"
              onClick={() => setModoAccion('clasificar')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                modoAccion === 'clasificar'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              ✓ Clasificar y Aprobar Presupuesto
            </button>
            <button
              type="button"
              onClick={() => setModoAccion('rechazar')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                modoAccion === 'rechazar'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              ✕ Rechazar por Falta de Recursos
            </button>
          </div>

          {/* ALERTAS GLOBALES */}
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

          {/* OPCIÓN 1: CLASIFICAR Y APROBAR */}
          {modoAccion === 'clasificar' && (
            <form onSubmit={handleSubmitClasificacion} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Asignación de Rubros</CardTitle>
                  <CardDescription>Clasifica la solicitud dentro del presupuesto institucional.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {/* PROYECTO */}
                  <div className="space-y-1.5">
                    <Label htmlFor="proyecto">Proyecto</Label>
                    <select
                      id="proyecto"
                      value={proyecto}
                      onChange={(e) => setProyecto(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                    >
                      <option value="">-- Seleccionar proyecto --</option>
                      {PROYECTOS_INSTITUCIONALES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CENTRO DE COSTO */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="centro_costo">Centro de costo</Label>
                      <button
                        type="button"
                        onClick={() => setMostrandoNuevoCentro(!mostrandoNuevoCentro)}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        {mostrandoNuevoCentro ? 'Cancelar' : '+ Crear nuevo'}
                      </button>
                    </div>

                    {mostrandoNuevoCentro ? (
                      <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50/50 p-2">
                        <Input
                          type="text"
                          placeholder="Nombre del nuevo centro"
                          value={nuevoCentroNombre}
                          onChange={(e) => setNuevoCentroNombre(e.target.value)}
                          className="bg-white"
                        />
                        {errorNuevoCentro && <p className="text-xs text-red-600">{errorNuevoCentro}</p>}
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAgregarCentroCosto}
                          disabled={guardandoCentro}
                          className="w-full h-8 text-xs"
                        >
                          {guardandoCentro ? 'Guardando…' : 'Guardar y Seleccionar'}
                        </Button>
                      </div>
                    ) : (
                      <select
                        id="centro_costo"
                        value={centroCosto}
                        onChange={(e) => setCentroCosto(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                      >
                        <option value="">-- Seleccionar centro de costo --</option>
                        {centrosCostoLista.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* UNIDAD DE NEGOCIO */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="unidad_negocio">Unidad de negocio</Label>
                      <button
                        type="button"
                        onClick={() => setMostrandoNuevaUnidad(!mostrandoNuevaUnidad)}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        {mostrandoNuevaUnidad ? 'Cancelar' : '+ Crear nueva'}
                      </button>
                    </div>

                    {mostrandoNuevaUnidad ? (
                      <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50/50 p-2">
                        <Input
                          type="text"
                          placeholder="Nombre de la nueva unidad"
                          value={nuevaUnidadNombre}
                          onChange={(e) => setNuevaUnidadNombre(e.target.value)}
                          className="bg-white"
                        />
                        {errorNuevaUnidad && <p className="text-xs text-red-600">{errorNuevaUnidad}</p>}
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAgregarUnidadNegocio}
                          disabled={guardandoUnidad}
                          className="w-full h-8 text-xs"
                        >
                          {guardandoUnidad ? 'Guardando…' : 'Guardar y Seleccionar'}
                        </Button>
                      </div>
                    ) : (
                      <select
                        id="unidad_negocio"
                        value={unidadNegocio}
                        onChange={(e) => setUnidadNegocio(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                      >
                        <option value="">-- Seleccionar unidad de negocio --</option>
                        {unidadesNegocioLista.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* PRODUCTO */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="producto">Producto</Label>
                      <button
                        type="button"
                        onClick={() => setMostrandoNuevoProducto(!mostrandoNuevoProducto)}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        {mostrandoNuevoProducto ? 'Cancelar' : '+ Crear nuevo'}
                      </button>
                    </div>

                    {mostrandoNuevoProducto ? (
                      <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50/50 p-2">
                        <Input
                          type="text"
                          placeholder="Nombre del nuevo producto"
                          value={nuevoProductoNombre}
                          onChange={(e) => setNuevoProductoNombre(e.target.value)}
                          className="bg-white"
                        />
                        {errorNuevoProducto && <p className="text-xs text-red-600">{errorNuevoProducto}</p>}
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAgregarProducto}
                          disabled={guardandoProducto}
                          className="w-full h-8 text-xs"
                        >
                          {guardandoProducto ? 'Guardando…' : 'Guardar y Seleccionar'}
                        </Button>
                      </div>
                    ) : (
                      <select
                        id="producto"
                        value={producto}
                        onChange={(e) => setProducto(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                      >
                        <option value="">-- Seleccionar producto --</option>
                        {productosLista.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Campos adicionales</CardTitle>
                  <CardDescription>Información contable extra para esta solicitud.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {camposAdicionales.map((campo, indice) => (
                    <div key={indice} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor={`campo_clave_${indice}`}>Nombre del campo</Label>
                        <Input
                          id={`campo_clave_${indice}`}
                          value={campo.clave}
                          onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                            actualizarCampoAdicional(indice, 'clave', evento.target.value)
                          }
                          placeholder="p. ej. número de contrato"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor={`campo_valor_${indice}`}>Valor</Label>
                        <Input
                          id={`campo_valor_${indice}`}
                          value={campo.valor}
                          onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                            actualizarCampoAdicional(indice, 'valor', evento.target.value)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => eliminarCampoAdicional(indice)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ✕
                      </Button>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={agregarCampoAdicional}>
                    [+] Añadir campo adicional
                  </Button>
                </CardContent>
              </Card>

              <div className="pt-2">
                <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
                  {isPending ? 'Guardando clasificación…' : 'Guardar y aprobar clasificación'}
                </Button>
              </div>
            </form>
          )}

          {/* OPCIÓN 2: RECHAZAR SOLICITUD */}
          {modoAccion === 'rechazar' && (
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader>
                <CardTitle className="text-lg text-red-900">Rechazo de Solicitud</CardTitle>
                <CardDescription className="text-red-700">
                  Ingresa la notificación que recibirá el usuario. La solicitud cambiará su estado a <strong>'Rechazada'</strong> sin clasificar ningún rubro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="motivo_rechazo" className="text-red-900 font-semibold">
                    Motivo de rechazo / Notificación al solicitante:
                  </Label>
                  <Textarea
                    id="motivo_rechazo"
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    placeholder="Escribe la razón detallada del rechazo..."
                    className="bg-white border-red-200 text-sm focus:ring-red-500"
                    rows={4}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="lg"
                    onClick={handleRechazarSolicitud}
                    disabled={isPendingRechazo || !motivoRechazo.trim()}
                    className="w-full sm:w-auto"
                  >
                    {isPendingRechazo ? 'Procesando rechazo…' : 'Confirmar y Notificar Rechazo'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}