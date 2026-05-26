import { useState } from "react";
import "./App.css";
import { GoalFormAndChat } from "./components/GoalFormAndChat.tsx";

// ⭕ qualification（資格名）を型定義に追加
interface FinalGoal {
  qualification: string;
  purpose: string;
  field: string;
  period: string;
}

function App() {
  const [currentGoal, setCurrentGoal] = useState<FinalGoal | null>(() => {
    const saved = localStorage.getItem("final_goal");
    return saved ? JSON.parse(saved) : null;
  });

  const handleGoalComplete = (goal: FinalGoal) => {
    setCurrentGoal(goal);
    localStorage.setItem("final_goal", JSON.stringify(goal));
  };

  const handleGoalReset = () => {
    setCurrentGoal(null);
    localStorage.removeItem("final_goal");
  };

  return (
    <div className="app-container" style={{ display: "flex", height: "100vh" }}>
      {/* 【左側】：メニューバー */}
      <aside
        className="sidebar"
        style={{ width: "20%", borderRight: "3px solid #eee", padding: "20px" }}
      >
        <h3>メニュー</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li
            style={{
              marginBottom: "10px",
              fontWeight: "bold",
              color: "#007bff",
            }}
          >
            🎯 目的の設定
          </li>
          <li style={{ marginBottom: "10px", color: "#666" }}>📝 タスク管理</li>
          <li style={{ marginBottom: "10px", color: "#666" }}>
            💬 モチベ低下時の相談
          </li>
        </ul>
      </aside>

      {/* 【中央】：メインコンテンツ */}
      <main
        className="main-content"
        style={{ width: "55%", padding: "20px", overflowY: "auto" }}
      >
        <GoalFormAndChat
          onGoalComplete={handleGoalComplete}
          onGoalReset={handleGoalReset}
        />
      </main>

      {/* 【右側】：サポート ＆ キャラクターエリア */}
      <aside
        className="support-bar"
        style={{
          width: "25%",
          borderLeft: "3px solid #eee",
          padding: "20px",
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
          }}
        >
          <strong>今の目標：</strong>

          {/* ⭕ 修正点：currentGoalがある時に「目指す資格」を表示するように変更 */}
          {currentGoal ? (
            <div style={{ marginTop: "10px", fontSize: "14px", color: "#555" }}>
              <p
                style={{
                  margin: "5px 0",
                  fontSize: "15px",
                  borderBottom: "1px dashed #e67e22",
                  paddingBottom: "5px",
                }}
              >
                🏷️ <strong>目指す資格:</strong>{" "}
                <span style={{ color: "#e67e22", fontWeight: "bold" }}>
                  {currentGoal.qualification}
                </span>
              </p>
              <p style={{ margin: "5px 0" }}>
                🌈 <strong>目的:</strong> {currentGoal.purpose}
              </p>
              <p style={{ margin: "5px 0" }}>
                📖 <strong>分野:</strong> {currentGoal.field}
              </p>
              <p style={{ margin: "5px 0" }}>
                📅 <strong>時期:</strong> {currentGoal.period}
              </p>
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
              ? "「バッチリ目標が決まったね！応援してるよ！」"
              : "「まずは中央の画面で、あなたのことを教えてね！」"}
          </p>
        </div>
      </aside>
    </div>
  );
}

export default App;
