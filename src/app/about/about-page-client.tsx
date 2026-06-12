'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCampaignHref } from '@/hooks/use-campaign-href';
import { useBrowserLanguage } from '@/hooks/use-browser-language';
import { useTranslate } from '@/hooks/use-translate';

const manifestoCopyClass =
  'space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base';

const taglineClass =
  'text-lg font-semibold uppercase tracking-wide text-cyan-200/90 sm:text-xl';

const philosophyHeadingClass =
  'mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-foreground/90';

const ecosystemActionsClass =
  'mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap';

export function AboutPageClient() {
  const lang = useBrowserLanguage();
  const t = useTranslate();
  const { homeHref } = useCampaignHref();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 sm:py-12">
      <header className="mb-10 md:mb-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t('aboutPageTitle')}
        </h1>
      </header>

      <Card className="border-cyan-500/15 bg-card/95">
        <CardContent className="pt-6">
          <div className={manifestoCopyClass}>
            <p className={taglineClass}>{t('aboutTagline')}</p>
            {lang === 'es' ? (
              <>
                <p>
                  VIYAC es mi proyecto personal de arte y producción musical, diseñado en
                  la frontera donde la tecnología de vanguardia se encuentra con la
                  composición artesanal. No creo en los límites del estudio tradicional.
                  Opero en un ecosistema &quot;Future-Retro&quot;, construyendo paisajes
                  sonoros donde la instrumentación clásica y la fuerza de un ensamble de
                  rock tradicional se combinan con texturas digitales de alta fidelidad. El
                  sonido de VIYAC fusiona guitarras eléctricas atemporales, armonías vocales
                  complejas diseñadas con inteligencia artificial y líneas de bajo
                  profundamente melódicas, potenciadas por el impacto y la precisión de las
                  herramientas de producción del mañana.
                </p>
                <h2 className={philosophyHeadingClass}>{t('aboutPhilosophyHeading')}</h2>
                <p>
                  Abrazo el futuro sin perder el pulso de la honestidad. En una era de
                  automatización, el núcleo de cada canción de VIYAC es 100% humano:
                  cada letra, melodía base y progresión instrumental nace de mi propia
                  ejecución. La inteligencia artificial y el procesamiento digital
                  avanzado entran en el estudio exclusivamente para potenciar los arreglos,
                  refinar el máster y elevar el diseño sónico y visual a dimensiones
                  extremas de alta definición.
                </p>
                <p className="font-medium text-foreground/90">
                  Esto no es solo música; es mi archivo digital de emociones humanas.
                  Bienvenido al universo VIYAC.
                </p>
                <h2 className={philosophyHeadingClass}>{t('aboutEcosystemHeading')}</h2>
                <p>
                  Diseñé esta aplicación no solo para compartir mi música, sino como un
                  espacio de exploración interactiva. Si eres un oyente en busca de nuevos
                  horizontes sónicos, bienvenido al viaje.
                </p>
                <p>
                  Si eres artista, vocalista, productor o profesional de la industria y
                  conectas con mi sonido, hablemos. VIYAC es un lienzo abierto a
                  colaboraciones, reinterpretaciones y sinergias que desafíen los límites
                  de la producción musical actual. Las piezas están listas; construyamos
                  el siguiente nivel juntos.
                </p>
              </>
            ) : (
              <>
                <p>
                  VIYAC is my personal art and music production project, designed at the
                  frontier where cutting-edge technology meets artisanal songwriting. I
                  don&apos;t believe in the limits of the traditional studio. I operate
                  within a &quot;Future-Retro&quot; ecosystem, building soundscapes where
                  classic instrumentation and the raw power of a traditional rock ensemble
                  combine with high-fidelity digital textures. The VIYAC sound fuses
                  timeless electric guitars, complex AI-designed vocal harmonies, and deeply
                  melodic basslines, powered by the impact and precision of tomorrow&apos;s
                  production tools.
                </p>
                <h2 className={philosophyHeadingClass}>{t('aboutPhilosophyHeading')}</h2>
                <p>
                  I embrace the future without losing the pulse of honesty. In an era of
                  automation, the core of every VIYAC song remains 100% human: every lyric,
                  base melody, and instrumental progression is born from my own execution.
                  Artificial intelligence and advanced digital processing enter the studio
                  exclusively to enhance the arrangements, refine the master, and elevate
                  both sonic and visual design into extreme high-definition dimensions.
                </p>
                <p className="font-medium text-foreground/90">
                  This isn&apos;t just music; it&apos;s my digital archive of human
                  emotion. Welcome to the VIYAC universe.
                </p>
                <h2 className={philosophyHeadingClass}>{t('aboutEcosystemHeading')}</h2>
                <p>
                  I engineered this application not just to share my music, but as an
                  interactive exploration space. If you are a listener searching for new
                  sonic horizons, welcome to the journey.
                </p>
                <p>
                  If you are an artist, vocalist, producer, or industry professional and
                  you resonate with my sound, let&apos;s talk. VIYAC is an open canvas for
                  collaborations, track reinterpretations, and creative synergies that push
                  the boundaries of modern music production. The blueprints are ready;
                  let&apos;s build the next level together.
                </p>
              </>
            )}
            <div className={ecosystemActionsClass}>
              <Button asChild>
                <Link href={homeHref}>{t('aboutExploreVault')}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="mailto:hello@viyac.com">{t('aboutContact')}</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
