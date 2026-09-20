/**
 * Group calling on top of the existing peer-to-peer engine: one peer connection per
 * other participant (a mesh), the same private signalling table, and the same
 * relay/STUN configuration. Media never touches a server.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FALLBACK_ICE_SERVERS, normalizeIceServers } from '@/features/calls/callTransport';
import {
  MAX_GROUP_PARTICIPANTS,
  normalizeGroupRoster,
  shouldCreateOffer,
  zoeSpeakerId,
  type GroupCallSignalType,
  type GroupParticipant,
} from '@/features/calls/groupCallMesh';
import { ZoeGroupCallVoiceBridge } from '@/features/calls/zoeGroupCallVoiceBridge';
import { speakWithDeepgram, stopDeepgramSpeech, warmDeepgramTTS } from '@/utils/deepgramTTS';

type GroupCallState = 'idle' | 'starting' | 'active' | 'ended';

interface GroupSignalPayload {
  roomId: string;
  roster?: string[];
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  displayName?: string;
  text?: string;
}

const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 20 } },
};

export const useGroupCall = (currentUserId: string | null) => {
  const [callState, setCallState] = useState<GroupCallState>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [zoeCaption, setZoeCaption] = useState<string | null>(null);
  const [zoeSpeaking, setZoeSpeaking] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE_SERVERS);
  const roomIdRef = useRef<string | null>(null);
  const rosterRef = useRef<string[]>([]);
  const zoeVoiceRef = useRef(new ZoeGroupCallVoiceBridge());
  const zoeTrackRef = useRef<MediaStreamTrack | null>(null);

  const updateParticipant = useCallback((userId: string, patch: Partial<GroupParticipant>) => {
    setParticipants(prev => {
      const existing = prev.find(entry => entry.userId === userId);
      if (!existing) {
        return [
          ...prev,
          {
            userId,
            displayName: patch.displayName ?? 'Member',
            avatarUrl: patch.avatarUrl ?? null,
            connectionState: patch.connectionState ?? 'inviting',
            hasAudio: patch.hasAudio ?? false,
            hasVideo: patch.hasVideo ?? false,
          },
        ];
      }
      return prev.map(entry => (entry.userId === userId ? { ...entry, ...patch } : entry));
    });
  }, []);

  const sendSignal = useCallback(
    async (receiverId: string, signalType: GroupCallSignalType, payload: GroupSignalPayload) => {
      if (!currentUserId || receiverId === currentUserId) return;
      const { error: signalError } = await supabase.from('quantum_call_signals').insert({
        caller_id: currentUserId,
        receiver_id: receiverId,
        signal_type: signalType,
        signal_data: payload as unknown as never,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      });
      if (signalError) console.error('[GroupCall] signal failed', signalError.message);
    },
    [currentUserId],
  );

  const getRemoteStream = useCallback((peerId: string): MediaStream => {
    const existing = remoteStreamsRef.current.get(peerId);
    if (existing) return existing;
    const stream = new MediaStream();
    remoteStreamsRef.current.set(peerId, stream);
    return stream;
  }, []);

  const ensurePeer = useCallback(
    (peerId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const peer = new RTCPeerConnection({ iceServers: iceServersRef.current, bundlePolicy: 'max-bundle' });
      localStreamRef.current?.getTracks().forEach(track => {
        if (localStreamRef.current) peer.addTrack(track, localStreamRef.current);
      });
      const zoeTrack = zoeTrackRef.current;
      if (zoeTrack) peer.addTrack(zoeTrack, new MediaStream([zoeTrack]));

      peer.ontrack = event => {
        const stream = getRemoteStream(peerId);
        event.streams[0]?.getTracks().forEach(track => {
          if (!stream.getTracks().includes(track)) stream.addTrack(track);
        });
        updateParticipant(peerId, {
          hasAudio: stream.getAudioTracks().length > 0,
          hasVideo: stream.getVideoTracks().length > 0,
        });
      };

      peer.onicecandidate = event => {
        if (!event.candidate || !roomIdRef.current) return;
        void sendSignal(peerId, 'group-ice', { roomId: roomIdRef.current, candidate: event.candidate.toJSON() });
      };

      peer.onconnectionstatechange = () => {
        updateParticipant(peerId, { connectionState: peer.connectionState });
      };

      peersRef.current.set(peerId, peer);
      return peer;
    },
    [getRemoteStream, sendSignal, updateParticipant],
  );

  const flushCandidates = useCallback(async (peerId: string, peer: RTCPeerConnection) => {
    const queued = pendingCandidatesRef.current.get(peerId);
    if (!queued?.length) return;
    pendingCandidatesRef.current.delete(peerId);
    for (const candidate of queued) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (candidateError) {
        console.warn('[GroupCall] candidate rejected', candidateError);
      }
    }
  }, []);

  const startLocalMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
      localStreamRef.current = stream;
      return stream;
    } catch {
      setError('Camera or microphone is unavailable on this device.');
      return null;
    }
  }, []);

  const refreshIceServers = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('zoe-call-turn-credentials');
      const servers = normalizeIceServers((data as { iceServers?: RTCIceServer[] } | null)?.iceServers);
      if (servers.length > 0) iceServersRef.current = servers;
    } catch {
      iceServersRef.current = FALLBACK_ICE_SERVERS;
    }
  }, []);

  const leaveGroupCall = useCallback(async () => {
    const room = roomIdRef.current;
    const peerIds = Array.from(peersRef.current.keys());
    peersRef.current.forEach(peer => peer.close());
    peersRef.current.clear();
    remoteStreamsRef.current.clear();
    pendingCandidatesRef.current.clear();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    stopDeepgramSpeech();
    zoeVoiceRef.current.stop();
    zoeTrackRef.current = null;
    rosterRef.current = [];
    roomIdRef.current = null;
    setRoomId(null);
    setParticipants([]);
    setCallState('ended');
    if (room) {
      await Promise.all(peerIds.map(peerId => sendSignal(peerId, 'group-leave', { roomId: room })));
    }
  }, [sendSignal]);

  const startGroupCall = useCallback(
    async (memberIds: string[]) => {
      if (!currentUserId) return;
      setError(null);
      setCallState('starting');
      const roster = normalizeGroupRoster(currentUserId, memberIds);
      if (roster.length === 0) {
        setError('Pick at least one person to call.');
        setCallState('idle');
        return;
      }
      const stream = await startLocalMedia();
      if (!stream) {
        setCallState('idle');
        return;
      }
      zoeTrackRef.current = await zoeVoiceRef.current.start();
      warmDeepgramTTS();
      await refreshIceServers();
      const room = crypto.randomUUID();
      rosterRef.current = roster;
      roomIdRef.current = room;
      setRoomId(room);
      setCallState('active');
      roster.forEach(peerId => updateParticipant(peerId, { connectionState: 'inviting' }));
      await Promise.all(
        roster.map(peerId => sendSignal(peerId, 'group-invite', { roomId: room, roster: [currentUserId, ...roster] })),
      );
    },
    [currentUserId, refreshIceServers, sendSignal, startLocalMedia, updateParticipant],
  );

  const joinGroupCall = useCallback(
    async (room: string, roster: string[]) => {
      if (!currentUserId) return;
      setError(null);
      setCallState('starting');
      const stream = await startLocalMedia();
      if (!stream) {
        setCallState('idle');
        return;
      }
      zoeTrackRef.current = await zoeVoiceRef.current.start();
      warmDeepgramTTS();
      await refreshIceServers();
      roomIdRef.current = room;
      setRoomId(room);
      setCallState('active');
      const peers = normalizeGroupRoster(currentUserId, roster);
      rosterRef.current = peers;
      await Promise.all(peers.map(peerId => sendSignal(peerId, 'group-join', { roomId: room, roster: [currentUserId, ...peers] })));
    },
    [currentUserId, refreshIceServers, sendSignal, startLocalMedia],
  );

  const speakZoeReply = useCallback(async (prompt: string) => {
    if (!currentUserId || !roomIdRef.current) return;
    setZoeSpeaking(true);
    try {
      const { data, error: responseError } = await supabase.functions.invoke('zoe-core-intelligence', {
        body: {
          command: prompt,
          userId: currentUserId,
          mode: 'deep_thinking',
          context: { currentPage: '/calls/group', groupCall: true },
          options: { verbose_reasoning: false },
        },
      });
      if (responseError) throw responseError;
      const reply = String((data as { message?: string; response?: string } | null)?.message
        ?? (data as { response?: string } | null)?.response
        ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim().slice(0, 900);
      if (!reply) throw new Error('Zoe returned no spoken response.');
      setZoeCaption(reply);
      await Promise.all(rosterRef.current.map(peerId => sendSignal(peerId, 'group-zoe-caption', { roomId: roomIdRef.current ?? '', text: reply })));
      await speakWithDeepgram(reply);
    } catch (zoeError) {
      console.warn('[GroupCall] Zoe reply failed', zoeError);
      setError('Zoe could not speak just now.');
    } finally {
      setZoeSpeaking(false);
    }
  }, [currentUserId, sendSignal]);

  const askZoe = useCallback(async (value: string) => {
    const prompt = value.replace(/\s+/g, ' ').trim().slice(0, 400);
    if (!prompt || !currentUserId || !roomIdRef.current) return;
    const speaker = zoeSpeakerId(currentUserId, rosterRef.current);
    if (speaker === currentUserId) {
      await speakZoeReply(prompt);
      return;
    }
    await sendSignal(speaker, 'group-zoe-request', { roomId: roomIdRef.current, text: prompt });
  }, [currentUserId, sendSignal, speakZoeReply]);

  const handleSignal = useCallback(
    async (signalType: GroupCallSignalType, senderId: string, payload: GroupSignalPayload) => {
      if (!currentUserId) return;

      if (signalType === 'group-invite') {
        updateParticipant(senderId, { connectionState: 'inviting' });
        window.dispatchEvent(
          new CustomEvent('group-call-invite', { detail: { roomId: payload.roomId, from: senderId, roster: payload.roster ?? [] } }),
        );
        return;
      }

      if (!roomIdRef.current || payload.roomId !== roomIdRef.current) return;
      if (peersRef.current.size >= MAX_GROUP_PARTICIPANTS - 1 && !peersRef.current.has(senderId)) return;

      if (signalType === 'group-zoe-request' && payload.text) {
        if (zoeSpeakerId(currentUserId, rosterRef.current) === currentUserId) await speakZoeReply(payload.text.slice(0, 400));
        return;
      }

      if (signalType === 'group-zoe-caption' && payload.text) {
        setZoeCaption(payload.text.slice(0, 900));
        return;
      }

      if (signalType === 'group-join') {
        updateParticipant(senderId, { connectionState: 'new' });
        if (!shouldCreateOffer(currentUserId, senderId)) return;
        const peer = ensurePeer(senderId);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await sendSignal(senderId, 'group-offer', { roomId: roomIdRef.current, sdp: offer });
        return;
      }

      if (signalType === 'group-offer' && payload.sdp) {
        const peer = ensurePeer(senderId);
        await peer.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await flushCandidates(senderId, peer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await sendSignal(senderId, 'group-answer', { roomId: roomIdRef.current, sdp: answer });
        return;
      }

      if (signalType === 'group-answer' && payload.sdp) {
        const peer = peersRef.current.get(senderId);
        if (!peer) return;
        await peer.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await flushCandidates(senderId, peer);
        return;
      }

      if (signalType === 'group-ice' && payload.candidate) {
        const peer = peersRef.current.get(senderId);
        if (!peer || !peer.remoteDescription) {
          const queued = pendingCandidatesRef.current.get(senderId) ?? [];
          queued.push(payload.candidate);
          pendingCandidatesRef.current.set(senderId, queued);
          return;
        }
        try {
          await peer.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (candidateError) {
          console.warn('[GroupCall] candidate rejected', candidateError);
        }
        return;
      }

      if (signalType === 'group-leave') {
        peersRef.current.get(senderId)?.close();
        peersRef.current.delete(senderId);
        remoteStreamsRef.current.delete(senderId);
        setParticipants(prev => prev.filter(entry => entry.userId !== senderId));
      }
    },
    [currentUserId, ensurePeer, flushCandidates, sendSignal, speakZoeReply, updateParticipant],
  );

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`group-calls-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quantum_call_signals',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        payload => {
          const row = payload.new as { id: string; signal_type: string; caller_id: string; signal_data: unknown };
          if (!row.signal_type.startsWith('group-')) return;
          const data = (row.signal_data ?? {}) as GroupSignalPayload;
          void handleSignal(row.signal_type as GroupCallSignalType, row.caller_id, data).finally(() => {
            void supabase.from('quantum_call_signals').delete().eq('id', row.id);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, handleSignal]);

  useEffect(() => () => {
    peersRef.current.forEach(peer => peer.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    stopDeepgramSpeech();
    zoeVoiceRef.current.stop();
  }, []);

  const getRemoteStreamFor = useCallback((peerId: string): MediaStream | null => remoteStreamsRef.current.get(peerId) ?? null, []);

  return {
    callState,
    roomId,
    participants,
    error,
    zoeCaption,
    zoeSpeaking,
    localStream: localStreamRef.current,
    startGroupCall,
    joinGroupCall,
    leaveGroupCall,
    askZoe,
    getRemoteStreamFor,
  };
};
