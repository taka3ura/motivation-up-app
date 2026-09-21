import React, { useState, useRef, useLayoutEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import "./App.css";
import { GoalFormAndChat } from "./components/GoalFormAndChat.tsx";
import { Consultation } from "./components/Consultation.tsx";
import { TaskManager } from "./components/TaskManager.tsx";

interface FinalGoal {
  qualification: string; // 目指す資格
  challenge: string; // 現状の課題
  idealFuture: string; // 理想の未来
  deadline: string; // 期限
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

  // useLayoutEffect を使うことで、ブラウザが描画する直前に高さ計算を行う
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 高さをリセットしてから再計算
    textarea.style.height = "auto";
    // 最小の高さを確保しつつ、現在のテキスト量に合わせる
    textarea.style.height = `${Math.max(24, textarea.scrollHeight)}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      // rows={1} を削除（これがブラウザ側の計算と干渉する原因になることがあります）
      maxLength={100}
      style={{
        ...style,
        overflow: "hidden", // これで不要なスクロールバーを消す
        resize: "none", // ユーザーによるサイズ変更を禁止
      }}
    />
  );
};

function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [currentGoal, setCurrentGoal] = useState<FinalGoal | null>(() => {
    const saved = localStorage.getItem("final_goal");
    return saved ? JSON.parse(saved) : null;
  });

  const [isChatComplete, setIsChatComplete] = useState<boolean>(() => {
    return localStorage.getItem("chat_complete") === "true";
  });

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
    navigate("/goal");
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
            onClick={() => navigate("/goal")}
            className={`sidebar-menu-item ${pathname === "/goal" ? "active" : ""}`}
          >
            🎯 目的の設定
          </li>
          <li
            onClick={() => navigate("/task")}
            className={`sidebar-menu-item ${pathname === "/task" ? "active" : ""}`}
          >
            📝 タスク管理
          </li>
          <li
            onClick={() => navigate("/consult")}
            className={`sidebar-menu-item ${pathname === "/consult" ? "active" : ""}`}
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
          <Routes>
            <Route path="/" element={<Navigate to="/goal" replace />} />
            <Route
              path="/goal"
              element={
                <GoalFormAndChat
                  onGoalComplete={handleGoalComplete}
                  onGoalReset={handleGoalReset}
                  isChatComplete={isChatComplete}
                  onChatCompleteStatus={handleChatCompleteStatus}
                />
              }
            />
            <Route
              path="/task"
              element={
                <div
                  style={{ padding: "20px", overflowY: "auto", height: "100%" }}
                >
                  <TaskManager />
                </div>
              }
            />
            <Route
              path="/consult"
              element={
                <div
                  style={{ padding: "20px", overflowY: "auto", height: "100%" }}
                >
                  <Consultation
                    currentQualification={currentGoal?.qualification || ""}
                  />
                </div>
              }
            />
            {/* 存在しないURLは目的の設定へ */}
            <Route path="*" element={<Navigate to="/goal" replace />} />
          </Routes>
        </div>
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
                gap: "4px",
              }}
            >
              {/* 1. 目指す資格 */}
              <div>
                <p style={{ margin: "0", fontWeight: "bold", color: "#333" }}>
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

              {/* 2. 現状の課題 */}
              <div>
                <p style={{ margin: "0", fontWeight: "bold", color: "#333" }}>
                  ⚠️ 現状の課題:
                </p>
                <AutoResizeTextarea
                  value={currentGoal.challenge}
                  onChange={(e) =>
                    handleInputChange("challenge", e.target.value)
                  }
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={inputStyle}
                />
              </div>

              {/* 3. 理想の未来 */}
              <div>
                <p style={{ margin: "0", fontWeight: "bold", color: "#333" }}>
                  🌈 理想の未来:
                </p>
                <AutoResizeTextarea
                  value={currentGoal.idealFuture}
                  onChange={(e) =>
                    handleInputChange("idealFuture", e.target.value)
                  }
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={inputStyle}
                />
              </div>

              {/* 4. 期限 */}
              <div>
                <p style={{ margin: "0", fontWeight: "bold", color: "#333" }}>
                  📅 期限:
                </p>
                <AutoResizeTextarea
                  value={currentGoal.deadline}
                  onChange={(e) =>
                    handleInputChange("deadline", e.target.value)
                  }
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
                  {calculateRemainingDays(currentGoal.deadline)}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ margin: "5px 0 0 0", color: "#666" }}>
              （チャット完了後に目標がここに表示されます）
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
                ? "「素晴らしい目標が固まったね！応援してるよ！」"
                : "「目標に向かって一歩ずつ進おう！応援してるよ！」"
              : "「まずは中央の画面で、あなたのことを教えてね！」"}
          </p>
        </div>
      </aside>
    </div>
  );
}

export default App;
