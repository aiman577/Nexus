import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Phone,
  MonitorUp, MonitorX, Users, Clock, Signal
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { entrepreneurs, investors } from '../../data/users';
import { User } from '../../types';

type CallPhase = 'lobby' | 'in-call' | 'ended';

const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
};

interface RemoteTileProps {
  participant: User;
  isSpeaking: boolean;
  isMuted: boolean;
  large?: boolean;
}

const RemoteTile: React.FC<RemoteTileProps> = ({ participant, isSpeaking, isMuted, large = false }) => (
  <div
    className={`relative bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center transition-shadow duration-300 ${
      isSpeaking ? 'ring-2 ring-success-500' : 'ring-1 ring-gray-700'
    } ${large ? 'min-h-[16rem]' : 'min-h-[10rem]'}`}
  >
    <img
      src={participant.avatarUrl}
      alt={participant.name}
      className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm scale-110"
    />
    <div className="relative flex flex-col items-center">
      <img
        src={participant.avatarUrl}
        alt={participant.name}
        className={`rounded-full object-cover border-2 border-gray-600 ${large ? 'h-24 w-24' : 'h-16 w-16'}`}
      />
      {isSpeaking && (
        <div className="mt-2 flex items-end gap-0.5 h-4" aria-hidden="true">
          <span className="w-1 bg-success-500 rounded-full animate-pulse" style={{ height: '60%' }} />
          <span className="w-1 bg-success-500 rounded-full animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
          <span className="w-1 bg-success-500 rounded-full animate-pulse" style={{ height: '45%', animationDelay: '300ms' }} />
        </div>
      )}
    </div>
    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-gray-900/70 text-white text-xs px-2 py-1 rounded-md">
      {isMuted ? <MicOff size={12} className="text-error-500" /> : <Mic size={12} className="text-success-500" />}
      <span>{participant.name}</span>
    </div>
  </div>
);

