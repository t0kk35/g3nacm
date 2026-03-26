import { PoolClient } from "pg";
import { RfiChannel, RfiChannelType } from "@/app/api/data/rfi/type";
import { RfiContactDetails, RfiDeliveryResult, RfiSendContext } from "./types";

/**
 * Interface all RFI channel handlers must implement.
 * Mirrors the IWorkflowFunction pattern — one handler per RfiChannelType value.
 * Register new handlers via registerRfiChannelHandler() in handlers/handler-index.ts.
 */
export interface IRfiChannelHandler {
    /** Must exactly match an RfiChannelType enum value */
    readonly channelType: RfiChannelType;

    /**
     * Resolve the recipient's contact details for this channel type.
     * The resolved details are stored as a JSONB snapshot in rfi_request.recipient_contact_details.
     *
     * @param subjectId  UUID referencing subject_base.id
     * @param channel    Full channel config (for type-specific logic)
     * @param client     DB client within the active transaction
     */
    getContactDetails(
        subjectId: string,
        channel: RfiChannel,
        client: PoolClient
    ): Promise<RfiContactDetails>;

    /**
     * Dispatch the RFI to the external recipient via this channel.
     * Called after rfi_request has been persisted but before COMMIT.
     *
     * @param context         RFI content needed to format the outbound message
     * @param contactDetails  Resolved contact snapshot from getContactDetails()
     * @param channel         Full channel config including credentials
     */
    send(
        context: RfiSendContext,
        contactDetails: RfiContactDetails,
        channel: RfiChannel
    ): Promise<RfiDeliveryResult>;
}

const registry: Record<string, IRfiChannelHandler> = {};

export function registerRfiChannelHandler(handler: IRfiChannelHandler): void {
    registry[handler.channelType] = handler;
}

export function getRfiChannelHandler(channelType: RfiChannelType): IRfiChannelHandler | undefined {
    return registry[channelType];
}
