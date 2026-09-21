import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-3.1-flash-lite";

// 無料枠の制限対策として複数キーを用意し、失敗したら次のキーを試す
const API_KEYS: string[] = [
  import.meta.env.VITE_GEMINI_API_KEY_1,
  import.meta.env.VITE_GEMINI_API_KEY_2,
  import.meta.env.VITE_GEMINI_API_KEY_3,
  import.meta.env.VITE_GEMINI_API_KEY_4,
  import.meta.env.VITE_GEMINI_API_KEY_5,
].filter(Boolean);

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

// 全キーを順に試し、最初に成功した結果を返す。全て失敗したら例外を投げる
async function withKeyFallback<T>(
  label: string,
  run: (genAI: GoogleGenerativeAI) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < API_KEYS.length; i++) {
    try {
      return await run(new GoogleGenerativeAI(API_KEYS[i]));
    } catch (error) {
      lastError = error;
      console.warn(`[${label}] APIキー ${i + 1}番目が失敗しました:`, error);
    }
  }
  throw lastError ?? new Error("利用可能なAPIキーがありません");
}

/** 会話履歴つきでメッセージを送り、AIの返答テキストを返す */
export function sendChat(params: {
  systemInstruction: string;
  history: ChatMessage[];
  message: string;
  label?: string;
}): Promise<string> {
  const { systemInstruction, history, message, label = "チャット" } = params;
  return withKeyFallback(label, async (genAI) => {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction,
    });
    const chat = model.startChat({
      history: history.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
    });
    const result = await chat.sendMessage(message);
    return result.response.text();
  });
}

/** 履歴なしで1回だけ生成する（要約など） */
export function generateText(prompt: string, label = "生成"): Promise<string> {
  return withKeyFallback(label, async (genAI) => {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
}
