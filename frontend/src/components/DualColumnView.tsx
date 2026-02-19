import React, { useEffect, useRef } from 'react';
import { ConversationTurn, Language, ChatSettings } from '../types/chat';
import { getT } from '../utils/i18n';
import TurnRow from './TurnRow';

interface DualColumnViewProps {
  turns: ConversationTurn[];
  settings: ChatSettings;
  languages: Language[];
}

// ISO 639-1 codes — no emojis, no flags
const langCode: Record<string, string> = {
  english:  'EN',
  chinese:  'ZH',
  japanese: 'JA',
  korean:   'KO',
};

const DualColumnView: React.FC<DualColumnViewProps> = ({ turns, settings, languages }) => {
  const bottomRef        = useRef<HTMLDivElement>(null);
  const scrollRef        = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  // Detect whether the user has manually scrolled away from the bottom.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 20;
  };

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns]);

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

  return (
    <div className="flex flex-col h-full">

      {/* ── Sticky column headers ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sticky top-0 z-10 bg-[rgba(11,11,20,0.90)] backdrop-blur-xl">

        {/* Left column header */}
        <div className="relative px-6 py-4 border-r border-white/[0.05] flex items-center gap-4">
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

          {/* SRC indicator */}
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <span className="w-[5px] h-[5px] rounded-full bg-violet-400/55" />
            <span className="text-[9.5px] font-bold font-mono text-violet-400/50 tracking-[0.12em] uppercase select-none">
              SRC
            </span>
          </div>
        </div>

        {/* Right column header */}
        <div className="relative px-6 py-4 flex items-center gap-4">
          {/* Cyan top-accent line */}
          <div className="absolute top-0 left-0 w-4/5 h-[2px] rounded-full bg-gradient-to-r from-cyan-500/55 to-transparent" />

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
        </div>

        {/* Bottom separator — violet left half, cyan right half */}
        <div
          className="col-span-2 h-px"
          style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.18) 50%, rgba(6,182,212,0.14) 50%, rgba(6,182,212,0.14) 100%)' }}
        />
      </div>

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
            <TurnRow key={turn.id} turn={turn} sourceLanguage={settings.sourceLanguage} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default DualColumnView;
