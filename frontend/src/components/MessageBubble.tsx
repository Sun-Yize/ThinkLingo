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
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, status, sourceLanguage }) => {
  const isUser = role === 'user';
  const t = getT(sourceLanguage);

  if (status === 'idle') return null;

  if (status === 'pending' || status === 'translating') {
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`
            max-w-[90%] px-4 py-3 rounded-2xl text-sm flex items-center gap-2
            ${isUser ? 'bg-blue-500' : 'bg-gray-100'}
          `}
        >
          <span className={`text-xs ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
            {t.translating}
          </span>
          <div className="translating-skeleton w-20 h-3 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
          }
          ${status === 'streaming' ? 'streaming-cursor' : ''}
        `}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || (status === 'streaming' ? '\u200b' : '')}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
