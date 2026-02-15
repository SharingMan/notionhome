import { ArrowRight, Calendar, RefreshCcw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { detectLocaleFromHeaders, getMessages } from '@/lib/i18n';

export default async function Home() {
  const locale = detectLocaleFromHeaders(await headers());
  const t = getMessages(locale).home;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl space-y-16 text-center">

          {/* Hero Section */}
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs font-medium text-gray-300 mb-4">
              <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
              {t.badge}
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 pb-2">
              {t.titleMain} <br className="hidden md:block" />
              <span className="italic font-serif font-light text-white">{t.titleAccent}</span>
            </h1>

            <p className="max-w-xl mx-auto text-lg md:text-xl text-gray-400 leading-relaxed">
              {t.subtitle}
            </p>

            <div className="pt-4 flex items-center justify-center gap-4">
              <Link
                href="/api/auth/notion"
                className="group relative inline-flex items-center justify-center px-8 py-3 text-sm font-semibold text-black transition-all duration-200 bg-white rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
              >
                {t.connect}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link href="/my" className="px-6 py-3 text-sm font-medium text-gray-300 border border-white/20 rounded-full hover:text-white hover:border-white/40 transition-colors">
                {t.mySubscriptions}
              </Link>

              <a href="https://github.com/yourusername/notion-calendar-sync" target="_blank" rel="noopener noreferrer" className="px-6 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                {t.github}
              </a>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 border-t border-white/10">
            {[
              { icon: <Calendar className="h-6 w-6" />, ...t.features[0] },
              { icon: <RefreshCcw className="h-6 w-6" />, ...t.features[1] },
              { icon: <ShieldCheck className="h-6 w-6" />, ...t.features[2] },
            ].map((feature, idx) => (
              <div key={idx} className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm text-left">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-800 to-black flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <div className="text-white">{feature.icon}</div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 border-t border-white/10 text-center text-sm text-gray-600">
        <p>&copy; {new Date().getFullYear()} {t.footer}</p>
      </footer>
    </div>
  );
}
