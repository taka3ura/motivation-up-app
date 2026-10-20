import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavLoginButton } from "./LoginButton";
import { BOTTOM_NAV_HEIGHT } from "../lib/layout";

const NAV_ITEMS = [
  { path: "/goal", icon: "🎯", label: "目標設定" },
  { path: "/task", icon: "📝", label: "タスク" },
  { path: "/consult", icon: "💬", label: "相談" },
  { path: "/summary", icon: "📋", label: "目標確認" },
];

const baseItemStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "2px",
  height: `${BOTTOM_NAV_HEIGHT}px`,
  padding: 0,
  border: "none",
  backgroundColor: "transparent",
  color: "#888",
  fontSize: "11px",
  fontWeight: "bold",
  fontFamily: "inherit",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent", // タップ時に出る灰色の四角を消す
};

/** スマホ用：画面下に固定するメニュー（左からログイン・目標設定・タスク・相談・目標確認） */
export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        backgroundColor: "#fff",
        borderTop: "1px solid #eee",
        // iPhoneの画面下のホームバーにボタンが重ならないようにする
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 30,
      }}
    >
      <NavLoginButton itemStyle={baseItemStyle} />
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            style={{
              ...baseItemStyle,
              color: isActive ? "var(--accent)" : "#888",
              backgroundColor: isActive ? "var(--accent-bg)" : "transparent",
            }}
          >
            <span style={{ fontSize: "20px", lineHeight: "24px" }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
