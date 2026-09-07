'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface UnidadNegocio {
  id: string;
  nombre: string;
}

export async function obtenerUnidadesNegocio(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('unidades_negocio')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error || !data) {
    console.error('Error al obtener unidades de negocio:', error);
    return [];
  }

  const unidades = data as unknown as UnidadNegocio[];
  return unidades.map((item) => item.nombre);
}

export async function crearUnidadNegocio(nombre: string) {
  if (!nombre || nombre.trim().length === 0) {
    return { success: false, error: 'El nombre no puede estar vacío.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('unidades_negocio')
    .insert([{ nombre: nombre.trim() }] as any)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Esta unidad de negocio ya existe.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/presupuesto');
  return { success: true, data };
}