import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createDefaultProvider,
  createAccountObject,
  internalFundAgent,
  addKeysToAccount,
  removeKeysFromAccount,
} from '../../src/utils/near';
import { createMockProvider, createMockAccount, createMockSigner } from '../mocks';
import { JsonRpcProvider } from '@near-js/providers';
import {  } from '@near-js/signers';
import { NEAR } from '@near-js/tokens';
import { generateTestKey, createMockBehavior, setSendTransactionBehavior } from '../test-utils';

// Mock NEAR SDK modules
vi.mock('@near-js/providers', async () => {
  const actual = await vi.importActual('@near-js/providers');
  return {
    ...actual,
    JsonRpcProvider: vi.fn(),
  };
});

// Store transfer mock globally so Account class can access it
let globalTransferMock: any = null;
let globalCreateSignedTransactionMock: any = null;

vi.mock('@near-js/accounts', () => {
  class MockAccount {
    accountId: string;
    provider: any;
    transfer: any;
    createSignedTransaction: any;
    
    constructor(accountId: string, provider: any, signer?: any) {
      const mockAccount = createMockAccount();
      this.accountId = accountId;
      this.provider = provider;
      this.transfer = globalTransferMock || mockAccount.transfer;
      this.createSignedTransaction = globalCreateSignedTransactionMock || mockAccount.createSignedTransaction;
    }
  }
  return { Account: MockAccount };
});

// Use real implementations for KeyPairSigner, KeyPair, and actionCreators

