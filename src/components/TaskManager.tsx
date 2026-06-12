import React, { useState } from "react";

interface Task {
  id: string;
  mainGoal: string; // 大きな目標
  smallStep: string; // 細かい目標（最初の一歩）
  isCompleted: boolean;
}

export const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("daily_tasks");
    return saved ? JSON.parse(saved) : [];
  });

  const [mainInput, setMainInput] = useState("");
  const [smallInput, setSmallInput] = useState("");
  const [praiseMessage, setPraiseMessage] = useState("");

  const praisePhrases = [
    "最高！その調子！天才か？🔥",
    "一歩前進したね！素晴らしい行動力！✨",
    "確実に合格へ近づいてるよ！ナイス！👏",
    "小さく始めてやり切るの、本当に偉い！🎯",
    "この積み重ねが大きな力になるよ！👍",
  ];

  const handleAddTask = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mainInput.trim() || !smallInput.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      mainGoal: mainInput.trim(),
      smallStep: smallInput.trim(),
      isCompleted: false,
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    localStorage.setItem("daily_tasks", JSON.stringify(updated));

    setMainInput("");
    setSmallInput("");
  };

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        const nextState = !t.isCompleted;
        if (nextState) {
          // ⭕ チェックを入れた瞬間にランダムで褒める
          const randomPhrase =
            praisePhrases[Math.floor(Math.random() * praisePhrases.length)];
          setPraiseMessage(randomPhrase);
          setTimeout(() => setPraiseMessage(""), 4000); // 4秒後にメッセージを消す
        }
        return { ...t, isCompleted: nextState };
      }
      return t;
    });

    setTasks(updated);
    localStorage.setItem("daily_tasks", JSON.stringify(updated));
  };

  const activeTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasks = tasks.filter((t) => t.isCompleted);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
      {/* ＝ 上部：自己効力感を促すメッセージと入力欄 ＝ */}
      <section
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "20px",
          backgroundColor: "#fff",
        }}
      >
        <h2 style={{ fontSize: "18px", margin: "0 0 5px 0" }}>📝 タスク管理</h2>
        <p
          style={{
            color: "#e67e22",
            fontWeight: "bold",
            fontSize: "14px",
            margin: "0 0 15px 0",
          }}
        >
          🎯 まずは今日、確実にクリアできそうな小さな目標から立ててみよう！
        </p>

        <form
          onSubmit={handleAddTask}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <div>
            <label style={{ fontSize: "13px", fontWeight: "bold" }}>
              今日やりたい大きな目標：
            </label>
            <input
              type="text"
              value={mainInput}
              onChange={(e) => setMainInput(e.target.value)}
              placeholder="例：参考書の第3章を解く"
              required
              style={{
                width: "100%",
                padding: "8px",
                marginTop: "4px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: "bold" }}>
              そのための最初の一歩（細かい目標）：
            </label>
            <input
              type="text"
              value={smallInput}
              onChange={(e) => setSmallInput(e.target.value)}
              placeholder="例：本を広げて1問目だけ見る（ハードルは低くていいよ！）"
              required
              style={{
                width: "100%",
                padding: "8px",
                marginTop: "4px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "10px",
              fontWeight: "bold",
              cursor: "pointer",
              marginTop: "5px",
            }}
          >
            タスクを追加する
          </button>
        </form>
      </section>

      {/* 🎉 褒め言葉ポップアップエリア */}
      {praiseMessage && (
        <div
          style={{
            backgroundColor: "#d1e7dd",
            color: "#0f5132",
            padding: "12px",
            borderRadius: "6px",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "15px",
            animation: "fade 0.5s",
          }}
        >
          {praiseMessage}
        </div>
      )}

      {/* ＝ 中部：未完了タスク ＝ */}
      <section>
        <h3 style={{ fontSize: "15px", marginBottom: "10px" }}>
          🔥 今日のチャレンジ
        </h3>
        {activeTasks.length === 0 ? (
          <p
            style={{
              color: "#999",
              fontSize: "13px",
              padding: "10px",
              border: "1px dashed #ddd",
              borderRadius: "6px",
              textAlign: "center",
            }}
          >
            今日の予定はすべてクリア、または未登録です！
          </p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {activeTasks.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "12px",
                  border: "1px solid #eee",
                  borderRadius: "6px",
                  backgroundColor: "#fff",
                }}
              >
                <input
                  type="checkbox"
                  checked={t.isCompleted}
                  onChange={() => handleToggleTask(t.id)}
                  style={{
                    width: "18px",
                    height: "18px",
                    marginTop: "3px",
                    cursor: "pointer",
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "#2c3e50",
                    }}
                  >
                    {t.smallStep}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#7f8c8d",
                      marginTop: "2px",
                    }}
                  >
                    （大目標: {t.mainGoal}）
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ＝ 下部：今日やったタスク（できたことリスト） ＝ */}
      <section style={{ borderTop: "2px dashed #eee", paddingTop: "15px" }}>
        <h3
          style={{ fontSize: "15px", color: "#2e7d32", marginBottom: "10px" }}
        >
          ✅ 今日できたことリスト
        </h3>
        {completedTasks.length === 0 ? (
          <p
            style={{
              color: "#999",
              fontSize: "13px",
              textAlign: "center",
              padding: "10px",
            }}
          >
            チェックを入れると、ここに実績がたまっていきます！
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {completedTasks.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px",
                  borderRadius: "6px",
                  backgroundColor: "#f4fbf7",
                  border: "1px solid #e8f5e9",
                }}
              >
                <input
                  type="checkbox"
                  checked={t.isCompleted}
                  onChange={() => handleToggleTask(t.id)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span
                  style={{
                    fontSize: "13px",
                    textDecoration: "line-through",
                    color: "#81c784",
                  }}
                >
                  {t.smallStep}{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#b2dfdb",
                      textDecoration: "none",
                    }}
                  >
                    {" "}
                    (達成！🎉)
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
