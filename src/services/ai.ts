import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function translateText(text: string, from: string, to: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `Translate the following text from ${from} to ${to}: "${text}". Provide only the translation without any additional context.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text?.trim() || "Хатогӣ дар тарҷума";
  } catch (error) {
    console.error("Translation error:", error);
    return "Хатогӣ дар пайвастшавӣ ба ИИ";
  }
}

export async function askAssistant(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  const model = "gemini-3-flash-preview";
  
  try {
    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: "Шумо ассистенти донишманди забони тоҷикӣ ҳастед. Ба корбарон дар омӯхтани забон, тарҷумаи дуруст ва фаҳмидани маънои калимаҳо кӯмак кунед. Ҳамеша бо забони тоҷикӣ ҷавоб диҳед.",
      }
    });

    // Note: The current SDK chat implementation might need manual history handling if ai.chats isn't available or behaves differently
    // For simplicity in this demo, we use generateContent with history context
    const response = await ai.models.generateContent({
      model,
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: "Шумо ассистенти донишманди забони тоҷикӣ ҳастед. Ҳамеша бо забони тоҷикӣ ҷавоб диҳед.",
      }
    });

    return response.text || "Бубахшед, ман ҷавоб дода натавонистам.";
  } catch (error) {
    console.error("AI Assistant error:", error);
    return "Хатогӣ дар пайвастшавӣ ба ИИ.";
  }
}
