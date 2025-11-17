import { XMLParser } from 'fast-xml-parser';
import { TFFinancialMessage, TFFinancialTransaction, TFParticipant, TFField, TFParticipantRole, TFFieldType } from "@/app/api/data/transaction/transaction";
import { pacs008Mapping } from './pacs008-mapping';

type FieldMapping = {
    name: string;
    label?: string;
    path: string;
    type?: TFFieldType;
}

type TranscactionMapping = {
    transactionId:string;
    fields: FieldMapping[];
}

type ParticipantMapping = {
  role: TFParticipantRole;
  label?: string;
  path: string; // Path in XML object (e.g., 'Document.FIToFICstmrCdtTrf.Debtor')
  fields: FieldMapping [];
};

export type MessageMapping = {
    messageId: string;
    messageType: string;
    headerFields: FieldMapping[];
    transactions: TranscactionMapping;
    participants: ParticipantMapping[];
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  ignoreDeclaration: true,
});

const messageMappings: Record<string, MessageMapping> = {
    'pacs.008.001.08': pacs008Mapping,
    // 'mt103': mt103Mapping,
    // etc...
};

export function mapTFMessage(rawMessage: string, messageType: string): TFFinancialMessage {
    const parsedXml = xmlParser.parse(rawMessage);
    const mapping = messageMappings[messageType];
    /// Needs error handling if not found.
    const parsed = mapXmlToMessage(parsedXml, mapping);
    return parsed
}

function getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : null), obj);
}

function getFieldByPath(obj: any, mapping: FieldMapping): TFField {
    const value = getValueByPath(obj, mapping.path);
    return {
        name: mapping.name,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        type: mapping.type,
        display_label: mapping.label ? mapping.label : mapping.name,
        isPreview: true
    }
}

function mapXmlToMessage(parsedXml: any, mapping: MessageMapping): TFFinancialMessage {
    const messageId = getValueByPath(parsedXml, mapping.messageId);
    const transactionDate = getValueByPath(parsedXml, 'Document.FIToFICstmrCdtTrf.GrpHdr.CreDtTm');

    const header = parsedXml?.Document?.FIToFICstmrCdtTrf?.GrpHdr || {};
    const parsed_transactions = parsedXml?.Document?.FIToFICstmrCdtTrf?.CdtTrfTxInf || [];

    const txArray = Array.isArray(parsed_transactions) ? parsed_transactions : [parsed_transactions];

    const headerFields = mapping.headerFields?.map(h => {
        const value = getValueByPath(header, h.path)
        const field: TFField = {
            name: h.name,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            type: h.type,
            display_label: h.name,
            isPreview: true
        }
        return field;
    });

    const transactions: TFFinancialTransaction[] = txArray.map(t => {
        const transactionId = getValueByPath(t, mapping.transactions.transactionId);
        const transactionFields = mapping.transactions.fields.map(fm => { return getFieldByPath(t, fm) })

        const participants: TFParticipant[] = mapping.participants.map(p => {
            const participantNode = getValueByPath(t, p.path);
            const fields: TFField[] = p.fields.map(f => {
                const value = getValueByPath(participantNode, f.path);
                const field: TFField = {
                    name: f.name,
                    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                    type: f.type,
                    display_label: f.label || f.name,
                    isPreview: true
                }
                return field;
            }).filter(f => f.value !== "null");

            const participant: TFParticipant = {
                role: p.role,
                label: p.label,
                fields
            }; 
            return participant;   
        })

        const transaction: TFFinancialTransaction = {
            transactionId: transactionId,  
            transactionDate: transactionDate,
            fields: transactionFields,
            participants: participants
        };
        return transaction

    }) 

    const message: TFFinancialMessage = {
        messageId,  
        messageType: mapping.messageType,
        fields: headerFields,
        transactions: transactions
    };
    return message;
}