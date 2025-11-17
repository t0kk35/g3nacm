export type RequestEntityLock = {
    entityId: string;
    entityCode: string;
    userName: string;
}

export type ResponseEntityLock = {
    success: boolean;
    data: {
        userName: string;
        totalTimeSpent: number;   
    }
}