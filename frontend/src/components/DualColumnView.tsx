import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ConversationTurn, Language, ChatSettings, ColumnFocus } from '../types/chat';
import { getT } from '../utils/i18n';
import { useTheme } from '../utils/theme';
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
  const { isDark } = useTheme();
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
      userScrolledUpRef.current = false;
    } else if (scrollingUp) {
      userScrolledUpRef.current = true;
    }
  };

  const scrollRafRef = useRef<number | null>(null);
  const scrollToBottom = useCallback(() => {
    if (scrollRafRef.current !== null) return;
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

  const leftHidden  = columnFocus === 'right';
  const rightHidden = columnFocus === 'left';
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
        <div className="sticky top-0 z-10 backdrop-blur-xl" style={{ background: 'var(--chrome-bg-mobile)' }}>
          <div className="flex">
            <button
              onClick={() => setColumnFocus('left')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors duration-200 ${
                columnFocus === 'left'
                  ? isDark ? 'text-violet-300 border-b-2 border-violet-500' : 'text-violet-700 border-b-2 border-violet-500'
                  : isDark ? 'text-white/35 border-b-2 border-transparent' : 'text-slate-400 border-b-2 border-transparent'
              }`}
            >
              <span className={`w-5 h-5 rounded-md flex items-center justify-center border ${isDark ? 'bg-violet-500/[0.10] border-violet-500/[0.18]' : 'bg-violet-100 border-violet-200'}`}>
                <span className={`text-[8px] font-bold font-mono tracking-widest ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{codeOf(leftLang)}</span>
              </span>
              <span className="truncate">{getLanguageName(leftLang)}</span>
              <span className={`text-[8px] font-mono tracking-wider ${isDark ? 'text-violet-400/50' : 'text-violet-500'}`}>SRC</span>
            </button>
            <button
              onClick={() => setColumnFocus('right')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors duration-200 ${
                columnFocus === 'right'
                  ? isDark ? 'text-cyan-300 border-b-2 border-cyan-500' : 'text-cyan-700 border-b-2 border-cyan-500'
                  : isDark ? 'text-white/35 border-b-2 border-transparent' : 'text-slate-400 border-b-2 border-transparent'
              }`}
            >
              <span className={`w-5 h-5 rounded-md flex items-center justify-center border ${isDark ? 'bg-cyan-500/[0.08] border-cyan-500/[0.14]' : 'bg-cyan-50 border-cyan-200'}`}>
                <span className={`text-[8px] font-bold font-mono tracking-widest ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{codeOf(rightLang)}</span>
              </span>
              <span className="truncate">{getLanguageName(rightLang)}</span>
              <span className={`text-[8px] font-mono tracking-wider ${isDark ? 'text-cyan-400/45' : 'text-cyan-500'}`}>PROC</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Desktop sticky column headers ───────────────────────────── */}
      {!isMobile && (
      <div className="grid sticky top-0 z-10 backdrop-blur-xl" style={{ ...gridStyle, background: 'var(--chrome-bg-solid)' }}>

        {/* ── Left column header ── */}
        <div className={`relative overflow-hidden min-w-0 ${leftHidden ? '' : `px-6 py-4 flex items-center gap-3 ${showDivider ? isDark ? 'border-r border-white/[0.05]' : 'border-r border-slate-200' : ''}`}`}>
          {!leftHidden && (
            <>
              {/* Violet top-accent line */}
              <div className={`absolute top-0 left-0 w-4/5 h-[2px] rounded-full bg-gradient-to-r ${isDark ? 'from-violet-500/65' : 'from-violet-400/50'} to-transparent`} />

              {/* Language code badge */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${isDark ? 'bg-violet-500/[0.10] border-violet-500/[0.18]' : 'bg-violet-100 border-violet-200'}`}>
                <span className={`text-[11px] font-bold font-mono tracking-widest select-none ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                  {codeOf(leftLang)}
                </span>
              </div>

              {/* Language name + role label */}
              <div className="min-w-0 flex-1">
                <div className={`text-[13px] font-semibold leading-tight truncate ${isDark ? 'text-white/85' : 'text-slate-800'}`}>
                  {getLanguageName(leftLang)}
                </div>
                <div className={`text-[11px] mt-[3px] font-normal truncate ${isDark ? 'text-white/32' : 'text-slate-400'}`}>
                  {t.leftColLabel}
                </div>
              </div>

              {/* SRC indicator + collapse/expand button */}
              <div className="flex-shrink-0 flex items-center gap-1.5">
                <span className={`w-[5px] h-[5px] rounded-full ${isDark ? 'bg-violet-400/55' : 'bg-violet-400'}`} />
                <span className={`text-[9.5px] font-bold font-mono tracking-[0.12em] uppercase select-none ${isDark ? 'text-violet-400/50' : 'text-violet-500'}`}>
                  SRC
                </span>
                <button
                  onClick={() => setColumnFocus(rightHidden ? 'both' : 'left')}
                  aria-label={rightHidden ? 'Restore both columns' : 'Expand left column'}
                  title={rightHidden ? 'Restore both columns' : 'Expand left'}
                  className={`group ml-1.5 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer border ${
                    rightHidden
                      ? isDark ? 'bg-violet-500/[0.14] hover:bg-violet-500/[0.25] border-violet-500/[0.25] hover:border-violet-500/[0.45]' : 'bg-violet-100 hover:bg-violet-200 border-violet-200 hover:border-violet-300'
                      : isDark ? 'bg-transparent hover:bg-violet-500/[0.10] border-transparent hover:border-violet-500/[0.18]' : 'bg-transparent hover:bg-violet-50 border-transparent hover:border-violet-200'
                  }`}
                >
                  {rightHidden ? (
                    <svg className={`w-3 h-3 transition-colors duration-200 ${isDark ? 'text-violet-400/65 group-hover:text-violet-300' : 'text-violet-500 group-hover:text-violet-700'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
                    </svg>
                  ) : (
                    <svg className={`w-3 h-3 transition-colors duration-200 ${isDark ? 'text-violet-400/30 group-hover:text-violet-300/75' : 'text-violet-300 group-hover:text-violet-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
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
              <div className={`absolute top-0 left-0 w-4/5 h-[2px] rounded-full bg-gradient-to-r ${isDark ? 'from-cyan-500/55' : 'from-cyan-400/45'} to-transparent`} />

              <button
                onClick={() => setColumnFocus(leftHidden ? 'both' : 'right')}
                aria-label={leftHidden ? 'Restore both columns' : 'Expand right column'}
                title={leftHidden ? 'Restore both columns' : 'Expand right'}
                className={`flex-shrink-0 group w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer border ${
                  leftHidden
                    ? isDark ? 'bg-cyan-500/[0.12] hover:bg-cyan-500/[0.24] border-cyan-500/[0.22] hover:border-cyan-500/[0.42]' : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 hover:border-cyan-300'
                    : isDark ? 'bg-transparent hover:bg-cyan-500/[0.10] border-transparent hover:border-cyan-500/[0.18]' : 'bg-transparent hover:bg-cyan-50 border-transparent hover:border-cyan-200'
                }`}
              >
                {leftHidden ? (
                  <svg className={`w-3 h-3 transition-colors duration-200 ${isDark ? 'text-cyan-400/65 group-hover:text-cyan-300' : 'text-cyan-500 group-hover:text-cyan-700'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
                  </svg>
                ) : (
                  <svg className={`w-3 h-3 transition-colors duration-200 ${isDark ? 'text-cyan-400/30 group-hover:text-cyan-300/75' : 'text-cyan-300 group-hover:text-cyan-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
                  </svg>
                )}
              </button>

              {/* Language code badge */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${isDark ? 'bg-cyan-500/[0.08] border-cyan-500/[0.14]' : 'bg-cyan-50 border-cyan-200'}`}>
                <span className={`text-[11px] font-bold font-mono tracking-widest select-none ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
                  {codeOf(rightLang)}
                </span>
              </div>

              {/* Language name + role label */}
              <div className="min-w-0 flex-1">
                <div className={`text-[13px] font-semibold leading-tight truncate ${isDark ? 'text-white/85' : 'text-slate-800'}`}>
                  {getLanguageName(rightLang)}
                </div>
                <div className={`text-[11px] mt-[3px] font-normal truncate ${isDark ? 'text-white/32' : 'text-slate-400'}`}>
                  {t.rightColLabel}
                </div>
              </div>

              {/* PROC indicator */}
              <div className="flex-shrink-0 flex items-center gap-1.5">
                <span className={`w-[5px] h-[5px] rounded-full ${isDark ? 'bg-cyan-400/50' : 'bg-cyan-400'}`} />
                <span className={`text-[9.5px] font-bold font-mono tracking-[0.12em] uppercase select-none ${isDark ? 'text-cyan-400/45' : 'text-cyan-500'}`}>
                  PROC
                </span>
              </div>
            </>
          )}
        </div>

        {/* Bottom separator */}
        <div
          className="col-span-2 h-px"
          style={{ background: 'var(--sep-col-header)' }}
        />
      </div>
      )}

      {/* ── Turn list ─────────────────────────────────────────────── */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {turns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-slate-100 border-slate-200'}`}>
              <svg className={`w-5 h-5 ${isDark ? 'text-white/18' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className={`text-[12.5px] text-center max-w-[260px] leading-relaxed ${isDark ? 'text-white/25' : 'text-slate-400'}`}>
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
