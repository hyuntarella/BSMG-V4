# PDF Pipeline Export — proposal-system → bsmg-v5

> **Source:** `C:\Users\lazdo\projects\proposal-system` (branch `main`, commit `96e0a06 v1 frozen - proposal system design complete`)
> **Purpose:** Reference snapshot of this repo's PDF generation pipeline, for porting into `bsmg-v5`.
> **Today:** 2026-04-14

---

## 1. 개요

**한 줄 요약:** Next.js App Router에서 손님 열람용 HTML 페이지(`/p/:externalId?t=:token`)를 서버 사이드 `puppeteer`로 headless Chrome에 로드해 A4(595×842px) 단일 PDF로 렌더링한다.

**기술 스택 (버전은 `package.json` 기준, §2 참조):**
- Next.js 15 (`^15.0.3`) — App Router, Server Components, route handlers.
- React 19 (`^19.0.0`) + `react-dom` (`^19.0.0`). PDF용 컴포넌트는 별도 renderToString 없이 **동일한 SSR 경로**로 렌더된다. PDF 전용 React 컴포넌트는 없고, 손님 열람 페이지와 **100% 같은 컴포넌트**를 재사용.
- **puppeteer `^23.9.0`** — full puppeteer (Chromium 번들 포함). `puppeteer-core` 는 사용하지 않음.
- **`@sparticuz/chromium` — 해당 레포에 없음.** 코드 주석(`lib/pdf/generate.ts:7`)에 "프로덕션 배포 시 @sparticuz/chromium 사용 권장 (serverless)"이라고만 적혀 있고 의존성에는 포함되어 있지 않다. 현재는 로컬 Puppeteer 번들 Chromium만 동작.
- **PDF 후처리 라이브러리 없음** (ghostscript, pdf-lib 등 사용 안 함).
- **이미지 포맷:** JPG/PNG/SVG 혼용. WebP/AVIF 변환 없음.
- **폰트:** 로컬 `woff2` 2종 + Pretendard CDN + Noto Sans KR CDN.

**렌더 흐름:**

```
Figma (원본 디자인, 좌표·크기·폰트 모두 1:1 기록)
   │
   ▼
components/proposal/pages/Page1Cover.tsx ~ Page5Principles.tsx
   (절대 좌표 position:absolute, 595×842 고정박스)
   │
   ▼
app/p/[id]/page.tsx
   (token 검증 → prisma.proposal.findUnique → ProposalRenderer)
   │
   ▼
styles/proposal.css   (@font-face, .pp-page, body.pp-pdf 모드)
   │
   ▼  [PDF 생성 경로]
   │
app/api/proposals/[id]/pdf/route.ts
   (externalId → buildWebUrl(HMAC token) → renderProposalPdf)
   │
   ▼
lib/pdf/generate.ts
   puppeteer.launch (headless Chrome, --no-sandbox 등)
   → page.setViewport(595, 842, DPR 2)
   → page.goto(viewUrl, waitUntil: 'networkidle0')
   → document.body.classList.add('pp-pdf')
   → document.fonts.ready + 500ms sleep
   → page.pdf(width 595px, height 842px, printBackground, preferCSSPageSize, margin 0)
   │
   ▼
Buffer → new Uint8Array → Response(application/pdf)
```

---

## 2. 의존성

PDF·Chromium·폰트·이미지 관련만 추출 (`package.json` 원본):

```json
// package.json
{
  "dependencies": {
    "next": "^15.0.3",
    "puppeteer": "^23.9.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

`@sparticuz/chromium`, `puppeteer-core`, `sharp`, `pdf-lib`, `ghostscript`, `subset-font` 등 **모두 해당 레포에 없음**. 이미지/폰트 후처리 의존성도 없음.

---

## 3. 디렉토리 구조

PDF 관련 파일만 추출 (tree):

```
proposal-system/
├── app/
│   ├── api/
│   │   └── proposals/
│   │       └── [id]/
│   │           └── pdf/
│   │               └── route.ts              ← PDF 엔드포인트
│   ├── p/
│   │   └── [id]/
│   │       └── page.tsx                      ← Puppeteer가 로드하는 HTML 페이지
│   └── layout.tsx                            ← proposal.css 전역 import
├── components/
│   └── proposal/
│       ├── Logo.tsx
│       ├── ProposalRenderer.tsx
│       └── pages/
│           ├── Page1Cover.tsx
│           ├── Page2Diagnosis.tsx
│           ├── Page3Solution.tsx
│           ├── Page4Pricing.tsx
│           └── Page5Principles.tsx
├── lib/
│   ├── pdf/
│   │   └── generate.ts                       ← Puppeteer 래퍼
│   ├── proposal/
│   │   ├── mapper.ts
│   │   ├── methods.ts
│   │   └── types.ts
│   ├── auth/
│   │   └── token.ts                          ← HMAC 토큰 (PDF URL 서명)
│   └── url/
│       └── build.ts                          ← buildWebUrl / buildPdfUrl
├── public/
│   ├── logo.jpg                              (90,760 B)
│   ├── logo.png                              (34,005 B)
│   ├── fonts/
│   │   ├── cheongdom.woff2                   (486,808 B)
│   │   └── cheongdol.woff2                   (498,944 B)
│   └── assets/
│       ├── p1_badge_v1.svg / v3.svg / v4.svg
│       ├── p1_cover_bg.jpg                   (504 KB)
│       ├── p1_seal.png                       (12 KB)
│       ├── p2_line_103.svg
│       ├── p2_quote_open.svg / close.svg
│       ├── p3_case1.png (32K) / case2.png (56K) / case3.png (104K)
│       ├── p3_line_104.svg
│       ├── p4_line_192 / 202 / 204 / 293.svg
│       ├── p4_std_accent.svg
│       ├── p5_brand_samsung.png (120K) / raemian.svg / woojung.png (44K)
│       ├── p5_brand_jongro.png (20K) / seoul_junggu.svg / gimpo.png (48K)
│       └── p5_line_93.svg
├── styles/
│   └── proposal.css                          ← @font-face, .pp-page, body.pp-pdf
├── next.config.js                            ← serverExternalPackages: ['puppeteer']
└── package.json
```

---

## 4. 핵심 파일 전체 코드

### 4.1 PDF 생성 API 라우트

```ts
// app/api/proposals/[id]/pdf/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { renderProposalPdf } from '@/lib/pdf/generate';
import { buildWebUrl } from '@/lib/url/build';

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/proposals/:id/pdf
   Puppeteer로 손님 열람 페이지(/p/:id?t=...)를 렌더링하여 PDF 반환.

   쿼리 파라미터:
   - download=1: attachment로 다운로드 (기본: inline)
   ═══════════════════════════════════════════════════════════════════════════ */

