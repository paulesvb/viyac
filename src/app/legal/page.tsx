'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/useTranslation";

/** Shared styling for legal copy blocks — even rhythm and line height */
const legalCopyClass =
  "rounded-md border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground space-y-4";

export default function LegalPage() {
  const legalTitle = useTranslation("legalDisclaimer");
  const legalSection2Title = useTranslation("legalSection2Title");
  const legalSection3Title = useTranslation("legalSection3Title");
  const legalSection4Title = useTranslation("legalSection4Title");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">{legalTitle}</h1>
      </div>

      <div className="flex flex-col gap-14 md:gap-20">
        {/* Section 1 — Creative attribution */}
        <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base leading-snug">
                Atribución Creativa y Derecho
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pt-0">
              <div className={legalCopyClass}>
                <p>
                  La esencia del sonido de VIYAC—incluyendo todas las composiciones
                  instrumentales, arreglos e interpretaciones musicales—es 100% de autoría
                  humana.
                </p>
                <p>
                  Como parte de una exploración sonora continua, algunas grabaciones
                  presentan capas vocales o interpretaciones alternativas desarrolladas
                  mediante Suno AI. Viyac mantiene la propiedad comercial total de estas
                  grabaciones bajo una licencia profesional. Estas obras representan la
                  intersección entre la música tradicional y las tecnologías sintéticas
                  emergentes.
                </p>
                <p className="pt-1 font-medium text-foreground/90">
                  Todos los derechos reservados.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base leading-snug">
                Creative Attribution &amp; Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pt-0">
              <div className={legalCopyClass}>
                <p>
                  The core of the VIYAC sound—including all instrumental compositions,
                  arrangements, and musical performances—is 100% human-authored.
                </p>
                <p>
                  In the spirit of sonic exploration, select recordings feature vocal
                  layers or alternative interpretations developed via Suno AI. Viyac
                  maintains full commercial ownership of these recordings under a
                  professional license. These works represent the intersection of
                  traditional musicianship and emerging synthetic technologies.
                </p>
                <p className="pt-1 font-medium text-foreground/90">
                  All Rights Reserved.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 2 — Inner Circle */}
        <section className="flex flex-col gap-6">
          <h2 className="text-3xl font-bold tracking-tight">{legalSection2Title}</h2>
          <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
            <Card className="flex h-full flex-col">
              <CardContent className="flex flex-1 flex-col pt-6">
                <div className={legalCopyClass}>
                  <p>
                    Al registrarse a través de nuestros servicios de autenticación segura,
                    se le otorga una licencia no exclusiva e intransferible para escuchar
                    pistas seleccionadas solo para uso personal y no comercial. Usted
                    acepta no filtrar, compartir ni redistribuir estos archivos inéditos en
                    plataformas de terceros sin el consentimiento expreso por escrito.
                  </p>
                  <p>
                    Utilizamos almacenamiento en la nube estándar de la industria para
                    rastrear la interacción y proteger nuestra propiedad intelectual.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col">
              <CardContent className="flex flex-1 flex-col pt-6">
                <div className={legalCopyClass}>
                  <p>
                    By registering via our secure authentication services, you are granted a
                    non-exclusive, non-transferable license to stream select tracks for
                    personal, non-commercial use. You agree not to leak, share, or
                    redistribute these unreleased files to third-party platforms without
                    express written consent.
                  </p>
                  <p>
                    We utilize industry-standard cloud storage to track engagement and
                    protect our intellectual property.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 3 — Limitation of liability */}
        <section className="flex flex-col gap-6">
          <h2 className="text-3xl font-bold tracking-tight">{legalSection3Title}</h2>
          <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
            <Card className="flex h-full flex-col">
              <CardContent className="flex flex-1 flex-col pt-6">
                <div className={legalCopyClass}>
                  <p>
                    Los servicios y el contenido de este sitio se proporcionan &quot;tal
                    cual&quot;. Viyac no es responsable de ningún problema técnico, pérdida
                    de datos o interrupciones en el servicio derivadas de la infraestructura
                    de terceros.
                  </p>
                  <p>
                    Nos reservamos el derecho de modificar o eliminar contenido en
                    cualquier momento sin previo aviso.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col">
              <CardContent className="flex flex-1 flex-col pt-6">
                <div className={legalCopyClass}>
                  <p>
                    The services and content on this site are provided &quot;as is.&quot;
                    Viyac is not liable for any technical issues, data loss, or
                    interruptions in service resulting from third-party infrastructure.
                  </p>
                  <p>
                    We reserve the right to modify or remove content at any time without
                    prior notice.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 4 — Legal contact */}
        <section className="flex flex-col gap-6">
          <h2 className="text-3xl font-bold tracking-tight">{legalSection4Title}</h2>
          <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
            <Card className="flex h-full flex-col">
              <CardContent className="flex flex-1 flex-col pt-6">
                <div className={legalCopyClass}>
                  <p>
                    Para consultas sobre licencias, sincronización o derechos de autor,
                    contacte a:
                  </p>
                  <p>
                    <a
                      href="mailto:legal@viyac.com"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      legal@viyac.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col">
              <CardContent className="flex flex-1 flex-col pt-6">
                <div className={legalCopyClass}>
                  <p>
                    For inquiries regarding licensing, synchronization, or copyright,
                    please contact:
                  </p>
                  <p>
                    <a
                      href="mailto:legal@viyac.com"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      legal@viyac.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
