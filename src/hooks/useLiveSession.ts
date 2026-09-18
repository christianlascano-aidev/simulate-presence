/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useCallback, useEffect } from 'react';
import { createBlob, decodeAudioData, decode } from '../utils';

const audioWorkletCode = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.index = 0;
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.index++] = channelData[i];
        if (this.index >= this.bufferSize) {
          this.port.postMessage(this.buffer.slice());
          this.index = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

interface UseLiveSessionProps {
  onMessage: (speaker: 'user' | 'customer' | 'system', text: string, isStreaming: boolean) => void;
  onTurnComplete: () => void;
  onError: (error: string) => void;
  onDisconnect: () => void;
}

export const useLiveSession = ({ onMessage, onTurnComplete, onError, onDisconnect }: UseLiveSessionProps) => {
  const [isActive, setIsActive] = useState(false);
  const isActiveRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<string>('');

  const webSocket = useRef<WebSocket | null>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const microphoneStream = useRef<MediaStream | null>(null);
  const audioWorkletNode = useRef<AudioWorkletNode | null>(null);
  const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioPlaybackSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextAudioPlaybackStartTime = useRef<number>(0);
  const currentUserTranscript = useRef('');
  const currentCustomerTranscript = useRef('');

  const cleanup = useCallback(() => {
    microphoneStream.current?.getTracks().forEach(t => t.stop());
    if (audioWorkletNode.current) {
      audioWorkletNode.current.port.onmessage = null;
      audioWorkletNode.current.disconnect();
    }
    mediaStreamSource.current?.disconnect();
    if (inputAudioContext.current?.state !== 'closed') inputAudioContext.current?.close().catch(() => {});
    if (outputAudioContext.current?.state !== 'closed') outputAudioContext.current?.close().catch(() => {});
    for (const src of audioPlaybackSources.current) { try { src.stop(); } catch {} }
    audioPlaybackSources.current.clear();
    if (webSocket.current) {
      webSocket.current.onmessage = null;
      webSocket.current.onclose = null;
      webSocket.current.onerror = null;
      webSocket.current.close();
      webSocket.current = null;
    }
    isActiveRef.current = false;
    setIsActive(false);
    inputAudioContext.current = null;
    outputAudioContext.current = null;
    microphoneStream.current = null;
    audioWorkletNode.current = null;
    mediaStreamSource.current = null;
    nextAudioPlaybackStartTime.current = 0;
    setIsMuted(false);
  }, []);

  const stopSession = useCallback(() => {
    setStatus('Disconnecting...');
    if (webSocket.current?.readyState === WebSocket.OPEN) {
      webSocket.current.send(JSON.stringify({ type: 'end' }));
    }
    cleanup();
    onDisconnect();
    setStatus('Call Ended');
  }, [cleanup, onDisconnect]);

  const toggleMute = useCallback(() => {
    if (!microphoneStream.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    microphoneStream.current.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
  }, [isMuted]);

  const startAudioStreaming = useCallback(async () => {
    if (!audioWorkletNode.current && inputAudioContext.current && microphoneStream.current) {
      try {
        if (inputAudioContext.current.state === 'suspended') await inputAudioContext.current.resume();
        mediaStreamSource.current = inputAudioContext.current.createMediaStreamSource(microphoneStream.current);
        const blob = new Blob([audioWorkletCode], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        await inputAudioContext.current.audioWorklet.addModule(workletUrl);
        audioWorkletNode.current = new AudioWorkletNode(inputAudioContext.current, 'pcm-processor');
        audioWorkletNode.current.port.onmessage = (event) => {
          if (webSocket.current?.readyState === WebSocket.OPEN) {
            const pcmData = createBlob(event.data);
            webSocket.current.send(JSON.stringify({ type: 'audio', data: pcmData.data }));
          }
        };
        mediaStreamSource.current.connect(audioWorkletNode.current);
        setStatus('Call Active');
      } catch (err: any) {
        console.error('Audio worklet error:', err);
        setStatus('Audio Error');
      }
    }
  }, []);

  const startSession = useCallback(async (systemPrompt: string, voiceGender: 'male' | 'female') => {
    if (isActiveRef.current) return;
    cleanup();
    isActiveRef.current = true;
    setIsActive(true);
    setStatus('Initializing...');

    try {
      inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      microphoneStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true
        } 
      });
    } catch (err: any) {
      onError(`Microphone access failed: ${err.message}`);
      isActiveRef.current = false;
      setIsActive(false);
      setStatus('Mic Error');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/live`;
    setStatus('Connecting...');
    const ws = new WebSocket(wsUrl);
    webSocket.current = ws;

    ws.onopen = () => {
      console.log('[useLiveSession] WebSocket connected');
      ws.send(JSON.stringify({ type: 'setup', systemPrompt, voiceGender }));
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'status') {
          const s = msg.message as string;
          setStatus(s);
          if (s === 'Ready') {
            await startAudioStreaming();
          } else if (s === 'interrupted') {
            for (const src of audioPlaybackSources.current) { try { src.stop(); } catch {} }
            audioPlaybackSources.current.clear();
            nextAudioPlaybackStartTime.current = 0;
          }
        }

        if (msg.type === 'transcript') {
          const text = msg.text as string;
          if (msg.speaker === 'user') {
            currentUserTranscript.current += text;
            onMessage('user', currentUserTranscript.current, true); // isStreaming = true
          } else if (msg.speaker === 'customer') {
            currentCustomerTranscript.current += text;
            onMessage('customer', currentCustomerTranscript.current, true); // isStreaming = true
          }
        }

        if (msg.type === 'audio' && outputAudioContext.current) {
          const audioBytes = decode(msg.data);
          nextAudioPlaybackStartTime.current = Math.max(
            nextAudioPlaybackStartTime.current,
            outputAudioContext.current.currentTime
          );
          const audioBuffer = decodeAudioData(audioBytes, outputAudioContext.current, 24000, 1);
          const source = outputAudioContext.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(outputAudioContext.current.destination);
          source.addEventListener('ended', () => audioPlaybackSources.current.delete(source));
          source.start(nextAudioPlaybackStartTime.current);
          nextAudioPlaybackStartTime.current += audioBuffer.duration;
          audioPlaybackSources.current.add(source);
        }

        if (msg.type === 'turnComplete') {
          if (currentUserTranscript.current.trim()) {
            onMessage('user', currentUserTranscript.current, false); // isStreaming = false (finalized)
          }
          if (currentCustomerTranscript.current.trim()) {
            onMessage('customer', currentCustomerTranscript.current, false); // isStreaming = false
          }
          currentUserTranscript.current = '';
          currentCustomerTranscript.current = '';
          onTurnComplete();
        }

        if (msg.type === 'error') {
          onError(msg.message || 'Unknown error from server');
        }
      } catch (err) {
        console.error('[useLiveSession] Failed to parse message:', err);
      }
    };

    ws.onerror = (err) => console.error('[useLiveSession] WS error:', err);

    ws.onclose = (event) => {
      console.log(`[useLiveSession] WS closed: ${event.code}`);
      if (isActiveRef.current) {
        cleanup();
        onDisconnect();
        setStatus('Call Ended');
      }
    };
  }, [cleanup, onMessage, onTurnComplete, onError, onDisconnect, startAudioStreaming]);

  useEffect(() => { return () => { cleanup(); }; }, [cleanup]);

  return { isActive, isMuted, status, startSession, stopSession, toggleMute };
};
