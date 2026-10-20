import React, { useRef, useLayoutEffect } from "react";
import { getRemainingDays, type FinalGoal } from "../lib/goal";

const AutoResizeTextarea = ({
  value,
  onChange,
  style,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
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
      onFocus={(e) => {
        e.target.style.backgroundColor = "#fffdf3";
      }}
      onBlur={(e) => {
        e.target.style.backgroundColor = "transparent";
      }}
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

const describeRemainingDays = (periodText: string): string => {
  if (!periodText) return "";
  const diffDays = getRemainingDays(periodText);
  if (diffDays === null) return "（正確な日付を入力すると残り日数が出ます）";

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

const labelStyle: React.CSSProperties = {
  margin: "0",
  fontWeight: "bold",
  color: "#333",
};

/**
 * 目的設定で決めた目標を表示し、その場で編集できるパネル。
 * PCでは画面右側に、スマホでは「目標確認」画面に表示する。
 */
export const GoalSummaryPanel: React.FC<{
  goal: FinalGoal | null;
  isChatComplete: boolean;
  onFieldChange: (key: keyof FinalGoal, value: string) => void;
}> = ({ goal, isChatComplete, onFieldChange }) => {
  return (
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
      {goal ? (
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
            <p style={labelStyle}>🏷️ 頑張りたいこと:</p>
            <AutoResizeTextarea
              value={goal.topic}
              onChange={(e) => onFieldChange("topic", e.target.value)}
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
            <p style={labelStyle}>⚠️ 現状の課題:</p>
            <AutoResizeTextarea
              value={goal.challenge}
              onChange={(e) => onFieldChange("challenge", e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* 3. 理想の未来 */}
          <div>
            <p style={labelStyle}>🌈 理想の未来:</p>
            <AutoResizeTextarea
              value={goal.idealFuture}
              onChange={(e) => onFieldChange("idealFuture", e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* 4. 期限 */}
          <div>
            <p style={labelStyle}>📅 期限:</p>
            <AutoResizeTextarea
              value={goal.deadline}
              onChange={(e) => onFieldChange("deadline", e.target.value)}
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
              {describeRemainingDays(goal.deadline)}
            </div>
          </div>
        </div>
      ) : (
        <p style={{ margin: "5px 0 0 0", color: "#666" }}>
          （チャット完了後に目標がここに表示されます）
        </p>
      )}
    </div>
  );
};
