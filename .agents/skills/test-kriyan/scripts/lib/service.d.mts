import type { FunctionReference, FunctionArgs, FunctionReturnType } from 'convex/server';
type Envelope = { ownerId: string; timestamp: number; nonce: string; signature: string; invocation?: { id: string; kind: 'read' | 'write' } };
export function serviceCall<F extends FunctionReference<'action'>>(reference: F, ownerId: string, operation: string, payload: Omit<FunctionArgs<F>, keyof Envelope>): Promise<FunctionReturnType<F>>;
export function resetOwner(ownerId: string): Promise<void>;
