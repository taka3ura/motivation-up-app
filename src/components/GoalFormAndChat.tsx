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

interface GoalFormAndChatProps {
  onGoalComplete: (goal: {
    qualification: string;
    purpose: string;
    field: string;
    period: string;
  }) => void;
  onGoalReset: () => void;
  isChatComplete: boolean;
  onChatCompleteStatus: (complete: boolean) => void;
}

export const GoalFormAndChat: React.FC<GoalFormAndChatProps> = ({
  onGoalComplete,
  onGoalReset,
  isChatComplete,
  onChatCompleteStatus,
}) => {
  // --- State管理 ---
  const [userType, setUserType] = useState<"学生" | "それ以外" | "">("");

  const [studentFaculty, setStudentFaculty] = useState("");
  const [studentStudy, setStudentStudy] = useState("");
  const [otherJob, setOtherJob] = useState("");
  const [otherTargetJob, setOtherTargetJob] = useState("");

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

  const chatRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null); // textareaからの送信制御用

  const systemInstruction = `あなた（Gemini）は、資格学習者の「内発的動機付け」を引き出す優秀なAIメンターコーチです。
ユーザーが入力した属性や興味をベースに、以下の【4つのステップ】を意識して、1往復につき1つの質問で優しく深掘りしてください。

【対話の4ステップ】
ステップ1：なぜその資格を取りたいのか、きっかけや「現在の関心・課題」を紐解く
ステップ2：資格を取った後、それをどう活かしたいか「未来の理想像」を具体化する
ステップ3：目標を達成するための「具体的な時期・期限」のイメージを固める
ステップ4：これまでの対話から、興味のある分野を含めた「最終的な目標の要約」を提示する

※対話が十分に進み、まとめや要約、終わりの挨拶を伝える際には、必ず文章の最後やどこかに「目標設定が完了しました」または「対話を終了します」というキーワードを含めてください。`;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (step === "chat" && messages.length > 0) {
      localStorage.setItem("chat_history", JSON.stringify(messages));
    }
  }, [messages, step]);

  // AIメッセージからの完了検知
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role === "model") {
      const text = lastMessage.text;
      if (
        text.includes("目標設定が完了しました") ||
        text.includes("対話を終了します") ||
        text.includes("お疲れ様でした") ||
        text.includes("これで深掘りは完了")
      ) {
        if (!isChatComplete) {
          onChatCompleteStatus(true);

          const fieldSummary =
            userType === "学生"
              ? `${studentFaculty} (${studentStudy})`
              : `${otherJob} -> 希望: ${otherTargetJob}`;

          onGoalComplete({
            qualification: qualificationName || "登録された資格",
            purpose: "対話から自動要約された目的",
            field: fieldSummary,
            period: "2026/12/31",
          });
        }
      }
    }
  }, [
    messages,
    isChatComplete,
    userType,
    studentFaculty,
    studentStudy,
    otherJob,
    otherTargetJob,
    qualificationName,
    onChatCompleteStatus,
    onGoalComplete,
  ]);

  // 全部やり直す処理
  const handleResetAll = () => {
    localStorage.removeItem("chat_history");
    setMessages([]);
    setStep("form");
    setUserType("");
    setStudentFaculty("");
    setStudentStudy("");
    setOtherJob("");
    setOtherTargetJob("");
    setQualificationName("");
    setInput("");
    onChatCompleteStatus(false);
    onGoalReset();
  };

  // プロンプトをコピーする処理
  const handleCopyPrompt = () => {
    if (!isChatComplete) return;

    const summaryText = `【これまでの対話の要約】
資格: ${qualificationName}
区分: ${userType}
詳細: ${userType === "学生" ? `${studentFaculty} (${studentStudy})` : `${otherJob} -> 希望: ${otherTargetJob}`}

対話履歴から導き出された目標設定が完了しました。この内容をベースにさらに壁打ちを続けます。`;

    navigator.clipboard
      .writeText(summaryText)
      .then(() => {
        alert("対話の要約プロンプトをクリップボードにコピーしました！");
      })
      .catch((err) => {
        console.error("コピーに失敗しました: ", err);
      });
  };

  const isFormValid = () => {
    if (!qualificationName) return false;
    if (userType === "学生") {
      return studentFaculty.trim() !== "" && studentStudy.trim() !== "";
    }
    if (userType === "それ以外") {
      return otherJob.trim() !== "" && otherTargetJob.trim() !== "";
    }
    return false;
  };

  // --- チャット開始処理 ---
  const handleStartChat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsLoading(true);
    setStep("chat");

    let userIntroduction = "";
    if (userType === "学生") {
      userIntroduction = `私は学生で、学部・学科は「${studentFaculty}」です。現在は「${studentStudy}」について学んだり興味を持ったりしています。`;
    } else {
      userIntroduction = `私は学生以外の立場（社会人・その他）で、現在の状況・お仕事は「${otherJob}」です。将来的には「${otherTargetJob}」という仕事や内容に就きたい・関わりたいと考えています。`;
    }

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
          `対話を開始してください。${userIntroduction}今回は「${qualificationName}」という資格について、取得する目的や背景を深掘りしたいです。まずは【ステップ1】として、この資格に挑戦しようと思ったきっかけや、普段学んでいること・お仕事とどう繋がっているのか、最初の問いかけ（質問）を1つ投げてください。`,
        );
        botText = await result.response.text();
        success = true;
        break;
      } catch (error) {
        console.warn(`[開始エラー] APIキー ${i + 1}番目が失敗しました。`);
      }
    }

    if (success) {
      setMessages([{ role: "model", text: botText }]);
    } else {
      setMessages([{ role: "model", text: "通信エラーが発生しました。" }]);
    }
    setIsLoading(false);
  };

  // --- メッセージ送信処理 ---
  const executeSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading || isChatComplete) return;

    const userText = textToSend.trim();
    setInput("");

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", text: userText },
    ];
    setMessages(updatedMessages);
    setIsLoading(true);

    let botText = "";
    let success = false;

    const formattedHistory = updatedMessages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    const historyPayload = formattedHistory.slice(0, -1);

    for (let i = 0; i < API_KEYS.length; i++) {
      try {
        const currentKey = API_KEYS[i];
        if (!currentKey) continue;

        const tempGenAI = new GoogleGenerativeAI(currentKey);
        const model = tempGenAI.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
          systemInstruction: systemInstruction,
        });

        chatRef.current = model.startChat({ history: historyPayload });
        const result = await chatRef.current.sendMessage(userText);
        botText = await result.response.text();
        success = true;
        break;
      } catch (error) {
        console.warn(`[送信エラー] APIキー ${i + 1}番目が失敗しました。`);
      }
    }

    if (success) {
      setMessages((prev) => [...prev, { role: "model", text: botText }]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "エラーが発生しました。再度送信してください。" },
      ]);
    }
    setIsLoading(false);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    executeSendMessage(input);
  };

  // Textarea用のキーハンドラー (Enterで送信、Shift+Enterで改行)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 日本語変換中のEnterキーは無視するガード
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter") {
      if (!e.shiftKey) {
        // Shiftが押されていなければ送信
        e.preventDefault(); // デフォルトの改行挙動をキャンセル
        executeSendMessage(input);
      }
      // Shiftキーが同時に押されている場合は、通常の改行（何もしない）
    }
  };

  const handleForceComplete = () => {
    onChatCompleteStatus(true);
    const fieldSummary =
      userType === "学生"
        ? `${studentFaculty} (${studentStudy})`
        : `${otherJob} -> 希望: ${otherTargetJob}`;

    onGoalComplete({
      qualification: qualificationName || "登録された資格",
      purpose: "対話から要約された目的",
      field: fieldSummary,
      period: "2026-12-31",
    });
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        minHeight: "0",
      }}
    >
      {step === "form" ? (
        /* 📝 最初のアンケートフォーム画面 */
        <div
          style={{
            padding: "30px 20px",
            maxWidth: "500px",
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <form
            onSubmit={handleStartChat}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                margin: "0 0 5px 0",
                color: "#333",
                textAlign: "center",
              }}
            >
              まずはあなたのことを教えてください
            </h2>

            {/* 1. 区分セレクト */}
            <div style={{ boxSizing: "border-box" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  fontSize: "14px",
                  color: "#555",
                }}
              >
                区分：
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setUserType("学生")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    cursor: "pointer",
                    borderRadius: "6px",
                    border:
                      userType === "学生"
                        ? "2px solid #e67e22"
                        : "1px solid #ccc",
                    backgroundColor: userType === "学生" ? "#fff3cd" : "#fff",
                    color: userType === "学生" ? "#e67e22" : "#555",
                    fontWeight: userType === "学生" ? "bold" : "normal",
                    fontSize: "14px",
                    transition: "all 0.15s ease",
                  }}
                >
                  👨‍🎓 学生
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("それ以外")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    cursor: "pointer",
                    borderRadius: "6px",
                    border:
                      userType === "それ以外"
                        ? "2px solid #e67e22"
                        : "1px solid #ccc",
                    backgroundColor:
                      userType === "それ以外" ? "#fff3cd" : "#fff",
                    color: userType === "それ以外" ? "#e67e22" : "#555",
                    fontWeight: userType === "それ以外" ? "bold" : "normal",
                    fontSize: "14px",
                    transition: "all 0.15s ease",
                  }}
                >
                  🌐 それ以外（社会人・その他）
                </button>
              </div>
            </div>

            {/* 2. 学生用フォーム */}
            {userType === "学生" && (
              <>
                <div style={{ boxSizing: "border-box" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "bold",
                      fontSize: "14px",
                      color: "#555",
                    }}
                  >
                    学部・学科・専攻：
                  </label>
                  <input
                    type="text"
                    value={studentFaculty}
                    onChange={(e) => setStudentFaculty(e.target.value)}
                    placeholder="例：人文学部 心理学科、経営学部"
                    required
                    style={{
                      width: "100%",
                      padding: "10px",
                      marginTop: "4px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ boxSizing: "border-box" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "bold",
                      fontSize: "14px",
                      color: "#555",
                    }}
                  >
                    大学で学んでいることや、興味のあること：
                  </label>
                  <input
                    type="text"
                    value={studentStudy}
                    onChange={(e) => setStudentStudy(e.target.value)}
                    placeholder="例：Kansei工学、UIデザイン、JavaでのWeb開発"
                    required
                    style={{
                      width: "100%",
                      padding: "10px",
                      marginTop: "4px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </>
            )}

            {/* 3. それ以外用フォーム */}
            {userType === "それ以外" && (
              <>
                <div style={{ boxSizing: "border-box" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "bold",
                      fontSize: "14px",
                      color: "#555",
                    }}
                  >
                    現在の職種、または現在の状況：
                  </label>
                  <input
                    type="text"
                    value={otherJob}
                    onChange={(e) => setOtherJob(e.target.value)}
                    placeholder="例：営業職、求職中、一般事務、フリーランス"
                    required
                    style={{
                      width: "100%",
                      padding: "10px",
                      marginTop: "4px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ boxSizing: "border-box" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "bold",
                      fontSize: "14px",
                      color: "#555",
                    }}
                  >
                    今後目指している仕事や、就きたい職種・仕事内容：
                  </label>
                  <input
                    type="text"
                    value={otherTargetJob}
                    onChange={(e) => setOtherTargetJob(e.target.value)}
                    placeholder="例：フルスタックエンジニア、マーケティング職"
                    required
                    style={{
                      width: "100%",
                      padding: "10px",
                      marginTop: "4px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </>
            )}

            {/* 4. 共通：資格名入力 */}
            <div style={{ boxSizing: "border-box" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "bold",
                  fontSize: "14px",
                  color: "#555",
                }}
              >
                今取りたい資格：
              </label>
              <input
                type="text"
                value={qualificationName}
                onChange={(e) => setQualificationName(e.target.value)}
                placeholder="例：ITパスポート、基本情報技術者"
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "4px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* 5. 送信ボタン */}
            <button
              type="submit"
              disabled={!isFormValid()}
              style={{
                padding: "12px",
                cursor: !isFormValid() ? "not-allowed" : "pointer",
                backgroundColor: !isFormValid() ? "#ccc" : "#e67e22",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                fontSize: "15px",
                marginTop: "10px",
                width: "100%",
                boxSizing: "border-box",
                transition: "background-color 0.2s",
              }}
            >
              🚀 目的の深掘りを始める
            </button>
          </form>
        </div>
      ) : (
        /* 💬 チャット画面 */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "100%",
            backgroundColor: "#fff",
            minHeight: "0",
          }}
        >
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              borderBottom: "1px solid #eee",
              backgroundColor: "#fff",
              flexShrink: 0,
            }}
          >
            <h3 style={{ margin: 0 }}>🎯 資格取得の目的を明確にする対話</h3>
          </div>

          <div
            style={{
              flexGrow: 1,
              overflowY: "auto",
              padding: "20px",
              backgroundColor: "#fafafa",
              minHeight: "0",
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  textAlign: msg.role === "user" ? "right" : "left",
                  margin: "12px 0",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    backgroundColor: msg.role === "user" ? "#dcf8c6" : "#fff",
                    border: msg.role === "user" ? "none" : "1px solid #e0e0e0",
                    whiteSpace: "pre-wrap",
                    maxWidth: "85%",
                    fontSize: "15px",
                    lineHeight: "1.5",
                    wordBreak: "break-all", // 枠の右端での自動折り返しを保証
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div
                style={{ color: "#999", fontSize: "14px", padding: "10px 0" }}
              >
                メンターAIが思考中...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div
            style={{
              padding: "20px",
              borderTop: "1px solid #eee",
              backgroundColor: "#fff",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            {isChatComplete && (
              <div
                style={{
                  marginBottom: "15px",
                  padding: "12px 15px",
                  backgroundColor: "#e8f4fd",
                  border: "1px solid #bce0fd",
                  borderRadius: "6px",
                  color: "#1d6fa5",
                  fontSize: "14px",
                  lineHeight: "1.6",
                }}
              >
                🎉 <strong>目標設定の対話が完了しました！</strong>
                <br />
                「対話の要約プロンプトをコピー」ボタンがアンロックされました。
                コピーして外部のAIに貼り付けることで、さらに深い壁打ちを続けられます！
              </div>
            )}

            {/* 📝 改良した入力フォーム部分（textareaに変更） */}
            <form
              ref={formRef}
              onSubmit={handleFormSubmit}
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-end", // 入力欄が広がってもボタンは下揃えをキープ
                marginBottom: "15px",
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isChatComplete
                    ? "対話は終了しました"
                    : "メッセージを入力... (Enterで送信 / Shift+Enterで改行)"
                }
                disabled={isLoading || isChatComplete}
                // 入力された改行の数に応じて rows を 1〜5行 まで動的に変化させる
                rows={Math.min(5, input.split("\n").length || 1)}
                style={{
                  flexGrow: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  fontSize: "14px",
                  backgroundColor: isChatComplete ? "#f5f5f5" : "#fff",
                  resize: "none", // ユーザーの手動リサイズは無効化
                  minHeight: "38px",
                  lineHeight: "1.4",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  wordBreak: "break-all",
                  transition: "border-color 0.2s", // フォーカス時のアニメーションを滑らかに
                }}
                // インラインスタイルで擬似クラス（:focus）を制御するためのハック
                onFocus={(e) => {
                  if (!isChatComplete) {
                    e.target.style.borderColor = "#e67e22";
                    e.target.style.outline = "none"; // ブラウザ標準の黒い太枠を消去
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ccc";
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || isChatComplete}
                style={{
                  padding: "10px 16px",
                  backgroundColor: isChatComplete ? "#ccc" : "#e67e22",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: isChatComplete ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  height: "38px", // textareaの1行目の高さにジャストフィット
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                送信
              </button>
            </form>
            {/* 🛠️ ボタン配置エリア */}
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                type="button"
                onClick={handleResetAll}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: "#555",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "background-color 0.2s",
                }}
              >
                🔄 やり直す
              </button>

              <button
                type="button"
                onClick={handleCopyPrompt}
                disabled={!isChatComplete}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  backgroundColor: isChatComplete ? "#2ecc71" : "#e0e0e0",
                  border: isChatComplete ? "none" : "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: isChatComplete ? "#fff" : "#999",
                  cursor: isChatComplete ? "pointer" : "not-allowed",
                  textAlign: "center",
                  transition: "background-color 0.2s",
                }}
              >
                📋 プロンプトをコピー
              </button>
            </div>

            {!isChatComplete && messages.length > 2 && (
              <span
                onClick={handleForceComplete}
                style={{
                  fontSize: "11px",
                  color: "#bbb",
                  textAlign: "right",
                  marginTop: "8px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                [デバッグ用: 対話を強制終了する]
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
