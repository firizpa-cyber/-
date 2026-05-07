import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please set it in your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function translateText(text: string, from: string, to: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `Translate the following text from ${from} to ${to}: "${text}". Provide only the translation without any additional context.`;

  try {
    const ai = getAI();
    const result = await ai.getGenerativeModel({ model }).generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    return result.response.text()?.trim() || "Хатогӣ дар тарҷума";
  } catch (error) {
    console.error("Translation error:", error);
    return "Хатогӣ дар пайвастшавӣ ба ИИ";
  }
}

export async function askAssistant(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  const model = "gemini-3-flash-preview";
  
  try {
    const ai = getAI();
    const chatModel = ai.getGenerativeModel({ model });
    
    const response = await chatModel.generateContent({
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: message }] }
      ],
      generationConfig: {
        maxOutputTokens: 2048,
      },
      systemInstruction: "Шумо ассистенти донишманди забони тоҷикӣ ҳастед. Ҳамеша бо забони тоҷикӣ ҷавоб диҳед.",
    });

    return response.response.text() || "Бубахшед, ман ҷавоб дода натавонистам.";
  } catch (error) {
    console.error("AI Assistant error:", error);
    return "Хатогӣ дар пайвастшавӣ ба ИИ.";
  }
}
