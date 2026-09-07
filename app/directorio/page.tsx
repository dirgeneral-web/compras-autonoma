'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  LogIn, 
  Search, 
  FilePlus, 
  ShoppingCart, 
  Calculator, 
  CheckCircle2, 
  ExternalLink,
  ShieldAlert,
  Building2,
  Key,
  Copy,
  Check,
  Home
} from 'lucide-react';

export default function DirectorioRutasPage() {
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiarAlPortapapeles = (texto: string, clave: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(clave);
    setTimeout(() => setCopiado(null), 2000);
  };

  const credenciales = [
    {
      rol: 'Director General / Solicitante',
      correo: 'dirgeneral@uniautonoma.edu.co',
      tag: 'Principal',
    },
    {
      rol: 'Equipo de Compras',
      correo: 'compras@uniautonoma.edu.co',
      tag: 'Cotizaciones',
    },
    {
      rol: 'Equipo de Presupuesto',
      correo: 'presupuesto@uniautonoma.edu.co',
      tag: 'Clasificación',
    },
    {
      rol: 'Autorizador Final',
      correo: 'autorizador@uniautonoma.edu.co',
      tag: 'Aprobación',
    },
  ];

  const modulos = [
    {
      titulo: '1. Iniciar Sesión (Autenticación)',
      ruta: '/login',
      acceso: 'Público',
      rolColor: 'bg-slate-100 text-slate-800 border-slate-300',
      icono: LogIn,
      descripcion: 'Acceso inicial a la plataforma institucional.',
      prueba: 'Iniciar sesión con el usuario asignado (dirgeneral@uniautonoma.edu.co) para verificar la redirección.',
    },
    {
      titulo: '2. Consulta Pública de Radicado',
      ruta: '/',
      acceso: 'Público',
      rolColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icono: Search,
      descripcion: 'Seguimiento del estado de solicitudes en tiempo real sin autenticación.',
      prueba: 'Ingresar un número de radicado generado (ejemplo: SOL-0001) para validar el flujo del Stepper.',
    },
    {
      titulo: '3. Crear Nueva Solicitud',
      ruta: '/solicitud/nueva',
      acceso: 'Autenticado (Solicitante)',
      rolColor: 'bg-blue-100 text-blue-800 border-blue-300',
      icono: FilePlus,
      descripcion: 'Formulario para radicar nuevas compras y requerimientos de área.',
      prueba: 'Diligenciar encabezado, agregar o remover filas de artículos y confirmar la recepción del radicado.',
    },
    {
      titulo: '4. Módulo de Compras (Cotizaciones)',
      ruta: '/compras',
      acceso: 'Rol: Compras',
      rolColor: 'bg-amber-100 text-amber-800 border-amber-300',
      icono: ShoppingCart,
      descripcion: 'Gestión y carga de cotizaciones de proveedores.',
      prueba: 'Cargar solicitudes en estado Creada, registrar hasta 3 cotizaciones y elegir proveedor definitivo.',
    },
    {
      titulo: '5. Módulo de Presupuesto (Clasificación)',
      ruta: '/presupuesto',
      acceso: 'Rol: Presupuesto',
      rolColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      icono: Calculator,
      descripcion: 'Imputación contable y clasificación presupuestal del gasto.',
      prueba: 'Cargar solicitudes en revisión, asignar Proyecto, Centro de Costo, Unidad de Negocio y Producto.',
    },
    {
      titulo: '6. Módulo de Autorización (Aprobación Final)',
      ruta: '/autorizador',
      acceso: 'Rol: Autorizador',
      rolColor: 'bg-purple-100 text-purple-800 border-purple-300',
      icono: CheckCircle2,
      descripcion: 'Revisión final de trazabilidad y aprobación/rechazo de la solicitud.',
      prueba: 'Revisar historial completo, ingresar observaciones finales y ejecutar la aprobación o rechazo.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 border-t-8 border-blue-900 pb-16">
      {/* Header Institucional */}
      <header className="bg-white border-b border-slate-200 shadow-sm mb-8 py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-900 text-white rounded-lg shadow">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Sistema de Gestión de Compras
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Corporación Universitaria Autónoma del Cauca — Uniautónoma
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg text-sm transition-colors border border-slate-300"
            >
              <Home className="w-4 h-4" />
              <span>Volver al Inicio</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-900 px-3 py-2 rounded-lg text-xs font-semibold">
              <ShieldAlert className="w-4 h-4 text-blue-700" />
              Portal de Accesos
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto px-4 space-y-8">
        
        {/* Panel de Credenciales de Prueba */}
        <section className="bg-white rounded-xl border border-blue-100 shadow-sm p-6 bg-gradient-to-r from-blue-900/5 via-white to-transparent">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-bold text-slate-900">
              Usuarios y Credenciales de Prueba
            </h2>
          </div>
          <p className="text-xs text-slate-600 mb-4">
            Haz clic en el botón de copiar para utilizar las direcciones de correo configuradas en las pruebas del flujo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {credenciales.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      {item.tag}
                    </span>
                    <span className="text-xs font-semibold text-blue-900">
                      {item.rol}
                    </span>
                  </div>
                  <p className="text-xs font-mono font-medium text-slate-800 truncate mb-2">
                    {item.correo}
                  </p>
                </div>

                <button
                  onClick={() => copiarAlPortapapeles(item.correo, `cred-${idx}`)}
                  className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium text-xs py-1.5 px-2 rounded transition-colors"
                >
                  {copiado === `cred-${idx}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar correo</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Sección de Módulos y Rutas */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-800">Módulos de la Plataforma</h2>
            <p className="text-slate-600 text-sm">
              Selecciona el destino al que deseas ingresar o revisa los casos de prueba para cada etapa del proceso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modulos.map((item, index) => {
              const Icono = item.icono;
              return (
                <div 
                  key={index} 
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700">
                        <Icono className="w-6 h-6" />
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${item.rolColor}`}>
                        {item.acceso}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base mb-1">
                      {item.titulo}
                    </h3>
                    <p className="text-slate-600 text-xs mb-4">
                      {item.descripcion}
                    </p>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Qué probar:
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {item.prueba}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 p-4 bg-slate-50/50 mt-auto">
                    <Link
                      href={item.ruta}
                      className="w-full inline-flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors"
                    >
                      <span>Ingresar al Módulo</span>
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}