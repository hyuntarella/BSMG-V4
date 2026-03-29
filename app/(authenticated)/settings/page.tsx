import Header from '@/components/layout/Header'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-4 text-xl font-bold">설정</h1>
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-gray-500">설정 페이지 준비 중</p>
          <p className="mt-2 text-sm text-gray-400">P매트릭스, 원가, 비율 편집 기능이 추가될 예정입니다</p>
          <p className="mt-1 text-xs text-gray-400">견적서 내 설정 패널은 이미 사용 가능합니다</p>
        </div>
      </div>
    </div>
  )
}
