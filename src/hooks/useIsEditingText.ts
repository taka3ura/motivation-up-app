import { useEffect, useState } from "react";

// キーボードが出ない種類の入力（チェックボックスなど）は除く
const NON_TEXT_INPUT_TYPES = [
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "range",
  "color",
  "file",
];

const isTextField = (el: Element | null) => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName === "INPUT") {
    return !NON_TEXT_INPUT_TYPES.includes((el as HTMLInputElement).type);
  }
  return el.isContentEditable;
};

/**
 * 文字の入力欄にカーソルがある（＝スマホではキーボードが出ている）ときtrue。
 * iPhoneでは、キーボードが出ると画面下に固定したメニューがキーボードの上に押し上げられるため、
 * その間だけメニューを隠すのに使う。
 */
export function useIsEditingText() {
  const [isEditing, setIsEditing] = useState(() =>
    isTextField(document.activeElement),
  );

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (isTextField(e.target as Element)) setIsEditing(true);
    };
    // 入力欄から別の入力欄へ移るときに一瞬メニューが出てしまわないよう、
    // フォーカスが移り終わってから判定する
    const handleFocusOut = () => {
      setTimeout(() => setIsEditing(isTextField(document.activeElement)), 0);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return isEditing;
}
