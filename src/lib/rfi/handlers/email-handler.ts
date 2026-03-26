import nodemailer from "nodemailer";
import { PoolClient } from "pg";
import { RfiChannel, RfiChannelType } from "@/app/api/data/rfi/type";
import { IRfiChannelHandler } from "../channel-handler-registry";
import { RfiContactDetails, RfiDeliveryResult, RfiEmailContactDetails, RfiSendContext } from "../types";

/**
 * Expected shape of rfi_channel.credentials for Email channels:
 * {
 *   smtp_host: string
 *   smtp_port: number
 *   smtp_secure: boolean    // true = TLS on connect (port 465), false = STARTTLS (port 587)
 *   smtp_user: string
 *   smtp_password: string
 *   smtp_timeout_ms?: number  // default: 10000
 * }
 *
 * Expected shape of rfi_channel.configuration for Email channels:
 * {
 *   from_name: string       // display name, e.g. "Compliance Team"
 *   from_address: string    // sender email address
 *   reply_to?: string       // optional Reply-To header
 *   subject_prefix?: string // optional prefix prepended to every subject, e.g. "[CONFIDENTIAL]"
 * }
 */

const query_subject_email = `
SELECT
    sb.name AS "subject_name",
    sb.mail AS "email_address"
FROM subject_base sb
WHERE sb.id = $1::uuid
`;

export class EmailChannelHandler implements IRfiChannelHandler {
    readonly channelType = RfiChannelType.Email;

    async getContactDetails(subjectId: string, _channel: RfiChannel, client: PoolClient): Promise<RfiContactDetails> {
        const result = await client.query(query_subject_email, [subjectId]);

        if (result.rows.length === 0) {
            throw new Error(`Subject not found for id: ${subjectId}`);
        }

        const row = result.rows[0];

        if (!row.email_address) {
            throw new Error(
                `Subject '${row.subject_name}' (id: ${subjectId}) has no email address on record`
            );
        }

        const details: RfiEmailContactDetails = {
            channel_type: 'Email',
            email_address: row.email_address,
            subject_name: row.subject_name
        };

        return details;
    }

    async send(
        context: RfiSendContext,
        contactDetails: RfiContactDetails,
        channel: RfiChannel
    ): Promise<RfiDeliveryResult> {
        if (contactDetails.channel_type !== 'Email') {
            throw new Error('EmailChannelHandler received non-email contact details');
        }

        const config = channel.configuration;
        const creds = channel.credentials;

        const transporter = nodemailer.createTransport({
            host: creds.smtp_host,
            port: creds.smtp_port,
            secure: creds.smtp_secure ?? false,
            auth: {
                user: creds.smtp_user,
                pass: creds.smtp_password
            },
            connectionTimeout: creds.smtp_timeout_ms ?? 10_000,
            greetingTimeout: creds.smtp_timeout_ms ?? 10_000
        });

        const subject = config.subject_prefix
            ? `${config.subject_prefix} ${context.title}`
            : context.title;

        const info = await transporter.sendMail({
            from: `"${config.from_name}" <${config.from_address}>`,
            to: `"${contactDetails.subject_name}" <${contactDetails.email_address}>`,
            replyTo: config.reply_to,
            subject,
            text: context.body    /// TODO add support for structured questions.
        });

        return {
            success: true,
            message_id: info.messageId,
            delivery_timestamp: new Date().toISOString()
        };
    }
}