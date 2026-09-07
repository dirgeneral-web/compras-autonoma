'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react';
import { cn } from '@/lib/utils';

interface ComboboxProps {
  id?: string;
  opciones: readonly string[];
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Select/Combobox con autocompletado. Filtra las opciones institucionales
 * a medida que el usuario escribe y permite seleccionar una con clic o
 * con teclado (Enter selecciona la primera opción filtrada).
 */
export function Combobox({ id, opciones, valor, onChange, placeholder, disabled }: ComboboxProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState(valor);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBusqueda(valor);
  }, [valor]);

  useEffect(() => {
    function alHacerClicFuera(evento: globalThis.MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierto(false);
        setBusqueda(valor);
      }
    }
    document.addEventListener('mousedown', alHacerClicFuera);
    return () => document.removeEventListener('mousedown', alHacerClicFuera);
  }, [valor]);

  const filtradas = opciones.filter((opcion) =>
    opcion.toLowerCase().includes(busqueda.toLowerCase())
  );

  function seleccionar(opcion: string) {
    onChange(opcion);
    setBusqueda(opcion);
    setAbierto(false);
  }

  return (
    <div ref={contenedorRef} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={abierto}
        autoComplete="off"
        disabled={disabled}
        value={busqueda}
        placeholder={placeholder}
        onFocus={() => setAbierto(true)}
        onChange={(evento: ChangeEvent<HTMLInputElement>) => {
          setBusqueda(evento.target.value);
          setAbierto(true);
          if (evento.target.value === '') onChange('');
        }}
        onKeyDown={(evento: KeyboardEvent<HTMLInputElement>) => {
          if (evento.key === 'Enter' && filtradas.length > 0) {
            evento.preventDefault();
            seleccionar(filtradas[0]);
          }
          if (evento.key === 'Escape') {
            setAbierto(false);
          }
        }}
        className={cn(
          'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm',
          'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      />
      {abierto && filtradas.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {filtradas.map((opcion) => (
            <li key={opcion}>
              <button
                type="button"
                onMouseDown={(evento: MouseEvent<HTMLButtonElement>) => evento.preventDefault()}
                onClick={() => seleccionar(opcion)}
                className={cn(
                  'block w-full px-3 py-2 text-left hover:bg-slate-100',
                  opcion === valor && 'bg-slate-50 font-medium'
                )}
              >
                {opcion}
              </button>
            </li>
          ))}
        </ul>
      )}
      {abierto && filtradas.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 shadow-lg">
          Sin coincidencias.
        </div>
      )}
    </div>
  );
}
