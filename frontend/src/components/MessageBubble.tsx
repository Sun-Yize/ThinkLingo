import React, { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { getT } from '../utils/i18n';
import { useTheme } from '../utils/theme';

export type BubbleStatus = 'idle' | 'pending' | 'translating' | 'streaming' | 'complete';

interface MessageBubbleProps {
  role: 'user' | 'ai';
  content: string;
  status: BubbleStatus;
  sourceLanguage: string;
  variant?: 'default' | 'processing';
  statusHint?: string;
}

// Copy button for code blocks — appears on hover at top-right of <pre>
const CodeBlockCopyButton: React.FC<{ code: string }> = ({ code }) => {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy code"
      className={`absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 cursor-pointer border ${
        copied
          ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
          : isDark
            ? 'bg-white/[0.06] border-white/[0.10] text-white/40 hover:bg-white/[0.12] hover:text-white/70 hover:border-white/[0.18]'
            : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200 hover:text-slate-600 hover:border-slate-300'
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.334a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
};

// Extract plain text from React children tree (for copying code block content)
const extractText = (node: React.ReactNode): string => {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) return extractText(node.props.children);
  return '';
};

// Custom <pre> renderer with copy button overlay — defined outside component to keep stable reference
const PreWithCopy: React.FC<React.HTMLAttributes<HTMLPreElement>> = ({ children, ...props }) => {
  const code = extractText(children).replace(/\n$/, '');
  return (
    <div className="relative group/codeblock">
      <pre {...props}>{children}</pre>
      <CodeBlockCopyButton code={code} />
    </div>
  );
};

// Stable components object for ReactMarkdown — avoids re-creating on every render
const markdownComponents = { pre: PreWithCopy };

// Stable plugins arrays
const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];

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
  statusHint,
}) => {
  const { isDark } = useTheme();
  const isUser       = role === 'user';
  const isProcessing = variant === 'processing';
  const t            = getT(sourceLanguage);

  if (status === 'idle') return null;

  // AI badge components
  const AIBadge = isProcessing ? (
    <div className={`flex-shrink-0 mt-[2px] w-[18px] h-[18px] rounded-[5px] flex items-center justify-center border ${isDark ? 'bg-cyan-500/[0.08] border-cyan-500/[0.16]' : 'bg-cyan-50 border-cyan-200'}`}>
      <SparkleIcon className={`w-2.5 h-2.5 ${isDark ? 'text-cyan-400/55' : 'text-cyan-500'}`} />
    </div>
  ) : (
    <div className={`flex-shrink-0 mt-[2px] w-[18px] h-[18px] rounded-[5px] flex items-center justify-center border ${isDark ? 'bg-violet-500/[0.10] border-violet-500/[0.18]' : 'bg-violet-50 border-violet-200'}`}>
      <SparkleIcon className={`w-2.5 h-2.5 ${isDark ? 'text-violet-400/60' : 'text-violet-500'}`} />
    </div>
  );

  // ── Translating / pending skeleton ──────────────────────────────
  if (status === 'pending' || status === 'translating') {
    const hint = statusHint ?? t.translating;
    if (isUser) {
      const skeletonBg = isProcessing
        ? isDark ? 'bg-cyan-500/[0.08] border-cyan-500/[0.13]' : 'bg-cyan-50 border-cyan-200'
        : isDark ? 'bg-violet-500/[0.09] border-violet-500/[0.14]' : 'bg-violet-50 border-violet-200';
      return (
        <div className="flex justify-end">
          <div className={`${skeletonBg} border rounded-2xl rounded-tr-[6px] px-4 py-2.5 flex items-center gap-2`}>
            <span className={`text-[12px] tracking-wide ${isDark ? 'text-white/28' : 'text-slate-400'}`}>{hint}</span>
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
          <span className={`text-[12px] tracking-wide ${isDark ? 'text-white/28' : 'text-slate-400'}`}>{hint}</span>
          <div className="translating-skeleton w-20 rounded-full" />
        </div>
      </div>
    );
  }

  // ── User bubble ─────────────────────────────────────────────────
  if (isUser) {
    const bubbleStyle = isProcessing
      ? isDark
        ? 'bg-cyan-500/[0.10] text-cyan-50/88 border border-cyan-500/[0.16] shadow-[0_2px_14px_rgba(6,182,212,0.07)]'
        : 'bg-cyan-50 text-cyan-900 border border-cyan-200 shadow-[0_2px_14px_rgba(6,182,212,0.06)]'
      : isDark
        ? 'bg-violet-500/[0.11] text-violet-50/90 border border-violet-500/[0.18] shadow-[0_2px_14px_rgba(124,58,237,0.09)]'
        : 'bg-violet-50 text-violet-900 border border-violet-200 shadow-[0_2px_14px_rgba(124,58,237,0.06)]';
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
        <MemoizedMarkdown content={content} status={status} />
      </div>
    </div>
  );
};

// Convert LaTeX delimiters: \[...\] → $$...$$, \(...\) → $...$
const preprocessLaTeX = (text: string): string => {
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math}$$`);
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);
  return text;
};

// Memoized markdown renderer — only re-parses when content actually changes
const MemoizedMarkdown: React.FC<{ content: string; status: BubbleStatus }> = React.memo(
  ({ content, status }) => {
    const rendered = useMemo(
      () => {
        const processed = content ? preprocessLaTeX(content) : (status === 'streaming' ? '\u200b' : '');
        return (
          <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={markdownComponents}>
            {processed}
          </ReactMarkdown>
        );
      },
      [content, status],
    );
    return <div className="markdown-body">{rendered}</div>;
  },
);

export default React.memo(MessageBubble);