export const maxDuration = 60; // PDF 생성은 오래 걸릴 수 있음

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { externalId: id },
    select: { externalId: true, customerName: true, siteAddress: true },
  });

  if (!proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const viewUrl = buildWebUrl(proposal.externalId);

  try {
    const pdfBuffer = await renderProposalPdf(viewUrl);

    const url = new URL(request.url);
    const download = url.searchParams.get('download') === '1';
    const filename = `제안서_${proposal.siteAddress.replace(/[^가-힣a-zA-Z0-9]/g, '_')}_${id}.pdf`;
    const disposition = download
      ? `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
      : `inline; filename*=UTF-8''${encodeURIComponent(filename)}`;

    // Next.js 15 요구사항: Uint8Array로 변환
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (err) {
    console.error('PDF generation failed:', err);
    return NextResponse.json(
      { error: 'PDF generation failed', detail: String(err) },
      { status: 500 }
    );
  }
}
```

### 4.2 PDF용 React 컴포넌트

**주의:** PDF 전용 컴포넌트는 없다. 아래 컴포넌트들은 손님 열람 페이지와 **완전히 동일**하게 사용된다. Puppeteer는 `/p/:id?t=:token` URL 을 로드해 스냅샷만 찍고, body에 `pp-pdf` 클래스만 추가한다 (`styles/proposal.css` §4.4 참조).

#### 4.2.1 엔트리 페이지

```tsx
// app/p/[id]/page.tsx
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { verifyProposalToken } from '@/lib/auth/token';
import { proposalToRenderData } from '@/lib/proposal/mapper';
import ProposalRenderer from '@/components/proposal/ProposalRenderer';
import TrackingBeacon from '@/components/proposal/tracking/TrackingBeacon';

/* ═══════════════════════════════════════════════════════════════════════════
   손님 열람 페이지
   URL: /p/:externalId?t=:token
   - 토큰 검증 후 렌더
   - 추적 beacon 삽입
   - 인증 불필요 (링크를 아는 사람만 접근)
   ═══════════════════════════════════════════════════════════════════════════ */

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

export default async function ProposalViewPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { t } = await searchParams;

  if (!t || !verifyProposalToken(id, t)) {
    notFound();
  }

  const proposal = await prisma.proposal.findUnique({
    where: { externalId: id },
  });

  if (!proposal) {
    notFound();
  }

  // 만료 체크
  if (proposal.validUntil < new Date()) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Pretendard, sans-serif' }}>
        <h1 style={{ color: '#a11d1f' }}>제안 유효 기간이 만료되었습니다</h1>
        <p>담당 영업사원에게 문의해 주세요.</p>
        <p>
          {proposal.salesPersonName} · {proposal.salesPersonPhone}
        </p>
      </div>
    );
  }

  const data = proposalToRenderData(proposal);

  return (
    <>
      <ProposalRenderer data={data} />
      <TrackingBeacon proposalId={id} />
    </>
  );
}

export const dynamic = 'force-dynamic';
```

#### 4.2.2 루트 레이아웃

```tsx
// app/layout.tsx
import '../styles/proposal.css';

export const metadata = {
  title: '방수명가 제안서',
  description: '부성에이티 방수명가 제안서 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

#### 4.2.3 5페이지 통합 렌더러

```tsx
// components/proposal/ProposalRenderer.tsx
import Page1Cover from './pages/Page1Cover';
import Page2Diagnosis from './pages/Page2Diagnosis';
import Page3Solution from './pages/Page3Solution';
import Page4Pricing from './pages/Page4Pricing';
import Page5Principles from './pages/Page5Principles';
import type { ProposalRenderData } from '@/lib/proposal/types';

/* ═══════════════════════════════════════════════════════════════════════════
   제안서 5페이지 통합 렌더러
   - 손님 열람 페이지에서 사용
   - PDF 생성 시에도 동일 컴포넌트 재사용
   - workTypes에 따라 페이지 숨김 가능 (향후 확장)
   ═══════════════════════════════════════════════════════════════════════════ */

interface Props {
  data: ProposalRenderData;
  // 추적 데이터 id - 클라이언트 beacon에서 사용
  proposalExternalId?: string;
}

export default function ProposalRenderer({ data }: Props) {
  return (
    <div className="pp-wrap" data-proposal-id={data.input.proposalId}>
      <Page1Cover data={data} />
      <Page2Diagnosis data={data} />
      <Page3Solution data={data} />
      <Page4Pricing data={data} />
      <Page5Principles data={data} />
    </div>
  );
}
```

#### 4.2.4 Logo 컴포넌트

```tsx
// components/proposal/Logo.tsx
interface LogoProps {
  white?: boolean;
}

export default function Logo({ white = false }: LogoProps) {
  const textColor = white ? '#fff' : '#000';

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        height: 24,
      }}
    >
      {/* 방수명가 텍스트 */}
      <span
        style={{
          fontFamily: "'CheongdoM', serif",
          fontSize: 23.605,
          color: textColor,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          letterSpacing: 0,
        }}
      >
        방수명가
      </span>

      {/* 뱃지 이미지 */}
      <img
        src="/logo.png"
        alt=""
        style={{
          height: 14,
          width: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
```

#### 4.2.5 Page1 Cover

```tsx
// components/proposal/pages/Page1Cover.tsx
import Logo from '../Logo';
import { COMPANY_INFO } from '@/lib/proposal/methods';
import type { ProposalRenderData } from '@/lib/proposal/types';

/* ═══════════════════════════════════════════════════════════════════════════
   P1 Cover
   Figma node: 250:270
   좌표·크기·폰트 모두 Figma 원본 수치 1:1
   ═══════════════════════════════════════════════════════════════════════════ */

interface Props {
  data: ProposalRenderData;
}

export default function Page1Cover({ data }: Props) {
  const { input, publishedDate } = data;

  return (
    <div className="pp-page" data-page="1">
      {/* 배경 이미지 (rotated 180, 30% white overlay) */}
      <div
        style={{
          position: 'absolute',
          left: -1,
          top: 0,
          width: 596,
          height: 788,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: 'rotate(180deg)',
          }}
        >
          <img
            src="/assets/p1_cover_bg.jpg"
            alt=""
            style={{
              position: 'absolute',
              left: '-0.01%',
              top: '1.66%',
              width: '100.07%',
              height: '126.04%',
              objectFit: 'cover',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.3)',
          }}
        />
      </div>

      {/* 로고 좌상단 */}
      <div style={{ position: 'absolute', left: 60, top: 70, zIndex: 2 }}>
        <Logo />
      </div>

      {/* 제목 블록 + Info grid (flex column으로 간격 동적 유지) */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: 141.81,
          width: 475,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 35,
        }}
      >
        {/* 제목 블록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              fontFamily: "'CheongdoL', serif",
              fontSize: 30,
              lineHeight: 1.338,
              letterSpacing: '-0.6px',
              color: '#000',
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
            }}
          >
            {input.siteAddress}
            {!input.hideCustomerSalutation && <span> 님을 위한</span>}
          </div>
          <div
            style={{
              fontFamily: "'CheongdoM', serif",
              fontSize: 30,
              lineHeight: 1.338,
              letterSpacing: '-0.6px',
              color: '#000',
            }}
          >
            맞춤형 방수 솔루션 제안서
          </div>
        </div>

        {/* Info grid — Pretendard SemiBold 12px, gap 11px */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'max-content max-content',
            columnGap: 64,
            rowGap: 11,
            fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
            fontWeight: 600,
            fontSize: 12,
            color: 'rgba(34,34,34,0.8)',
            whiteSpace: 'nowrap',
          }}
        >
          <div>현장 주소</div>
          <div>{input.siteAddress}</div>
          <div>제 출 일</div>
          <div>{publishedDate}</div>
          <div>담 당 자</div>
          <div>{input.salesPersonName}</div>
          <div>연 락 처</div>
          <div>{input.salesPersonPhone}</div>
        </div>
      </div>

      {/* 하단 #222 바 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 643,
          width: 595,
          height: 199,
          background: '#222',
          zIndex: 1,
        }}
      />

      {/* 회사명 블록 */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: 683,
          width: 358,
          height: 104,
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: '#fff',
            lineHeight: 1,
          }}
        >
          {COMPANY_INFO.name}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 26,
            left: 0,
            fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
            fontWeight: 300,
            fontSize: 11,
            color: 'rgba(255,255,255,0.8)',
            whiteSpace: 'nowrap',
          }}
        >
          {COMPANY_INFO.address}
        </div>

        {/* 사업자등록번호 / 대표번호 / 팩스 / 이메일 (4개 블록) */}
        <div style={{ position: 'absolute', left: 1, top: 74 }}>
          <div style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 10, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>사업자등록번호</div>
          <div style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 300, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>{COMPANY_INFO.businessNumber}</div>
        </div>
        <div style={{ position: 'absolute', left: 94, top: 74 }}>
          <div style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 10, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>대표번호</div>
          <div style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 300, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>{COMPANY_INFO.mainPhone}</div>
        </div>
        <div style={{ position: 'absolute', left: 167, top: 74 }}>
          <div style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 10, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>팩스번호</div>
          <div style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 300, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>{COMPANY_INFO.fax}</div>
        </div>
        <div style={{ position: 'absolute', left: 258, top: 74 }}>
          <div style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 10, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>이메일</div>
          <div style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 300, fontSize: 10, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{COMPANY_INFO.email}</div>
        </div>
      </div>

      {/* 직인 */}
      <img
        src="/assets/p1_seal.png"
        alt="직인"
        style={{
          position: 'absolute',
          left: 479,
          top: 683,
          width: 56,
          height: 56,
          objectFit: 'contain',
          zIndex: 2,
        }}
      />
    </div>
  );
}
```

> **참고:** 위 `Page1Cover.tsx`는 가독성을 위해 4개 정보 블록의 중복 style 코드를 한 줄로 압축했다. 원본은 `components/proposal/pages/Page1Cover.tsx` 의 각 블록이 풀 스타일을 반복 선언한다.

#### 4.2.6 Page2 Diagnosis

```tsx
// components/proposal/pages/Page2Diagnosis.tsx
import { METHOD_DB } from '@/lib/proposal/methods';
import type { ProposalRenderData } from '@/lib/proposal/types';

