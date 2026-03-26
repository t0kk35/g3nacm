import { RfiChannel } from "@/app/api/data/rfi/type";

/**
 * Runtime fields available for variable resolution in channel configuration and credentials.
 * Use ${rfi:identifier} or ${rfi:id} in any string value of the channel's JSON fields.
 */
export type RfiResolveContext = {
    id: string;
    identifier: string;
};

/**
 * Resolves ${source:path} template variables in a single string.
 *
 * Supported sources:
 *   ${env:VAR_NAME}   — process.env variable
 *   ${rfi:field}      — top-level field from RfiResolveContext (id, identifier)
 *
 * Unrecognised tokens are left as-is so typos are visible rather than silently dropped.
 */
function resolveString(value: string, rfiCtx: RfiResolveContext): string {
    return value.replace(/\$\{([a-zA-Z0-9_.:-]+)\}/g, (match, token) => {
        const colonIdx = token.indexOf(':');
        if (colonIdx === -1) return match;

        const source = token.slice(0, colonIdx);
        const path = token.slice(colonIdx + 1);

        switch (source) {
            case 'env': {
                const envVal = process.env[path];
                return envVal ?? match;
            }
            case 'rfi': {
                const rfiVal = (rfiCtx as Record<string, string>)[path];
                return rfiVal ?? match;
            }
            default:
                return match;
        }
    });
}

function resolveObject(obj: Record<string, any>, rfiCtx: RfiResolveContext): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            result[key] = resolveString(value, rfiCtx);
        } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = resolveObject(value, rfiCtx);
        } else {
            result[key] = value;
        }
    }
    return result;
}

/**
 * Returns a shallow copy of the channel with configuration and credentials resolved.
 * The cached channel object is never mutated.
 */
export function resolveChannel(channel: RfiChannel, rfiCtx: RfiResolveContext): RfiChannel {
    return {
        ...channel,
        configuration: resolveObject(channel.configuration, rfiCtx),
        credentials: resolveObject(channel.credentials, rfiCtx),
    };
}
