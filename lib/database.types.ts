/**
 * Tipos de la base de datos Supabase.
 *
 * En un proyecto real esto se regenera con:
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts
 *
 * Aquí se define a mano, en el mismo formato que genera el CLI, para que
 * coincida exactamente con `schema.sql` (tablas, enums y la función RPC
 * `fn_consultar_radicado`) y así tipar fuertemente el cliente de Supabase.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RolUsuario = 'solicitante' | 'compras' | 'presupuesto' | 'autorizador';

export type EstadoSolicitud =
  | 'Creada'
  | 'En Cotización'
  | 'En Revisión Presupuestal'
  | 'Esperando Aprobación Final'
  | 'Aprobada'
  | 'Rechazada';

export interface Database {
  public: {
    Tables: {
      perfiles: {
        Row: {
          id: string;
          email: string;
          nombre_completo: string | null;
          rol: RolUsuario;
          activo: boolean;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id: string;
          email: string;
          nombre_completo?: string | null;
          rol?: RolUsuario;
          activo?: boolean;
          creado_en?: string;
          actualizado_en?: string;
        };
        Update: Partial<Database['public']['Tables']['perfiles']['Insert']>;
      };

      solicitudes: {
        Row: {
          id: string;
          radicado: string | null;
          solicitante_id: string;
          nombre_solicitante: string;
          correo_solicitante: string;
          area_solicitante: string | null;
          estado: EstadoSolicitud;
          descripcion_general: string | null;
          fecha_limite_cotizacion: string | null;
          fecha_creacion: string;
          fecha_actualizacion: string;
          fecha_cierre: string | null;
        };
        Insert: {
          id?: string;
          radicado?: string | null;
          solicitante_id: string;
          nombre_solicitante: string;
          correo_solicitante: string;
          area_solicitante?: string | null;
          estado?: EstadoSolicitud;
          descripcion_general?: string | null;
          fecha_limite_cotizacion?: string | null;
          fecha_creacion?: string;
          fecha_actualizacion?: string;
          fecha_cierre?: string | null;
        };
        Update: Partial<Database['public']['Tables']['solicitudes']['Insert']>;
      };

      detalles_articulo: {
        Row: {
          id: string;
          solicitud_id: string;
          nombre_articulo: string;
          descripcion: string | null;
          cantidad: number;
          unidad_medida: string | null;
          especificaciones_tecnicas: string | null;
          creado_en: string;
        };
        Insert: {
          id?: string;
          solicitud_id: string;
          nombre_articulo: string;
          descripcion?: string | null;
          cantidad?: number;
          unidad_medida?: string | null;
          especificaciones_tecnicas?: string | null;
          creado_en?: string;
        };
        Update: Partial<Database['public']['Tables']['detalles_articulo']['Insert']>;
      };

      cotizaciones_compras: {
        Row: {
          id: string;
          solicitud_id: string;
          proveedor_1: string | null;
          valor_1: number | null;
          url_drive_1: string | null;
          proveedor_2: string | null;
          valor_2: number | null;
          url_drive_2: string | null;
          proveedor_3: string | null;
          valor_3: number | null;
          url_drive_3: string | null;
          proveedor_definitivo: string | null;
          valor_definitivo: number | null;
          observaciones: string | null;
          registrado_por: string | null;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id?: string;
          solicitud_id: string;
          proveedor_1?: string | null;
          valor_1?: number | null;
          url_drive_1?: string | null;
          proveedor_2?: string | null;
          valor_2?: number | null;
          url_drive_2?: string | null;
          proveedor_3?: string | null;
          valor_3?: number | null;
          url_drive_3?: string | null;
          proveedor_definitivo?: string | null;
          valor_definitivo?: number | null;
          observaciones?: string | null;
          registrado_por?: string | null;
          creado_en?: string;
          actualizado_en?: string;
        };
        Update: Partial<Database['public']['Tables']['cotizaciones_compras']['Insert']>;
      };

      clasificacion_presupuesto: {
        Row: {
          id: string;
          solicitud_id: string;
          proyecto: string | null;
          centro_costo: string | null;
          unidad_negocio: string | null;
          producto: string | null;
          campos_adicionales: Json;
          clasificado_por: string | null;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id?: string;
          solicitud_id: string;
          proyecto?: string | null;
          centro_costo?: string | null;
          unidad_negocio?: string | null;
          producto?: string | null;
          campos_adicionales?: Json;
          clasificado_por?: string | null;
          creado_en?: string;
          actualizado_en?: string;
        };
        Update: Partial<Database['public']['Tables']['clasificacion_presupuesto']['Insert']>;
      };

      auditoria_historial: {
        Row: {
          id: number;
          solicitud_id: string | null;
          tabla_afectada: string;
          registro_id: string | null;
          accion: string;
          estado_anterior: Json | null;
          estado_nuevo: Json | null;
          usuario_id: string | null;
          creado_en: string;
        };
        Insert: {
          id?: number;
          solicitud_id?: string | null;
          tabla_afectada: string;
          registro_id?: string | null;
          accion: string;
          estado_anterior?: Json | null;
          estado_nuevo?: Json | null;
          usuario_id?: string | null;
          creado_en?: string;
        };
        Update: Partial<Database['public']['Tables']['auditoria_historial']['Insert']>;
      };
    };

    Views: Record<string, never>;

    Functions: {
      fn_consultar_radicado: {
        Args: { p_radicado: string };
        Returns: {
          radicado: string;
          estado: EstadoSolicitud;
          fecha_creacion: string;
          fecha_actualizacion: string;
          paso_stepper: number;
        }[];
      };
    };

    Enums: {
      rol_usuario: RolUsuario;
      estado_solicitud: EstadoSolicitud;
    };
  };
}
