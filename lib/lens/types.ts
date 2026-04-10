// ── Lens 연동 타입 정의 ──

export interface QuoteInput {
  quoteId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  siteAddress: string;
  buildingType?: string;
  visitDate: string;
  salesPersonId: string;
  salesPersonName: string;
  areaM2: number;
  areaPyeong?: number;
  notes?: string;
}

export interface QuoteOutput {
  quoteId: string;
  compositeDocumentUrl: string;
  compositeDocumentHash: string;
  compositeTotalAmount: number;
  compositeVatAmount: number;
  compositeGrandTotal: number;
  compositePricePerM2: number;
  urethaneDocumentUrl: string;
  urethaneDocumentHash: string;
  urethaneTotalAmount: number;
  urethaneVatAmount: number;
  urethaneGrandTotal: number;
  urethanePricePerM2: number;
  generatedAt: string;
  inputMode: 'voice' | 'form';
  rawTranscript?: string;
  jsonUrl: string;
  excelUrl: string;
}

export interface VoiceParseResult {
  transcript: string;
  confidence: number;
  parsed: Partial<QuoteInput>;
  unparsedFields: string[];
  needsConfirmation: boolean;
}
