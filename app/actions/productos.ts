'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface Producto {
  id: string;
  nombre: string;
}

export async function obtenerProductos(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error || !data) {
    console.error('Error al obtener productos:', error);
    return [];
  }

  const lista = data as unknown as Producto[];
  return lista.map((item) => item.nombre);
}

export async function crearProducto(nombre: string) {
  if (!nombre || nombre.trim().length === 0) {
    return { success: false, error: 'El nombre no puede estar vacío.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('productos')
    .insert([{ nombre: nombre.trim() }] as any)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Este producto ya existe.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/presupuesto');
  return { success: true, data };
}