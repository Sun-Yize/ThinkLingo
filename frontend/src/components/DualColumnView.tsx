import React, { useEffect, useRef } from 'react';
import { ConversationTurn, Language, ChatSettings } from '../types/chat';
import TurnRow from './TurnRow';

interface DualColumnViewProps {
  turns: ConversationTurn[];
  settings: ChatSettings;
  languages: Language[];
}

const langFlag: Record<string, string> = {
  english: '🔤',
  chinese: '🇨🇳',
  japanese: '🇯🇵',
  korean: '🇰🇷',
};

const DualColumnView: React.FC<DualColumnViewProps> = ({ turns, settings, languages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const getLanguageName = (key: string) => {
    const lang = languages.find(l => l.key === key);
    return lang ? (lang.native_name || lang.name) : key;
  };

  const leftLang = settings.sourceLanguage;
  const rightLang = 'english';

  const leftSameAsRight = leftLang === rightLang;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky column headers */}
      <div className="grid grid-cols-2 sticky top-0 z-10 bg-white border-b-2 border-gray-200 shadow-sm">
        <div className="px-4 py-2 border-r border-gray-200 flex items-center gap-2">
          <span className="text-base">{langFlag[leftLang] ?? '🌐'}</span>
          <div>
            <div className="text-sm font-semibold text-gray-800">{getLanguageName(leftLang)}</div>
            <div className="text-xs text-gray-400">原始 / 目标</div>
          </div>
        </div>
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="text-base">{langFlag[rightLang] ?? '🔤'}</span>
          <div>
            <div className="text-sm font-semibold text-gray-800">{getLanguageName(rightLang)}</div>
            <div className="text-xs text-gray-400">处理语言</div>
          </div>
        </div>
      </div>

      {/* Turn list */}
      <div className="flex-1 overflow-y-auto">
        {turns.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm select-none">
            {leftSameAsRight
              ? '两列显示相同内容（处理语言与目标语言相同）'
              : '左列：目标语言  ·  右列：英文处理'}
          </div>
        ) : (
          turns.map(turn => <TurnRow key={turn.id} turn={turn} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default DualColumnView;
