'use client';

import { cn } from '@/lib/utils';

interface StepperProps {
  /** Etiquetas de cada paso, en orden. */
  pasos: string[];
  /** Paso actual, 1-indexado (1..pasos.length). */
  pasoActual: number;
  /** Variante visual: 'default' resalta en negro, 'error' resalta en rojo (p. ej. solicitud Rechazada). */
  variante?: 'default' | 'error';
  /** Si se indica, reemplaza la etiqueta del último paso (p. ej. "Rechazada"). */
  etiquetaFinal?: string;
}

/**
 * Stepper horizontal de solo lectura. No filtra ni recibe datos personales:
 * únicamente pinta números de paso y etiquetas genéricas de estado.
 */
export function Stepper({ pasos, pasoActual, variante = 'default', etiquetaFinal }: StepperProps) {
  const enError = variante === 'error';

  return (
    <ol className="flex w-full items-start" aria-label="Progreso de la solicitud">
      {pasos.map((paso, index) => {
        const numero = index + 1;
        const completado = numero < pasoActual;
        const activo = numero === pasoActual;
        const esUltimo = index === pasos.length - 1;
        const resaltarEnRojo = enError && (activo || completado);
        const etiqueta = esUltimo && etiquetaFinal ? etiquetaFinal : paso;

        return (
          <li key={paso} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  resaltarEnRojo && 'bg-red-100 text-red-700',
                  !resaltarEnRojo && (completado || activo) && 'bg-slate-900 text-white',
                  !resaltarEnRojo && !completado && !activo && 'bg-slate-100 text-slate-400'
                )}
                aria-current={activo ? 'step' : undefined}
              >
                {numero}
              </span>
              {!esUltimo && (
                <span
                  className={cn(
                    'mx-1 h-0.5 flex-1 rounded-full transition-colors',
                    completado ? (enError ? 'bg-red-300' : 'bg-slate-900') : 'bg-slate-200'
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                'mt-2 px-1 text-xs leading-tight',
                activo ? 'font-medium text-slate-900' : 'text-slate-500',
                resaltarEnRojo && activo && 'font-medium text-red-700'
              )}
            >
              {etiqueta}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
