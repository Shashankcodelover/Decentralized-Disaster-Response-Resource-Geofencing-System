import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@mirage/shared-types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline';

/**
 * Manages WebRTC P2P mesh + Yjs CRDT sync.
 * When the central server is unreachable, peers sync directly via DataChannels.
 */
export function useP2PSync(socket: Socket | null, documentName: string = 'disaster-response-crdt') {
  const ydocRef = useRef(new Y.Doc());
  const indexeddbProviderRef = useRef<IndexeddbPersistence | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const [peerCount, setPeerCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  // Buffer for incoming WebRTC chunks: peerId -> array of Uint8Arrays
  const incomingChunksRef = useRef<Map<string, Uint8Array[]>>(new Map());

  // WebRTC DataChannel chunking limit (16KB is highly safe for cross-browser compat)
  const CHUNK_SIZE = 16384; 

  useEffect(() => {
    // Initialize IndexedDB Persistence for offline durability
    const provider = new IndexeddbPersistence(documentName, ydocRef.current);
    indexeddbProviderRef.current = provider;

    provider.on('synced', () => {
      console.log('[CRDT] IndexedDB state loaded.');
      if (!socket || !socket.connected) {
        setSyncStatus('synced'); // We have offline state
      }
    });

    return () => {
      provider.destroy();
    };
  }, [documentName]);

  useEffect(() => {
    if (!socket) return;
    const ydoc = ydocRef.current;

    const applyRemoteUpdate = (payload: { update: number[] | Uint8Array; peerId: string }) => {
      Y.applyUpdate(ydoc, new Uint8Array(payload.update), 'remote');
      setSyncStatus('synced');
    };

    const onLocalUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return;
      const payload = { update: Array.from(update), peerId: socket.id ?? 'local' };
      if (socket.connected) socket.emit(SOCKET_EVENTS.CRDT_UPDATE, payload);
      
      // Binary DataChannel send: eliminates JSON serialization bloat and avoids WebRTC size limits
      for (const [, ch] of channelsRef.current) {
        if (ch.readyState === 'open') {
          sendChunkedBinary(ch, update);
        }
      }
    };

    function sendChunkedBinary(channel: RTCDataChannel, data: Uint8Array) {
      if (data.byteLength <= CHUNK_SIZE) {
        // Send single block (flag 0x00 indicates complete payload)
        const block = new Uint8Array(1 + data.byteLength);
        block[0] = 0x00;
        block.set(data, 1);
        channel.send(block);
      } else {
        // Chunking required
        const totalChunks = Math.ceil(data.byteLength / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, data.byteLength);
          const chunk = data.slice(start, end);
          
          // Flag 0x01 = chunk, Flag 0x02 = final chunk
          const isFinal = i === totalChunks - 1;
          const block = new Uint8Array(1 + chunk.byteLength);
          block[0] = isFinal ? 0x02 : 0x01;
          block.set(chunk, 1);
          channel.send(block);
        }
      }
    }

    const onConnect = () => {
      setSyncStatus('syncing');
      // Flush full accumulated Y.Doc state to server on reconnect
      const state = Y.encodeStateAsUpdate(ydoc);
      const payload = { update: Array.from(state), peerId: socket.id ?? 'local' };
      socket.emit(SOCKET_EVENTS.CRDT_UPDATE, payload);
      setSyncStatus('synced');
    };

    const onDisconnect = () => {
      setSyncStatus('offline');
    };

    ydoc.on('update', onLocalUpdate);
    socket.on(SOCKET_EVENTS.CRDT_UPDATE, applyRemoteUpdate);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Initial status set
    setSyncStatus(socket.connected ? 'synced' : 'offline');

    socket.on(SOCKET_EVENTS.PEER_JOINED, ({ peerId }: { peerId: string }) => {
      createPeerConnection(peerId, true);
    });

    socket.on(SOCKET_EVENTS.PEER_OFFER, async ({ from, data }: { from: string; data: RTCSessionDescriptionInit }) => {
      const pc = createPeerConnection(from, false);
      await pc.setRemoteDescription(data);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit(SOCKET_EVENTS.PEER_ANSWER, { to: from, data: answer });
    });

    socket.on(SOCKET_EVENTS.PEER_ANSWER, async ({ from, data }: { from: string; data: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(from);
      if (pc) await pc.setRemoteDescription(data);
    });

    socket.on(SOCKET_EVENTS.PEER_ICE, async ({ from, data }: { from: string; data: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(from);
      if (pc) await pc.addIceCandidate(data);
    });

    socket.on(SOCKET_EVENTS.PEER_LEFT, ({ peerId }: { peerId: string }) => {
      peersRef.current.get(peerId)?.close();
      peersRef.current.delete(peerId);
      channelsRef.current.delete(peerId);
      setPeerCount(peersRef.current.size);
    });

    function createPeerConnection(peerId: string, isInitiator: boolean): RTCPeerConnection {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

      pc.onicecandidate = (e) => {
        if (e.candidate && socket) socket.emit(SOCKET_EVENTS.PEER_ICE, { to: peerId, data: e.candidate });
      };

      if (isInitiator) {
        const channel = pc.createDataChannel('crdt');
        setupDataChannel(channel, peerId);
        pc.createOffer().then((offer) => {
          pc.setLocalDescription(offer);
          if (socket) socket.emit(SOCKET_EVENTS.PEER_OFFER, { to: peerId, data: offer });
        });
      } else {
        pc.ondatachannel = (e) => setupDataChannel(e.channel, peerId);
      }

      peersRef.current.set(peerId, pc);
      setPeerCount(peersRef.current.size);
      return pc;
    }

    function setupDataChannel(channel: RTCDataChannel, peerId: string) {
      // Configure channel to receive binary data as ArrayBuffer
      channel.binaryType = 'arraybuffer';
      channelsRef.current.set(peerId, channel);
      
      channel.onopen = () => {
        const state = Y.encodeStateAsUpdate(ydoc);
        sendChunkedBinary(channel, state);
        setSyncStatus('synced');
      };
      
      channel.onmessage = (e) => {
        try {
          if (e.data instanceof ArrayBuffer) {
            const raw = new Uint8Array(e.data);
            const flag = raw[0];
            const payload = raw.slice(1);
            
            if (flag === 0x00) {
              // Single complete message
              applyRemoteUpdate({ update: payload, peerId });
            } else if (flag === 0x01) {
              // Partial chunk
              let chunks = incomingChunksRef.current.get(peerId);
              if (!chunks) {
                chunks = [];
                incomingChunksRef.current.set(peerId, chunks);
              }
              chunks.push(payload);
            } else if (flag === 0x02) {
              // Final chunk
              const chunks = incomingChunksRef.current.get(peerId) || [];
              chunks.push(payload);
              
              // Reassemble
              const totalLength = chunks.reduce((acc, c) => acc + c.byteLength, 0);
              const combined = new Uint8Array(totalLength);
              let offset = 0;
              for (const c of chunks) {
                combined.set(c, offset);
                offset += c.byteLength;
              }
              
              // Apply and clear buffer
              incomingChunksRef.current.delete(peerId);
              applyRemoteUpdate({ update: combined, peerId });
            }
          } else {
            // Legacy JSON fallback
            const msg = JSON.parse(e.data as string);
            if (msg.type === 'crdt') applyRemoteUpdate(msg.payload);
          }
        } catch {
          console.warn('[P2P] Received malformed DataChannel message, ignoring');
        }
      };
    }

    return () => {
      ydoc.off('update', onLocalUpdate);
      socket.off(SOCKET_EVENTS.CRDT_UPDATE);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.PEER_JOINED);
      socket.off(SOCKET_EVENTS.PEER_OFFER);
      socket.off(SOCKET_EVENTS.PEER_ANSWER);
      socket.off(SOCKET_EVENTS.PEER_ICE);
      socket.off(SOCKET_EVENTS.PEER_LEFT);
      for (const [, pc] of peersRef.current) pc.close();
    };
  }, [socket]);

  return { ydoc: ydocRef.current, peerCount, syncStatus };
}
