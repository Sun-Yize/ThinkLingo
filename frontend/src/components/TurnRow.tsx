import React from 'react';
import { ConversationTurn } from '../types/chat';
import MessageBubble from './MessageBubble';

interface TurnRowProps {
  turn: ConversationTurn;
  sourceLanguage: string;
}

const TurnRow: React.FC<TurnRowProps> = ({ turn, sourceLanguage }) => {
  return (
    <div className="grid grid-cols-2 border-b border-gray-100 last:border-0">
      {/* Left column — source/target language */}
      <div className="flex flex-col gap-2 px-4 py-3 border-r border-gray-100">
        <MessageBubble role="user" content={turn.leftUser} status="complete" sourceLanguage={sourceLanguage} />
        <MessageBubble role="ai" content={turn.leftAi} status={turn.leftAiStatus} sourceLanguage={sourceLanguage} />
        {turn.status === 'error' && turn.error && (
          <div className="text-xs text-red-500 px-1 mt-1">{turn.error}</div>
        )}
      </div>

      {/* Right column — processing language */}
      <div className="flex flex-col gap-2 px-4 py-3">
        <MessageBubble role="user" content={turn.rightUser} status={turn.rightUserStatus} sourceLanguage={sourceLanguage} />
        <MessageBubble role="ai" content={turn.rightAi} status={turn.rightAiStatus} sourceLanguage={sourceLanguage} />
      </div>
    </div>
  );
};

export default TurnRow;
