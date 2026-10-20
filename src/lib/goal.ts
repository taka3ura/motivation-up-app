// 目的設定機能で確定した目標
export interface FinalGoal {
  topic: string; // 頑張りたいこと
  challenge: string; // 現状の課題
  idealFuture: string; // 理想の未来
  deadline: string; // 期限
}

// 期限の文字列（"2027/04/01" や "2027年4月1日" など）から、今日からの残り日数を返す。
// 日付として読めない場合は null。期限を過ぎていればマイナスになる。
export const getRemainingDays = (periodText: string): number | null => {
  const matches = periodText.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (!matches) return null;

  const targetDate = new Date(
    parseInt(matches[1], 10),
    parseInt(matches[2], 10) - 1,
    parseInt(matches[3], 10),
  );
  const today = new Date();
  targetDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};
