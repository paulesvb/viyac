/** Matches VIYAC dark + cyan accents used across the app. */
export const clerkAuthAppearance = {
  variables: {
    colorPrimary: '#22d3ee',
    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    borderRadius: '0.75rem',
  },
  elements: {
    card: 'border border-cyan-500/20 bg-zinc-950/95 shadow-[0_0_40px_-12px_rgba(34,211,238,0.15)]',
    headerTitle: 'text-xl font-semibold tracking-tight text-foreground',
    headerSubtitle: 'text-sm text-muted-foreground',
    formButtonPrimary:
      'bg-cyan-400 text-zinc-950 hover:bg-cyan-300 font-medium',
    footerActionLink: 'text-cyan-300 hover:text-cyan-200',
  },
};

/** Navbar avatar + account menu — explicit sizing so it stays visible on dark chrome. */
export const clerkUserButtonAppearance = {
  variables: {
    colorPrimary: '#22d3ee',
    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    borderRadius: '0.75rem',
  },
  elements: {
    avatarBox: 'h-9 w-9 ring-2 ring-cyan-400/30',
    userButtonPopoverCard:
      'border border-cyan-500/20 bg-zinc-950 shadow-[0_0_40px_-12px_rgba(34,211,238,0.15)]',
    userButtonPopoverActionButton: 'hover:bg-zinc-900',
    userButtonPopoverActionButtonText: 'text-foreground',
    userButtonPopoverFooter: 'hidden',
  },
};
