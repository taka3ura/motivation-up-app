import { useEffect, useSyncExternalStore } from "react";

// iPhoneなどでキーボードが出ると、画面の「実際に見えている範囲」(visualViewport)だけが縮む。
// その高さを取得し、変わったら更新する
const subscribe = (onChange: () => void) => {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  viewport.addEventListener("resize", onChange);
  return () => viewport.removeEventListener("resize", onChange);
};

const getSnapshot = () => window.visualViewport?.height ?? window.innerHeight;

/**
 * キーボードを除いた、実際に見えている画面の高さ(px)を返す。
 * enabledがtrueの間は、ページ全体がスクロールされてアプリの外側（真っ白な部分）が
 * 見えてしまわないよう、ページのスクロール位置を常に一番上に戻す。
 * （スクロールは、各画面の中だけで行う）
 */
export function useVisibleViewportHeight(enabled: boolean) {
  const height = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (!enabled) return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const keepPageAtTop = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    viewport.addEventListener("scroll", keepPageAtTop);
    viewport.addEventListener("resize", keepPageAtTop);
    window.addEventListener("scroll", keepPageAtTop);
    return () => {
      viewport.removeEventListener("scroll", keepPageAtTop);
      viewport.removeEventListener("resize", keepPageAtTop);
      window.removeEventListener("scroll", keepPageAtTop);
    };
  }, [enabled]);

  return height;
}
