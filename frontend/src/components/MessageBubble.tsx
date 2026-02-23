import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getT } from '../utils/i18n';

export type BubbleStatus = 'idle' | 'pending' | 'translating' | 'streaming' | 'complete';

interface MessageBubbleProps {
  role: 'user' | 'ai';
  content: string;
  status: BubbleStatus;
  sourceLanguage: string;
  variant?: 'default' | 'processing';
}

// Sparkle icon — signals AI role, no emoji
const SparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684z" />
  </svg>
);

const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  status,
  sourceLanguage,
  variant = 'default',
}) => {
  const isUser       = role === 'user';
  const isProcessing = variant === 'processing';
  const t            = getT(sourceLanguage);

  if (status === 'idle') return null;

  // ── AI indicator badge (shared between states) ───────────────────
  const AIBadge = (
    <div
      className={`flex-shrink-0 mt-[2px] w-[18px] h-[18px] rounded-[5px] flex items-center justify-center border ${
        isProcessing
          ? 'bg-cyan-500/[0.08] border-cyan-500/[0.16]'
          : 'bg-violet-500/[0.10] border-violet-500/[0.18]'
      }`}
    >
      <SparkleIcon
        className={`w-2.5 h-2.5 ${isProcessing ? 'text-cyan-400/55' : 'text-violet-400/60'}`}
      />
    </div>
  );

  // ── Translating / pending skeleton ──────────────────────────────
  if (status === 'pending' || status === 'translating') {
    if (isUser) {
      const skeletonBg = isProcessing
        ? 'bg-cyan-500/[0.08] border-cyan-500/[0.13]'
        : 'bg-violet-500/[0.09] border-violet-500/[0.14]';
      return (
        <div className="flex justify-end">
          <div className={`${skeletonBg} border rounded-2xl rounded-tr-[6px] px-4 py-2.5 flex items-center gap-2`}>
            <span className="text-[12px] text-white/28 tracking-wide">{t.translating}</span>
            <div className="translating-skeleton w-14 rounded-full" />
          </div>
        </div>
      );
    }
    // AI pending
    return (
      <div className="flex items-start gap-2.5">
        {AIBadge}
        <div className="flex items-center gap-2 pt-[1px]">
          <span className="text-[12px] text-white/28 tracking-wide">{t.translating}</span>
          <div className="translating-skeleton w-20 rounded-full" />
        </div>
      </div>
    );
  }

  // ── User bubble ─────────────────────────────────────────────────
  if (isUser) {
    const bubbleStyle = isProcessing
      ? 'bg-cyan-500/[0.10] text-cyan-50/88 border border-cyan-500/[0.16] shadow-[0_2px_14px_rgba(6,182,212,0.07)]'
      : 'bg-violet-500/[0.11] text-violet-50/90 border border-violet-500/[0.18] shadow-[0_2px_14px_rgba(124,58,237,0.09)]';
    return (
      <div className="flex justify-end">
        <div
          className={`${bubbleStyle} rounded-2xl rounded-tr-[6px] px-4 py-2.5 text-[14px] leading-[1.65] max-w-[88%] whitespace-pre-wrap ${status === 'streaming' ? 'w-[88%]' : ''}`}
        >
          {content}
          {status === 'streaming' && (
            <span className="inline-block w-[2px] h-[14px] ml-[2px] align-middle bg-current opacity-60 animate-pulse" />
          )}
        </div>
      </div>
    );
  }

  // ── AI response ─────────────────────────────────────────────────
  return (
    <div className="flex items-start gap-2.5">
      {AIBadge}
      <div
        className={`flex-1 min-w-0 text-[14px] leading-[1.7] ${
          status === 'streaming'
            ? isProcessing
              ? 'streaming-cursor-cyan'
              : 'streaming-cursor'
            : ''
        }`}
      >
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || (status === 'streaming' ? '\u200b' : '')}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
