import { useState } from "react";
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
import { GoalSummaryPanel } from "./components/GoalSummaryPanel.tsx";
import { BottomNav } from "./components/BottomNav.tsx";
import { useCloudSyncedState } from "./hooks/useCloudSyncedState.ts";
import { useIsMobile } from "./hooks/useIsMobile.ts";
import { useIsEditingText } from "./hooks/useIsEditingText.ts";
import { useVisibleViewportHeight } from "./hooks/useVisibleViewportHeight.ts";
import { getRemainingDays, type FinalGoal } from "./lib/goal.ts";
import { BOTTOM_NAV_HEIGHT } from "./lib/layout.ts";

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

function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // 画面幅768px以下ならスマホ表示（下メニュー＋1画面ずつ）に切り替える
  const isMobile = useIsMobile();
  const isEditingText = useIsEditingText();
  const visibleViewport = useVisibleViewportHeight(isMobile);

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

  const handleGoalFieldChange = (key: keyof FinalGoal, value: string) => {
    if (!currentGoal) return;
    setCurrentGoal({ ...currentGoal, [key]: value });
  };

  const goalSummaryPanel = (
    <GoalSummaryPanel
      goal={currentGoal}
      isChatComplete={isChatComplete}
      onFieldChange={handleGoalFieldChange}
    />
  );

  // 中央（スマホでは全幅）に表示する各画面
  const routes = (
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
            style={{
              // スマホでは画面を広く使うため、余白を最小限にする（上だけ少し空ける）
              padding: isMobile ? "20px 8px 8px" : "20px",
              overflowY: "auto",
              height: "100%",
              boxSizing: "border-box",
            }}
          >
            <TaskManager />
          </div>
        }
      />
      <Route
        path="/consult"
        element={
          <div
            style={{
              // スマホでは余白を最小限にする（上だけ少し空ける。タスク画面と同じ）
              padding: isMobile ? "20px 8px 8px" : "20px",
              overflowY: "auto",
              height: "100%",
              boxSizing: "border-box",
            }}
          >
            <Consultation goal={currentGoal} />
          </div>
        }
      />
      {/* 目標確認画面はスマホ専用。PCでは右側に常に出ているので、目標設定へ戻す */}
      <Route
        path="/summary"
        element={
          isMobile ? (
            <div
              style={{
                padding: "20px 16px",
                overflowY: "auto",
                height: "100%",
                boxSizing: "border-box",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  margin: "0 0 15px 0",
                  textAlign: "left",
                  // 左に紫の縦線（タスク画面・相談画面の見出しと同じ）
                  paddingLeft: "10px",
                  borderLeft: "4px solid var(--accent)",
                }}
              >
                📋 目標確認
              </h2>
              {goalSummaryPanel}
            </div>
          ) : (
            <Navigate to="/goal" replace />
          )
        }
      />
      {/* 存在しないURLは目的の設定へ */}
      <Route path="*" element={<Navigate to="/goal" replace />} />
    </Routes>
  );

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

  return (
    <div
      className="app-container"
      style={
        isMobile
          ? {
              // スマホ：メイン画面を全幅で表示し、下メニューの分だけ下を空ける。
              // キーボードが出ると、iPhoneは「見えている範囲」を縮めて下にずらすので、
              // アプリも同じ位置・高さに置いて、画面の下端がキーボードのすぐ上に来るようにする
              position: "fixed",
              top: `${visibleViewport.offsetTop}px`,
              left: 0,
              right: 0,
              height: `${visibleViewport.height}px`,
              paddingBottom: isEditingText
                ? 0
                : `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#fff",
              width: "100%",
            }
          : {
              display: "flex",
              minHeight: "100vh",
              backgroundColor: "#fff",
              width: "100%",
            }
      }
    >
      {isMobile ? (
        <>
          <main
            className="main-content"
            style={{
              flexGrow: 1,
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {routes}
          </main>
          {/* 文字を入力中（キーボードが出ている間）は、メニューがキーボードの上に押し上げられないよう隠す */}
          {!isEditingText && <BottomNav />}
        </>
      ) : (
        <>
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
            }}
          >
            {routes}
          </main>

          {/* 🟢 【右側】：目標の表示・編集 */}
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
              overflowY: "auto",
            }}
          >
            {goalSummaryPanel}
          </aside>
        </>
      )}

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
              borderRadius: "16px",
              width: "min(380px, 90vw)",
              maxHeight: "85%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.25)",
              // 消えるときは、少し下に沈みながら薄くなる
              transform: isPopupClosing ? "translateY(8px)" : "translateY(0)",
              transition: `transform ${DEADLINE_POPUP_FADE_MS}ms ease`,
            }}
          >
            {/* 上の帯：目標と、期限までの残り日数を大きく */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-light), var(--accent))",
                color: "#fff",
                padding: "22px 20px 20px",
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold" }}>
                🎯 {currentGoal.topic}
              </p>
              {deadlineDays > 0 ? (
                <>
                  <p style={{ margin: "10px 0 0 0", fontSize: "13px", opacity: 0.9 }}>
                    目標の期限まで
                  </p>
                  <p
                    style={{
                      margin: "2px 0",
                      fontSize: "46px",
                      fontWeight: "bold",
                      lineHeight: 1.15,
                    }}
                  >
                    あと {deadlineDays} 日
                  </p>
                </>
              ) : deadlineDays === 0 ? (
                <p
                  style={{
                    margin: "12px 0 4px 0",
                    fontSize: "24px",
                    fontWeight: "bold",
                  }}
                >
                  🎉 今日が目標の期限です！
                </p>
              ) : (
                <p
                  style={{
                    margin: "12px 0 4px 0",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  期限から {Math.abs(deadlineDays)} 日が過ぎました
                </p>
              )}
              <p style={{ margin: 0, fontSize: "12px", opacity: 0.85 }}>
                期限：{currentGoal.deadline}
              </p>
            </div>

            {/* 中身：目標設定で言葉にした「理想の未来」と「現状の課題」を思い出してもらう */}
            <div
              style={{
                padding: "18px 20px 4px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                textAlign: "left",
              }}
            >
              {[
                { label: "🌈 理想の未来", text: currentGoal.idealFuture },
                { label: "⚠️ 現状の課題", text: currentGoal.challenge },
              ]
                .filter((item) => item.text)
                .map((item) => (
                  <div
                    key={item.label}
                    style={{
                      backgroundColor: "#faf7ff",
                      border: "1px solid var(--accent-bg)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 2px 0",
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "var(--accent)",
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        lineHeight: 1.6,
                        color: "#444",
                      }}
                    >
                      {item.text}
                    </p>
                  </div>
                ))}
              {deadlineDays < 0 && (
                <p style={{ margin: 0, fontSize: "12px", color: "#888", lineHeight: 1.6 }}>
                  {isMobile ? "「目標確認」画面" : "右側"}
                  の期限は、クリックすると変更できます。
                </p>
              )}
            </div>

            <div style={{ padding: "14px 20px 20px", flexShrink: 0 }}>
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
                borderRadius: "10px",
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
        </div>
      )}
    </div>
  );
}

export default App;