export const VideoCallPage: React.FC = () => {
  const { user } = useAuth();

  const [phase, setPhase] = useState<CallPhase>('lobby');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [speakerIndex, setSpeakerIndex] = useState(0);
  const [remoteMutes, setRemoteMutes] = useState<boolean[]>([false, false]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // The other side of the call is mocked with real platform users.
  const remoteParticipants: User[] = user?.role === 'entrepreneur'
    ? investors.slice(0, 2)
    : entrepreneurs.slice(0, 2);

  const stopStream = (stream: MediaStream | null) => {
    stream?.getTracks().forEach(track => track.stop());
  };

  const attachCameraPreview = useCallback(() => {
    if (localVideoRef.current && cameraStreamRef.current) {
      localVideoRef.current.srcObject = cameraStreamRef.current;
    }
  }, []);

  const acquireCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;
      setCameraError(null);
      attachCameraPreview();
    } catch {
      setCameraError('Camera or microphone unavailable. You can still join — others will see your avatar.');
      setCameraOn(false);
    }
  }, [attachCameraPreview]);

  useEffect(() => {
    acquireCamera();
    return () => {
      stopStream(cameraStreamRef.current);
      stopStream(screenStreamRef.current);
      cameraStreamRef.current = null;
      screenStreamRef.current = null;
    };
  }, [acquireCamera]);

  // The video element remounts between lobby and in-call layouts.
  useEffect(() => {
    attachCameraPreview();
  }, [phase, cameraOn, isSharing, attachCameraPreview]);

  // Call timer.
  useEffect(() => {
    if (phase !== 'in-call') return;
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Simulate the remote side: rotate the active speaker and occasionally flip mute states.
  useEffect(() => {
    if (phase !== 'in-call') return;
    const interval = setInterval(() => {
      setSpeakerIndex(prev => (prev + 1) % (remoteParticipants.length + 1));
      if (Math.random() < 0.3) {
        setRemoteMutes(prev => prev.map(m => (Math.random() < 0.5 ? !m : m)));
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [phase, remoteParticipants.length]);

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    cameraStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = next; });
    if (phase === 'in-call') toast(next ? 'Microphone on' : 'Microphone muted', { icon: next ? '🎙️' : '🔇' });
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    if (next && !cameraStreamRef.current) {
      acquireCamera();
    }
    setCameraOn(next);
    cameraStreamRef.current?.getVideoTracks().forEach(track => { track.enabled = next; });
  };

  const stopScreenShare = useCallback(() => {
    stopStream(screenStreamRef.current);
    screenStreamRef.current = null;
    setIsSharing(false);
  }, []);

  const toggleScreenShare = async () => {
    if (isSharing) {
      stopScreenShare();
      toast('Screen sharing stopped');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      setIsSharing(true);
      // Browser "Stop sharing" bar also ends the share.
      stream.getVideoTracks()[0].addEventListener('ended', stopScreenShare);
      toast.success('You are sharing your screen');
    } catch {
      toast.error('Screen share was cancelled');
    }
  };

  useEffect(() => {
    if (isSharing && screenVideoRef.current && screenStreamRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current;
    }
  }, [isSharing]);

  const startCall = () => {
    setElapsed(0);
    setPhase('in-call');
    toast.success('Call started');
  };

  const endCall = () => {
    stopScreenShare();
    setPhase('ended');
    toast('Call ended', { icon: '📞' });
  };

  const returnToLobby = () => {
    setElapsed(0);
    setPhase('lobby');
    if (!cameraStreamRef.current) acquireCamera();
  };

  if (!user) return null;

  const localTile = (
    <div className="relative bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center min-h-[10rem] ring-1 ring-gray-700">
      {cameraOn && !cameraError ? (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
        />
      ) : (
        <div className="flex flex-col items-center text-gray-400 py-8">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-16 w-16 rounded-full object-cover border-2 border-gray-600"
          />
          <span className="mt-2 text-xs">Camera off</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-gray-900/70 text-white text-xs px-2 py-1 rounded-md">
        {micOn ? <Mic size={12} className="text-success-500" /> : <MicOff size={12} className="text-error-500" />}
        <span>You</span>
      </div>
    </div>
  );

  // ----- Lobby -----
  if (phase === 'lobby') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Call</h1>
          <p className="text-gray-600">Check your camera and microphone before joining</p>
        </div>

        <Card>
          <CardBody className="space-y-4">
            <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
              {cameraOn && !cameraError ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-24 w-24 rounded-full object-cover border-2 border-gray-600"
                  />
                  <span className="mt-3 text-sm">{cameraError ?? 'Camera is off'}</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-gray-900/70 text-white text-sm px-3 py-1 rounded-md">
                {user.name}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={toggleMic}
                aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                className={`p-3 rounded-full transition-colors duration-200 ${
                  micOn ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-error-500 text-white hover:bg-error-700'
                }`}
              >
                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button
                onClick={toggleCamera}
                aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
                className={`p-3 rounded-full transition-colors duration-200 ${
                  cameraOn ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-error-500 text-white hover:bg-error-700'
                }`}
              >
                {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
              <Button size="lg" leftIcon={<Phone size={18} />} onClick={startCall}>
                Start Call
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
              <Users size={16} />
              In this call ({remoteParticipants.length + 1})
            </div>
            <div className="flex items-center gap-4">
              {[user, ...remoteParticipants].map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <img src={p.avatarUrl} alt={p.name} className="h-8 w-8 rounded-full object-cover" />
                  <span className="text-sm text-gray-700">{p.id === user.id ? 'You' : p.name}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ----- Ended -----
  if (phase === 'ended') {
    return (
      <div className="max-w-md mx-auto animate-fade-in">
        <Card>
          <CardBody className="text-center space-y-4 py-10">
            <div className="mx-auto h-14 w-14 rounded-full bg-error-50 flex items-center justify-center">
              <PhoneOff size={26} className="text-error-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Call ended</h2>
              <p className="text-gray-600 mt-1">Duration: {formatDuration(elapsed)}</p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={returnToLobby}>
                Back to Lobby
              </Button>
              <Button leftIcon={<Phone size={16} />} onClick={startCall}>
                Rejoin
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ----- In call -----
  const localIsSpeaking = speakerIndex === remoteParticipants.length && micOn;

  return (
    <div className="animate-fade-in">
      <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4 min-h-[70vh]">
        {/* Top bar */}
        <div className="flex items-center justify-between text-gray-300 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-error-500 animate-pulse" />
            <span className="font-medium text-white">Investor Sync</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> {formatDuration(elapsed)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={14} /> {remoteParticipants.length + 1}
            </span>
            <span className="flex items-center gap-1.5 text-success-500">
              <Signal size={14} /> Good
            </span>
          </div>
        </div>

        {/* Stage */}
        {isSharing ? (
          <div className="flex-1 flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 bg-black rounded-xl overflow-hidden ring-1 ring-gray-700">
              <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-primary-600 text-white text-xs px-2.5 py-1 rounded-md">
                <MonitorUp size={12} /> You are presenting
              </div>
            </div>
            <div className="flex lg:flex-col gap-3 lg:w-56">
              {remoteParticipants.map((p, i) => (
                <div key={p.id} className="flex-1 lg:flex-none">
                  <RemoteTile participant={p} isSpeaking={speakerIndex === i} isMuted={remoteMutes[i]} />
                </div>
              ))}
              <div className="flex-1 lg:flex-none">{localTile}</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
            {remoteParticipants.map((p, i) => (
              <RemoteTile key={p.id} participant={p} isSpeaking={speakerIndex === i} isMuted={remoteMutes[i]} large />
            ))}
            <div className={`relative rounded-xl overflow-hidden ${localIsSpeaking ? 'ring-2 ring-success-500' : ''}`}>
              {localTile}
            </div>
          </div>
        )}

        {/* Control bar */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={toggleMic}
            aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
            title={micOn ? 'Mute' : 'Unmute'}
            className={`p-3.5 rounded-full transition-colors duration-200 ${
              micOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-error-500 text-white hover:bg-error-700'
            }`}
          >
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            onClick={toggleCamera}
            aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
            title={cameraOn ? 'Camera off' : 'Camera on'}
            className={`p-3.5 rounded-full transition-colors duration-200 ${
              cameraOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-error-500 text-white hover:bg-error-700'
            }`}
          >
            {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
          <button
            onClick={toggleScreenShare}
            aria-label={isSharing ? 'Stop sharing screen' : 'Share screen'}
            title={isSharing ? 'Stop sharing' : 'Share screen'}
            className={`p-3.5 rounded-full transition-colors duration-200 ${
              isSharing ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            {isSharing ? <MonitorX size={20} /> : <MonitorUp size={20} />}
          </button>
          <button
            onClick={endCall}
            aria-label="End call"
            title="End call"
            className="px-6 py-3.5 rounded-full bg-error-500 text-white hover:bg-error-700 transition-colors duration-200"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
