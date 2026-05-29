import { useState } from "react";
import "./App.css";
import { GoalFormAndChat } from "./components/GoalFormAndChat.tsx";
import { Consultation } from "./components/Consultation.tsx"; // ⭕ 名前を変更
import { TaskManager } from "./components/TaskManager.tsx"; // ⭕ 追加

interface FinalGoal {
  qualification: string;
  purpose: string;
  field: string;
  period: string;
}

function App() {
  // ⭕ "goal" | "task" | "consult" の3つのメニューで切り替え
  const [activeMenu, setActiveMenu] = useState<"goal" | "task" | "consult">(
    "goal",
  );

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
            onClick={() => setActiveMenu("goal")}
            style={{
              marginBottom: "15px",
              fontWeight: activeMenu === "goal" ? "bold" : "normal",
              color: activeMenu === "goal" ? "#007bff" : "#666",
              cursor: "pointer",
            }}
          >
            🎯 目的の設定
          </li>
          <li
            onClick={() => setActiveMenu("task")}
            style={{
              marginBottom: "15px",
              fontWeight: activeMenu === "task" ? "bold" : "normal",
              color: activeMenu === "task" ? "#007bff" : "#666",
              cursor: "pointer",
            }}
          >
            📝 タスク管理
          </li>
          <li
            onClick={() => setActiveMenu("consult")}
            style={{
              marginBottom: "15px",
              fontWeight: activeMenu === "consult" ? "bold" : "normal",
              color: activeMenu === "consult" ? "#007bff" : "#666",
              cursor: "pointer",
            }}
          >
            💬 モチベ低下時の相談
          </li>
        </ul>
      </aside>

      {/* 【中央】：メインコンテンツ */}
      <main
        className="main-content"
        style={{ width: "55%", padding: "20px", overflowY: "auto" }}
      >
        {activeMenu === "goal" && (
          <GoalFormAndChat
            onGoalComplete={handleGoalComplete}
            onGoalReset={handleGoalReset}
          />
        )}
        {activeMenu === "task" && <TaskManager />}
        {activeMenu === "consult" && (
          <Consultation
            currentQualification={currentGoal?.qualification || ""}
          />
        )}
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
              ? "「目標に向かって一歩ずつ進もう！応援してるよ！」"
              : "「まずは中央の画面で、あなたのことを教えてね！」"}
          </p>
        </div>
      </aside>
    </div>
  );
}

export default App;
