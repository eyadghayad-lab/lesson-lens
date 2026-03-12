
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { FileAsset, QuizQuestion } from "../types";

let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }
  return aiInstance;
};

// Helper to convert FileAsset to Gemini Part
const fileToPart = (file: FileAsset) => {
  const base64Data = file.data.split(',')[1];
  return {
    inlineData: {
      data: base64Data,
      mimeType: file.mimeType
    }
  };
};

export const simplifyLesson = async (text: string, files: FileAsset[], langName: string): Promise<string> => {
  const ai = getAI();
  const parts: any[] = files.map(fileToPart);
  parts.push({ text: `Simplify the following lesson material. 
  The target language is: ${langName}. 
  - If the language is Arabic (Eloquent), use formal Modern Standard Arabic.
  - If the language is Arabic, use friendly Egyptian dialect. 
  - If it's Syrian Arabic, use friendly Syrian dialect. 
  Material: ${text}` });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
  });

  return response.text || "Sorry, I couldn't simplify this material.";
};

export const summarizeLesson = async (text: string, files: FileAsset[], langName: string): Promise<string> => {
  const ai = getAI();
  const parts: any[] = files.map(fileToPart);
  parts.push({ text: `Provide a structured summary with bullet points in ${langName} for the following material: ${text}` });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
  });

  return response.text || "Summary generation failed.";
};

export const generateQuiz = async (text: string, files: FileAsset[], langName: string, existingQuestions: QuizQuestion[] = []): Promise<QuizQuestion[]> => {
  const ai = getAI();
  const parts: any[] = files.map(fileToPart);
  
  let existingContext = "";
  if (existingQuestions.length > 0) {
    existingContext = `\nAvoid repeating these existing questions: ${existingQuestions.map(q => q.question).join(', ')}`;
  }

  parts.push({ text: `Based on the provided lesson material, generate 3 multiple-choice questions. 
  The language of the quiz must be ${langName}.${existingContext}
  Material: ${text}` });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.INTEGER, description: "Index of the correct answer (0-3)" }
          },
          required: ["question", "options", "correctAnswer"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("JSON parse error", e);
    return [];
  }
};

export const visualizeConcept = async (prompt: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `Educational illustration, clean, minimalist, vibrant colors: ${prompt}`,
        },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  return "";
};

export const textToSpeech = async (text: string, langName: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say in ${langName}: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio || "";
};

export const fetchCurriculum = async (country: string, grade: string, langName: string): Promise<any[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `List the standard school subjects and their primary textbooks for ${grade} in ${country}. 
    Provide the response in ${langName}. 
    Include the book title, a brief description of what it covers, and search for a direct link to the official PDF of the textbook. 
    The pdfUrl MUST be a direct link ending in .pdf from an official ministry or educational website. If you cannot find a direct .pdf link, leave it empty.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            bookTitle: { type: Type.STRING },
            description: { type: Type.STRING },
            pdfUrl: { type: Type.STRING, description: "Direct link to the official PDF of the book if available, otherwise an empty string." },
            chapters: { 
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of major chapters or units in this book"
            }
          },
          required: ["subject", "bookTitle", "description", "chapters"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("JSON parse error", e);
    return [];
  }
};

export const fetchChapterContent = async (bookTitle: string, chapterName: string, langName: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Provide a detailed educational summary and key learning points for the chapter "${chapterName}" from the school book "${bookTitle}". 
    The summary should be in ${langName} and suitable for a student.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return response.text || "Could not fetch chapter content.";
};
