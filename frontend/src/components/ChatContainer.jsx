import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatMessageTime } from "../lib/utils";
import { getSocket } from "../lib/socket";

const ChatContainer = () => {
  const navigate = useNavigate();

  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  const [incomingCall, setIncomingCall] = useState(null);
  const [isCalling, setIsCalling] = useState(false);

  // ✅ Socket call event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("incoming-call", ({ from, roomId, callerName }) => {
      setIncomingCall({ from, roomId, callerName: callerName || "Someone" });
    });

    socket.on("call-accepted", ({ roomId }) => {
      setIsCalling(false);
      navigate(`/call/${roomId}`);
    });

    socket.on("call-declined", () => {
      setIsCalling(false);
      alert("Call was declined.");
    });

    socket.on("call-cancelled", () => {
      setIncomingCall(null);
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("call-declined");
      socket.off("call-cancelled");
    };
  }, []);

  const handleAcceptCall = () => {
    const socket = getSocket();
    if (!socket || !incomingCall) return;
    socket.emit("accept-call", { to: incomingCall.from, roomId: incomingCall.roomId });
    setIncomingCall(null);
    navigate(`/call/${incomingCall.roomId}`);
  };

  const handleDeclineCall = () => {
    const socket = getSocket();
    if (!socket || !incomingCall) return;
    socket.emit("decline-call", { to: incomingCall.from });
    setIncomingCall(null);
  };

  const handleCall = () => {
    const socket = getSocket();
    if (!socket || !selectedUser || isCalling) return;
    // Sort IDs so roomId is ALWAYS the same for both users
    // e.g. User A calls B → "AAA-BBB", User B calls A → also "AAA-BBB"
    const roomId = [authUser._id, selectedUser._id].sort().join("-");
    socket.emit("call-user", {
      to: selectedUser._id,
      from: authUser._id,
      callerName: authUser.fullName,
      roomId,
    });
    setIsCalling(true);
  };

  const handleCancelCall = () => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("cancel-call", { to: selectedUser._id });
    setIsCalling(false);
  };

  useEffect(() => {
    if (!selectedUser?._id) return;
    getMessages(selectedUser._id);
  }, [selectedUser]);

  useEffect(() => {
    subscribeToMessages(selectedUser);
    return () => unsubscribeFromMessages();
  }, [selectedUser]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative">

      {/* ✅ INCOMING CALL MODAL */}
      {incomingCall && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 rounded-lg">
          <div className="bg-base-100 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl w-72">
            <div className="text-6xl animate-bounce">📞</div>
            <h2 className="text-xl font-bold">{incomingCall.callerName}</h2>
            <p className="text-base-content/60 text-sm">Incoming video call...</p>
            <div className="flex gap-6 mt-2">
              <button
                onClick={handleDeclineCall}
                className="btn btn-error btn-circle btn-lg text-xl"
                title="Decline"
              >
                📵
              </button>
              <button
                onClick={handleAcceptCall}
                className="btn btn-success btn-circle btn-lg text-xl"
                title="Accept"
              >
                ✅
              </button>
            </div>
            <p className="text-xs text-base-content/40">📵 Decline &nbsp;&nbsp; ✅ Accept</p>
          </div>
        </div>
      )}

      {/* ✅ OUTGOING CALL BANNER */}
      {isCalling && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-green-600 text-white flex items-center justify-between px-4 py-2 rounded-t-lg">
          <span className="animate-pulse">📞 Calling {selectedUser?.fullName}... waiting for answer</span>
          <button onClick={handleCancelCall} className="btn btn-sm btn-ghost text-white">
            Cancel ✕
          </button>
        </div>
      )}

      {/* Header + Call Button */}
      <div className="flex items-center justify-between p-2 border-b border-base-300">
        <ChatHeader />
        {selectedUser && (
          <button
            onClick={handleCall}
            disabled={isCalling}
            className="btn btn-success btn-sm text-white gap-1 mr-2"
          >
            📹 Call
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === authUser._id;
          return (
            <div key={msg._id} className={`chat ${isMe ? "chat-end" : "chat-start"}`}>
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={isMe ? authUser.profilePic || "/avatar.png" : selectedUser.profilePic || "/avatar.png"}
                    alt="profile"
                  />
                </div>
              </div>
              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">{formatMessageTime(msg.createdAt)}</time>
              </div>
              <div className="chat-bubble flex flex-col">
                {msg.image && <img src={msg.image} alt="attachment" className="sm:max-w-[200px] rounded-md mb-2" />}
                {msg.text && <p>{msg.text}</p>}
              </div>
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
