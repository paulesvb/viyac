import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 border-b border-border pb-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Catalog</h1>
          <nav className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link
              href="/admin/tracks"
              className="text-cyan-400/90 underline-offset-4 hover:underline"
            >
              Tracks
            </Link>
            <Link
              href="/admin/albums"
              className="text-cyan-400/90 underline-offset-4 hover:underline"
            >
              Albums
            </Link>
            <Link
              href="/home"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Home
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
