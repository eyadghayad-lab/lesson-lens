
import { HfInference } from "@huggingface/inference";
import { FileAsset } from "../types";

const hf = new HfInference(process.env.HUGGINGFACE_TOKEN || '');

// Helper to convert base64 to Blob
const base64ToBlob = (base64: string, mimeType: string) => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

export const simplifyLesson = async (text: string, files: FileAsset[], langName: string): Promise<string> => {
  const prompt = `User: Simplify the following lesson material. 
  The target language is: ${langName}. 
  - If the language is Arabic (Eloquent), use formal Modern Standard Arabic.
  - If the language is Arabic, use friendly Egyptian dialect. 
  - If it's Syrian Arabic, use friendly Syrian dialect. 
  Material: ${text}
  Assistant: Here is the simplified explanation in ${langName}:`;
  
  const response = await hf.textGeneration({
    model: 'mistralai/Mistral-7B-Instruct-v0.2',
    inputs: prompt,
    parameters: { max_new_tokens: 1000, return_full_text: false }
  });

  return response.generated_text || "Sorry, I couldn't simplify this material.";
};

export const summarizeLesson = async (text: string, files: FileAsset[], langName: string): Promise<string> => {
  const prompt = `User: Provide a structured summary with bullet points in ${langName} for the following material: ${text}
  Assistant: Summary:`;
  
  const response = await hf.textGeneration({
    model: 'mistralai/Mistral-7B-Instruct-v0.2',
    inputs: prompt,
    parameters: { max_new_tokens: 1000, return_full_text: false }
  });

  return response.generated_text || "Summary generation failed.";
};

export const generateQuiz = async (text: string, files: FileAsset[], langName: string): Promise<any> => {
  const prompt = `User: Based on the provided lesson material, generate 3 multiple-choice questions in JSON format. 
  The language of the quiz must be ${langName}. 
  Return ONLY a JSON array of objects with "question", "options" (array of 4), and "correctAnswer" (index 0-3).
  Material: ${text}
  Assistant: [`;
  
  const response = await hf.textGeneration({
    model: 'mistralai/Mistral-7B-Instruct-v0.2',
    inputs: prompt,
    parameters: { max_new_tokens: 1000, return_full_text: false }
  });

  try {
    const jsonStr = '[' + response.generated_text;
    // Basic cleanup in case model adds extra text
    const match = jsonStr.match(/\[.*\]/s);
    return JSON.parse(match ? match[0] : jsonStr);
  } catch (e) {
    console.error("JSON parse error", e);
    return [];
  }
};

export const visualizeConcept = async (prompt: string): Promise<string> => {
  const response = await hf.textToImage({
    model: 'stabilityai/stable-diffusion-xl-base-1.0',
    inputs: `Educational illustration, clean, minimalist, vibrant colors: ${prompt}`,
  });

  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(response as any);
  });
};

export const textToSpeech = async (text: string, langName: string): Promise<string> => {
  // Note: HF TTS models vary. Using a common one.
  // This is a placeholder as TTS on HF often requires specific models per language.
  const response = await hf.textToSpeech({
    model: 'facebook/mms-tts-eng', // Defaulting to English for demo, real implementation would switch
    inputs: text,
  });

  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(response as any);
  });
};
