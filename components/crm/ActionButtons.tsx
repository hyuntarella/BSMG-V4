import type { CrmRecord } from '@/lib/notion/types';

// ── ActionButtons ──

interface ActionButtonsProps {
  record: CrmRecord;
}

export default function ActionButtons({ record }: ActionButtonsProps) {
  const addr = record.address ?? '';
  const phone = record.phone ?? '';
  const hasPhone = phone.trim() !== '';

  const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(addr)}`;
  const kakaoRoadviewUrl = `https://map.kakao.com/?q=${encodeURIComponent(addr)}`;
  const tmapUrl = `tmap://route?goalname=${encodeURIComponent(addr)}&goalx=&goaly=`;

  return (
    <div className="flex flex-wrap gap-2">
      {/* 지도 */}
      <a
        href={naverMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        지도
      </a>

      {/* 거리뷰 */}
      <a
        href={kakaoRoadviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
        거리뷰
      </a>

      {/* 내비 */}
      <a
        href={tmapUrl}
        className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        title="모바일에서만 동작합니다"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        내비
      </a>

      {/* 문자 */}
      <a
        href={hasPhone ? `sms:${phone}` : undefined}
        className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
          hasPhone
            ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
            : 'cursor-not-allowed border-gray-100 text-gray-300'
        }`}
        aria-disabled={!hasPhone}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
        </svg>
        문자
      </a>

      {/* 전화 */}
      <a
        href={hasPhone ? `tel:${phone}` : undefined}
        className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
          hasPhone
            ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
            : 'cursor-not-allowed border-gray-100 text-gray-300'
        }`}
        aria-disabled={!hasPhone}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
        전화
      </a>
    </div>
  );
}
