import React, { useState, useEffect, useRef } from "react";
import { useAutoResizeTextarea } from "../hooks/useAutoResizeTextarea";
import {
  sendChat,
  generateText,
  type ChatMessage as Message,
} from "../lib/gemini";

// 今日の日付を "YYYY-MM-DD" で返す。toISOStringはUTC基準で日本の早朝に前日になるため、端末のローカル時間で組み立てる
const getTodayDateString = () => {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${mm}-${dd}`;
};

// AIが返す "YYYY-MM-DD" を表示用の "YYYY/MM/DD" に変える。日付の形でなければそのまま返す
const formatDeadline = (deadline: string) =>
  /^\d{4}-\d{1,2}-\d{1,2}$/.test(deadline) ? deadline.replace(/-/g, "/") : deadline;

interface FinalGoal {
  qualification: string;
  challenge: string;
  idealFuture: string;
  deadline: string;
}

interface GoalFormAndChatProps {
  onGoalComplete: (goal: FinalGoal) => void;
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null); // textareaからの送信制御用
  const textareaRef = useAutoResizeTextarea(input, 120, step);

  const systemInstruction = `あなた（Gemini）は、資格学習者の「内発的動機付け」を引き出す優秀なAIメンターコーチです。

【今日の日付】
今日は${getTodayDateString()}です。「来年の春」「半年後」など期限が相対的に語られた場合は、必ずこの日付を基準に「何年何月」へ換算してください。期限は今日より未来の日付になります。あなた自身の知識にある年を今年だと思い込まないでください。

【最初に与えられたユーザー情報】
- ユーザー属性: ${userType}（${userType === "学生" ? studentFaculty + " / " + studentStudy : otherJob + " -> " + otherTargetJob}）
- 目標資格: ${qualificationName}

【対話の4ステップ】
1. なぜ「${qualificationName}」が必要なのか、きっかけを深掘り（ユーザー属性を元に具体的に質問する）
2. 資格を取った後、その属性でどう活躍したいか「未来の理想像」の具体化
3. 目標を達成するための「具体的な期限」のイメージ固め
4. これまでの対話から、以下の形式で「目標設定」を要約し、最後に「目標設定が完了しました」と出力する。

【要約フォーマット】
--------------------------------------
【目標の要約】
- 資格: ${qualificationName}
- 現状の課題: （ユーザーの入力に基づく）
- 理想の未来: （ユーザーの入力に基づく）
- 達成期限: （ユーザーの入力に基づき、今日の日付から換算した「YYYY年M月」の形式）
--------------------------------------
  
※常に上記のユーザー情報を念頭に置き、文脈がずれないように注意してください。`;

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
    if (messages.length === 0 || isChatComplete) return;

    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage.role === "model" &&
      (lastMessage.text.includes("目標設定が完了しました") ||
        lastMessage.text.includes("対話を終了します") ||
        lastMessage.text.includes("お疲れ様でした") ||
        lastMessage.text.includes("これで深掘りは完了"))
    ) {
      const finalizeGoal = async () => {
        setIsLoading(true);
        try {
          const summary = await summarizeGoalWithRetry(messages);
          onChatCompleteStatus(true);

          // 確定データの通知
          onGoalComplete({
            qualification: qualificationName || summary.qualification,
            challenge: summary.challenge, // purposeから修正
            idealFuture: summary.idealFuture,
            deadline: formatDeadline(summary.deadline),
          });
        } catch (error) {
          console.error("要約に失敗しました:", error);
          onChatCompleteStatus(true);

          // 失敗時は最低限の情報で登録
          onGoalComplete({
            qualification: qualificationName || "不明",
            challenge: "対話から抽出失敗",
            idealFuture: "未定義",
            deadline: "未定",
          });
        } finally {
          setIsLoading(false);
        }
      };

      finalizeGoal();
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
    // 1. 全会話履歴をフォーマットする
    const historyText = messages
      .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.text}`)
      .join("\n\n");

    // 2. コピー用プロンプトの組み立て
    const fullPrompt = `【これまでの対話履歴】
${historyText}

---
【指示】
これまでの対話履歴を踏まえて、資格学習者の「内発的動機付け」を引き出すAIメンターとして対話を続けてください。
資格取得の目的をさらに明確にするために、深掘りを行ってください。`;

    // 3. クリップボードへコピー
    navigator.clipboard
      .writeText(fullPrompt)
      .then(() => {
        alert(
          "全対話履歴と続きの指示をコピーしました！他のAIに貼り付けて対話を再開してください。",
        );
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

    try {
      botText = await sendChat({
        systemInstruction,
        history: [],
        message: `対話を開始してください。${userIntroduction}今回は「${qualificationName}」という資格について、取得する目的や背景を深掘りしたいです。まずは【ステップ1】として、この資格に挑戦しようと思ったきっかけや、普段学んでいること・お仕事とどう繋がっているのか、最初の問いかけ（質問）を1つ投げてください。`,
        label: "開始",
      });
      success = true;
    } catch {
      // 全キー失敗時は下のエラーメッセージを表示
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

    // 今回の発言を除いた履歴を渡す。Geminiは履歴の先頭がuserである必要があるため、先頭のmodel発言は除く
    let historyPayload = updatedMessages.slice(0, -1);
    if (historyPayload.length > 0 && historyPayload[0].role === "model") {
      historyPayload = historyPayload.slice(1);
    }

    try {
      botText = await sendChat({
        systemInstruction,
        history: historyPayload,
        message: userText,
        label: "送信",
      });
      success = true;
    } catch {
      // 全キー失敗時は下のエラーメッセージを表示
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

  const summarizeGoalWithRetry = async (history: Message[]) => {
    // --- 修正箇所: 配列の最後のメッセージだけを対象にする ---
    const lastMessage = history[history.length - 1];
    const targetText = lastMessage.text;

    const prompt = `以下の対話から、ユーザーの資格取得目標を抽出し、JSON形式で返してください。
【重要】
1. 出力はJSON形式のみ。前置き不要。
2. 今日の日付は${getTodayDateString()}です。期限(deadline)はこの日付を基準に算出し、必ず "YYYY-MM-DD" 形式で出力してください。「来年の春」のような表現は、今日より未来の日付に直してください。
{ 
  "qualification": "資格名", 
  "challenge": "現状の課題やきっかけ", 
  "idealFuture": "資格取得後の理想の姿", 
  "deadline": "達成期限(YYYY-MM-DD)" 
}
対話内容: ${targetText}`;

    // AIの返答がJSONとして読めない場合もあるため、数回やり直す
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const text = await generateText(prompt, "要約");
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSONが見つかりません");

        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error(`要約エラー詳細 (${attempt}/${MAX_ATTEMPTS}回目):`, e);
      }
    }
    throw new Error("要約に失敗しました");
  };

  // 画面描画
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
                    placeholder="例：プログラミング、Webアプリ開発、英語、数学"
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
                    placeholder="例：営業職、求職中、一般事務"
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
                    placeholder="例：事務職、SE"
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
                placeholder="例：ITパスポート、簿記3級"
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
                「これまでの対話をコピー」ボタンがアンロックされました。
                コピーして自分のAIに貼り付けることで、さらに深い壁打ちを続けられます！
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
                ref={textareaRef}
                // 高さは useLayoutEffect で内容に合わせて調整する（改行・自動折り返しの両方に対応）
                rows={1}
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
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
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
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
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
                📋 これまでの対話をコピー
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
