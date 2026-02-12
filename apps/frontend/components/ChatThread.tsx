"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatResponse } from "@/lib/types";
import { Send, User, Bot, FileText } from "lucide-react";
import { EvidenceCard } from "./EvidenceCard";
import { ChecksCard } from "./ChecksCard";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
}

interface ChatThreadProps {
  onSendMessage: (message: string) => Promise<ChatResponse>;
  onWorkOrderSuggested?: (response: ChatResponse) => void;
}

export function ChatThread({ onSendMessage, onWorkOrderSuggested }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your maintenance assistant. I can help you with manuals, schedules, employee assignments, inventory checks, and work orders. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await onSendMessage(input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.answer,
        response,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (response.suggested_work_order && onWorkOrderSuggested) {
        onWorkOrderSuggested(response);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error processing your request. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {message.role === "user" ? (
                  <User className="h-5 w-5" />
                ) : (
                  <Bot className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="rounded-lg bg-muted p-3 text-sm">
                  {message.content}
                </div>
                {message.response?.evidence && (
                  <EvidenceCard evidence={message.response.evidence} />
                )}
                {message.response?.checks && (
                  <ChecksCard checks={message.response.checks} />
                )}
                {message.response?.suggested_work_order && (
                  <div className="rounded-lg border border-primary bg-primary/5 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                      <FileText className="h-4 w-4" />
                      Work Order Suggested
                    </div>
                    <p className="text-xs text-muted-foreground">
                      A work order draft has been prepared based on this conversation.
                      Use the "Create Work Order" button in the context panel to proceed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  Thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="border-t bg-background p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about maintenance, schedules, employees, or inventory..."
            disabled={loading}
            className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
