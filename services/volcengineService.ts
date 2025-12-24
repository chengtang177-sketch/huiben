
import { BookData, GeneratedScript } from "../types";

const BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

// 注意：火山引擎需要使用推理终端 ID (Endpoint ID) 而非简单的模型名称
// 用户可以在代码或环境变量中修改这些 ID
const ENDPOINTS = {
  TEXT: "doubao-pro-32k", // 建议替换为您的推理终端 ID，如 ep-2024xxxx
  VISION: "doubao-vision-pro-32k",
  IMAGE: "doubao-image-gen" 
};

const getApiKey = () => {
  return process.env.API_KEY || "";
};

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

/**
 * 风格分析：使用豆包视觉模型
 */
export const analyzeImageStyle = async (imageBlob: Blob): Promise<string> => {
  const apiKey = getApiKey();
  const base64Data = await blobToBase64(imageBlob);

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: ENDPOINTS.VISION,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请分析这张儿童绘本插画的艺术风格。描述其媒介（如水彩、油画）、色调、光影和笔触。仅返回一段50字以内的英文提示词，用于AI绘图模仿该风格。"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${imageBlob.type};base64,${base64Data}`
              }
            }
          ]
        }
      ]
    })
  });

  const result = await response.json();
  if (result.error) throw new Error(result.error.message);
  return result.choices[0].message.content.trim();
};

/**
 * 剧本生成：使用豆包 Pro 文本模型
 */
export const generateBookScript = async (data: BookData): Promise<GeneratedScript> => {
  const apiKey = getApiKey();
  const systemPrompt = `你是一个专业的儿童绘本作家。请根据用户提供的信息生成绘本剧本。
  要求：
  1. 结构必须是 JSON 格式。
  2. 包含 title, introduction, characterDesign, coverPrompt 和 frames 数组。
  3. 每个 frame 包含 id, storyText, sceneDescription。
  4. coverPrompt 必须是纯视觉描述，严禁出现文字或字符。`;

  const userPrompt = `标题：${data.title}\n主题：${data.theme}\n期望字数：${data.wordCount}\n视觉锚点：${data.visualAnchor}\n风格提示词：${data.stylePrompt}\n简介：${data.introduction}`;

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: ENDPOINTS.TEXT,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    })
  });

  const result = await response.json();
  if (result.error) throw new Error(result.error.message);
  return JSON.parse(result.choices[0].message.content);
};

/**
 * 绘画生成：适配火山引擎图像生成接口
 */
export const generateIllustration = async (
  prompt: string, 
  stylePrompt: string, 
  visualAnchor: string = "", 
  characterDesign: string = "",
  aspectRatio: "16:9" | "9:16" = "16:9"
) => {
  const apiKey = getApiKey();
  
  // 火山引擎图像生成通常有专门的 endpoint，这里模拟标准的 Text-to-Image 调用
  // 注意：实际调用可能需要根据您的具体插件/模型调整 body 结构
  const fullPrompt = `${prompt}. Style: ${stylePrompt}. Characteristics: ${visualAnchor}, ${characterDesign}. High quality children's book illustration, 8k resolution.`;

  const response = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: ENDPOINTS.IMAGE,
      prompt: fullPrompt,
      size: aspectRatio === "16:9" ? "1280x720" : "720x1280",
      n: 1,
      response_format: "b64_json"
    })
  });

  const result = await response.json();
  if (result.error) throw new Error(result.error.message);
  return `data:image/png;base64,${result.data[0].b64_json}`;
};
