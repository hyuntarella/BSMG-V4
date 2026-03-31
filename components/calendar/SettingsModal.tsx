'use client';

import { useState, useEffect } from 'react';

interface Member {
  id: string;
  name: string;
  color: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'members' | 'types';

const EVENT_TYPES_DISPLAY = [
  { name: '방문', color: '#3B82F6' },
  { name: '시공', color: '#10B981' },
  { name: '미팅', color: '#8B5CF6' },
  { name: '기타', color: '#6B7280' },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [adding, setAdding] = useState(false);

  // 모달 열릴 때 멤버 로드
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/calendar/members')
      .then((r) => r.json())
      .then((data) => setMembers(data.members ?? []))
      .catch((err) => console.error('[SettingsModal] 멤버 로드 오류:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  async function handleAddMember() {
    if (!newMemberName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/calendar/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMemberName.trim() }),
      });
      if (!res.ok) throw new Error('추가 실패');
      const data = await res.json();
      setMembers((prev) => [...prev, data.member]);
      setNewMemberName('');
    } catch (err) {
      console.error('[SettingsModal] 멤버 추가 오류:', err);
      alert('팀원 추가에 실패했습니다. Notion MEMBER_DB 설정을 확인하세요.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteMember(id: string) {
    if (!confirm('이 팀원을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/calendar/members/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('[SettingsModal] 멤버 삭제 오류:', err);
      alert('팀원 삭제에 실패했습니다.');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">캘린더 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200 px-5">
          {(['members', 'types'] as SettingsTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'members' ? '팀원 관리' : '이벤트 타입'}
            </button>
          ))}
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'members' && (
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-gray-400">불러오는 중...</p>
              ) : members.length === 0 ? (
                <p className="text-sm text-gray-400">
                  등록된 팀원이 없습니다.
                  {!process.env.NOTION_CALENDAR_MEMBER_DB && (
                    <span className="block mt-1 text-xs">
                      (NOTION_CALENDAR_MEMBER_DB 환경변수를 설정하면 Notion에서 관리됩니다)
                    </span>
                  )}
                </p>
              ) : (
                <ul className="space-y-2">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-2 border-b border-gray-100">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: m.color }}
                      />
                      <span className="flex-1 text-sm text-gray-800">{m.name}</span>
                      <button
                        onClick={() => handleDeleteMember(m.id)}
                        className="text-gray-400 hover:text-red-500 text-lg leading-none"
                        aria-label="삭제"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* 팀원 추가 */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                  placeholder="팀원 이름"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
                <button
                  onClick={handleAddMember}
                  disabled={adding || !newMemberName.trim()}
                  className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {adding ? '추가 중...' : '추가'}
                </button>
              </div>
            </div>
          )}

          {tab === 'types' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-3">
                이벤트 타입은 Notion에서 직접 관리됩니다.
              </p>
              {EVENT_TYPES_DISPLAY.map((t) => (
                <div key={t.name} className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-sm text-gray-800">{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 닫기 */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
