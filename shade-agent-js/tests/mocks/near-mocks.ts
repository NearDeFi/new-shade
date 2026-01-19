import { vi } from 'vitest';
import type { Provider } from '@near-js/providers';
import type { Account } from '@near-js/accounts';
import type { KeyPairSigner } from '@near-js/signers';

export const createMockProvider = (): Provider => {
  return {
    getNetworkId: vi.fn().mockResolvedValue('testnet'),
    callFunction: vi.fn(),
    sendTransaction: vi.fn(),
  } as unknown as Provider;
};

export const createMockAccount = (): Account => {
  return {
    accountId: 'test-agent.testnet',
    getBalance: vi.fn(),
    callFunction: vi.fn(),
    transfer: vi.fn(),
    getAccessKeyList: vi.fn(),
    createSignedTransaction: vi.fn(),
    provider: createMockProvider(),
  } as unknown as Account;
};

export const createMockSigner = (): KeyPairSigner => {
  return {
    sign: vi.fn(),
    getPublicKey: vi.fn(),
  } as unknown as KeyPairSigner;
};