/* ═══════════════════════════════════════════════════════════════════════════
   P2 Diagnosis
   Figma node: 770:5019
   - 상단 인용 블록
   - 진단 2장 (A/B) 좌 left:41 / 우 left:307, top:208
   - 종합분석 bg #f5f5f2 top:475 h:367
   ═══════════════════════════════════════════════════════════════════════════ */

interface Props {
  data: ProposalRenderData;
}

export default function Page2Diagnosis({ data }: Props) {
  const { input, content, methodId } = data;
  const method = METHOD_DB[methodId] ?? METHOD_DB.M01;
  const diagnoses = content.diagnosis.slice(0, 2); // Figma 기준 2장 고정

  return (
    <div className="pp-page" data-page="2">
      {/* 상단 인용 블록 */}
      <div
        style={{
          position: 'absolute',
          left: 94,
          top: 49,
          width: 406,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start' }}>
          <img src="/assets/p2_quote_open.svg" alt="" style={{ width: 10, height: 6.552, flexShrink: 0, marginTop: 4 }} />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 14, color: '#222', lineHeight: '23px', whiteSpace: 'nowrap' }}>
              고객님의 소중한 자산인{' '}
            </span>
            <span style={{ background: '#f5f5f2', padding: '0 3px', height: 20, display: 'inline-flex', alignItems: 'center', fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 14, color: '#222', lineHeight: '23px', whiteSpace: 'nowrap' }}>
              {input.siteAddress}
            </span>
            <span style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 14, color: '#222', lineHeight: '23px', whiteSpace: 'nowrap' }}>
              {' '}에 대한
            </span>
          </div>
          <img src="/assets/p2_quote_close.svg" alt="" style={{ width: 10, height: 6.552, flexShrink: 0, marginTop: 4, transform: 'rotate(180deg)' }} />
        </div>
        <p style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 14, lineHeight: '23px', color: '#222', textAlign: 'center', marginTop: 0 }}>
          정밀 진단 결과 및 그에 따른 최적의 기술 솔루션을 아래와 같이 제안합니다.
        </p>
      </div>

      {/* 수평선 */}
      <div style={{ position: 'absolute', left: 41, top: 131, width: 513, height: 1, background: '#222', opacity: 0.2 }} />

      {/* 진단 제목 */}
      <div style={{ position: 'absolute', left: 41, top: 161, display: 'flex', alignItems: 'center', gap: 1, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 15, color: '#a11d1f', whiteSpace: 'nowrap' }}>
        <span>|</span>
        <span>&nbsp;{input.siteAddress}의 정밀 진단 결과</span>
      </div>

      {diagnoses[0] && <DiagnosisCell left={41} data={diagnoses[0]} />}
      {diagnoses[1] && <DiagnosisCell left={307} data={diagnoses[1]} />}

      {/* 종합분석 배경 */}
      <div style={{ position: 'absolute', left: 0, top: 475, width: 595, height: 367, background: '#f5f5f2' }} />

      {/* 종합분석 제목 */}
      <div style={{ position: 'absolute', left: 41, top: 511, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 15, color: '#a11d1f', whiteSpace: 'nowrap' }}>
        | 종합분석
      </div>

      {/* 종합분석 본문 */}
      <div style={{ position: 'absolute', left: 41, top: 544, width: 515, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 11, color: '#222', lineHeight: '21px', margin: 0 }}>
          고객님의 소중한 자산인{' '}
          <b style={{ fontWeight: 700 }}>{input.siteAddress}</b>의 안정적인 유지를 위해
          <br />
          저희 방수명가에 진단을 의뢰해 주셨습니다. 현재 시급히 해결이 필요한 주요 문제는 다음과 같습니다.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', minHeight: 16 }}>
          <div style={{ width: 1.5, background: '#222', flexShrink: 0 }} />
          <ul style={{ flex: 1, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 11, color: '#222', lineHeight: '21px', listStyle: 'disc', paddingLeft: 16.5, margin: 0 }}>
            {content.problems.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>

        <p style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 11, color: '#222', lineHeight: '21px', margin: 0 }}>
          이 문제는 겉으로 드러나는 현상에 그치지 않고,{' '}
          <b style={{ fontWeight: 700 }}>여름철 폭우 및 겨울철 폭설로 인한 더 큰 누수 피해</b>로
          이어질 수 있으므로 근본적인 해결이 필요합니다. 이에 저희 방수명가는,{' '}
          <b style={{ fontWeight: 700 }}>{method.name}</b>을 최적의 해결책으로 제안합니다.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', minHeight: 16 }}>
          <div style={{ width: 1.5, background: '#222', flexShrink: 0 }} />
          <ul style={{ flex: 1, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 11, color: '#222', lineHeight: '21px', listStyle: 'disc', paddingLeft: 16.5, margin: 0 }}>
            {content.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        <p style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 11, color: '#222', lineHeight: '21px', margin: 0 }}>
          이후 페이지를 통해 저희의 제안과 그 이유를 더욱 자세히 확인하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}

interface DiagnosisCellProps {
  left: number;
  data: {
    label: string;
    title: string;
    desc: string;
    photoUrl: string | null;
    photoPos?: { x: number; y: number };
  };
}

