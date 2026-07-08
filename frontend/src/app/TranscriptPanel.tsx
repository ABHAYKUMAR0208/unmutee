import { useEffect, useRef } from "react";
import { ChatMessage } from "./chatHistory";

const TranscriptPanel = ({ chatHistory }: { chatHistory: ChatMessage[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 bg-background/50 border border-white/5 rounded-xl p-5 text-sm text-white/80 leading-relaxed overflow-y-auto space-y-3"
    >
      {chatHistory.length === 0 ? (
        <span className="text-lightgray italic">Awaiting conversation...</span>
      ) : (
        chatHistory.map((message, i) => (
          <p key={i}>
            <span
              className={
                message.role === "assistant"
                  ? "text-brand font-semibold"
                  : "text-accent-cyan font-semibold"
              }
            >
              {message.role === "assistant" ? "Agent: " : "You: "}
            </span>
            {message.content}
          </p>
        ))
      )}
    </div>
  );
};

export default TranscriptPanel;
