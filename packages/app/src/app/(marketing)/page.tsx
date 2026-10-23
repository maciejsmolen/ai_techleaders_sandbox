import Link from "next/link";

// Placeholder landing page: sample copy and layout until the real product
// pages are specified. Plain Tailwind only (no shadcn/ui on frontend pages).

const features = [
  {
    title: "Find a mentor",
    description: "Get matched with experienced engineers who know your stack and the path you want to take.",
  },
  {
    title: "Learn by doing",
    description: "Work through real code reviews, pairing sessions and project feedback instead of slides.",
  },
  {
    title: "Track your growth",
    description: "Set goals with your mentor and see your progress session by session.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">
          Dev<span className="text-emerald-400">Mentor</span>
        </span>
        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <a href="#features" className="hover:text-zinc-100">
            Features
          </a>
          <Link href="/admin" className="hover:text-zinc-100">
            Admin
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center sm:pt-28">
          <p className="mx-auto mb-6 w-fit rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
            Coming soon
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Grow faster as a developer, with a mentor at your side
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-zinc-400">
            DevMentor connects developers with experienced engineers for one-on-one guidance, code
            reviews and career advice.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#features"
              className="rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-300"
            >
              Get started
            </a>
            <a
              href="#features"
              className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium hover:border-zinc-500"
            >
              Learn more
            </a>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-24">
          <ul className="grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <li key={feature.title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="font-medium">{feature.title}</h2>
                <p className="mt-2 text-sm text-zinc-400">{feature.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-zinc-900">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-zinc-500">
          © {new Date().getFullYear()} DevMentor
        </div>
      </footer>
    </div>
  );
}
