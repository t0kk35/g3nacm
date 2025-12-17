import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString, isFile } from "../function-helpers";
import { updateEntityState, copyToEntityStateLog } from "../../workflow-data";
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
        // Update entity state audit trail
        copyToEntityStateLog(client, ctx.system.entityId, ctx.system.entityCode);
        updateEntityState(client, ctx.system.entityId, ctx.system.entityCode, ctx.system.actionCode, ctx.system.fromStateCode, ctx.system.userName);
        
        // Extract required inputs
        const orgUnitCode = getInput<string>(this.code, inputs, 'function.document.upload.org_unit_code', isString);
        const fileData = getInput<File>(this.code, inputs, 'function.document.upload.file_data', isFile);
        const description = getInput<string>(this.code, inputs, 'function.document.upload.description', isString);
        
        // Set info from the file         
        const filename = fileData.name
        const originalFilename = fileData.name
        const fileSize = fileData.size
        
        // Server-side MIME type detection (don't trust client)
        const clientMimeType = fileData.type
        const serverMimeType = mime.lookup(filename) || 'application/octet-stream'
        const detectedMimeType = serverMimeType !== 'application/octet-stream' ? serverMimeType : clientMimeType
        
        // Validate against allowed types
        if (!this.ALLOWED_MIME_TYPES.includes(detectedMimeType)) {
            const errorMessage = `File type not allowed: ${detectedMimeType} for file "${filename}". Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`
            throw new Error(errorMessage)
        }
        
        const mimeType = detectedMimeType
        
        // Get user information from context
        const userName = ctx.system.userName;
        
        // Get Buffer from file
        const data_buffer = Buffer.from(await fileData.arrayBuffer());

        try {
            // Insert document into workflow_document_attachment table
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
                ctx.system.entityCode,
                ctx.system.entityId,
                orgUnitCode,
                filename,
                originalFilename,
                data_buffer,
                fileSize,
                mimeType,
                userName,
                description
            ];

            const result = await client.query(insertQuery, values);
            const uploadedDocument = result.rows[0];

            // Add comprehensive audit logging
            const mimeTypeInfo = clientMimeType !== serverMimeType ? 
                `MIME type: ${mimeType} (client: ${clientMimeType}, server: ${serverMimeType})` : 
                `MIME type: ${mimeType}`

            // Return document information
            return {
                documentId: uploadedDocument.id,
                filename: filename,
                originalFilename: originalFilename,
                fileSize: fileSize,
                mimeType: mimeType,
                uploadDateTime: uploadedDocument.upload_date_time,
                uploadedByUserName: userName,
                description: description
            };

        } catch (error) {
            const errorMessage = `Failed to upload document "${originalFilename}": ${error instanceof Error ? error.message : 'Unknown error'}`;
            throw new Error(errorMessage);
        }
    }
}