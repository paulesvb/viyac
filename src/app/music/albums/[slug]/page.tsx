import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProvenanceBadge } from '@/components/ProvenanceBadge';
import { getAccessibleAlbumWithTracksBySlug } from '@/lib/catalog-from-supabase';
import { buildCompactTrackMetaLine, formatTagLabel, normalizeTagList } from '@/lib/track-meta';
import { resolvePublicAssetsUrl } from '@/lib/storage';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { userId } = await auth();
  if (!userId) return { title: 'Album' };
  const data = await getAccessibleAlbumWithTracksBySlug(userId, slug);
  if (!data) return { title: 'Album' };
  return { title: `${data.album.title} | Albums` };
}

export default async function AlbumPage({ params }: PageProps) {
  const { slug } = await params;
  const { userId } = await auth();
  if (!userId) notFound();

  const data = await getAccessibleAlbumWithTracksBySlug(userId, slug);
  if (!data) notFound();

  const { album, tracks } = data;
  let coverUrl: string | null = null;
  if (album.cover_image_path) {
    try {
      coverUrl = resolvePublicAssetsUrl(album.cover_image_path);
    } catch {
      coverUrl = null;
    }
  }

  const defaultPoster = process.env.NEXT_PUBLIC_MEDIA_SESSION_ART_URL?.trim();

  const getTrackPosterUrl = (track: (typeof tracks)[number]): string | null => {
    const source =
      track.thumbnail_url?.trim() ||
      track.lock_screen_art_path?.trim() ||
      defaultPoster;
    if (!source) return null;
    try {
      return resolvePublicAssetsUrl(source);
    } catch {
      return null;
    }
  };

  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/home"
          className="inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Home
        </Link>

        <header className="overflow-hidden rounded-xl border border-border bg-card">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={`${album.title} cover`}
              className="max-h-72 w-full object-cover"
            />
          ) : (
            <div className="flex h-36 w-full items-center justify-center bg-muted text-muted-foreground">
              Album
            </div>
          )}
          <div className="space-y-1 p-4">
            <h1 className="text-2xl font-bold tracking-tight">{album.title}</h1>
            <p className="text-sm text-muted-foreground">
              {tracks.length} track{tracks.length === 1 ? '' : 's'}
            </p>
          </div>
        </header>

        {tracks.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {tracks.map((track) => {
              const posterUrl = getTrackPosterUrl(track);
              const metaLine = buildCompactTrackMetaLine(track);
              const instrumentsLine = normalizeTagList(track.instruments)
                .map(formatTagLabel)
                .join(', ');
              return (
                <li key={track.catalog_track_id ?? track.slug}>
                  <Link
                    href={`/music/tracks/${encodeURIComponent(track.slug)}?album=${encodeURIComponent(album.slug)}`}
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
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            No accessible tracks found in this album yet.
          </div>
        )}
      </div>
    </div>
  );
}
