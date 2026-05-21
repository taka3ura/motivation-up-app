// src/App.tsx
import './App.css';
import { GoalFormAndChat } from './components/GoalFormAndChat.tsx';

function App() {
  return (
    <div className="app-container" style={{ display: "flex", height: "100vh" }}>
      
      {/* 【左側】：メニューバー（ひとまずモックとして枠だけ用意） */}
      <aside className="sidebar" style={{ width: "20%", borderRight: "3px solid #eee", padding: "20px" }}>
        <h3>メニュー</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ marginBottom: "10px", fontWeight: "bold", color: "#007bff" }}>🎯 目的の設定</li>
          <li style={{ marginBottom: "10px", color: "#666" }}>📝 タスク管理</li>
          <li style={{ marginBottom: "10px", color: "#666" }}>💬 モチベ低下の相談</li>
        </ul>
      </aside>

      {/* 【中央】：メインコンテンツ */}
      <main className="main-content" style={{ width: "55%", padding: "20px", overflowY: "auto" }}>
        {/* 2. ここで呼び出す！ */}
        <GoalFormAndChat />
      </main>

      {/* 【右側】：サポート ＆ キャラクターエリア（枠だけ用意） */}
      <aside className="support-bar" style={{ width: "25%", borderLeft: "3px solid #eee", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div className="current-goal" style={{ border: "1px solid #ffeeba", backgroundColor: "#fff3cd", padding: "15px", borderRadius: "8px" }}>
          <strong>今の目標：</strong>
          <p style={{ margin: "5px 0 0 0", color: "#666" }}>（チャット完了後にここに反映されます）</p>
        </div>
        
        <div className="character-area" style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "8px", textAlign: "center", backgroundColor: "#f9f9f9" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🤖</div>
          <p style={{ margin: 0, fontSize: "14px" }}>「まずは中央の画面で、あなたのことを教えてね！」</p>
        </div>
      </aside>

    </div>
  );
}

export default App;