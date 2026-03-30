import { Resend } from 'resend'

// 런타임에 초기화 (빌드 시 환경변수 없어도 에러 없음)
let resend: Resend | null = null
function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY ?? '')
  }
  return resend
}

interface SendEstimateOptions {
  to: string
  estimateId: string
  mgmtNo: string
  customerName: string
  pdfBuffer?: Buffer
  excelBuffer?: Buffer
  /** 사이트 베이스 URL (추적 픽셀용) */
  baseUrl: string
}

/**
 * Resend로 견적서 이메일 발송
 * - PDF 첨부
 * - 열람 추적 1x1 픽셀 포함
 */
export async function sendEstimateEmail({
  to,
  estimateId,
  mgmtNo,
  customerName,
  pdfBuffer,
  excelBuffer,
  baseUrl,
}: SendEstimateOptions) {
  const trackingPixel = `<img src="${baseUrl}/api/track/${estimateId}" width="1" height="1" style="display:none" />`

  const attachments: { filename: string; content: Buffer }[] = []
  if (pdfBuffer) {
    attachments.push({ filename: `견적서_${mgmtNo}.pdf`, content: pdfBuffer })
  }
  if (excelBuffer) {
    attachments.push({ filename: `견적서_${mgmtNo}.xlsx`, content: excelBuffer })
  }

  const { data, error } = await getResend().emails.send({
    from: '방수명가 <estimate@bsmg.kr>',
    to: [to],
    subject: `[방수명가] 견적서 ${mgmtNo} - ${customerName ?? ''}`,
    html: `
      <div style="font-family: 'Pretendard', '맑은 고딕', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #A11D1F; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">방수명가 견적서</h1>
        </div>
        <div style="padding: 24px; background: #f9f9f9;">
          <p style="margin: 0 0 16px;">안녕하세요, ${customerName ?? '고객'}님.</p>
          <p style="margin: 0 0 16px;">요청하신 견적서를 보내드립니다.</p>
          <div style="background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px; font-size: 14px;"><strong>관리번호:</strong> ${mgmtNo}</p>
            <p style="margin: 0; font-size: 14px;"><strong>첨부파일:</strong> 견적서 ${attachments.length > 0 ? `(${attachments.map(a => a.filename).join(', ')})` : '없음'}</p>
          </div>
          <p style="margin: 0 0 8px; color: #666; font-size: 13px;">문의사항이 있으시면 언제든 연락 부탁드립니다.</p>
          <p style="margin: 0; color: #666; font-size: 13px;">감사합니다.</p>
        </div>
        <div style="background: #333; color: #999; padding: 12px; text-align: center; font-size: 11px;">
          방수명가 | 견적서 자동 발송 시스템
        </div>
        ${trackingPixel}
      </div>
    `,
    attachments,
  })

  if (error) {
    throw new Error(`이메일 발송 실패: ${error.message}`)
  }

  return data
}
