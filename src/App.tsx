import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { GoalFormAndChat } from "./components/GoalFormAndChat.tsx";
import { Consultation } from "./components/Consultation.tsx";
import { TaskManager } from "./components/TaskManager.tsx";

interface FinalGoal {
  qualification: string; // 目指す資格
  purpose: string; // 資格を取る目的
  field: string; // 興味のある分野
  period: string; // いつまでに達成したいか
  summary?: string; // 会話の要約（プロンプト用）
}

const AutoResizeTextarea = ({
  value,
  onChange,
  onFocus,
  onBlur,
  style,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFocus: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  style: React.CSSProperties;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    textarea.style.overflowY = "hidden";
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      rows={1}
      maxLength={100}
      style={{ ...style, lineHeight: "24px" }}
    />
  );
};

function App() {
  const [activeMenu, setActiveMenu] = useState<"goal" | "task" | "consult">(
    "goal",
  );

  const [currentGoal, setCurrentGoal] = useState<FinalGoal | null>(() => {
    const saved = localStorage.getItem("final_goal");
    return saved ? JSON.parse(saved) : null;
  });

  const [isChatComplete, setIsChatComplete] = useState<boolean>(() => {
    return localStorage.getItem("chat_complete") === "true";
  });

  const [copied, setCopied] = useState(false);

  const handleGoalComplete = (goal: FinalGoal) => {
    setCurrentGoal(goal);
    localStorage.setItem("final_goal", JSON.stringify(goal));
  };

  const handleChatCompleteStatus = (complete: boolean) => {
    setIsChatComplete(complete);
    localStorage.setItem("chat_complete", complete ? "true" : "false");
  };

  // 🧹 親側で全データを一元リセットする関数
  const handleGoalReset = () => {
    setCurrentGoal(null);
    setIsChatComplete(false);
    localStorage.removeItem("final_goal");
    localStorage.removeItem("chat_complete");
    localStorage.removeItem("chat_history"); // チャット履歴も確実に消去

    // 画面を確実に「目標設定（goal）」に戻してリフレッシュさせる
    setActiveMenu("goal");
  };

  const handleInputChange = (key: string, value: string) => {
    if (!currentGoal) return;

    const updatedGoal = {
      ...currentGoal,
      [key]: value,
    } as FinalGoal;

    setCurrentGoal(updatedGoal);
    localStorage.setItem("final_goal", JSON.stringify(updatedGoal));
  };

  const handleCopyPrompt = () => {
    if (!currentGoal) return;

    const promptText = `あなたは優秀なキャリアメンター、およびエンジニアリングのコーチです。
現在開発中の目標設定アプリでのチャット内容を引き継いで、ユーザーのさらに深い相談や壁打ちに付き合ってください。

以下の【現在の状況】を前提知識として頭に入れ、ユーザーのモチベーション向上や、さらに具体的なアクションプランに落とし込むための「深掘りの質問」を1つずつ投げてください。

【現在の状況】
🏷️ 目指す資格: ${currentGoal.qualification}
🌈 目的: ${currentGoal.purpose}
📖 興味のある分野: ${currentGoal.field}
📅 時期: ${currentGoal.period}

準備ができたら、引き継ぎを歓迎する一言と、最初の深掘り質問をお願いします。`;

    navigator.clipboard.writeText(promptText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const calculateRemainingDays = (periodText: string): string => {
    if (!periodText) return "";
    const matches = periodText.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
    if (!matches) return "（正確な日付を入力すると残り日数が出ます）";

    const year = parseInt(matches[1], 10);
    const month = parseInt(matches[2], 10) - 1;
    const day = parseInt(matches[3], 10);

    const targetDate = new Date(year, month, day);
    const today = new Date();

    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `⏳ 目標達成まであと ${diffDays} 日`;
    if (diffDays === 0) return "🎉 ついに目標達成の当日です！";
    return `✅ 目標の期日から ${Math.abs(diffDays)} 日経過しています`;
  };

  const inputStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    fontSize: "14px",
    fontFamily: "inherit",
    color: "#444",
    width: "100%",
    padding: "6px 8px",
    margin: "4px 0 0 0",
    outline: "none",
    resize: "none",
    display: "block",
    borderRadius: "4px",
    transition: "background-color 0.15s ease",
    boxSizing: "border-box",
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.backgroundColor = "#fffdf3";
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.backgroundColor = "transparent";
  };

  return (
    <div
      className="app-container"
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#fff",
        width: "100%",
      }}
    >
      {/* 🟢 【左側】：メニューバー */}
      <aside
        className="sidebar"
        style={{
          width: "20%",
          borderRight: "3px solid #eee",
          padding: "20px",
          position: "sticky",
          top: 0,
          height: "100vh",
          boxSizing: "border-box",
        }}
      >
        <h3>メニュー</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li
            onClick={() => setActiveMenu("goal")}
            className={`sidebar-menu-item ${activeMenu === "goal" ? "active" : ""}`}
          >
            🎯 目的の設定
          </li>
          <li
            onClick={() => setActiveMenu("task")}
            className={`sidebar-menu-item ${activeMenu === "task" ? "active" : ""}`}
          >
            📝 タスク管理
          </li>
          <li
            onClick={() => setActiveMenu("consult")}
            className={`sidebar-menu-item ${activeMenu === "consult" ? "active" : ""}`}
          >
            💬 モチベ低下時の相談
          </li>
        </ul>
      </aside>

      {/* 🟢 【中央】：メインコンテンツエリア */}
      <main
        className="main-content"
        style={{
          width: "55%",
          minWidth: "0",
          height: "100vh",
          overflow: "hidden",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          className="content-body"
          style={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: "0",
          }}
        >
          {activeMenu === "goal" && (
            <GoalFormAndChat
              onGoalComplete={handleGoalComplete}
              onGoalReset={handleGoalReset}
              isChatComplete={isChatComplete}
              onChatCompleteStatus={handleChatCompleteStatus}
            />
          )}
          {activeMenu === "task" && (
            <div style={{ padding: "20px", overflowY: "auto", height: "100%" }}>
              <TaskManager />
            </div>
          )}
          {activeMenu === "consult" && (
            <div style={{ padding: "20px", overflowY: "auto", height: "100%" }}>
              <Consultation
                currentQualification={currentGoal?.qualification || ""}
              />
            </div>
          )}
        </div>

        {/* 下部ボタンエリア */}
        {activeMenu === "goal" && currentGoal && (
          <div
            style={{
              padding: "0 20px 20px 20px",
              backgroundColor: "#fff",
              borderTop: "1px solid #eee",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                marginTop: "15px",
              }}
            >
              <button
                onClick={handleGoalReset}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #dc3545",
                  backgroundColor: "#fff",
                  color: "#dc3545",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                🔄 最初からやり直す
              </button>
              <button
                onClick={handleCopyPrompt}
                disabled={!isChatComplete}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: isChatComplete ? "#e67e22" : "#ccc",
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: isChatComplete ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  transition: "all 0.2s ease",
                }}
              >
                {copied
                  ? "✅ コピーしました！"
                  : "📋 对話の要約プロンプトをコピー"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 🟢 【右側】：サポート ＆ キャラクターエリア */}
      <aside
        className="support-bar"
        style={{
          width: "25%",
          borderLeft: "3px solid #eee",
          padding: "20px",
          position: "sticky",
          top: 0,
          height: "100vh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          className="current-goal"
          style={{
            border: "1px solid #ffeeba",
            backgroundColor: "#fff3cd",
            padding: "15px",
            borderRadius: "8px",
            textAlign: "left",
          }}
        >
          {currentGoal ? (
            <div
              style={{
                fontSize: "14px",
                color: "#555",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxSizing: "border-box",
              }}
            >
              {/* 1. 目指す資格 */}
              <div>
                <p
                  style={{
                    margin: "0",
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  🏷️ 目指す資格:
                </p>
                <AutoResizeTextarea
                  value={currentGoal.qualification}
                  onChange={(e) =>
                    handleInputChange("qualification", e.target.value)
                  }
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={{
                    ...inputStyle,
                    color: "#e67e22",
                    fontWeight: "bold",
                    fontSize: "15px",
                  }}
                />
              </div>

              {/* 2. 目的 */}
              <div>
                <p
                  style={{
                    margin: "0",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  🌈 目的:
                </p>
                <AutoResizeTextarea
                  value={currentGoal.purpose}
                  onChange={(e) => handleInputChange("purpose", e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={inputStyle}
                />
              </div>

              {/* 3. 興味のある分野 */}
              <div>
                <p
                  style={{
                    margin: "0",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  📖 興味のある分野:
                </p>
                <AutoResizeTextarea
                  value={currentGoal.field}
                  onChange={(e) => handleInputChange("field", e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={inputStyle}
                />
              </div>

              {/* 4. 時期 */}
              <div>
                <p
                  style={{
                    margin: "0",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  📅 時期:
                </p>
                <AutoResizeTextarea
                  value={currentGoal.period}
                  onChange={(e) => handleInputChange("period", e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={inputStyle}
                />

                <div
                  style={{
                    marginTop: "8px",
                    padding: "6px 12px",
                    backgroundColor: isChatComplete ? "#e67e22" : "#ccc",
                    color: "#fff",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    display: "inline-block",
                  }}
                >
                  {calculateRemainingDays(currentGoal.period)}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ margin: "5px 0 0 0", color: "#666" }}>
              （チャット完了後にここに反映されます）
            </p>
          )}
        </div>

        <div
          className="character-area"
          style={{
            border: "1px solid #ddd",
            padding: "15px",
            borderRadius: "8px",
            textAlign: "center",
            backgroundColor: "#f9f9f9",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🤖</div>
          <p style={{ margin: 0, fontSize: "14px" }}>
            {currentGoal
              ? isChatComplete
                ? "「素晴らしい目標が固まったね！プロンプトを持ってさらに深掘りしてみよう！」"
                : "「目標に向かって一歩ずつ進おう！応援してるよ！」"
              : "「まずは中央の画面で、あなたのことを教えてね！」"}
          </p>
        </div>
      </aside>
    </div>
  );
}

export default App;
