#!/usr/bin/env node
// verification-gate.js — Stop hook
// Verification Protocol v2 §6 enforcement:
//   - When assistant final message contains completion language,
//     require a <verification> block with valid evidence.
//   - If missing/invalid, block the "완료" and ask for correction.
//
// Design notes:
//   - Stop hook receives {transcript_path, session_id, ...} on stdin.
//   - We read the last assistant turn from the transcript JSONL and inspect it.
//   - On violation: exit 2 with message on stderr (blocks & feeds back to Claude).
//   - On pass or irrelevant turn: exit 0.
//   - Fail-open: any internal error → exit 0 (don't brick the session).

const fs = require('fs');
const path = require('path');

// ---------- Completion language detection ----------
// Trigger phrases that claim a task is done.
// If any of these appear in the final message, <verification> must be present.
const COMPLETION_PATTERNS = [
  /완료했습니다/, /완료됐습니다/, /완성했습니다/, /완성됐습니다/,
  /작업이? 끝났습니다/, /다 됐습니다/, /마쳤습니다/,
  /\bdone\b/i, /\bcomplete\b/i, /\bfinished\b/i, /\bimplemented\b/i,
];

// Phrases that indicate legitimate §5 stop — NOT completion.
const LEGITIMATE_STOP_PATTERNS = [
  /검증 불가 지점/,
  /사용자 확인 필요/,
];

// ---------- Main ----------
let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const transcriptPath = data.transcript_path;
    const cwd = data.cwd || process.cwd();

    if (!transcriptPath || !fs.existsSync(transcriptPath)) {
      process.exit(0);
    }

    const lastAssistant = readLastAssistantMessage(transcriptPath);
    if (!lastAssistant) process.exit(0);

    // Skip if this turn is a legitimate §5 stop
    if (LEGITIMATE_STOP_PATTERNS.some(p => p.test(lastAssistant))) {
      process.exit(0);
    }

    // Skip if no completion claim
    const claimsCompletion = COMPLETION_PATTERNS.some(p => p.test(lastAssistant));
    if (!claimsCompletion) process.exit(0);

    // Completion claimed → require verification block
    const block = extractVerificationBlock(lastAssistant);
    if (!block) {
      return blockWithMessage(
        '완료를 주장했으나 <verification> 블록이 없음.\n' +
        'Verification Protocol §6 위반. 다음 중 하나:\n' +
        '  (a) §6.1(Micro) 또는 §6.2(Small/Standard) 형식으로 블록 추가\n' +
        '  (b) 실제 완료되지 않았다면 §5 "검증 불가 지점"으로 전환'
      );
    }

    const violations = validateBlock(block, cwd);
    if (violations.length > 0) {
      return blockWithMessage(
        '완료 블록에 문제 발견:\n' +
        violations.map(v => `  - ${v}`).join('\n') +
        '\n블록을 수정하거나 §5 검증 불가 지점으로 전환.'
      );
    }

    process.exit(0);
  } catch (e) {
    // Fail open
    process.exit(0);
  }
});

// ---------- Helpers ----------

function readLastAssistantMessage(transcriptPath) {
  const raw = fs.readFileSync(transcriptPath, 'utf8');
  const lines = raw.trim().split('\n').reverse();
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'assistant' || entry.role === 'assistant') {
        const content = entry.message?.content || entry.content || '';
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
          return content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('\n');
        }
      }
    } catch (_) { /* skip malformed line */ }
  }
  return null;
}

function extractVerificationBlock(text) {
  const m = text.match(/<verification>([\s\S]*?)<\/verification>/);
  return m ? m[1] : null;
}

function validateBlock(block, cwd) {
  const violations = [];

  // 1. Unchecked items
  if (/- \[ \]/.test(block)) {
    violations.push(
      '체크리스트에 미해결 항목 `[ ]`이 남아 있음. ' +
      '해결하거나 §5로 전환.'
    );
  }

  // 2. Check evidence paths exist
  // Cover: "증거/evidence/path/diff: path.ext:lines" prefix form,
  //        and "- path.ext:lines" list items under diff_files/evidence/files.
  const patterns = [
    /(?:증거|evidence|path|diff)\s*:\s*([^\s`:,]+\.[a-zA-Z0-9]{1,10})(?::(\d+)(?:-(\d+))?)?/g,
    /^\s*-\s*([^\s`:,]+\.[a-zA-Z0-9]{1,10})(?::(\d+)(?:-(\d+))?)?/gm,
  ];
  const checkedPaths = new Set();
  for (const re of patterns) {
    let match;
    while ((match = re.exec(block)) !== null) {
      const relPath = match[1];
      if (checkedPaths.has(relPath)) continue;
      checkedPaths.add(relPath);

      const absPath = path.isAbsolute(relPath) ? relPath : path.join(cwd, relPath);
      if (!fs.existsSync(absPath)) {
        violations.push(`증거 경로 존재하지 않음: ${relPath}`);
      }
    }
  }

  // 3. "모두 확신" self_doubt 금지 (§6.2)
  if (/self_doubt\s*:\s*\[?\s*(모두 확신|없음|없다|\bnone\b|\bn\/a\b)/i.test(block)) {
    violations.push(
      'self_doubt 필드가 "모두 확신"/"없음" 등으로 채워짐. ' +
      '프로토콜 §6.2 금지. 가장 확신 못 하는 항목 1개 이상 명시 필요.'
    );
  }

  // 4. build/tests 필드에 서술문 금지 (§3.1)
  // "exit 0", "exit N", "pass N/M", "N/A + 이유" 등만 허용
  const selfReportPatterns = [
    /build\s*:\s*(빌드 통과|통과했습니다|돌렸습니다|ok|OK|완료)/,
    /tests?\s*:\s*(테스트 통과|다 통과|돌려봤어요|완료)/,
  ];
  for (const p of selfReportPatterns) {
    if (p.test(block)) {
      violations.push(
        '증거 필드에 자기 보고 문자열 사용 (§3.1 위반). ' +
        'exit code 또는 실제 출력 포함 필요.'
      );
      break;
    }
  }

  return violations;
}

function blockWithMessage(msg) {
  // Exit 2 with stderr = block + feedback to Claude
  process.stderr.write(msg);
  process.exit(2);
}
