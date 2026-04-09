/**
 * AITypingIndicator
 *
 * Shows an animated "Chatty AI is typing..." bubble in the chat window.
 * Displayed while waiting for the OpenAI response.
 * Rendered by ChatContainer when useChatStore.isAITyping === true.
 */
const AITypingIndicator = ({ aiUser }) => {
  return (
    <div className="chat chat-start">
      {/* AI Avatar */}
      <div className="chat-image avatar">
        <div className="size-10 rounded-full border bg-primary/10 flex items-center justify-center">
          {aiUser?.profilePic ? (
            <img src={aiUser.profilePic} alt="AI" className="rounded-full" />
          ) : (
            <span className="text-lg">🤖</span>
          )}
        </div>
      </div>

      {/* Typing bubble */}
      <div className="chat-bubble bg-base-300 text-base-content flex items-center gap-1 py-3 px-4">
        <span className="text-xs text-base-content/60 mr-1">Chatty AI</span>
        {/* Three bouncing dots */}
        <span
          className="w-2 h-2 rounded-full bg-base-content/40 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-base-content/40 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-base-content/40 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
};

export default AITypingIndicator;
