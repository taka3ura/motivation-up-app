import React, { useState, useEffect, useRef } from "react";
import { sendChat, type ChatMessage as Message } from "../lib/gemini";
import { useAutoResizeTextarea } from "../hooks/useAutoResizeTextarea";
import { useCloudSyncedState } from "../hooks/useCloudSyncedState";

interface ConsultationHistory {
  id: string;
  date: string;
  topic: string;
  category: string;
  summary: {
    trouble: string;
    solution: string;
  };
}

// 目的設定機能（GoalFormAndChat）で確定した目標。未設定ならnull
interface Goal {
  topic: string;
  challenge: string;
  idealFuture: string;
  deadline: string;
}

interface ConsultationProps {
  goal: Goal | null;
}

// 相談履歴の「当時の悩み」「決めた改善策」を、右上の目標表示と同じ感覚で直接編集できる入力欄
const EditableHistoryField = ({
  value,
  onChange,
  color,
  bold,
}: {
  value: string;
  onChange: (value: string) => void;
  color: string;
  bold?: boolean;
}) => {
  const textareaRef = useAutoResizeTextarea(value, 200);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      style={{
        display: "block",
        width: "100%",
        marginTop: "2px",
        padding: "2px 4px",
        border: "1px solid transparent",
        borderRadius: "4px",
        backgroundColor: "transparent",
        color,
        fontWeight: bold ? "bold" : "normal",
        fontSize: "13px",
        lineHeight: "1.6",
        fontFamily: "inherit",
        resize: "none",
        boxSizing: "border-box",
        transition: "border-color 0.15s ease, background-color 0.15s ease",
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "var(--accent)";
        e.target.style.backgroundColor = "#fff";
        e.target.style.outline = "none";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "transparent";
        e.target.style.backgroundColor = "transparent";
      }}
      onMouseEnter={(e) => {
        if (document.activeElement !== e.currentTarget) {
          e.currentTarget.style.borderColor = "var(--accent-border)";
        }
      }}
      onMouseLeave={(e) => {
        if (document.activeElement !== e.currentTarget) {
          e.currentTarget.style.borderColor = "transparent";
        }
      }}
    />
  );
};