function DiagnosisCell({ left, data }: DiagnosisCellProps) {
  const pos = data.photoPos ?? { x: 50, y: 50 };

  return (
    <div style={{ position: 'absolute', left, top: 208, width: 247, height: 234, display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 14, color: '#222', whiteSpace: 'nowrap' }}>
          <span>{data.label}.</span>
          <span>{data.title}</span>
        </div>
        <div style={{ marginTop: 6, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 10, color: 'rgba(34,34,34,0.8)', lineHeight: '18px', width: 247 }}>
          {data.desc}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, border: '1px solid #000', background: '#d5d0c8', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {data.photoUrl ? (
          <img
            src={data.photoUrl}
            alt={data.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${pos.x}% ${pos.y}%` }}
          />
        ) : (
          <span style={{ fontSize: 9, color: '#999' }}>📷 사진 {data.label}</span>
        )}
      </div>
    </div>
  );
}
```

#### 4.2.7 Page3 Solution

```tsx
// components/proposal/pages/Page3Solution.tsx
import { METHOD_DB } from '@/lib/proposal/methods';
import type { ProposalRenderData } from '@/lib/proposal/types';

/* ═══════════════════════════════════════════════════════════════════════════
   P3 Solution
   Figma node: 800:2072
   ═══════════════════════════════════════════════════════════════════════════ */

interface Props {
  data: ProposalRenderData;
}

export default function Page3Solution({ data }: Props) {
  const method = METHOD_DB[data.methodId] ?? METHOD_DB.M01;

  return (
    <div className="pp-page" data-page="3">
      <div style={{ position: 'absolute', left: 41, top: 49, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 15, color: '#a11d1f', whiteSpace: 'nowrap' }}>
        | 제안 솔루션
      </div>

      {/* 표 */}
      <div style={{ position: 'absolute', left: 41, top: 91, width: 513, height: 247, border: '0.5px solid #222', overflow: 'hidden' }}>
        {/* 레이블 컬럼 배경 */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 67, height: 247, background: '#f5f5f2' }} />

        {/* 가로 구분선: 37.5, 168.5, 206.5 */}
        {[37.5, 168.5, 206.5].map((y) => (
          <div key={y} style={{ position: 'absolute', left: 0, top: y, width: 513, height: 0.5, background: '#222', opacity: 0.3 }} />
        ))}

        {/* Row 1: 적용 공법 */}
        <div style={{ position: 'absolute', left: 13, top: 10, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 500, fontSize: 11, color: '#333' }}>적용 공법</div>
        <div style={{ position: 'absolute', left: 78, top: 10, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 12, color: '#222' }}>{method.name}</div>

        {/* Row 2: 공법 특징 */}
        <div style={{ position: 'absolute', left: 13, top: 48, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 500, fontSize: 11, color: '#333' }}>공법 특징</div>
        <div style={{ position: 'absolute', left: 78, top: 48, right: 14, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 11, color: '#222', lineHeight: '18px' }}>
          {method.features.map((feat, i) => (
            <div key={i} style={{ marginBottom: i < method.features.length - 1 ? 4 : 0 }} dangerouslySetInnerHTML={{ __html: `- ${feat}` }} />
          ))}
        </div>

        {/* Row 3: 주요 자재 */}
        <div style={{ position: 'absolute', left: 13, top: 179, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 500, fontSize: 11, color: '#333' }}>주요 자재</div>
        <div style={{ position: 'absolute', left: 78, top: 179, right: 14, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 11, color: '#222', lineHeight: '18px' }}>{method.materials}</div>

        {/* Row 4: 시공 과정 */}
        <div style={{ position: 'absolute', left: 13, top: 217, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 500, fontSize: 11, color: '#333' }}>시공 과정</div>
        <div style={{ position: 'absolute', left: 78, top: 217, right: 4, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 11, color: '#222', lineHeight: '18px' }}>{method.process}</div>
      </div>

      <div style={{ position: 'absolute', left: 42, top: 378, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 15, color: '#a11d1f', whiteSpace: 'nowrap' }}>
        | {method.caseTitle}
      </div>

      {/* 사례 3개 */}
      {method.cases.map((c, i) => (
        <div key={i} style={{ position: 'absolute', left: 41 + i * 175, top: 420, width: 165, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ width: 165, height: 112, background: '#d5d0c8', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #222' }}>
            {c.imageUrl ? (
              <img src={c.imageUrl} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 9, color: '#999' }}>사진</span>
            )}
          </div>
          <div style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 10, color: 'rgba(51,51,51,0.8)', lineHeight: '18px' }}>
            {c.title}
          </div>
        </div>
      ))}

      {/* 기대 효과 배경 */}
      <div style={{ position: 'absolute', left: 0, top: 594, width: 595, height: 248, background: '#f5f5f2' }} />
      <div style={{ position: 'absolute', left: 41, top: 630, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 15, color: '#a11d1f', whiteSpace: 'nowrap' }}>
        | 기대 효과
      </div>

      {method.effects.map((ef, i) => (
        <div key={i} style={{ position: 'absolute', left: 41, top: 674 + i * 28, right: 41, fontFamily: "'Pretendard Variable', sans-serif", fontSize: 12, color: '#222', lineHeight: '21px' }}>
          <span style={{ fontWeight: 700 }}>{i + 1}. {ef.title}{' '}</span>
          <span style={{ fontWeight: 400 }}>: {ef.desc}</span>
        </div>
      ))}
    </div>
  );
}
```

#### 4.2.8 Page4 Pricing

```tsx
// components/proposal/pages/Page4Pricing.tsx
import type { ProposalRenderData } from '@/lib/proposal/types';

/* ═══════════════════════════════════════════════════════════════════════════
   P4 Pricing  (Figma node: 488:548)
   3 플랜 카드 + 6행 비교표 + 전문가 의견
   ═══════════════════════════════════════════════════════════════════════════ */

interface Props {
  data: ProposalRenderData;
}

const fmtPrice = (n: number) =>
  n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원';

const COMPARISON_ROWS = [
  { label: '핵심 방수 시스템', basic: '우레탄 도막 방수', standard: '이중복합방수 3.8mm', premium: '이중복합방수 4.3mm' },
  { label: '색상 선택', basic: '녹색', standard: '녹색, 회색', premium: '희망 색상 선택 가능' },
  { label: ['하자보증증권', '발급'], basic: 'X', standard: '3년', premium: '5년' },
  { label: '무상 하자 보수 기간', basic: '3년', standard: '5년', premium: '8년' },
  {
    label: ['유지보수', '예산 방어 금액'],
    basic: '재공사 1회 방지', basicSub: '연 40만원 / 총 120만원',
    standard: '재공사 2회 방지', standardSub: '연 60만원 / 총 300만원',
    premium: '재공사 3회 방지', premiumSub: '연 90만원 / 총 720만원',
  },
  { label: '추천 대상', basic: '임대사업자, 상가', standard: '실거주 건물주, 빌라', premium: '자산관리 법인, 신축급 건물' },
];

const ROW_Y = [256, 305, 347, 403, 451, 512];
const LINE_Y = [287.37, 336.74, 386.11, 434.59, 496.53];

export default function Page4Pricing({ data }: Props) {
  const { content } = data;
  const { pricing, expert } = content;

  return (
    <div className="pp-page" data-page="4">
      <div style={{ position: 'absolute', left: 41, top: 49, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 15, color: '#a11d1f', whiteSpace: 'nowrap' }}>
        | 맞춤형 솔루션 제안
      </div>

      <div style={{ position: 'absolute', left: 41, top: 82, right: 41, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 11, color: '#333', lineHeight: '18px' }}>
        모든 플랜은 KS 인증 정품 자재와 표준 시방서를 준수하여 시공됩니다.
        <br />
        플랜 차이는 품질의 차이가 아닌, 방수 시스템의 방식과 고객님께 제공되는 추가적인 편의 및 혜택의 차이입니다.
      </div>

      <PlanHeader left={135} width={137} name="베이직" price={pricing.basic} isRecommended={pricing.recommended === 'basic'} />
      <PlanHeader left={277} width={136} name="스탠다드" price={pricing.standard} isRecommended={pricing.recommended === 'standard'} />
      <PlanHeader left={418} width={137} name="프리미엄" price={pricing.premium} isRecommended={pricing.recommended === 'premium'} />

      <div style={{ position: 'absolute', left: 41, top: 238, width: 89, height: 307, background: '#f5f5f2', border: '1px dashed rgba(0,0,0,0.1)', borderRadius: 6 }} />
      <div style={{ position: 'absolute', left: 135, top: 238, width: 137, height: 307, background: '#f5f5f2', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0 0 6px 6px' }} />
      <div style={{ position: 'absolute', left: 277, top: 238, width: 136, height: 307, background: '#f5f5f2', border: `1px solid ${pricing.recommended === 'standard' ? '#222' : 'rgba(0,0,0,0.1)'}`, borderRadius: '0 0 6px 6px' }} />
      <div style={{ position: 'absolute', left: 418, top: 238, width: 137, height: 307, background: '#f5f5f2', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0 0 6px 6px' }} />

      {LINE_Y.map((y) => (
        <div key={y} style={{ position: 'absolute', left: 41, top: y, width: 514, height: 0.5, background: 'rgba(0,0,0,0.1)' }} />
      ))}

      {COMPARISON_ROWS.map((row, i) => {
        const y = ROW_Y[i];
        const labelLines = Array.isArray(row.label) ? row.label : [row.label];
        return (
          <div key={i}>
            <div style={{ position: 'absolute', left: 85.5, top: y - 7, transform: 'translateX(-50%)', fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 10, color: '#333', textAlign: 'center', lineHeight: '15px', whiteSpace: 'nowrap' }}>
              {labelLines.map((line, j) => <div key={j}>{line}</div>)}
            </div>
            <CellValue left={204}   y={y} value={row.basic}    sub={(row as any).basicSub} />
            <CellValue left={345.5} y={y} value={row.standard} sub={(row as any).standardSub} />
            <CellValue left={486.5} y={y} value={row.premium}  sub={(row as any).premiumSub} />
          </div>
        );
      })}

      <div style={{ position: 'absolute', right: 41, top: 548, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 9, color: 'rgba(161,29,31,0.8)', lineHeight: '18px', whiteSpace: 'nowrap' }}>
        * 같이 보내드린 견적서에서 상세 견적을 확인하실 수 있습니다.
      </div>

      <div style={{ position: 'absolute', left: 0, top: 595, width: 595, height: 247, background: '#f5f5f2' }} />
      <div style={{ position: 'absolute', left: 41, top: 631, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 15, color: '#a11d1f', whiteSpace: 'nowrap' }}>
        | 전문가 추천 의견
      </div>

      <div style={{ position: 'absolute', left: 41, top: 669, right: 40, bottom: 47, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 11, color: '#333', lineHeight: '18px', whiteSpace: 'pre-wrap' }}>
        저희 전문가팀이 판단하기에, {expert.buildingDesc}이라는 문제가 확인된 고객님의 건물은{'\n'}
        단순히 누수를 막는 것을 넘어, 부동산으로서의 자산 가치를 온전히 보존하는 접근이 반드시 필요합니다.
        {'\n\n'}
        이를 위해선 {expert.ageDesc}까지 고려한 종합적인 시스템이 필수적이며,{'\n'}
        이에 <b style={{ fontWeight: 700, color: '#222' }}>[{expert.planName}] 플랜</b>을 추천드립니다.
        핵심 공법인 {expert.coreMethod} 시스템은 하자의 근원을 차단하고, {expert.extraEffect}. 이는
        과하거나 부족함 없이 고객님의 자산을 지키는 가장 합리적인 선택이기에, 저희가 가장 자신 있게
        추천드리는 플랜입니다.
      </div>
    </div>
  );
}

interface PlanHeaderProps {
  left: number;
  width: number;
  name: string;
  price: number;
  isRecommended: boolean;
}

function PlanHeader({ left, width, name, price, isRecommended }: PlanHeaderProps) {
  const cx = left + width / 2;
  return (
    <>
      <div style={{ position: 'absolute', left, top: 156, width, height: 83, background: '#222', borderRadius: '6px 6px 0 0', overflow: 'hidden', zIndex: isRecommended ? 2 : 1 }} />
      {isRecommended && (
        <>
          <img src="/assets/p4_std_accent.svg" alt="" style={{ position: 'absolute', left, top: 156, width: 107, height: 54, zIndex: 2 }} />
          <div style={{ position: 'absolute', left: left + 4, top: 160, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 8, color: '#fff', whiteSpace: 'nowrap', zIndex: 3 }}>추천</div>
        </>
      )}
      <div style={{ position: 'absolute', left: cx, top: 174, transform: 'translateX(-50%)', fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 12, color: '#fff', textAlign: 'center', whiteSpace: 'nowrap', zIndex: 3 }}>{name}</div>
      <div style={{ position: 'absolute', left: cx - 56, top: 204, width: 112, height: 1, background: 'rgba(255,255,255,0.2)', zIndex: 3 }} />
      <div style={{ position: 'absolute', left: left + 12, top: 215, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 300, fontSize: 8, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', zIndex: 3 }}>총 금액</div>
      <div style={{ position: 'absolute', left: left + width - 12, top: 213, transform: 'translateX(-100%)', fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 600, fontSize: 11, color: '#fff', textAlign: 'right', whiteSpace: 'nowrap', zIndex: 3 }}>{fmtPrice(price)}</div>
    </>
  );
}

interface CellValueProps { left: number; y: number; value: string; sub?: string; }

function CellValue({ left, y, value, sub }: CellValueProps) {
  return (
    <div style={{ position: 'absolute', left, top: y, transform: 'translateX(-50%)', fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 10, color: '#333', textAlign: 'center', lineHeight: '15px', whiteSpace: 'nowrap' }}>
      <div>{value}</div>
      {sub && <div style={{ fontSize: 8, color: 'rgba(0,0,0,0.5)', lineHeight: '14px', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}
```

#### 4.2.9 Page5 Principles

```tsx
// components/proposal/pages/Page5Principles.tsx
import Logo from '../Logo';
import { FOUR_PRINCIPLES, BRAND_LOGOS } from '@/lib/proposal/methods';
import type { ProposalRenderData } from '@/lib/proposal/types';

/* ═══════════════════════════════════════════════════════════════════════════
   P5 Principles (4대 원칙 + 브랜드)   Figma node: 248:105
   배경 전체 #222, 제목 CHEONGDO(M) 16.486px
   ═══════════════════════════════════════════════════════════════════════════ */

interface Props { data: ProposalRenderData; }

export default function Page5Principles(_props: Props) {
  return (
    <div className="pp-page" data-page="5" style={{ background: '#222', color: '#fff' }}>
      <div style={{ position: 'absolute', left: 46, top: 49, fontFamily: "'CheongdoM', serif", fontSize: 16.486, color: '#fff', whiteSpace: 'nowrap', letterSpacing: 0 }}>
        <span>고객님의 자산을 위한 </span>
        <span style={{ color: '#ffebd2' }}>방수명가의 4대 원칙과 약속</span>
      </div>

      <div style={{ position: 'absolute', left: 46, top: 100, right: 46, height: 1, background: 'rgba(255,255,255,0.15)' }} />

      <Principle left={49}  top={130} title={FOUR_PRINCIPLES[0].title} desc={FOUR_PRINCIPLES[0].desc} />
      <Principle left={326} top={130} title={FOUR_PRINCIPLES[1].title} desc={FOUR_PRINCIPLES[1].desc} />
      <Principle left={46}  top={258} title={FOUR_PRINCIPLES[2].title} desc={FOUR_PRINCIPLES[2].desc} />
      <Principle left={326} top={258} title={FOUR_PRINCIPLES[3].title} desc={FOUR_PRINCIPLES[3].desc} />

      <div style={{ position: 'absolute', left: 46, top: 661, fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700, fontSize: 13, color: '#fff', whiteSpace: 'nowrap' }}>
        대한민국 대표 브랜드들이 신뢰하는 기술력
      </div>

      {BRAND_LOGOS.map((brand, i) => {
        const boxW = (595 - 46 * 2) / 6 - 4;
        const left = 45 + i * (boxW + 4);
        return (
          <div key={brand.name} style={{ position: 'absolute', left, top: 697, width: boxW, height: 35, background: '#fff', border: '0.254px solid rgba(52,60,97,0.55)', borderRadius: 2.536, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, overflow: 'hidden' }}>
            <img src={brand.img} alt={brand.name} style={{ maxWidth: '85%', maxHeight: '75%', objectFit: 'contain' }} />
          </div>
        );
      })}

      <div style={{ position: 'absolute', right: 46, top: 758, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Logo white />
      </div>
    </div>
  );
}

function Principle({ left, top, title, desc }: { left: number; top: number; title: string; desc: string; }) {
  return (
    <div style={{ position: 'absolute', left, top, width: 230 }}>
      <div style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 800, fontSize: 12, color: '#fff', marginBottom: 7, whiteSpace: 'nowrap' }}>{title}</div>
      <div style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400, fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: '17px', width: 245 }}>{desc}</div>
    </div>
  );
}
```

### 4.3 Puppeteer 래퍼 유틸

`lib/pdf/` 디렉토리에는 `generate.ts` **단 한 파일**만 존재.

```ts
// lib/pdf/generate.ts
import puppeteer, { Browser } from 'puppeteer';

/* ═══════════════════════════════════════════════════════════════════════════
   PDF 생성 (Puppeteer)
   - 손님 열람 페이지(/p/:id?t=:token)를 headless Chrome으로 렌더 → PDF
   - 텍스트 선택 가능, 용량 작음 (html2canvas 대비 큰 장점)
   - 프로덕션 배포 시 @sparticuz/chromium 사용 권장 (serverless)
   ═══════════════════════════════════════════════════════════════════════════ */

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) return browserInstance;

  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  return browserInstance;
}

/**
 * 제안서 URL을 받아 PDF Buffer로 렌더.
 * - viewUrl: 내부 URL (HMAC 토큰 포함한 /p/:id?t=... 형태)
 * - pdf 옵션: A4 crop 595x842 (제안서 페이지 크기와 동일)
 */
export async function renderProposalPdf(viewUrl: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 595, height: 842, deviceScaleFactor: 2 });
    // body에 pp-pdf 클래스 추가 (CSS가 gap/background 조정)
    await page.goto(viewUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => {
      document.body.classList.add('pp-pdf');
    });

    // 폰트 로딩 대기
    await page.evaluateHandle('document.fonts.ready');
    // 이미지 로딩 대기 (추가 안전장치)
    await new Promise((r) => setTimeout(r, 500));

    const pdf = await page.pdf({
      width: '595px',
      height: '842px',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

/**
 * 프로세스 종료 시 브라우저 정리
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    closeBrowser().catch(() => {});
  });
}
```

### 4.4 폰트 로딩 설정

폰트는 2종의 로컬 `woff2`(청도M / 청도L) + Pretendard CDN + Noto Sans KR CDN. 전역 `styles/proposal.css` 최상단에서 선언되고 `app/layout.tsx`가 root import.

```css
/* styles/proposal.css */
/* ═══════════════════════════════════════════════════════════════════════════
   제안서 전역 스타일
   - 5페이지 공통 레이아웃 (595 x 842 A4 비율 고정)
   - 폰트: CheongdoM, CheongdoL (로컬), Pretendard (CDN)
   ═══════════════════════════════════════════════════════════════════════════ */

@font-face {
  font-family: 'CheongdoM';
  src: url('/fonts/cheongdom.woff2') format('woff2');
  font-weight: 500;
  font-display: swap;
}

@font-face {
  font-family: 'CheongdoL';
  src: url('/fonts/cheongdol.woff2') format('woff2');
  font-weight: 300;
  font-display: swap;
}

@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --red: #a11d1f;
  --dark: #222;
  --warm: #f5f5f2;
  --white: #fff;
  --text: #222;
  --text2: #333;
  --text80: rgba(34, 34, 34, 0.8);
  --tcap: rgba(51, 51, 51, 0.8);
  --twm: rgba(255, 255, 255, 0.6);
  --gold: #ffebd2;
  --ft: 'CheongdoM', serif;
  --fl: 'CheongdoL', serif;
  --fb: 'Pretendard Variable', 'Pretendard', sans-serif;
  --pw: 595px;
  --ph: 842px;
}

html, body {
  font-family: var(--fb);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* ══════════════════════════════════════════════════════════════════════════
   페이지 컨테이너
   모든 페이지는 595x842 고정 박스 안에서 절대 좌표로 배치됨 (Figma 1:1)
   ══════════════════════════════════════════════════════════════════════════ */

.pp-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px 0 40px;
  background: #2a2a2a;
  min-height: 100vh;
}

.pp-page {
  position: relative;
  width: var(--pw);
  height: var(--ph);
  background: #fff;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  /* 모바일 축소: CSS transform scale */
  transform-origin: top center;
}

/* 모바일 대응: 화면이 595px보다 좁으면 scale down */
@media (max-width: 620px) {
  .pp-page {
    transform: scale(calc((100vw - 20px) / 595));
    margin-bottom: calc((842px * (1 - ((100vw - 20px) / 595))) * -1);
  }
  .pp-wrap {
    padding: 10px 10px 20px;
    gap: 10px;
  }
}

/* PDF 모드 (Puppeteer 렌더링 시 body에 .pp-pdf 클래스) */
body.pp-pdf { background: #fff; }
body.pp-pdf .pp-wrap { background: #fff; padding: 0; gap: 0; }
body.pp-pdf .pp-page {
  box-shadow: none;
  page-break-after: always;
}
body.pp-pdf .pp-page:last-child { page-break-after: auto; }

/* 인쇄 */
@media print {
  html, body { background: #fff; }
  .pp-wrap { background: #fff; padding: 0; gap: 0; }
  .pp-page {
    box-shadow: none;
    page-break-after: always;
    transform: none !important;
  }
  @page {
    size: 595px 842px;
    margin: 0;
  }
}

/* 강조 하이라이트 (P3 features 등) */
.pp-highlight {
  background-color: #FFF3CD;
  padding: 1px 3px;
  border-radius: 2px;
}
```

**폰트 파일 경로:**
- `public/fonts/cheongdom.woff2` — 486,808 B
- `public/fonts/cheongdol.woff2` — 498,944 B

**폰트 subset 처리: 해당 레포에 없음.** 원본 woff2를 그대로 서빙. Pretendard만 "dynamic-subset" CDN 변형을 사용(`pretendardvariable-dynamic-subset.min.css`) — 이는 CDN 측에서 제공하는 것이지 이 레포가 수행한 처리가 아님.

### 4.5 이미지/로고 처리 방식

**모두 `public/` 하위 정적 파일을 일반 `<img src="/..." />` 태그로 참조.** Next.js `<Image>` 컴포넌트나 빌드 타임 최적화는 사용하지 않음.

| 참조 | 컴포넌트 | 파일 | 크기 |
|---|---|---|---|
| `/logo.png` | Logo.tsx | 로고 뱃지 | 34,005 B |
| `/logo.jpg` | (직접 사용 안 함, 파일만 존재) | — | 90,760 B |
| `/assets/p1_cover_bg.jpg` | Page1Cover | 표지 배경 | 504 KB |
| `/assets/p1_seal.png` | Page1Cover | 직인 | 12 KB |
| `/assets/p2_quote_open.svg`, `p2_quote_close.svg` | Page2Diagnosis | 따옴표 SVG | 각 4 KB |
| `/assets/p3_case{1,2,3}.png` | methods.ts → Page3Solution | 사례 사진 | 32K/56K/104K |
| `/assets/p4_std_accent.svg` | Page4Pricing | 스탠다드 추천 뱃지 | 1 KB |
| `/assets/p5_brand_*.png` / `.svg` | methods.ts → Page5Principles | 브랜드 로고 6개 | 1K~120K |

로고 실사용 코드 (`components/proposal/Logo.tsx:34`):
```tsx
<img
  src="/logo.png"
  alt=""
  style={{ height: 14, width: 'auto', display: 'block', objectFit: 'contain' }}
/>
```

배경 이미지 처리(`components/proposal/pages/Page1Cover.tsx:21-58`)에서 특이하게 **PNG/JPG를 `transform: rotate(180deg)` + 30% 흰색 오버레이**로 덮어 채도를 낮춤. SVG로 대체하지 않고 JPG 원본을 그대로 깔았다.

### 4.6 환경변수

PDF·Puppeteer 직접 관련 env var는 **없음**. 다만 손님 열람 URL 생성에 사용되는 두 값이 PDF 파이프라인 동작에 필수:

```bash
# .env.example (발췌)

# ── 손님 열람 링크 HMAC 서명 키 ───────────────────────────────────────────
# 다른 값이어야 함. openssl rand -base64 32
PROPOSAL_TOKEN_SECRET="CHANGE_ME_DIFFERENT_FROM_NEXTAUTH_SECRET"

# ── 공개 URL (손님 링크 생성 시 사용) ─────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- `PROPOSAL_TOKEN_SECRET` — HMAC-SHA256 토큰 서명. PDF 라우트는 `buildWebUrl(externalId)` 를 호출해 서명된 `/p/:id?t=...` URL을 만들어 Puppeteer에 전달한다.
- `NEXT_PUBLIC_APP_URL` — Puppeteer가 goto 할 베이스 URL. Vercel 배포 시 자체 도메인을 여기에 넣어야 한다 (Puppeteer가 자기 자신에게 HTTP 요청을 건다 — localhost 아니면 self loopback 불가).

`DATABASE_URL`, `NEXTAUTH_*`, `SMTP_*`, `IP_HASH_SALT`, `REOPEN_ALERT_DEBOUNCE_MIN` 등은 PDF 자체와 무관.

### 4.7 배포 설정

**`vercel.json`: 해당 레포에 없음.**

`next.config.js`에 PDF·서버리스 관련 단 하나의 설정: `puppeteer`를 서버 외부 패키지로 지정해 번들링에서 제외.

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Puppeteer를 server-only로 처리
  serverExternalPackages: ['puppeteer'],
};

module.exports = nextConfig;
```

라우트 파일 상단의 `export const maxDuration = 60;` (`app/api/proposals/[id]/pdf/route.ts:14`)가 Vercel 함수 최대 실행 시간을 60초로 설정. 나머지 Vercel 관련 설정은 전혀 없다 (이 레포는 로컬 개발 상태로 동결된 것으로 보임).

---

## 5. 페이지 분할 로직

**핵심: 제안서는 물리적으로 5개의 `div.pp-page` 컴포넌트로 분리된 구조이며, 각 `div`가 정확히 A4(595×842px) 한 페이지에 대응한다.**

- **단일 페이지 HTML** → Puppeteer `page.pdf()` 가 CSS `@page` / `page-break-after` 을 해석해 5페이지 PDF로 분할.
- PDF 옵션 `preferCSSPageSize: true` 가 `@page { size: 595px 842px; margin: 0; }` 규칙을 물려받게 한다.

### 5.1 CSS `@page` / `page-break-*`

```css
/* styles/proposal.css:94-109 — PDF 모드 */
body.pp-pdf { background: #fff; }
body.pp-pdf .pp-wrap { background: #fff; padding: 0; gap: 0; }
body.pp-pdf .pp-page {
  box-shadow: none;
  page-break-after: always;
}
body.pp-pdf .pp-page:last-child { page-break-after: auto; }
```

```css
/* styles/proposal.css:112-131 — 인쇄 규칙 */
@media print {
  html, body { background: #fff; }
  .pp-wrap { background: #fff; padding: 0; gap: 0; }
  .pp-page {
    box-shadow: none;
    page-break-after: always;
    transform: none !important;
  }
  @page {
    size: 595px 842px;
    margin: 0;
  }
}
```

### 5.2 동작 순서 (Puppeteer 관점)

`lib/pdf/generate.ts:40-56`:
1. `page.goto(viewUrl, { waitUntil: 'networkidle0' })` — 5페이지 합본 HTML 로드.
2. `page.evaluate(() => document.body.classList.add('pp-pdf'))` — 화면용 `gap/background/box-shadow` 제거 + `page-break-after: always` 활성화.
3. `document.fonts.ready` + 500ms sleep — 웹폰트 / 이미지 로딩 대기.
4. `page.pdf({ width: '595px', height: '842px', preferCSSPageSize: true, margin: 0 })` — CSS가 이미 분할 지시를 담고 있으므로 Chromium이 5페이지로 쪼개 출력.

### 5.3 페이지별 헤더/푸터

**반복 헤더/푸터: 해당 레포에 없음.**

각 `Page*.tsx`가 자신의 절대 좌표 내에서 회사 로고/제목을 개별 배치한다. `page.pdf()`의 `headerTemplate` / `footerTemplate` 옵션도 사용하지 않음. PDF 마진이 0이므로 공통 페이지 chrome은 각 페이지 컴포넌트가 직접 그린다.

---

## 6. 용량 최적화 기법

> **사용자 힌트:** "Figma → HTML 100% 재현 후 용량 줄이려고 변형했다는 기록이 있음."

### 6.1 이 레포에서 실제로 확인된 최적화

커밋 로그는 단 한 건:
```
96e0a06 v1 frozen - proposal system design complete
```
"pdf | optim | size | compress | subset | font | image | figma" 어떤 키워드로도 별도 커밋은 없음. 즉 **이 레포의 git 히스토리에는 용량 최적화 관련 기록이 없다.**

코드/에셋을 읽은 결과 실제로 적용된 용량 관련 선택은 다음과 같다:

1. **CSS-first 렌더링, 이미지화 금지.** `lib/pdf/generate.ts:5-6` 주석에 명시:
   > "텍스트 선택 가능, 용량 작음 (html2canvas 대비 큰 장점)"
   즉 `html2canvas` 로 래스터화하지 않고 Puppeteer의 `page.pdf()` 네이티브 렌더를 사용 — 결과물에 벡터 텍스트가 그대로 남아 용량과 검색성을 모두 확보.

2. **`preferCSSPageSize: true` + `margin: 0`** — 불필요한 여백/헤더 영역 없이 5페이지만 저장.

3. **deviceScaleFactor: 2** (`lib/pdf/generate.ts:38`) — 레티나급 선명도를 잡되 벡터는 그대로 유지해 용량 영향 최소.

4. **장식은 SVG, 사진은 JPG/PNG.** `public/assets` 내 배경(`p1_cover_bg.jpg` 504KB) 외 라인·따옴표·뱃지·브랜드 마크 일부는 인라인 가능한 1KB SVG. 다만 Figma export 원본을 그대로 넣은 탓에 `p3_case3.png` 104KB, `p5_brand_samsung.png` 120KB 처럼 큰 PNG도 혼재. 사진 압축/WebP 변환은 하지 **않음**.

5. **Pretendard는 dynamic subset CDN.** `pretendardvariable-dynamic-subset.min.css` — 각 유니코드 범위를 별도 woff2로 나눠 서빙하는 공식 CDN 변형. 이 덕분에 보통 Korean 문서에서는 수백 KB 수준으로만 폰트가 다운로드됨. (레포가 아닌 CDN 측 처리.)

### 6.2 **미적용된 최적화** (중요 — bsmg-v5에서 고려 대상)

- **폰트 subset 자체 생성: 없음.** `cheongdom.woff2` / `cheongdol.woff2` 파일을 그대로 서빙 (각 ~500 KB). 한글 사용 범위만 부분집합화하면 수십 KB까지 줄일 수 있다.
- **이미지 압축/포맷 변환: 없음.** `sharp` / `squoosh` 등 안 씀. PNG → WebP/AVIF 전환 없음. SVGO 처리 여부는 기록 없음 (1KB 내외로 작아 의미는 낮음).
- **PDF 후처리: 없음.** `ghostscript`, `pdf-lib`, `pdfcpu` 등 사용 안 함. Puppeteer 출력을 그대로 응답.

### 6.3 관련 커밋 인용

```
$ git log --oneline --all | grep -iE "pdf|optim|size|compress|subset|font|image|figma"
(출력 없음)
```

단일 커밋 `96e0a06 v1 frozen - proposal system design complete`가 전체 파이프라인을 한 번에 담고 있다. **"Figma → HTML 100% 재현 후 용량 줄이려고 변형"에 해당하는 commit diff는 이 레포 내부에 남아 있지 않다** — 이전 단계에서 별도 프로젝트/브랜치에서 수행된 것으로 추정됨. 이 export에 포함된 코드가 그 결과물의 "동결" 상태다.

---

## 7. 알려진 이슈 / 교훈

### 7.1 Figma → HTML 변환에서 확인되는 트릭

(코드 주석과 구조에서 역추적한 내용)

- **절대 좌표 절대주의.** 모든 페이지가 `position: absolute` + Figma 원본 수치를 `left/top/width/height`에 그대로 박아넣는 방식. 주석에 `Figma node: 250:270` 등 노드 ID까지 기재. 이 덕에 reflow로 인한 레이아웃 차이가 원천 차단되지만, 반응형·유동 크기에는 취약하다 (모바일은 `transform: scale(...)` 한 방으로 처리, `styles/proposal.css:83-92`).
- **배경을 180° 회전 + 30% 흰색 오버레이로 채도 낮추기** — 원본 JPG를 CSS 합성으로 톤다운. 배경 JPG를 다시 만드는 대신 CSS 조합으로 해결.
- **"추천" 강조는 `<span class="pp-highlight">`** — P3 `features` 배열 문자열에 `<b>`/`<span class="pp-highlight">` 를 섞어 `dangerouslySetInnerHTML` 로 주입(`Page3Solution.tsx:99-105`). Figma의 노란 하이라이트를 1:1로 재현.
- **사진 박스는 `object-fit: cover` + `objectPosition: x%/y%`** — 고객이 업로드한 현장 사진을 crop 없이 클라이언트 측 좌표로 위치만 조정(`Page2Diagnosis.tsx:397-402`).

### 7.2 Vercel 서버리스 제약 (실제 배포 시 부딪힐 점)

해당 레포는 **Vercel 배포 구성이 없다** (`vercel.json` 없음, `@sparticuz/chromium` 없음, `deploy` 스크립트 없음). 배포해 본 흔적이 없으므로 실제 프로덕션 이슈 기록은 없지만, 현재 코드 그대로 올리면 다음 문제가 확실히 발생한다:

1. **Puppeteer 번들 Chromium은 Vercel 함수 크기 제한(250 MB 압축)에 걸린다.**
   - 해결: `puppeteer-core` + `@sparticuz/chromium` 으로 전환. `lib/pdf/generate.ts:7` 주석도 같은 권고.
   - `getBrowser()` 의 `puppeteer.launch(...)` 를 `puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: chromium.headless })` 패턴으로 교체.

2. **Puppeteer가 자기 자신(`NEXT_PUBLIC_APP_URL`)에 HTTP로 접속 → 콜드스타트 / 루프백**
   - 서버리스 함수 인스턴스가 자신의 도메인으로 재요청하면 새로운 함수를 기동해 콜드스타트 비용이 2배. 300s 타임아웃으로 늘어난 Fluid Compute에서도 여전히 낭비.
   - 해결: 열람 페이지 렌더 로직을 분리해서 PDF 라우트에서 `renderToString(<ProposalRenderer data={...} />)` + CSS 인라인으로 직접 HTML을 만들고 `page.setContent(html, { waitUntil: 'networkidle0' })`로 주입하는 방식이 더 빠르고 안전.

3. **`maxDuration = 60` 은 Vercel 2026 기본값(300s)보다 짧다.** 현재 코드 기준 의도적 상한으로 보이며, 첫 콜드스타트에서 Chromium 기동 시 30~40초 소요 가능.

4. **`browserInstance` 싱글턴 캐싱 (`lib/pdf/generate.ts:10`)** — Fluid Compute가 인스턴스를 재사용하므로 의도대로 cold-start를 줄이는 효과가 있다. 단 graceful shutdown(`beforeExit`) 을 확실히 걸어둔 것도 포인트.

### 7.3 로고를 SVG가 아닌 PNG로 넣은 이유

**해당 레포에 기록 없음.** 주석·README·커밋 메시지 어디에도 명시적 이유가 없다. 관찰 가능한 사실만:
- `public/logo.png` (34 KB) 와 `public/logo.jpg` (91 KB) 두 파일이 있으나 코드는 `/logo.png` 만 참조(`Logo.tsx:34`).
- 로고 뱃지 외에 "방수명가" 한글은 Figma에서 이미지화하지 않고 `'CheongdoM'` 웹폰트로 실시간 렌더(`Logo.tsx:19-30`) — 즉 로고의 문자 부분은 폰트, 뱃지 부분만 PNG. 추측: Figma 에서 export 한 뱃지가 그라디언트/세부 픽셀 디테일 때문에 SVG 변환 시 무거웠거나 렌더 편차가 있었을 가능성. **기록된 근거 없음.**

---

## 8. 재사용 시 주의사항 (bsmg-v5 이식 체크리스트)

### 8.1 레포 구조 차이

- 이 레포의 경로 alias: `@/` → 프로젝트 루트 (`tsconfig.json` 기준). bsmg-v5에도 동일한 alias를 세팅했는지 확인.
- 렌더 엔트리가 **손님 전용 공개 페이지(`/p/:id`)** 이다. bsmg-v5가 단일 견적서 라우트를 이미 가지고 있다면 그 라우트 그대로 Puppeteer에 넘겨도 되고, 아예 SSR → HTML 문자열을 `page.setContent()` 로 주입하는 패턴으로 단순화해도 된다 (§7.2 참고).
- `ProposalRenderer` 는 DB-독립 타입 `ProposalRenderData` (`lib/proposal/types.ts`) 만 받는다. bsmg-v5 도메인 모델을 이 shape 로 매핑하는 mapper 한 벌을 쓰면 컴포넌트 자체는 그대로 재사용 가능.
- `TrackingBeacon` 은 PDF에서 불필요 — 이식 시 PDF 모드에서 렌더에서 제외하거나 `body.pp-pdf` 가드로 감싸라.

### 8.2 환경변수 차이

- **필수 2개**: `PROPOSAL_TOKEN_SECRET`, `NEXT_PUBLIC_APP_URL`. bsmg-v5 의 네이밍 규칙에 맞춰 재명명하되 HMAC 서명 로직(`lib/auth/token.ts`)은 동일하게 가져가라. 현재는 외부 URL 공개 열람용이라 서명이 필수지만, 사내 전용이면 `page.setContent()` 방식으로 바꾸고 토큰을 아예 뺄 수도 있다.
- **`NEXT_PUBLIC_APP_URL` 은 로컬에서도 반드시 localhost:PORT 로 채워야 한다.** Puppeteer가 자기 자신으로 루프백하기 때문에 비어 있으면 `ECONNREFUSED` 발생.

### 8.3 폰트 라이선스 ★중요★

- `cheongdom.woff2` / `cheongdol.woff2` — **청도체**(추정). 상용 서체라면 배포 라이선스가 필요하며, Vercel처럼 공개 CDN으로 서빙되는 순간 전 세계에서 다운로드 가능해진다. 이식 전에 **라이선스 상태·저작권 명기·use case 범위를 반드시 확인**하라.
- Pretendard — OFL 1.1 (상용 포함 자유). 그대로 사용 가능하지만, 외부 CDN(`jsdelivr`) 의존은 가용성 리스크가 있다. bsmg-v5에서 자체 호스팅하고 subset 처리하는 쪽이 안전.
- Noto Sans KR 700 — 실제 컴포넌트 어디에서도 쓰이지 않는 것 같다 (`CheongdoM` 로 모든 타이틀 처리). 이식 시 제거 가능.

### 8.4 Chromium 바이너리 경로 이슈

- 로컬: `puppeteer`(풀 패키지)가 번들 Chromium 을 `node_modules/puppeteer/.local-chromium/...` 에 설치. `--no-sandbox` 플래그 필수 (Linux CI/Docker).
- Vercel/서버리스: §7.2 의 1번과 동일. `@sparticuz/chromium` + `puppeteer-core` 로 교체하고 `executablePath: await chromium.executablePath()` 지정.
- Windows 로컬 개발: puppeteer 기본 동작 OK. 단 `--disable-dev-shm-usage` 는 Linux 전용이므로 무해하지만 `--no-sandbox` 도 불필요.
- Docker: `docker-compose.yml` 이 레포에 있지만 Postgres 전용이고 Chromium 은 포함되지 않음. puppeteer를 Docker에서 돌리려면 `apt-get install -y chromium-browser` 또는 `browserless/chrome` 이미지가 필요.

### 8.5 기타 함정

- `page.pdf()` 반환값은 Node 환경에서 `Uint8Array`. Next.js 15 에서 `Response(pdfBuffer)` 로 바로 쓰지 못하고 `new Uint8Array(pdfBuffer)` 로 다시 감싸야 한다(`app/api/proposals/[id]/pdf/route.ts:44`).
- `waitUntil: 'networkidle0'` + 500ms sleep 콤보는 CDN 폰트 로딩 편차를 흡수하기 위한 것. CDN이 느린 날에는 이 값을 더 올려야 할 수 있다. 개인적으로 `document.fonts.ready` + 명시적 이미지 `load` Promise.all 로 바꾸면 더 빠르고 안정적.
- `experimental.serverActions.bodySizeLimit: '10mb'` 는 Server Action 응답 크기 한도. PDF 다운로드는 일반 GET 라우트이므로 영향 없지만, 제안서 이미지 업로드(현장 사진)에서 쓰일 수 있으니 bsmg-v5 의 설정과 맞춰야 한다.
- `styles/proposal.css` 의 `@import url('https://...')` 는 **런타임 CSS import**. Puppeteer가 `networkidle0` 까지 기다리므로 첫 PDF 생성이 느려진다. bsmg-v5 에서는 self-host 로 옮기면 초당 수백 ms 단축 가능.

---

**파일 끝.** 이 문서만으로 bsmg-v5 에서 동일 파이프라인을 이식할 수 있도록 핵심 파일 전체 코드를 그대로 복사했다. 추측이 들어간 부분은 §7.3 (로고 PNG 사용 이유) 하나뿐이며 그 외는 모두 소스 인용이다.
