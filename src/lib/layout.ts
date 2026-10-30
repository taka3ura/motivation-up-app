import type { CSSProperties } from "react";

// スマホ表示の下メニューの高さ(px)。iPhoneの画面下の余白(safe-area)は別に足す
export const BOTTOM_NAV_HEIGHT = 60;

// 下メニューの各ボタンの中身（アイコン＋文字）を囲む、角の丸い枠。
// 開いている画面のボタンは、この枠に薄い紫の背景を付けて光らせる
export const navPillStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1px",
  // 文字数によって枠の大きさが変わらないよう、幅を固定する
  // （4文字の「目標設定」「目標確認」が収まる幅に、他のボタンも合わせる）
  width: "60px",
  maxWidth: "100%", // 画面がとても狭い端末で、隣のボタンとくっつかないようにする
  boxSizing: "border-box",
  padding: "4px 0",
  borderRadius: "14px",
  transition: "background-color 0.2s ease, transform 0.2s ease",
};
