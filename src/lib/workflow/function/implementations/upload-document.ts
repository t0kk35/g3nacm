import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isFileUploadArray, FileUploadItem, isString, isUuid } from "../function-helpers";
import mime from 'mime-types';

export class FunctionUploadDocument implements IWorkflowFunction {
    code = 'function.document.upload';

    private readonly ALLOWED_MIME_TYPES = [
        'text/plain',
        'text/markdown',
        'text/csv',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/json',
        'application/xml',
        'text/xml'
    ];

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        const entityId = getInput<string>(this.code, inputs, 'function.document.upload.entity_id', isUuid);
        const entityCode = getInput<string>(this.code, inputs, 'function.document.upload.entity_code', isString);
        const files = getInput<FileUploadItem[]>(this.code, inputs, 'function.document.upload.files', isFileUploadArray);
        const userName = ctx.system.userName;
        const uploadedDocuments = [];

        for (const { file, description, orgUnitCode } of files) {
            const filename = file.name;
            const fileSize = file.size;

            const clientMimeType = file.type;
            const serverMimeType = mime.lookup(filename) || 'application/octet-stream';
            const detectedMimeType = serverMimeType !== 'application/octet-stream' ? serverMimeType : clientMimeType;

            if (!this.ALLOWED_MIME_TYPES.includes(detectedMimeType)) {
                throw new Error(`File type not allowed: ${detectedMimeType} for file "${filename}". Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`);
            }

            const mimeType = detectedMimeType;
            const data_buffer = Buffer.from(await file.arrayBuffer());

            try {
                const insertQuery = `
                    INSERT INTO workflow_document_attachment (
                        entity_code,
                        entity_id,
                        org_unit_code,
                        filename,
                        original_filename,
                        file_data,
                        file_size,
                        mime_type,
                        uploaded_by_user_name,
                        description,
                        upload_date_time,
                        is_active
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), TRUE)
                    RETURNING id, upload_date_time
                `;
                const values = [
                    entityCode,
                    entityId,
                    orgUnitCode,
                    filename,
                    filename,
                    data_buffer,
                    fileSize,
                    mimeType,
                    userName,
                    description,
                ];
                const result = await client.query(insertQuery, values);
                const row = result.rows[0];
                uploadedDocuments.push({
                    documentId: row.id,
                    filename,
                    fileSize,
                    mimeType,
                    uploadDateTime: row.upload_date_time,
                    uploadedByUserName: userName,
                    description,
                });
            } catch (error) {
                throw new Error(`Failed to upload document "${filename}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        return { uploadedDocuments };
    }
}