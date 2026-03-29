import Header from '@/components/layout/Header'

export default function CrmPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-4 text-xl font-bold">CRM</h1>
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-gray-500">Notion CRM 연동 준비 중</p>
          <p className="mt-2 text-sm text-gray-400">칸반보드 + 고객 관리 기능이 추가될 예정입니다</p>
        </div>
      </div>
    </div>
  )
}
