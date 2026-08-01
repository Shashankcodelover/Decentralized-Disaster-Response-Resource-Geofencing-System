import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@mirage/shared-types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline';

/**
 * Manages WebRTC P2P mesh + Yjs CRDT sync.
 * When the central server is unreachable, peers sync directly via DataChannels.
 */
export function useP2PSync(socket: Socket | null) {
  const ydocRef = useRef(new Y.Doc());
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const [peerCount, setPeerCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  useEffect(() => {
    if (!socket) return;
    const ydoc = ydocRef.current;

    const applyRemoteUpdate = (payload: { update: number[]; peerId: string }) => {
      Y.applyUpdate(ydoc, new Uint8Array(payload.update), 'remote');
      setSyncStatus('synced');
    };

    const onLocalUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return;
      const payload = { update: Array.from(update), peerId: socket.id ?? 'local' };
      if (socket.connected) socket.emit(SOCKET_EVENTS.CRDT_UPDATE, payload);
      for (const [, ch] of channelsRef.current) {
        if (ch.readyState === 'open') ch.send(JSON.stringify({ type: 'crdt', payload }));
      }
    };

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
      channelsRef.current.set(peerId, channel);
      channel.onopen = () => {
        const state = Y.encodeStateAsUpdate(ydoc);
        if (socket) {
          channel.send(JSON.stringify({ type: 'crdt', payload: { update: Array.from(state), peerId: socket.id } }));
        }
        setSyncStatus('synced');
      };
      channel.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.type === 'crdt') applyRemoteUpdate(msg.payload);
        } catch {
          // Ignore malformed P2P messages — do not crash the DataChannel listener
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
