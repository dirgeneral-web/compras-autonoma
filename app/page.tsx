import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BuscadorPublicoClient from './buscador-publico-client';

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si hay sesión activa, redirigir según el correo institucional
  if (user) {
    const email = user.email?.toLowerCase() || '';

    if (email === 'presupuesto@uniautonoma.edu.co') {
      redirect('/presupuesto');
    }

    if (email === 'cotizaciones@uniautonoma.edu.co') {
      redirect('/compras');
    }

    if (email === 'autorizador@uniautonoma.edu.co') {
      redirect('/autorizador');
    }

    if (email.endsWith('@uniautonoma.edu.co')) {
      redirect('/solicitud/nueva');
    }
  }

  // Si no hay sesión, muestra la búsqueda pública
  return <BuscadorPublicoClient />;
}