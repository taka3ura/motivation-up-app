import { useLayoutEffect, useRef } from "react";

/**
 * 入力内容に合わせてtextareaの高さを自動調整するフック。
 * 改行（Shift+Enter）でも、文字が自然に折り返された場合でも広がる。
 * maxHeightを超えたらスクロールバーを表示する。
 *
 * @param value 入力中のテキスト（変化するたびに高さを再計算する）
 * @param maxHeight 最大の高さ(px)。デフォルトは14px×行間1.4×5行 + padding20px + 枠線2px
 * @param resetKey textareaが表示され直すタイミングで再計算したいときに渡す値
 */
export function useAutoResizeTextarea(
  value: string,
  maxHeight = 120,
  resetKey?: unknown,
) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto"; // 一度リセットしないと縮まない
    const border = el.offsetHeight - el.clientHeight;
    const contentHeight = el.scrollHeight + border;
    el.style.height = `${Math.min(contentHeight, maxHeight)}px`;
    el.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight, resetKey]);

  return ref;
}
