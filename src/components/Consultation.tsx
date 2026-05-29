import React, { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Message {
  role: "user" | "model";
  text: string;
}

interface ConsultationHistory {
  id: string;
  date: string;
  qualification: string;
  category: string;
  summary: {
    trouble: string;
    solution: string;
  };
}

const API_KEYS = [
  import.meta.env.VITE_GEMINI_API_KEY_1,
  import.meta.env.VITE_GEMINI_API_KEY_2,
];

interface ConsultationProps {
  currentQualification: string;
}

export const Consultation: React.FC<ConsultationProps> = ({
  currentQualification,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState<"select" | "chat">("select");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [historyList, setHistoryList] = useState<ConsultationHistory[]>(() => {
    const saved = localStorage.getItem("consultation_history");
    return saved ? JSON.parse(saved) : [];
  });

  const chatRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const categories = [
    { id: "difficult", label: "😫 内容が難しくて挫折しそう…" },
    { id: "lazy", label: "🥱 やる気が出なくてサボってしまう…" },
    { id: "no_time", label: "⏰ 時間が足りなくて焦っている…" },
    { id: "lost", label: "❓ なぜこの勉強をしてるか分からなくなった…" },
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 💡 AIに提案させる具体的なライフハックの引き出し
  const systemInstruction = `あなた（Gemini）は、資格学習者のメンタルを支え、モチベーションを蘇らせる優秀なAI先輩メンターです。
ユーザーが今抱えている不安や焦りに寄り添い、今日からできる「超小さな一歩（改善策）」を一緒に見つけてあげてください。

【現在のユーザー情報】
・目指している資格: ${currentQualification || "未設定の資格"}
・現在の悩みタイプ: ${selectedCategory}

【具体的な改善策の引き出し（この中からユーザーの状況に合うものを1つ〜2つ選んで提案してください）】
1. ポモドーロ法（25分だけ集中して5分休憩するのを1回だけやる）
2. タイムアタック（タイマーを10分〜15分セットして、ゲーム感覚でそこだけ集中する）
3. アクティブリコール（今のページを読み終えたら、一度隠して思い出せるかセルフクイズする）
4. 極限スモールステップ（教科書を開いて最初の1行だけ読む、PCを開いて1文字だけ打つ）

【対話ルール】
1. 1回のリクエストにつき、質問は必ず「1つ」に絞ってください。
2. 最初はユーザーの悩みに「全力で共感」し、「具体的にどんなところで躓いているか」を優しく1つだけ問いかけてください。
3. 对話はユーザーの返答を含めて2〜3往復程度で完結させてください。
4. 最後に、上記の【具体的な改善策の引き出し】から最適なものを提案し、合意を得てください。
5. ユーザーが納得したら対話を終了し、必ず以下のフォーマット（3行程度）で「今回の相談のまとめ」を出力して締めくくってください。

---
【相談のまとめ】
・具体的な悩み：[対話から見えたユーザーの具体的な状況の要約]
・決定した改善策：[約束した超小さなスモールステップ]
---`;

  const handleStartConsultation = async (categoryLabel: string) => {
    setSelectedCategory(categoryLabel);
    setStep("chat");
    setIsLoading(true);

    let botText = "";
    let success = false;
    // ⭕ 1発目をuserの発言として定義する（Gemini SDKのエラールール対策）
    const initialPrompt = `相談を開始します。私は今、「${categoryLabel}」という悩みを抱えています。先輩、話を聞いてください。`;

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
        const result = await chatRef.current.sendMessage(initialPrompt);
        botText = await result.response.text();
        success = true;
        break;
      } catch (error) {
        console.warn(`[相談開始エラー] キー ${i + 1}番目失敗:`, error);
      }
    }

    if (success) {
      // ⭕ userのトリガー発言と、modelの最初の返答をセットで履歴に保存！
      setMessages([
        { role: "user", text: initialPrompt },
        { role: "model", text: botText },
      ]);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");

    // 画面更新用に今の発言を追加
    const updatedMessages = [
      ...messages,
      { role: "user", text: userText } as Message,
    ];
    setMessages(updatedMessages);
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

        // ⭕ 正しい履歴形式（最初がuser）にマッピングしてチャットセッションに渡す
        const formattedHistory = messages.map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

        chatRef.current = model.startChat({ history: formattedHistory });
        const result = await chatRef.current.sendMessage(userText);
        botText = await result.response.text();
        success = true;
        break;
      } catch (error) {
        console.warn(`[相談送信エラー] キー ${i + 1}番目失敗:`, error);
      }
    }

    if (success) {
      setMessages((prev) => [...prev, { role: "model", text: botText }]);

      if (botText.includes("【相談のまとめ】")) {
        try {
          const troubleMatch = botText.match(/・具体的な悩み：(.*)/);
          const solutionMatch = botText.match(/・決定した改善策：(.*)/);

          if (troubleMatch && solutionMatch) {
            const newHistory: ConsultationHistory = {
              id: Date.now().toString(),
              date: new Date().toLocaleDateString("ja-JP"),
              qualification: currentQualification || "目標資格",
              category: selectedCategory,
              summary: {
                trouble: troubleMatch[1].trim(),
                solution: solutionMatch[1].trim(),
              },
            };

            const updatedList = [newHistory, ...historyList];
            setHistoryList(updatedList);
            localStorage.setItem(
              "consultation_history",
              JSON.stringify(updatedList),
            );
          }
        } catch (err) {
          console.error("相談まとめのパースに失敗しました", err);
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

  const handleResetConsultation = () => {
    setMessages([]);
    setSelectedCategory("");
    setStep("select");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      <section
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "20px",
          backgroundColor: "#fff",
        }}
      >
        {step === "select" ? (
          <div>
            <h2 style={{ fontSize: "18px", marginBottom: "15px" }}>
              💬 モチベ低下時の相談
            </h2>
            <p
              style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}
            >
              勉強お疲れ様！ちょっと心が疲れちゃったかな？
              <br />
              今一番近い「つらさ」のボタンを押してね。先輩AIが話を聞くよ。
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleStartConsultation(cat.label)}
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px" }}>
                🤝 先輩AIが相談にのり中
              </h3>
              <button
                onClick={handleResetConsultation}
                style={{
                  padding: "4px 8px",
                  fontSize: "12px",
                  backgroundColor: "#6c757d",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                相談を終了する
              </button>
            </div>

            <div
              style={{
                height: "300px",
                overflowY: "auto",
                border: "1px solid #eee",
                borderRadius: "6px",
                padding: "10px",
                marginBottom: "15px",
                backgroundColor: "#fafafa",
              }}
            >
              {messages.map((msg, idx) => {
                // ⭕ 最初のシステム的なシステム発言（インデックス0）は画面上で非表示にする
                if (idx === 0) return null;

                return (
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
                          msg.role === "user" ? "#dcf8c6" : "#e9ecef",
                        whiteSpace: "pre-wrap",
                        maxWidth: "80%",
                        fontSize: "14px",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div style={{ color: "#999", fontSize: "12px" }}>
                  先輩AIが言葉を選んでいます...
                </div>
              )}
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
                placeholder="先輩に気持ちを打ち明けてみて..."
                disabled={isLoading}
                style={{
                  flexGrow: 1,
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{ padding: "8px 16px", cursor: "pointer" }}
              >
                話す
              </button>
            </form>
          </div>
        )}
      </section>

      {/* ＝ 下半分：過去の相談履歴エリア ＝ */}
      <section style={{ borderTop: "2px dashed #eee", paddingTop: "20px" }}>
        <h3 style={{ fontSize: "16px", margin: "0 0 15px 0" }}>
          📜 これまでにあなたが乗り越えてきた記録 ({historyList.length}件)
        </h3>
        {historyList.length === 0 ? (
          <p
            style={{
              color: "#999",
              fontSize: "14px",
              textAlign: "center",
              padding: "20px",
              border: "1px dashed #ddd",
              borderRadius: "6px",
            }}
          >
            ここに乗り越えた悩みの履歴がたまっていきます。一歩ずつ進んでいこう！
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              maxHeight: "450px",
              overflowY: "auto",
            }}
          >
            {historyList.map((hist) => (
              <div
                key={hist.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "15px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "#64748b",
                    marginBottom: "8px",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "5px",
                  }}
                >
                  <span>
                    📅 {hist.date} ｜ 🏷️ {hist.qualification}
                  </span>
                  <span style={{ fontWeight: "bold" }}>
                    {hist.category.split(" ")[0]} 相談
                  </span>
                </div>
                <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                  <p style={{ margin: "4px 0", color: "#ef4444" }}>
                    ❌ <strong>当時の悩み:</strong> {hist.summary.trouble}
                  </p>
                  <p
                    style={{
                      margin: "4px 0",
                      color: "#10b981",
                      fontWeight: "bold",
                    }}
                  >
                    🌱 <strong>決めた改善策:</strong> {hist.summary.solution}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
