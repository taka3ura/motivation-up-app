import { useEffect, useSyncExternalStore } from "react";

// iPhoneなどでキーボードが出ると、画面の「実際に見えている範囲」(visualViewport)が縮み、
// さらに入力欄が見えるように、その範囲が下にずれる。高さとずれ(offsetTop)の両方を取得する
const subscribe = (onChange: () => void) => {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  viewport.addEventListener("resize", onChange);
  viewport.addEventListener("scroll", onChange);
  return () => {
    viewport.removeEventListener("resize", onChange);
    viewport.removeEventListener("scroll", onChange);
  };
};

const getHeight = () => window.visualViewport?.height ?? window.innerHeight;
const getOffsetTop = () => window.visualViewport?.offsetTop ?? 0;

/**
 * キーボードを除いた、実際に見えている範囲の高さ(height)と、
 * その範囲がページの一番上からどれだけ下にずれているか(offsetTop)を返す(px)。
 * アプリをこの位置・高さに合わせて置くと、キーボードのすぐ上に画面の下端が来る。
 *
 * enabledがtrueの間は、ページ全体がスクロールされてアプリの外側（真っ白な部分）が
 * 見えてしまわないよう、ページのスクロール位置を常に一番上に戻す。
 * （スクロールは、各画面の中だけで行う）
 */
export function useVisibleViewportHeight(enabled: boolean) {
  const height = useSyncExternalStore(subscribe, getHeight);
  const offsetTop = useSyncExternalStore(subscribe, getOffsetTop);

  useEffect(() => {
    if (!enabled) return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const keepPageAtTop = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    // キーボードが出てアプリの高さが縮むと、画面の下のほうにあった入力欄が
    // キーボードの裏に隠れてしまう。高さが変わり終わってから、入力中の欄が
    // 見える位置まで、画面の中をスクロールする
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    const scrollFocusedFieldIntoView = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const el = document.activeElement;
        // チェックボックスなど、キーボードが出ないものは対象にしない
        const isTextField =
          el instanceof HTMLTextAreaElement ||
          (el instanceof HTMLInputElement &&
            !["checkbox", "radio", "button", "submit"].includes(el.type));
        if (isTextField) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        keepPageAtTop();
      }, 150);
    };

    const handleResize = () => {
      keepPageAtTop();
      scrollFocusedFieldIntoView();
    };

    viewport.addEventListener("scroll", keepPageAtTop);
    viewport.addEventListener("resize", handleResize);
    window.addEventListener("scroll", keepPageAtTop);
    // キーボードが出たまま別の入力欄に移ったときも、見える位置まで動かす
    document.addEventListener("focusin", scrollFocusedFieldIntoView);
    return () => {
      clearTimeout(scrollTimer);
      viewport.removeEventListener("scroll", keepPageAtTop);
      viewport.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", keepPageAtTop);
      document.removeEventListener("focusin", scrollFocusedFieldIntoView);
    };
  }, [enabled]);

  return { height, offsetTop };
}
