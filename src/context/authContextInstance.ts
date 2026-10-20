import { createContext } from "react";
import type { User } from "firebase/auth";

export interface AuthContextValue {
  user: User | null;
  // Firebaseが「ログイン状態を確認中」の間はtrue。falseになったら確定（未ログインもログイン済みも含む）
  authLoading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  authLoading: true,
});
