import { UIMessage } from "ai";
import { z } from 'zod';

export const messageMetadataSchema = z.object({
    createdAt: z.number().optional(),
    model: z.string().optional(),
    usage: z.object(
        {
            inputTokens: z.number().optional(),
            cachedInputTokens: z.number().optional(),
            outputTokens: z.number().optional(),
            resoningTokens: z.number().optional(),
            totalTokens: z.number().optional(),
        }).optional(),
    agentCode: z.string(),
    sessionId: z.string().optional()
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type ChatUIMessage = UIMessage<MessageMetadata>;