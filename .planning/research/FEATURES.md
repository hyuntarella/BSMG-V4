# Feature Landscape

**Domain:** Voice-first construction estimate tool (field service, single-operator, in-vehicle use)
**Researched:** 2026-03-30
**Overall confidence:** HIGH (voice UX patterns), MEDIUM (construction estimate specifics)

---

## Context: What This Is Actually Competing With

This is not a generic invoice app. It is a specialized field tool for a single waterproofing contractor who drives to job sites and dictates estimates hands-free. The real competitors are:

1. The user's own v1/v2/v3 GAS system (the actual baseline)
2. Generic construction estimate apps (Buildern, ConstructionOnline, Houzz Pro)
3. Voice note + manual entry workflow (what the user does when the app breaks)

The bar is not "feature parity with Procore." The bar is "reliably better than talking to yourself in the car and typing it up later."

---

## Table Stakes

Features where absence causes the user to abandon the tool or revert to the old system.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Voice input that reliably captures numeric data | Core proposition. If area/price input fails, nothing else matters | High | STT + LLM pipeline exists but parse→UI connection is broken |
| Estimate table reflects spoken values immediately | User needs to see what was heard; mismatch = distrust of entire system | High | Currently broken — the #1 fix |
| Inline cell editing (touch fallback) | Voice misrecognizes ~10-25% in vehicle; touch correction must work | Medium | Currently broken |
| TTS confirmation after every voice command | Voice output disappears; audible feedback is the only way user knows command landed | Medium | Exists but inconsistently wired |
| Undo (voice and touch) | Users make mistakes. No undo = fear of using voice commands | Medium | Snapshot system exists, undo command exists, needs wiring |
| Line-item table: qty, mat, labor, exp, total | Industry standard layout. Users trained on Excel format; deviation causes friction | Low | Implemented via buildItems |
| Grand total with overhead + profit calculation | Table stakes for any estimate tool. Korean construction: 잡비 3% + 이윤 6% + 절사 | Low | calc() exists |
| Save to persistent storage | Data loss on browser close = unusable | Medium | useAutoSave exists, needs reliability testing |
| Excel output (.xlsx) | Clients and internal records require Excel. Non-negotiable for Korean construction | High | ExcelJS route exists, untested |
| Load/resume previous estimate | Field use means interrupted sessions. Must resume where left off | Medium | Not yet implemented |
| Visual state indicator for voice (listening/processing/idle) | Users in a car cannot look at screen while speaking. Color/animation indicates mode | Low | VoiceBar exists, reliability uncertain |
| Error recovery without full restart | If voice fails, the session must survive. No full-page reload to recover | Medium | Try-catch exists, needs graceful fallback |

---

## Differentiators

Features the competition does not have that create real advantage for this specific use case.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| P-matrix auto-pricing | Speak area + method → unit costs auto-interpolated from price matrix. No manual price lookup | High | buildItems + priceData exists. Core differentiator vs manual estimate tools |
| Multi-field parsing in single utterance | "복합방수 150헤베 사다리차 이틀" parsed atomically. Competitors require field-by-field | High | parseAllFields() exists in voiceFlow |
| 3-level confidence routing | 95%+ = silent execute. 70-95% = execute + confirm. <70% = clarify. Prevents silent errors | Medium | confidenceRouter exists, needs end-to-end wiring |
| Context carryover (last 3 commands) | "인건비도 200원 올려" resolves target from prior command. True conversational editing | High | recentCommandsRef exists in useVoice, needs LLM prompt use |
| Hardware button recording trigger | Volume button or Bluetooth remote activates recording. Zero screen touch needed in vehicle | Low | keydown listener documented in CLAUDE.md, needs implementation |
| Voice-triggered bulk adjustments | "재료비 전체 10% 올려" — batch edits via single utterance. No equivalent in generic tools | Medium | bulk_adjust command defined, needs executor implementation |
| Grand total reverse-calculation | "총액 600만원으로 맞춰줘" — back-calculates price_per_pyeong from target total | High | set_grand_total + findPriceForMargin() defined, complex |
| Margin gauge with voice query | "마진 얼마야?" answered via TTS. Real-time margin always visible | Low | MarginGauge component, read_margin command |
| Korean number TTS normalization | 3,900,000 → "삼백구십만원". Competitors use digit-by-digit TTS or English patterns | Low | numberToKorean util exists |
| CRM → estimate auto-fill | Select customer from Notion CRM → site name, address, contact pre-populated | Medium | Notion API env set, code not yet built |
| Estimate version comparison (복합 vs 우레탄) | Two method variants shown side-by-side with cost and margin delta | Medium | CompareSheet component exists |
| Wake word activation ("견적"/"시작") | Completely hands-free session start while driving. No app competitors offer this for Korean | Medium | useWakeWord hook exists |

---

## Anti-Features

