'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBrowserLanguage } from '@/hooks/use-browser-language';
import { useTranslation } from '@/hooks/useTranslation';

const legalCopyClass =
  'rounded-md border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground space-y-4';

const legalSectionHeadingClass =
  'mb-5 text-3xl font-bold tracking-tight md:mb-4';

const legalCardTitleClass = 'text-base leading-snug mt-0 mb-3';

export function LegalPageClient() {
  const lang = useBrowserLanguage();
  const legalTitle = useTranslation('legalDisclaimer');
  const legalLastUpdated = useTranslation('legalLastUpdated');
  const legalSection1Title = useTranslation('legalSection1Title');
  const legalSection2Title = useTranslation('legalSection2Title');
  const legalSection3Title = useTranslation('legalSection3Title');
  const legalSection4Title = useTranslation('legalSection4Title');
  const legalSection5Title = useTranslation('legalSection5Title');

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">{legalTitle}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{legalLastUpdated}</p>
      </div>

      <div className="flex flex-col gap-12 md:gap-16">
        <section className="flex flex-col gap-6">
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-0">
              <CardTitle className={legalCardTitleClass}>
                {legalSection1Title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pt-0">
              <div className={legalCopyClass}>
                {lang === 'es' ? (
                  <>
                    <p>
                      El núcleo del sonido de VIYAC —incluyendo todas las composiciones
                      instrumentales fundacionales, letras, arreglos y ejecuciones musicales— es
                      100% de autoría humana.
                    </p>
                    <p>
                      Como un proyecto híbrido con visión de futuro, VIYAC utiliza la
                      tecnología de Suno Studio exclusivamente como una herramienta de
                      producción para la exploración de conceptos de arreglos, diseño de
                      sonido y generación del máster final.
                    </p>
                    <p>
                      Cada pieza musical sigue siendo una expresión directa del proceso de
                      composición y la intención artística humana.
                    </p>
                    <p className="pt-1 font-medium text-foreground/90">
                      Todos los derechos reservados.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      The core of the VIYAC sound—including all foundational instrumental
                      compositions, lyrics, arrangements, and musical performances—is 100%
                      human-authored.
                    </p>
                    <p>
                      As a forward-looking hybrid project, VIYAC utilizes Suno Studio
                      technology exclusively as a production tool for arrangement concepts,
                      sound design, and mastering output.
                    </p>
                    <p>
                      Every piece of music remains a direct expression of human songwriting
                      and artistic intent.
                    </p>
                    <p className="pt-1 font-medium text-foreground/90">
                      All Rights Reserved.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-6 border-t border-border/50 pt-12 md:pt-16">
          <h2 className={legalSectionHeadingClass}>{legalSection2Title}</h2>
          <Card className="flex h-full flex-col">
            <CardContent className="flex flex-1 flex-col pt-6">
              <div className={legalCopyClass}>
                {lang === 'es' ? (
                  <>
                    <p>
                      Al registrarse a través de nuestros servicios de autenticación segura,
                      se le otorga una licencia no exclusiva e intransferible para escuchar
                      temas seleccionados solo para uso personal y no comercial. Usted
                      acepta no filtrar, compartir ni redistribuir estos archivos inéditos en
                      plataformas de terceros sin el consentimiento expreso por escrito.
                    </p>
                    <p>
                      Queda estrictamente prohibida la descarga, copia, grabación,
                      extracción de audio o ingeniería inversa de cualquier contenido.
                    </p>
                    <p>
                      Utilizamos almacenamiento en la nube estándar de la industria para
                      rastrear la interacción y proteger nuestra propiedad intelectual.
                    </p>
                    <p>
                      Estos datos se utilizan exclusivamente para mejorar la experiencia del
                      usuario y garantizar la seguridad del sitio, y nunca serán vendidos a
                      terceros.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      By registering via our secure authentication services, you are granted a
                      non-exclusive, non-transferable license to stream select tracks for
                      personal, non-commercial use. You agree not to leak, share, or
                      redistribute these unreleased files to third-party platforms without
                      express written consent.
                    </p>
                    <p>
                      Any downloading, ripping, recording, audio extraction, or reverse
                      engineering of the content is strictly prohibited.
                    </p>
                    <p>
                      We utilize industry-standard cloud storage to track engagement and
                      protect our intellectual property.
                    </p>
                    <p>
                      This data is used exclusively to improve the user experience and ensure
                      site security, and will never be sold to third parties.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-6 border-t border-border/50 pt-12 md:pt-16">
          <h2 className={legalSectionHeadingClass}>{legalSection3Title}</h2>
          <Card className="flex h-full flex-col">
            <CardContent className="flex flex-1 flex-col pt-6">
              <div className={legalCopyClass}>
                {lang === 'es' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <p>
                      The services and content on this site are provided &quot;as is.&quot;
                      Viyac is not liable for any technical issues, data loss, or
                      interruptions in service resulting from third-party infrastructure.
                    </p>
                    <p>
                      We reserve the right to modify or remove content at any time without
                      prior notice.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-6 border-t border-border/50 pt-12 md:pt-16">
          <h2 className={legalSectionHeadingClass}>{legalSection4Title}</h2>
          <Card className="flex h-full flex-col">
            <CardContent className="flex flex-1 flex-col pt-6">
              <div className={legalCopyClass}>
                {lang === 'es' ? (
                  <p>
                    Estos Términos y Condiciones se rigen e interpretan de acuerdo con
                    las leyes del Estado de Florida, Estados Unidos, sin dar efecto a
                    ningún principio de conflictos de leyes. Cualquier acción legal o
                    procedimiento relacionado con el acceso o uso de este sitio web y sus
                    servicios exclusivos se presentará exclusivamente ante los tribunales
                    estatales o federales ubicados en el Condado de Miami-Dade, Florida.
                  </p>
                ) : (
                  <p>
                    These Terms and Conditions shall be governed by and construed in
                    accordance with the laws of the State of Florida, United States,
                    without giving effect to any principles of conflicts of law. Any legal
                    action or proceeding relating to your access to, or use of, this
                    website and its exclusive services shall be instituted exclusively in
                    the state or federal courts located in Miami-Dade County, Florida.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-6 border-t border-border/50 pt-12 md:pt-16">
          <h2 className={legalSectionHeadingClass}>{legalSection5Title}</h2>
          <Card className="flex h-full flex-col">
            <CardContent className="flex flex-1 flex-col pt-6">
              <div className={legalCopyClass}>
                <p>
                  {lang === 'es'
                    ? 'Para consultas sobre licencias, sincronización o derechos de autor, contacte a:'
                    : 'For inquiries regarding licensing, synchronization, or copyright, please contact:'}
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
        </section>
      </div>
    </div>
  );
}
