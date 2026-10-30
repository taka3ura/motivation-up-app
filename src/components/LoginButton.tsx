import React, { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useAuth } from "../hooks/useAuth";
import { navPillStyle } from "../lib/layout";

// Googleでログインする。成功したらtrueを返す（PC用・スマホ用のボタンで共通）
const signInWithGoogle = async (): Promise<boolean> => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    return true;
  } catch (error) {
    console.error("ログインに失敗しました", error);
    const code = (error as { code?: string }).code ?? "unknown";
    // ポップアップを自分で閉じただけの場合は、エラー扱いしない
    if (
      code !== "auth/popup-closed-by-user" &&
      code !== "auth/cancelled-popup-request"
    ) {
      alert(`ログインに失敗しました。（エラーコード: ${code}）`);
    }
    return false;
  }
};

const signOutUser = () => {
  signOut(auth).catch((error) => {
    console.error("ログアウトに失敗しました", error);
  });
};

const SYNC_DESCRIPTION =
  "☁️ Googleアカウントでログインすると、スマホやPCなど複数の端末でデータを共有できます。";

/** PC用：メニュー左下に置くログインボタン */
export const LoginButton: React.FC = () => {
  const { user, authLoading } = useAuth();
  // アイコン・名前にマウスを乗せたときに出す、ログアウトのポップアップの開閉
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignIn = async () => {
    // ログイン後の表示に、ポップアップが開いたまま切り替わらないようにする
    if (await signInWithGoogle()) setIsMenuOpen(false);
  };

  const handleSignOut = () => {
    setIsMenuOpen(false);
    signOutUser();
  };

  if (authLoading) {
    return (
      <div style={{ padding: "10px", fontSize: "12px", color: "#999" }}>
        読み込み中...
      </div>
    );
  }

  if (user) {
    return (
      <div style={{ padding: "10px", borderTop: "1px solid #eee" }}>
        {/* アイコン・名前にマウスを乗せると、上にログアウトのポップアップを出す。
            ポップアップも同じ枠の中に置くことで、ポップアップへマウスを移しても閉じないようにする */}
        <div
          style={{ position: "relative" }}
          onMouseEnter={() => setIsMenuOpen(true)}
          onMouseLeave={() => setIsMenuOpen(false)}
        >
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              right: 0,
              paddingBottom: "6px", // アイコン行との間の隙間。ここもマウスが乗った状態として扱われる
              opacity: isMenuOpen ? 1 : 0,
              transform: isMenuOpen ? "translateY(0)" : "translateY(4px)",
              pointerEvents: isMenuOpen ? "auto" : "none",
              transition: "opacity 0.15s ease, transform 0.15s ease",
              zIndex: 10,
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
                padding: "4px",
              }}
            >
              <button
                type="button"
                onClick={handleSignOut}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#fee2e2";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  color: "#ef4444",
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background-color 0.15s ease",
                }}
              >
                ログアウト
              </button>
            </div>
          </div>

        {/* アイコンと名前を横並びにする。スマホなどホバーできない端末のため、タップでも開閉できる */}
        <div
          onClick={() => setIsMenuOpen((prev) => !prev)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px",
            borderRadius: "8px",
            cursor: "pointer",
            backgroundColor: isMenuOpen ? "var(--accent-bg)" : "transparent",
            transition: "background-color 0.15s ease",
          }}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-bg)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              {(user.displayName || "?").charAt(0)}
            </div>
          )}
          <div
            style={{
              flexGrow: 1,
              minWidth: 0,
              textAlign: "left", // アプリ全体の中央寄せ(#root)が効いて、アイコンから離れて見えるのを防ぐ
              fontSize: "13px",
              fontWeight: "bold",
              color: "#333",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={user.displayName || ""}
          >
            {user.displayName || "ログイン中"}
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "10px", borderTop: "1px solid #eee" }}>
      {/* ボタンにマウスを乗せると、ログインすると何ができるかをポップアップで説明する */}
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => setIsMenuOpen(true)}
        onMouseLeave={() => setIsMenuOpen(false)}
      >
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            right: 0,
            paddingBottom: "6px",
            opacity: isMenuOpen ? 1 : 0,
            transform: isMenuOpen ? "translateY(0)" : "translateY(4px)",
            pointerEvents: "none", // 説明を表示するだけなので、マウス操作は受け取らない
            transition: "opacity 0.15s ease, transform 0.15s ease",
            zIndex: 10,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
              padding: "10px 12px",
              fontSize: "12px",
              lineHeight: "1.5",
              color: "#555",
              textAlign: "left",
            }}
          >
            {SYNC_DESCRIPTION}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignIn}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: `1px solid ${isMenuOpen ? "var(--accent)" : "#ddd"}`,
            borderRadius: "6px",
            backgroundColor: isMenuOpen ? "var(--accent-bg)" : "#fff",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "bold",
            color: "#555",
            transition: "background-color 0.15s ease, border-color 0.15s ease",
          }}
        >
          🔑 ログインする
        </button>
      </div>
    </div>
  );
};

