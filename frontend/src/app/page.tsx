import Image from "next/image";
import Link from "next/link";

const templates = [
  { id: "classic", name: "Classic", blurb: "Clean, ATS-friendly, works everywhere." },
  { id: "modern", name: "Modern", blurb: "A touch of colour for a contemporary look." },
  { id: "compact", name: "Compact", blurb: "Dense one-page layout for long careers." },
  { id: "academic", name: "Academic/CV", blurb: "Formal serif style for senior leadership roles." },
];

const features = [
  {
    title: "Built for the classroom, not the boardroom",
    body: "Subjects and classes taught, boards (CBSE, ICSE, IB, Cambridge, state boards), B.Ed/M.Ed/CTET/TET/NET, exam and administrative duties, co-curricular work — fields generic builders don't have.",
  },
  {
    title: "AI that understands teaching",
    body: "Turns plain duties into impact bullets with real outcomes. It asks you for numbers when they're missing — it never invents an achievement.",
  },
  {
    title: "Tailor to any vacancy",
    body: "Paste a school's job advertisement and get a match score, concrete gaps to address, and suggestions for which of your existing experience to emphasise.",
  },
  {
    title: "Cover letters & teaching philosophy",
    body: "Generated strictly from what's already in your resume — never a fabricated school, year, or result.",
  },
  {
    title: "Indian-school ready",
    body: "English and Hindi content, an optional photo and personal-details block, and Fresher / Experienced / Senior-Leadership modes for HODs, Vice-Principals and Principals.",
  },
  {
    title: "Keep every version",
    body: "Duplicate, rename and compare resume versions side by side — one per application, without losing track.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-sm font-bold text-zinc-900">Teacher Resume Builder</span>
        <div className="flex gap-3">
          <Link href="/login" className="px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:text-zinc-900">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-24">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Resumes that speak the language of schools
        </h1>
        <p className="max-w-xl text-lg text-zinc-600">
          Built for PGT/TGT/PRT teachers, HODs and Principals — boards, subjects, B.Ed/CTET, and
          classroom impact, not generic office bullet points.
        </p>
        <div className="flex gap-4">
          <Link
            href="/signup"
            className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Get started — it&apos;s free
          </Link>
          <a
            href="#before-after"
            className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            See an example
          </a>
        </div>
      </section>

      {/* Before / after */}
      <section id="before-after" className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-2 text-center text-2xl font-bold text-zinc-900">
            From a plain duty to a real impact bullet
          </h2>
          <p className="mb-10 text-center text-sm text-zinc-500">
            The AI rewrites what you actually did — it asks for numbers you haven&apos;t given it
            rather than inventing them.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Before</p>
              <p className="text-zinc-700">&ldquo;Taught maths to class 8&rdquo;</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">After</p>
              <p className="text-zinc-800">
                &ldquo;Improved Class VIII board-prep test average score from 62% to 79% over one
                academic year through weekly remedial sessions.&rdquo;
              </p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-zinc-400">
            (That 62%&rarr;79% only appears because the teacher provided it — if it&apos;s missing,
            the AI asks for it instead of guessing.)
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold text-zinc-900">
          Everything a teacher&apos;s resume actually needs
        </h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title}>
              <h3 className="mb-1 font-semibold text-zinc-900">{f.title}</h3>
              <p className="text-sm text-zinc-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-10 text-center text-2xl font-bold text-zinc-900">Four templates, one form</h2>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {templates.map((t) => (
              <div key={t.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <div className="relative h-48 w-full overflow-hidden bg-zinc-100">
                  <Image
                    src={`/templates/${t.id}.png`}
                    alt={`${t.name} template preview`}
                    fill
                    className="object-cover object-top"
                    sizes="(min-width: 1024px) 25vw, 50vw"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-zinc-900">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.blurb}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto w-full max-w-4xl px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold text-zinc-900">Simple pricing</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 p-6">
            <p className="mb-1 text-lg font-bold text-zinc-900">Free</p>
            <p className="mb-4 text-sm text-zinc-500">Get started with no cost.</p>
            <ul className="mb-6 flex flex-col gap-2 text-sm text-zinc-700">
              <li>✓ All 4 templates</li>
              <li>✓ Unlimited resume versions</li>
              <li>✓ 5 AI bullet rewrites / month</li>
              <li>✓ 3 job-tailoring analyses / month</li>
              <li>✓ 1 watermark-free export</li>
            </ul>
            <Link
              href="/signup"
              className="block rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Start for free
            </Link>
          </div>
          <div className="rounded-lg border-2 border-zinc-900 p-6">
            <p className="mb-1 text-lg font-bold text-zinc-900">Pro</p>
            <p className="mb-4 text-sm text-zinc-500">For active job applications.</p>
            <ul className="mb-6 flex flex-col gap-2 text-sm text-zinc-700">
              <li>✓ Everything in Free</li>
              <li>✓ Unlimited AI rewrites</li>
              <li>✓ Unlimited job tailoring</li>
              <li>✓ Unlimited watermark-free exports</li>
              <li>✓ Priority support</li>
            </ul>
            <Link
              href="/signup"
              className="block rounded-md bg-zinc-900 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-100 py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-xs text-zinc-400">
          Teacher Resume Builder — built for schools, not offices.
        </div>
      </footer>
    </main>
  );
}
