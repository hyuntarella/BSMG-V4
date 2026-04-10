// ── Lens HMAC 인증 ──

import { createHmac, timingSafeEqual } from 'crypto';

const TIMESTAMP_MAX_AGE_MS = 5 * 60 * 1000; // 5분

function getSecret(): string {
  const secret = process.env.LENS_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('LENS_WEBHOOK_SECRET 환경변수가 설정되지 않았습니다');
  }
  return secret;
}

/**
 * HMAC-SHA256 서명 검증
 * signature = HMAC-SHA256(secret, timestamp + body)
 */
export function verifyLensSignature(
  signature: string,
  timestamp: string,
  body: string,
): boolean {
  const secret = getSecret();
  const expected = createHmac('sha256', secret)
    .update(timestamp + body)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');

  if (sigBuf.length !== expBuf.length) {
    return false;
  }

  return timingSafeEqual(sigBuf, expBuf);
}

/**
 * Lens 요청 전체 검증 (서명 + 타임스탬프)
 */
export function validateLensRequest(
  headers: Headers,
  body: string,
): { valid: boolean; error?: string } {
  const signature = headers.get('X-Lens-Signature');
  const timestamp = headers.get('X-Lens-Timestamp');

  if (!signature || !timestamp) {
    return { valid: false, error: 'X-Lens-Signature 또는 X-Lens-Timestamp 헤더 누락' };
  }

  const ts = Number(timestamp);
  if (isNaN(ts)) {
    return { valid: false, error: '유효하지 않은 타임스탬프' };
  }

  const age = Math.abs(Date.now() - ts);
  if (age > TIMESTAMP_MAX_AGE_MS) {
    return { valid: false, error: '타임스탬프 만료 (5분 초과)' };
  }

  const isValid = verifyLensSignature(signature, timestamp, body);
  if (!isValid) {
    return { valid: false, error: '서명 불일치' };
  }

  return { valid: true };
}
