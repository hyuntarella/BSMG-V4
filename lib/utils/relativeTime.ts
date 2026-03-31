/**
 * 상대 시간 포맷 유틸
 * 24시간 이내: 시간 단위 ("3시간 전", "방금 전")
 * 24시간 이후: 일 단위 ("5일 전")
 * 30일 이상: "30일+ 전"
 */
export function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? '방금 전' : `${diffMinutes}분 전`;
  }

  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  if (diffDays >= 30) {
    return '30일+ 전';
  }

  return `${diffDays}일 전`;
}
