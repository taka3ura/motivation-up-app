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
import { LoginButton } from "./components/LoginButton.tsx";
import { useCloudSyncedState } from "./hooks/useCloudSyncedState.ts";

interface FinalGoal {
  topic: string; // 頑張りたいこと
  challenge: string; // 現状の課題
  idealFuture: string; // 理想の未来
  deadline: string; // 期限
}

// 「あと何日」ポップアップを最後に表示した日付を記録するキー
const DEADLINE_POPUP_STORAGE_KEY = "deadline_popup_last_shown";
// ポップアップを閉じるときのフェードアウトにかける時間(ミリ秒)
const DEADLINE_POPUP_FADE_MS = 300;

// 今日の日付を "YYYY-MM-DD" で返す（端末のローカル時間を基準にする）
const getTodayKey = () => {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${mm}-${dd}`;
};

// 期限の文字列（"2027/04/01" や "2027年4月1日" など）から、今日からの残り日数を返す。
// 日付として読めない場合は null。期限を過ぎていればマイナスになる。
const getRemainingDays = (periodText: string): number | null => {
  const matches = periodText.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (!matches) return null;

  const targetDate = new Date(
    parseInt(matches[1], 10),
    parseInt(matches[2], 10) - 1,
    parseInt(matches[3], 10),
  );
  const today = new Date();
  targetDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

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

  // 編集できることに気づいてもらうため、ホバー時にうっすら背景色を付ける
  const handleMouseEnter = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (document.activeElement !== e.currentTarget) {
      e.currentTarget.style.backgroundColor = "#fff8e1";
    }
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (document.activeElement !== e.currentTarget) {
      e.currentTarget.style.backgroundColor = "transparent";
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title="クリックして編集できます"
      // rows=1を指定しないと、ブラウザの初期値(2行分)が基準になり、
      // 短い内容でも下に余計な余白ができてしまう
      rows={1}
      maxLength={100}
      style={{
        ...style,
        overflow: "hidden", // これで不要なスクロールバーを消す
        resize: "none", // ユーザーによるサイズ変更を禁止
        cursor: "text",
        transition: "background-color 0.15s ease",
      }}
    />
  );
};

function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ログイン中はFirestoreにも自動で同期される（複数端末で共有される）
  const [currentGoal, setCurrentGoal] = useCloudSyncedState<FinalGoal | null>(
    "final_goal",
    null,
  );
  const [isChatComplete, setIsChatComplete] = useCloudSyncedState<boolean>(
    "chat_complete",
    false,
  );

  const handleGoalComplete = (goal: FinalGoal) => {
    setCurrentGoal(goal);
  };

  const handleChatCompleteStatus = (complete: boolean) => {
    setIsChatComplete(complete);
  };

  // 🧹 親側で全データを一元リセットする関数
  const handleGoalReset = () => {
    setCurrentGoal(null);
    setIsChatComplete(false);
    // チャット履歴はGoalFormAndChat側で管理しており、そちらのリセット処理で消去される

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
  };

  const calculateRemainingDays = (periodText: string): string => {
    if (!periodText) return "";
    const diffDays = getRemainingDays(periodText);
    if (diffDays === null) return "（正確な日付を入力すると残り日数が出ます）";

    if (diffDays > 0) return `⏳ 目標達成まであと ${diffDays} 日`;
    if (diffDays === 0) return "🎉 ついに目標達成の当日です！";
    return `✅ 目標の期日から ${Math.abs(diffDays)} 日経過しています`;
  };

  // 📅 期限が決まっていたら、1日1回「あと何日」のポップアップを出す
  // その日に一度閉じたら、同じ日はもう出さない（記録はこの端末ごと）
  const [popupDismissedDate, setPopupDismissedDate] = useState(() =>
    localStorage.getItem(DEADLINE_POPUP_STORAGE_KEY),
  );
  const deadlineDays =
    isChatComplete && currentGoal ? getRemainingDays(currentGoal.deadline) : null;
  const isDeadlinePopupOpen =
    deadlineDays !== null && popupDismissedDate !== getTodayKey();

  // 閉じるときは、まず徐々に透明にしてから(isPopupClosing)、実際に画面から外す
  const [isPopupClosing, setIsPopupClosing] = useState(false);
  const closeDeadlinePopup = () => {
    if (isPopupClosing) return;
    setIsPopupClosing(true);
    setTimeout(() => {
      const today = getTodayKey();
      localStorage.setItem(DEADLINE_POPUP_STORAGE_KEY, today);
      setPopupDismissedDate(today);
      setIsPopupClosing(false);
    }, DEADLINE_POPUP_FADE_MS);
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
          padding: "20px 0",
          position: "sticky",
          top: 0,
          height: "100vh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ padding: "0 20px" }}>
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
        </div>

        {/* 🔑 ログイン（左下固定）。ログインすると、複数端末でデータが同期される */}
        <LoginButton />
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
                  <Consultation goal={currentGoal} />
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
              <p
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "12px",
                  lineHeight: "1.3",
                  color: "#9a7b1f",
                }}
              >
                ✏️ 項目をクリックすると、内容を直接編集できます
              </p>

              {/* 1. 頑張りたいこと */}
              <div>
                <p style={{ margin: "0", fontWeight: "bold", color: "#333" }}>
                  🏷️ 頑張りたいこと:
                </p>
                <AutoResizeTextarea
                  value={currentGoal.topic}
                  onChange={(e) =>
                    handleInputChange("topic", e.target.value)
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
      </aside>

      {/* 📅 1日1回の「あと何日」ポップアップ */}
      {isDeadlinePopupOpen && currentGoal && deadlineDays !== null && (
        <div
          onClick={closeDeadlinePopup}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            opacity: isPopupClosing ? 0 : 1,
            transition: `opacity ${DEADLINE_POPUP_FADE_MS}ms ease`,
          }}
        >
          <div
            className="fade-slide-in"
            onClick={(e) => e.stopPropagation()} // カードの中をクリックしても閉じない
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "28px 32px",
              width: "min(360px, 90vw)",
              boxSizing: "border-box",
              textAlign: "center",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.2)",
              // 消えるときは、少し下に沈みながら薄くなる
              transform: isPopupClosing ? "translateY(8px)" : "translateY(0)",
              transition: `transform ${DEADLINE_POPUP_FADE_MS}ms ease`,
            }}
          >
            <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#888" }}>
              🎯 {currentGoal.topic}
            </p>
            {deadlineDays > 0 ? (
              <>
                <p style={{ margin: "8px 0 0 0", fontSize: "15px", color: "#555" }}>
                  目標の期限まで
                </p>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "44px",
                    fontWeight: "bold",
                    color: "var(--accent)",
                    lineHeight: 1.2,
                  }}
                >
                  あと {deadlineDays} 日
                </p>
                <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#888" }}>
                  （期限：{currentGoal.deadline}）
                </p>
              </>
            ) : deadlineDays === 0 ? (
              <p
                style={{
                  margin: "12px 0 20px 0",
                  fontSize: "22px",
                  fontWeight: "bold",
                  color: "var(--accent)",
                }}
              >
                🎉 今日が目標の期限です！
              </p>
            ) : (
              <p style={{ margin: "12px 0 20px 0", fontSize: "15px", color: "#555", lineHeight: 1.6 }}>
                目標の期限から {Math.abs(deadlineDays)} 日が過ぎました。
                <br />
                右側の期限は、クリックすると変更できます。
              </p>
            )}
            <button
              type="button"
              onClick={closeDeadlinePopup}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03)";
                e.currentTarget.style.backgroundColor = "var(--accent-light-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.backgroundColor = "var(--accent-light)";
              }}
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                borderRadius: "8px",
                backgroundColor: "var(--accent-light)",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background-color 0.2s, transform 0.15s ease",
              }}
            >
              今日もがんばる！
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