export const Consultation: React.FC<ConsultationProps> = ({ goal }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState<"select" | "chat">("select");
  const [input, setInput] = useState("");
  const [freeInput, setFreeInput] = useState(""); // すでに悩みが決まっている人向けの自由入力欄
  const [isLoading, setIsLoading] = useState(false);

  // ログイン中はFirestoreにも自動で同期される（複数端末で共有される）
  const [historyList, setHistoryList] = useCloudSyncedState<
    ConsultationHistory[]
  >("consultation_history", []);

  const chatBoxRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useAutoResizeTextarea(input, 120, step);
  const freeFormRef = useRef<HTMLFormElement>(null);
  const freeInputRef = useAutoResizeTextarea(freeInput, 120, step);

  const categories = [
    { id: "difficult", label: "😫 内容が難しくて挫折しそう…" },
    { id: "lazy", label: "🥱 やる気が出なくてサボってしまう…" },
    { id: "no_time", label: "⏰ 時間が足りなくて焦っている…" },
    { id: "lost", label: "❓ なぜこの勉強をしてるか分からなくなった…" },
  ];

  // チャット欄の中だけを、最新メッセージの「先頭」が上端にくるようスクロールする
  // （末尾までスクロールすると、長い返信の途中から表示されて読みにくいため。
  //  scrollIntoViewだとページ全体も動いてしまうので、欄の中だけを計算してスクロールする）
  useEffect(() => {
    const box = chatBoxRef.current;
    const target = lastMessageRef.current;
    if (!box || !target) return;
    const offset =
      target.getBoundingClientRect().top -
      box.getBoundingClientRect().top +
      box.scrollTop;
    box.scrollTo({ top: offset, behavior: "smooth" });
  }, [messages]);

  // 目的設定機能で確定した目標を、GROWモデルの「Goal」段階で使える形に整形する
  const goalSummaryText = goal
    ? `・頑張っていること: ${goal.topic || "未設定"}
・現状の課題/きっかけ: ${goal.challenge || "未設定"}
・理想の未来: ${goal.idealFuture || "未設定"}
・達成期限: ${goal.deadline || "未設定"}`
    : "（まだ「目的の設定」機能で目標が設定されていません。無理に目的の話に触れず、今回の相談内容だけを聞いてください）";

  // 💡 GROWモデル（Goal・Reality・Options・Will）に沿ったコーチングの指示文
  const systemInstruction = `あなたは、学習者の「学び」へのモチベーション回復を支援するAIコーチです。資格取得に限らず、プログラミングや語学、楽器、スポーツの技術など、あらゆる学習・習得に取り組む人を対象にします。
GROWモデル（Goal・Reality・Options・Will）の流れに沿って対話を進めてください。

【学習者が「目的の設定」機能で言語化した目的】
${goalSummaryText}

【今回の相談のきっかけ】
${selectedCategory}

【基本ルール】
・学習者を否定せず、まず気持ちを受け止めてください。
・1回の発言は簡潔にし、質問は必ず「1つ」だけにしてください。複数の質問を一度に投げないでください。
・解決策を押しつけないでください。Optionsの段階で複数の選択肢を示し、最終的にどれを選ぶかは必ず学習者自身に決めさせてください。
・各段階で十分な手がかりが得られたら、次の段階へ進んでください。同じ段階で質問を重ねすぎないでください。
・学習者が「それは違う」「そうじゃない」などと訂正した場合は、前の段階に戻って聞き直してください（例：選択肢がしっくりこない→Realityの確認に戻る）。

【対話の流れ】
1. Goal + Reality
   ・相談内容に共感し、上記の「学習者が設定した目的」を一言で思い出させてください（目的が未設定の場合は、無理に触れなくて構いません）。
   ・今回の相談のきっかけをもとに、状況を具体的にするための質問をしてください。
2. Options
   ・状況を一文でまとめ、「この理解で合っていますか？」と確認してください。
   ・すぐに実行できる小さな選択肢を2〜3個、番号付きで示し、学習者に選ばせてください。テンプレート的な定番の対策（ポモドーロ法など）に偏らず、ここまでに聞き取った具体的な状況に合わせて、その都度あなた自身で考えてください。学習者自身の案も歓迎してください。
3. Will
   ・選んだ案を「いつ・何を・どれくらい」の具体的な行動に落とし込んでください。
   ・行動が決まったあとも学習者が話を続けたら、それに応じてください。
   ・学習者が納得し、行動が決まったら対話を終了し、必ず以下のフォーマット（3行程度）で「今回の相談のまとめ」を出力して締めくくってください。

---
【相談のまとめ】
・具体的な悩み：[Realityで明らかになった、学習者の具体的な状況の要約]
・決定した改善策：[Willで決めた、いつ・何を・どれくらいの行動]
---

【相談内容ごとの深掘りの視点（あくまで参考。学習者自身の言葉を最優先してください）】
・内容が難しい：どの部分でつまずいているか
・やる気が出ない：いつ頃から、何がきっかけか
・時間が足りない：締切と、1日に使える時間
・学習の目的がわからなくなった：上記の「学習者が設定した目的」が今の自分にも当てはまるか確認し、当てはまらない場合は、目的設定機能で目的を再設定するよう勧めてください`;

  const handleStartConsultation = async (categoryLabel: string) => {
    setSelectedCategory(categoryLabel);
    setStep("chat");
    setIsLoading(true);

    let botText = "";
    let success = false;
    // ⭕ 1発目をuserの発言として定義する（Gemini SDKのエラールール対策）
    const initialPrompt = `相談を開始します。私は今、「${categoryLabel}」という悩みを抱えています。先輩、話を聞いてください。`;

    try {
      botText = await sendChat({
        systemInstruction,
        history: [],
        message: initialPrompt,
        label: "相談開始",
      });
      success = true;
    } catch {
      // 全キー失敗時は下のエラーメッセージを表示
    }

    if (success) {
      // ⭕ userのトリガー発言と、modelの最初の返答をセットで履歴に保存！
      // 画面には実際に選んだ/打った一言だけを見せ、AIに送った定型文はapiTextとして裏に持たせる
      setMessages([
        { role: "user", text: categoryLabel, apiText: initialPrompt },
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

  // Enterで送信、Shift+Enterで改行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 日本語変換中のEnterキーは無視するガード
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  // すでに悩みが決まっている人向け：自由入力で相談を始める
  const handleStartFreeConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeInput.trim()) return;
    handleStartConsultation(freeInput.trim());
    setFreeInput("");
  };

  const handleFreeInputKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      freeFormRef.current?.requestSubmit();
    }
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

    try {
      // ⭕ 履歴は最初がuserの形式（messages）のまま渡す
      botText = await sendChat({
        systemInstruction,
        history: messages,
        message: userText,
        label: "相談送信",
      });
      success = true;
    } catch {
      // 全キー失敗時は下のエラー処理へ
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
              topic: goal?.topic || "目標",
              category: selectedCategory,
              summary: {
                trouble: troubleMatch[1].trim(),
                solution: solutionMatch[1].trim(),
              },
            };

            setHistoryList((prev) => [newHistory, ...prev]);
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

  // 相談履歴の「当時の悩み」「決めた改善策」を編集して保存する
  const handleHistoryFieldChange = (
    id: string,
    field: "trouble" | "solution",
    value: string,
  ) => {
    setHistoryList((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, summary: { ...h.summary, [field]: value } } : h,
      ),
    );
  };

  // 相談履歴を1件削除する
  const handleDeleteHistory = (id: string) => {
    setHistoryList((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      return updated;
    });
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

            {/* すでに相談したい内容が決まっている人向けの自由入力欄 */}
            <form
              ref={freeFormRef}
              onSubmit={handleStartFreeConsultation}
              style={{ marginBottom: "20px" }}
            >
              <textarea
                ref={freeInputRef}
                value={freeInput}
                onChange={(e) => setFreeInput(e.target.value)}
                onKeyDown={handleFreeInputKeyDown}
                placeholder="すでに相談したいことが決まっていたら、ここに書いてね (Enterで送信 / Shift+Enterで改行)"
                rows={1}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "2px solid #adb5bd",
                  fontSize: "14px",
                  resize: "none",
                  minHeight: "38px",
                  lineHeight: "1.4",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  wordBreak: "break-all",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--accent)";
                  e.target.style.outline = "none";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#adb5bd";
                }}
                onMouseEnter={(e) => {
                  if (document.activeElement !== e.currentTarget) {
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.currentTarget) {
                    e.currentTarget.style.borderColor = "#adb5bd";
                  }
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "8px",
                }}
              >
                <button
                  type="submit"
                  disabled={!freeInput.trim()}
                  onMouseEnter={(e) => {
                    if (freeInput.trim()) {
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.backgroundColor =
                        "var(--accent-light-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.backgroundColor = freeInput.trim()
                      ? "var(--accent-light)"
                      : "#ccc";
                  }}
                  style={{
                    padding: "10px 16px",
                    height: "38px",
                    backgroundColor: !freeInput.trim()
                      ? "#ccc"
                      : "var(--accent-light)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: !freeInput.trim() ? "not-allowed" : "pointer",
                    flexShrink: 0,
                    transition:
                      "background-color 0.2s, transform 0.15s ease",
                  }}
                >
                  相談する
                </button>
              </div>
            </form>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                margin: "20px 0",
                color: "#999",
                fontSize: "12px",
              }}
            >
              <div style={{ flexGrow: 1, borderTop: "1px solid #eee" }} />
              または、よくある悩みから選ぶ
              <div style={{ flexGrow: 1, borderTop: "1px solid #eee" }} />
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleStartConsultation(cat.label)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--accent-bg)";
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.borderLeftColor = "var(--accent)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                    e.currentTarget.style.borderColor = "#ddd";
                    e.currentTarget.style.borderLeftColor = "var(--accent)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                  style={{
                    padding: "12px 14px",
                    textAlign: "left",
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #ddd",
                    borderLeft: "4px solid var(--accent)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    transition: "all 0.15s ease",
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#5a6268";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#6c757d";
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: "12px",
                  backgroundColor: "#6c757d",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
              >
                相談を終了する
              </button>
            </div>

            <div
              ref={chatBoxRef}
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
                return (
                  <div
                    key={idx}
                    ref={
                      idx === messages.length - 1 ? lastMessageRef : undefined
                    }
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
                        textAlign: "left", // 吹き出しの位置は右でも、文字は改行しても左詰め
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
            </div>

            <form
              ref={formRef}
              onSubmit={handleSendMessage}
              style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="先輩に気持ちを打ち明けてみて... (Enterで送信 / Shift+Enterで改行)"
                disabled={isLoading}
                rows={1}
                style={{
                  flexGrow: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  fontSize: "14px",
                  resize: "none",
                  minHeight: "38px",
                  lineHeight: "1.4",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  wordBreak: "break-all",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--accent)";
                  e.target.style.outline = "none";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ccc";
                }}
                onMouseEnter={(e) => {
                  if (document.activeElement !== e.currentTarget) {
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.currentTarget) {
                    e.currentTarget.style.borderColor = "#ccc";
                  }
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                onMouseEnter={(e) => {
                  if (!isLoading && input.trim()) {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.backgroundColor =
                      "var(--accent-light-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.backgroundColor =
                    "var(--accent-light)";
                }}
                style={{
                  padding: "8px 16px",
                  height: "38px",
                  backgroundColor: "var(--accent-light)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                  opacity: isLoading || !input.trim() ? 0.6 : 1,
                  flexShrink: 0,
                  transition: "background-color 0.2s, transform 0.15s ease",
                }}
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
              // 内側のスクロールは持たせず、画面全体のスクロールに任せる
              padding: "6px",
              margin: "-6px",
            }}
          >
            {historyList.map((hist) => (
              <div
                key={hist.id}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 16px -4px var(--accent-border)";
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
                style={{
                  border: "1px solid #e2e8f0",
                  borderLeft: "4px solid var(--accent)",
                  borderRadius: "8px",
                  padding: "15px",
                  backgroundColor: "#f8fafc",
                  transition:
                    "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px",
                    color: "#64748b",
                    marginBottom: "8px",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "8px",
                    textAlign: "left",
                  }}
                >
                  <span>
                    📅 {hist.date} ｜ 🏷️ {hist.topic}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteHistory(hist.id)}
                    title="この履歴を削除"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fecaca";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#fee2e2";
                    }}
                    style={{
                      border: "1px solid #fecaca",
                      backgroundColor: "#fee2e2",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      flexShrink: 0,
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    削除
                  </button>
                </div>
                <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                  <div style={{ margin: "4px 0" }}>
                    <strong style={{ color: "#ef4444" }}>
                      ❌ 当時の悩み:
                    </strong>
                    <EditableHistoryField
                      value={hist.summary.trouble}
                      onChange={(v) =>
                        handleHistoryFieldChange(hist.id, "trouble", v)
                      }
                      color="#ef4444"
                    />
                  </div>
                  <div style={{ margin: "4px 0" }}>
                    <strong style={{ color: "#10b981" }}>
                      🌱 決めた改善策:
                    </strong>
                    <EditableHistoryField
                      value={hist.summary.solution}
                      onChange={(v) =>
                        handleHistoryFieldChange(hist.id, "solution", v)
                      }
                      color="#10b981"
                      bold
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
