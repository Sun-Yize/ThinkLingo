import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ConversationTurn, Language, ChatSettings, ColumnFocus } from '../types/chat';
import { getT } from '../utils/i18n';
import TurnRow from './TurnRow';

interface DualColumnViewProps {
  turns: ConversationTurn[];
  settings: ChatSettings;
  languages: Language[];
  scrollTrigger?: number;
}

const langCode: Record<string, string> = {
  english:  'EN',
  chinese:  'ZH',
  japanese: 'JA',
  korean:   'KO',
};

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
};

const DualColumnView: React.FC<DualColumnViewProps> = ({ turns, settings, languages, scrollTrigger }) => {
  const isMobile = useIsMobile();
  const [columnFocus, setColumnFocus]  = useState<ColumnFocus>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'left' : 'both'
  );
  const bottomRef                       = useRef<HTMLDivElement>(null);
  const scrollRef                       = useRef<HTMLDivElement>(null);
  const userScrolledUpRef               = useRef(false);
  const lastScrollTopRef                = useRef(0);

  // Force single-column on mobile, allow 'both' on desktop
  useEffect(() => {
    if (isMobile && columnFocus === 'both') {
      setColumnFocus('left');
    }
  }, [isMobile, columnFocus]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const currentScrollTop    = el.scrollTop;
    const distanceFromBottom  = el.scrollHeight - currentScrollTop - el.clientHeight;
    const scrollingUp         = currentScrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current  = currentScrollTop;

    if (distanceFromBottom <= 40) {
      // Close enough to the bottom → always re-enable auto-follow
      userScrolledUpRef.current = false;
    } else if (scrollingUp) {
      // User actively scrolled upward → pause auto-follow
      userScrolledUpRef.current = true;
    }
    // scrollingUp=false but not near bottom = programmatic smooth-scroll in progress → ignore
  };

  // Throttled auto-scroll: at most once per animation frame to avoid
  // layout thrashing when tokens arrive faster than the screen refreshes.
  const scrollRafRef = useRef<number | null>(null);
  const scrollToBottom = useCallback(() => {
    if (scrollRafRef.current !== null) return; // already scheduled
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (!userScrolledUpRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [turns, scrollToBottom]);

  // Force-scroll to bottom when user sends a message (even if they scrolled up)
  useEffect(() => {
    if (scrollTrigger) {
      userScrolledUpRef.current = false;
      scrollToBottom();
    }
  }, [scrollTrigger, scrollToBottom]);

  const t = getT(settings.sourceLanguage);

  const getLanguageName = (key: string) => {
    const lang = languages.find(l => l.key === key);
    return lang ? (lang.native_name || lang.name) : key;
  };

  const leftLang     = settings.sourceLanguage;
  const rightLang    = settings.processingLanguage;
  const sameLanguage = leftLang === rightLang;

  const codeOf = (key: string) =>
    langCode[key] ?? key.slice(0, 2).toUpperCase();

  const leftHidden  = columnFocus === 'right';   // left column is hidden
  const rightHidden = columnFocus === 'left';    // right column is hidden
  const showDivider = columnFocus === 'both';

  const gridCols =
    columnFocus === 'left'  ? '100% 0%'  :
    columnFocus === 'right' ? '0% 100%'  :
    '50% 50%';

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: gridCols,
    transition: 'grid-template-columns 260ms ease-in-out',
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Mobile tab bar ─────────────────────────────────────────── */}
      {isMobile && (
        <div className="sticky top-0 z-10 bg-[rgba(11,11,20,0.92)] backdrop-blur-xl">
          <div className="flex">
            <button
              onClick={() => setColumnFocus('left')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors duration-200 ${
                columnFocus === 'left'
                  ? 'text-violet-300 border-b-2 border-violet-500'
                  : 'text-white/35 border-b-2 border-transparent'
              }`}
            >
              <span className="w-5 h-5 rounded-md bg-violet-500/[0.10] border border-violet-500/[0.18] flex items-center justify-center">
                <span className="text-[8px] font-bold font-mono text-violet-300 tracking-widest">{codeOf(leftLang)}</span>
              </span>
              <span className="truncate">{getLanguageName(leftLang)}</span>
              <span className="text-[8px] font-mono text-violet-400/50 tracking-wider">SRC</span>
            </button>
            <button
              onClick={() => setColumnFocus('right')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors duration-200 ${
                columnFocus === 'right'
                  ? 'text-cyan-300 border-b-2 border-cyan-500'
                  : 'text-white/35 border-b-2 border-transparent'
              }`}
            >
              <span className="w-5 h-5 rounded-md bg-cyan-500/[0.08] border border-cyan-500/[0.14] flex items-center justify-center">
                <span className="text-[8px] font-bold font-mono text-cyan-300 tracking-widest">{codeOf(rightLang)}</span>
              </span>
              <span className="truncate">{getLanguageName(rightLang)}</span>
              <span className="text-[8px] font-mono text-cyan-400/45 tracking-wider">PROC</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Desktop sticky column headers ───────────────────────────── */}
      {!isMobile && (
      <div className="grid sticky top-0 z-10 bg-[rgba(11,11,20,0.90)] backdrop-blur-xl" style={gridStyle}>

        {/* ── Left column header ── */}
        <div className={`relative overflow-hidden min-w-0 ${leftHidden ? '' : `px-6 py-4 flex items-center gap-3 ${showDivider ? 'border-r border-white/[0.05]' : ''}`}`}>
          {!leftHidden && (
            <>
              {/* Violet top-accent line */}
              <div className="absolute top-0 left-0 w-4/5 h-[2px] rounded-full bg-gradient-to-r from-violet-500/65 to-transparent" />

              {/* Language code badge */}
              <div className="w-9 h-9 rounded-xl bg-violet-500/[0.10] border border-violet-500/[0.18] flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold font-mono text-violet-300 tracking-widest select-none">
                  {codeOf(leftLang)}
                </span>
              </div>

              {/* Language name + role label */}
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-white/85 leading-tight truncate">
                  {getLanguageName(leftLang)}
                </div>
                <div className="text-[11px] text-white/32 mt-[3px] font-normal truncate">
                  {t.leftColLabel}
                </div>
              </div>

              {/* SRC indicator + collapse/expand button */}
              <div className="flex-shrink-0 flex items-center gap-1.5">
                <span className="w-[5px] h-[5px] rounded-full bg-violet-400/55" />
                <span className="text-[9.5px] font-bold font-mono text-violet-400/50 tracking-[0.12em] uppercase select-none">
                  SRC
                </span>
                <button
                  onClick={() => setColumnFocus(rightHidden ? 'both' : 'left')}
                  aria-label={rightHidden ? 'Restore both columns' : 'Expand left column'}
                  title={rightHidden ? 'Restore both columns' : 'Expand left'}
                  className={`group ml-1.5 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer border ${
                    rightHidden
                      ? 'bg-violet-500/[0.14] hover:bg-violet-500/[0.25] border-violet-500/[0.25] hover:border-violet-500/[0.45]'
                      : 'bg-transparent hover:bg-violet-500/[0.10] border-transparent hover:border-violet-500/[0.18]'
                  }`}
                >
                  {rightHidden ? (
                    <svg className="w-3 h-3 text-violet-400/65 group-hover:text-violet-300 transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-violet-400/30 group-hover:text-violet-300/75 transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Right column header ── */}
        <div className={`relative overflow-hidden min-w-0 ${rightHidden ? '' : 'px-6 py-4 flex items-center gap-3'}`}>
          {!rightHidden && (
            <>
              {/* Cyan top-accent line */}
              <div className="absolute top-0 left-0 w-4/5 h-[2px] rounded-full bg-gradient-to-r from-cyan-500/55 to-transparent" />

              <button
                onClick={() => setColumnFocus(leftHidden ? 'both' : 'right')}
                aria-label={leftHidden ? 'Restore both columns' : 'Expand right column'}
                title={leftHidden ? 'Restore both columns' : 'Expand right'}
                className={`flex-shrink-0 group w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer border ${
                  leftHidden
                    ? 'bg-cyan-500/[0.12] hover:bg-cyan-500/[0.24] border-cyan-500/[0.22] hover:border-cyan-500/[0.42]'
                    : 'bg-transparent hover:bg-cyan-500/[0.10] border-transparent hover:border-cyan-500/[0.18]'
                }`}
              >
                {leftHidden ? (
                  <svg className="w-3 h-3 text-cyan-400/65 group-hover:text-cyan-300 transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-cyan-400/30 group-hover:text-cyan-300/75 transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
                  </svg>
                )}
              </button>

              {/* Language code badge */}
              <div className="w-9 h-9 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/[0.14] flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold font-mono text-cyan-300 tracking-widest select-none">
                  {codeOf(rightLang)}
                </span>
              </div>

              {/* Language name + role label */}
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-white/85 leading-tight truncate">
                  {getLanguageName(rightLang)}
                </div>
                <div className="text-[11px] text-white/32 mt-[3px] font-normal truncate">
                  {t.rightColLabel}
                </div>
              </div>

              {/* PROC indicator */}
              <div className="flex-shrink-0 flex items-center gap-1.5">
                <span className="w-[5px] h-[5px] rounded-full bg-cyan-400/50" />
                <span className="text-[9.5px] font-bold font-mono text-cyan-400/45 tracking-[0.12em] uppercase select-none">
                  PROC
                </span>
              </div>
            </>
          )}
        </div>

        {/* Bottom separator */}
        <div
          className="col-span-2 h-px"
          style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.18) 50%, rgba(6,182,212,0.14) 50%, rgba(6,182,212,0.14) 100%)' }}
        />
      </div>
      )}

      {/* ── Turn list ─────────────────────────────────────────────── */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {turns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
              <svg className="w-5 h-5 text-white/18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-[12.5px] text-white/25 text-center max-w-[260px] leading-relaxed">
              {sameLanguage ? t.emptyStateSame : t.emptyStateDiff}
            </p>
          </div>
        ) : (
          turns.map(turn => (
            <TurnRow
              key={turn.id}
              turn={turn}
              sourceLanguage={settings.sourceLanguage}
              processingLanguage={settings.processingLanguage}
              columnFocus={columnFocus}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default React.memo(DualColumnView);
