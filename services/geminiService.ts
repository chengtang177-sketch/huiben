
import { GoogleGenAI, Type } from "@google/genai";
import { BookData, GeneratedScript } from "../types";

// 将 Blob 转为 Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getApiKey = () => {
  // 仅获取值，不在此处抛出中断性异常，交由 GoogleGenAI 实例在调用时反馈
  return process.env.API_KEY || "";
};

export const analyzeImageStyle = async (imageBlob: Blob): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = await blobToBase64(imageBlob);
  
  const prompt = `Analyze the artistic style of this children's book illustration. 
  Describe its:
  1. Medium and technique (e.g., watercolor, digital oil painting, flat vector).
  2. Color palette (e.g., soft pastels, vibrant primaries).
  3. Lighting and mood (e.g., soft morning glow, moody and dark).
  4. Stroke and texture details.
  
  Return ONLY a concise, high-quality prompt fragment (under 50 words) that can be used to replicate this exact style in an AI image generator.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: imageBlob.type || 'image/jpeg' } },
          { text: prompt }
        ]
      }
    });

    return response.text?.trim() || "Hand-drawn children's book style";
  } catch (err: any) {
    console.error("Gemini analyzeImageStyle internal error:", err);
    throw err;
  }
};

export const generateBookScript = async (data: BookData): Promise<GeneratedScript> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Create a children's picture book script based on:
  Title: ${data.title}
  Theme: ${data.theme}
  Word Count Limit: ${data.wordCount}
  Visual Anchor (Character/Scene traits): ${data.visualAnchor}
  Artistic Style: ${data.stylePrompt}
  Additional Info: ${data.introduction}
  
  CRITICAL REQUIREMENT 1 - CHARACTER CONSISTENCY:
  Define a "characterDesign" with detailed visual traits.
  
  CRITICAL REQUIREMENT 2 - EMOTIONAL ALIGNMENT:
  For each frame, the "sceneDescription" MUST translate the emotional tone into visual cues.
  
  CRITICAL REQUIREMENT 3 - COVER PROMPT:
  The "coverPrompt" MUST focus exclusively on the main characters in a central, iconic pose. 
  IMPORTANT: The prompt must EXPLICITLY forbid any text, titles, or characters (especially Chinese characters). 
  It should be a pure illustration.
  
  Generate a structured response with optimized title, intro, characterDesign, coverPrompt, and story frames.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          introduction: { type: Type.STRING },
          characterDesign: { type: Type.STRING },
          coverPrompt: { type: Type.STRING },
          frames: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                storyText: { type: Type.STRING },
                sceneDescription: { type: Type.STRING }
              },
              required: ["id", "storyText", "sceneDescription"]
            }
          }
        },
        required: ["title", "introduction", "characterDesign", "coverPrompt", "frames"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No text generated from model");
  return JSON.parse(text.trim());
};

export const generateIllustration = async (
  prompt: string, 
  stylePrompt: string, 
  visualAnchor: string = "", 
  characterDesign: string = "",
  aspectRatio: "16:9" | "9:16" = "16:9"
) => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  const fullPrompt = `SCENE: ${prompt}. 
STYLE: ${stylePrompt}. 
VISUAL ANCHOR: ${visualAnchor}. 
CHARACTER: ${characterDesign}. 
Professional high-quality children's book illustration.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: fullPrompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio
      }
    }
  });

  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("Failed to generate image");
};
