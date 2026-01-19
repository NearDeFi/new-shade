import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateAgent,
  manageKeySetup,
  getAgentSigner,
  ensureKeysSetup,
} from '../../src/utils/agent';
import { createMockAccount, createMockProvider } from '../mocks';
import { createMockDstackClient } from '../mocks/tee-mocks';
import { addKeysToAccount, removeKeysFromAccount } from '../../src/utils/near';
import { generateTestKey, createMockAccountWithKeys } from '../test-utils';

// Mock near utils - needed to avoid real blockchain calls
vi.mock('../../src/utils/near', () => ({
  addKeysToAccount: vi.fn(),
  removeKeysFromAccount: vi.fn(),
}));

// Store mock account globally so Account class can access it
let globalMockAccount: any = null;

// Mock Account class - return our mock account instance
vi.mock('@near-js/accounts', () => {
  const MockAccount = vi.fn(function(this: any, accountId: string, provider: any, signer?: any) {
    const mockAccount = globalMockAccount || createMockAccount();
    this.accountId = accountId;
    this.provider = provider;
    this.getAccessKeyList = mockAccount.getAccessKeyList;
    this.getBalance = mockAccount.getBalance;
    this.callFunction = mockAccount.callFunction;
    this.transfer = mockAccount.transfer;
    this.createSignedTransaction = mockAccount.createSignedTransaction;
    return this;
  });
  return { Account: MockAccount };
});

beforeEach(() => {
  vi.clearAllMocks();
  globalMockAccount = null;
});

