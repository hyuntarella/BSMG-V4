'use client'

interface InitialGuideProps {
  onCreateSheets: () => void
}

const GUIDE_ITEMS = [
  { num: '1', label: '면적', example: '"150헤베" 또는 "50평"' },
  { num: '2', label: '벽체 면적', example: '"벽체 30미터" 또는 "없어"' },
  { num: '3', label: '복합 평단가', example: '"3만5천" 또는 "마진 50%에 맞춰줘"' },
  { num: '4', label: '우레탄 평단가', example: '"3만" 또는 마진 기반' },
]

export default function InitialGuide({ onCreateSheets }: InitialGuideProps) {
  return (
    <div className="mx-auto max-w-md space-y-4 py-8">
      <h2 className="text-center text-lg font-bold text-gray-800">견적서 작성</h2>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-gray-700">음성으로 다음 정보를 순서대로 수집합니다:</p>
        <div className="space-y-2">
          {GUIDE_ITEMS.map(item => (
            <div key={item.num} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{item.num}</span>
              <div>
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500">{item.example}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 p-3">
        <p className="mb-2 text-xs font-semibold text-blue-700">음성 조작 방법</p>
        <div className="space-y-1 text-xs text-blue-600">
          <p><span className="font-bold">&quot;견적&quot;</span> — 녹음 시작 (웨이크워드)</p>
          <p><span className="font-bold">&quot;됐어&quot; / &quot;넘겨&quot;</span> — 마디 종료, 다음 항목</p>
          <p><span className="font-bold">&quot;그만&quot;</span> — 녹음 취소</p>
          <p><span className="font-bold">Space / 볼륨 버튼</span> — 수동 녹음 토글</p>
        </div>
      </div>

      <button
        onClick={onCreateSheets}
        className="w-full rounded-lg bg-brand py-3 text-sm font-bold text-white"
      >
        복합+우레탄 바로 생성
      </button>
    </div>
  )
}
