import { useSyncExternalStore } from "react";

// この幅以下をスマホ表示にする
const MOBILE_QUERY = "(max-width: 768px)";

const subscribe = (onChange: () => void) => {
  const mediaQuery = window.matchMedia(MOBILE_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
};

const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;

/** 画面幅が狭い（スマホ表示にすべき）ときtrue。画面幅が変わると自動で切り替わる */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
