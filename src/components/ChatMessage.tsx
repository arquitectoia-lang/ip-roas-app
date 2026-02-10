'use client';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-[#5B21B6] text-white rounded-br-md'
            : 'bg-[#1e1e2e] text-slate-200 border border-slate-700 rounded-bl-md'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
