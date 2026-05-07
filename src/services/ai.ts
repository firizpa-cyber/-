// Move AI logic to server-side to hide API keys
export async function translateText(text: string, from: string, to: string) {
  try {
    const response = await fetch("/api/ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, from, to }),
    });
    const data = await response.json();
    return data.translation || "Хатогӣ дар тарҷума";
  } catch (error) {
    console.error("Translation error:", error);
    return "Хатогӣ дар пайвастшавӣ ба сервер";
  }
}

export async function askAssistant(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
    const data = await response.json();
    return data.response || "Бубахшед, ман ҷавоб дода натавонистам.";
  } catch (error) {
    console.error("AI Assistant error:", error);
    return "Хатогӣ дар пайвастшавӣ ба сервер.";
  }
}
