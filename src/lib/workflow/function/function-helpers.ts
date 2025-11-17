type ErrorChecker<T> = (value: any) => value is T;

export const isString: ErrorChecker<string> = (value): value is string => typeof value === 'string'
export const isNumber: ErrorChecker<number> = (value): value is number => typeof value === 'number'
export const isRecord: ErrorChecker<Record<string, any>> = (value): value is Record<string, any> => {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
    )
}
export const isFile: ErrorChecker<File> = (value): value is File => {
    return value !== null && typeof value === 'object' && value instanceof File;
}
export function getInput<T>(function_code: string, inputs: {[key: string]: any}, key: string, errorChecker: ErrorChecker<T>): T {
    if (!Object.prototype.hasOwnProperty.call(inputs, key)) {
        throw new Error(`Missing input ${key} in function code ${function_code}`)
    }
    const value = inputs[key]

    if (!errorChecker(value)) {
        throw new Error(`Invalid type for input ${value} for key ${key} in function code ${function_code}`)
    }
    return value
}