Things to deliberately NOT build in this milestone. Each has a specific reason.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Email auto-send from app | Out of scope per PROJECT.md. Adds Resend complexity, client confirmation risk | Manual: download Excel, send from phone |
| Full CRM replacement (move Notion to Supabase) | CRM is used in GAS sidebar too. Dual management is worse | Read-only from Notion API, no write |
| Customer-facing portal | Requires separate auth flow, RLS rework, UI for different user type | Not until SaaS phase |
| Multi-user realtime editing | Supabase Realtime adds websocket complexity. Single operator tool | Last-write-wins with debounce is sufficient |
| Custom wake word ("방수명가") via Picovoice | Picovoice requires model training + SDK integration. Out of scope | Use Web Speech API keyword detection for "견적"/"시작" |
| VAD (voice activity detection) auto-stop | User memory notes explicitly: VAD 금지. 7-second silence is acceptable | Manual button-to-stop or hardware button |
| Complex permission hierarchy (admin/sales/customer) | One user, one company right now. RLS by company_id is sufficient | Add roles only at SaaS phase |
| PDF generation | Adds puppeteer/react-pdf complexity, rarely needed before Excel | Excel first; PDF is Phase 5+ |
| Offline mode / service worker caching | Adds significant complexity. Vehicle use has phone data coverage | Require network connection; show connectivity error if offline |
| AI-generated proposal text | Separate product. Estimate ≠ proposal | Separate project per PROJECT.md Out of Scope |
| Drag-and-drop item reorder | Complex touch interaction on tablet. Voice reorder ("바탕정리를 세번째로") is sufficient | Voice reorder command; optional touch later |

---

## Feature Dependencies

Dependencies determine sequencing. Items higher in the chain must work before lower items make sense.

```
P-matrix data (DB seed, done)
  └── buildItems() (exists)
        └── Estimate state (useEstimate, exists)
              ├── Estimate table UI (WorkSheet, exists but broken display)
              │     └── Inline cell editing (InlineCell, broken)
              │           └── Auto-save (useAutoSave, needs test)
              │                 └── Load/resume (not built)
              └── Voice parse → state update (BROKEN — top priority)
                    ├── TTS confirmation (intermittent)
                    ├── 3-level confidence routing (partially wired)
                    ├── Context carryover (not wired to LLM)
                    ├── Undo (snapshot system exists, voice command not wired)
                    └── Bulk adjustments / reverse-calc (executors exist, need wiring)

Voice activation
  ├── Hardware button trigger (not implemented)
  └── Wake word (useWakeWord exists, reliability unknown)

CRM (Notion API)
  └── Customer auto-fill on new estimate (not built)
        └── Estimate list page (not built)
```

**Critical path:** Parse → State → Table display → Cell editing → Save. Everything else is blocked by this chain being broken.

---

## MVP Recommendation

The current milestone is a fixing milestone, not a features milestone. The breakdown of priority is:

**Must fix first (broken table stakes):**
1. Parsed voice data reflects in estimate table immediately
2. Voice command system (시작/마디/종료) reliably controls flow
3. Inline cell editing (tap cell → edit number → recalculate)
4. Auto-save to Supabase (debounced upsert)
5. TTS feedback after every voice command

**Build second (missing table stakes):**
6. Load/resume existing estimate
7. Excel download (ExcelJS route, test end-to-end)
8. Estimate list page

**Build third (differentiators that improve daily use immediately):**
9. Hardware button recording (low complexity, high value in-vehicle)
10. Context carryover (recentCommandsRef → LLM prompt)
11. 3-level confidence routing end-to-end
12. CRM → estimate auto-fill (Notion API read)

**Defer:**
- Comparison tab (복합 vs 우레탄): UI exists; wire after core is stable
- Wake word: works but unreliable; polish after core is solid
- Margin gauge voice query: low priority feature on broken foundation
- Bulk adjust / reverse-calc: defined but untested; build after simpler commands work

---

## Phase-Specific Notes for Roadmap

**Phase addressing broken core (highest priority):**
Pitfall: developers add new features while core data flow is broken. Every new feature built on a broken voice→state pipeline will also be broken. The entire milestone should be: make the data flow from voice to table to save work reliably before any new feature is added.

**Phase addressing UX polish:**
Confidence routing, context carryover, and hardware button are the differentiators that make this meaningfully better than the v3 system. They should come immediately after the core is stable, not at the end.

**Phase addressing CRM and output:**
Excel export and CRM read are the two features that connect this to the user's actual daily workflow (drive to site → make estimate → send Excel to client). These complete the loop.

---

## Sources

- VUI design principles: [Voice User Interface (VUI) Design Principles: Guide (2026)](https://www.parallelhq.com/blog/voice-user-interface-vui-design-principles)
- Construction estimate software features: [6 Best Construction Estimate and Invoice Software Tools](https://buildops.com/resources/construction-estimate-and-invoice-software/)
- Voice AI error recovery: [Common Voice AI Agent Challenges and How to Fix Them](https://www.beconversive.com/blog/voice-ai-challenges)
- Invoice tool table stakes: [Top 5 best invoice and estimate software 2026](https://www.method.me/blog/invoice-and-estimate-software/)
- Inline editing UX pattern: [The Inline Edit Design Pattern](https://medium.com/nextux/the-inline-edit-design-pattern-e6d46c933804)
- Construction CRM features: [Field Service CRM Software: Features, FAQs, and Benefits](https://buildops.com/resources/field-service-crm-software/)
- Voice UI confidence/fallback: [10 UX Design Patterns That Improve AI Accuracy and Customer Trust](https://www.cmswire.com/digital-experience/10-ux-design-patterns-that-improve-ai-accuracy-and-customer-trust/)
- Wake word technology: [Wake Word Detection Guide 2026](https://picovoice.ai/blog/complete-guide-to-wake-word/)
