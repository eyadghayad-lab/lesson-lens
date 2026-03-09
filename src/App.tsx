
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import { LessonContent, LessonMode, QuizQuestion, FileAsset, SUPPORTED_LANGUAGES, Language } from './types';
import * as ai from './services/aiService';
import { translations } from './locales/translations';

const COUNTRIES = [
  'Egypt', 'USA', 'UK', 'France', 'Germany', 'Syria', 'Saudi Arabia', 'UAE', 'Jordan', 'Lebanon', 'Morocco', 'Tunisia', 'Algeria', 'Iraq', 'Kuwait', 'Qatar', 'Oman', 'Bahrain', 'Palestine', 'Libya', 'Sudan', 'Yemen', 'Italy', 'Spain', 'Portugal', 'Brazil', 'Canada', 'Australia', 'India', 'Pakistan', 'Iran'
];

const GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'Preparatory 1', 'Preparatory 2', 'Preparatory 3',
  'Secondary 1', 'Secondary 2', 'Secondary 3'
];

const App: React.FC = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      return false;
    }
  });
  const [inputText, setInputText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<FileAsset[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [visualResult, setVisualResult] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<QuizQuestion[] | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [history, setHistory] = useState<LessonContent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState<'study' | 'library' | 'history'>('study');
  const [curriculumBooks, setCurriculumBooks] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('Egypt');
  const [selectedGrade, setSelectedGrade] = useState('Grade 10');
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [chapterContent, setChapterContent] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const chapterRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const t = translations[selectedLanguage.code] || translations.en;
  const isRTL = selectedLanguage.code.startsWith('ar') || selectedLanguage.code === 'fa';
  const isArabic = selectedLanguage.code.startsWith('ar');

  useEffect(() => {
    const baseName = isRTL ? (isArabic ? 'بستطهالك' : 'LessonLens') : 'LessonLens';
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
      document.body.classList.add('dark');
      if (Capacitor.isNativePlatform()) {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: '#07050a' });
      }
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      if (Capacitor.isNativePlatform()) {
        StatusBar.setStyle({ style: Style.Light });
        StatusBar.setBackgroundColor({ color: '#fdfaff' });
      }
    }
    try {
      localStorage.setItem('darkMode', darkMode.toString());
    } catch (e) {}
  }, [darkMode, selectedLanguage]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide();
    }
  }, []);

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

  useEffect(() => {
    if (quizResult && currentQuizIndex < quizResult.length) {
      setSelectedQuizAnswer(userAnswers[currentQuizIndex]);
    }
  }, [currentQuizIndex, quizResult, userAnswers]);

  useEffect(() => {
    if (quizResult && currentLessonId) {
      const isCompleted = currentQuizIndex === quizResult.length;
      const score = isCompleted ? userAnswers.reduce((acc, ans, idx) => {
        return acc + (ans === quizResult[idx].correctAnswer ? 1 : 0);
      }, 0) : undefined;

      setHistory(prev => prev.map(item => 
        item.id === currentLessonId 
          ? { ...item, quizScore: score !== undefined ? score : item.quizScore, userAnswers: [...userAnswers] } 
          : item
      ));
    }
  }, [userAnswers, currentQuizIndex, quizResult, currentLessonId]);

  const handleStartApp = () => {
    setActiveTab('study');
    navigate('/app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShowHistory = () => {
    setActiveTab('history');
    navigate('/app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setResult(null);
    setQuizResult(null);
    setVisualResult(null);
    setInputText('');
    setUploadedFiles([]);
    setCurrentLessonId(null);
    setActiveTab('study');
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFetchCurriculum = async () => {
    setLoading(true);
    try {
      const books = await ai.fetchCurriculum(selectedCountry, selectedGrade, selectedLanguage.name);
      setCurriculumBooks(books);
      setSelectedBook(null);
      setSelectedChapter(null);
      setChapterContent(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReadChapter = async (book: any, chapter: string) => {
    setLoading(true);
    try {
      const content = await ai.fetchChapterContent(book.bookTitle, chapter, selectedLanguage.name);
      setChapterContent(content);
      setSelectedChapter(chapter);
      setSelectedBook(book);
      // Automatically load into input for further processing if user wants
      setInputText(content);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      setCurrentQuizIndex(0);
      setSelectedQuizAnswer(null);
      setUserAnswers([]);
      setCurrentLessonId(null);
    } else if (mode === 'visualize') {
      setVisualResult(null);
    }

    try {
      let output: any = null;
      switch (mode) {
        case 'simplify':
          output = await ai.simplifyLesson(inputText, uploadedFiles, selectedLanguage.name);
          setResult(output);
          break;
        case 'summarize':
          output = await ai.summarizeLesson(inputText, uploadedFiles, selectedLanguage.name);
          setResult(output);
          break;
        case 'quiz':
          output = await ai.generateQuiz(inputText, uploadedFiles, selectedLanguage.name);
          setQuizResult(output);
          setUserAnswers(new Array(output.length).fill(null));
          break;
        case 'visualize':
          output = await ai.visualizeConcept(inputText || result || "the uploaded document");
          setVisualResult(output);
          break;
      }
      
      const newEntry: LessonContent = {
        id: Date.now().toString(),
        originalText: inputText,
        files: [...uploadedFiles],
        result: mode === 'simplify' || mode === 'summarize' ? output : undefined,
        visualUrl: mode === 'visualize' ? output : undefined,
        quizResult: mode === 'quiz' ? output : undefined,
        mode,
        languageCode: selectedLanguage.code,
        timestamp: Date.now(),
      };
      setCurrentLessonId(newEntry.id);
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
    const appName = isArabic ? 'بستطهالك' : 'LessonLens';
    const shareText = `${appName} Summary (${selectedLanguage.nativeName}):\n\n${result}\n\nShared via ${appName}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${appName} Summary`,
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

  const handleDownloadPDF = async (elementRef: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!elementRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(elementRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: darkMode ? '#0f172a' : '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFullBook = async (book: any) => {
    setLoading(true);
    try {
      const allChaptersContent = await Promise.all(
        book.chapters.map((ch: string) => ai.fetchChapterContent(book.bookTitle, ch, selectedLanguage.name))
      );
      
      const bookContainer = document.createElement('div');
      bookContainer.style.padding = '40px';
      bookContainer.style.width = '800px';
      bookContainer.style.backgroundColor = darkMode ? '#0f172a' : '#ffffff';
      bookContainer.style.color = darkMode ? '#ffffff' : '#000000';
      bookContainer.style.fontFamily = 'sans-serif';
      bookContainer.style.position = 'absolute';
      bookContainer.style.left = '-9999px';
      
      bookContainer.innerHTML = `
        <h1 style="font-size: 32px; font-weight: 900; margin-bottom: 10px;">${book.bookTitle}</h1>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 40px;">${book.subject} - ${selectedGrade} (${selectedCountry})</p>
        ${book.chapters.map((ch: string, i: number) => `
          <div style="margin-bottom: 40px; border-top: 1px solid #e2e8f0; padding-top: 40px;">
            <h2 style="font-size: 24px; font-weight: 800; color: #7c3aed; margin-bottom: 20px;">${ch}</h2>
            <div style="line-height: 1.6; white-space: pre-wrap; font-size: 16px;">${allChaptersContent[i]}</div>
          </div>
        `).join('')}
      `;
      
      document.body.appendChild(bookContainer);
      const canvas = await html2canvas(bookContainer, { 
        scale: 1.5,
        useCORS: true,
        backgroundColor: darkMode ? '#0f172a' : '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${book.bookTitle}.pdf`);
      document.body.removeChild(bookContainer);
    } catch (error) {
      console.error('Full book PDF generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeech = async (textToRead: string) => {
    if (isAudioPlaying) {
      handleStopSpeech();
      return;
    }

    setLoading(true);
    try {
      const base64 = await ai.textToSpeech(textToRead, selectedLanguage.name);
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

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLanguage.code;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInputText(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleQuizAnswer = (answerIdx: number) => {
    if (selectedQuizAnswer !== null || !quizResult) return;
    
    setSelectedQuizAnswer(answerIdx);
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuizIndex] = answerIdx;
    setUserAnswers(newUserAnswers);
  };

  const addMoreQuestions = async () => {
    if (!quizResult) return;
    setLoading(true);
    try {
      const moreQuestions = await ai.generateQuiz(inputText, uploadedFiles, selectedLanguage.name, quizResult);
      const updatedQuiz = [...quizResult, ...moreQuestions];
      setQuizResult(updatedQuiz);
      setUserAnswers(prev => [...prev, ...new Array(moreQuestions.length).fill(null)]);
      
      // Update history
      if (currentLessonId) {
        setHistory(prev => prev.map(item => 
          item.id === currentLessonId 
            ? { ...item, quizResult: updatedQuiz } 
            : item
        ));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add more questions.");
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
    <div className={`min-h-screen ${isRTL ? (isArabic ? 'font-arabic' : 'font-sans') : ''} bg-app-bg text-app-text transition-colors duration-300`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        selectedLanguage={selectedLanguage} 
        setSelectedLanguage={setSelectedLanguage}
        onGoHome={handleGoHome}
      />
      
      <Routes>
        <Route path="/" element={<LandingPage onStart={handleStartApp} onShowLeaderboard={handleShowHistory} selectedLanguage={selectedLanguage} />} />
        <Route path="/app" element={
          <main className="max-w-4xl mx-auto px-4 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* iOS Install Guide */}
          {showIOSGuide && (
            <div className="mb-6 p-4 bg-white dark:bg-slate-900 border-2 border-purple-500 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-xl">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2-2v14a2 2 0 002 2z" /></svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">{t.iosInstallTitle}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.iosInstallDesc}</p>
                </div>
                <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          )}

          {!isStandalone && !isIOS && (
            <div className="mb-8 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="bg-white/20 p-2 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold">{t.installBannerTitle}</p>
                  <p className="text-xs text-purple-100">{t.installBannerDesc}</p>
                </div>
                <div className="shrink-0 p-2 bg-white/20 rounded-xl">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </div>
              </div>
            </div>
          )}

          {showCopyFeedback && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {t.copied}
            </div>
          )}

          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl mb-8 w-fit mx-auto sticky top-4 z-50 shadow-lg backdrop-blur-md border border-white/20 dark:border-slate-700/50">
            <button 
              onClick={() => setActiveTab('study')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'study' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {t.simplifyBtn}
            </button>
            <button 
              onClick={() => setActiveTab('library')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'library' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {t.libraryTab}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {t.recentlySimplified}
            </button>
          </div>

          {activeTab === 'study' && (
            <>
              <section className="text-center mb-8 md:mb-12 animate-float px-2">
            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-slate-900 dark:text-white leading-tight">
              {t.heroTitle} <span className="text-purple-600 dark:text-purple-400">{t.heroTitleHighlight}</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg max-w-xl mx-auto font-medium">
              {t.heroSub}
            </p>
          </section>

          <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-4 md:p-6 shadow-2xl shadow-purple-500/5 border border-purple-100 dark:border-purple-900/30 mb-8 md:mb-12 group focus-within:ring-2 focus-within:ring-purple-500/50 transition-all">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.textareaPlaceholder}
              className={`w-full h-32 md:h-40 bg-transparent resize-none border-none focus:ring-0 text-base md:text-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 ${isRTL ? 'text-right' : ''}`}
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-purple-50 dark:border-purple-900/20">
              <div className="flex gap-2">
                <label className="flex-1 sm:flex-none cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 transition-all font-bold text-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  {t.uploadBtn}
                  <input type="file" className="hidden" multiple accept="image/*,application/pdf,text/plain,video/*" onChange={handleFileUpload} />
                </label>
                <button 
                  onClick={toggleRecording}
                  title={t.micPermissionLabel}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  {isRecording ? t.micListening : t.micBtn}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => processLesson('simplify')}
                  disabled={loading || (inputText.trim() === '' && uploadedFiles.length === 0)}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-sm"
                >
                  {t.simplifyBtn}
                </button>
                <button 
                  onClick={() => processLesson('summarize')}
                  disabled={loading || (inputText.trim() === '' && uploadedFiles.length === 0)}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-sm"
                >
                  {t.summarizeBtn}
                </button>
                <button 
                  onClick={() => processLesson('quiz')}
                  disabled={loading || (inputText.trim() === '' && uploadedFiles.length === 0)}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-sm"
                >
                  {t.quizBtn}
                </button>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="relative group/file rounded-xl border border-purple-100 dark:border-purple-900/30 overflow-hidden bg-slate-50 dark:bg-slate-800/50 p-2">
                    {file.mimeType.startsWith('image/') ? (
                      <img src={file.data} alt={file.name} className="h-20 w-full object-cover rounded-lg" />
                    ) : file.mimeType.startsWith('video/') ? (
                      <div className="h-20 w-full flex flex-col items-center justify-center gap-1 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        <span className="text-[10px] font-bold uppercase">{file.name.split('.').pop()}</span>
                      </div>
                    ) : (
                      <div className="h-20 w-full flex flex-col items-center justify-center gap-1 text-purple-600 dark:text-purple-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        <span className="text-[10px] font-bold uppercase">{file.name.split('.').pop()}</span>
                      </div>
                    )}
                    <div className="mt-1 text-[10px] font-medium truncate px-1 text-slate-500 dark:text-slate-400">{file.name}</div>
                    <button 
                      onClick={() => removeFile(idx)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-100 transition-opacity"
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-purple-100 dark:border-purple-900/30 animate-in fade-in slide-in-from-bottom-4 duration-500 relative group/result mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <h3 className="text-xl md:text-2xl font-bold">{t.yourExplanation}</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleDownloadPDF(resultRef, 'lesson')} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 transition-all active:scale-95" title={t.downloadPdf}>
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </button>
                  <button onClick={handleShare} className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-all active:scale-95" title={t.shareBtn}>
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </button>
                  <button onClick={handleCopy} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 transition-all active:scale-95" title={t.copyBtn}>
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  </button>
                  {isAudioPlaying ? (
                    <button onClick={handleStopSpeech} className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-all active:scale-95" title={t.stopBtn}>
                      <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                    </button>
                  ) : (
                    <button onClick={() => handleSpeech(result)} className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 transition-all active:scale-95" title={t.listenBtn}>
                      <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    </button>
                  )}
                  <button onClick={() => processLesson('visualize')} className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-all active:scale-95" title={t.visualizeBtn}>
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </button>
                  <button onClick={() => processLesson('quiz')} className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-100 transition-all active:scale-95" title={t.quizBtn}>
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                </div>
              </div>
              <div className={`prose dark:prose-invert prose-purple max-w-none text-base md:text-lg leading-relaxed whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`} ref={resultRef}>
                {result}
              </div>
            </div>
          )}

          {visualResult && !loading && (
            <div className="mt-8 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-purple-100 dark:border-purple-900/30 mb-8">
              <h3 className="text-xl md:text-2xl font-bold mb-6">{t.conceptVisual}</h3>
              <img src={visualResult} alt="Visualization" className="w-full rounded-2xl shadow-2xl" />
            </div>
          )}

          {quizResult && !loading && (
            <div className="mt-8 space-y-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl md:text-2xl font-bold">{t.quizTitle}</h3>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-bold">
                  {currentQuizIndex + 1} / {quizResult.length}
                </span>
              </div>

              {currentQuizIndex < quizResult.length ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-purple-100 dark:border-purple-900/30 shadow-xl">
                  <p className={`text-lg md:text-xl font-bold mb-8 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                    {quizResult[currentQuizIndex].question}
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {quizResult[currentQuizIndex].options.map((opt, oIdx) => {
                      const isCorrect = oIdx === quizResult[currentQuizIndex].correctAnswer;
                      const isSelected = selectedQuizAnswer === oIdx;
                      
                      let buttonClass = "text-left p-5 rounded-2xl border-2 transition-all font-semibold text-base md:text-lg flex items-center justify-between group";
                      
                      if (selectedQuizAnswer !== null) {
                        if (isCorrect) {
                          buttonClass += " border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400";
                        } else if (isSelected) {
                          buttonClass += " border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400";
                        } else {
                          buttonClass += " border-slate-100 dark:border-slate-800 opacity-50";
                        }
                      } else {
                        buttonClass += " border-slate-100 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/10 active:scale-[0.98]";
                      }

                      return (
                        <button 
                          key={oIdx}
                          disabled={selectedQuizAnswer !== null}
                          onClick={() => handleQuizAnswer(oIdx)}
                          className={`${buttonClass} ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                        >
                          <span>{opt}</span>
                          {selectedQuizAnswer !== null && isCorrect && (
                            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          )}
                          {selectedQuizAnswer !== null && isSelected && !isCorrect && (
                            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-4">
                    <div>
                      {currentQuizIndex > 0 && (
                        <button 
                          onClick={() => setCurrentQuizIndex(prev => prev - 1)}
                          className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 text-sm"
                        >
                          <svg className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                          {t.prevQuestion}
                        </button>
                      )}
                    </div>

                    <div className="flex gap-4">
                      {selectedQuizAnswer === null && (
                        <button 
                          onClick={() => setCurrentQuizIndex(prev => prev + 1)}
                          className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
                        >
                          {t.skipQuestion}
                        </button>
                      )}

                      {selectedQuizAnswer !== null && (
                        <button 
                          onClick={() => setCurrentQuizIndex(prev => prev + 1)}
                          className="px-6 py-3 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm"
                        >
                          {t.nextQuestion}
                          <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 border border-purple-100 dark:border-purple-900/30 shadow-xl">
                  <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-6 border-4 border-purple-200 dark:border-purple-800">
                      <span className="text-3xl font-black">
                        {userAnswers.reduce((acc, ans, idx) => acc + (ans === quizResult[idx].correctAnswer ? 1 : 0), 0)} / {quizResult.length}
                      </span>
                    </div>
                    <h4 className="text-3xl font-black mb-2">{t.quizCompleted}</h4>
                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-sm">{t.quizSummary}</p>
                  </div>

                  <div className="space-y-4 mb-10">
                    {quizResult.map((q, idx) => {
                      const isCorrect = userAnswers[idx] === q.correctAnswer;
                      return (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-left flex items-start gap-4">
                          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white font-bold ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                            {isCorrect ? '✓' : '✕'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm mb-1">{q.question}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {t.correctAnswers}: <span className="text-green-600 dark:text-green-400 font-bold">{q.options[q.correctAnswer]}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
                    <button 
                      onClick={() => {
                        setCurrentQuizIndex(0);
                        setSelectedQuizAnswer(null);
                        setUserAnswers([]);
                      }}
                      className="px-6 py-3 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-600/20 hover:scale-105 active:scale-95 transition-all text-sm"
                    >
                      {t.quizBtn} Again
                    </button>
                    <button 
                      onClick={() => processLesson('quiz')}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all text-sm"
                    >
                      {t.newQuiz}
                    </button>
                    <button 
                      onClick={addMoreQuestions}
                      className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-orange-600/20 hover:scale-105 active:scale-95 transition-all text-sm"
                    >
                      {t.addMoreQuestions}
                    </button>
                    <button 
                      onClick={() => {
                        setQuizResult(null);
                        setResult(null);
                      }}
                      className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
                    >
                      {isArabic ? 'الرئيسية' : 'Home'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

          {activeTab === 'library' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="text-center mb-8">
                <h2 className="text-3xl font-black mb-4 text-slate-900 dark:text-white">
                  {t.libraryTab}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                  {isArabic ? 'تصفح المناهج الدراسية والكتب المدرسية الرسمية' : 'Browse official school curriculums and textbooks'}
                </p>
              </section>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-purple-100 dark:border-purple-900/30 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.selectCountry}</label>
                    <select 
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    >
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.selectGrade}</label>
                    <select 
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    >
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleFetchCurriculum}
                  disabled={loading}
                  className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-600/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? t.thinking : t.browseBooks}
                </button>
              </div>

              {curriculumBooks.length > 0 && !selectedBook && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {curriculumBooks.map((book, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                      <h4 className="text-xl font-black mb-2 text-purple-600 dark:text-purple-400">{book.subject}</h4>
                      <p className="font-bold text-slate-900 dark:text-white mb-2">{book.bookTitle}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{book.description}</p>
                      {book.pdfUrl && (
                        <a 
                          href={book.pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          {t.viewRealBook}
                        </a>
                      )}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.chapters}</p>
                        <div className="flex flex-wrap gap-2">
                          {book.chapters.slice(0, 3).map((ch: string, cIdx: number) => (
                            <button 
                              key={cIdx}
                              onClick={() => handleReadChapter(book, ch)}
                              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all"
                            >
                              {ch}
                            </button>
                          ))}
                          {book.chapters.length > 3 && (
                            <button 
                              onClick={() => setSelectedBook(book)}
                              className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold"
                            >
                              +{book.chapters.length - 3} more
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedBook && !chapterContent && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-purple-100 dark:border-purple-900/30 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <button onClick={() => setSelectedBook(null)} className="mb-6 text-purple-600 dark:text-purple-400 font-bold flex items-center gap-2 hover:underline">
                    <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    {t.backToBooks}
                  </button>
                  <h3 className="text-2xl font-black mb-2">{selectedBook.bookTitle}</h3>
                  <p className="text-slate-500 mb-6">{selectedBook.description}</p>
                  <div className="flex flex-wrap gap-3 mb-8">
                    {selectedBook.pdfUrl && (
                      <a 
                        href={selectedBook.pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        {t.viewRealBook}
                      </a>
                    )}
                    <button 
                      onClick={() => handleDownloadFullBook(selectedBook)}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-2xl text-sm font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      {t.downloadFullBook}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedBook.chapters.map((ch: string, idx: number) => (
                      <button 
                        key={idx}
                        onClick={() => handleReadChapter(selectedBook, ch)}
                        className="p-4 text-left bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-purple-300 transition-all font-bold flex items-center justify-between group"
                      >
                        <span>{ch}</span>
                        <svg className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chapterContent && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-purple-100 dark:border-purple-900/30 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                      <button onClick={() => setChapterContent(null)} className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-2 hover:underline">
                        <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        {t.backToBooks}
                      </button>
                      <button onClick={() => handleDownloadPDF(chapterRef, selectedChapter || 'chapter')} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 transition-all" title={t.downloadPdf}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setActiveTab('study');
                        setInputText(chapterContent);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-600/20"
                    >
                      {isArabic ? 'تبسيط هذا الفصل' : 'Simplify this Chapter'}
                    </button>
                  </div>
                  <div ref={chapterRef} className="p-4 rounded-2xl bg-white dark:bg-slate-900">
                    <h3 className="text-2xl font-black mb-2">{selectedChapter}</h3>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-6">{selectedBook?.bookTitle}</p>
                    <div className={`prose dark:prose-invert max-w-none ${isRTL ? 'text-right' : ''}`}>
                      <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {chapterContent}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && history.length > 0 && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                  <svg className={`w-4 h-4 absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map(item => (
                    <div key={item.id} className="group p-4 rounded-2xl bg-white/50 dark:bg-slate-900/30 border border-transparent hover:border-purple-200 dark:hover:border-purple-900 transition-all cursor-pointer active:scale-98" onClick={() => {
                      if (item.mode === 'quiz') {
                         setQuizResult(item.quizResult || null);
                         setCurrentQuizIndex(item.userAnswers ? (item.quizResult?.length || 0) : 0);
                         setSelectedQuizAnswer(null);
                         setUserAnswers(item.userAnswers || []);
                         setCurrentLessonId(item.id);
                         setResult(null);
                         setVisualResult(null);
                      } else if (item.mode === 'visualize') {
                         setVisualResult(item.visualUrl || null);
                         setResult(null);
                         setQuizResult(null);
                      } else {
                         setResult(item.result || null);
                         setQuizResult(null);
                         setVisualResult(null);
                      }
                      setInputText(item.originalText);
                      setUploadedFiles(item.files || []);
                      const foundLang = SUPPORTED_LANGUAGES.find(l => l.code === item.languageCode);
                      if (foundLang) setSelectedLanguage(foundLang);
                      setActiveTab('study');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs shrink-0">
                          {SUPPORTED_LANGUAGES.find(l => l.code === item.languageCode)?.flag || '🌍'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold truncate ${isRTL ? 'text-right' : ''}`}>{item.originalText.substring(0, 40) || 'Document'}...</p>
                          <p className={`text-xs text-slate-400 ${isRTL ? 'text-right' : ''}`}>
                            {item.mode.charAt(0).toUpperCase() + item.mode.slice(1)} 
                            {item.mode === 'quiz' && item.quizScore !== undefined && ` • ${t.score}: ${item.quizScore}/${item.quizResult?.length}`}
                            • {new Date(item.timestamp).toLocaleTimeString()}
                          </p>
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

          {activeTab === 'history' && history.length === 0 && (
            <div className="py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-400">{isArabic ? 'لا يوجد سجل بعد' : 'No history yet'}</h3>
              <p className="text-slate-500 mt-2">{isArabic ? 'ابدأ بتبسيط أول درس لك!' : 'Start by simplifying your first lesson!'}</p>
            </div>
          )}
        </main>
        } />
      </Routes>

      <footer className="py-12 text-center text-slate-400 text-sm px-4">
        <p>© {new Date().getFullYear()} {isArabic ? 'بستطهالك' : 'LessonLens'}. All rights reserved.</p>
        <p className="font-bold mt-1">{t.footerNote}</p>
      </footer>
    </div>
  );
};

export default App;
