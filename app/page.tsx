'use client';

import { useState, useTransition } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { consultarRadicadoPublico } from '@/app/actions/solicitudes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import type { Database } from '@/lib/supabase/database.types';

type ResultadoConsulta = Database['public']['Functions']['fn_consultar_radicado']['Returns'][number];

const PASOS_STEPPER = [
  'Solicitud creada',
  'En cotización',
  'Revisión presupuestal',
  'Aprobación final',
  'Resultado',
];

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BuscadorPublicoPage() {
  const [radicado, setRadicado] = useState('');
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    if (radicado.trim().length === 0) return;

    startTransition(async () => {
      const respuesta = await consultarRadicadoPublico(radicado);
      if (!respuesta.success) {
        setResultado(null);
        setError(respuesta.error);
        return;
      }
      setResultado(respuesta.data);
    });
  }

  const esRechazada = resultado?.estado === 'Rechazada';
  const esAprobada = resultado?.estado === 'Aprobada';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Encabezado Institucional */}
      <header className="bg-[#0B1E3D] text-white shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Sistema Gestor de Compras</h1>
            <p className="text-xs text-slate-300">Corporación Universitaria Autónoma del Cauca</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/solicitud/nueva"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
            >
              Radicar Compra
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition border border-white/20"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal: Buscador Público */}
      <main className="flex-1 mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Consulta el estado de tu solicitud
          </h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Ingresa el número de radicado que recibiste al crear tu solicitud de compra para verificar su avance.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
          <Input
            value={radicado}
            onChange={(evento: ChangeEvent<HTMLInputElement>) => setRadicado(evento.target.value)}
            placeholder="SOL-2026-0001"
            aria-label="Número de radicado"
            className="flex-1"
          />
          <Button type="submit" disabled={isPending || radicado.trim().length === 0}>
            {isPending ? 'Buscando…' : 'Buscar'}
          </Button>
        </form>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        {resultado && (
          <Card className="w-full max-w-2xl bg-white shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>{resultado.radicado}</CardTitle>
              <CardDescription>
                Última actualización: {formatearFecha(resultado.fecha_actualizacion)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Stepper
                pasos={PASOS_STEPPER}
                pasoActual={resultado.paso_stepper}
                variante={esRechazada ? 'error' : 'default'}
                etiquetaFinal={esRechazada ? 'Rechazada' : esAprobada ? 'Aprobada' : undefined}
              />
              <p className="text-center text-sm text-slate-500">
                Estado actual: <span className="font-medium text-slate-900">{resultado.estado}</span>
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Pie de Página */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© Uniautónoma del Cauca — Vigilada Mineducación</p>
      </footer>
    </div>
  );
}