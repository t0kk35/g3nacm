export type PerformWorkflowAction = {
    entityCode: string;
    entityId: string;
    orgUnitCode: string;
    actionCode: string;
    data: any;
    entityData: any; // Complete entity data from the screen
}
