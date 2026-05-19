import { z } from 'zod';
import { PoolClient } from 'pg';
import { hasPermissions } from '@/lib/permissions/core';
import { DataQueryError } from './errors';

export interface QueryContext {
    userName: string;
    orgUnitCode?: string;
    client?: PoolClient;
}

export interface QueryDefinition<TParams, TResult> {
    path: string;
    permissions?: string[];
    params: z.ZodType<TParams, z.ZodTypeDef, any>;
    execute: (params: TParams, ctx: QueryContext) => Promise<TResult>;
}

export type QueryFn<TParams, TResult> = (params: TParams, ctx: QueryContext) => Promise<TResult>;

const queryRegistry = new Map<string, QueryDefinition<unknown, unknown>>();

export function defineQuery<TParams, TResult>(def: QueryDefinition<TParams, TResult>): QueryFn<TParams, TResult> {
    queryRegistry.set(def.path, def as QueryDefinition<unknown, unknown>);
    return async (params: TParams, ctx: QueryContext): Promise<TResult> => {
        if (def.permissions?.length) {
            const ok = await hasPermissions(ctx.userName, def.permissions);
            if (!ok) throw new DataQueryError(`Insufficient permissions: ${def.permissions.join(', ')}`);
        }
        return def.execute(params, ctx);
    };
}

export function getQueryRegistry() {
    return queryRegistry;
}
