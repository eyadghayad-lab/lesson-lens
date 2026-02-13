
import React from 'react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen selection:bg-purple-100 selection:text-purple-900">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-black uppercase tracking-widest animate-pulse">
            New: Video Analysis Support
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[1.1] tracking-tight text-slate-900 dark:text-white">
            Understand Anything <br/> 
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600">In Seconds.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The all-in-one AI study companion. Upload notes, PDFs, or even videos of lectures to get instant summaries, simplifications, and quizzes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onStart}
              className="w-full sm:w-auto px-10 py-4 bg-purple-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all"
            >
              Get Started for Free
            </button>
            <a href="#features" className="w-full sm:w-auto px-10 py-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-lg hover:bg-white dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800">
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* Floating Assets Preview */}
      <div className="relative max-w-5xl mx-auto px-6 mb-32 h-[300px] md:h-[400px]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl h-full rounded-[40px] shadow-2xl overflow-hidden border-2 border-white/50 dark:border-white/5">
           <div className="p-8 flex flex-col items-center justify-center h-full opacity-40">
              <svg className="w-24 h-24 text-purple-200" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
              <div className="mt-4 w-48 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              <div className="mt-2 w-32 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
           </div>
        </div>
        {/* Floating Cards */}
        <div className="absolute top-10 -left-4 md:left-20 w-48 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-xl animate-float border border-white/50 dark:border-slate-700/50" style={{ animationDelay: '1s' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Simplify</span>
          </div>
          <div className="h-2 w-full bg-purple-100 dark:bg-purple-900/30 rounded mb-1"></div>
          <div className="h-2 w-2/3 bg-purple-100 dark:bg-purple-900/30 rounded"></div>
        </div>
        <div className="absolute bottom-10 -right-4 md:right-20 w-56 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-xl animate-float border border-white/50 dark:border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Generate Quiz</span>
          </div>
          <div className="space-y-2">
            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="h-1 w-3/4 bg-slate-100 dark:bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Study Power-ups</h2>
            <p className="text-slate-500">Everything you need to master your material.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group p-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[32px] hover:shadow-2xl hover:shadow-purple-500/10 transition-all border border-slate-200 dark:border-slate-800">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/40 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Instant Simplify</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Turns high-level academic jargon into language that actually makes sense. Perfect for complex science and law topics.</p>
            </div>
            <div className="group p-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[32px] hover:shadow-2xl hover:shadow-indigo-500/10 transition-all border border-slate-200 dark:border-slate-800">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">PDF & Video Summaries</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Don't have time for a 1-hour lecture? Upload the video and get a 2-minute bulleted breakdown of the key concepts.</p>
            </div>
            <div className="group p-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[32px] hover:shadow-2xl hover:shadow-orange-500/10 transition-all border border-slate-200 dark:border-slate-800">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/40 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">AI Quizzes</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Automatically generates multiple-choice questions based on your material to help you test your recall before the real exam.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Language Section */}
      <section id="languages" className="py-20 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-4xl font-black mb-6 leading-tight">Truly Global. <br/><span className="text-purple-600">Locally Relevant.</span></h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">We believe education should be accessible in the language you speak at home. Our AI supports impeccable Modern Standard Arabic and regional dialects like Egyptian and Syrian.</p>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl font-bold text-center border-purple-500/20 border">العربية الفصحى</div>
               <div className="p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl font-bold text-center border border-slate-200 dark:border-slate-800">العامية المصرية</div>
               <div className="p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl font-bold text-center border border-slate-200 dark:border-slate-800">العامية السورية</div>
               <div className="p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl font-bold text-center border border-slate-200 dark:border-slate-800">English & More</div>
            </div>
          </div>
          <div className="flex-1 w-full">
             <div className="aspect-square bg-white/30 dark:bg-slate-900/30 backdrop-blur-md rounded-[40px] shadow-inner p-12 flex items-center justify-center relative">
                <div className="w-full h-full border-4 border-dashed border-purple-200 dark:border-purple-800 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-0 flex items-center justify-center text-6xl">🌍</div>
             </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-3xl mx-auto bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-16 rounded-[48px] shadow-2xl relative overflow-hidden border border-white/50 dark:border-slate-800">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
          <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">Ready to ace your next exam?</h2>
          <button 
            onClick={onStart}
            className="inline-block px-12 py-5 bg-purple-600 text-white rounded-2xl font-black text-xl shadow-2xl shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all"
          >
            Start Studying Now
          </button>
          <p className="mt-8 text-sm text-slate-400">No account required. Privacy-first AI tutor.</p>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
