import { useState, useEffect, useRef } from "react";
import "./App.css";
import { GoalFormAndChat } from "./components/GoalFormAndChat.tsx";
import { Consultation } from "./components/Consultation.tsx";
import { TaskManager } from "./components/TaskManager.tsx";

interface FinalGoal {
  qualification: string; // 目指す資格
  purpose: string; // 資格を取る目的
  field: string; // 興味のある分野
  period: string; // いつまでに達成したいか
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

    // 一度高さをリセットして正しいスクロール高さを計算できるようにする
    textarea.style.height = "auto";

    // 1行の高さ（約24px）を基準に、最大3行（約72px）までに制限する計算
    const lineHeight = 24;
    const maxHeight = lineHeight * 3; // 3行分の高さ
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight <= maxHeight) {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = "hidden"; // 3行以下のときはスクロールバーを隠す
    } else {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = "scroll"; // 3行を超えたらスクロールバーを出す
    }
  }, [value]); // 文字が書き換わるたびに実行

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      rows={1} // 初期値は1行
      style={{ ...style, lineHeight: "24px" }} // 行の高さを固定して計算を安定させる
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

  const handleGoalComplete = (goal: FinalGoal) => {
    setCurrentGoal(goal);
    localStorage.setItem("final_goal", JSON.stringify(goal));
  };

  const handleGoalReset = () => {
    setCurrentGoal(null);
    localStorage.removeItem("final_goal");
  };

  // 右側のインライン編集フィールドで文字が書き換わった時の自動保存処理
  const handleInputChange = (key: string, value: string) => {
    if (!currentGoal) return;

    const updatedGoal = {
      ...currentGoal,
      [key]: value,
    } as FinalGoal;

    setCurrentGoal(updatedGoal);
    localStorage.setItem("final_goal", JSON.stringify(updatedGoal));
  };

  // 入力フィールドの共通デザイン（枠線を透明にしてテキストっぽく見せる）
  const inputStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    borderBottom: "1px dashed transparent",
    fontSize: "14px",
    fontFamily: "inherit",
    color: "#444",
    width: "100%",
    padding: "2px 4px",
    margin: "0",
    outline: "none",
    resize: "none",
    display: "block",
  };

  // クリックしてフォーカスが当たった時と、外れた時の背景・下線の変化
  const handleFocus = (e: React.FocusEvent<any>) => {
    e.target.style.borderBottom = "1px dashed #e67e22";
    e.target.style.backgroundColor = "#fff";
  };

  const handleBlur = (e: React.FocusEvent<any>) => {
    e.target.style.borderBottom = "1px dashed transparent";
    e.target.style.backgroundColor = "transparent";
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
            textAlign: "left",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#856404" }}>
            現在の目標設定
          </h4>

          {currentGoal ? (
            <div
              style={{
                marginTop: "10px",
                fontSize: "14px",
                color: "#555",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 2px 0",
                    fontSize: "15px",
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

              <div>
                <p
                  style={{
                    margin: "0 0 2px 0",
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

              <div>
                <p
                  style={{
                    margin: "0 0 2px 0",
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

              <div>
                <p
                  style={{
                    margin: "0 0 2px 0",
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
              ? "「目標に向かって一歩ずつ進もう！応援してるよ！」"
              : "「まずは中央の画面で、あなたのことを教えてね！」"}
          </p>
        </div>
      </aside>
    </div>
  );
}

export default App;
