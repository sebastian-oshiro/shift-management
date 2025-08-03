// 日時フォーマット変換のユーティリティ

/**
 * ISO形式の時間文字列をHH:MM形式に変換
 * @param timeString - ISO形式の時間文字列 (例: "0000-01-01T16:35:00Z")
 * @returns HH:MM形式の時間文字列 (例: "16:35")
 */
export const convertTimeFormat = (timeString: string): string => {
  if (!timeString) return '';
  
  if (timeString.includes('T') && timeString.includes('Z')) {
    const timeMatch = timeString.match(/T(\d{2}:\d{2}):\d{2}Z/);
    if (timeMatch) {
      return timeMatch[1];
    }
  }
  
  return timeString;
};

/**
 * ISO形式の日付文字列を日本語形式に変換
 * @param dateString - ISO形式の日付文字列 (例: "2025-01-15")
 * @returns 日本語形式の日付文字列 (例: "2025年1月15日")
 */
export const convertDateFormat = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return `${year}年${month}月${day}日`;
};

/**
 * ISO形式の日時文字列を日本語形式に変換
 * @param dateTimeString - ISO形式の日時文字列 (例: "2025-01-15T16:35:00Z")
 * @returns 日本語形式の日時文字列 (例: "1月15日16:35")
 */
export const convertDateTimeFormat = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  
  if (dateTimeString.includes('T') && dateTimeString.includes('Z')) {
    const dateMatch = dateTimeString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}):\d{2}Z/);
    if (dateMatch) {
      const [, year, month, day, time] = dateMatch;
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      return `${monthNum}月${dayNum}日${time}`;
    }
  }
  
  return dateTimeString;
};

/**
 * 勤務時間を計算（時間と分の形式で返す）
 * @param clockIn - 出勤時間
 * @param clockOut - 退勤時間
 * @returns { hours: number, minutes: number } 形式の勤務時間
 */
export const calculateWorkHours = (clockIn: string, clockOut: string): { hours: number, minutes: number } => {
  if (!clockIn || !clockOut) return { hours: 0, minutes: 0 };
  
  const startTime = convertTimeFormat(clockIn);
  const endTime = convertTimeFormat(clockOut);
  
  if (!startTime || !endTime) return { hours: 0, minutes: 0 };
  
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  
  // 日付をまたぐ場合の処理
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }
  
  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return { hours, minutes };
};

/**
 * 勤務時間を文字列形式で表示
 * @param clockIn - 出勤時間
 * @param clockOut - 退勤時間
 * @returns "H:MM" 形式の勤務時間文字列
 */
export const formatWorkHours = (clockIn: string, clockOut: string): string => {
  const { hours, minutes } = calculateWorkHours(clockIn, clockOut);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}; 