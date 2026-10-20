import { useEffect, useRef, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../hooks/useAuth";

/**
 * localStorageに保存しつつ、ログイン中はFirestore（users/{uid}/app_state/{storageKey}）にも
 * 同期して保存する状態フック。複数端末でログインすれば、同じデータが見える。
 *
 * - 未ログイン時：これまで通りlocalStorageのみで動く
 * - ログイン時：
 *   - まずクラウドを読み込み、データがあればそれで今の状態を上書きする
 *     （クラウドにまだ何もなければ、今の端末の内容をそのままアップロードする）
 *   - 読み込みが終わってから、値が変わるたびにクラウドへも保存する
 */
export function useCloudSyncedState<T>(storageKey: string, initialValue: T) {
  const { user } = useAuth();
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return initialValue;
    try {
      return JSON.parse(saved) as T;
    } catch {
      // 以前はJSON化せず生の文字列のまま保存していたキー（brain_dump_memoなど）との
      // 互換性のため、JSONとして読めない場合は生の文字列をそのまま使う
      return saved as unknown as T;
    }
  });

  // クラウドの初回読み込みが完了したuid。これがログイン中のuidと一致するまではクラウドに書き込まない。
  // （読み込み前に書き込むと、新しい端末の空データでクラウドの本物のデータを上書きしてしまうため）
  const [syncedUid, setSyncedUid] = useState<string | null>(null);

  // 初回アップロードで「その時点の値」を使うために、最新の値を参照できるようにしておく
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const ref = doc(db, "users", user.uid, "app_state", storageKey);
    getDoc(ref)
      .then(async (snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          setValue(snap.data().value as T);
        } else {
          await setDoc(ref, { value: valueRef.current });
        }
        if (!cancelled) setSyncedUid(user.uid);
      })
      .catch((e) =>
        console.error(`[cloud sync] ${storageKey} の読み込みに失敗しました`, e),
      );

    return () => {
      cancelled = true;
    };
  }, [user, storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(value));

    if (user && syncedUid === user.uid) {
      const ref = doc(db, "users", user.uid, "app_state", storageKey);
      setDoc(ref, { value }).catch((e) =>
        console.error(`[cloud sync] ${storageKey} の保存に失敗しました`, e),
      );
    }
  }, [value, user, syncedUid, storageKey]);

  return [value, setValue] as const;
}
