import React, { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Message {
  role: "user" | "model";
  text: string;
}

const API_KEYS = [
  import.meta.env.VITE_GEMINI_API_KEY_1,
  import.meta.env.VITE_GEMINI_API_KEY_2,
];

// ⭕ 型定義に qualification（資格名）を追加
interface GoalFormAndChatProps {
  onGoalComplete: (goal: {
    qualification: string;
    purpose: string;
    field: string;
    period: string;
  }) => void;
  onGoalReset: () => void;
}

export const GoalFormAndChat: React.FC<GoalFormAndChatProps> = ({
  onGoalComplete,
  onGoalReset,
}) => {
  // --- State管理 ---
  const [userType, setUserType] = useState<"学生" | "社会人" | "">("");
  const [userContext, setUserContext] = useState("");
  const [qualificationName, setQualificationName] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem("chat_history");
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [step, setStep] = useState<"form" | "chat">(
    messages.length > 0 ? "chat" : "form",
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // GeminiのChatセッションを保持するRef
  const chatRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. システムプロンプトの組み立て
  const systemInstruction = `あなた（Gemini）は、資格学習者の「内発的動機付け」を引き出す優秀なAIメンターコーチです。
ユーザーが「学ぶこと自体の面白さ」を感じ、自分にとってのメリットを納得（自律性の向上）できるよう、以下の【対話ステップ】を厳格に守って対話してください。

【事前に入手しているユーザー情報】
・属性: ${userType}
・現在の状況: ${userContext}
・目指す資格: ${qualificationName}

【対話ルール】
1. 1回のリクエスト（発言）につき、質問は必ず「1つ」に絞ってください。ユーザーに一度に複数の質問をしないでください。
2. 返答はなるべく簡潔に（3行〜4行程度）、ポジティブで親しみやすい先輩のようなトーンで話してください。

【対話ステップ】
■ ステップ4（あなたの最初の発言）：
ユーザー情報（属性・状況・資格）を踏まえ、その資格で学べる内容の全体像をざっくりと提示してください。その際、ユーザーの状況（例：〇〇学部、〇〇の仕事）と関連付けて「ここが特に面白い・役立つ！」というポイントを分かりやすく伝え、以下の質問をしてください。
質問：「この資格の学習範囲の中で、特にどの分野（あるいはどんな内容）に興味が湧きそうですか？」

■ ステップ5（ユーザーの返答後）：
ユーザーが選んだ分野を全力で褒め、「その知識があると、将来の仕事や実務でこんな風に活かせる（面白くなる）」という具体的なシナリオを提示してください。その上で、ユーザー自身にメリットを再確認させるための質問をしてください。
質問：「この分野を学ぶことで、あなた自身にはどんなメリット（知識が身に付く、業務の理解が早くなるなど）がありそうですか？」

■ ステップ6（ユーザーの返答後）：
ユーザーの回答を肯定しつつ、正しい情報に基づいて「まさにその通りですね！他にもこんなメリットがあります」と肉付けしてあげてください。 tenderly、最後に時期を設定するための質問をしてください。
質問：「このモチベーションを維持して走り切るために、いつまでにこの資格を取得（合格）したいか、目標の時期を決めましょう！」

■ ステップ7（最終着地点）：
時期が返ってきたら対話を終了します。これまでの内容を総括し、以下のフォーマット（3行程度）で「今回の絶対ゴール」を綺麗にまとめて出力してください。
---
【決定した目標】
・真の目的：[ステップ5・6で言語化したメリット]
・注力する分野：[ステップ4で選んだ分野]
------------目标取得時期：[ステップ6で決めた時期]
---`;

  // 常に最新のメッセージにスクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (step === "chat" && messages.length > 0) {
      localStorage.setItem("chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  // --- チャット開始処理（フォーム確定時） ---
  const handleStartChat = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userType || !userContext || !qualificationName) return;

    setIsLoading(true);
    setStep("chat");

    let botText = "";
    let success = false;

    for (let i = 0; i < API_KEYS.length; i++) {
      try {
        const currentKey = API_KEYS[i];
        if (!currentKey) continue;

        const tempGenAI = new GoogleGenerativeAI(currentKey);
        const model = tempGenAI.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
          systemInstruction: systemInstruction,
        });

        chatRef.current = model.startChat({ history: [] });

        const result = await chatRef.current.sendMessage(
          "対話を開始してください。ステップ4の問いかけをお願いします。",
        );
        botText = await result.response.text();

        success = true;
        break;
      } catch (error) {
        console.warn(
          `[開始エラー] APIキー ${i + 1}番目が失敗しました。切り替えます。`,
          error,
        );
      }
    }

    if (success) {
      setMessages([{ role: "model", text: botText }]);
    } else {
      setMessages([
        {
          role: "model",
          text: "通信エラーが発生しました。時間を置いてやり直してください。",
        },
      ]);
    }
    setIsLoading(false);
  };

  // --- メッセージ送信処理 ---
  const handleSendMessage = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setIsLoading(true);

    let botText = "";
    let success = false;

    for (let i = 0; i < API_KEYS.length; i++) {
      try {
        const currentKey = API_KEYS[i];
        if (!currentKey) continue;

        const tempGenAI = new GoogleGenerativeAI(currentKey);
        const model = tempGenAI.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
          systemInstruction: systemInstruction,
        });

        const formattedHistory = messages.slice(1).map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

        chatRef.current = model.startChat({ history: formattedHistory });

        const result = await chatRef.current.sendMessage(userText);
        botText = await result.response.text();

        success = true;
        break;
      } catch (error) {
        console.warn(
          `[送信エラー] APIキー ${i + 1}番目が失敗しました。切り替えます。`,
          error,
        );
      }
    }

    if (success) {
      setMessages((prev) => [...prev, { role: "model", text: botText }]);

      if (botText.includes("【決定した目標】")) {
        try {
          const purposeMatch = botText.match(/・真の目的：(.*)/);
          const fieldMatch = botText.match(/・注力する分野：(.*)/);
          const periodMatch = botText.match(/・目標取得時期：(.*)/);

          if (purposeMatch && fieldMatch && periodMatch) {
            // ⭕ フォームで入力された qualificationName も一緒に親へ渡す
            onGoalComplete({
              qualification: qualificationName,
              purpose: purposeMatch[1].trim(),
              field: fieldMatch[1].trim(),
              period: periodMatch[1].trim(),
            });
          }
        } catch (err) {
          console.error("目標テキストの解析に失敗しました", err);
        }
      }
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "エラーが発生しました。再度送信してください。" },
      ]);
    }
    setIsLoading(false);
  };

  const handleResetChat = () => {
    localStorage.removeItem("chat_history");
    setMessages([]);
    setStep("form");
    onGoalReset();
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      {step === "form" ? (
        <form
          onSubmit={handleStartChat}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
          <h2>まずはあなたのことを教えてください</h2>

          <div>
            <label>区分：</label>
            <button
              type="button"
              onClick={() => setUserType("学生")}
              style={{ fontWeight: userType === "学生" ? "bold" : "normal" }}
            >
              学生
            </button>
            <button
              type="button"
              onClick={() => setUserType("社会人")}
              style={{
                fontWeight: userType === "社会人" ? "bold" : "normal",
                marginLeft: "10px",
              }}
            >
              社会人
            </button>
          </div>

          {userType && (
            <div>
              <label>
                {userType === "学生"
                  ? "学部・学んでいること・興味のあること："
                  : "現在の職種・仕事内容："}
              </label>
              <input
                type="text"
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="例：情報学部、SE職など"
                required
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
              />
            </div>
          )}

          <div>
            <label>今取りたい資格：</label>
            <input
              type="text"
              value={qualificationName}
              onChange={(e) => setQualificationName(e.target.value)}
              placeholder="例：ITパスポート"
              required
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
            />
          </div>

          <button
            type="submit"
            disabled={!userType || !userContext || !qualificationName}
            style={{ padding: "10px", cursor: "pointer" }}
          >
            目的の深掘りを始める
          </button>
        </form>
      ) : (
        /* --- ステップ4〜7：APIチャット画面 --- */
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "15px",
          }}
        >
          {/* タイボウ横のボタンを消去してシンプルに */}
          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ margin: 0 }}>🎯 資格取得の目的を明確にする対話</h3>
          </div>

          <div
            style={{
              height: "400px",
              overflowY: "auto",
              borderBottom: "1px solid #eee",
              marginBottom: "15px",
              padding: "10px",
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  textAlign: msg.role === "user" ? "right" : "left",
                  margin: "10px 0",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    padding: "10px",
                    borderRadius: "8px",
                    backgroundColor:
                      msg.role === "user" ? "#dcf8c6" : "#f1f0f0",
                    whiteSpace: "pre-wrap",
                    maxWidth: "80%",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ color: "#999", margin: "10px 0" }}>
                先輩AIが思考中...
              </div>
            )}

            {/* ⭕ 修正点：ボタンをチャットログの「一番下」の定位置へ戻しました */}
            <div style={{ textAlign: "center", marginTop: "15px" }}>
              <button
                type="button"
                onClick={handleResetChat}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#ff4d4f",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                最初からやり直す
              </button>
            </div>

            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            style={{ display: "flex", gap: "10px" }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="メッセージを入力..."
              disabled={isLoading}
              style={{ flexGrow: 1, padding: "8px" }}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              送信
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
