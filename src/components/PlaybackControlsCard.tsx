'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslate } from '@/hooks/use-translate';
import { Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';

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
        <div className="ml-auto flex shrink-0 items-center gap-2 pl-1">
          <Switch
            id="queue_loop"
            checked={loopEnabled}
            onCheckedChange={onLoopChange}
            disabled={disabled}
          />
          <Label htmlFor="queue_loop" className="text-sm font-normal whitespace-nowrap">
            {t('ctaLoop')}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
