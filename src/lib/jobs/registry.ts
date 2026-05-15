import { JobHandler } from './types';

interface JobRegistryEntry {
    handler: JobHandler;
    requiredPermission?: string;
}

const registry = new Map<string, JobRegistryEntry>();

export const JobRegistry = {
    register(type: string, handler: JobHandler, requiredPermission?: string): void {
        registry.set(type, { handler, requiredPermission });
    },

    get(type: string): JobHandler {
        const entry = registry.get(type);
        if (!entry) throw new Error(`No handler registered for job type: "${type}"`);
        return entry.handler;
    },

    getRequiredPermission(type: string): string | undefined {
        return registry.get(type)?.requiredPermission;
    },

    has(type: string): boolean {
        return registry.has(type);
    },

    registeredTypes(): string[] {
        return Array.from(registry.keys());
    },
};
