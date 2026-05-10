export async function translateText(text: string, from: string, to: string) {
  try {
    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from, to })
    });
    const data = await res.json();
    return data.text || "Хатогӣ дар тарҷума";
  } catch (error) {
    console.error("Translation error:", error);
    return "Хатогӣ дар пайвастшавӣ ба сервер";
  }
}

export async function advancedAIAnalysis(text: string, from: string, to: string) {
  try {
    const res = await fetch('/api/ai/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from, to })
    });
    return await res.json();
  } catch (error) {
    console.error('AI Analysis failed:', error);
    return null;
  }
}

export async function askAssistant(message: string, history: { role: 'user' | 'model', content: string }[]) {
  try {
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history })
    });
    const data = await res.json();
    return data.text || "Бубахшед, ман ҷавоб дода натавонистам.";
  } catch (error) {
    console.error("AI Assistant error:", error);
    return "Хатогӣ дар пайвастшавӣ ба сервер.";
  }
}

export async function analyzeMorphology(word: string) {
  try {
    const res = await fetch('/api/ai/morphology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    });
    return await res.json();
  } catch (error) {
    console.error("Morphology error:", error);
    return null;
  }
}

export async function checkSpelling(text: string) {
  try {
    const res = await fetch('/api/ai/spelling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return await res.json();
  } catch (error) {
    console.error("Spellcheck error:", error);
    return null;
  }
}

export async function parseDictionaryContent(sources: { name: string, content: string }[]) {
  try {
    const res = await fetch('/api/ai/parse-dict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources })
    });
    return await res.json();
  } catch (error) {
    console.error("Parsing error:", error);
    return { entries: [] };
  }
}

export async function getAcademicDefinition(word: string) {
  try {
    const res = await fetch('/api/ai/academic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    });
    return await res.json();
  } catch (error) {
    console.error("Academic definition error:", error);
    return null;
  }
}
