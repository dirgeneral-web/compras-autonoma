export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type EstadoSolicitud =
  | 'borrador'
  | 'pendiente'
  | 'pendiente_revision'
  | 'pendiente_aprobacion'
  | 'aprobada'
  | 'rechazada'
  | 'en_cotizacion'
  | 'completada'
  | 'cancelada'
  | string;

export interface Database {
  public: {
    Tables: {
      solicitudes: {
        Row: Record<string, any>;
        Insert: Record<string, any>;
        Update: Record<string, any>;
      };
      [key: string]: any;
    };
    Views: Record<string, any>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
  };
}