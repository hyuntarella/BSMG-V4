'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import './proposal.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface Manager {
  name: string;
  phone: string;
}

interface MethodDef {
  id: string;
  name: string;
  loc: string;
}

interface CatItems {
  cat: string;
  items: string[];
}

interface ExpertVar {
  key: string;
  label: string;
  ph: string;
}

interface MethodEffect {
  t: string;
  d: string;
}

interface MethodDetail {
  name: string;
  loc: string;
  lt: string;
  feat: string[];
  mat: string;
  proc: string;
  cases: string[];
  eff: MethodEffect[];
}

interface ProposalConfig {
  mgr: Manager[];
  meth: MethodDef[];
  dn: CatItems[];
  dd: CatItems[];
  problems: CatItems[];
  reasons: CatItems[];
  expertTpl: string;
  expertVars: ExpertVar[];
}

interface P4Cell {
  row: number;
  col: number;
  content: string;
  isLabel?: number;
}

interface PhotoSavedStatus {
  [key: string]: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const ASSETS: Record<string, string> = {
  cover_texture: 'https://www.figma.com/api/mcp/asset/8cf42ad1-1008-4f8a-9c09-7ea591185e69',
  seal: 'https://www.figma.com/api/mcp/asset/c39b343c-a146-47b9-8b93-d97b02fa5b68',
  brand_samsung: 'https://www.figma.com/api/mcp/asset/c476d1da-08a5-4269-b2de-23278184211f',
  brand_woojung: 'https://www.figma.com/api/mcp/asset/f32203e9-a62e-40c9-b8d7-60cc1a0842a9',
  brand_jongro: 'https://www.figma.com/api/mcp/asset/beff1dd0-b347-4709-9437-613ba8d508fb',
  brand_gimpo: 'https://www.figma.com/api/mcp/asset/d26815c0-bf2c-403c-8c18-41b4e7946971',
  quote_open: 'https://www.figma.com/api/mcp/asset/6414409c-cc82-4c3f-8ee5-f8514157cbcc',
  quote_close: 'https://www.figma.com/api/mcp/asset/5789e664-075b-4979-8349-bc5f3c189edf',
  std_accent: 'https://www.figma.com/api/mcp/asset/d001ddfe-7270-4bc9-afd2-4fc666f6453f',
};

const CASE_IMGS: Record<string, string[]> = {
  M01: ['https://www.figma.com/api/mcp/asset/a59e2ec3-4ae4-445a-ab73-543930ee1cc9', 'https://www.figma.com/api/mcp/asset/09c09853-aabf-42ae-bf29-3c23ef4b4df4', 'https://www.figma.com/api/mcp/asset/d2f0e955-726c-469d-96ad-59f0101c80bb'],
  M02: ['https://www.figma.com/api/mcp/asset/246806b9-a0c8-4c13-8be9-bdc851524ac3', 'https://www.figma.com/api/mcp/asset/03640f21-02fa-4875-bf6a-5f2b3fd602fc', 'https://www.figma.com/api/mcp/asset/5adbb056-4e2d-4049-827c-c42f460d31e9'],
  M03: ['https://www.figma.com/api/mcp/asset/fd44dd0d-e841-4a07-96fd-74ed3d12eb66', 'https://www.figma.com/api/mcp/asset/6884201f-9e1b-4879-be8d-baadeebec966', 'https://www.figma.com/api/mcp/asset/a9072530-7d54-45f0-bf26-e7192f7204a6'],
  M04: ['https://www.figma.com/api/mcp/asset/118df799-4f73-4ec4-9629-79eed014a9b5', 'https://www.figma.com/api/mcp/asset/228ed853-1be6-4041-aa41-0755e1321380', 'https://www.figma.com/api/mcp/asset/1a34a895-fb40-45b8-a440-69dc039b2a38'],
  M05: ['https://www.figma.com/api/mcp/asset/031cfc47-3a44-4af6-9e8e-d89fc75d956e', 'https://www.figma.com/api/mcp/asset/46cf1958-bdc5-4e41-8c67-1d132ca5d3fd', 'https://www.figma.com/api/mcp/asset/1490040c-ffd0-4d42-a4be-49482633fb1b'],
  M06: ['https://www.figma.com/api/mcp/asset/84bc4806-de4e-4eea-9449-4e8d8fc9baa8', 'https://www.figma.com/api/mcp/asset/78808547-6f22-478e-898f-9b7f01e1e44d', 'https://www.figma.com/api/mcp/asset/9aba6987-1382-457f-b8c5-c172b5885780'],
  M07: ['https://www.figma.com/api/mcp/asset/73f31838-ffe4-4539-82fc-8a6182f651bc', 'https://www.figma.com/api/mcp/asset/bc2518f4-f1a8-4cc7-a244-12b0cab421b0', 'https://www.figma.com/api/mcp/asset/b53d7b38-8b8e-4fab-9773-4e632f286ede'],
};

const fmtComma = (v: string | number): string =>
  v ? String(v).replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';

const DEF_MGR: Manager[] = [
  { name: '박민우 팀장', phone: '010-8143-0901' },
  { name: '이창엽 팀장', phone: '010-5379-3587' },
];

const DEF_METH: MethodDef[] = [
  { id: 'M01', name: '이중 복합 방수', loc: '옥상' },
  { id: 'M02', name: '노출 우레탄 방수 3mm', loc: '옥상' },
  { id: 'M03', name: '고경질 우레탄 방수', loc: '주차장' },
  { id: 'M04', name: '아스콘 고경질 우레탄 방수', loc: '주차장' },
  { id: 'M05', name: '외벽 방수 (발수 및 코킹)', loc: '외벽' },
  { id: 'M06', name: '탄성 도막 방수', loc: '외벽' },
  { id: 'M07', name: '넬코트 도막 방수', loc: '지붕' },
];

const DEF_DN: CatItems[] = [
  { cat: '옥상', items: ['옥상 균열', '옥상 방수층', '배수구 주변', '물고임'] },
  { cat: '외벽', items: ['외벽 누수', '드라이비트', '실리콘 균열'] },
  { cat: '지붕', items: ['싱글지붕', '판넬 배수로 누수'] },
  { cat: '내부', items: ['내부 누수', '천장 내부 누수'] },
  { cat: '기타', items: ['우레탄 들뜸', '실외기', '화단', '계단'] },
];

const DEF_DD: CatItems[] = [
  { cat: '크랙/박리', items: ['육안 검사 결과, 기존 도막의 박리 및 다수의 미세 균열이 관찰됨.', '크고 작은 크랙발생으로 인한 우수 유입'] },
  { cat: '누수', items: ['내부 누수 진행 중.', '균열에 의한 방수층 기능 저하로 인한 내부 누수 피해.'] },
  { cat: '들뜸', items: ['우레탄 들뜸 현상 다수 관찰됨.'] },
];

const DEF_PROBLEMS: CatItems[] = [
  { cat: '옥상', items: ['옥상 방수층의 전반적인 노후화와 복합적인 균열', '기존 우레탄 도막의 박리 및 들뜸', '배수 불량으로 인한 상시 물고임 현상'] },
  { cat: '외벽', items: ['외벽 균열을 통한 빗물 침투', '드라이비트 마감재 탈락 및 균열', '실리콘 코킹 노후화로 인한 누수'] },
  { cat: '주차장', items: ['주차장 바닥 균열 및 방수층 파손', '아스콘 하부 누수로 인한 구조물 열화'] },
  { cat: '지붕', items: ['판넬 이음매 부식 및 누수', '싱글지붕 노후화로 인한 누수'] },
];

const DEF_REASONS: CatItems[] = [
  { cat: '성능', items: ['복합시트와 고탄성 우레탄의 이중 구조로 가장 이상적인 방수층 구현', '바닥 균열 재발 시에도 복합시트가 방수층을 보호', '10년 전후 반영구적 수명으로 장기적 비용 절감'] },
  { cat: '보증', items: ['서울보증보험 하자이행증권 의무 발행', '최대 8년 무상 하자 보수 기간 제공'] },
  { cat: '자재', items: ['KCC 인증 정품 자재 및 정량 시공 원칙', '내후성 상도재로 자외선 및 기후 변화에 강한 내구성'] },
  { cat: '부가가치', items: ['차열 기능 포함으로 에너지 효율 향상', '자산 가치 보존 및 구조물 수명 연장'] },
];

const DEF_EXPERT_TPL = '저희 전문가팀이 판단하기에, {{건물특성}}라는 문제가 확인된 고객님의 건물은 단순히 누수를 막는 것을 넘어, 부동산으로서의 자산 가치를 온전히 보존하는 접근이 반드시 필요합니다.\n\n이를 위해선 {{건물연식특성}}까지 고려한 종합적인 시스템이 필수적이며,\n이에 [{{추천플랜}}] 플랜을 추천드립니다. 핵심 공법인 {{핵심공법}} 시스템은 하자의 근원을 차단하고, {{추가효과}}. 이는 과하거나 부족함 없이 고객님의 자산을 지키는 가장 합리적인 선택이기에, 저희가 가장 자신 있게 추천드리는 플랜입니다.';

const DEF_EXPERT_VARS: ExpertVar[] = [
  { key: '건물특성', label: '건물 특성 (문제)', ph: '옥상 방수층의 전반적인 노후화와 복합적인 균열' },
  { key: '건물연식특성', label: '건물 연식 특성', ph: '건축된 지 30년이 지난 건물의 특성' },
  { key: '추천플랜', label: '추천 플랜명', ph: '스탠다드' },
  { key: '핵심공법', label: '핵심 공법', ph: '이중복합방수' },
  { key: '추가효과', label: '추가 효과', ph: '차열 기능성 상도는 에너지 효율까지 높여줍니다' },
];

const DEF_CFG: ProposalConfig = {
  mgr: DEF_MGR,
  meth: DEF_METH,
  dn: DEF_DN,
  dd: DEF_DD,
  problems: DEF_PROBLEMS,
  reasons: DEF_REASONS,
  expertTpl: DEF_EXPERT_TPL,
  expertVars: DEF_EXPERT_VARS,
};

const MDB: Record<string, MethodDetail> = {
  M01: { name: '이중 복합 방수', loc: '옥상', lt: '옥상 누수 문제 해결 대표 사례', feat: ['<b>복합시트와 고탄성 우레탄을 결합한 공법</b>으로, 각 소재의 단점을 완벽히 보완하여 가장 이상적인 방수층을 구현합니다.', '바닥 균열이 다시 일어나도 복합시트가 이를 버텨주어 방수층에 영향을 주지 않습니다.', '10년 전후로 사용 가능한 반영구적인 공법입니다. (열차단 기능 포함)', '<b>8년의 하자 보수 기간</b>은 시공 품질에 대한 자신감입니다.'], mat: 'KCC 정품 프라이머(EP118), 탄성 우레탄 실란트, KCC 내후성 상도재 등', proc: '바탕 정리 → 크랙보수 → 하도프라이머 → 우레탄중도 → 우레탄상도', cases: ['김포시 양촌읍 사례', '파주시 골프협회 사례', '여의도 롯데캐슬 사례'], eff: [{ t: '잦은 보수 필요성 최소화', d: '10년 이상의 수명으로 건물의 안정적인 운영 및 관리에 기여합니다.' }, { t: '유지보수 예산 방어', d: '재시공과 2차 하자로 인한 금전적 손실을 차단하여 불필요한 예산 지출을 막습니다.' }, { t: '자산가치 경쟁력 확보', d: '누수로 인한 구조물 손상 등을 사전에 방지하여 자산의 가치를 높이는 데 기여합니다.' }, { t: '법적 품질 보증 확약', d: '서울보증보험의 하자이행증권을 의무적으로 발행하여 법적으로 보장됩니다.' }] },
  M02: { name: '노출 우레탄 방수 3mm', loc: '옥상', lt: '옥상 누수 문제 해결 대표 사례', feat: ['비용이 가장 저렴하여, 한국에서 <b>대중적으로 선택하는 방수 공법</b>입니다.', '우레탄 1종류 재료를 사용하여 바탕면 위에 방수층을 형성합니다.', '일반적으로 <b>3~5년의 유지력</b>을 가집니다.', '초기 하자가 발생했을 때 <b>유지보수가 간편</b>하다는 장점이 있습니다.'], mat: 'KCC 정품 프라이머(EP118), 탄성 우레탄 실란트, KCC 내후성 상도재 등', proc: '바탕 정리 → 크랙보수 → 하도프라이머 → 우레탄중도 → 상도 탑 코팅', cases: ['원흥 보림프라자 사례', '강동구 명성프라자 사례', '인천 부평구 사례'], eff: [{ t: '자산가치 경쟁력 확보', d: '누수로 인한 구조물 손상 등을 사전에 방지하여 자산의 가치를 높이는데 기여합니다.' }, { t: '법적 품질 보증 확약', d: '서울보증보험의 하자이행증권을 의무적으로 발행하여 법적으로 보장됩니다.' }, { t: '유지 보수 용이성', d: '초기 하자 발생시 유지보수가 쉬워 관리가 용이합니다.' }, { t: '합리적인 가격', d: '가장 저렴한 비용으로 할 수 있는 방수 공법입니다.' }] },
  M03: { name: '고경질 우레탄 방수', loc: '주차장', lt: '주차장 누수 문제 해결 대표 사례', feat: ['차량 통행과 타이어 마찰에도 견딜 수 있도록 설계된 <b>고강도 방수 시공 방식</b>입니다.', '고경질 우레탄은 극한의 하중 조건에서도 방수층을 변형없이 견고하게 유지합니다.', '추가 옵션 선택시 논슬립, 스토퍼 설치, 주차라인도색 등 추가 시공 가능합니다.'], mat: '스포탄 하도, 탄성 우레탄 실란트, KCC 고경질 중도 우레탄 등', proc: '바탕 정리 → 크랙보수 → 하도프라이머 → 고경질 우레탄 중도 → 상도 탑 코팅', cases: ['필동 공영주차장 사례', '서초구 반포동 사례', '양천구 신정동 사례'], eff: [{ t: '고강도 내구성', d: '차량 이동 및 타이어 마찰에도 견디는 내구성이 뛰어난 방수 시공 방식입니다.' }, { t: '유지보수 예산 방어', d: '하자로 인한 재시공 등 금전적 손실을 차단하여 불필요한 예산 지출을 막습니다.' }, { t: '자산가치 경쟁력 확보', d: '누수로 인한 구조물 손상 등을 사전에 방지하여 자산의 가치를 높이는 데 기여합니다.' }, { t: '법적 품질 보증 확약', d: '서울보증보험의 하자이행증권을 의무적으로 발행하여 법적으로 보장됩니다.' }] },
  M04: { name: '아스콘 고경질 우레탄 방수', loc: '주차장', lt: '주차장 누수 문제 해결 대표 사례', feat: ['<b>기존 아스콘을 철거 하지 않고 방수층을 형성하는 공법</b>입니다.', '따라서 공사기간과 공사비는 획기적으로 줄이면서도 완벽한 방수 효과를 제공합니다.', '차량 통행과 타이어 마찰에도 견딜 수 있도록 설계된 고강도 방수 시공 방식입니다.', '추가 옵션 선택 시 논슬립, 스토퍼 설치, 주차라인 도색 등 추가 시공이 가능합니다.'], mat: '스포탄 아스콘하도, 탄성 우레탄 실란트, KCC 고경질 상도재 등', proc: '바탕 정리 → 크랙보수 → 아스콘 하도프라이머 → 아스콘 고경질 우레탄 → 상도 탑 코팅', cases: ['남양주시 별내동 사례', '중구 수표로 사례', '용인 수지구 사례'], eff: [{ t: '공사 비용 절감', d: '철거 및 아스콘 재시공 없이 시공하는 경제적이고 합리적인 방수 공법입니다.' }, { t: '유지보수 예산 방어', d: '하자로 인한 재시공 등 금전적 손실을 차단하여 불필요한 예산 지출을 막습니다.' }, { t: '자산가치 경쟁력 확보', d: '누수로 인한 구조물 손상 등을 사전에 방지하여 자산의 가치를 높이는 데 기여합니다.' }, { t: '법적 품질 보증 확약', d: '서울보증보험의 하자이행증권을 의무적으로 발행하여 법적으로 보장됩니다.' }] },
  M05: { name: '외벽 방수 (발수 및 코킹)', loc: '외벽', lt: '외벽 누수 문제 해결 대표 사례', feat: ['조적벽돌, 파벽돌, 대리석 등 다공성 <b>외장재를 사용한 건물에 적용</b>하는 가장 대중적인 방수 공법입니다.', '균열과 틈새 및 노후 실리콘 부분을 전용 실란트로 1차 보수 작업을 진행합니다.', '발수제를 도포해 2차 보수 작업으로 마감합니다.'], mat: 'KCC워터씰, 탄성 우레탄 실란트 등', proc: '바탕 정리 → 외벽 크랙 및 창호 코킹 → 발수제 도포', cases: ['온누리 교회 사례', '명성프라자 사례', '양천구 남부순환로 사례'], eff: [{ t: '뛰어난 방수 효과', d: '빗물이 벽에 스며들지 않고 흘러내리게 하여 내부 누수 피해를 막아줍니다.' }, { t: '자산가치 경쟁력 확보', d: '누수로 인한 구조물 손상 등을 사전에 방지하여 자산의 가치를 높이는 데 기여합니다.' }, { t: '백화 현상 방지', d: '벽돌이나 콘크리트의 석회 성분이 물과 반응해 하얗게 흘러내리는 \'백화 현상\'을 방지합니다.' }, { t: '숨 쉬는 방수', d: '외부로 유입되는 빗물을 막으면서도, 미세 통로를 통해 내부의 수증기는 밖으로 배출됩니다.' }] },
  M06: { name: '탄성 도막 방수', loc: '외벽', lt: '외벽 누수 문제 해결 대표 사례', feat: ['드라이비트, 스톤코트, 세라믹타일 등의 <b>외장재를 사용한 건물</b>에 적용하는 방수 공법입니다.', '일반 수성 페인트와 달리 고무와 같은 고탄성 도막을 형성합니다.', '한번의 시공으로 심미적인 도색효과와 완벽한 방수 성능을 동시에 확보할 수 있습니다.'], mat: '고탄성퍼티, 마페이 아쿠아플렉스, 탄성 우레탄 실란트 등', proc: '바탕 정리 → 외벽 크랙 및 창호 코킹 → 침투 방수층 도포 → 방수 도막층 도포', cases: ['종로구 인사동 사례', '용인 고기로 사례', '파주시 새꽃로 사례'], eff: [{ t: '뛰어난 방수 효과', d: '빗물이 벽에 스며들지 않고 흘러내리게 하여 내부 누수 피해를 막아줍니다.' }, { t: '자산가치 경쟁력 확보', d: '누수로 인한 내부 곰팡이 발생 등을 방지하여 자산의 가치를 높이는 데 기여합니다.' }, { t: '건물 미관 개선', d: '한번의 시공으로 방수와 심미적인 도색 효과를 동시에 확보할 수 있습니다.' }, { t: '타일 탈락 현상 방지', d: '세라믹 타일 외장재 마감 건물의 경우 탄성 도막층으로 타일 탈락 현상을 방지합니다.' }] },
  M07: { name: '넬코트 도막 방수', loc: '지붕', lt: '지붕 누수 문제 해결 대표 사례', feat: ['지열이 특히 높은 판넬 및 징크의 <b>차열 단열 성능을 높입니다.</b>', '<b>무독성이며 냄새가 없는 친환경 제품</b>을 사용합니다.', '물, 염분, 자외선 등 내후성이 우수하여 <b>부식방지에 효과적</b>입니다.'], mat: '탄성 우레탄 실란트, 대로화학 넬코트 판넬전용방수재', proc: '바탕면정리 → 코킹(볼트캡, 크랙, 이음매) → 필요시 보강포 보강 → 넬코트 도포', cases: ['경기 포천시 내촌면 사례', '금천구 독산동 사례', '이천시 마장면 사례'], eff: [{ t: '자산가치 경쟁력 확보', d: '누수로 인한 구조물 손상 등을 사전에 방지하여 건물 수명을 획기적으로 연장합니다.' }, { t: '법적 품질 보증 확약', d: '서울보증보험의 하자이행증권을 의무적으로 발행하여 법적으로 보장됩니다.' }, { t: '친환경 자재', d: '안전한 자재 사용으로 거주자의 만족도를 최상으로 끌어올립니다.' }, { t: '다양한 기능 향상', d: '뛰어난 차열, 단열, 부식 방지 효과가 있습니다.' }] },
};

const P5P = [
  { t: '책임 품질 보증 시스템', d: '시공 완료 후 계약서 상에 작성된 대로 책임 보증을 약속하며, 이는 당사의 자체 보증을 넘어 서울보증보험(SGI)을 통해 계약 내용의 이행을 확실히 보증하는 금융적 안전장치를 제공합니다.' },
  { t: '핵심 공정 기록 및 공유', d: '모든 시공 단계는 사진과 함께 기록되어 고객과 투명하게 공유하는 것을 원칙으로 합니다.' },
  { t: '본사 직영 A/S 시스템', d: 'A/S 접수 시, 본사 직영팀이 책임지고 처리하는 전문적인 대응 시스템을 운영합니다. 모든 처리 과정은 투명하게 공유되며 신속한 해결을 최우선으로 합니다.' },
  { t: '정품 자재 사용 원칙', d: '방수명가는 KCC 인증 정품 자재, 정량 시공을 약속드립니다.' },
];

const BRANDS = [
  { name: 'SAMSUNG', img: ASSETS.brand_samsung },
  { name: 'RAEMIAN', img: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3MCAxOSI+CjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSI0LjMiIGhlaWdodD0iMTkiIHJ4PSIwLjMiIGZpbGw9IiMwMDlDQTYiLz4KPHJlY3QgeD0iNSIgeT0iMCIgd2lkdGg9IjQuMyIgaGVpZ2h0PSIxOSIgcng9IjAuMyIgZmlsbD0iIzAwOUNBNiIvPgo8cmVjdCB4PSIxMCIgeT0iMCIgd2lkdGg9IjQuMyIgaGVpZ2h0PSIxOSIgcng9IjAuMyIgZmlsbD0iIzAwOUNBNiIvPgo8dGV4dCB4PSIxOSIgeT0iMTMuNSIgZm9udC1mYW1pbHk9IkFyaWFsLEhlbHZldGljYSxzYW5zLXNlcmlmIiBmb250LXNpemU9IjkuNSIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iIzMzMyIgbGV0dGVyLXNwYWNpbmc9IjAuNyI+UkFFTUlBTjwvdGV4dD4KPC9zdmc+Cg==' },
  { name: '우정사업본부', img: ASSETS.brand_woojung },
  { name: '종로', img: ASSETS.brand_jongro },
  { name: '서울중구', img: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4NCAzOCI+CjxjaXJjbGUgY3g9IjE1IiBjeT0iMTkiIHI9IjEyIiBmaWxsPSIjRTg1QzJCIi8+CjxwYXRoIGQ9Ik0xMSAxMCBRNSAxOSAxMSAyOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNUJBRDRGIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8dGV4dCB4PSIzMiIgeT0iMjQiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjMzMzIj7shJzsmrjspJHqtaw8L3RleHQ+Cjwvc3ZnPgo=' },
  { name: 'GIMPO', img: ASSETS.brand_gimpo },
];

const P4_COLS = [
  { l: '6.89%', w: '14.96%' },
  { l: '22.69%', w: '23.03%' },
  { l: '46.55%', w: '22.86%' },
  { l: '70.25%', w: '23.03%' },
];

const P4_ROWS = [
  { t: 0, h: 16.08 },
  { t: 16.08, h: 16.08 },
  { t: 32.16, h: 16.08 },
  { t: 48.24, h: 15.79 },
  { t: 64.03, h: 20.18 },
  { t: 84.21, h: 15.79 },
];

const P4_GC: P4Cell[] = [
  { row: 0, col: 0, content: '핵심 방수 시스템', isLabel: 1 }, { row: 0, col: 1, content: '우레탄 도막 방수' }, { row: 0, col: 2, content: '이중복합방수 3.8mm' }, { row: 0, col: 3, content: '이중복합방수 4.3mm' },
  { row: 1, col: 0, content: '색상 선택', isLabel: 1 }, { row: 1, col: 1, content: '녹색' }, { row: 1, col: 2, content: '녹색, 회색' }, { row: 1, col: 3, content: '희망 색상 선택 가능' },
  { row: 2, col: 0, content: '하자보증증권<br/>발급', isLabel: 1 }, { row: 2, col: 1, content: 'X' }, { row: 2, col: 2, content: '3년' }, { row: 2, col: 3, content: '5년' },
  { row: 3, col: 0, content: '무상 하자 보수 기간', isLabel: 1 }, { row: 3, col: 1, content: '3년' }, { row: 3, col: 2, content: '5년' }, { row: 3, col: 3, content: '8년' },
  { row: 4, col: 0, content: '유지보수<br/>예산 방어 금액', isLabel: 1 }, { row: 4, col: 1, content: '재공사 1회 방지<br/><span class="p4-sub">연 40만원 / 총 120만원</span>' }, { row: 4, col: 2, content: '재공사 2회 방지<br/><span class="p4-sub">연 60만원 / 총 300만원</span>' }, { row: 4, col: 3, content: '재공사 3회 방지<br/><span class="p4-sub">연 90만원 / 총 720만원</span>' },
  { row: 5, col: 0, content: '추천 대상', isLabel: 1 }, { row: 5, col: 1, content: '임대사업자, 상가' }, { row: 5, col: 2, content: '실거주 건물주, 빌라' }, { row: 5, col: 3, content: '자산관리 법인, 신축급 건물' },
];

const P4_LINES = [16.08, 32.16, 48.24, 64.03, 84.21];

// ── Utilities ──────────────────────────────────────────────────────────────

function useDraggable(initX?: number, initY?: number) {
  const [pos, setPos] = useState({ x: initX ?? 0, y: initY ?? 100 });
  const dr = useRef(false);
  const off = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setPos({ x: initX ?? Math.round(window.innerWidth / 2 - 160), y: initY ?? 100 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const t = 'touches' in e ? e.touches[0] : e;
    dr.current = true;
    off.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    const mv = (e: MouseEvent | TouchEvent) => {
      if (!dr.current) return;
      const t = 'touches' in e ? e.touches[0] : e;
      setPos({ x: t.clientX - off.current.x, y: t.clientY - off.current.y });
    };
    const up = () => { dr.current = false; };
    document.addEventListener('mousemove', mv);
    document.addEventListener('mouseup', up);
    document.addEventListener('touchmove', mv, { passive: false });
    document.addEventListener('touchend', up);
    return () => {
      document.removeEventListener('mousemove', mv);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', mv);
      document.removeEventListener('touchend', up);
    };
  }, []);

  return { pos, onStart };
}

function resizeImg(dataUrl: string, maxW: number, cb: (result: string) => void) {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, maxW / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
    cb(canvas.toDataURL('image/jpeg', 0.85));
  };
  img.src = dataUrl;
}

// ── EditField (EF) ─────────────────────────────────────────────────────────

interface EFProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  options?: Array<{ v: string; l: string }>;
  multiline?: boolean;
  prose?: boolean;
  plain?: boolean;
  style?: React.CSSProperties;
}

function EF({ label, value, onChange, placeholder, type, options, multiline, plain, style }: EFProps) {
  const [ed, setEd] = useState(false);
  const [tmp, setTmp] = useState('');
  const drag = useDraggable();
  const open = () => { setTmp(value); setEd(true); };
  const cc = () => setEd(false);
  const ok = () => { onChange(tmp); setEd(false); };

  const display = type === 'number' ? fmtComma(value) : (value || placeholder || '');

  return (
    <>
      <span className={'ev' + (plain ? '' : ' mt')} style={style} onClick={open}>
        {display || <span style={{ color: '#bbb', fontStyle: 'italic' }}>{placeholder}</span>}
      </span>
      {ed && typeof document !== 'undefined' && createPortal(
        <div className="ef-ov" onClick={cc}>
          <div className="ef-bx" style={{ position: 'fixed', left: drag.pos.x, top: drag.pos.y }} onClick={e => e.stopPropagation()}>
            <div className="ef-drag" onMouseDown={drag.onStart} onTouchStart={drag.onStart}>
              <div className="ef-drag-bar" />
            </div>
            <div className="ef-bx-inner">
              <label>{label}</label>
              {options ? (
                <select value={tmp} onChange={e => setTmp(e.target.value)}>
                  {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              ) : multiline ? (
                <textarea value={tmp} onChange={e => setTmp(e.target.value)} placeholder={placeholder} />
              ) : (
                <input
                  type={type === 'number' ? 'text' : (type || 'text')}
                  value={type === 'number' ? fmtComma(tmp) : tmp}
                  onChange={e => setTmp(type === 'number' ? e.target.value.replace(/[^\d]/g, '') : e.target.value)}
                  placeholder={placeholder}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') cc(); }}
                />
              )}
              <div className="ef-acts">
                <button className="ef-btn ef-cc" onClick={cc}>취소</button>
                <button className="ef-btn ef-ok" onClick={ok}>확인</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── CatCombo (CC) ──────────────────────────────────────────────────────────

interface CCProps {
  catData: CatItems[];
  value: string;
  onChange: (val: string) => void;
  onAcc: (val: string, cat: string) => void;
  label: string;
}

function CC({ catData, value, onChange, onAcc, label }: CCProps) {
  const [ed, setEd] = useState(false);
  const [f, setF] = useState('');
  const [cf, setCf] = useState<string | null>(null);
  const drag = useDraggable();
  const open = () => { setF(''); setCf(null); setEd(true); };
  const cc = () => setEd(false);

  const filtered = cf
    ? catData.filter(c => c.cat === cf).flatMap(c => c.items.filter(i => !f || i.includes(f)))
    : catData.flatMap(c => c.items.filter(i => !f || i.includes(f)));

  const catList = catData.map(c => c.cat);
  const curCat = cf ?? (catData[0]?.cat ?? '');

  const select = (item: string) => { onChange(item); onAcc(item, curCat); cc(); };

  return (
    <>
      <span className={'ev' + (value ? '' : ' mt')} onClick={open}>{value || label}</span>
      {ed && typeof document !== 'undefined' && createPortal(
        <div className="ef-ov" onClick={cc}>
          <div className="ef-bx" style={{ position: 'fixed', left: drag.pos.x, top: drag.pos.y, maxHeight: 380, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="ef-drag" onMouseDown={drag.onStart} onTouchStart={drag.onStart}><div className="ef-drag-bar" /></div>
            <div style={{ padding: '10px 14px 0' }}>
              <input className="ef-bx input" style={{ width: '100%', padding: 10, border: '2px solid #e8e8e8', borderRadius: 10, fontSize: 16, fontFamily: 'inherit' }} value={f} onChange={e => setF(e.target.value)} placeholder={label} autoFocus />
            </div>
            <div className="dd-tags">
              {catList.map(cat => (
                <span key={cat} className={'dd-tag' + (cf === cat ? ' on' : '')} onClick={() => setCf(cf === cat ? null : cat)}>{cat}</span>
              ))}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.map((item, i) => (
                <div key={i} className={'dd-i' + (item === value ? ' dd-sel' : '')} onClick={() => select(item)}>{item}</div>
              ))}
              {f && (
                <div className="dd-n" onClick={() => select(f)}>+ &quot;{f}&quot; 추가</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── MultiCatCombo (MultiCC) ────────────────────────────────────────────────

interface MultiCCProps {
  catData: CatItems[];
  value: string;
  onChange: (val: string) => void;
  onAcc: (val: string, cat: string) => void;
  label: string;
}

function MultiCC({ catData, value, onChange, onAcc, label }: MultiCCProps) {
  const [ed, setEd] = useState(false);
  const [f, setF] = useState('');
  const [cf, setCf] = useState<string | null>(null);
  const drag = useDraggable();
  const items = value ? value.split('\n').filter(Boolean) : [];

  const open = () => { setF(''); setCf(null); setEd(true); };
  const cc = () => setEd(false);

  const filtered = (cf
    ? catData.filter(c => c.cat === cf).flatMap(c => c.items)
    : catData.flatMap(c => c.items)
  ).filter(i => !f || i.includes(f));

  const catList = catData.map(c => c.cat);
  const curCat = cf ?? (catData[0]?.cat ?? '');

  const toggle = (item: string) => {
    const next = items.includes(item) ? items.filter(x => x !== item) : [...items, item];
    onChange(next.join('\n'));
    onAcc(item, curCat);
  };

  const remove = (item: string) => onChange(items.filter(x => x !== item).join('\n'));

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, cursor: 'pointer' }} onClick={open}>
        {items.map((item, i) => (
          <span key={i} className="mcc-chip">
            {item}
            <span className="mcc-x" onClick={e => { e.stopPropagation(); remove(item); }}>×</span>
          </span>
        ))}
        {items.length === 0 && <span className="ev mt">{label}</span>}
      </div>
      {ed && typeof document !== 'undefined' && createPortal(
        <div className="ef-ov" onClick={cc}>
          <div className="ef-bx" style={{ position: 'fixed', left: drag.pos.x, top: drag.pos.y, maxHeight: 400, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="ef-drag" onMouseDown={drag.onStart} onTouchStart={drag.onStart}><div className="ef-drag-bar" /></div>
            <div style={{ padding: '10px 14px 0' }}>
              <input style={{ width: '100%', padding: 10, border: '2px solid #e8e8e8', borderRadius: 10, fontSize: 16, fontFamily: 'inherit' }} value={f} onChange={e => setF(e.target.value)} placeholder={label} autoFocus />
            </div>
            <div className="dd-tags">
              {catList.map(cat => (
                <span key={cat} className={'dd-tag' + (cf === cat ? ' on' : '')} onClick={() => setCf(cf === cat ? null : cat)}>{cat}</span>
              ))}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.map((item, i) => (
                <div key={i} className={'dd-i' + (items.includes(item) ? ' dd-sel' : '')} onClick={() => toggle(item)}>{item}</div>
              ))}
              {f && !filtered.includes(f) && (
                <div className="dd-n" onClick={() => toggle(f)}>+ &quot;{f}&quot; 추가</div>
              )}
            </div>
            <div style={{ padding: '10px 14px' }}>
              <button className="btn bp" style={{ width: '100%' }} onClick={cc}>완료</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── ExpertEditor ───────────────────────────────────────────────────────────

interface ExpertEditorProps {
  tpl: string;
  vars: ExpertVar[];
  values: Record<string, string>;
  onChange: (vals: Record<string, string>) => void;
}

function ExpertEditor({ tpl, vars, values, onChange }: ExpertEditorProps) {
  const [ed, setEd] = useState(false);
  const [tmp, setTmp] = useState<Record<string, string>>({});
  const drag = useDraggable();
  const vlist = vars || DEF_EXPERT_VARS;

  const rendered = vlist.reduce((text, v) => {
    return text.replace(new RegExp(`{{${v.key}}}`, 'g'), values[v.key] || `[${v.label}]`);
  }, tpl || DEF_EXPERT_TPL);

  const open = () => { setTmp({ ...values }); setEd(true); };
  const cc = () => setEd(false);
  const ok = () => { onChange(tmp); setEd(false); };

  return (
    <>
      <div className="ev" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.64 }} onClick={open}
        dangerouslySetInnerHTML={{ __html: rendered }} />
      {ed && typeof document !== 'undefined' && createPortal(
        <div className="ef-ov" onClick={cc}>
          <div className="ef-bx" style={{ position: 'fixed', left: drag.pos.x, top: drag.pos.y, maxHeight: 480, display: 'flex', flexDirection: 'column', width: 340 }} onClick={e => e.stopPropagation()}>
            <div className="ef-drag" onMouseDown={drag.onStart} onTouchStart={drag.onStart}><div className="ef-drag-bar" /></div>
            <div className="ef-bx-inner" style={{ overflowY: 'auto' }}>
              {vlist.map(v => (
                <div key={v.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a11d1f', marginBottom: 4 }}>{v.label}</label>
                  <input
                    style={{ width: '100%', padding: 10, border: '2px solid #e8e8e8', borderRadius: 10, fontSize: 14, fontFamily: 'inherit' }}
                    value={tmp[v.key] || ''}
                    onChange={e => setTmp(p => ({ ...p, [v.key]: e.target.value }))}
                    placeholder={v.ph}
                  />
                </div>
              ))}
            </div>
            <div className="ef-acts" style={{ padding: '0 14px 14px', justifyContent: 'flex-end', display: 'flex', gap: 8 }}>
              <button className="ef-btn ef-cc" onClick={cc}>취소</button>
              <button className="ef-btn ef-ok" onClick={ok}>확인</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── PhotoSlot ──────────────────────────────────────────────────────────────

interface PhotoSlotProps {
  pk: string;
  src?: string;
  pos?: { x: number; y: number };
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPos: (key: string, pos: { x: number; y: number }) => void;
  saved?: string;
  label: string;
}

function PhotoSlot({ pk, src, pos, onFile, onPos, saved, label }: PhotoSlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const startPt = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const curPos = pos || { x: 50, y: 50 };

  const onImgStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!src) return;
    dragging.current = true;
    const t = 'touches' in e ? e.touches[0] : e;
    startPt.current = { x: t.clientX, y: t.clientY };
    startPos.current = { ...curPos };
  }, [src, curPos]);

  useEffect(() => {
    const mv = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current || !ref.current) return;
      const t = 'touches' in e ? e.touches[0] : e;
      const rect = ref.current.getBoundingClientRect();
      const dx = ((t.clientX - startPt.current.x) / rect.width) * 100;
      const dy = ((t.clientY - startPt.current.y) / rect.height) * 100;
      const nx = Math.max(0, Math.min(100, startPos.current.x - dx));
      const ny = Math.max(0, Math.min(100, startPos.current.y - dy));
      onPos(pk, { x: nx, y: ny });
    };
    const up = () => { dragging.current = false; };
    document.addEventListener('mousemove', mv);
    document.addEventListener('mouseup', up);
    document.addEventListener('touchmove', mv, { passive: false });
    document.addEventListener('touchend', up);
    return () => {
      document.removeEventListener('mousemove', mv);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', mv);
      document.removeEventListener('touchend', up);
    };
  }, [pk, onPos]);

  return (
    <div ref={ref} className={'ps' + (src ? ' ps-has' : '')} style={{ flex: 1, minHeight: 0 }}
      onMouseDown={onImgStart} onTouchStart={onImgStart}
      onClick={() => !src && fileRef.current?.click()}>
      {src && (
        <>
          <img src={src} alt={label} style={{ objectPosition: `${curPos.x}% ${curPos.y}%` }} />
          <button className="ps-replace" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>↺</button>
        </>
      )}
      {!src && <span className="ph">📷 사진 {label}</span>}
      {saved && <span className={'ps-badge ' + (saved === 'saving' ? 'ps-saving' : saved === 'saved' ? 'ps-saved' : 'ps-error')}>{saved === 'saving' ? '저장중' : saved === 'saved' ? '저장됨' : '오류'}</span>}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
    </div>
  );
}

// ── Logo ───────────────────────────────────────────────────────────────────

function Logo({ white }: { white?: boolean }) {
  return (
    <span className={white ? 'p5-flogo' : 'logo-inner'}>
      <span style={{ fontFamily: 'var(--ft)', fontSize: 'inherit', color: white ? '#fff' : 'var(--text)' }}>방수명가</span>
      <span className="p1-badge"><span>방수</span><span>전문</span></span>
    </span>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────

interface SettingsProps {
  cfg: ProposalConfig;
  onUpdate: (k: keyof ProposalConfig, val: unknown) => void;
  onClose: () => void;
}

function Settings({ cfg, onUpdate, onClose }: SettingsProps) {
  const [tab, setTab] = useState<'mgr' | 'meth' | 'dn' | 'dd' | 'problems' | 'reasons' | 'expert'>('mgr');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const tabs: Array<{ k: typeof tab; l: string }> = [
    { k: 'mgr', l: '담당자' }, { k: 'dn', l: '진단명' }, { k: 'dd', l: '진단설명' },
    { k: 'problems', l: '문제점' }, { k: 'reasons', l: '선택이유' }, { k: 'expert', l: '전문가의견' },
  ];

  return (
    <div className="cfg-ov">
      <div className="cfg-hd">
        <h2>설정</h2>
        <button className="cfg-x" onClick={onClose}>×</button>
      </div>
      <div className="cfg-tabs">
        {tabs.map(t => (
          <div key={t.k} className={'cfg-tab' + (tab === t.k ? ' on' : '')} onClick={() => setTab(t.k)}>{t.l}</div>
        ))}
      </div>

      {tab === 'mgr' && (
        <div>
          <table className="ct">
            <thead><tr><th>이름</th><th>연락처</th><th></th></tr></thead>
            <tbody>
              {cfg.mgr.map((m, i) => (
                <tr key={i}>
                  <td><input value={m.name} onChange={e => { const n = [...cfg.mgr]; n[i] = { ...n[i], name: e.target.value }; onUpdate('mgr', n); }} /></td>
                  <td><input value={m.phone} onChange={e => { const n = [...cfg.mgr]; n[i] = { ...n[i], phone: e.target.value }; onUpdate('mgr', n); }} /></td>
                  <td className="del"><button onClick={() => { const n = cfg.mgr.filter((_, j) => j !== i); onUpdate('mgr', n); }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn bp" onClick={() => onUpdate('mgr', [...cfg.mgr, { name: '', phone: '' }])}>+ 추가</button>
        </div>
      )}

      {(tab === 'dn' || tab === 'dd' || tab === 'problems' || tab === 'reasons') && (
        <CatListEditor
          data={cfg[tab] as CatItems[]}
          onSave={(d) => { onUpdate(tab, d); showToast('저장됨'); }}
        />
      )}

      {tab === 'expert' && (
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>전문가 의견 템플릿</label>
          <textarea
            style={{ width: '100%', minHeight: 120, padding: 10, border: '1px solid #e8e8e8', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6 }}
            value={cfg.expertTpl || DEF_EXPERT_TPL}
            onChange={e => onUpdate('expertTpl', e.target.value)}
          />
          <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{'{{변수명}} 형식으로 변수 사용'}</p>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ── CatListEditor (helper for Settings) ───────────────────────────────────

interface CatListEditorProps {
  data: CatItems[];
  onSave: (data: CatItems[]) => void;
}

function CatListEditor({ data, onSave }: CatListEditorProps) {
  const [d, setD] = useState<CatItems[]>(JSON.parse(JSON.stringify(data)));
  const [si, setSi] = useState(0);
  const cur = d[si] || d[0];

  return (
    <div>
      <div className="sub-tabs">
        {d.map((c, ci) => (
          <div key={ci} className={'sub-tab' + (si === ci ? ' on' : '')} onClick={() => setSi(ci)}>
            {c.cat} <span className="stc">{c.items.length}</span>
          </div>
        ))}
        <div className="sub-tab add" onClick={() => { const n = [...d, { cat: '새 카테고리', items: [] }]; setD(n); setSi(n.length - 1); }}>+</div>
      </div>
      {cur && (
        <div className="sub-pn">
          <div className="ci">
            <input value={cur.cat} onChange={e => { const n = [...d]; n[si] = { ...n[si], cat: e.target.value }; setD(n); }} placeholder="카테고리명" />
            <button className="cd" onClick={() => { const n = d.filter((_, i) => i !== si); setD(n); setSi(Math.min(si, n.length - 1)); }}>×</button>
          </div>
          {cur.items.map((item, ii) => (
            <div key={ii} className="ci">
              <input value={item} onChange={e => { const n = [...d]; n[si].items[ii] = e.target.value; setD(n); }} />
              <button className="cd" onClick={() => { const n = [...d]; n[si].items = n[si].items.filter((_, j) => j !== ii); setD(n); }}>×</button>
            </div>
          ))}
          <button className="btn bs2" style={{ marginTop: 8 }} onClick={() => { const n = [...d]; n[si].items.push(''); setD(n); }}>+ 항목 추가</button>
        </div>
      )}
      <button className="btn bp" style={{ marginTop: 12 }} onClick={() => onSave(d)}>저장</button>
    </div>
  );
}

// ── Main ProposalEditor ────────────────────────────────────────────────────

export default function ProposalEditor() {
  const searchParams = useSearchParams();
  const [cfg, setCfg] = useState<ProposalConfig>(DEF_CFG);
  const [showCfg, setShowCfg] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [result, setResult] = useState<{ url?: string } | null>(null);
  const [v, setV] = useState<Record<string, string>>({ 제출일: new Date().toISOString().slice(0, 10) });
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [photoSaved, setPhotoSaved] = useState<PhotoSavedStatus>({});
  const [photoPos, setPhotoPos] = useState<Record<string, { x: number; y: number }>>({});
  const [pv, setPv] = useState(2);
  const [mid, setMid] = useState('M01');
  const [page, setPage] = useState(0);
  const [renderAll, setRA] = useState(false);
  const [expertVals, setExpertVals] = useState<Record<string, string>>({});
  const [showP4, setShowP4] = useState(true);
  const pgRef = useRef<HTMLDivElement>(null);

  // ── 견적서→제안서 URL params 자동 채움 ──
  useEffect(() => {
    const address = searchParams.get('address');
    const manager = searchParams.get('manager');
    if (address) setV(p => ({ ...p, 주소: address }));
    if (manager) {
      const mgrName = manager.includes('팀장') ? manager : manager + ' 팀장';
      setV(p => ({ ...p, 담당자: mgrName }));
      const m = DEF_MGR.find(x => x.name === mgrName);
      if (m) setV(p => ({ ...p, 연락처: m.phone }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 견적서→제안서 localStorage 자동 채움 ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem('estToProposal');
      if (!raw) return;
      const d = JSON.parse(raw) as { timestamp?: number; customer?: string; method?: string; grandTotal?: number; manager?: string };
      if (Date.now() - (d.timestamp || 0) > 300000) return;
      if (d.customer) setV(p => ({ ...p, 주소: d.customer! }));
      if (d.method === '복합') setMid('M01');
      else if (d.method === '우레탄') setMid('M02');
      if (d.grandTotal) setV(p => ({ ...p, 가격_스탠다드: String(d.grandTotal) }));
      if (d.manager) {
        const mgrName = d.manager.includes('팀장') ? d.manager : d.manager + ' 팀장';
        setV(p => ({ ...p, 담당자: mgrName }));
        const m = DEF_MGR.find(x => x.name === mgrName);
        if (m) setV(p => ({ ...p, 연락처: m.phone }));
      }
      localStorage.removeItem('estToProposal');
    } catch (e) { console.error('견적서 데이터 로드 실패:', e); }
  }, []);

  // ── 제안서 임시저장 (localStorage, 2초 디바운스) ──
  const propAutoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (propAutoRef.current) clearTimeout(propAutoRef.current);
    propAutoRef.current = setTimeout(() => {
      try {
        const hasContent = v['주소'] || v['표지제목'] || v['증상'] || v['공법설명'];
        if (hasContent) {
          localStorage.setItem('proposal_autosave', JSON.stringify({ v, mid }));
          localStorage.setItem('proposal_autosave_time', String(Date.now()));
        }
      } catch { /* ignore storage errors */ }
    }, 2000);
    return () => { if (propAutoRef.current) clearTimeout(propAutoRef.current); };
  }, [v, mid]);

  // ── 제안서 임시저장 복구 ──
  useEffect(() => {
    try {
      if (localStorage.getItem('estToProposal')) return;
      const saved = localStorage.getItem('proposal_autosave');
      const savedTime = localStorage.getItem('proposal_autosave_time');
      if (saved && savedTime && (Date.now() - parseInt(savedTime)) < 3600000) {
        const p = JSON.parse(saved) as { v?: Record<string, string>; mid?: string };
        const hasContent = p.v && (p.v['주소'] || p.v['표지제목'] || p.v['증상']);
        if (hasContent && confirm('이전에 작성 중이던 제안서가 있습니다. 복구하시겠습니까?')) {
          if (p.v) setV(p.v);
          if (p.mid) setMid(p.mid);
        } else {
          localStorage.removeItem('proposal_autosave');
          localStorage.removeItem('proposal_autosave_time');
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sv = useCallback((k: string, val: string) => setV(p => ({ ...p, [k]: val })), []);
  const sp = useCallback((k: string, b64: string) => setPhotos(p => ({ ...p, [k]: b64 })), []);

  const acc = useCallback((field: keyof ProposalConfig, val: string, cat: string) => {
    const arr = cfg[field] as CatItems[];
    const u: CatItems[] = JSON.parse(JSON.stringify(arr));
    let found = false;
    for (let i = 0; i < u.length; i++) {
      if (u[i].cat === cat) { if (!u[i].items.includes(val)) u[i].items.push(val); found = true; break; }
    }
    if (!found) u.push({ cat, items: [val] });
    const n = { ...cfg, [field]: u };
    setCfg(n);
    fetch('/api/proposal/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n),
    }).catch(err => console.error('proposal/config save error:', err));
  }, [cfg]);

  const updateCfg = useCallback((k: keyof ProposalConfig, val: unknown) => {
    const n = { ...cfg, [k]: val };
    setCfg(n);
    fetch('/api/proposal/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n),
    }).catch(err => console.error('proposal/config save error:', err));
  }, [cfg]);

  const handlePhoto = useCallback((key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      resizeImg(ev.target?.result as string, 1200, res => {
        sp(key, res);
        // Also upload to Supabase Storage for persistence
        const blob = new Blob([f], { type: f.type });
        const formData = new FormData();
        formData.append('file', blob, f.name);
        fetch('/api/proposal/photo', { method: 'POST', body: formData })
          .then(r2 => r2.ok ? r2.json() : Promise.reject(r2.statusText))
          .catch(err => console.error('proposal/photo upload error:', err));
      });
    };
    r.readAsDataURL(f);
  }, [sp]);

  const mgr = cfg.mgr.find(m => m.name === v['담당자']) || cfg.mgr[0] || { name: '', phone: '' };
  const meth = MDB[mid];
  const addr = v['주소'] || '';
  const caseImgs = CASE_IMGS[mid] || [];

  const generate = useCallback(async () => {
    if (!addr) { alert('주소를 입력해주세요.'); return; }
    setGenLoading(true);
    setRA(true);
    await new Promise(r => setTimeout(r, 800));
    try {
      const container = pgRef.current;
      if (!container) return;
      const origS = container.style.cssText;
      container.style.cssText = 'width:595px;padding:0;gap:0;position:fixed;left:-9999px;top:0;z-index:-1;display:flex;flex-direction:column;align-items:stretch;';
      container.querySelectorAll<HTMLElement>('.sel-bar').forEach(el => { el.style.display = 'none'; });
      container.querySelectorAll<HTMLElement>('.page').forEach(p => { p.style.width = '595px'; p.style.maxWidth = '595px'; p.style.boxShadow = 'none'; });
      container.querySelectorAll<HTMLElement>('.pi').forEach(pi => { pi.style.fontSize = '11px'; });
      await new Promise(r => setTimeout(r, 500));

      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const { default: jspdf } = await import('jspdf');
      const pdf = new jspdf({ orientation: 'portrait', unit: 'px', format: [595, 842] });
      const pis = container.querySelectorAll<HTMLElement>('.pi');
      for (let i = 0; i < pis.length; i++) {
        const cv = await html2canvas(pis[i], { scale: 2, useCORS: true, backgroundColor: null, width: 595, height: 842 });
        const img = cv.toDataURL('image/jpeg', 0.92);
        if (i > 0) pdf.addPage([595, 842]);
        pdf.addImage(img, 'JPEG', 0, 0, 595, 842);
      }

      container.style.cssText = origS;
      container.querySelectorAll<HTMLElement>('.sel-bar').forEach(el => { el.style.display = ''; });
      container.querySelectorAll<HTMLElement>('.page').forEach(p => { p.style.width = ''; p.style.maxWidth = ''; p.style.boxShadow = ''; });
      container.querySelectorAll<HTMLElement>('.pi').forEach(pi => { pi.style.fontSize = ''; });
      setRA(false);

      const fn = '방수명가_제안서_' + addr + '_' + (v['제출일'] || '').replace(/[\.\-]/g, '');
      const pdfBase64 = pdf.output('datauristring');

      // API route로 Storage + Drive에 저장
      try {
        const res = await fetch('/api/proposal/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64, fileName: fn + '.pdf' }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('PDF 저장 실패:', errData);
        }
      } catch (saveErr) {
        console.error('PDF 저장 오류 (무시):', saveErr);
      }

      pdf.save(fn + '.pdf');
      setGenLoading(false);
      localStorage.removeItem('proposal_autosave');
      localStorage.removeItem('proposal_autosave_time');
    } catch (e) {
      setRA(false);
      setGenLoading(false);
      alert('PDF 생성 오류: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, [addr, v]);

  // ── Config load ──
  useEffect(() => {
    fetch('/api/proposal/config')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && Object.keys(d).length > 0) {
          setCfg(prev => ({ ...prev, ...d }));
        }
      })
      .catch(err => console.error('proposal/config load error:', err));
  }, []);

  const mgrOpts = [{ v: '', l: '선택' }, ...cfg.mgr.map(m => ({ v: m.name, l: m.name }))];
  const visPages = showP4 ? [0, 1, 2, 3, 4] : [0, 1, 2, 4];
  const curIdx = visPages.indexOf(page);
  const pn = ['커버', '진단+종합', '제안 솔루션', '가격+추천', '4대 원칙'];
  const prevPg = () => { if (curIdx > 0) setPage(visPages[curIdx - 1]); };
  const nextPg = () => { if (curIdx < visPages.length - 1) setPage(visPages[curIdx + 1]); };

  return (
    <div>
      {/* Top bar */}
      <div className="topbar">
        <div className="t">방수명가 제안서</div>
        <span className="pg">{curIdx + 1}/{visPages.length} {pn[page]}</span>
        <button className="tb-cfg" onClick={() => setShowCfg(true)}>설정</button>
        {page === 4 && <button className="tb-gen" onClick={generate}>PDF 생성</button>}
      </div>

      {/* Pages */}
      <div className="pages" ref={pgRef}>

        {/* P1: Cover */}
        {(page === 0 || renderAll) && (
          <>
            <div className="page"><div className="pi"><div className="p1">
              <div className="p1-bg">
                <img src={ASSETS.cover_texture} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement?.classList.add('p1-bg-fb'); }} />
                <div className="p1-bgo" />
              </div>
              <div className="p1-logo-wrap"><Logo /></div>
              <div className="p1-title">
                <div className="p1-t1">
                  <EF label="현장 주소" value={addr} onChange={val => sv('주소', val)} placeholder="주소 입력" />님을 위한
                </div>
                <div className="p1-t2">
                  <EF label="표지 제목" value={v['표지제목'] || '맞춤형 방수 솔루션 제안서'} onChange={val => sv('표지제목', val)} placeholder="제목 입력" multiline plain style={{ textAlign: 'left', display: 'block' }} />
                </div>
              </div>
              <div className="p1-info">
                <dt>현장 주소</dt><dd>{addr || '—'}</dd>
                <dt>제 출 일</dt><dd><EF label="제출일" value={v['제출일'] || ''} onChange={val => sv('제출일', val)} type="date" /></dd>
                <dt>담 당 자</dt><dd><EF label="담당자" value={v['담당자'] || ''} onChange={val => { sv('담당자', val); const m = cfg.mgr.find(x => x.name === val); if (m) sv('연락처', m.phone); }} type="select" options={mgrOpts} /></dd>
                <dt>연 락 처</dt><dd>{v['연락처'] || mgr.phone || '—'}</dd>
              </div>
              <div className="p1-bot">
                <div className="p1-company">
                  <div className="p1-bn">부성에이티</div>
                  <div className="p1-ba">서울특별시 서초구 신반포로45길 26, 동화빌딩 404호</div>
                </div>
                <div className="p1-bg2">
                  <div><dt>사업자등록번호</dt><dd>642-87-03286</dd></div>
                  <div><dt>대표번호</dt><dd>1551-3587</dd></div>
                  <div><dt>팩스번호</dt><dd>02-3012-3587</dd></div>
                  <div><dt>이메일</dt><dd>bsmgkorea@naver.com</dd></div>
                </div>
                <div className="p1-seal">
                  <img src={ASSETS.seal} alt="직인" onError={e => {
                    (e.target as HTMLImageElement).outerHTML = '<svg viewBox="0 0 56 56"><rect x="2" y="2" width="52" height="52" rx="4" fill="none" stroke="#a11d1f" stroke-width="2.5"/><text x="28" y="24" text-anchor="middle" fill="#a11d1f" font-size="11" font-weight="700">부성</text><text x="28" y="40" text-anchor="middle" fill="#a11d1f" font-size="11" font-weight="700">에이티</text></svg>';
                  }} />
                </div>
              </div>
            </div></div></div>
            <div className="sel-bar">
              <div className="sel-title">진단 사진 버전</div>
              <div className="sel-row">
                <div className={'sel-btn' + (pv === 2 ? ' on' : '')} onClick={() => setPv(2)}>사진 2장<span>A, B</span></div>
                <div className={'sel-btn' + (pv === 3 ? ' on' : '')} onClick={() => setPv(3)}>사진 3장<span>A, B, C</span></div>
              </div>
            </div>
          </>
        )}

        {/* P2: Diagnosis */}
        {(page === 1 || renderAll) && (
          <>
            <div className="page"><div className="pi"><div className="p2">
              <div className="p2-quote">
                <div className="p2-q1">
                  <img className="p2-qm-open" src={ASSETS.quote_open} alt="" />
                  <div className="p2-q1-txt">고객님의 소중한 자산인 <span className="p2-qb">{addr || '(주소)'}</span> 에 대한</div>
                  <img className="p2-qm-close" src={ASSETS.quote_close} alt="" style={{ transform: 'rotate(180deg)' }} />
                </div>
                <div className="p2-q2">정밀 진단 결과 및 그에 따른 최적의 기술 솔루션을 아래와 같이 제안합니다.</div>
              </div>
              <div className="p2-line" />
              <div className="st p2-sec">{addr || '(주소)'}의 정밀 진단 결과</div>
              <div className="p2-dg">
                {Array.from({ length: pv }).map((_, i) => {
                  const lb = 'ABC'[i];
                  const pk = 'PHOTO_' + lb;
                  const pos2 = pv === 2
                    ? [{ l: 0, w: 48.15 }, { l: 51.85, w: 48.15 }]
                    : [{ l: 0, w: 31.38 }, { l: 34.31, w: 31.38 }, { l: 68.62, w: 31.38 }];
                  return (
                    <div className="p2-dc" key={i} style={{ left: pos2[i].l + '%', width: pos2[i].w + '%' }}>
                      <div className="p2-dt">{lb}. <CC catData={cfg.dn} value={v['진단' + lb + '_위치'] || ''} onChange={val => sv('진단' + lb + '_위치', val)} onAcc={(val, cat) => acc('dn', val, cat)} label={'진단 ' + lb + ' 위치명'} /></div>
                      <div className="p2-dd" style={{ whiteSpace: 'pre-wrap' }}><CC catData={cfg.dd} value={v['진단' + lb + '_설명'] || ''} onChange={val => sv('진단' + lb + '_설명', val)} onAcc={(val, cat) => acc('dd', val, cat)} label={'진단 ' + lb + ' 설명'} /></div>
                      <PhotoSlot pk={pk} src={photos[pk]} pos={photoPos[pk]} onFile={e => handlePhoto(pk, e)} onPos={(k, p) => setPhotoPos(prev => ({ ...prev, [k]: p }))} saved={photoSaved[pk]} label={lb} />
                    </div>
                  );
                })}
              </div>
              <div className="p2-bot-bg" />
              <div className="st p2-bot-title">종합분석</div>
              <div className="p2-bot-body">
                <div className="p2-an">고객님의 소중한 자산인 <b>{addr || '(주소)'}</b>의 안정적인 유지를 위해 저희 방수명가에 진단을 의뢰해 주셨습니다. 현재 시급히 해결이 필요한 주요 문제는 다음과 같습니다.</div>
                <div className="p2-bb">
                  <div className="p2-bar" />
                  <div className="p2-bul"><MultiCC catData={cfg.problems || DEF_PROBLEMS} value={v['문제점_목록'] || ''} onChange={val => sv('문제점_목록', val)} onAcc={(val, cat) => acc('problems', val, cat)} label="문제점 선택/입력" /></div>
                </div>
                <div className="p2-an">이 문제는 겉으로 드러나는 현상에 그치지 않고, <b>여름철 폭우 및 겨울철 폭설로 인한 더 큰 누수 피해</b>로 이어질 수 있으므로 근본적인 해결이 필요합니다. 이에 저희 방수명가는, <b>{meth?.name}</b>을 최적의 해결책으로 제안합니다.</div>
                <div className="p2-bb">
                  <div className="p2-bar" />
                  <div className="p2-bul"><MultiCC catData={cfg.reasons || DEF_REASONS} value={v['선택이유_목록'] || ''} onChange={val => sv('선택이유_목록', val)} onAcc={(val, cat) => acc('reasons', val, cat)} label="선택이유 선택/입력" /></div>
                </div>
                <div className="p2-an">이후 페이지를 통해 저희의 제안과 그 이유를 더욱 자세히 확인하실 수 있습니다.</div>
              </div>
            </div></div></div>
            <div className="sel-bar">
              <div className="sel-title">공법 선택 (1개)</div>
              <div className="sel-row">
                {DEF_METH.map(m => (
                  <div key={m.id} className={'sel-btn' + (mid === m.id ? ' on' : '')} onClick={() => setMid(m.id)}>
                    {m.name}<span>{m.loc}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* P3: Solution */}
        {(page === 2 || renderAll) && meth && (
          <>
            <div className="page"><div className="pi"><div className="p3">
              <div className="st p3-sec">제안 솔루션</div>
              <div className="p3-tbl-wrap">
                <table className="p3-tbl"><tbody>
                  <tr><th>적용 공법</th><td className="p3-mn">{meth.name}</td></tr>
                  <tr><th>공법 특징</th><td>{meth.feat.map((f, i) => <div key={i} style={{ marginBottom: i < meth.feat.length - 1 ? 4 : 0 }} dangerouslySetInnerHTML={{ __html: '- ' + f }} />)}</td></tr>
                  <tr><th>주요 자재</th><td>{meth.mat}</td></tr>
                  <tr><th>시공 과정</th><td>{meth.proc}</td></tr>
                </tbody></table>
              </div>
              <div className="st p3-sec2">{meth.lt}</div>
              <div className="p3-cases">
                {meth.cases.map((c, i) => (
                  <div className="p3-c" key={i}>
                    <div className="p3-ci">{caseImgs[i] ? <img src={caseImgs[i]} alt={c} /> : <span>사진</span>}</div>
                    <div className="p3-cl">{c}</div>
                  </div>
                ))}
              </div>
              <div className="p3-bot-bg" />
              <div className="st p3-bot-title">기대 효과</div>
              <div className="p3-eff">{meth.eff.map((ef, i) => <p key={i}><b>{i + 1}. {ef.t}</b> : {ef.d}</p>)}</div>
            </div></div></div>
            <div className="sel-bar">
              <div className="sel-title">페이지 구성</div>
              <div className="sel-row">
                <div className={'sel-btn' + (showP4 ? ' on' : '')} onClick={() => setShowP4(!showP4)}>
                  가격표 페이지<span>{showP4 ? '포함' : '미포함'}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* P4: Pricing */}
        {showP4 && (page === 3 || renderAll) && (
          <div className="page"><div className="pi"><div className="p4">
            <div className="p4-bot-bg" />
            <div className="st p4-title">맞춤형 솔루션 제안</div>
            <div className="p4-desc">모든 플랜은 KS 인증 정품 자재와 표준 시방서를 준수하여 시공됩니다.<br />플랜 차이는 품질의 차이가 아닌, 방수 시스템의 방식과 고객님께 제공되는 추가적인 편의 및 혜택의 차이입니다.</div>
            {['베이직', '스탠다드', '프리미엄'].map((nm, ci) => {
              const cls = ['p4-hdr-basic', 'p4-hdr-std', 'p4-hdr-prem'][ci];
              const ks = ['가격_베이직', '가격_스탠다드', '가격_프리미엄'];
              return (
                <div className={'p4-hdr ' + cls} key={ci}>
                  {ci === 1 && (
                    <>
                      <div className="p4-pbg">추천</div>
                      <div className="p4-std-accent"><img src={ASSETS.std_accent} alt="" /></div>
                    </>
                  )}
                  <div className="p4-pn">{nm}</div>
                  <div className="p4-pdv" />
                  <div className="p4-pp">
                    <span className="p4-ppl">총 금액</span>
                    <span className="p4-ppv">
                      <EF label={nm + ' 가격'} value={v[ks[ci]] || ''} onChange={val => sv(ks[ci], val)} placeholder={['800,000', '1,200,000', '1,600,000'][ci]} type="number" />원
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="p4-col-bg lbl-bg" />
            <div className="p4-col-bg basic-bg" />
            <div className="p4-col-bg std-bg" />
            <div className="p4-col-bg prem-bg" />
            <div className="p4-grid">
              {P4_LINES.map((y, i) => P4_COLS.map((c, j) => (
                <div key={'ln' + i + j} className={'p4-ln' + (j === 0 ? ' p4-ln-d' : '')} style={{ top: y + '%', left: c.l, width: c.w }} />
              )))}
              {P4_GC.map((c, i) => {
                const r = P4_ROWS[c.row];
                const col = P4_COLS[c.col];
                return (
                  <div key={'gc' + i} className={'p4-cell' + (c.isLabel ? ' lbl' : '')} style={{ top: r.t + '%', height: r.h + '%', left: col.l, width: col.w }} dangerouslySetInnerHTML={{ __html: c.content }} />
                );
              })}
            </div>
            <div className="p4-note">* 같이 보내드린 견적서에서 상세 견적을 확인하실 수 있습니다.</div>
            <div className="st p4-expert-title">전문가 추천 의견</div>
            <div className="p4-expert-body">
              <ExpertEditor tpl={cfg.expertTpl || DEF_EXPERT_TPL} vars={cfg.expertVars || DEF_EXPERT_VARS} values={expertVals} onChange={setExpertVals} />
            </div>
          </div></div></div>
        )}

        {/* P5: Principles */}
        {(page === 4 || renderAll) && (
          <div className="page"><div className="pi"><div className="p5">
            <div className="p5-t">고객님의 자산을 위한 <em>방수명가</em>의 4대 원칙과 약속</div>
            <div className="p5-ln" />
            <div className="p5-row1">
              <div className="p5-col-l"><div className="p5-pt">{P5P[0].t}</div><div className="p5-pd">{P5P[0].d}</div></div>
              <div className="p5-col-r"><div className="p5-pt">{P5P[1].t}</div><div className="p5-pd">{P5P[1].d}</div></div>
            </div>
            <div className="p5-row2">
              <div className="p5-col-l"><div className="p5-pt">{P5P[2].t}</div><div className="p5-pd">{P5P[2].d}</div></div>
              <div className="p5-col-r"><div className="p5-pt">{P5P[3].t}</div><div className="p5-pd">{P5P[3].d}</div></div>
            </div>
            <div className="p5-bt">대한민국 대표 브랜드들이 신뢰하는 기술력</div>
            <div className="p5-brands">
              {BRANDS.map((b, i) => (
                <div className="p5-br" key={i}>
                  {b.img ? <img src={b.img} alt={b.name} onError={e => { (e.target as HTMLImageElement).outerHTML = `<span style="font-size:7px;font-weight:700;color:#333">${b.name}</span>`; }} /> : <span>{b.name}</span>}
                </div>
              ))}
            </div>
            <div className="p5-ft"><Logo white /></div>
          </div></div></div>
        )}

      </div>

      {/* Bottom nav */}
      <div className="botnav">
        {curIdx > 0 && <button className="bn-prev" onClick={prevPg}>← 이전</button>}
        {curIdx < visPages.length - 1 && <button className="bn-next" onClick={nextPg}>다음 →</button>}
        {curIdx === visPages.length - 1 && <button className="bn-next" onClick={generate}>PDF 생성</button>}
      </div>

      {/* Loading overlay */}
      {genLoading && (
        <div className="gen-ld">
          <div className="spin" />
          <div style={{ color: '#fff', fontSize: 14 }}>PDF 생성 중...</div>
        </div>
      )}

      {/* Result overlay */}
      {result && (
        <div className="res-ov">
          <div className="res-bx">
            <h3>생성 완료</h3>
            {result.url && <a href={result.url} className="rp" target="_blank" rel="noreferrer">PDF 열기</a>}
            <div className="rc" onClick={() => setResult(null)}>닫기</div>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showCfg && <Settings cfg={cfg} onUpdate={updateCfg} onClose={() => setShowCfg(false)} />}
    </div>
  );
}
