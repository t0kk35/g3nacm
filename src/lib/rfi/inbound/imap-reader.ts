import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { InboundRfiEmail, RfiInboundEmailConfig, RfiInboundEmailCredentials } from './types';

/**
 * Expected shape of rfi_channel.credentials for inboud Email:
 * {
 *   imap_host: string
 *   imap_port: number
 *   imap_secure: boolean    // true = TLS on connect (port 465), false = STARTTLS (port 587)
 *   imap_user: string
 *   imap_password: string
 * }
 */

export function extractIdentifierFromAddress(address: string): string | null {
    const local = address.split('@')[0];
    const plusIdx = local.indexOf('+');
    return plusIdx === -1 ? null : local.slice(plusIdx + 1);
}

const IMAP_TIMEOUT_MS = 60_000;

export async function readUnseenRfiReplies(
    credentials: RfiInboundEmailCredentials,
    config: RfiInboundEmailConfig
): Promise<InboundRfiEmail[]> {
    const mailbox = config.mailbox ?? 'INBOX';

    const client = new ImapFlow({
        host: credentials.imap_host,
        port: credentials.imap_port,
        secure: credentials.imap_secure,
        auth: {
            user: credentials.imap_user,
            pass: credentials.imap_password,
        },
        logger: false,
    });

    // Consume error events so they don't leak onto the process as uncaught exceptions.
    client.on('error', (err: Error) => {
        console.error('[imap-reader] ImapFlow error:', err.message);
    });

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
            () => reject(new Error(`IMAP operation timed out after ${IMAP_TIMEOUT_MS}ms`)),
            IMAP_TIMEOUT_MS
        );
    });

    try {
        return await Promise.race([doRead(client, mailbox, config), timeoutPromise]);
    } finally {
        clearTimeout(timeoutHandle);
        // Best-effort cleanup in case of timeout; ignore errors here.
        client.logout().catch(() => undefined);
    }
}

async function doRead(
    client: ImapFlow,
    mailbox: string,
    config: RfiInboundEmailConfig
): Promise<InboundRfiEmail[]> {
    
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);
    const results: InboundRfiEmail[] = [];

    try {
        const uids = await client.search({ seen: false }, { uid: true });
        if (!uids || uids.length === 0) return results;
        // fetchAll completes the entire FETCH before returning — avoids deadlocking
        // the connection when issuing STORE/MOVE commands immediately after.
        // source:true fetches the full raw RFC822 message so mailparser can handle
        // any MIME structure (multipart/alternative, quoted-printable, base64, etc.)
        const messages = await client.fetchAll(uids, { source: true }, { uid: true });

        for (const msg of messages) {
            const parsed = await simpleParser(msg.source ?? Buffer.alloc(0));
            console.log('Parsed from: ' + parsed.from?.text);

            const fromAddr = parsed.from?.value[0];
            const toObjects = parsed.to ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]) : [];
            const toAddresses = toObjects.flatMap((obj) => obj.value).map((a) => a.address ?? '').filter(Boolean);

            const email: InboundRfiEmail = {
                uid: msg.uid,
                messageId: parsed.messageId,
                from_name: fromAddr?.name ?? fromAddr?.address ?? '',
                from_address: fromAddr?.address ?? '',
                to_addresses: toAddresses,
                subject: parsed.subject ?? '',
                date: parsed.date,
                body_text: parsed.text ?? '',
            };

            results.push(email);
        }

    } finally {
        lock.release();
        await client.logout();
    }

    return results;
}

export async function markEmailsProcessed(
    credentials: RfiInboundEmailCredentials,
    config: RfiInboundEmailConfig,
    uids: number[]
): Promise<void> {
    if (uids.length === 0) return;

    const mailbox = config.mailbox ?? 'INBOX';

    const client = new ImapFlow({
        host: credentials.imap_host,
        port: credentials.imap_port,
        secure: credentials.imap_secure,
        auth: {
            user: credentials.imap_user,
            pass: credentials.imap_password,
        },
        logger: false,
    });

    client.on('error', (err: Error) => {
        console.error('[imap-reader] markEmailsProcessed error:', err.message);
    });

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
            () => reject(new Error(`IMAP mark-as-seen timed out after ${IMAP_TIMEOUT_MS}ms`)),
            IMAP_TIMEOUT_MS
        );
    });

    try {
        await Promise.race([doMark(client, mailbox, config, uids), timeoutPromise]);
    } finally {
        clearTimeout(timeoutHandle);
        client.logout().catch(() => undefined);
    }
}

async function doMark(
    client: ImapFlow,
    mailbox: string,
    config: RfiInboundEmailConfig,
    uids: number[]
): Promise<void> {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);

    try {
        await client.messageFlagsAdd(uids, ['\\Seen'], { uid: true });
        if (config.processed_folder) {
            await client.messageMove(uids, config.processed_folder, { uid: true });
        }
    } finally {
        lock.release();
        await client.logout();
    }
}
