import React, { useState, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { useCloudSyncedState } from "../hooks/useCloudSyncedState";
import { useIsMobile } from "../hooks/useIsMobile";

interface Task {
  id: string;
  text: string;
  isCompleted: boolean;
  isToday: boolean;
  completedAt?: number;
}

// 今日の日付を "YYYY-MM-DD" で返す（端末のローカル時間を基準にする）
const getTodayDateString = () => {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${mm}-${dd}`;
};

interface AutoResizeTextareaProps {
  t: Task;
  isFocused: boolean;
  onUpdateText: (id: string, newText: string) => void;
  onBlurTask: (id: string, currentText: string) => void;
  onEnterPress: (isToday: boolean) => void;
  onBackspaceEmpty: (id: string, isToday: boolean) => void;
  onArrowKeyPress: (id: string, direction: "Up" | "Down") => void;
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  t,
  isFocused,
  onUpdateText,
  onBlurTask,
  onEnterPress,
  onBackspaceEmpty,
  onArrowKeyPress,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [t.text]);

  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isFocused]);

  return (
    <textarea
      ref={textareaRef}
      value={t.text}
      onChange={(e) => onUpdateText(t.id, e.target.value)}
      onBlur={(e) => onBlurTask(t.id, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onArrowKeyPress(t.id, "Up");
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          onArrowKeyPress(t.id, "Down");
          return;
        }
        if (e.key === "Backspace" && t.text === "") {
          e.preventDefault();
          onBackspaceEmpty(t.id, t.isToday);
          return;
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
          onEnterPress(t.isToday);
        }
      }}
      placeholder="タスクを入力..."
      rows={1}
      disabled={t.isCompleted}
      style={{
        flexGrow: 1,
        width: "100%",
        fontSize: "16px",
        lineHeight: "24px",
        padding: "0",
        margin: "0",
        border: "none",
        outline: "none",
        backgroundColor: "transparent",
        color: t.isCompleted ? "#a0aec0" : "#2c3e50",
        fontFamily: "inherit",
        resize: "none",
        overflow: "hidden",
        textAlign: "left",
        display: "block",
        transition: "all 0.2s ease",
      }}
    />
  );
};

export const TaskManager: React.FC = () => {
  const isMobile = useIsMobile();
  // ログイン中はFirestoreにも自動で同期される（複数端末で共有される）
  const [tasks, setTasks] = useCloudSyncedState<Task[]>("daily_tasks_v2", []);
  const [memo, setMemo] = useCloudSyncedState<string>("brain_dump_memo", "");
  const [isMemoOpen, setIsMemoOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("is_memo_open");
    return saved ? saved === "true" : true;
  });

  const defaultAdvice =
    "💡 タスクは30分くらいで終わるサイズに、具体的に細かく分解して立てると集中が続きやすいよ！";
  const [praiseMessage, setPraiseMessage] = useState(defaultAdvice);
  const [isPraising, setIsPraising] = useState(false);

  const [messageOpacity, setMessageOpacity] = useState(1);
  const [messageTranslateY, setMessageTranslateY] = useState(0);

  const [isClearingMemo, setIsClearingMemo] = useState(false);

  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  const [deletingTaskIds, setDeletingTaskIds] = useState<string[]>([]);
  const [movingTaskIds, setMovingTaskIds] = useState<string[]>([]);
  const [addingTaskId, setAddingTaskId] = useState<string | null>(null);

  const praisePhrases = [
    "最高！🔥 その調子でいこう！",
    "一歩前進！✨ 素晴らしい集中力！",
    "ナイス！👏 確実に進捗してるよ！",
    "偉い！🎯 この調子で次もやっちゃおう！",
    "完璧！💯 今日の素晴らしい前進！",
    "お疲れ様！🍹 1つの壁をきれいに突破したぞ！",
  ];

  const memoRef = useRef<HTMLTextAreaElement>(null);
  const praiseTimerRef = useRef<any>(null);

  const memoContainerRef = useRef<HTMLDivElement>(null);

  // 日付が変わっていたら、完了済みタスクを一掃する（今日の分だけ見えるようにする）
  useEffect(() => {
    const today = getTodayDateString();
    const lastActiveDate = localStorage.getItem("tasks_last_active_date");
    if (lastActiveDate && lastActiveDate !== today) {
      setTasks((prev) => prev.filter((t) => !t.isCompleted));
    }
    localStorage.setItem("tasks_last_active_date", today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (memoRef.current && isMemoOpen) {
      memoRef.current.style.height = "auto";
      memoRef.current.style.height = `${Math.max(memoRef.current.scrollHeight, 140)}px`;
    }
  }, [memo, isMemoOpen]);

  useEffect(() => {
    localStorage.setItem("is_memo_open", String(isMemoOpen));
  }, [isMemoOpen]);

  const handleClearMemo = () => {
    setIsClearingMemo(true);
    setTimeout(() => {
      setMemo("");
      setIsClearingMemo(false);
    }, 200);
  };

  const handleCreateEmptyTask = (isToday: boolean) => {
    const newId = Date.now().toString();
    const newEmptyTask: Task = {
      id: newId,
      text: "",
      isCompleted: false,
      isToday: isToday,
    };

    setAddingTaskId(newId);
    setFocusTaskId(newId);
    setTasks([...tasks, newEmptyTask]);

    setTimeout(() => {
      setAddingTaskId(null);
    }, 20);
  };

  const handleUpdateTaskText = (id: string, newText: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, text: newText } : t)));
  };

  const handleBlurTask = (id: string, currentText: string) => {
    if (!currentText.trim()) {
      setTasks(tasks.filter((t) => t.id !== id));
    }
    setFocusTaskId(null);
  };

  const handleBackspaceEmptyTask = (id: string, isToday: boolean) => {
    const targetList = tasks.filter(
      (t) => !t.isCompleted && t.isToday === isToday,
    );
    const currentIndex = targetList.findIndex((t) => t.id === id);
    if (currentIndex > 0) {
      setFocusTaskId(targetList[currentIndex - 1].id);
    } else {
      setFocusTaskId(null);
    }
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const handleArrowKeyPress = (id: string, direction: "Up" | "Down") => {
    const activeTasks = tasks.filter((t) => !t.isCompleted);
    const visibleTodayTasks = activeTasks.filter((t) => t.isToday);
    const visibleGeneralTasks = activeTasks.filter((t) => !t.isToday);
    const allVisibleTasks = [...visibleTodayTasks, ...visibleGeneralTasks];
    const currentIndex = allVisibleTasks.findIndex((t) => t.id === id);

    if (currentIndex === -1) return;
    if (direction === "Up" && currentIndex > 0) {
      setFocusTaskId(allVisibleTasks[currentIndex - 1].id);
    } else if (
      direction === "Down" &&
      currentIndex < allVisibleTasks.length - 1
    ) {
      setFocusTaskId(allVisibleTasks[currentIndex + 1].id);
    }
  };

  const changePraiseMessageWithAnimation = (
    newMessage: string,
    isPraiseMode: boolean,
  ) => {
    setMessageOpacity(0);
    setMessageTranslateY(-8);

    setTimeout(() => {
      setPraiseMessage(newMessage);
      setIsPraising(isPraiseMode);
      setMessageTranslateY(8);

      requestAnimationFrame(() => {
        setTimeout(() => {
          setMessageOpacity(1);
          setMessageTranslateY(0);
        }, 20);
      });
    }, 150);
  };

  const handleToggleCompleteWithAnimation = (id: string) => {
    const targetTask = tasks.find((t) => t.id === id);
    if (!targetTask) return;

    // タスクはその場に残るので、即チェック状態に切り替える
    // （以前はここで別の完了欄へ移動する前提の消滅アニメーションを挟んでいた）
    executeToggleComplete(id);

    if (!targetTask.isCompleted) {
      if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current);

      const nextPhrase =
        praisePhrases[Math.floor(Math.random() * praisePhrases.length)];
      changePraiseMessageWithAnimation(nextPhrase, true);

      praiseTimerRef.current = setTimeout(() => {
        changePraiseMessageWithAnimation(defaultAdvice, false);
      }, 2500);
    }
  };

  const executeToggleComplete = (id: string) => {
    // 完了してもタスクは消さず、その場にチェック済みの見た目で残す
    // （日付が変わったタイミングで、まとめて片付ける）
    setTasks((currentTasks) =>
      currentTasks.map((t) => {
        if (t.id === id) {
          const nextState = !t.isCompleted;
          return {
            ...t,
            isCompleted: nextState,
            completedAt: nextState ? Date.now() : undefined,
          };
        }
        return t;
      }),
    );
  };

  const handleDeleteTaskWithAnimation = (id: string) => {
    setDeletingTaskIds((prev) => [...prev, id]);
    setTimeout(() => {
      setTasks((prevTasks) => prevTasks.filter((t) => t.id !== id));
      setDeletingTaskIds((prev) =>
        prev.filter((deletingId) => deletingId !== id),
      );
    }, 200);
  };

  const handleToggleMoveSectionWithAnimation = (id: string) => {
    setMovingTaskIds((prev) => [...prev, id]);
    setTimeout(() => {
      setTasks((currentTasks) =>
        currentTasks.map((t) =>
          t.id === id ? { ...t, isToday: !t.isToday } : t,
        ),
      );
      setMovingTaskIds((prev) => prev.filter((movingId) => movingId !== id));
    }, 200);
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    // 完了済みも含めて、見えている位置どおりに並び替える
    const todayTasks = tasks.filter((t) => t.isToday);
    const generalTasks = tasks.filter((t) => !t.isToday);

    let draggedTask: Task;
    if (source.droppableId === "todayList") {
      draggedTask = todayTasks[source.index];
      todayTasks.splice(source.index, 1);
    } else {
      draggedTask = generalTasks[source.index];
      generalTasks.splice(source.index, 1);
    }

    if (destination.droppableId === "todayList") {
      draggedTask.isToday = true;
      todayTasks.splice(destination.index, 0, draggedTask);
    } else {
      draggedTask.isToday = false;
      generalTasks.splice(destination.index, 0, draggedTask);
    }

    setTasks([...todayTasks, ...generalTasks]);
  };

  // 完了済みタスクも、各リストの中にそのまま残して表示する
  const todayTasks = tasks.filter((t) => t.isToday);
  const generalTasks = tasks.filter((t) => !t.isToday);

  const memoMaxHeight = isMemoOpen
    ? `${memoContainerRef.current?.scrollHeight || 160}px`
    : "0px";

  // 👈 DNDの手を離した時のアニメーション速度をハックして最速化するヘルパー関数
  const getSpeedyDropStyle = (style: any, snapshot: any) => {
    if (!style) return style;

    // 手を離して元の位置に収まる瞬間 (Drop Animation中)
    if (snapshot.isDropAnimating) {
      return {
        ...style,
        // デフォルトの遅いフワッとしたイージングを、爆速（0.1秒）かつ鋭いカーブで上書き
        transition: `transform 0.1s cubic-bezier(0.2, 1, 0.2, 1), opacity 0.1s ease`,
      };
    }
    return style;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: "10px",
        textAlign: "left",
      }}
    >
      {/* 🧠 メモスペース */}
      <section
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "15px",
          backgroundColor: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "0 0 4px 0",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              margin: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              userSelect: "none",
            }}
            onClick={() => setIsMemoOpen(!isMemoOpen)}
          >
            <span>🧠 頭の整理・書き出しメモ</span>
            <span
              style={{
                fontSize: "12px",
                color: "#718096",
                display: "inline-block",
                transform: isMemoOpen ? "rotate(0deg)" : "rotate(180deg)",
                transition: "transform 0.25s ease",
              }}
            >
              ▲
            </span>
            <span style={{ fontSize: "12px", color: "#718096" }}>
              {isMemoOpen ? "閉じる" : "開く"}
            </span>
          </h2>
          <div
            style={{
              opacity: isMemoOpen && memo.trim() ? 1 : 0,
              pointerEvents: isMemoOpen && memo.trim() ? "auto" : "none",
              transition: "opacity 0.2s ease",
            }}
          >
            <button
              type="button"
              onClick={handleClearMemo}
              style={{
                padding: "2px 8px",
                backgroundColor: "#fff",
                color: "#e74c3c",
                border: "1px solid #fed7d7",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              🗑️ メモを全消去
            </button>
          </div>
        </div>

        <div
          style={{
            maxHeight: memoMaxHeight,
            opacity: isMemoOpen ? 1 : 0,
            overflow: "hidden",
            transition:
              "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease",
          }}
        >
          <div ref={memoContainerRef} style={{ paddingTop: "8px" }}>
            <textarea
              ref={memoRef}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="やることをとりあえずここに全て書き出してみよう..."
              style={{
                width: "100%",
                height: "140px",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "14px",
                lineHeight: "1.6",
                resize: "none",
                overflow: "hidden",
                boxSizing: "border-box",
                fontFamily: "inherit",
                opacity: isClearingMemo ? 0 : 1,
                transform: isClearingMemo ? "scale(0.99)" : "scale(1)",
                transition: "opacity 0.2s ease, transform 0.2s ease",
              }}
            />
          </div>
        </div>
      </section>

      {/* 💡 アドバイス・応援枠 */}
      <div
        style={{
          height: "54px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "6px",
          padding: "0 16px",
          boxSizing: "border-box",
          backgroundColor: isPraising ? "#d1e7dd" : "#f8fafc",
          border: isPraising ? "1px solid #a3cfbb" : "1px solid #e2e8f0",
          color: isPraising ? "#0f5132" : "#4a5568",
          fontWeight: "bold",
          fontSize: "14px",
          textAlign: "center",
          overflow: "hidden",
          transition: "background-color 0.3s ease, border-color 0.3s ease",
        }}
      >
        <span
          style={{
            display: "block",
            opacity: messageOpacity,
            transform: `translateY(${messageTranslateY}px)`,
            transition: "opacity 0.15s ease, transform 0.15s ease",
          }}
        >
          {praiseMessage}
        </span>
      </div>

      {/* 📌 ドラッグ＆ドロップエリア */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: "8px",
            backgroundColor: "#fff",
            padding: "15px",
            display: "flex",
            flexDirection: "column",
            gap: "25px",
          }}
        >
          {/* 🔥 今日やるタスク */}
          <section>
            <div style={{ margin: "0 0 4px 0" }}>
              <h3 style={{ fontSize: "15px", margin: 0, color: "#e67e22" }}>
                🔥 今日やるタスク
              </h3>
            </div>
            <p
              style={{
                margin: "0 0 10px 0",
                fontSize: "11px",
                color: "#a0aec0",
              }}
            >
              ✅
              完了したタスクはチェック済みのまま残ります（日付が変わると自動で消えます）
            </p>

            <Droppable droppableId="todayList">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    minHeight: "20px",
                  }}
                >
                  {todayTasks.map((t, index) => {
                    const isDeleting = deletingTaskIds.includes(t.id);
                    const isMoving = movingTaskIds.includes(t.id);
                    const isAdding = addingTaskId === t.id;
                    const isAnimating = isDeleting || isMoving;

                    return (
                      <Draggable key={t.id} draggableId={t.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            // 👈 関数の戻り値を直接適用して、リリース時のラグを強制カット！
                            style={getSpeedyDropStyle(
                              provided.draggableProps.style,
                              snapshot,
                            )}
                          >
                            <div
                              onMouseEnter={(e) => {
                                if (!snapshot.isDragging) {
                                  e.currentTarget.style.backgroundColor =
                                    "#ffe9d2";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!snapshot.isDragging) {
                                  e.currentTarget.style.backgroundColor =
                                    "#fff9f2";
                                }
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                padding:
                                  isAnimating || isAdding
                                    ? "0px 10px"
                                    : "8px 10px",
                                border:
                                  isAnimating || isAdding
                                    ? "0px solid transparent"
                                    : "1px solid #eee",
                                borderRadius: "6px",
                                backgroundColor: snapshot.isDragging
                                  ? "#ffeacc"
                                  : "#fff9f2",
                                maxHeight:
                                  isAnimating || isAdding ? "0px" : "150px",
                                opacity: isAnimating || isAdding ? 0 : 1,
                                overflow: "hidden",
                                transform: isDeleting
                                  ? "scale(0.95)"
                                  : isAdding
                                    ? "translateY(-10px)"
                                    : "scale(1)",
                                transition:
                                  "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding 0.2s ease, transform 0.2s ease, background-color 0.15s ease",
                              }}
                            >
                              <div
                                {...provided.dragHandleProps}
                                style={{
                                  cursor: "grab",
                                  marginRight: "12px",
                                  color: "#bbb",
                                  fontSize: "16px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  userSelect: "none",
                                  padding: "0 4px",
                                  transform: "translateY(-1.5px)",
                                }}
                              >
                                ⣿
                              </div>
                              <input
                                type="checkbox"
                                checked={t.isCompleted}
                                onChange={() =>
                                  handleToggleCompleteWithAnimation(t.id)
                                }
                                style={{
                                  marginRight: "10px",
                                  width: "18px",
                                  height: "18px",
                                  flexShrink: 0,
                                  cursor: "pointer",
                                  appearance: "none",
                                  WebkitAppearance: "none",
                                  borderRadius: "50%",
                                  border: t.isCompleted
                                    ? "2px solid var(--accent)"
                                    : "2px solid #cbd5e0",
                                  backgroundColor: t.isCompleted
                                    ? "var(--accent)"
                                    : "#fff",
                                  backgroundImage: t.isCompleted
                                    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3E%3Cpath d='M13.3 3.3 6 10.6 2.7 7.3 1.3 8.7l4.7 4.7 8.7-8.7z'/%3E%3C/svg%3E\")"
                                    : "none",
                                  backgroundSize: "12px",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "center",
                                  transition:
                                    "background-color 0.15s ease, border-color 0.15s ease",
                                }}
                              />
                              <AutoResizeTextarea
                                t={t}
                                isFocused={t.id === focusTaskId}
                                onUpdateText={handleUpdateTaskText}
                                onBlurTask={handleBlurTask}
                                onEnterPress={handleCreateEmptyTask}
                                onBackspaceEmpty={handleBackspaceEmptyTask}
                                onArrowKeyPress={handleArrowKeyPress}
                              />
                              {/* スマホでは画面が狭いため移動ボタンは出さない（ドラッグで移動できる） */}
                              {!isMobile && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleMoveSectionWithAnimation(t.id)
                                }
                                style={{
                                  backgroundColor: "#e8f4fd",
                                  color: "#1d9bf0",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "4px 8px",
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                  marginLeft: "10px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                ↓ ストックへ移動
                              </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteTaskWithAnimation(t.id)
                                }
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#e74c3c",
                                  cursor: "pointer",
                                  marginLeft: "10px",
                                  fontSize: "14px",
                                  padding: "4px",
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <button
              type="button"
              onClick={() => handleCreateEmptyTask(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ffe9d2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#fffaf0";
              }}
              style={{
                width: "100%",
                padding: "6px",
                marginTop: "8px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#fffaf0",
                color: "#e67e22",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "bold",
                textAlign: "left",
                transition: "background-color 0.15s ease",
              }}
            >
              ＋ 今日やるタスクを追加
            </button>
          </section>

          {/* 📋 全体のタスクストック */}
          <section style={{ borderTop: "1px dashed #eee", paddingTop: "20px" }}>
            <h3
              style={{ fontSize: "15px", margin: "0 0 10px 0", color: "#555" }}
            >
              📋 全体のタスク（ストック欄）
            </h3>

            <Droppable droppableId="generalList">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    minHeight: "20px",
                  }}
                >
                  {generalTasks.map((t, index) => {
                    const isDeleting = deletingTaskIds.includes(t.id);
                    const isMoving = movingTaskIds.includes(t.id);
                    const isAdding = addingTaskId === t.id;
                    const isAnimating = isDeleting || isMoving;

                    return (
                      <Draggable key={t.id} draggableId={t.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            // 👈 ストック側にも超高速リリースStyleを適用
                            style={getSpeedyDropStyle(
                              provided.draggableProps.style,
                              snapshot,
                            )}
                          >
                            <div
                              onMouseEnter={(e) => {
                                if (!snapshot.isDragging) {
                                  e.currentTarget.style.backgroundColor =
                                    "#ececec";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!snapshot.isDragging) {
                                  e.currentTarget.style.backgroundColor =
                                    "#fafafa";
                                }
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                padding:
                                  isAnimating || isAdding
                                    ? "0px 10px"
                                    : "8px 10px",
                                border:
                                  isAnimating || isAdding
                                    ? "0px solid transparent"
                                    : "1px solid #eee",
                                borderRadius: "6px",
                                backgroundColor: snapshot.isDragging
                                  ? "#e6e6e6"
                                  : "#fafafa",
                                maxHeight:
                                  isAnimating || isAdding ? "0px" : "150px",
                                opacity: isAnimating || isAdding ? 0 : 1,
                                overflow: "hidden",
                                transform: isDeleting
                                  ? "scale(0.95)"
                                  : isAdding
                                    ? "translateY(-10px)"
                                    : "scale(1)",
                                transition:
                                  "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding 0.2s ease, transform 0.2s ease, background-color 0.15s ease",
                              }}
                            >
                              <div
                                {...provided.dragHandleProps}
                                style={{
                                  cursor: "grab",
                                  marginRight: "12px",
                                  color: "#bbb",
                                  fontSize: "16px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  userSelect: "none",
                                  padding: "0 4px",
                                  transform: "translateY(-1.5px)",
                                }}
                              >
                                ⣿
                              </div>
                              <input
                                type="checkbox"
                                checked={t.isCompleted}
                                onChange={() =>
                                  handleToggleCompleteWithAnimation(t.id)
                                }
                                style={{
                                  marginRight: "10px",
                                  width: "18px",
                                  height: "18px",
                                  flexShrink: 0,
                                  cursor: "pointer",
                                  appearance: "none",
                                  WebkitAppearance: "none",
                                  borderRadius: "50%",
                                  border: t.isCompleted
                                    ? "2px solid var(--accent)"
                                    : "2px solid #cbd5e0",
                                  backgroundColor: t.isCompleted
                                    ? "var(--accent)"
                                    : "#fff",
                                  backgroundImage: t.isCompleted
                                    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3E%3Cpath d='M13.3 3.3 6 10.6 2.7 7.3 1.3 8.7l4.7 4.7 8.7-8.7z'/%3E%3C/svg%3E\")"
                                    : "none",
                                  backgroundSize: "12px",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "center",
                                  transition:
                                    "background-color 0.15s ease, border-color 0.15s ease",
                                }}
                              />
                              <AutoResizeTextarea
                                t={t}
                                isFocused={t.id === focusTaskId}
                                onUpdateText={handleUpdateTaskText}
                                onBlurTask={handleBlurTask}
                                onEnterPress={handleCreateEmptyTask}
                                onBackspaceEmpty={handleBackspaceEmptyTask}
                                onArrowKeyPress={handleArrowKeyPress}
                              />
                              {/* スマホでは画面が狭いため移動ボタンは出さない（ドラッグで移動できる） */}
                              {!isMobile && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleMoveSectionWithAnimation(t.id)
                                }
                                style={{
                                  backgroundColor: "#fff3e0",
                                  color: "#e65100",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "4px 8px",
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                  marginLeft: "10px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                🔥 今日やるに移動
                              </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteTaskWithAnimation(t.id)
                                }
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#e74c3c",
                                  cursor: "pointer",
                                  marginLeft: "10px",
                                  fontSize: "14px",
                                  padding: "4px",
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <button
              type="button"
              onClick={() => handleCreateEmptyTask(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ececec";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#f7f7f7";
              }}
              style={{
                width: "100%",
                padding: "6px",
                marginTop: "8px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#f7f7f7",
                color: "#666",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "bold",
                textAlign: "left",
                transition: "background-color 0.15s ease",
              }}
            >
              ＋ ストックタスクを追加
            </button>
          </section>
        </div>
      </DragDropContext>
    </div>
  );
};
