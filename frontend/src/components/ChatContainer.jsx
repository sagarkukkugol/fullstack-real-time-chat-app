import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import AITypingIndicator from "./ai/AITypingIndicator";
import { formatMessageTime } from "../lib/utils";
import LedgerPanel from "./ledger/LedgerPanel";
import { Trash2 } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    isAITyping,
    clearChatHistory,
    isClearingChat,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load messages and subscribe to socket events on chat open
  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages(selectedUser);
    return () => unsubscribeFromMessages();
  }, [selectedUser._id]);

  // Auto-scroll on new messages or when AI types
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAITyping]);

  // ── Clear chat confirmation handler ───────────
  const handleClearChat = async () => {
    await clearChatHistory();
    setShowClearConfirm(false);
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* ── Main chat column ── */}
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />

        {/* ── Clear chat button + confirm ── */}
        <div className="flex justify-end px-4 pt-2">
          {showClearConfirm ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base-content/60">Clear all messages?</span>
              <button
                onClick={handleClearChat}
                disabled={isClearingChat}
                className="btn btn-xs btn-error"
              >
                {isClearingChat ? "Clearing..." : "Yes, clear"}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn btn-xs btn-ghost"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="btn btn-ghost btn-xs gap-1 text-base-content/40 hover:text-error"
              title="Clear chat history"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Clear chat</span>
            </button>
          )}
        </div>

        {/* ── Messages list ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-base-content/30 gap-2">
              {selectedUser.isAI ? (
                <>
                  <span className="text-5xl">🤖</span>
                  <p className="text-sm font-medium">Ask Chatty AI anything!</p>
                  <p className="text-xs">Your messages are private and not stored by OpenAI.</p>
                </>
              ) : (
                <>
                  <span className="text-4xl">💬</span>
                  <p className="text-sm">No messages yet. Say hello!</p>
                </>
              )}
            </div>
          )}

          {messages.map((message) => {
            const isFromMe = message.senderId === authUser._id;
            const isAIMessage = message.isAI;

            return (
              <div
                key={message._id}
                className={`chat ${isFromMe ? "chat-end" : "chat-start"}`}
              >
                {/* Avatar */}
                <div className="chat-image avatar">
                  <div className="size-10 rounded-full border">
                    {isAIMessage ? (
                      // AI avatar
                      <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                        {selectedUser.profilePic ? (
                          <img src={selectedUser.profilePic} alt="AI" className="rounded-full" />
                        ) : (
                          <span className="text-lg">🤖</span>
                        )}
                      </div>
                    ) : (
                      <img
                        src={
                          isFromMe
                            ? authUser.profilePic || "/avatar.png"
                            : selectedUser.profilePic || "/avatar.png"
                        }
                        alt="avatar"
                        className="rounded-full"
                      />
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="chat-header mb-1">
                  {isAIMessage && (
                    <span className="text-xs font-medium text-primary mr-1">Chatty AI</span>
                  )}
                  <time className="text-xs opacity-50">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </div>

                {/* Bubble */}
                <div
                  className={`chat-bubble flex flex-col gap-2 ${
                    isAIMessage
                      ? "bg-primary/10 text-base-content border border-primary/20"
                      : ""
                  }`}
                >
                  {/* Image */}
                  {message.image && (
                    <img
                      src={message.image}
                      alt="attachment"
                      className="sm:max-w-[200px] rounded-md"
                    />
                  )}

                  {/* File with View + Download */}
                  {message.file && (
                    <div className="flex items-center gap-2 bg-base-200 rounded-lg px-3 py-2 text-sm">
                      <span className="text-lg">📎</span>
                      <span className="flex-1 truncate font-medium">
                        {message.fileName || "Attached file"}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <a
                          href={message.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-xs btn-ghost text-primary"
                        >
                          View
                        </a>
                        <a
                          href={message.file}
                          download={message.fileName || "file"}
                          className="btn btn-xs btn-ghost text-success"
                        >
                          ↓
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Text */}
                  {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
                </div>
              </div>
            );
          })}

          {/* ── AI Typing Indicator ── */}
          {isAITyping && selectedUser?.isAI && (
            <AITypingIndicator aiUser={selectedUser} />
          )}

          <div ref={messageEndRef} />
        </div>

        <MessageInput />
      </div>

      {/* ── Ledger Panel (hidden for AI chats) ── */}
      {!selectedUser.isAI && <LedgerPanel selectedUser={selectedUser} />}
    </div>
  );
};

export default ChatContainer;
