const API_BASE = '/api';

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

async function apiRequest<T>(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body?: unknown,
    retries = 3,
): Promise<ApiResponse<T>> {
    let lastError = '';

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const options: RequestInit = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };

            if (body && method !== 'GET') {
                options.body = JSON.stringify(body);
            }

            const res = await fetch(`${API_BASE}${path}`, options);

            if (res.status === 429) {
                // Rate limited — exponential backoff
                const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
                const delay = retryAfter * 1000 * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            const json = await res.json();

            if (!res.ok) {
                return { error: json.error || `HTTP ${res.status}` };
            }

            return { data: json as T };
        } catch (err) {
            lastError = err instanceof Error ? err.message : 'Network error';
            // Exponential backoff
            const delay = 1000 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return { error: lastError || 'Request failed after retries' };
}

// ─── Profile API ─────────────────────────────

export interface CreateProfileResponse {
    code: string;
    profileName: string;
}

export interface LoadProfileResponse {
    data: Record<string, unknown>;
    version: number;
    lastSaved: string;
}

export interface SaveProfileResponse {
    success: boolean;
    version: number;
}

export const profileApi = {
    create: (name?: string) =>
        apiRequest<CreateProfileResponse>('POST', '/profile', { name }),

    load: (code: string) =>
        apiRequest<LoadProfileResponse>('GET', `/profile/${code}`),

    save: (code: string, data: Record<string, unknown>) =>
        apiRequest<SaveProfileResponse>('PUT', `/profile/${code}`, { data }),
};

// ─── Auth API ──────────────────────────────

export const authApi = {
    googleLogin: (idToken: string) =>
        apiRequest<{ code: string; profileName: string }>('POST', '/auth/google', { idToken }),
};

// ─── Reward API ──────────────────────────────

export interface DailyLoginResponse {
    success: boolean;
    goldReward: number;
    streak: number;
    newGold: number;
}

export interface ChessRewardResponse {
    success: boolean;
    strategyXp: number;
    totalStrategyXp: number;
}

export interface ConquestNodeResponse {
    success: boolean;
    won: boolean;
    goldReward: number;
    newGold: number;
}

export interface PurchaseResponse {
    success: boolean;
    currency: string;
    spent: number;
    newBalance: number;
    itemId: string;
}

export const rewardApi = {
    dailyLogin: (code: string) =>
        apiRequest<DailyLoginResponse>('POST', '/reward/daily-login', { code }),

    chessResult: (code: string, result: 'win' | 'draw' | 'loss', difficulty: number) =>
        apiRequest<ChessRewardResponse>('POST', '/reward/chess', { code, result, difficulty }),

    conquestNode: (code: string, nodeId: string, won: boolean) =>
        apiRequest<ConquestNodeResponse>('POST', '/reward/conquest-node', { code, nodeId, won }),

    purchase: (code: string, currency: 'gold' | 'gems', amount: number, itemId: string) =>
        apiRequest<PurchaseResponse>('POST', '/reward/purchase', { code, currency, amount, itemId }),
};
