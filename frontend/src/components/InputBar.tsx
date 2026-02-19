import React, { useState, useRef } from 'react';
import { getT } from '../utils/i18n';

interface InputBarProps {
  onSend: (message: string) => void;
  disabled: boolean;
  sourceLanguage: string;
}

const InputBar: React.FC<InputBarProps> = ({ onSend, disabled, sourceLanguage }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = getT(sourceLanguage);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const canSend = !disabled && message.trim().length > 0;

  // Split hint at the middle dot for two-part rendering
  const hintParts = t.inputHint.split('·').map(s => s.trim());

  return (
    <div className="relative flex-shrink-0 bg-[rgba(11,11,20,0.82)] backdrop-blur-xl px-5 py-4">
      {/* Top gradient separator */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Input container */}
      <div
        className={`
          flex items-end gap-3 rounded-3xl px-5 py-3.5 transition-all duration-200
          ${disabled
            ? 'bg-white/[0.03] border border-white/[0.05] opacity-55'
            : 'bg-white/[0.05] border border-white/[0.09] focus-within:border-violet-500/40 focus-within:bg-white/[0.065] focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.09),0_4px_20px_rgba(124,58,237,0.06)]'
          }
        `}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={t.inputPlaceholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none text-[15px] text-white/88 placeholder-white/22 py-[3px] max-h-[160px] leading-[1.6] disabled:cursor-not-allowed"
          style={{ fontWeight: 450 }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send"
          className={`
            flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full
            transition-all duration-200 cursor-pointer
            ${canSend
              ? 'bg-gradient-to-br from-violet-500 to-violet-600 text-white hover:from-violet-400 hover:to-violet-500 shadow-[0_4px_16px_rgba(124,58,237,0.38)] hover:shadow-[0_4px_22px_rgba(124,58,237,0.55)] active:scale-90'
              : 'bg-white/[0.05] text-white/18 cursor-not-allowed'
            }
          `}
        >
          {disabled ? (
            <div className="w-4 h-4 border-[1.5px] border-white/20 border-t-violet-400 rounded-full animate-spin" />
          ) : (
            /* Paper-plane send icon */
            <svg className="w-4 h-4 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          )}
        </button>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="flex items-center justify-center gap-2.5 mt-2.5">
        {hintParts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-white/12 text-[10px]">·</span>}
            <span className="flex items-center gap-1 text-[10.5px] text-white/22 font-mono tracking-wide">
              {part}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default InputBar;
