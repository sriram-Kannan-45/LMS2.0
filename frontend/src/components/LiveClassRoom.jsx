import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { BACKEND_ORIGIN } from '../api/api';

const LiveClassRoom = ({ roomId, user, onLeave }) => {
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // 1. Initialize Socket
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || BACKEND_ORIGIN, {
      auth: { token: user.token }
    });

    const socket = socketRef.current;

    // 2. Get User Media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 3. Join Room
        socket.emit('join-session', { roomId, userId: user.id });

        // 4. Socket Listeners
        socket.on('room-participants', ({ participants }) => {
          setParticipants(participants);
          // In a full implementation, you'd iterate and create offers for existing participants
        });

        socket.on('user-joined', async ({ userId, socketId }) => {
          setParticipants(prev => [...new Set([...prev, userId])]);
          
          // Create Peer Connection and send Offer
          const pc = createPeerConnection(socketId);
          peerConnectionsRef.current[socketId] = pc;
          
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
          
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          socket.emit('offer', {
            target: socketId,
            caller: socket.id,
            sdp: offer
          });
        });

        socket.on('user-left', ({ userId, socketId }) => {
          setParticipants(prev => prev.filter(id => id !== userId));
          if (peerConnectionsRef.current[socketId]) {
            peerConnectionsRef.current[socketId].close();
            delete peerConnectionsRef.current[socketId];
          }
        });

        // WebRTC Signaling Listeners
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleIceCandidate);
      })
      .catch(err => console.error("Error accessing media devices", err));

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      socket.emit('leave-session', { roomId, userId: user.id });
      socket.disconnect();
    };
  }, [roomId, user]);

  const createPeerConnection = (targetSocketId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          target: targetSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      // Create remote video element if it doesn't exist (Simplified logic)
      // In React, better to manage this via state and render video components
      console.log("Received remote track");
    };

    return pc;
  };

  const handleOffer = async ({ caller, sdp }) => {
    const pc = createPeerConnection(caller);
    peerConnectionsRef.current[caller] = pc;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current));
    }

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketRef.current.emit('answer', {
      target: caller,
      sdp: answer
    });
  };

  const handleAnswer = async ({ caller, sdp }) => {
    const pc = peerConnectionsRef.current[caller];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  };

  const handleIceCandidate = ({ caller, candidate }) => {
    const pc = peerConnectionsRef.current[caller];
    if (pc) {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white rounded-lg overflow-hidden">
      <div className="flex-1 relative">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 left-4 text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
          You ({user.name})
        </div>
      </div>
      
      {/* Remote videos would go here in a grid */}

      <div className="h-16 bg-gray-800 flex items-center justify-between px-6">
        <div className="flex gap-4">
          <button 
            onClick={toggleMute}
            className={`p-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'}`}
          >
            {isMuted ? '🔇 Muted' : '🎤 Mute'}
          </button>
          <button 
            onClick={toggleVideo}
            className={`p-2 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'}`}
          >
            {isVideoOff ? '🚫 Video Off' : '📷 Video Off'}
          </button>
        </div>
        
        <div className="text-sm text-gray-400">
          Participants: {participants.length + 1}
        </div>

        <button 
          onClick={onLeave}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-medium"
        >
          Leave Session
        </button>
      </div>
    </div>
  );
};

export default LiveClassRoom;
