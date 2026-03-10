import React, { useMemo, useState } from 'react';
import { ConversationTurn, ColumnFocus } from '../types/chat';
import MessageBubble from './MessageBubble';
import { getT } from '../utils/i18n';

interface TurnRowProps {
  turn: ConversationTurn;
  sourceLanguage: string;
  processingLanguage: string;
  columnFocus: ColumnFocus;
}

// Pre-computed grid styles to avoid creating new objects on every render
const GRID_STYLES: Record<ColumnFocus, React.CSSProperties> = {
  left:  { gridTemplateColumns: '100% 0%',  transition: 'grid-template-columns 260ms ease-in-out' },
  right: { gridTemplateColumns: '0% 100%',  transition: 'grid-template-columns 260ms ease-in-out' },
  both:  { gridTemplateColumns: '50% 50%',  transition: 'grid-template-columns 260ms ease-in-out' },
};

// Collapsible thinking block — shows model's chain-of-thought reasoning
const ThinkingBlock: React.FC<{
  content: string;
  status?: 'streaming' | 'complete';
  label: string;
  expanded: boolean;
  onToggle: () => void;
}> = ({ content, status, label, expanded, onToggle }) => {
  const isStreaming = status === 'streaming';

  return (
    <div
      className="rounded-xl border border-cyan-500/15 overflow-hidden"
      style={{ background: 'rgba(6,182,212,0.03)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 cursor-pointer hover:bg-cyan-500/[0.04] transition-colors"
      >
        <svg
          className={`w-3 h-3 text-cyan-400/50 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
        <svg className="w-3 h-3 text-cyan-400/50 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
        </svg>
        <span className="text-[10px] font-semibold text-cyan-400/50 uppercase tracking-widest">
          {label}
        </span>
        {isStreaming && (
          <span className="ml-auto flex gap-0.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-cyan-400/40 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-3 py-2.5 border-t border-cyan-500/10">
          <p className="text-[12px] leading-relaxed text-white/40 whitespace-pre-wrap">
            {content}
            {isStreaming && (
              <span className="inline-block w-[2px] h-[13px] bg-cyan-400/50 ml-[1px] align-middle animate-pulse" />
            )}
          </p>
        </div>
      )}
    </div>
  );
};

const TurnRow: React.FC<TurnRowProps> = ({ turn, sourceLanguage, processingLanguage, columnFocus }) => {
  const t = getT(sourceLanguage);
  const tRight = getT(processingLanguage);

  // Shared expanded state for left & right thinking blocks
  const hasThinking = !!(turn.rightAiThinking || turn.leftAiThinking);
  const isThinkingStreaming = turn.rightAiThinkingStatus === 'streaming' || turn.leftAiThinkingStatus === 'streaming';
  const [thinkingExpanded, setThinkingExpanded] = useState(hasThinking && isThinkingStreaming);
  // Auto-expand when streaming begins
  React.useEffect(() => {
    if (isThinkingStreaming) setThinkingExpanded(true);
  }, [isThinkingStreaming]);
  const toggleThinking = React.useCallback(() => setThinkingExpanded(prev => !prev), []);

  // Shared expanded state for left & right refined prompt blocks
  const hasRefinedPrompt = !!(turn.refinedPrompt || turn.leftRefinedPrompt);
  const isPromptStreaming = turn.refinedPromptStatus === 'streaming' || turn.leftRefinedPromptStatus === 'streaming';
  const [promptExpanded, setPromptExpanded] = useState(hasRefinedPrompt && isPromptStreaming);
  React.useEffect(() => {
    if (isPromptStreaming) setPromptExpanded(true);
  }, [isPromptStreaming]);
  const togglePrompt = React.useCallback(() => setPromptExpanded(prev => !prev), []);

  const leftHidden  = columnFocus === 'right';
  const rightHidden = columnFocus === 'left';
  const showDivider = columnFocus === 'both';

  // Stable statusHint — only recompute when relevant statuses change
  const statusHint = useMemo(() => {
    if (turn.leftAiStatus === 'pending') {
      if (turn.rightAiStatus === 'streaming') return t.thinking;
      if (turn.rightUserStatus === 'translating' || turn.rightUserStatus === 'streaming') return t.translating;
    }
    if (turn.leftAiStatus === 'streaming') return t.translatingOutput;
    return undefined;
  }, [turn.leftAiStatus, turn.rightAiStatus, turn.rightUserStatus, t]);

  return (
    <div
      className="relative grid group turn-row"
      style={GRID_STYLES[columnFocus]}
    >
      {/* Left column — source language */}
      <div
        className={`overflow-hidden min-w-0 transition-colors duration-200 ${
          leftHidden
            /* collapsed: no padding, no content → truly 0-height, 0-width */
            ? ''
            : `flex flex-col gap-4 px-3 py-4 md:px-6 md:py-6 group-hover:bg-violet-500/[0.018] ${showDivider ? 'border-r border-white/[0.04]' : ''}`
        }`}
      >
        {!leftHidden && (
          <>
            {turn.routingLabel && (
              <div className="flex items-center gap-1.5 px-1">
                <svg
                  className="w-3 h-3 flex-shrink-0 text-violet-500/50"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="text-[11px] tracking-wide text-violet-400/55">
                  {t.routingBadgePrefix} {turn.routingLabel}
                </span>
              </div>
            )}

            {turn.leftRefinedPrompt && (
              <div
                className="rounded-xl border border-violet-500/15 overflow-hidden"
                style={{ background: 'rgba(139,92,246,0.04)' }}
              >
                <button
                  onClick={togglePrompt}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 cursor-pointer hover:bg-violet-500/[0.04] transition-colors"
                >
                  <svg
                    className={`w-3 h-3 text-violet-400/50 flex-shrink-0 transition-transform duration-200 ${promptExpanded ? 'rotate-90' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                  <svg className="w-3 h-3 text-violet-400/50 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <span className="text-[10px] font-semibold text-violet-400/50 uppercase tracking-widest">
                    {t.refinedPromptLabel}
                  </span>
                  {turn.leftRefinedPromptStatus === 'streaming' && (
                    <span className="ml-auto flex gap-0.5">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-1 h-1 rounded-full bg-violet-400/40 animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </span>
                  )}
                </button>
                {promptExpanded && (
                  <div className="px-3 py-2.5 border-t border-violet-500/10">
                    <p className="text-[12px] leading-relaxed text-white/55 whitespace-pre-wrap">
                      {turn.leftRefinedPrompt}
                      {turn.leftRefinedPromptStatus === 'streaming' && (
                        <span className="inline-block w-[2px] h-[13px] bg-violet-400/50 ml-[1px] align-middle animate-pulse" />
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            <MessageBubble
              role="user"
              content={turn.leftUser}
              status="complete"
              sourceLanguage={sourceLanguage}
              variant="default"
            />
            {turn.leftAiThinking && (
              <ThinkingBlock
                content={turn.leftAiThinking}
                status={turn.leftAiThinkingStatus}
                label={t.thinking}
                expanded={thinkingExpanded}
                onToggle={toggleThinking}
              />
            )}
            <MessageBubble
              role="ai"
              content={turn.leftAi}
              status={turn.leftAiStatus}
              sourceLanguage={sourceLanguage}
              variant="default"
              statusHint={statusHint}
            />
            {turn.status === 'error' && turn.error && (
              <p className="text-[12px] text-red-400/75 mt-0.5 pl-[28px]">{turn.error}</p>
            )}
          </>
        )}
      </div>

      {/* Right column — processing language */}
      <div
        className={`overflow-hidden min-w-0 transition-colors duration-200 ${
          rightHidden
            ? ''
            : 'flex flex-col gap-4 px-3 py-4 md:px-6 md:py-6 group-hover:bg-cyan-500/[0.018]'
        }`}
      >
        {!rightHidden && (
          <>
            {turn.routingLabel && (
              <div className="flex items-center gap-1.5 px-1">
                <svg
                  className="w-3 h-3 flex-shrink-0 text-cyan-500/50"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="text-[11px] tracking-wide text-cyan-400/55">
                  {tRight.routingBadgePrefix} {turn.routingLabel}
                </span>
              </div>
            )}

            {turn.refinedPrompt && (
              <div
                className="rounded-xl border border-cyan-500/15 overflow-hidden"
                style={{ background: 'rgba(6,182,212,0.04)' }}
              >
                <button
                  onClick={togglePrompt}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 cursor-pointer hover:bg-cyan-500/[0.04] transition-colors"
                >
                  <svg
                    className={`w-3 h-3 text-cyan-400/50 flex-shrink-0 transition-transform duration-200 ${promptExpanded ? 'rotate-90' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                  <svg className="w-3 h-3 text-cyan-400/50 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <span className="text-[10px] font-semibold text-cyan-400/50 uppercase tracking-widest">
                    {tRight.refinedPromptLabel}
                  </span>
                  {turn.refinedPromptStatus === 'streaming' && (
                    <span className="ml-auto flex gap-0.5">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-1 h-1 rounded-full bg-cyan-400/40 animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </span>
                  )}
                </button>
                {promptExpanded && (
                  <div className="px-3 py-2.5 border-t border-cyan-500/10">
                    <p className="text-[12px] leading-relaxed text-white/55 whitespace-pre-wrap">
                      {turn.refinedPrompt}
                      {turn.refinedPromptStatus === 'streaming' && (
                        <span className="inline-block w-[2px] h-[13px] bg-cyan-400/50 ml-[1px] align-middle animate-pulse" />
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
            <MessageBubble
              role="user"
              content={turn.rightUser}
              status={turn.rightUserStatus}
              sourceLanguage={sourceLanguage}
              variant="processing"
            />
            {turn.rightAiThinking && (
              <ThinkingBlock
                content={turn.rightAiThinking}
                status={turn.rightAiThinkingStatus}
                label={tRight.thinking}
                expanded={thinkingExpanded}
                onToggle={toggleThinking}
              />
            )}
            <MessageBubble
              role="ai"
              content={turn.rightAi}
              status={turn.rightAiStatus}
              sourceLanguage={sourceLanguage}
              variant="processing"
            />
          </>
        )}
      </div>

      {/* Dual-tone bottom separator */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, rgba(139,92,246,0.10) 0%, rgba(139,92,246,0.10) 50%, rgba(6,182,212,0.08) 50%, rgba(6,182,212,0.08) 100%)',
        }}
      />
    </div>
  );
};

export default React.memo(TurnRow);
