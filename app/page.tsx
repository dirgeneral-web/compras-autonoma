'use client';

import { useState, useTransition } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { consultarRadicadoPublico } from '@/app/actions/solicitudes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import type { Database } from '@/lib/supabase/database.types';
import DirectorioRutasPage from './directorio/page';

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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Consulta el estado de tu solicitud
        </h1>
        <p className="mt-2 text-slate-500">
          Ingresa el número de radicado que recibiste al crear tu solicitud de compra.
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
        <Card className="w-full max-w-2xl">
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

      {/* Separador e integración del directorio de rutas */}
      <hr className="my-6 w-full border-slate-200" />

      <div className="w-full">
        <DirectorioRutasPage />
      </div>
    </main>
  );
}