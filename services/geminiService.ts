
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { FileAsset } from "../types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const prepareParts = (text: string, files?: FileAsset[]) => {
  const parts: any[] = [{ text }];
  
  if (files && files.length > 0) {
    files.forEach(file => {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data.split(',')[1],
        },
      });
    });
  }
  return parts;
};

export const simplifyLesson = async (text: string, files: FileAsset[], langName: string): Promise<string> => {
  const ai = getAIClient();
  const prompt = `Simplify the following lesson material. 
  The target language is: ${langName}. 
  - If the language is Arabic (Eloquent), use formal, correct, and high-quality Modern Standard Arabic. Avoid any dialects.
  - If the language is Arabic, use a friendly, simplified Egyptian dialect (بستطهالك). 
  - If it's Syrian Arabic, use a friendly, simplified Syrian dialect (Levantine/شامي). 
  - Otherwise, use clear, simple words for a student in the specified language. 
  Material: ${text}`;
  
  const parts = prepareParts(prompt, files);

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      systemInstruction: `You are a world-class tutor who excels at making complex topics simple. You always respond in ${langName}. If ${langName} is 'Arabic (Eloquent)', you must use impeccable Modern Standard Arabic.`,
    }
  });

  return response.text || "Sorry, I couldn't simplify this material.";
};

export const summarizeLesson = async (text: string, files: FileAsset[], langName: string): Promise<string> => {
  const ai = getAIClient();
  const prompt = `Provide a structured summary with bullet points in ${langName} for the following material: ${text}`;
  const parts = prepareParts(prompt, files);

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      systemInstruction: `You are an expert at extracting key concepts. You always respond in ${langName}.`,
    }
  });

  return response.text || "Summary generation failed.";
};

export const generateQuiz = async (text: string, files: FileAsset[], langName: string): Promise<any> => {
  const ai = getAIClient();
  const prompt = `Based on the provided lesson material, generate 3 multiple-choice questions in JSON format. The language of the quiz must be ${langName}. Material: ${text}`;
  const parts = prepareParts(prompt, files);

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-3)" }
          },
          required: ["question", "options", "correctAnswer"]
        }
      },
      systemInstruction: `You are an educational assessment expert. Create high-quality multiple-choice questions based ONLY on the provided content in ${langName}.`
    }
  });

  return JSON.parse(response.text || "[]");
};

export const visualizeConcept = async (prompt: string): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `Create an educational, clean illustration that explains this concept: ${prompt}. Minimalist style, vibrant colors.` }]
    },
    config: {
      imageConfig: { aspectRatio: "1:1" }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Image generation failed");
};

export const textToSpeech = async (text: string, langName: string): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this ${langName} lesson explanation clearly and slowly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: langName.includes('Arabic') ? 'Puck' : 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio generation failed");
  return base64Audio;
};
