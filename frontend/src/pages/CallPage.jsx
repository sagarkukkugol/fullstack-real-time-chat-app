import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSocket } from "../lib/socket";

const CallPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  const isInitiator = useRef(false);
  const remoteDescSet = useRef(false);
  const pendingCandidates = useRef([]);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteVideoOff, setRemoteVideoOff] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [callStatus, setCallStatus] = useState("📡 Connecting...");
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      alert("Socket not connected. Please go back.");
      navigate("/");
      return;
    }

    socket.on("peer-video-toggle", ({ isOff }) => {
      setRemoteVideoOff(isOff);
    });

    socket.on("peer-audio-toggle", ({ isMuted: remoteMutedState }) => {
      setRemoteMuted(remoteMutedState);
    });

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        localStreamRef.current = stream;

        // ✅ Always keep the video element mounted and set srcObject directly
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const peer = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
          ],
        });

        peerRef.current = peer;
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        peer.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setCallStatus("🟢 Connected");
            if (!timerRef.current) {
              timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
            }
          }
        };

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", { roomId, candidate: event.candidate });
          }
        };

        peer.oniceconnectionstatechange = () => {
          if (peer.iceConnectionState === "connected") setCallStatus("🟢 Connected");
          if (peer.iceConnectionState === "disconnected" || peer.iceConnectionState === "failed") {
            setCallStatus("🔴 Connection lost");
          }
        };

        const flushPendingCandidates = async () => {
          for (const c of pendingCandidates.current) {
            try { await peer.addIceCandidate(new RTCIceCandidate(c)); }
            catch (e) { console.warn("ICE flush error:", e); }
          }
          pendingCandidates.current = [];
        };

        socket.emit("join-room", roomId);

        socket.on("init", () => {
          isInitiator.current = true;
          setCallStatus("⏳ Waiting for other person...");
        });

        socket.on("ready", async () => {
          if (!isInitiator.current) return;
          try {
            const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await peer.setLocalDescription(offer);
            socket.emit("offer", { roomId, offer });
            setCallStatus("📞 Calling...");
          } catch (e) { console.error("Offer error:", e); }
        });

        socket.on("offer", async ({ offer }) => {
          if (peer.signalingState !== "stable") return;
          try {
            await peer.setRemoteDescription(new RTCSessionDescription(offer));
            remoteDescSet.current = true;
            await flushPendingCandidates();
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit("answer", { roomId, answer });
          } catch (e) { console.error("Answer error:", e); }
        });

        socket.on("answer", async ({ answer }) => {
          if (peer.signalingState !== "have-local-offer") return;
          try {
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
            remoteDescSet.current = true;
            await flushPendingCandidates();
          } catch (e) { console.error("Set answer error:", e); }
        });

        socket.on("ice-candidate", async ({ candidate }) => {
          if (!candidate) return;
          if (!remoteDescSet.current) { pendingCandidates.current.push(candidate); return; }
          try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); }
          catch (e) { console.warn("ICE error:", e); }
        });

        socket.on("room-full", () => { alert("Room is full!"); navigate("/"); });

      } catch (err) {
        alert(err.name === "NotAllowedError"
          ? "❌ Camera/mic permission denied."
          : "❌ Could not start camera: " + err.message);
        navigate("/");
      }
    };

    startCall();

    return () => {
      clearInterval(timerRef.current);
      if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      socket.off("init");
      socket.off("ready");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("room-full");
      socket.off("peer-video-toggle");
      socket.off("peer-audio-toggle");
    };
  }, [roomId]);

  // ✅ FIX: Mute — use functional state update to always get correct current value
  const toggleMute = () => {
    const socket = getSocket();
    if (!localStreamRef.current) return;

    setIsMuted((prev) => {
      const newMuted = !prev;
      // Enable/disable audio tracks based on new state
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !newMuted; // enabled=true means NOT muted
      });
      // Notify remote peer
      socket.emit("peer-audio-toggle", { roomId, isMuted: newMuted });
      return newMuted;
    });
  };

  // ✅ FIX: Camera toggle — NEVER hide the <video> element with JSX conditional
  // Instead, keep video element always mounted and use CSS to show/hide
  // Then re-assign srcObject when turning back on so it plays again
  const toggleVideo = () => {
    const socket = getSocket();
    if (!localStreamRef.current) return;

    setIsVideoOff((prev) => {
      const newVideoOff = !prev;

      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !newVideoOff;
      });

      // ✅ KEY FIX: When turning camera back ON, re-assign srcObject
      // so the video element starts playing again
      if (!newVideoOff && localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }

      socket.emit("peer-video-toggle", { roomId, isOff: newVideoOff });
      return newVideoOff;
    });
  };

  const endCall = () => {
    clearInterval(timerRef.current);
    if (peerRef.current) peerRef.current.close();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
    navigate("/");
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-center gap-6 relative overflow-hidden">

      {/* Status */}
      <div className="absolute top-4 flex flex-col items-center gap-1 z-10">
        <p className="text-white/70 text-sm font-medium">{callStatus}</p>
        {callDuration > 0 && (
          <p className="text-green-400 text-sm font-mono">{formatDuration(callDuration)}</p>
        )}
      </div>

      {/* Videos */}
      <div className="flex gap-6 flex-wrap justify-center items-center mt-8">

        {/* Remote — large */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10"
             style={{ width: 480, height: 360 }}>

          {/* ✅ Always keep <video> in DOM — use CSS visibility, not JSX conditional */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ display: remoteVideoOff ? "none" : "block" }}
            className="w-full h-full object-cover bg-gray-800"
          />

          {/* Shown when remote camera is off */}
          {remoteVideoOff && (
            <div className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center gap-3">
              <div className="text-6xl">🚫</div>
              <p className="text-white/50 text-sm">Camera is off</p>
            </div>
          )}

          <div className="absolute bottom-3 left-4 flex items-center gap-2 z-10">
            <span className="text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">Remote</span>
            {remoteMuted && (
              <span className="text-white text-xs bg-red-500/80 px-2 py-0.5 rounded-full">🔇 Muted</span>
            )}
          </div>
        </div>

        {/* Local — small */}
        <div className="relative rounded-2xl overflow-hidden shadow-xl border border-white/10"
             style={{ width: 240, height: 180 }}>

          {/* ✅ Always keep <video> in DOM — use CSS display, not JSX conditional */}
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ display: isVideoOff ? "none" : "block" }}
            className="w-full h-full object-cover bg-gray-800"
          />

          {/* Shown when your camera is off */}
          {isVideoOff && (
            <div className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center gap-2">
              <div className="text-4xl">🚫</div>
              <p className="text-white/50 text-xs">Camera off</p>
            </div>
          )}

          <div className="absolute bottom-2 left-3 flex items-center gap-1 z-10">
            <span className="text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">You</span>
            {isMuted && (
              <span className="text-white text-xs bg-red-500/80 px-1.5 py-0.5 rounded-full">🔇</span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-5 mt-2">
        <button
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          className={`w-14 h-14 rounded-full text-2xl flex items-center justify-center shadow-lg transition
            ${isMuted ? "bg-yellow-500" : "bg-gray-700 hover:bg-gray-600"}`}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>

        <button
          onClick={endCall}
          title="End Call"
          className="w-14 h-14 rounded-full text-2xl flex items-center justify-center bg-red-500 hover:bg-red-600 shadow-lg transition"
        >
          📵
        </button>

        <button
          onClick={toggleVideo}
          title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
          className={`w-14 h-14 rounded-full text-2xl flex items-center justify-center shadow-lg transition
            ${isVideoOff ? "bg-yellow-500" : "bg-gray-700 hover:bg-gray-600"}`}
        >
          {isVideoOff ? "🚫" : "📷"}
        </button>
      </div>

      <p className="text-white/20 text-xs">🔊 Mute &nbsp;|&nbsp; 📵 End Call &nbsp;|&nbsp; 📷 Camera</p>
    </div>
  );
};

export default CallPage;
