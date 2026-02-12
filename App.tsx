
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import { LessonContent, LessonMode, QuizQuestion, FileAsset, SUPPORTED_LANGUAGES, Language } from './types';
import * as gemini from './services/geminiService';
import { translations } from './locales/translations';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<FileAsset[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [visualResult, setVisualResult] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<QuizQuestion[] | null>(null);
  const [history, setHistory] = useState<LessonContent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const t = translations[selectedLanguage.code] || translations.en;

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (e.shiftKey) {
          processLesson('summarize');
        } else {
          processLesson('simplify');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputText, uploadedFiles, selectedLanguage]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: FileAsset[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'text/plain') {
        const text = await file.text();
        setInputText(prev => prev + (prev ? '\n\n' : '') + text);
      } else {
        const reader = new FileReader();
        const asset = await new Promise<FileAsset>((resolve) => {
          reader.onloadend = () => {
            resolve({
              data: reader.result as string,
              mimeType: file.type || 'application/octet-stream',
              name: file.name
            });
          };
          reader.readAsDataURL(file);
        });
        newFiles.push(asset);
      }
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processLesson = async (mode: LessonMode) => {
    if (!inputText && uploadedFiles.length === 0) return;
    setLoading(true);
    setResult(null);
    setVisualResult(null);
    setQuizResult(null);

    try {
      let output: any = null;
      switch (mode) {
        case 'simplify':
          output = await gemini.simplifyLesson(inputText, uploadedFiles, selectedLanguage.name);
          setResult(output);
          break;
        case 'summarize':
          output = await gemini.summarizeLesson(inputText, uploadedFiles, selectedLanguage.name);
          setResult(output);
          break;
        case 'quiz':
          output = await gemini.generateQuiz(inputText, selectedLanguage.name);
          setQuizResult(output);
          break;
        case 'visualize':
          output = await gemini.visualizeConcept(inputText);
          setVisualResult(output);
          break;
      }
      
      const newEntry: LessonContent = {
        id: Date.now().toString(),
        originalText: inputText,
        files: [...uploadedFiles],
        result: typeof output === 'string' ? output : undefined,
        mode,
        languageCode: selectedLanguage.code,
        timestamp: Date.now(),
      };
      setHistory([newEntry, ...history]);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 2000);
    }
  };

  const handleSpeech = async (textToRead: string) => {
    setLoading(true);
    try {
      const base64 = await gemini.textToSpeech(textToRead, selectedLanguage.name);
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.error(err);
      alert("Audio generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const isArabic = selectedLanguage.code.startsWith('ar');

  const filteredHistory = history.filter(item => {
    const query = searchQuery.toLowerCase();
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === item.languageCode);
    return (
      item.originalText.toLowerCase().includes(query) ||
      (lang?.name.toLowerCase().includes(query)) ||
      (lang?.nativeName.toLowerCase().includes(query))
    );
  });

  return (
    <div className={`min-h-screen ${isArabic ? 'font-arabic' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        selectedLanguage={selectedLanguage} 
        setSelectedLanguage={setSelectedLanguage} 
      />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Toast Notification */}
        {showCopyFeedback && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 font-bold flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {t.copied}
          </div>
        )}

        <section className="text-center mb-12 animate-float">
          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-slate-900 dark:text-white leading-tight">
            {t.heroTitle} <span className="text-purple-600 dark:text-purple-400">{t.heroTitleHighlight}</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto font-medium">
            {t.heroSub}
          </p>
        </section>

        <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-6 shadow-2xl shadow-purple-500/5 border border-purple-100 dark:border-purple-900/30 mb-12 group focus-within:ring-2 focus-within:ring-purple-500/50 transition-all">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.textareaPlaceholder}
            className={`w-full h-40 bg-transparent resize-none border-none focus:ring-0 text-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 ${isArabic ? 'text-right' : ''}`}
          />

          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-purple-50 dark:border-purple-900/20">
            <div className="flex gap-2">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 transition-all font-bold text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {t.uploadBtn}
                <input type="file" className="hidden" multiple accept="image/*,application/pdf,text/plain" onChange={handleFileUpload} />
              </label>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => processLesson('simplify')}
                disabled={loading || (inputText.trim() === '' && uploadedFiles.length === 0)}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-sm"
              >
                {t.simplifyBtn}
              </button>
              <button 
                onClick={() => processLesson('summarize')}
                disabled={loading || (inputText.trim() === '' && uploadedFiles.length === 0)}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-sm"
              >
                {t.summarizeBtn}
              </button>
            </div>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="relative group/file rounded-xl border border-purple-100 dark:border-purple-900/30 overflow-hidden bg-slate-50 dark:bg-slate-800/50 p-2">
                  {file.mimeType.startsWith('image/') ? (
                    <img src={file.data} alt={file.name} className="h-20 w-full object-cover rounded-lg" />
                  ) : (
                    <div className="h-20 w-full flex flex-col items-center justify-center gap-1 text-purple-600 dark:text-purple-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      <span className="text-[10px] font-bold uppercase">{file.name.split('.').pop()}</span>
                    </div>
                  )}
                  <div className="mt-1 text-[10px] font-medium truncate px-1 text-slate-500 dark:text-slate-400">{file.name}</div>
                  <button 
                    onClick={() => removeFile(idx)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-file-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-purple-600 font-bold animate-pulse">{t.thinking} ({selectedLanguage.nativeName})</p>
          </div>
        )}

        {result && !loading && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-purple-100 dark:border-purple-900/30 animate-in fade-in slide-in-from-bottom-4 duration-500 relative group/result">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold">{t.yourExplanation}</h3>
              <div className="flex gap-2">
                <button 
                  onClick={handleCopy}
                  className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"
                  title={t.copyBtn}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
                <button 
                  onClick={() => handleSpeech(result)}
                  className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl hover:bg-purple-100 transition-all"
                  title="Listen"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                </button>
                <button 
                  onClick={() => processLesson('visualize')}
                  className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl hover:bg-indigo-100 transition-all"
                  title="Visualize"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </button>
                <button 
                  onClick={() => processLesson('quiz')}
                  className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl hover:bg-orange-100 transition-all"
                  title="Quiz"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
              </div>
            </div>
            <div className={`prose dark:prose-invert prose-purple max-w-none text-lg leading-relaxed whitespace-pre-wrap ${isArabic ? 'text-right' : ''}`}>
              {result}
            </div>
          </div>
        )}

        {visualResult && !loading && (
          <div className="mt-8 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-purple-100 dark:border-purple-900/30">
            <h3 className="text-2xl font-bold mb-6">{t.conceptVisual}</h3>
            <img src={visualResult} alt="Visualization" className="w-full rounded-2xl shadow-2xl" />
          </div>
        )}

        {quizResult && !loading && (
          <div className="mt-8 space-y-4">
            <h3 className="text-2xl font-bold mb-6">{t.quizTitle}</h3>
            {quizResult.map((q, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-purple-100 dark:border-purple-900/30 hover:border-purple-400 transition-colors">
                <p className={`text-lg font-bold mb-4 ${isArabic ? 'text-right' : ''}`}>{idx + 1}. {q.question}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, oIdx) => (
                    <button 
                      key={oIdx}
                      onClick={() => alert(oIdx === q.correctAnswer ? t.correct : t.incorrect)}
                      className={`text-left p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all font-medium ${isArabic ? 'text-right' : ''}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <section className="mt-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-2">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">{t.recentlySimplified}</h4>
              
              <div className="relative w-full md:w-64">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/30 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all shadow-sm"
                />
                <svg className={`w-4 h-4 absolute ${isArabic ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHistory.length > 0 ? (
                filteredHistory.map(item => (
                  <div key={item.id} className="group p-4 rounded-2xl bg-white/50 dark:bg-slate-900/30 border border-transparent hover:border-purple-200 dark:hover:border-purple-900 transition-all cursor-pointer" onClick={() => {
                    setResult(item.result || null);
                    setInputText(item.originalText);
                    setUploadedFiles(item.files || []);
                    const foundLang = SUPPORTED_LANGUAGES.find(l => l.code === item.languageCode);
                    if (foundLang) setSelectedLanguage(foundLang);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs">
                        {SUPPORTED_LANGUAGES.find(l => l.code === item.languageCode)?.flag || '🌍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold truncate ${isArabic ? 'text-right' : ''}`}>{item.originalText.substring(0, 40) || 'Document'}...</p>
                        <p className={`text-xs text-slate-400 ${isArabic ? 'text-right' : ''}`}>{new Date(item.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400 font-medium">{t.noHistory}</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="py-12 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} LessonLens. All rights reserved.</p>
        <p className="font-bold mt-1">{t.footerNote}</p>
      </footer>
    </div>
  );
};

export default App;
