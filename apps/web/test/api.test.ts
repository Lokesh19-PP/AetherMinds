import { describe, it, expect, beforeEach } from 'vitest';
import {
  getIssuerToken,
  setIssuerToken,
  clearIssuerToken,
  RegistryApiError,
  ISSUER_TOKEN_STORAGE_KEY,
} from '../src/lib/api';

// Mock sessionStorage in Node test runner
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'sessionStorage', {
  value: storageMock,
  writable: true,
});

describe('api.ts - Registry Client Utilities', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores and retrieves issuer token from sessionStorage', () => {
    expect(getIssuerToken()).toBeNull();

    setIssuerToken('secret_token_12345');
    expect(getIssuerToken()).toBe('secret_token_12345');
    expect(sessionStorage.getItem(ISSUER_TOKEN_STORAGE_KEY)).toBe('secret_token_12345');

    clearIssuerToken();
    expect(getIssuerToken()).toBeNull();
  });

  it('creates RegistryApiError with code and message', () => {
    const error = new RegistryApiError(422, {
      code: 'SIGNATURE_INVALID',
      message: 'Manifest signature does not match creator key',
    });

    expect(error.status).toBe(422);
    expect(error.error.code).toBe('SIGNATURE_INVALID');
    expect(error.message).toBe('Manifest signature does not match creator key');
  });
});
