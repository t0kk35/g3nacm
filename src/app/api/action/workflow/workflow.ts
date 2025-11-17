export type PerformWorkflowAction = {
    entityCode: string;
    entityId: string;
    orgUnitCode: string;
    actionCode: string;
    data: any;
    entityData: any; // Complete entity data from the screen
    files?: Record<string, File>; // Optional files mapped by field name
}
