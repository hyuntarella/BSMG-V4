'use client'

import FavoritesEditor from './FavoritesEditor'
import OtherItemsEditor from './OtherItemsEditor'
import NewItemsEditor from './NewItemsEditor'

/**
 * "자주 쓰는 공종" 페이지 — 3개 섹션:
 *   1) 즐겨찾기 (cost_config.favorites) — 견적서 QuickAddChips 와 동기화
 *   2) 기타 (cost_config.other_items) — acdb 기반 사용자 단가
 *   3) 신규 (cost_config.new_items) — 견적 저장 시 자동 등록
 *
 * 각 섹션은 독립 컴포넌트로 분리 (200줄 제한).
 */
export default function FavoriteItemsPage() {
  return (
    <div className="space-y-8">
      <section>
        <header className="mb-3">
          <h2 className="text-base font-semibold text-gray-800">즐겨찾기 공종</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            견적서 하단 빠른추가 칩으로 표시됩니다. 카테고리/순서 편집 가능.
          </p>
        </header>
        <FavoritesEditor />
      </section>

      <section>
        <header className="mb-3">
          <h2 className="text-base font-semibold text-gray-800">기타 공종</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            acdb 사전에서 공종을 골라 자체 단가를 입력합니다. 즐겨찾기로 승격할 수 있습니다.
          </p>
        </header>
        <OtherItemsEditor />
      </section>

      <section>
        <header className="mb-3">
          <h2 className="text-base font-semibold text-gray-800">신규 공종</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            견적 저장 시 규칙서에 없던 공종이 자동 등록됩니다. 즐겨찾기/기타로 승격 가능.
          </p>
        </header>
        <NewItemsEditor />
      </section>
    </div>
  )
}
