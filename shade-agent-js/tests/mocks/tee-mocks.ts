import { vi } from 'vitest';
import type { DstackClient } from '@phala/dstack-sdk';

export const createMockDstackClient = (): DstackClient => {
  return {
    info: vi.fn().mockResolvedValue({
      tcb_info: {
        version: '1.0',
        platform: 'test',
      },
    }),
    getKey: vi.fn().mockResolvedValue({
      key: new Uint8Array(32).fill(1),
    }),
    getQuote: vi.fn().mockResolvedValue({
      quote: '0'.repeat(200),
    }),
  } as unknown as DstackClient;
};

export const mockAttestationResponse = {
  checksum: 'mock-checksum-123',
  quote_collateral: {
    version: '1.0',
    platform: 'test',
  },
};
