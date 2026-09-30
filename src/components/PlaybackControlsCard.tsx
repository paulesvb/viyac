'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslate } from '@/hooks/use-translate';
import { Pause, Play, Repeat, SkipBack, SkipForward, Square } from 'lucide-react';

type Props = {
  isPlaying: boolean;
  loopEnabled: boolean;
  onPrevious?: () => void;
  onPlayPause: () => void;
  onStop: () => void;
  onNext?: () => void;
  onLoopChange: (enabled: boolean) => void;
  disabled?: boolean;
};

export function PlaybackControlsCard({
  isPlaying,
  loopEnabled,
  onPrevious,
  onPlayPause,
  onStop,
  onNext,
  onLoopChange,
  disabled = false,
}: Props) {
  const t = useTranslate();

  return (
    <Card className="border-border/70 bg-card/95">
      <CardContent className="flex flex-nowrap items-center gap-2 sm:gap-3">
        {onPrevious ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={disabled}
            aria-label={t('ctaPrevious')}
            className="shrink-0"
          >
            <SkipBack aria-hidden />
            <span className="hidden sm:inline">{t('ctaPrevious')}</span>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onPlayPause}
          disabled={disabled}
          aria-label={isPlaying ? t('ctaPause') : t('ctaPlay')}
          className="shrink-0"
        >
          {isPlaying ? <Pause aria-hidden /> : <Play className="fill-current" aria-hidden />}
          <span className="hidden sm:inline">
            {isPlaying ? t('ctaPause') : t('ctaPlay')}
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onStop}
          disabled={disabled}
          aria-label={t('ctaStop')}
          className="shrink-0"
        >
          <Square aria-hidden />
          <span className="hidden sm:inline">{t('ctaStop')}</span>
        </Button>
        {onNext ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={disabled}
            aria-label={t('ctaNext')}
            className="shrink-0"
          >
            <SkipForward aria-hidden />
            <span className="hidden sm:inline">{t('ctaNext')}</span>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onLoopChange(!loopEnabled)}
          disabled={disabled}
          aria-label={t('ctaLoop')}
          aria-pressed={loopEnabled}
          className={
            loopEnabled
              ? 'shrink-0 border-[#00f2ff] text-[#00f2ff] hover:border-[#00f2ff] hover:text-[#00f2ff] dark:border-[#00f2ff] dark:text-[#00f2ff] dark:hover:border-[#00f2ff] dark:hover:text-[#00f2ff]'
              : 'shrink-0'
          }
        >
          <Repeat aria-hidden />
        </Button>
      </CardContent>
    </Card>
  );
}
