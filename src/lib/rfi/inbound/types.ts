export type RfiInboundEmailCredentials = {
    imap_host: string;
    imap_port: number;
    imap_secure: boolean;
    imap_user: string;
    imap_password: string;
};

export type RfiInboundEmailConfig = {
    mailbox?: string;
    processed_folder?: string;
};

export type RfiEmailAttachment = {
    filename: string;
    content: Buffer;
    contentType: string;
    size: number;
};

export type InboundRfiEmail = {
    uid: number;
    messageId: string | undefined;
    from_name: string;
    from_address: string;
    to_addresses: string[];
    subject: string;
    date: Date | undefined;
    body_text: string;
    attachments: RfiEmailAttachment[];
};