/**
 * スマホ用：下メニューに並べるログインボタン。
 * スマホにはホバーがないので、タップで上にポップアップを開く。
 * 未ログイン時は同期の説明とログインボタン、ログイン中は名前とログアウトを出す。
 */
export const NavLoginButton: React.FC<{ itemStyle: React.CSSProperties }> = ({
  itemStyle,
}) => {
  const { user, authLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignIn = async () => {
    if (await signInWithGoogle()) setIsMenuOpen(false);
  };

  const handleSignOut = () => {
    setIsMenuOpen(false);
    signOutUser();
  };

  const popupButtonStyle: React.CSSProperties = {
    width: "100%",
    marginTop: "10px",
    padding: "10px",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  };

  return (
    <div style={{ position: "relative", flex: 1, display: "flex" }}>
      {isMenuOpen && (
        <>
          {/* ポップアップの外側をタップしたら閉じる */}
          <div
            onClick={() => setIsMenuOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            className="fade-slide-in"
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: "8px",
              width: "min(260px, 80vw)",
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
              padding: "14px",
              boxSizing: "border-box",
              textAlign: "left",
              zIndex: 50,
            }}
          >
            {user ? (
              <>
                <div style={{ fontSize: "12px", color: "#999" }}>ログイン中</div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "#333",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.displayName || "ログイン中"}
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    ...popupButtonStyle,
                    backgroundColor: "#fee2e2",
                    color: "#ef4444",
                  }}
                >
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: "13px", lineHeight: 1.6, color: "#555" }}>
                  {SYNC_DESCRIPTION}
                </div>
                <button
                  type="button"
                  onClick={handleSignIn}
                  style={{
                    ...popupButtonStyle,
                    backgroundColor: "var(--accent-light)",
                    color: "#fff",
                  }}
                >
                  🔑 Googleでログイン
                </button>
              </>
            )}
          </div>
        </>
      )}

      <button
        type="button"
        disabled={authLoading}
        onClick={() => setIsMenuOpen((prev) => !prev)}
        style={{
          ...itemStyle,
          color: isMenuOpen ? "var(--accent)" : itemStyle.color,
        }}
      >
        {/* 他のメニューボタンと同じく、アイコンと文字をまとめて角の丸い枠で囲む。
            ポップアップを開いている間は、薄い紫で光らせる */}
        <span
          style={{
            ...navPillStyle,
            backgroundColor: isMenuOpen ? "var(--accent-bg)" : "transparent",
          }}
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              style={{ width: "24px", height: "24px", borderRadius: "50%" }}
            />
          ) : (
            <span style={{ fontSize: "20px", lineHeight: "24px" }}>
              {user ? "👤" : "🔑"}
            </span>
          )}
          <span style={{ fontWeight: isMenuOpen ? "bold" : "normal" }}>
            {user ? "ログイン中" : "ログイン"}
          </span>
        </span>
      </button>
    </div>
  );
};
