import { BaseError } from '@/lib/base-error';

export class DataNotFoundError extends BaseError {
    constructor(public readonly entity: string, public readonly id: string) {
        super('DATA_NOT_FOUND', 'data-query', `Entity '${entity}' with id '${id}' not found`);
    }
}

export class DataNotUniqueError extends BaseError {
    constructor(public readonly entity: string, public readonly id: string) {
        super('DATA_NOT_UNIQUE', 'data-query', `Entity '${entity}' with id '${id}' is not unique`);
    }
}

export class DataQueryError extends BaseError {
    constructor(message: string, cause?: Error) {
        super('DATA_QUERY_ERROR', 'data-query', message, cause);
    }
}
