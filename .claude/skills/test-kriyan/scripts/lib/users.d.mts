export interface TestUser { id: string; email: string; createdAt?: number; password?: string }
export function clerkClient(): ReturnType<typeof import('@clerk/backend').createClerkClient>;
export function createTestUser(options: { tag: string; password?: boolean }): Promise<TestUser>;
export function resolveUser(identifier: string): Promise<TestUser>;
export function deleteTestUser(identifier: string): Promise<{ id: string; email: string; plannerDataRemoved: boolean; deleted: boolean }>;
