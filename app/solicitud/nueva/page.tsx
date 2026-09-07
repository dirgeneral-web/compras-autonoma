'use client';

import { useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { crearSolicitud } from '@/app/actions/solicitudes';
import { crearSolicitudSchema, type ArticuloInput } from '@/lib/validations/compras';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function articuloVacio(): ArticuloInput {
  return {
    nombre_articulo: '',
    descripcion: '',
    cantidad: 1,
    unidad_medida: '',
    especificaciones_tecnicas: '',
  };
}

function encabezadoVacio() {
  return {
    nombre_solicitante: '',
    correo_solicitante: '',
    area_solicitante: '',
    descripcion_general: '',
    fecha_limite_cotizacion: '',
  };
}

export default function NuevaSolicitudPage() {
  const [isPending, startTransition] = useTransition();
  const [encabezado, setEncabezado] = useState(encabezadoVacio());
  const [articulos, setArticulos] = useState<ArticuloInput[]>([articuloVacio()]);
  const [mensajesError, setMensajesError] = useState<string[]>([]);
  const [radicadoCreado, setRadicadoCreado] = useState<string | null>(null);

  function actualizarEncabezado(campo: keyof ReturnType<typeof encabezadoVacio>, valor: string) {
    setEncabezado((prev) => ({ ...prev, [campo]: valor }));
  }

  function actualizarArticulo(indice: number, campo: keyof ArticuloInput, valor: string | number) {
    setArticulos((prev) => prev.map((articulo, i) => (i === indice ? { ...articulo, [campo]: valor } : articulo)));
  }

  function agregarArticulo() {
    setArticulos((prev) => [...prev, articuloVacio()]);
  }

  function eliminarArticulo(indice: number) {
    setArticulos((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== indice)));
  }

  function reiniciarFormulario() {
    setEncabezado(encabezadoVacio());
    setArticulos([articuloVacio()]);
    setMensajesError([]);
    setRadicadoCreado(null);
  }

  function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensajesError([]);

    const payload = {
      nombre_solicitante: encabezado.nombre_solicitante,
      correo_solicitante: encabezado.correo_solicitante,
      area_solicitante: encabezado.area_solicitante || undefined,
      descripcion_general: encabezado.descripcion_general,
      fecha_limite_cotizacion: encabezado.fecha_limite_cotizacion || undefined,
      articulos: articulos.map((articulo) => ({
        ...articulo,
        descripcion: articulo.descripcion || undefined,
        unidad_medida: articulo.unidad_medida || undefined,
        especificaciones_tecnicas: articulo.especificaciones_tecnicas || undefined,
        cantidad: Number(articulo.cantidad),
      })),
    };

    const parsed = crearSolicitudSchema.safeParse(payload);
    if (!parsed.success) {
      setMensajesError(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    startTransition(async () => {
      const respuesta = await crearSolicitud(parsed.data);
      if (!respuesta.success) {
        setMensajesError([respuesta.error]);
        return;
      }
      setRadicadoCreado(respuesta.data.radicado);
    });
  }

  if (radicadoCreado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>¡Solicitud creada con éxito!</CardTitle>
            <CardDescription>Guarda este radicado, lo necesitarás para hacer seguimiento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-md bg-slate-100 py-3 text-xl font-semibold tracking-wide text-slate-900">
              {radicadoCreado}
            </p>
            <Button type="button" onClick={reiniciarFormulario} className="w-full">
              Crear otra solicitud
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Nueva solicitud de compra</h1>
        <p className="mt-1 text-slate-500">
          Completa tus datos, la justificación y los artículos que necesitas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos del solicitante</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre_solicitante">Nombre completo</Label>
              <Input
                id="nombre_solicitante"
                value={encabezado.nombre_solicitante}
                onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                  actualizarEncabezado('nombre_solicitante', evento.target.value)
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="correo_solicitante">Correo electrónico</Label>
              <Input
                id="correo_solicitante"
                type="email"
                value={encabezado.correo_solicitante}
                onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                  actualizarEncabezado('correo_solicitante', evento.target.value)
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="area_solicitante">Área / dependencia</Label>
              <Input
                id="area_solicitante"
                value={encabezado.area_solicitante}
                onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                  actualizarEncabezado('area_solicitante', evento.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha_limite_cotizacion">Fecha límite de cotización</Label>
              <Input
                id="fecha_limite_cotizacion"
                type="date"
                value={encabezado.fecha_limite_cotizacion}
                onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                  actualizarEncabezado('fecha_limite_cotizacion', evento.target.value)
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="descripcion_general">Justificación de la solicitud</Label>
              <Textarea
                id="descripcion_general"
                rows={4}
                value={encabezado.descripcion_general}
                onChange={(evento: ChangeEvent<HTMLTextAreaElement>) =>
                  actualizarEncabezado('descripcion_general', evento.target.value)
                }
                placeholder="Explica para qué se necesitan estos artículos…"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Artículos solicitados</CardTitle>
            <CardDescription>Agrega una fila por cada artículo que necesites.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {articulos.map((articulo, indice) => (
              <div key={indice} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-12">
                <div className="space-y-1.5 sm:col-span-4">
                  <Label htmlFor={`nombre_articulo_${indice}`}>Artículo</Label>
                  <Input
                    id={`nombre_articulo_${indice}`}
                    value={articulo.nombre_articulo}
                    onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                      actualizarArticulo(indice, 'nombre_articulo', evento.target.value)
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`cantidad_${indice}`}>Cantidad</Label>
                  <Input
                    id={`cantidad_${indice}`}
                    type="number"
                    min={1}
                    step="1"
                    value={articulo.cantidad}
                    onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                      actualizarArticulo(indice, 'cantidad', Number(evento.target.value))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`unidad_medida_${indice}`}>Unidad</Label>
                  <Input
                    id={`unidad_medida_${indice}`}
                    placeholder="Unidad, caja…"
                    value={articulo.unidad_medida}
                    onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                      actualizarArticulo(indice, 'unidad_medida', evento.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-4">
                  <Label htmlFor={`especificaciones_${indice}`}>Especificaciones técnicas</Label>
                  <Input
                    id={`especificaciones_${indice}`}
                    value={articulo.especificaciones_tecnicas}
                    onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                      actualizarArticulo(indice, 'especificaciones_tecnicas', evento.target.value)
                    }
                  />
                </div>
                <div className="flex items-end sm:col-span-12">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => eliminarArticulo(indice)}
                    disabled={articulos.length === 1}
                    className="text-red-600 hover:text-red-700"
                  >
                    ✕ Quitar artículo
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={agregarArticulo}>
              + Agregar artículo
            </Button>
          </CardContent>
        </Card>

        {mensajesError.length > 0 && (
          <div role="alert" className="space-y-1 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {mensajesError.map((mensaje, i) => (
              <p key={i}>{mensaje}</p>
            ))}
          </div>
        )}

        <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
      </form>
    </main>
  );
}
