import Image from "next/image";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="shrink-0 border-b border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur dark:border-stone-700 dark:bg-stone-900/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 font-serif text-lg font-semibold text-stone-800 dark:text-stone-100"
        >
          <Image
            src="/logo.png"
            alt=""
            width={160}
            height={48}
            className="h-10 w-auto max-h-10 shrink-0 object-contain object-left"
            priority
          />
          <span className="leading-tight">In vestigiis Hippocratis</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-stone-600 dark:text-stone-300">
          <Link href="/" className="hover:text-teal-700 dark:hover:text-teal-400">
            Mappa
          </Link>
          <Link href="/invia" className="hover:text-teal-700 dark:hover:text-teal-400">
            Proponi un luogo
          </Link>
        </nav>
      </div>
    </header>
  );
}
