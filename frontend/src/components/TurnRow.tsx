import React from 'react';
import { ConversationTurn, ColumnFocus } from '../types/chat';
import MessageBubble from './MessageBubble';

interface TurnRowProps {
  turn: ConversationTurn;
  sourceLanguage: string;
  columnFocus: ColumnFocus;
}

const TurnRow: React.FC<TurnRowProps> = ({ turn, sourceLanguage, columnFocus }) => {
  const gridCols =
    columnFocus === 'left'  ? '100% 0%'  :
    columnFocus === 'right' ? '0% 100%'  :
    '50% 50%';

  const leftHidden  = columnFocus === 'right';
  const rightHidden = columnFocus === 'left';
  const showDivider = columnFocus === 'both';

  return (
    <div
      className="relative grid group turn-row"
      style={{
        gridTemplateColumns: gridCols,
        transition: 'grid-template-columns 260ms ease-in-out',
      }}
    >
      {/* Left column — source language */}
      <div
        className={`overflow-hidden min-w-0 transition-colors duration-200 ${
          leftHidden
            /* collapsed: no padding, no content → truly 0-height, 0-width */
            ? ''
            : `flex flex-col gap-4 px-6 py-6 group-hover:bg-violet-500/[0.018] ${showDivider ? 'border-r border-white/[0.04]' : ''}`
        }`}
      >
        {!leftHidden && (
          <>
            <MessageBubble
              role="user"
              content={turn.leftUser}
              status="complete"
              sourceLanguage={sourceLanguage}
              variant="default"
            />
            <MessageBubble
              role="ai"
              content={turn.leftAi}
              status={turn.leftAiStatus}
              sourceLanguage={sourceLanguage}
              variant="default"
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
            : 'flex flex-col gap-4 px-6 py-6 group-hover:bg-cyan-500/[0.018]'
        }`}
      >
        {!rightHidden && (
          <>
            <MessageBubble
              role="user"
              content={turn.rightUser}
              status={turn.rightUserStatus}
              sourceLanguage={sourceLanguage}
              variant="processing"
            />
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

export default TurnRow;
