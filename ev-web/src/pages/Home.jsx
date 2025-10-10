// src/pages/Home.jsx
import SiteNav from "../components/SiteNav";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <SiteNav />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-10 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            EV Charging, <span className="text-blue-600">made simple.</span>
          </h1>
          <p className="mt-4 text-slate-600 text-lg">
            Find nearby stations, reserve a time slot, and get charging quickly.
            Backoffice and Operators manage everything in one place.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-medium"
            >
              Get started
            </Link>
            <a
              href="#features"
              className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium"
            >
              Learn more
            </a>
          </div>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
            <Stat number="2k+" label="Active Owners" />
            <Stat number="120" label="Stations" />
            <Stat number="9.2/10" label="Satisfaction" />
          </div>
        </div>

        {/* Illustration */}
        <div className="relative">
          <div className="absolute -inset-4 -z-10 blur-2xl bg-blue-100 rounded-3xl"></div>
            <div className="rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-[color:var(--evcs-a)] to-[color:var(--evcs-b)] p-6 flex items-center justify-center" style={{height: '320px'}}>
              <svg viewBox="0 0 600 320" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="g1" x1="0" x2="1">
                    <stop offset="0%" stopColor="var(--evcs-a)" />
                    <stop offset="100%" stopColor="var(--evcs-b)" />
                  </linearGradient>
                  <filter id="f1" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="12" stdDeviation="18" floodColor="#000" floodOpacity="0.18" />
                  </filter>
                </defs>
                <rect x="0" y="0" width="600" height="320" rx="20" fill="url(#g1)" />
                <g transform="translate(60,40) scale(0.9)" filter="url(#f1)">
                  <path d="M20 180 C60 120, 140 100, 220 120 C300 140, 400 120, 520 80 L540 200 L20 200 Z" fill="rgba(255,255,255,0.06)" />
                  <g transform="translate(40,10)">
                    <rect x="0" y="30" rx="18" ry="18" width="320" height="120" fill="#ffffff" opacity="0.06" />
                    <circle cx="380" cy="90" r="36" fill="#ffffff" opacity="0.08" />
                    <g transform="translate(20,50)">
                      <rect x="0" y="0" width="220" height="60" rx="10" fill="#fff" opacity="0.12" />
                      <rect x="12" y="12" width="80" height="36" rx="8" fill="var(--evcs-d)" />
                      <rect x="104" y="12" width="96" height="36" rx="8" fill="var(--evcs-c)" opacity="0.95" />
                    </g>
                  </g>
                </g>
              </svg>
              <div className="absolute left-6 bottom-6">
                <div className="px-4 py-3 rounded-xl accent-evcs-green shadow-lg inline-flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg grid place-items-center bg-white/10">⚡</div>
                  <div>
                    <div className="text-sm text-white/95 font-semibold">Instant reservations</div>
                    <div className="text-xs text-white/75">Reserve a slot in seconds</div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold">Everything you need</h2>
        <p className="text-slate-600 mt-1">
          Role-based access, easy reservations, and seamless operations.
        </p>

        <div className="mt-8 grid md:grid-cols-3 gap-5">
          <Feature
            title="Role-based access"
            desc="Backoffice & Station Operator workflows with secure login."
          />
          <Feature
            title="Smart bookings"
            desc="Reserve within 7 days, update/cancel ≥ 12h beforehand."
          />
          <Feature
            title="Station management"
            desc="AC/DC stations, slots, schedules & deactivation rules."
          />
        </div>

        <div className="mt-10">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            Start now
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-slate-500">
        © {new Date().getFullYear()} EVCS. All rights reserved.
      </footer>
    </div>
  );
}

function Stat({ number, label }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-2xl font-bold">{number}</div>
      <div className="text-slate-500 text-sm">{label}</div>
    </div>
  );
}

function Card({ label }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 grid place-items-center">
      <div className="h-14 w-14 rounded-xl bg-slate-100 grid place-items-center text-slate-400">
        ⚡
      </div>
      <div className="mt-2 text-sm font-medium">{label}</div>
    </div>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
        ✓
      </div>
      <div className="mt-3 font-semibold">{title}</div>
      <div className="text-slate-600 text-sm mt-1">{desc}</div>
    </div>
  );
}