describe('agent utils', () => {
  describe('generateAgent', () => {
    it('should generate agent with derivation path when no TEE', async () => {
      const derivationPath = 'test-derivation-path';
      
      const result = await generateAgent(undefined, derivationPath);
      
      expect(result).toHaveProperty('accountId');
      expect(result.accountId).toMatch(/^[0-9a-f]{64}$/); // 32 bytes = 64 hex chars
      expect(result.agentPrivateKey).toMatch(/^ed25519:/);
      expect(result).toHaveProperty('derivedWithTEE', false);
    });

    it('should generate agent with random hash when no TEE and no derivation path', async () => {
      const result = await generateAgent(undefined, undefined);
      
      expect(result).toHaveProperty('accountId');
      expect(result.accountId).toMatch(/^[0-9a-f]{64}$/); // 32 bytes = 64 hex chars
      expect(result.agentPrivateKey).toMatch(/^ed25519:/);
      expect(result).toHaveProperty('derivedWithTEE', false);
    });

    it('should generate agent with TEE when dstackClient is provided', async () => {
      const dstackClient = createMockDstackClient();
      
      const result = await generateAgent(dstackClient, undefined);
      
      expect(result).toHaveProperty('accountId');
      expect(result.accountId).toMatch(/^[0-9a-f]{64}$/); // 32 bytes = 64 hex chars
      expect(result.agentPrivateKey).toMatch(/^ed25519:/);
      expect(result).toHaveProperty('derivedWithTEE', true);
      expect(dstackClient.getKey).toHaveBeenCalled();
    });

    it('should generate deterministic account ID with same derivation path', async () => {
      const derivationPath = 'deterministic-path';
      
      const result1 = await generateAgent(undefined, derivationPath);
      const result2 = await generateAgent(undefined, derivationPath);
      
      expect(result1.accountId).toBe(result2.accountId);
      expect(result1.agentPrivateKey).toBe(result2.agentPrivateKey);
    });

    it('should generate different account IDs with different derivation paths', async () => {
      const result1 = await generateAgent(undefined, 'path1');
      const result2 = await generateAgent(undefined, 'path2');
      
      expect(result1.accountId).not.toBe(result2.accountId);
    });
  });

  describe('manageKeySetup', () => {
    it('should add keys when account has fewer keys than needed', async () => {
      const mockAccount = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      const result = await manageKeySetup(mockAccount as any, 2, undefined, undefined);
      
      expect(addKeysToAccount).toHaveBeenCalledWith(mockAccount, expect.arrayContaining([
        expect.any(String),
        expect.any(String),
      ]));
      expect(result.keysToSave).toHaveLength(2);
      expect(result.allDerivedWithTEE).toBe(false);
    });

    it('should remove keys when account has more keys than needed', async () => {
      const mockAccount = createMockAccountWithKeys([
        { public_key: 'key1' },
        { public_key: 'key2' },
        { public_key: 'key3' },
      ]);
      
      const result = await manageKeySetup(mockAccount as any, 1, undefined, undefined);
      
      expect(removeKeysFromAccount).toHaveBeenCalledWith(mockAccount, expect.arrayContaining([
        expect.any(String),
      ]));
      expect(result.keysToSave).toHaveLength(1);
    });

    it('should not add or remove keys when account has correct number of keys', async () => {
      const mockAccount = createMockAccountWithKeys([
        { public_key: 'key1' },
        { public_key: 'key2' },
      ]);
      
      const result = await manageKeySetup(mockAccount as any, 1, undefined, undefined);
      
      expect(addKeysToAccount).not.toHaveBeenCalled();
      expect(removeKeysFromAccount).not.toHaveBeenCalled();
      expect(result.keysToSave).toHaveLength(1);
    });

    it('should use TEE when dstackClient is provided', async () => {
      const dstackClient = createMockDstackClient();
      const mockAccount = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      const result = await manageKeySetup(mockAccount as any, 1, dstackClient, undefined);
      
      expect(result.allDerivedWithTEE).toBe(true);
      expect(dstackClient.getKey).toHaveBeenCalled();
    });

    it('should use derivation path for additional keys', async () => {
      const mockAccount = createMockAccountWithKeys([{ public_key: 'key1' }]);
      const derivationPath = 'test-path';
      
      // First call with derivation path
      await manageKeySetup(mockAccount as any, 2, undefined, derivationPath);
      expect(addKeysToAccount).toHaveBeenCalled();
      const firstCallKeys = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      // Reset mocks
      vi.clearAllMocks();
      (mockAccount.getAccessKeyList as ReturnType<typeof vi.fn>).mockResolvedValue({
        keys: [{ public_key: 'key1' }],
      });
      
      // Second call with same derivation path - should produce same keys (deterministic)
      await manageKeySetup(mockAccount as any, 2, undefined, derivationPath);
      const secondCallKeys = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      // Verify same derivation path produces same keys
      expect(firstCallKeys).toEqual(secondCallKeys);
      expect(firstCallKeys).toHaveLength(2); // 2 additional keys requested
    });

    it('should generate different keys each time when TEE is enabled', async () => {
      const dstackClient = createMockDstackClient();
      const mockAccount = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      // First call with TEE
      await manageKeySetup(mockAccount as any, 1, dstackClient, undefined);
      expect(addKeysToAccount).toHaveBeenCalled();
      const firstCallKeys = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      // Reset mocks
      vi.clearAllMocks();
      (mockAccount.getAccessKeyList as ReturnType<typeof vi.fn>).mockResolvedValue({
        keys: [{ public_key: 'key1' }],
      });
      
      // Second call with TEE - should produce different keys (non-deterministic)
      // Even though dstack returns same key, crypto.getRandomValues produces different randomness
      await manageKeySetup(mockAccount as any, 1, dstackClient, undefined);
      const secondCallKeys = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      // Verify TEE produces different keys each time
      expect(firstCallKeys).not.toEqual(secondCallKeys);
      expect(firstCallKeys).toHaveLength(1);
      expect(secondCallKeys).toHaveLength(1);
    });

    it('should generate different keys each time when no derivation path is provided', async () => {
      const mockAccount = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      // First call without derivation path
      await manageKeySetup(mockAccount as any, 1, undefined, undefined);
      expect(addKeysToAccount).toHaveBeenCalled();
      const firstCallKeys = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      // Reset mocks
      vi.clearAllMocks();
      (mockAccount.getAccessKeyList as ReturnType<typeof vi.fn>).mockResolvedValue({
        keys: [{ public_key: 'key1' }],
      });
      
      // Second call without derivation path - should produce different keys (non-deterministic)
      await manageKeySetup(mockAccount as any, 1, undefined, undefined);
      const secondCallKeys = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      // Verify no derivation path produces different keys each time
      expect(firstCallKeys).not.toEqual(secondCallKeys);
      expect(firstCallKeys).toHaveLength(1);
      expect(secondCallKeys).toHaveLength(1);
    });

    it('should generate unique keys when adding multiple keys with TEE', async () => {
      const dstackClient = createMockDstackClient();
      const mockAccount = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      await manageKeySetup(mockAccount as any, 3, dstackClient, undefined);
      expect(addKeysToAccount).toHaveBeenCalled();
      const keys = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      // Verify all 3 keys are different
      expect(keys).toHaveLength(3);
      expect(keys[0]).not.toBe(keys[1]);
      expect(keys[0]).not.toBe(keys[2]);
      expect(keys[1]).not.toBe(keys[2]);
    });

    it('should generate unique keys when adding multiple keys with derivation path', async () => {
      const mockAccount = createMockAccountWithKeys([{ public_key: 'key1' }]);
      const derivationPath = 'test-path';
      
      await manageKeySetup(mockAccount as any, 3, undefined, derivationPath);
      expect(addKeysToAccount).toHaveBeenCalled();
      const keys = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      // Verify all 3 keys are different (each uses different derivation path: path-1, path-2, path-3)
      expect(keys).toHaveLength(3);
      expect(keys[0]).not.toBe(keys[1]);
      expect(keys[0]).not.toBe(keys[2]);
      expect(keys[1]).not.toBe(keys[2]);
    });

    it('should generate unique keys when adding multiple keys without derivation path', async () => {
      const mockAccount = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      await manageKeySetup(mockAccount as any, 3, undefined, undefined);
      expect(addKeysToAccount).toHaveBeenCalled();
      const keys = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      // Verify all 3 keys are different
      expect(keys).toHaveLength(3);
      expect(keys[0]).not.toBe(keys[1]);
      expect(keys[0]).not.toBe(keys[2]);
      expect(keys[1]).not.toBe(keys[2]);
    });
  });

  describe('key determinism across different agents', () => {
    it('should generate different keys for two different agents with TEE', async () => {
      const dstackClient1 = createMockDstackClient();
      const dstackClient2 = createMockDstackClient();
      const mockAccount1 = createMockAccountWithKeys([{ public_key: 'key1' }]);
      const mockAccount2 = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      await manageKeySetup(mockAccount1 as any, 2, dstackClient1, undefined);
      const keys1 = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      vi.clearAllMocks();
      
      await manageKeySetup(mockAccount2 as any, 2, dstackClient2, undefined);
      const keys2 = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      // Verify different agents with TEE produce different keys
      expect(keys1).not.toEqual(keys2);
      expect(keys1).toHaveLength(2);
      expect(keys2).toHaveLength(2);
    });

    it('should generate different keys for two different agents without TEE and without derivation path', async () => {
      const mockAccount1 = createMockAccountWithKeys([{ public_key: 'key1' }]);
      const mockAccount2 = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      await manageKeySetup(mockAccount1 as any, 2, undefined, undefined);
      const keys1 = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      vi.clearAllMocks();
      
      await manageKeySetup(mockAccount2 as any, 2, undefined, undefined);
      const keys2 = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      // Verify different agents without derivation path produce different keys
      expect(keys1).not.toEqual(keys2);
      expect(keys1).toHaveLength(2);
      expect(keys2).toHaveLength(2);
    });

    it('should generate identical keys for two different agents with same derivation path', async () => {
      const derivationPath = 'deterministic-path';
      const mockAccount1 = createMockAccountWithKeys([{ public_key: 'key1' }]);
      const mockAccount2 = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      await manageKeySetup(mockAccount1 as any, 2, undefined, derivationPath);
      const keys1 = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      vi.clearAllMocks();
      
      await manageKeySetup(mockAccount2 as any, 2, undefined, derivationPath);
      const keys2 = vi.mocked(addKeysToAccount).mock.calls[0][1] as string[];
      
      // Verify same derivation path produces identical keys across different agents
      expect(keys1).toEqual(keys2);
      expect(keys1).toHaveLength(2);
      expect(keys2).toHaveLength(2);
    });
  });

  describe('getAgentSigner', () => {
    it('should throw error when no keys available', () => {
      expect(() => {
        getAgentSigner([], 0);
      }).toThrow('No agent keys available');
    });

    it('should return same key when only one key available', () => {
      const keys = [generateTestKey('key1')];
      const result1 = getAgentSigner(keys, 0);
      const result2 = getAgentSigner(keys, 0);
      
      expect(result1.keyIndex).toBe(0);
      expect(result2.keyIndex).toBe(0);
      expect(result1.signer).toBeDefined();
      expect(result2.signer).toBeDefined();
    });

    it('should rotate through keys correctly', () => {
      const keys = [
        generateTestKey('key1'),
        generateTestKey('key2'),
        generateTestKey('key3'),
      ];
      
      const result1 = getAgentSigner(keys, 0);
      expect(result1.keyIndex).toBe(1);
      
      const result2 = getAgentSigner(keys, result1.keyIndex);
      expect(result2.keyIndex).toBe(2);
      
      const result3 = getAgentSigner(keys, result2.keyIndex);
      expect(result3.keyIndex).toBe(0); // Wraps around
    });
  });

  describe('ensureKeysSetup', () => {
    it('should return early when keysChecked is true', async () => {
      const { Account } = await import('@near-js/accounts');
      
      // Generate a valid test key
      const testKey = generateTestKey('test-key');
      
      const result = await ensureKeysSetup(
        'agent.testnet',
        [testKey],
        createMockProvider(),
        1,
        undefined,
        undefined,
        false,
        true // keysChecked = true
      );
      
      expect(result).toEqual({ keysToAdd: [], wasChecked: true });
      
      // Verify no side effects occurred (early return)
      expect(Account).not.toHaveBeenCalled();
      expect(addKeysToAccount).not.toHaveBeenCalled();
    });

    it('should setup keys when keysChecked is false', async () => {
      const { Account } = await import('@near-js/accounts');
      const mockProvider = createMockProvider();
      const mockAccount = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      // Generate a valid test key
      const testKey = generateTestKey('test-key');
      
      // Set global mock account so Account constructor uses it
      globalMockAccount = mockAccount;
      
      const result = await ensureKeysSetup(
        'agent.testnet',
        [testKey],
        mockProvider,
        2,
        undefined,
        undefined,
        false,
        false
      );
      
      expect(result.wasChecked).toBe(true);
      expect(result.keysToAdd).toHaveLength(1);
      expect(Account).toHaveBeenCalledWith('agent.testnet', mockProvider, expect.anything());
    });

    it('should throw error when first key was TEE but additional keys are not', async () => {
      const mockProvider = createMockProvider();
      const mockAccount = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      // Generate a valid test key
      const testKey = generateTestKey('test-key');
      
      // Set global mock account so Account constructor uses it
      globalMockAccount = mockAccount;
      
      await expect(
        ensureKeysSetup(
          'agent.testnet',
          [testKey],
          mockProvider,
          2,
          undefined, // No TEE client, so additional keys won't use TEE
          undefined,
          true, // First key was derived with TEE
          false
        )
      ).rejects.toThrow('First key was derived with TEE but additional keys were not');
    });

    it('should not throw error when both first and additional keys use TEE', async () => {
      const dstackClient = createMockDstackClient();
      const mockProvider = createMockProvider();
      const mockAccount = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      // Generate a valid test key
      const testKey = generateTestKey('test-key');
      
      // Set global mock account so Account constructor uses it
      globalMockAccount = mockAccount;
      
      const result = await ensureKeysSetup(
        'agent.testnet',
        [testKey],
        mockProvider,
        2,
        dstackClient,
        undefined,
        true,
        false
      );
      
      expect(result.wasChecked).toBe(true);
      expect(dstackClient.getKey).toHaveBeenCalled();
    });

    it('should not throw error when no keys use TEE', async () => {
      const mockProvider = createMockProvider();
      const mockAccount = createMockAccountWithKeys([{ public_key: 'key1' }]);
      
      // Generate a valid test key
      const testKey = generateTestKey('test-key');
      
      // Set global mock account so Account constructor uses it
      globalMockAccount = mockAccount;
      
      const result = await ensureKeysSetup(
        'agent.testnet',
        [testKey],
        mockProvider,
        2,
        undefined,
        undefined,
        false,
        false
      );
      
      expect(result.wasChecked).toBe(true);
    });
  });
});
