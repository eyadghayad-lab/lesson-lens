
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header.tsx';
import LandingPage from './components/LandingPage.tsx';
import { LessonContent, LessonMode, QuizQuestion, FileAsset, SUPPORTED_LANGUAGES, Language } from './types.ts';
import * as gemini from './services/geminiService.ts';
import { translations } from './locales/translations.ts';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'app'>('landing');
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
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const t = translations[selectedLanguage.code] || translations.en;
  const isArabic = selectedLanguage.code.startsWith('ar');

  useEffect(() => {
    const baseName = isArabic ? 'بستطهالك' : 'LessonLens';
    document.title = `${baseName} | AI Study Companion`;

    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(checkStandalone);

    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(checkIOS);

    if (checkIOS && !checkStandalone) {
      setShowIOSGuide(true);
    }

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode, selectedLanguage]);

  const handleStartApp = () => {
    setView('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    
    if (mode !== 'visualize' && mode !== 'quiz') {
      setResult(null);
      setVisualResult(null);
      setQuizResult(null);
    } else if (mode === 'quiz') {
      setQuizResult(null);
    } else if (mode === 'visualize') {
      setVisualResult(null);
    }

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
          output = await gemini.generateQuiz(inputText, uploadedFiles, selectedLanguage.name);
          setQuizResult(output);
          break;
        case 'visualize':
          output = await gemini.visualizeConcept(inputText || result || "");
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

  const handleShare = async () => {
    if (!result) return;
    const shareText = `${isArabic ? 'بستطهالك' : 'LessonLens'} Summary (${selectedLanguage.nativeName}):\n\n${result}\n\nShared via ${isArabic ? 'بستطهالك' : 'LessonLens'}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: isArabic ? 'بستطهالك' : 'LessonLens Summary',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy();
    }
  };

  const handleStopSpeech = () => {
    if (activeSourceRef.current) {
      activeSourceRef.current.stop();
      activeSourceRef.current = null;
      setIsAudioPlaying(false);
    }
  };

  const handleSpeech = async (textToRead: string) => {
    if (isAudioPlaying) {
      handleStopSpeech();
      return;
    }

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
      source.onended = () => {
        setIsAudioPlaying(false);
        activeSourceRef.current = null;
      };
      activeSourceRef.current = source;
      setIsAudioPlaying(true);
      source.start();
    } catch (err) {
      console.error(err);
      alert("Audio generation failed.");
    } finally {
      setLoading(false);
    }
  };

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
        onGoHome={handleGoHome}
      />
      
      {view === 'landing' ? (
        <LandingPage onStart={handleStartApp} />
      ) : (
        <main className="max-w-4xl mx-auto px-4 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Dashboard UI... */}
          <section className="text-center mb-12">
             <h2 className="text-4xl font-black mb-4">{t.heroTitle} <span className="text-purple-600">{t.heroTitleHighlight}</span></h2>
             <p className="text-slate-500">{t.heroSub}</p>
          </section>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-purple-100 dark:border-purple-900/30 mb-8">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.textareaPlaceholder}
              className={`w-full h-40 bg-transparent resize-none border-none focus:ring-0 text-lg ${isArabic ? 'text-right' : ''}`}
            />
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t dark:border-slate-800">
              <label className="cursor-pointer px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl font-bold text-sm">
                {t.uploadBtn}
                <input type="file" className="hidden" multiple onChange={handleFileUpload} />
              </label>
              <div className="flex gap-2">
                <button onClick={() => processLesson('simplify')} className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold">{t.simplifyBtn}</button>
                <button onClick={() => processLesson('summarize')} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">{t.summarizeBtn}</button>
                <button onClick={() => processLesson('quiz')} className="px-6 py-2 bg-orange-600 text-white rounded-xl font-bold">{t.quizBtn}</button>
              </div>
            </div>
          </div>

          {loading && <div className="text-center py-12"><div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>}

          {result && !loading && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-purple-100 dark:border-purple-900/30 mb-8">
              <h3 className="text-2xl font-bold mb-6">{t.yourExplanation}</h3>
              <div className="whitespace-pre-wrap">{result}</div>
            </div>
          )}
        </main>
      )}

      <footer className="py-12 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} {isArabic ? 'بستطهالك' : 'LessonLens'}. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
