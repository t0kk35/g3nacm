import { MessageMapping } from "./message-mapper";

export const pacs008Mapping: MessageMapping = {
  messageId: 'Document.FIToFICstmrCdtTrf.GrpHdr.MsgId',
  messageType: 'pacs.008.001.08',
  headerFields: [
    {
      name: 'DateTime',
      path: 'CreDtTm',
      type: 'datetime',
      label: 'Date Time'
    },
    {
      name: 'NumberofTransactions',
      path: 'NbOfTxs',
      type: 'number',
      label: 'Number of Transactions'
    }
  ],
  transactions: {
      transactionId: 'PmtId.InstrId',
      fields: [
        {
          name: 'Amount',
          path: 'IntrBkSttlmAmt.#text',
          type: 'amount',
          label: 'Amount'
        },
        {
          name: 'Currency',
          path: 'IntrBkSttlmAmt.@_Ccy',
          type: 'currency',
          label: 'Currency'
        },
        {
          name: 'SettlementDate',
          path: 'IntrBkSttlmDt',
          type: 'date',
          label: 'Settlement Date'
        },
        {
          name: 'Description',
          path: 'RmtInf.Ustrd',
          type: 'text',
          label: 'Description'
        }
      ],
  },
  participants: [
    {
      role: 'debtor',
      label: 'Debtor',
      path: 'Dbtr',
      fields: [
        { name: 'Name', path: 'Nm', type: 'text' },
        { name: 'Address', path: 'PstlAdr', type: 'address' }
      ]
    },
    {
      role: 'debtorAgent',
      label: 'Debtor Agent',
      path: 'DbtrAgt.FinInstnId',
      fields: [
        { name: 'BIC', path: 'BICFI', type: 'bic' },
        { name: 'Bank Name', path: 'Nm', type: 'text' }
      ]
    },
    {
      role: 'intermediaryAgent',
      label: 'Intermediary Agent',
      path: 'IntrmyAgt1.FinInstnId',
      fields: [
        { name: 'BIC', path: 'BICFI', type: 'bic' },
        { name: 'Bank Name', path: 'Nm', type: 'text' }
      ]
    },
    {
      role: 'creditorAgent',
      label: 'Creditor Agent',
      path: 'CdtrAgt.FinInstnId',
      fields: [
        { name: 'BIC', path: 'BICFI', type: 'bic' },
        { name: 'Bank Name', path: 'Nm', type: 'text' }
      ]
    },
    {
      role: 'creditor',
      label: 'Creditor',
      path: 'Cdtr',
      fields: [
        { name: 'Name', path: 'Nm', type: 'text' },
        { name: 'Address', path: 'PstlAdr', type: 'address' }
      ]
    }
  ]
};