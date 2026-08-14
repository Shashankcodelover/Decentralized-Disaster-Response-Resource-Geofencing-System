import test from 'node:test';
import assert from 'node:assert/strict';
import { disasterVoucherVault } from './disasterVoucherVault';

test('Grand Finale Stage 5: DisasterVoucherVault issues and redeems relief vouchers with double-claim defense', () => {
    const v1 = disasterVoucherVault.issueVoucher('VICTIM_401', 'EMERGENCY_FOOD_PACK', 2, 'OFFICER_KEY_1');
    assert.equal(v1.status, 'ISSUED_UNSPENT');

    // First redemption succeeds
    const redeem1 = disasterVoucherVault.redeemVoucher(v1.voucherId, v1.nullifierHash);
    assert.equal(redeem1.success, true);
    assert.equal(redeem1.status, 'AID_DISBURSED_OFFLINE_VERIFIED');

    // Second redemption attempt on same voucher fails
    const redeem2 = disasterVoucherVault.redeemVoucher(v1.voucherId, v1.nullifierHash);
    assert.equal(redeem2.success, false);
    assert.equal(redeem2.reason, 'ALREADY_REDEEMED_SPENT');
});

test('Grand Finale Stage 5: DisasterVoucherVault computes deterministic Merkle state root', () => {
    const root1 = disasterVoucherVault.computeMerkleRoot();
    assert.equal(typeof root1, 'string');
    assert.equal(root1.length, 64); // 256-bit hex hash

    // Issuing a new voucher changes Merkle root
    disasterVoucherVault.issueVoucher('VICTIM_402', 'POTABLE_WATER_20L', 1, 'OFFICER_KEY_2');
    const root2 = disasterVoucherVault.computeMerkleRoot();
    assert.notEqual(root1, root2);
});
