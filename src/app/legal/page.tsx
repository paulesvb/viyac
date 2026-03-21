'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/useTranslation";

export default function LegalPage() {
  const legalTitle = useTranslation("legalDisclaimer");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{legalTitle}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Creative Attribution & Rights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-56 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            The core of the VIYAC sound—including all instrumental compositions, arrangements, and musical performances—is 100% human-authored.
            <br />
            <br />
            In the spirit of sonic exploration, select recordings feature vocal layers or alternative interpretations developed via Suno AI. Viyac maintains full commercial ownership of these recordings under a professional license. These works represent the intersection of traditional musicianship and emerging synthetic technologies.
            <br />
            <br />
            <br />
            All Rights Reserved.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atribución Creativa y Derecho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-56 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            La esencia del sonido de VIYAC—incluyendo todas las composiciones instrumentales, arreglos e interpretaciones musicales—es 100% de autoría humana.
            <br />
            <br />
            Como parte de una exploración sonora continua, algunas grabaciones presentan capas vocales o interpretaciones alternativas desarrolladas mediante Suno AI. Viyac mantiene la propiedad comercial total de estas grabaciones bajo una licencia profesional. Estas obras representan la intersección entre la música tradicional y las tecnologías sintéticas emergentes.
            <br />
            <br />
            <br />
            <br />
            Todos los derechos reservados.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
