import { NextResponse } from 'next/server';
import { getPageComments, addComment } from '@/lib/supabase/crm';

/**
 * GET /api/crm/[id]/comments
 * 페이지 댓글 조회
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await getPageComments(params.id);
    return NextResponse.json(comments);
  } catch (err) {
    console.error('댓글 조회 실패:', err);
    return NextResponse.json({ error: '댓글 조회 실패' }, { status: 500 });
  }
}

/**
 * POST /api/crm/[id]/comments
 * 댓글 추가
 * Body: { content: string }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json()) as { content?: string };

    if (!body.content) {
      return NextResponse.json({ error: 'content 필드 필요' }, { status: 400 });
    }

    const comment = await addComment(params.id, body.content);
    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.error('댓글 추가 실패:', err);
    return NextResponse.json({ error: '댓글 추가 실패' }, { status: 500 });
  }
}
