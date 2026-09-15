import Image from 'next/image';
import Link from 'next/link';

export default function RutasPage() {
  const modulos = [
    {
      titulo: '1. Iniciar Sesión (Autenticación)',
      rol: 'Acceso Público',
      rolColor: 'bg-green-100 text-green-800',
      ruta: '/login',
      url: 'https://compras-autonoma.vercel.app/login',
      descripcion: 'Iniciar sesión con dirgeneral@uniautonoma.edu.co para verificar la redirección a la creación de solicitud.',
    },
    {
      titulo: '2. Consulta Pública de Radicado',
      rol: 'Acceso Público',
      rolColor: 'bg-green-100 text-green-800',
      ruta: '/',
      url: 'https://compras-autonoma.vercel.app/',
      descripcion: 'Consultar avance en el Stepper con número de radicado (ej: SOL-0001) sin autenticarse.',
    },
    {
      titulo: '3. Crear Nueva Solicitud',
      rol: 'Solicitante',
      rolColor: 'bg-blue-100 text-blue-800',
      ruta: '/solicitud/nueva',
      url: 'https://compras-autonoma.vercel.app/solicitud/nueva',
      descripcion: 'Diligenciar encabezado, agregar artículos y obtener el radicado generado.',
    },
    {
      titulo: '4. Módulo de Compras',
      rol: 'Compras',
      rolColor: 'bg-purple-100 text-purple-800',
      ruta: '/compras',
      url: 'https://compras-autonoma.vercel.app/compras',
      descripcion: 'Cargar solicitudes pendientes, registrar hasta 3 cotizaciones y elegir proveedor.',
    },
    {
      titulo: '5. Módulo de Presupuesto',
      rol: 'Presupuesto',
      rolColor: 'bg-amber-100 text-amber-800',
      ruta: '/presupuesto',
      url: 'https://compras-autonoma.vercel.app/presupuesto',
      descripcion: 'Asignar Proyecto, Centro de Costo, Unidad de Negocio y Producto.',
    },
    {
      titulo: '6. Módulo de Autorización',
      rol: 'Autorizador',
      rolColor: 'bg-rose-100 text-rose-800',
      ruta: '/autorizador',
      url: 'https://compras-autonoma.vercel.app/autorizador',
      descripcion: 'Revisar historial de cotizaciones, centro de costo y Aprobar/Rechazar.',
    },
    {
      titulo: '7. Módulo de Cotización',
      rol: 'Módulo Proveedores',
      rolColor: 'bg-indigo-100 text-indigo-800',
      ruta: '/cotizaciones',
      url: 'https://compras-autonoma.vercel.app/cotizaciones',
      descripcion: 'Seleccionar solicitudes activas, registrar proveedores y enviar correos masivos de cotización.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Encabezado */}
      <header className="bg-[#0B1E3D] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="Uniautónoma Logo"
              className="h-16 w-auto object-contain bg-white/10 p-1.5 rounded-lg border border-white/20"
            />
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Sistema Gestor de Compras</h1>
              <p className="text-xs md:text-sm text-slate-300">Corporación Universitaria Autónoma del Cauca</p>
            </div>
          </div>
          <div className="bg-white/10 border border-white/20 px-4 py-2 rounded-lg text-xs text-center md:text-right">
            <span className="font-semibold block text-blue-300">Entorno de Pruebas</span>
            <span class="text-slate-300">compras-autonoma.vercel.app</span>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Panel de Rutas y Pruebas del Software</h2>
          <p className="text-sm text-slate-600">
            Haz clic en los botones para acceder directamente a cada módulo del sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulos.map((mod, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-full ${mod.rolColor}`}>
                    {mod.rol}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{mod.ruta}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{mod.titulo}</h3>
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <strong className="text-slate-800 block mb-1">Qué probar:</strong>
                  <p>{mod.descripcion}</p>
                </div>
              </div>
              <a
                href={mod.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B1E3D] hover:bg-blue-900 text-white font-medium text-sm rounded-lg transition text-center"
              >
                Acceder al Módulo →
              </a>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© Uniautónoma del Cauca — Vigilada Mineducación</p>
      </footer>
    </div>
  );
}