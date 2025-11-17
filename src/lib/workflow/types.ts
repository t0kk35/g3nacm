/**
 * System fields (protected) that are injected into the context.
 */
export type SystemFields = {
    userName: string;
    actionCode: string;
    entityId: string;
    entityCode: string;
    fromStateCode: string;
    toStateCode: string;
    entityData: any; // Complete entity data with all related information
}

export type WorkflowContext = {
    data: { [key: string]: any };
    system: SystemFields;
    auditLog: string[];
    updateData: (newData: { [key: string]: any }) => void;
}
  