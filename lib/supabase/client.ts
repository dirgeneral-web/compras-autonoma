import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Cliente de Supabase para el navegador (Client Components).
 * Usa las variables públicas NEXT_PUBLIC_*, seguras para exponer al cliente
 * porque el acceso a los datos queda protegido por las políticas RLS
 * definidas en schema.sql.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
