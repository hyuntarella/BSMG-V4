---
name: ui-build
description: "방수명가 UI 컴포넌트 빌드 스킬. Figma 디자인 토큰 추출, Tailwind 컴포넌트 구현, 디자인 검증 프로토콜(Figma↔코드 1:1 대조), 200줄 이내 분리, 서버/클라이언트 컴포넌트 판단 등 모든 UI 작업을 수행한다. 'UI', '컴포넌트', 'Figma', '디자인', '레이아웃', '페이지', '화면', '버튼', '모달', '폼' 키워드가 있으면 이 스킬을 사용하라."
---

# UI 빌드 스킬

UI Builder 에이전트가 사용하는 작업 스킬.

## Figma → 코드 워크플로우

### Step 1: 디자인 토큰 추출
Figma MCP `get_design_context`로 대상 컴포넌트의 토큰 추출:
- 색상 (hex/rgb)
- 폰트 (family, size, weight, line-height)
- 간격 (padding, margin, gap)
- 정렬 (flex direction, justify, align)
- 크기 (width, height, border-radius)

### Step 2: Tailwind 구현
- 추출된 토큰을 Tailwind 클래스로 매핑
- 서버 컴포넌트 기본, 'use client'는 상호작용 필요 시에만
- 절대경로: `@/components/`, `@/hooks/`, `@/lib/`

### Step 3: 디자인 검증 (CLAUDE.md 필수 프로토콜)
코드의 모든 스타일 값을 Figma 토큰과 1:1 대조:

```markdown
| 요소 | Figma 값 | 코드 값 | 일치 |
|------|----------|--------|------|
| 배경색 | #1A1A2E | bg-[#1A1A2E] | O |
| 폰트 크기 | 16px | text-base | O |
| 패딩 | 24px | p-6 | O |
```

차이 발견 → 수정 → 재대조 → 차이 0개까지 반복

### Step 4: 한 컴포넌트씩
여러 컴포넌트를 한 번에 작업하지 않는다.

## 컴포넌트 분리 기준

- 200줄 초과 → 하위 컴포넌트로 분리
- 재사용 가능한 부분 → `/components/common/`에 분리
- 기존 common 컴포넌트 확인 후 중복 생성 방지

## 서버 vs 클라이언트 판단

| 클라이언트 필요 | 서버 유지 |
|----------------|----------|
| useState, useEffect | 정적 렌더링 |
| onClick, onChange | 데이터 페칭 |
| useRef (DOM 접근) | Supabase 서버 쿼리 |
| 드래그 앤 드롭 | 메타데이터 |
| 음성 입력 | SEO 필요 |

## 금지 사항
- 인라인 스타일, CSS 모듈, styled-components 금지
- 클래스 컴포넌트 금지
- 상대경로 import 금지
- Figma 검증 없이 "완료" 선언 금지 (Figma URL 없으면 "검증 보류" 명시)
