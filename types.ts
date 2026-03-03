
export type LessonMode = 'simplify' | 'summarize' | 'quiz' | 'visualize' | 'speech';

export type Language = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
};

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية (بالمصري)', flag: '🇪🇬' },
  { code: 'ar-fusha', name: 'Arabic (Eloquent)', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ar-sy', name: 'Arabic (Syrian)', nativeName: 'العامية السورية', flag: '🇸🇾' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];

export interface FileAsset {
  data: string; // base64
  mimeType: string;
  name: string;
}

export interface LessonContent {
  id: string;
  originalText: string;
  files?: FileAsset[];
  result?: string;
  visualUrl?: string;
  quizResult?: QuizQuestion[];
  audioBlob?: Blob;
  mode: LessonMode;
  languageCode: string;
  timestamp: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}
