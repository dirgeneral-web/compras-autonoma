import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Encabezado Oficial */}
      <header className="bg-[#0B1E3D] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="Uniautónoma del Cauca Logo"
              className="h-14 w-auto object-contain bg-white/10 p-1.5 rounded-lg border border-white/20"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Sistema Gestor de Compras</h1>
              <p className="text-xs text-slate-300">Corporación Universitaria Autónoma del Cauca</p>
            </div>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
          >
            Iniciar Sesión
          </Link>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-slate-900">Portal de Solicitudes y Compras</h2>
          <p className="text-slate-600 max-w-xl mx-auto text-sm">
            Consulte el estado actual de su solicitud mediante el número de radicado o ingrese al sistema con sus credenciales institucionales.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Opción 1: Consulta Pública */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 text-green-800 rounded-full">
                Acceso Público
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-3">Consultar Estado de Solicitud</h3>
              <p className="text-xs text-slate-500 mt-1">
                Verifique el avance en tiempo real de su radicado sin necesidad de iniciar sesión.
              </p>
            </div>
            <Link
              href="/#consulta"
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-lg transition text-center block"
            >
              Ir a Consultar Radicado
            </Link>
          </div>

          {/* Opción 2: Acceso Funcionarios */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
                Módulos Internos
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-3">Ingreso a la Plataforma</h3>
              <p className="text-xs text-slate-500 mt-1">
                Acceso para Solicitantes, Compras, Presupuesto y Autorizadores.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full py-2.5 bg-[#0B1E3D] hover:bg-blue-900 text-white font-medium text-xs rounded-lg transition text-center block"
            >
              Ingresar con Correo Institucional
            </Link>
          </div>
        </div>
      </main>

      {/* Pie de Página */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© Uniautónoma del Cauca — Vigilada Mineducación</p>
      </footer>
    </div>
  );
}