'use client';

import { useEffect, useState } from 'react';
import type { CrmComment } from '@/lib/notion/types';

// ── CommentSection ──

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}초 전`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

interface CommentSectionProps {
  pageId: string;
}

export default function CommentSection({ pageId }: CommentSectionProps) {
  const [comments, setComments] = useState<CrmComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/crm/${pageId}/comments`)
      .then((r) => r.json())
      .then((data: CrmComment[]) => {
        if (!cancelled) {
          setComments(data.slice().sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()));
        }
      })
      .catch(() => {/* ignore */})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pageId]);

  const handleSubmit = async () => {
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/${pageId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft.trim() }),
      });
      if (res.ok) {
        const newComment: CrmComment = await res.json();
        setComments((prev) => [newComment, ...prev]);
        setDraft('');
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 댓글 입력 */}
      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder="댓글을 입력하세요..."
          rows={2}
          className="flex-1 resize-none rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
        />
        <button
          onClick={handleSubmit}
          disabled={!draft.trim() || submitting}
          className="self-end rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          전송
        </button>
      </div>

      {/* 댓글 목록 */}
      {loading ? (
        <p className="text-xs text-gray-400">로딩 중...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400">댓글이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md bg-gray-50 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-700">{c.createdBy ?? '익명'}</span>
                <span className="text-xs text-gray-400">{timeAgo(c.createdTime)}</span>
              </div>
              <p className="mt-0.5 text-sm text-gray-800 whitespace-pre-wrap">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
