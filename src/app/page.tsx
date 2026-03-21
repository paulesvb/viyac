import Link from "next/link";
import ReleaseCountdown from "@/components/ReleaseCountdown";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black flex flex-col">
      <ReleaseCountdown />
      <footer className="mt-auto pb-6 text-center">
        <Link
          href="/legal"
          className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
        >
          Legal disclaimer
        </Link>
      </footer>
    </div>
  );
}
