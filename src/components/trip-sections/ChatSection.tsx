import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useTripMessages,
  useSendMessage,
  useTripMembers,
} from "@/hooks/use-trip";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "./Avatar";
import { Send, MessageCircle, Wifi, WifiOff } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

/* ============================================================
 * Helpers
 * ============================================================ */

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ============================================================
 * ChatSection — Real-time via Supabase Realtime (WebSocket)
 * ============================================================ */
export function ChatSection({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useTripMessages(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  const sendMutation = useSendMessage(tripId);
  const queryClient = useQueryClient();

  const [text, setText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Auto-scroll to bottom ───────────────────────────────── */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Scroll on initial load and when messages change
  useEffect(() => {
    scrollToBottom(messages.length <= 1 ? "instant" : "smooth");
  }, [messages.length, scrollToBottom]);

  /* ── Supabase Realtime subscription (WebSocket) ──────────── */
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`chat:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          // When a new message arrives via WebSocket, update the query cache
          queryClient.setQueryData(
            ["trip", tripId, "messages"],
            (old: ChatMessage[] | undefined) => {
              if (!old) return [payload.new as ChatMessage];
              // Avoid duplicates (in case we already have it from optimistic update)
              const exists = old.some((m) => m.id === (payload.new as ChatMessage).id);
              if (exists) return old;
              return [...old, payload.new as ChatMessage];
            }
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [tripId, queryClient]);

  /* ── Send message ────────────────────────────────────────── */
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  /* ── Get member info ─────────────────────────────────────── */
  const getMemberName = (userId: string) => {
    const m = members.find((x) => x.user_id === userId);
    return m?.profiles?.display_name || m?.profiles?.username || "Unknown";
  };

  /* ── Message grouping logic ──────────────────────────────── */
  const shouldShowAvatar = (idx: number) => {
    if (idx === 0) return true;
    return messages[idx].user_id !== messages[idx - 1].user_id;
  };

  const isConsecutive = (idx: number) => {
    if (idx === 0) return false;
    const prev = messages[idx - 1];
    const curr = messages[idx];
    if (prev.user_id !== curr.user_id) return false;
    // Same user, within 5 minutes
    const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    return diff < 5 * 60 * 1000;
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card grid place-items-center h-[calc(100vh-220px)] lg:h-[520px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading messages…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card flex flex-col h-[calc(100vh-220px)] lg:h-[580px] overflow-hidden">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10">
            <MessageCircle className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight">Trip Chat</h3>
            <p className="text-xs text-muted-foreground">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-success" />
              <span className="text-xs text-success font-medium">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Connecting…</span>
            </>
          )}
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-0.5"
        style={{ scrollBehavior: "smooth" }}
      >
        {messages.length === 0 ? (
          <div className="h-full grid place-items-center">
            <div className="text-center max-w-xs">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/5 mb-4">
                <MessageCircle className="h-8 w-8 text-primary/30" />
              </div>
              <h4 className="font-display text-lg font-semibold text-foreground/70">
                Start the conversation
              </h4>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Say hi to your trip crew! Messages appear in real-time for everyone.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.user_id === user?.id;
            const showAvatar = shouldShowAvatar(idx);
            const consecutive = isConsecutive(idx);
            const name = getMemberName(msg.user_id);

            return (
              <div
                key={msg.id}
                className={
                  "flex items-end gap-2 " +
                  (isMine ? "justify-end " : "") +
                  (consecutive ? "mt-0.5" : "mt-3") +
                  " animate-[fadeSlideIn_0.25s_ease-out]"
                }
              >
                {/* Avatar (left side for others) */}
                {!isMine && (
                  <div className="w-8 shrink-0">
                    {showAvatar ? (
                      <Avatar id={msg.user_id} name={name} />
                    ) : null}
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={
                    "max-w-[75%] px-4 py-2.5 " +
                    (isMine
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-br-lg"
                      : "bg-secondary/80 rounded-2xl rounded-bl-lg")
                  }
                >
                  {/* Sender name (for others, only on first in group) */}
                  {!isMine && showAvatar && (
                    <div className="text-[11px] font-semibold text-primary/80 mb-0.5">
                      {name}
                    </div>
                  )}

                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.message}
                  </div>

                  <div
                    className={
                      "text-[10px] mt-1 " +
                      (isMine ? "text-primary-foreground/60" : "text-muted-foreground")
                    }
                  >
                    {formatTime(msg.created_at)}
                  </div>
                </div>

                {/* Spacer for own messages (right-aligned) */}
                {isMine && <div className="w-1 shrink-0" />}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm"
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the group…"
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition placeholder:text-muted-foreground/60"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!text.trim() || sendMutation.isPending}
          className={
            "grid h-10 w-10 place-items-center rounded-xl transition " +
            (text.trim()
              ? "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
              : "bg-secondary text-muted-foreground cursor-not-allowed")
          }
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
