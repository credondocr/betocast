import type { ChatMessage } from '@/types';
import { MessageCircle, Hash } from 'lucide-react';

interface Props {
  messages: ChatMessage[];
}

export function ChatPreview({ messages }: Props) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 h-[600px] flex flex-col">
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
        <MessageCircle size={14} />
        Chat en vivo
        <span className="text-muted-foreground font-normal">({messages.length})</span>
      </h3>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Esperando mensajes del chat...
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-xs px-3 py-2 rounded-lg ${
              msg.isVote
                ? 'bg-orange-500/10 border border-orange-500/20'
                : 'bg-secondary'
            }`}
          >
            <span className="font-semibold text-foreground">{msg.userName}</span>
            {msg.isVote && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-orange-400 font-mono">
                <Hash size={10} />
                {msg.carNumber}
              </span>
            )}
            <span className="ml-1.5 text-muted-foreground">{msg.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
