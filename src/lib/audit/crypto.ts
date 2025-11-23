import { AuditData } from "./types";
import { createHmac, createHash } from 'crypto';

const AUDIT_SECRET = process.env.AUDIT_SECRET

export function computeAuditHash(userName: string, data: AuditData, previousHash: string) {
    const hashData = {
        data: data,
        userName: userName,
        previousHash: previousHash 
    };
    const newHash = createHash('sha256').update(JSON.stringify(hashData)).digest('hex');
    return newHash
}

export function computeHMAC(hash: string) {
    if (!AUDIT_SECRET) throw Error('Can not calculate HMAC, could not find the environment variable "AUDIT_SECRET". Make sure to define one in .env.local');
    const hmac = createHmac('sha256', AUDIT_SECRET).update(hash).digest('hex');
    return hmac
}