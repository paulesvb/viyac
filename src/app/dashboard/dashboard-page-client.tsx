'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { DashboardFeaturedMarquee } from '@/components/DashboardFeaturedMarquee';
import { ProvenanceBadge } from '@/components/ProvenanceBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardAlbum } from '@/lib/catalog-from-supabase';
import type { DashboardTrack } from '@/lib/dashboard-track-types';
import {
  getFeaturedDashboardTrackFromList,
  getOtherDashboardTracksFromList,
} from '@/lib/dashboard-tracks';
import { buildCompactTrackMetaLine, formatTagLabel, normalizeTagList } from '@/lib/track-meta';
import { resolvePublicAssetsUrl } from '@/lib/storage';

type Props = {
  tracks: DashboardTrack[];
  albums: DashboardAlbum[];
};

function getTrackPosterUrl(track: DashboardTrack): string | null {
  const source =
    track.thumbnail_url?.trim() ||
    track.lock_screen_art_path?.trim() ||
    process.env.NEXT_PUBLIC_MEDIA_SESSION_ART_URL?.trim();
  if (!source) return null;
  try {
    return resolvePublicAssetsUrl(source);
  } catch {
    return null;
  }
}

function getAlbumCoverUrl(album: DashboardAlbum): string | null {
  const source =
    album.cover_image_path?.trim() ||
    process.env.NEXT_PUBLIC_MEDIA_SESSION_ART_URL?.trim();
  if (!source) return null;
  try {
    return resolvePublicAssetsUrl(source);
  } catch {
    return null;
  }
}

export default function DashboardPageClient({ tracks, albums }: Props) {
  const { isLoaded } = useUser();
  const featured = getFeaturedDashboardTrackFromList(tracks);
  const otherTracks = getOtherDashboardTracksFromList(tracks, featured);
  const showTrackListOrEmpty =
    tracks.length === 0 || otherTracks.length > 0;

  if (!isLoaded) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mx-auto mb-6 max-w-6xl sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Home
        </h1>
      </header>

      {featured ? (
        <div className="mb-8 w-full min-w-0 sm:mb-10">
          <DashboardFeaturedMarquee track={featured} />
        </div>
      ) : null}

      {showTrackListOrEmpty ? (
      <div className="mx-auto max-w-6xl space-y-10">
      {tracks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No tracks yet</CardTitle>
            <CardDescription>
              Seed the Supabase catalog ({' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                npm run seed:catalog
              </code>
              ), add entries in{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                src/config/dashboard-tracks.ts
              </code>
              , or set a vault path for a single preview track.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Example in{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                .env.local
              </code>
              :
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
              {`NEXT_PUBLIC_DASHBOARD_VAULT_TRACK_PATH=your-folder/master.m3u8
# Optional — public assets bucket path for the blurred background
# NEXT_PUBLIC_DASHBOARD_VAULT_BG_PATH=backgrounds/dashboard.jpg`}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {otherTracks.length > 0 ? (
        <section className="space-y-4" aria-labelledby="more-tracks-heading">
          <h2
            id="more-tracks-heading"
            className="text-xl font-semibold tracking-tight"
          >
            More tracks
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {otherTracks.map((track) => {
              const posterUrl = getTrackPosterUrl(track);
              const metaLine = buildCompactTrackMetaLine(track);
              const instrumentsLine = normalizeTagList(track.instruments)
                .map(formatTagLabel)
                .join(', ');
              return (
              <li key={track.catalog_track_id ?? track.slug}>
                <Link
                  href={`/music/tracks/${encodeURIComponent(track.slug)}`}
                  className="group relative flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-cyan-500/40 hover:bg-muted/40"
                >
                  {posterUrl ? (
                    <div className="relative h-16 w-16 shrink-0 overflow-visible rounded-md ring-1 ring-border/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={posterUrl}
                        alt={`${track.title} poster`}
                        className="absolute inset-0 h-full w-full rounded-md object-cover"
                      />
                      {/* Detached hover preview (outside thumbnail bounds). */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={posterUrl}
                        alt=""
                        aria-hidden
                        className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-md object-cover opacity-0 shadow-2xl ring-1 ring-cyan-400/40 transition duration-200 group-hover:opacity-100 group-hover:scale-[3]"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground ring-1 ring-border/60">
                      Art
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground">{track.title}</p>
                      <ProvenanceBadge type={track.provenance_type} />
                      {track.is_instrumental ? (
                        <span className="rounded-full border border-zinc-500/50 bg-zinc-900/80 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-zinc-200">
                          Instrumental
                        </span>
                      ) : null}
                    </div>
                    {track.description_en ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {track.description_en}
                      </p>
                    ) : null}
                    {metaLine ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/90">
                        {metaLine}
                      </p>
                    ) : null}
                    {instrumentsLine ? (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        Instruments: {instrumentsLine}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            )})}
          </ul>
        </section>
      ) : null}

      {albums.length > 0 ? (
        <section className="mx-auto mt-8 max-w-6xl space-y-4" aria-labelledby="albums-heading">
          <h2
            id="albums-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Albums
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => {
              const coverUrl = getAlbumCoverUrl(album);
              return (
                <li key={album.id}>
                  <Link
                    href={`/music/albums/${encodeURIComponent(album.slug)}`}
                    className="group block overflow-hidden rounded-lg border border-border bg-card transition hover:border-cyan-500/40 hover:bg-muted/40"
                  >
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverUrl}
                        alt={`${album.title} cover`}
                        className="aspect-video w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                        Album cover
                      </div>
                    )}
                    <div className="space-y-1 p-3">
                      <p className="truncate font-medium text-foreground">{album.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {album.track_count} track{album.track_count === 1 ? '' : 's'}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      </div>
      ) : null}
    </div>
  );
}
