import { useState, useEffect } from 'react';
import { useAppTheme } from '../hooks/ThemeContext';
import { generateKeyPair, exportPublicKey, importPublicKey, deriveSharedKey, encryptMessage, decryptMessage } from '../utils/crypto';
import type { Socket } from 'socket.io-client';

interface Props {
  socket: Socket | null;
  volunteers: any[];
  token: string | null;
}

export function CommsPanel({ socket, volunteers, token }: Props) {
  const { styles, themeMode, triggerHaptic } = useAppTheme();
  const isContrast = themeMode === 'contrast';

  const [localKeyPair, setLocalKeyPair] = useState<CryptoKeyPair | null>(null);
  const [selectedResponderId, setSelectedResponderId] = useState<string | null>(null);
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('Initializing E2EE keys...');

  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

  // 1. Generate local ECDH keys on mount and publish to PKI
  useEffect(() => {
    if (!token) {
      setStatus('Waiting for auth token...');
      return;
    }
    async function initKeys() {
      try {
        const keyPair = await generateKeyPair();
        setLocalKeyPair(keyPair);
        const pubBase64 = await exportPublicKey(keyPair.publicKey);

        const res = await fetch(`${API_URL}/api/v1/responders/keys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ publicKeyBase64: pubBase64, algorithm: 'ECDH-P256' })
        });
        
        if (res.ok) {
          setStatus('Local keys generated and published.');
        } else {
          setStatus('Failed to publish keys.');
        }
      } catch (err) {
        console.error(err);
        setStatus('Key generation failed.');
      }
    }
    initKeys();
  }, [token]);

  // 2. Fetch remote responder's key when selected
  useEffect(() => {
    if (!selectedResponderId || !localKeyPair || !token) {
      setSharedKey(null);
      return;
    }
    async function establishSession() {
      setStatus(`Fetching key for ${selectedResponderId.slice(0, 8)}...`);
      try {
        const res = await fetch(`${API_URL}/api/v1/responders/${selectedResponderId}/key`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          setStatus('Remote public key not found.');
          setSharedKey(null);
          return;
        }
        const data = await res.json();
        const remotePubKey = await importPublicKey(data.publicKeyBase64);
        const derived = await deriveSharedKey(localKeyPair!.privateKey, remotePubKey);
        setSharedKey(derived);
        setStatus(`E2EE session established.`);
        triggerHaptic('success');
      } catch (err) {
        console.error(err);
        setStatus('Failed to establish E2EE session.');
      }
    }
    establishSession();
  }, [selectedResponderId, localKeyPair, token]);

  // 3. Listen for incoming messages
  useEffect(() => {
    if (!socket || !sharedKey || !token) return;
    
    // Decode JWT to get local ID (in a real app, use a proper library like jwt-decode)
    let myId = '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      myId = payload.sub;
    } catch(e) {}
    
    const handleIncoming = async (msg: any) => {
      // Only decrypt if it's from the person we are chatting with
      if (msg.senderId === selectedResponderId && msg.encryptionMetadata) {
        try {
          const plaintext = await decryptMessage(
            sharedKey,
            msg.content,
            msg.encryptionMetadata.iv,
            msg.encryptionMetadata.authTag
          );
          setMessages(prev => [...prev, { senderId: msg.senderId, text: plaintext, timestamp: msg.timestamp }]);
          triggerHaptic('tap');
        } catch (err) {
          console.error('Decryption failed for incoming message', err);
          setMessages(prev => [...prev, { senderId: msg.senderId, text: '[Decryption Failed]', timestamp: msg.timestamp, error: true }]);
        }
      }
    };
    
    const eventName = `comms:direct:${myId}`;
    socket.on(eventName, handleIncoming);
    return () => { socket.off(eventName, handleIncoming); };
  }, [socket, sharedKey, selectedResponderId, token]);

  const handleSend = async () => {
    if (!draft.trim() || !sharedKey || !token) return;
    const text = draft;
    setDraft('');

    try {
      // Encrypt
      const { ciphertext, iv, authTag } = await encryptMessage(sharedKey, text);
      
      // POST to backend
      const res = await fetch(`${API_URL}/api/v1/comms/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetResponderId: selectedResponderId,
          content: ciphertext,
          encryptionMetadata: { iv, authTag }
        })
      });
      
      if (res.ok) {
        setMessages(prev => [...prev, { senderId: 'me', text, timestamp: new Date().toISOString() }]);
        triggerHaptic('success');
      } else {
        setStatus('Failed to send encrypted message.');
      }
    } catch (err) {
      console.error(err);
      setStatus('Encryption failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 12 }}>
      <div style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
        Tactical Comms (E2EE)
      </div>
      
      <div style={{ fontSize: 11, color: sharedKey ? (isContrast ? '#00ff00' : '#4ade80') : (isContrast ? '#ff3333' : '#f87171'), marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        {sharedKey ? '🔒' : '🔓'} {status}
      </div>

      <select 
        value={selectedResponderId || ''} 
        onChange={(e) => setSelectedResponderId(e.target.value)}
        style={{
          width: '100%',
          background: isContrast ? '#000000' : 'rgba(15,23,42,0.5)',
          color: isContrast ? '#00ff00' : 'white',
          border: `1px solid ${styles.borderColor}`,
          padding: 8,
          borderRadius: 4,
          marginBottom: 12,
          outline: 'none',
        }}
      >
        <option value="">Select Responder to chat...</option>
        {volunteers.map(v => (
          <option key={v.id} value={v.id}>{v.name} ({v.role})</option>
        ))}
      </select>

      <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${styles.borderColor}`, borderRadius: 4, padding: 8, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((m, i) => {
          const isMe = m.senderId === 'me';
          return (
            <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{
                background: m.error ? (isContrast ? '#ff3333' : '#dc2626') : (isMe ? (isContrast ? '#004400' : '#1e40af') : (isContrast ? '#222' : '#334155')),
                padding: '6px 10px',
                borderRadius: 8,
                fontSize: 12,
                color: isContrast ? (m.error ? '#000' : '#00ff00') : '#fff',
                border: isContrast ? `1px solid ${m.error ? '#ff3333' : '#00ff00'}` : 'none'
              }}>
                {m.text}
              </div>
              <div style={{ fontSize: 9, color: '#64748b', textAlign: isMe ? 'right' : 'left', marginTop: 2 }}>
                {new Date(m.timestamp).toLocaleTimeString()}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input 
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Encrypted message..."
          disabled={!sharedKey}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          style={{
            flex: 1,
            background: isContrast ? '#000000' : 'rgba(15,23,42,0.5)',
            color: isContrast ? '#00ff00' : 'white',
            border: `1px solid ${styles.borderColor}`,
            padding: '8px 12px',
            borderRadius: 4,
            outline: 'none'
          }}
        />
        <button 
          onClick={handleSend}
          disabled={!sharedKey || !draft.trim()}
          style={{
            background: isContrast ? 'transparent' : '#2563eb',
            color: isContrast ? '#00ff00' : 'white',
            border: isContrast ? '1px solid #00ff00' : 'none',
            padding: '0 16px',
            borderRadius: 4,
            cursor: sharedKey ? 'pointer' : 'not-allowed',
            opacity: sharedKey ? 1 : 0.5
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
