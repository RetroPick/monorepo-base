import { describe, it, expect, vi, beforeEach } from 'vitest';
import { relayerApi } from '../../lib/relayerApi';

const RELAYER_BASE_URL = 'http://localhost:8790';

// Mock the global fetch API
global.fetch = vi.fn();

describe('Relayer API Wrapper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call createSession with correct parameters', async () => {
        const mockResponse = { ok: true, sessionId: '0x123' };
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const config = {
            sessionId: '0x123',
            marketId: '1',
            vaultId: '0xabc',
            numOutcomes: 2,
            b: 100,
        };

        const result = await relayerApi.createSession(config);

        expect(global.fetch).toHaveBeenCalledWith(`${RELAYER_BASE_URL}/api/session/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        expect(result).toEqual(mockResponse);
    });

    it('should call buyShares with correct parameters and hit /api/trade/buy', async () => {
        const mockResponse = { ok: true, cost: 50, nonce: "1" };
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const params = {
            sessionId: '0x123',
            outcomeIndex: 0,
            delta: 10,
            userAddress: '0xAAA',
        };

        const result = await relayerApi.buyShares(params);

        expect(global.fetch).toHaveBeenCalledWith(`${RELAYER_BASE_URL}/api/trade/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        expect(result).toEqual(mockResponse);
    });

    it('should throw an error if the fetch fails', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            text: async () => "Insufficient balance",
        });

        const params = {
            sessionId: '0x123',
            outcomeIndex: 0,
            delta: 1000,
            userAddress: '0xAAA',
        };

        await expect(relayerApi.buyShares(params)).rejects.toThrow("Insufficient balance");
    });
});
