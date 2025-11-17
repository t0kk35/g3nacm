import { UIMessage } from "ai";
import { z } from 'zod';

export const messageMetadataSchema = z.object({
    createdAt: z.number().optional(),
    model: z.string().optional(),
    totalTokens: z.number().optional(),
    sessionId: z.string().optional()
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type ChatUIMessage = UIMessage<MessageMetadata>;