describe('near utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalTransferMock = null;
    globalCreateSignedTransactionMock = null;
  });

  // Helper function for internalFundAgent tests
  function setupFundAgentMocks(transferBehavior: any) {
    const mockProvider = createMockProvider();
    const mockTransfer = createMockBehavior(transferBehavior);
    
    globalTransferMock = mockTransfer;
    // KeyPairSigner.fromSecretKey will use real implementation
    
    return { mockProvider, mockTransfer };
  }

  // Helper function for key operation tests (add/remove keys)
  function setupKeyOperationMocks(actionType: 'add' | 'delete') {
    const mockAccount = createMockAccount();
    const mockTx = {};
    
    // Use real KeyPair, actionCreators implementations
    // Only mock the Account methods and provider.sendTransaction
    
    (mockAccount.createSignedTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(mockTx);
    
    return {
      mockAccount: mockAccount as any,
      mockTx,
      setSendTransactionBehavior: (behavior: any) => setSendTransactionBehavior(mockAccount, behavior)
    };
  }

  describe('createDefaultProvider', () => {
    it('should create provider for testnet', () => {
      const provider = createDefaultProvider('testnet');
      expect(JsonRpcProvider).toHaveBeenCalledWith(
        { url: 'https://test.rpc.fastnear.com' },
        { retries: 3, backoff: 2, wait: 1000 }
      );
      expect(provider).toBeDefined();
    });

    it('should create provider for mainnet', () => {
      const provider = createDefaultProvider('mainnet');
      expect(JsonRpcProvider).toHaveBeenCalledWith(
        { url: 'https://free.rpc.fastnear.com' },
        { retries: 3, backoff: 2, wait: 1000 }
      );
      expect(provider).toBeDefined();
    });

    it('should create provider with correct retry configuration', () => {
      createDefaultProvider('testnet');
      expect(JsonRpcProvider).toHaveBeenCalledWith(
        expect.any(Object),
        { retries: 3, backoff: 2, wait: 1000 }
      );
    });
  });

  describe('createAccountObject', () => {
    it('should create Account without signer', () => {
      const mockProvider = createMockProvider();
      const account = createAccountObject('test.testnet', mockProvider);
      
      expect(account).toBeDefined();
      expect(account.accountId).toBe('test.testnet');
    });

    it('should create Account with signer', () => {
      const mockProvider = createMockProvider();
      const mockSigner = createMockSigner();
      const account = createAccountObject('test.testnet', mockProvider, mockSigner);
      
      expect(account).toBeDefined();
      expect(account.accountId).toBe('test.testnet');
    });
  });

  describe('internalFundAgent', () => {
    it('should successfully transfer NEAR on first attempt', async () => {
      const { mockProvider, mockTransfer } = setupFundAgentMocks({
        status: { SuccessValue: '' },
      });

      const sponsorKey = generateTestKey('sponsor-key');
      await internalFundAgent(
        'agent.testnet',
        'sponsor.testnet',
        sponsorKey,
        1.5,
        mockProvider
      );

      // KeyPairSigner.fromSecretKey uses real implementation
      expect(mockTransfer).toHaveBeenCalledWith({
        token: NEAR,
        amount: NEAR.toUnits(1.5),
        receiverId: 'agent.testnet',
      });
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const { mockProvider, mockTransfer } = setupFundAgentMocks(() => 
        vi.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ status: { SuccessValue: '' } })
      );

      const sponsorKey = generateTestKey('sponsor-key');
      await internalFundAgent(
        'agent.testnet',
        'sponsor.testnet',
        sponsorKey,
        2.0,
        mockProvider
      );

      expect(mockTransfer).toHaveBeenCalledTimes(2);
    });

    it('should throw error after all retries exhausted', async () => {
      const { mockProvider, mockTransfer } = setupFundAgentMocks(() =>
        vi.fn().mockRejectedValue(new Error('Network error'))
      );

      const sponsorKey = generateTestKey('sponsor-key');
      await expect(
        internalFundAgent(
          'agent.testnet',
          'sponsor.testnet',
          sponsorKey,
          1.0,
          mockProvider
        )
      ).rejects.toThrow('Failed to fund agent account agent.testnet');

      expect(mockTransfer).toHaveBeenCalledTimes(3);
    });

    it('should handle non-Error exceptions after all retries exhausted', async () => {
      const { mockProvider, mockTransfer } = setupFundAgentMocks(() =>
        vi.fn().mockRejectedValue('String error')
      );

      const sponsorKey = generateTestKey('sponsor-key');
      await expect(
        internalFundAgent(
          'agent.testnet',
          'sponsor.testnet',
          sponsorKey,
          1.0,
          mockProvider
        )
      ).rejects.toThrow('Failed to fund agent account agent.testnet');

      expect(mockTransfer).toHaveBeenCalledTimes(3);
    });

    it('should throw error with error_type after retries when no error_message', async () => {
      const { mockProvider, mockTransfer } = setupFundAgentMocks({
        status: { Failure: { error_type: 'TypeOnlyError' } },
      });

      await expect(
        internalFundAgent(
          'agent.testnet',
          'sponsor.testnet',
          generateTestKey('sponsor-key'),
          1.0,
          mockProvider
        )
      ).rejects.toThrow('Transfer transaction failed: TypeOnlyError');

      expect(mockTransfer).toHaveBeenCalledTimes(3);
    });
  });

  describe('addKeysToAccount', () => {
    it('should successfully add keys on first attempt', async () => {
      const { mockAccount, mockTx, setSendTransactionBehavior } = setupKeyOperationMocks('add');
      
      setSendTransactionBehavior({
        status: { SuccessValue: '' },
      });

      const key1 = generateTestKey('key1');
      const key2 = generateTestKey('key2');
      await addKeysToAccount(mockAccount, [key1, key2]);

      // Verify real implementations were used
      expect(mockAccount.createSignedTransaction).toHaveBeenCalledWith(
        mockAccount.accountId,
        expect.arrayContaining([
          expect.any(Object), // Real action objects from actionCreators
          expect.any(Object),
        ])
      );
      expect(mockAccount.provider.sendTransaction).toHaveBeenCalledWith(mockTx);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const { mockAccount, setSendTransactionBehavior } = setupKeyOperationMocks('add');
      
      setSendTransactionBehavior(() =>
        vi.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ status: { SuccessValue: '' } })
      );

      const key1 = generateTestKey('key1');
      await addKeysToAccount(mockAccount, [key1]);

      expect(mockAccount.provider.sendTransaction).toHaveBeenCalledTimes(2);
    });

    it('should throw error after all retries exhausted', async () => {
      const { mockAccount, setSendTransactionBehavior } = setupKeyOperationMocks('add');
      
      setSendTransactionBehavior(() =>
        vi.fn().mockRejectedValue(new Error('Network error'))
      );

      await expect(
        addKeysToAccount(mockAccount, [generateTestKey('key1')])
      ).rejects.toThrow('Failed to add keys');

      expect(mockAccount.provider.sendTransaction).toHaveBeenCalledTimes(3);
    });

    it('should handle non-Error exceptions when adding keys', async () => {
      const { mockAccount, setSendTransactionBehavior } = setupKeyOperationMocks('add');
      
      setSendTransactionBehavior(() =>
        vi.fn().mockRejectedValue('String error')
      );

      await expect(
        addKeysToAccount(mockAccount, [generateTestKey('key1')])
      ).rejects.toThrow('Failed to add keys');

      expect(mockAccount.provider.sendTransaction).toHaveBeenCalledTimes(3);
    });

    it('should retry on transaction failure status', async () => {
      const { mockAccount, setSendTransactionBehavior } = setupKeyOperationMocks('add');
      
      setSendTransactionBehavior(() =>
        vi.fn()
          .mockResolvedValueOnce({
            status: { Failure: { error_message: 'Transaction failed' } },
          })
          .mockResolvedValueOnce({ status: { SuccessValue: '' } })
      );

      const key1 = generateTestKey('key1');
      await addKeysToAccount(mockAccount, [key1]);

      expect(mockAccount.provider.sendTransaction).toHaveBeenCalledTimes(2);
    });

    it('should throw error with error_type when add keys fails after retries', async () => {
      const { mockAccount, setSendTransactionBehavior } = setupKeyOperationMocks('add');
      
      setSendTransactionBehavior({
        status: { Failure: { error_type: 'TxnError' } },
      });

      await expect(
        addKeysToAccount(mockAccount, [generateTestKey('key1')])
      ).rejects.toThrow('Add keys transaction failed: TxnError');

      expect(mockAccount.provider.sendTransaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('removeKeysFromAccount', () => {
    it('should successfully remove keys on first attempt', async () => {
      const { mockAccount, mockTx, setSendTransactionBehavior } = setupKeyOperationMocks('delete');
      
      setSendTransactionBehavior({
        status: { SuccessValue: '' },
      });

      const key1 = generateTestKey('key1');
      const key2 = generateTestKey('key2');
      await removeKeysFromAccount(mockAccount, [key1, key2]);

      // Verify real implementations were used
      expect(mockAccount.createSignedTransaction).toHaveBeenCalledWith(
        mockAccount.accountId,
        expect.arrayContaining([
          expect.any(Object), // Real action objects from actionCreators
          expect.any(Object),
        ])
      );
      expect(mockAccount.provider.sendTransaction).toHaveBeenCalledWith(mockTx);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const { mockAccount, setSendTransactionBehavior } = setupKeyOperationMocks('delete');
      
      setSendTransactionBehavior(() =>
        vi.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ status: { SuccessValue: '' } })
      );

      const key1 = generateTestKey('key1');
      await removeKeysFromAccount(mockAccount, [key1]);

      expect(mockAccount.provider.sendTransaction).toHaveBeenCalledTimes(2);
    });

    it('should throw error after all retries exhausted', async () => {
      const { mockAccount, setSendTransactionBehavior } = setupKeyOperationMocks('delete');
      
      setSendTransactionBehavior(() =>
        vi.fn().mockRejectedValue(new Error('Network error'))
      );

      await expect(
        removeKeysFromAccount(mockAccount, [generateTestKey('key1')])
      ).rejects.toThrow('Failed to remove keys');

      expect(mockAccount.provider.sendTransaction).toHaveBeenCalledTimes(3);
    });

    it('should handle non-Error exceptions when removing keys', async () => {
      const { mockAccount, setSendTransactionBehavior } = setupKeyOperationMocks('delete');
      
      setSendTransactionBehavior(() =>
        vi.fn().mockRejectedValue('String error')
      );

      await expect(
        removeKeysFromAccount(mockAccount, [generateTestKey('key1')])
      ).rejects.toThrow('Failed to remove keys');

      expect(mockAccount.provider.sendTransaction).toHaveBeenCalledTimes(3);
    });

    it('should retry on transaction failure status', async () => {
      const { mockAccount, setSendTransactionBehavior } = setupKeyOperationMocks('delete');
      
      setSendTransactionBehavior(() =>
        vi.fn()
          .mockResolvedValueOnce({
            status: { Failure: { error_type: 'ActionError' } },
          })
          .mockResolvedValueOnce({ status: { SuccessValue: '' } })
      );

      const key1 = generateTestKey('key1');
      await removeKeysFromAccount(mockAccount, [key1]);

      expect(mockAccount.provider.sendTransaction).toHaveBeenCalledTimes(2);
    });

    it('should throw error with error_type when remove keys fails after retries', async () => {
      const { mockAccount, setSendTransactionBehavior } = setupKeyOperationMocks('delete');
      
      setSendTransactionBehavior({
        status: { Failure: { error_type: 'TxnError' } },
      });

      await expect(
        removeKeysFromAccount(mockAccount, [generateTestKey('key1')])
      ).rejects.toThrow('Remove keys transaction failed: TxnError');

      expect(mockAccount.provider.sendTransaction).toHaveBeenCalledTimes(3);
    });
  });
});
