'use client';

type Props = {
  thumbnailUrl?: string;
  playing: boolean;
};

/** Saved vinyl-style hero — pass `showSpinningDisc` on `VaultPlayer` to restore. */
export function VaultPlayerSpinningDisc({ thumbnailUrl, playing }: Props) {
  return (
    <div
      className={`relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64 ${
        playing ? 'animate-[spin_8s_linear_infinite]' : ''
      }`}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00f2ff]/15 via-[#7b2eff]/12 to-transparent ring-2 ring-[#00f2ff]/25" />
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          draggable={false}
          className="relative z-10 h-[88%] w-[88%] rounded-full object-cover shadow-2xl ring-4 ring-black/50"
        />
      ) : (
        <div className="relative z-10 flex h-[88%] w-[88%] items-center justify-center rounded-full bg-zinc-900 text-4xl text-[#00f2ff]/40 ring-4 ring-black/50">
          ♪
        </div>
      )}
    </div>
  );
}
