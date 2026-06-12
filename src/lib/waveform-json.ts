/**
 * Normalizes Supabase `waveform.json` (or similar) into WaveSurfer `peaks` + `duration`.
 *
 * Supported shapes:
 * - `{ "duration": 187.4, "peaks": [0.1, -0.2, ...] }` mono
 * - `{ "duration": 187.4, "peaks": [[L...], [R...]] }` stereo
 * - audiowaveform-style (BBC): `{ "version":1, "channels":1, "data":[...], "bits":8, ... }`
 *   — `data` is min/max pairs per channel per pixel. Duration may be omitted; use `0` and let
 *   the player take duration from the media element.
 */
export type ParsedWaveform = {
  /** Seconds; `0` means “use linked media duration” (see `VaultPlayer`). */
  duration: number;
  peaks: Array<Float32Array | number[]>;
};

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.length > 0 && typeof v[0] === 'number';
}

/**
 * Amplitude 0..1 from audiowaveform min/max for one time bucket.
 * Prefer peak-to-peak (dynamic range in the window) so sustained full-scale
 * buckets do not all read as “max height”; blend in center excursion for transients.
 */
function peakFromMinMax(min: number, max: number, bits: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (bits <= 8) {
    const spread = (hi - lo) / 255;
    const c = 128;
    const extent = Math.max(Math.abs(lo - c), Math.abs(hi - c)) / c;
    const v = 0.72 * spread + 0.28 * extent;
    return Math.min(1, Math.max(0, v));
  }
  if (bits <= 16) {
    const full = 2 ** bits - 1;
    const spread = full > 0 ? (hi - lo) / full : 0;
    const half = 2 ** (bits - 1);
    const extent = Math.max(Math.abs(lo), Math.abs(hi)) / half;
    const v = 0.72 * spread + 0.28 * extent;
    return Math.min(1, Math.max(0, v));
  }
  const half = 2 ** (bits - 1);
  const m = Math.max(Math.abs(lo), Math.abs(hi)) / half;
  return Math.min(1, Math.max(0, m));
}

/** Mean-pool each channel to `target` bins so WaveSurfer does not max-merge tens of thousands of samples into solid blocks. */
export function downsamplePeaksForDisplay(
  channels: Array<Float32Array | number[]>,
  target: number,
): Float32Array[] {
  const bins = Math.max(32, Math.floor(target));
  return channels.map((ch) => {
    const n = ch.length;
    const out = new Float32Array(bins);
    if (n === 0) return out;
    if (n <= bins) {
      for (let i = 0; i < n; i++) {
        const v = ch[i];
        out[i] = typeof v === 'number' && Number.isFinite(v) ? v : 0;
      }
      return out;
    }
    const ratio = n / bins;
    for (let b = 0; b < bins; b++) {
      const start = Math.floor(b * ratio);
      const end = Math.min(n, Math.floor((b + 1) * ratio));
      if (start >= end) continue;
      let sum = 0;
      for (let i = start; i < end; i++) {
        const v = ch[i];
        sum += typeof v === 'number' && Number.isFinite(v) ? v : 0;
      }
      out[b] = sum / (end - start);
    }
    return out;
  });
}

function parseAudiowaveformJson(o: Record<string, unknown>): ParsedWaveform | null {
  if (!Array.isArray(o.data) || typeof o.bits !== 'number') return null;
  const bits = o.bits as number;
  const data = o.data as number[];
  if (bits < 1 || !data.length) return null;

  const channels =
    typeof o.channels === 'number' && o.channels >= 1
      ? Math.floor(o.channels)
      : 1;
  const stride = channels * 2;
  if (stride < 2 || data.length < stride) return null;

  const pixelCount = Math.floor(data.length / stride);
  if (pixelCount < 1) return null;

  const peaks: number[][] = Array.from({ length: channels }, () =>
    new Array<number>(pixelCount),
  );

  for (let p = 0; p < pixelCount; p++) {
    const base = p * stride;
    for (let ch = 0; ch < channels; ch++) {
      const vmin = data[base + ch * 2];
      const vmax = data[base + ch * 2 + 1];
      peaks[ch]![p] = peakFromMinMax(
        typeof vmin === 'number' ? vmin : 0,
        typeof vmax === 'number' ? vmax : 0,
        bits,
      );
    }
  }

  const sampleRate =
    typeof o.sample_rate === 'number' && o.sample_rate > 0 ? o.sample_rate : 0;
  const samplesPerPixel =
    typeof o.samples_per_pixel === 'number' && o.samples_per_pixel > 0
      ? o.samples_per_pixel
      : 0;
  const declaredLength =
    typeof o.length === 'number' && o.length > 0 ? Math.floor(o.length) : pixelCount;

  let duration = typeof o.duration === 'number' && o.duration > 0 ? o.duration : 0;
  if (duration <= 0 && sampleRate > 0 && samplesPerPixel > 0) {
    duration = (declaredLength * samplesPerPixel) / sampleRate;
  }

  return { duration, peaks };
}

export function parseWaveformJson(raw: unknown): ParsedWaveform | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  if (Array.isArray(o.data) && typeof o.bits === 'number') {
    return parseAudiowaveformJson(o);
  }

  const duration = typeof o.duration === 'number' ? o.duration : 0;
  if (duration <= 0) return null;

  const peaksRaw = o.peaks;
  if (isNumberArray(peaksRaw)) {
    return { duration, peaks: [peaksRaw] };
  }
  if (
    Array.isArray(peaksRaw) &&
    peaksRaw.length > 0 &&
    Array.isArray(peaksRaw[0])
  ) {
    const channels = peaksRaw as unknown[];
    const peaks: number[][] = [];
    for (const ch of channels) {
      if (!Array.isArray(ch)) return null;
      peaks.push(
        ch.map((x) => (typeof x === 'number' ? Math.max(-1, Math.min(1, x)) : 0)),
      );
    }
    return peaks.length ? { duration, peaks } : null;
  }

  return null;
}
