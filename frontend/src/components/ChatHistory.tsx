import React, { useState } from 'react';
import { ConversationMeta } from '../types/chat';
import { UIText } from '../utils/i18n';

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  t: UIText;
}

const isToday = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

const isYesterday = (ts: number) => {
  const d = new Date(ts);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate();
};

const ChatHistory: React.FC<ChatHistoryProps> = ({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  t,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const todayItems: ConversationMeta[] = [];
  const yesterdayItems: ConversationMeta[] = [];
  const olderItems: ConversationMeta[] = [];

  for (const c of conversations) {
    if (isToday(c.updatedAt)) todayItems.push(c);
    else if (isYesterday(c.updatedAt)) yesterdayItems.push(c);
    else olderItems.push(c);
  }

  const handleSelect = (id: string) => {
    onSelect(id);
  };

  const handleNew = () => {
    onNew();
  };

  const renderGroup = (label: string, items: ConversationMeta[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-3">
        <p className="px-3 py-1.5 text-[10px] font-semibold text-white/25 uppercase tracking-widest">
          {label}
        </p>
        {items.map(c => {
          const isActive = c.id === activeId;
          return (
            <div
              key={c.id}
              className={`group/item relative flex items-center gap-2 px-3 py-2.5 mx-1.5 rounded-lg cursor-pointer transition-colors duration-150 ${
                isActive
                  ? 'bg-violet-500/[0.12] text-white/85'
                  : 'text-white/55 hover:bg-white/[0.05] hover:text-white/75'
              }`}
              onClick={() => handleSelect(c.id)}
            >
              <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-violet-400/60' : 'text-white/20'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
              </svg>
              <span className="flex-1 min-w-0 text-[13px] truncate leading-tight">
                {c.title || t.untitledChat}
              </span>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDeleteId(c.id); }}
                className="opacity-100 md:opacity-0 md:group-hover/item:opacity-100 flex-shrink-0 p-1 text-white/20 hover:text-red-400 transition-all duration-150 cursor-pointer rounded hover:bg-white/[0.05]"
                aria-label="Delete"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
    {/* Mobile backdrop */}
    <div
      className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    />
    <div
      className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] md:relative md:inset-auto md:z-auto md:w-72 h-full flex flex-col flex-shrink-0"
      style={{
        background: 'rgba(14,14,24,0.96)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[58px] flex-shrink-0 border-b border-white/[0.06]">
        <span className="text-[14px] font-semibold text-white/70">{t.chatHistory}</span>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* New chat button */}
      <div className="px-3 py-3 flex-shrink-0">
        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium text-white/70 hover:text-white/90 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl border border-white/[0.08] border-dashed hover:border-violet-500/30 transition-all duration-200 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          {t.newChat}
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto pb-4">
        {conversations.length === 0 ? (
          <p className="px-4 py-8 text-[12px] text-white/20 text-center">{t.untitledChat}</p>
        ) : (
          <>
            {renderGroup(t.today, todayItems)}
            {renderGroup(t.yesterday, yesterdayItems)}
            {renderGroup(t.older, olderItems)}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-[calc(100%-2rem)] max-w-80 rounded-2xl border border-white/[0.08] p-6"
            style={{ background: 'rgba(18,18,30,0.97)', boxShadow: '0 24px 64px rgba(0,0,0,0.55)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-semibold text-white/85 mb-2">{t.confirmDeleteTitle}</h3>
            <p className="text-[13px] text-white/50 leading-relaxed mb-5">{t.confirmDeleteMessage}</p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-[13px] font-medium text-white/50 hover:text-white/80 bg-white/[0.05] hover:bg-white/[0.10] rounded-xl border border-white/[0.08] transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
                className="px-4 py-2 text-[13px] font-medium text-red-300 hover:text-red-200 bg-red-500/15 hover:bg-red-500/25 rounded-xl border border-red-500/20 transition-colors cursor-pointer"
              >
                {t.deleteChat}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default ChatHistory;
