'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface CentroCosto {
  id: string;
  nombre: string;
}

export async function obtenerCentrosCosto(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('centros_costo')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error || !data) {
    console.error('Error al obtener centros de costo:', error);
    return [];
  }

  // Cast explícito para ignorar el desfase de tipos con Supabase
  const centros = data as unknown as CentroCosto[];
  return centros.map((item) => item.nombre);
}

export async function crearCentroCosto(nombre: string) {
  if (!nombre || nombre.trim().length === 0) {
    return { success: false, error: 'El nombre no puede estar vacío.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('centros_costo')
    .insert([{ nombre: nombre.trim() }] as any)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Este centro de costo ya existe.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/presupuesto');
  return { success: true, data };
}