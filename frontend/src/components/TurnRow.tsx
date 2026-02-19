import React from 'react';
import { ConversationTurn } from '../types/chat';
import MessageBubble from './MessageBubble';

interface TurnRowProps {
  turn: ConversationTurn;
  sourceLanguage: string;
}

const TurnRow: React.FC<TurnRowProps> = ({ turn, sourceLanguage }) => {
  return (
    <div className="relative grid grid-cols-2 group turn-row">
      {/* Left column — source language */}
      <div className="flex flex-col gap-4 px-6 py-6 border-r border-white/[0.04] transition-colors duration-200 group-hover:bg-violet-500/[0.018]">
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
      </div>

      {/* Right column — processing language */}
      <div className="flex flex-col gap-4 px-6 py-6 transition-colors duration-200 group-hover:bg-cyan-500/[0.018]">
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
      </div>

      {/* Dual-tone bottom separator (matches header/column-header separator system) */}
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
