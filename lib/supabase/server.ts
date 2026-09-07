import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

/**
 * Cliente de Supabase para el servidor (Server Components, Server Actions,
 * Route Handlers). Lee/escribe las cookies de sesión a través de la API
 * `cookies()` de `next/headers` (App Router).
 *
 * Debe crearse en cada request (no se debe cachear/compartir entre
 * peticiones) porque queda ligado a las cookies de esa petición puntual.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` fue llamado desde un Server Component.
          // Se puede ignorar si hay middleware refrescando la sesión.
        }
      },
    },
  });
}
