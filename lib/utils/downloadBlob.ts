/**
 * 응답 Blob을 파일로 다운로드한다
 */
export async function downloadBlobResponse(res: Response, filename: string): Promise<void> {
  if (!res.ok) throw new Error('파일 생성 실패')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
