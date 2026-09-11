'use client';

import { useState, useTransition } from 'react';
import { registrarProveedor, enviarSolicitudCotizacion } from '@/app/actions/cotizaciones';
import { useRouter } from 'next/navigation'; // <-- Agregar esta línea

interface Item {
  id: string;
  articulo: string;
  cantidad: number;
  unidad: string;
  especificaciones: string;
}

interface Solicitud {
  id: string;
  radicado: string;
  items: Item[];
}

interface Proveedor {
  id: string;
  nombre_proveedor: string;
  identificacion: string;
  correo_electronico: string;
  telefono?: string;
  contacto?: string;
}

export default function CotizadorClient({
  solicitudesIniciales,
  proveedoresIniciales,
}: {
  solicitudesIniciales: Solicitud[];
  proveedoresIniciales: Proveedor[];
}) {
  const router = useRouter();
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<Solicitud | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>(proveedoresIniciales);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [nuevoProv, setNuevoProv] = useState({
    nombre_proveedor: '',
    identificacion: '',
    correo_electronico: '',
    telefono: '',
    contacto: '',
    direccion: '',
  });

  const handleCrearProveedor = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await registrarProveedor(nuevoProv);
      if (res.success && res.data) {
      // Forzamos el cast para evitar la inferencia estricta de Supabase en el build
      const nuevoProveedor = res.data as any;

      setProveedores((prev) => [...prev, nuevoProveedor]);
      setProveedorSeleccionado(nuevoProveedor);
      setMostrarModal(false);
      setNuevoProv({
        nombre_proveedor: '',
        identificacion: '',
        correo_electronico: '',
        telefono: '',
        contacto: '',
        direccion: '',
      });
    } else {
        alert(res.error || 'Error al guardar el proveedor.');
      }
    });
  };

  const handleEnviarCotizacion = () => {
    if (!solicitudSeleccionada || !proveedorSeleccionado) return;

    startTransition(async () => {
      setMensajeEstado(null);
      const res = await enviarSolicitudCotizacion(solicitudSeleccionada.id, proveedorSeleccionado.id);
      if (res.success) {
        setMensajeEstado({ tipo: 'exito', texto: '¡Solicitud enviada correctamente al correo del proveedor!' });
      // Limpiar campos seleccionados
  setSolicitudSeleccionada('');
  setProveedorSeleccionado('');

  // Reejecuta la consulta del servidor para actualizar la lista de solicitudes
  router.refresh();  
      } else {
        setMensajeEstado({ tipo: 'error', texto: res.error || 'Error al enviar el correo.' });
      }
    });
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cotizar Solicitudes</h1>
        <p className="text-slate-500 text-sm">Selecciona una solicitud y envía la cotización directamente al proveedor.</p>
      </div>

      {mensajeEstado && (
        <div className={`p-4 rounded-md text-sm font-medium ${mensajeEstado.tipo === 'exito' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensajeEstado.texto}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bloque 1: Solicitudes */}
        <section className="bg-white p-5 rounded-lg border border-slate-200 space-y-4 shadow-sm">
          <h2 className="font-semibold text-slate-800 text-base">1. Solicitud de Compra</h2>
          <select
            className="w-full p-2 border rounded-md text-sm bg-slate-50 border-slate-300"
            onChange={(e) => {
              const sol = solicitudesIniciales.find((s) => s.id === e.target.value);
              setSolicitudSeleccionada(sol || null);
            }}
          >
            <option value="">-- Seleccionar solicitud activa --</option>
            {solicitudesIniciales.map((sol) => (
              <option key={sol.id} value={sol.id}>
                Radicado #{sol.radicado || sol.id.slice(0, 8)} ({sol.items?.length || 0} ítems)
              </option>
            ))}
          </select>

          {solicitudSeleccionada && (
            <div className="border rounded-md overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b text-slate-700 font-semibold">
                  <tr>
                    <th className="p-2">Artículo</th>
                    <th className="p-2">Cant.</th>
                    <th className="p-2">Unidad</th>
                    <th className="p-2">Especificaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {solicitudSeleccionada.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2 font-medium">{item.articulo}</td>
                      <td className="p-2">{item.cantidad}</td>
                      <td className="p-2">{item.unidad}</td>
                      <td className="p-2 text-slate-500">{item.especificaciones || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Bloque 2: Seleccionar o Crear Proveedor */}
        <section className="bg-white p-5 rounded-lg border border-slate-200 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-slate-800 text-base">2. Proveedor</h2>
            <button
              type="button"
              onClick={() => setMostrarModal(true)}
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-2.5 py-1.5 rounded border border-blue-200"
            >
              + Registrar Proveedor
            </button>
          </div>

          <select
            className="w-full p-2 border rounded-md text-sm bg-slate-50 border-slate-300"
            value={proveedorSeleccionado?.id || ''}
            onChange={(e) => {
              const prov = proveedores.find((p) => p.id === e.target.value);
              setProveedorSeleccionado(prov || null);
            }}
          >
            <option value="">-- Seleccionar proveedor registrado --</option>
            {proveedores.map((prov) => (
              <option key={prov.id} value={prov.id}>
                {prov.nombre_proveedor} - NIT: {prov.identificacion}
              </option>
            ))}
          </select>

          {proveedorSeleccionado && (
            <div className="p-3 bg-slate-50 rounded-md border text-xs space-y-1 text-slate-600">
              <p><strong className="text-slate-800">Contacto:</strong> {proveedorSeleccionado.contacto || 'No registrado'}</p>
              <p><strong className="text-slate-800">Correo:</strong> {proveedorSeleccionado.correo_electronico}</p>
              <p><strong className="text-slate-800">Teléfono:</strong> {proveedorSeleccionado.telefono || 'No registrado'}</p>
            </div>
          )}
        </section>
      </div>

      {/* Bloque 3: Envío */}
      <section className="bg-white p-5 rounded-lg border border-slate-200 space-y-4 shadow-sm">
        <h2 className="font-semibold text-slate-800 text-base">3. Enviar Solicitud</h2>
        <button
          onClick={handleEnviarCotizacion}
          disabled={!solicitudSeleccionada || !proveedorSeleccionado || isPending}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium text-sm rounded-md transition"
        >
          {isPending ? 'Enviando...' : 'Enviar Cotización por Correo'}
        </button>
      </section>

      {/* Modal de Registro de Proveedor */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-900 text-base">Nuevo Proveedor</h3>
            <form onSubmit={handleCrearProveedor} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Nombre / Razón Social *</label>
                <input required className="w-full p-2 border rounded" value={nuevoProv.nombre_proveedor} onChange={(e) => setNuevoProv({ ...nuevoProv, nombre_proveedor: e.target.value })} />
              </div>
              <div>
                <label className="block font-medium mb-1">NIT / Cédula *</label>
                <input required className="w-full p-2 border rounded" value={nuevoProv.identificacion} onChange={(e) => setNuevoProv({ ...nuevoProv, identificacion: e.target.value })} />
              </div>
              <div>
                <label className="block font-medium mb-1">Correo Electrónico *</label>
                <input required type="email" className="w-full p-2 border rounded" value={nuevoProv.correo_electronico} onChange={(e) => setNuevoProv({ ...nuevoProv, correo_electronico: e.target.value })} />
              </div>
              <div>
                <label className="block font-medium mb-1">Persona de Contacto</label>
                <input className="w-full p-2 border rounded" value={nuevoProv.contacto} onChange={(e) => setNuevoProv({ ...nuevoProv, contacto: e.target.value })} />
              </div>
              <div>
                <label className="block font-medium mb-1">Teléfono</label>
                <input className="w-full p-2 border rounded" value={nuevoProv.telefono} onChange={(e) => setNuevoProv({ ...nuevoProv, telefono: e.target.value })} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setMostrarModal(false)} className="px-3 py-1.5 border rounded text-slate-600">Cancelar</button>
                <button type="submit" disabled={isPending} className="px-3 py-1.5 bg-blue-600 text-white rounded font-medium">{isPending ? 'Guardando...' : 'Guardar Proveedor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}