import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LegalPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Legal Disclaimer</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Intellectual Property & AI Disclosure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-56 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            All instrumental compositions, arrangements, and performances featured as "Demos" on this site are 100% human-authored and owned by Viyac.
            <br />
            To explore creative possibilities, some tracks may feature vocal layers or "Covers" generated using Suno AI. Viyac holds full commercial rights to these recordings under a professional license. These AI-assisted versions are intended for "Phase 1" conceptual demonstration and do not represent the final human-led master recordings.
            <br />
            All Rights Reserved.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Divulgación de Propiedad Intelectual e IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-56 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            Todas las composiciones instrumentales, arreglos e interpretaciones presentadas como "Demos" en este sitio son 100% de autoría humana y propiedad de Viyac.
            <br />
            Para explorar posibilidades creativas, algunas pistas pueden incluir capas vocales o "Covers" generados mediante Suno AI. Viyac posee los derechos comerciales totales de estas grabaciones bajo una licencia profesional. Estas versiones asistidas por IA están destinadas a la demostración conceptual de la "Fase 1" y no representan las grabaciones maestras (masters) finales lideradas por humanos.
            <br />
            Todos los derechos reservados.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
