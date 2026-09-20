import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Copy, BarChart3, MapPin, ShieldCheck, Camera, Users, Zap, CheckCircle2, Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5 },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const goReport = () => navigate(user ? '/report' : '/login?next=/report');

  return (
    <div className="-m-4 sm:-m-6 sm:-my-8">
      {/* HERO */}
      <section className="relative overflow-hidden bg-emerald-950">
        <img
          src="/images/hero-city.jpg"
          alt="City aerial"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/70 via-emerald-950/85 to-emerald-950" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:pb-24 lg:pt-20">
          <div>
            <motion.div {...fadeUp} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-amber-300 ring-1 ring-white/20 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> PS-18 · Intelligent Grievance Triage
            </motion.div>
            <motion.h1 {...fadeUp} className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Report once.
              <br />
              <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">AI fixes it</span>
              <br />
              with the city.
            </motion.h1>
            <motion.p {...fadeUp} className="mt-5 max-w-xl text-base leading-relaxed text-emerald-100/85 sm:text-lg">
              CivicFix turns raw citizen complaints into categorized, prioritized, deduplicated
              civic issues — routed to the right department, tracked transparently, and resolved
              with photo evidence.
            </motion.p>
            <motion.div {...fadeUp} className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={goReport}
                className="group inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-6 py-3.5 text-sm font-extrabold text-emerald-950 shadow-xl shadow-amber-900/30 transition hover:bg-amber-300"
              >
                Report an Issue
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => navigate('/city-map')}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                <MapPin className="h-4 w-4" /> Explore City Map
              </button>
            </motion.div>
            <motion.div {...fadeUp} className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {[
                ['~40%', 'Duplicate noise removed'],
                ['9', 'AI categories'],
                ['72h', 'SLA target'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15 backdrop-blur">
                  <p className="text-2xl font-black text-white">{v}</p>
                  <p className="mt-0.5 text-[11px] font-semibold leading-snug text-emerald-100/70">{l}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Live triage mock */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-3xl border border-white/15 bg-white/95 p-5 shadow-2xl backdrop-blur sm:p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Live AI triage</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-800">
                <Sparkles className="h-3 w-3" /> Gemini AI
              </span>
            </div>
            <p className="mt-3 rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">
              “Huge pothole near City Market signal, two bikers fell yesterday. Water logging makes it worse.”
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Roads', 'Severity 4/5', 'Safety Risk', 'High sensitivity'].map((t) => (
                <span key={t} className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">{t}</span>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-white">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-300">Priority score</p>
                <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-extrabold">HIGH · 74</span>
              </div>
              <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '74%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                />
              </div>
              <p className="mt-2.5 text-[11px] leading-relaxed text-slate-300">
                3 linked duplicate reports · ~700 people affected · Roads &amp; Transport Department
              </p>
            </div>
            <button
              onClick={goReport}
              className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              Try it with your own complaint →
            </button>
          </motion.div>
        </div>
        <div className="relative border-t border-white/10 bg-emerald-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-emerald-200/60 sm:px-6">
            <span>Roads</span><span>Garbage</span><span>Water</span><span>Drainage</span><span>Streetlight</span><span>Public Safety</span><span>Infrastructure</span><span>Sanitation</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <motion.div {...fadeUp} className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-emerald-600">How it works</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              From complaint to closure, fully accountable
            </h2>
          </motion.div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Camera, t: '1. Citizen reports', d: 'Photo, GPS pin and description in under a minute — from any phone.', c: 'bg-sky-100 text-sky-700' },
              { icon: Sparkles, t: '2. AI triages', d: 'Gemini classifies category, severity, department and an explainable priority score.', c: 'bg-violet-100 text-violet-700' },
              { icon: Copy, t: '3. AI deduplicates', d: 'Text + GPS + category matching links repeat reports to one Civic Issue. Nothing is deleted.', c: 'bg-amber-100 text-amber-700' },
              { icon: ShieldCheck, t: '4. Officers resolve', d: 'Prioritized queue, assignments, field notes and before/after photo evidence.', c: 'bg-emerald-100 text-emerald-700' },
            ].map((s) => (
              <motion.div key={s.t} {...fadeUp} className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6 transition hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-lg">
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${s.c}`}>
                  <s.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DEDUP DEMO STRIP */}
      <section className="bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-16">
          <motion.div {...fadeUp}>
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-amber-300">Deduplication in action</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              4 complaints. 1 pothole. 1 Civic Issue.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              Four citizens report the same crater near the bus stand — in different words, from
              slightly different GPS pins. CivicFix links all four to a single HIGH-priority issue,
              assigns one officer, and resolves it once — with before/after evidence visible to every reporter.
            </p>
            <button
              onClick={() => navigate('/city-map')}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-slate-100"
            >
              See it on the live map <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
          <motion.div {...fadeUp} className="grid grid-cols-2 gap-3">
            {[
              ['C-101', '“Big pothole near bus stand”', '92%'],
              ['C-102', '“Road caved in, bikes skidding”', '88%'],
              ['C-103', '“Crater on main road, dangerous”', '85%'],
              ['C-104', '“Pothole full of rainwater”', '81%'],
            ].map(([id, text, m]) => (
              <div key={id} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-amber-300">{id}</span>
                  <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] font-extrabold text-emerald-300">{m} match</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/90">{text}</p>
              </div>
            ))}
            <div className="col-span-2 flex items-center justify-between rounded-2xl bg-amber-400 p-4">
              <p className="text-sm font-extrabold text-emerald-950">→ Civic Issue #POTHOLE-01 · HIGH · Roads &amp; Transport</p>
              <Zap className="h-5 w-5 text-emerald-900" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <motion.div {...fadeUp} className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-emerald-600">Built for accountability</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Everything a modern city needs</h2>
          </motion.div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: Zap, t: 'Explainable priority scores', d: 'Every score breaks down into severity, duplicates, affected people, safety risk, location sensitivity and age. No black boxes.' },
              { icon: Users, t: 'Citizen verification loop', d: 'Resolved issues stay open until reporting citizens confirm the fix with a rating. Reopen in one tap if it regresses.' },
              { icon: BarChart3, t: 'Officer analytics', d: 'SLA compliance by department, resolution turnaround, category volumes, duplicate savings and geographic hotspots.' },
              { icon: MapPin, t: 'Live city map', d: 'Every open issue pinned on OpenStreetMap with category, priority and status filters for citizens and officers.' },
              { icon: Camera, t: 'Before/after evidence', d: 'Photo evidence is mandatory at report and resolution time — creating a visual audit trail for every fix.' },
              { icon: ShieldCheck, t: 'Role-based security', d: 'Supabase Auth, officer access codes, row-level security and a full audit log on every status change.' },
            ].map((f) => (
              <motion.div key={f.t} {...fadeUp} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">{f.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <motion.div {...fadeUp} className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-emerald-600">Loved by citizens &amp; officers</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Trust, measured in fixed streets</h2>
          </motion.div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { n: 'Meera K.', r: 'Resident, Ward 12', q: 'I reported a leaking water main at 9am. By evening it was assigned, and I watched the before/after photos land in my tracker. First time I have trusted a complaint portal.' },
              { n: 'R. Sharma', r: 'Executive Engineer, Roads', q: 'The duplicate clustering alone saves my team hours every week. Instead of 40 scattered pothole tickets, we get 9 prioritized issues with evidence attached.' },
              { n: 'Arjun P.', r: 'Shop owner, City Market', q: 'The priority explanation is brilliant — I could see exactly why our dark street jumped the queue. The streetlights were fixed within two days.' },
            ].map((t) => (
              <motion.figure key={t.n} {...fadeUp} className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
                <Quote className="h-6 w-6 text-emerald-500" />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">“{t.q}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-extrabold text-white">{t.n[0]}</span>
                  <span>
                    <span className="block text-sm font-bold text-slate-800">{t.n}</span>
                    <span className="block text-xs text-slate-400">{t.r}</span>
                  </span>
                  <span className="ml-auto flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-950">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
          <motion.div {...fadeUp}>
            <CheckCircle2 className="mx-auto h-10 w-10 text-amber-400" />
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Your street. Your voice. Fixed faster with AI.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-emerald-100/75 sm:text-base">
              Join thousands of citizens already reporting through CivicFix. Officers get clarity, citizens get accountability.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button onClick={goReport} className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-7 py-3.5 text-sm font-extrabold text-emerald-950 shadow-xl transition hover:bg-amber-300">
                Report your first issue <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => navigate(user && profile?.role !== 'citizen' ? '/officer' : '/officer/login')} className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/20">
                <ShieldCheck className="h-4 w-4" /> Officer Command Center
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
