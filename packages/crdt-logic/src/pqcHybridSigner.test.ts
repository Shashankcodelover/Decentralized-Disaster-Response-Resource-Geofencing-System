import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PqcHybridSigner } from './pqcHybridSigner';

describe('Cybersecurity & Cryptography: Post-Quantum Hybrid Mesh Signer', () => {
  const pqc = new PqcHybridSigner();

  it('generates valid keypair and produces verifiable hybrid classical + lattice signatures', () => {
    const keyPair = pqc.generateHybridKeyPair('node-ic-alpha');
    const tacticalPayload = {
      orderId: 'ORD-991',
      command: 'MANDATORY_EVACUATE_SECTOR_4',
      coordinates: [77.5946, 12.9716],
    };

    const signedPacket = pqc.signPayload(tacticalPayload, keyPair, 49201);
    assert.ok(signedPacket.classicalSignature.length > 32);
    assert.ok(signedPacket.latticeCommitmentHash.length > 64);
    assert.strictEqual(signedPacket.signerKeyId, 'node-ic-alpha');

    const verifyResult = pqc.verifySignedPacket(
      tacticalPayload,
      signedPacket,
      keyPair.classicalPrivateKeyHex,
      keyPair.quantumLatticeSeedHex
    );

    assert.strictEqual(verifyResult.isValid, true);
  });

  it('detects payload tampering and rejects malicious modifications', () => {
    const keyPair = pqc.generateHybridKeyPair('node-fire-02');
    const originalPayload = { order: 'HOLD_POSITION' };
    const tamperedPayload = { order: 'RETREAT_ALL' };

    const signedPacket = pqc.signPayload(originalPayload, keyPair, 77123);
    const verifyResult = pqc.verifySignedPacket(
      tamperedPayload,
      signedPacket,
      keyPair.classicalPrivateKeyHex,
      keyPair.quantumLatticeSeedHex
    );

    assert.strictEqual(verifyResult.isValid, false);
    assert.ok(verifyResult.reason?.includes('tampered'));
  });

  it('detects and blocks replay attacks using consumed nonces', () => {
    const keyPair = pqc.generateHybridKeyPair('node-medic-03');
    const payload = { triage: 'MASS_CASUALTY_RED' };

    const signedPacket = pqc.signPayload(payload, keyPair, 88812);

    // 1st verification: valid
    const firstCheck = pqc.verifySignedPacket(payload, signedPacket, keyPair.classicalPrivateKeyHex);
    assert.strictEqual(firstCheck.isValid, true);

    // 2nd verification with same nonce: replay attack detected!
    const replayCheck = pqc.verifySignedPacket(payload, signedPacket, keyPair.classicalPrivateKeyHex);
    assert.strictEqual(replayCheck.isValid, false);
    assert.ok(replayCheck.reason?.includes('Replay attack'));
  });
});
