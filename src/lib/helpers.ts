const REGEX = /-/g

/**
 * Generate a human readable identifier. PREFIX-YYYYMMDD-XXXX (last 4 hex chars of the UUID, uppercased)
 * @param prefix a prefix for the identifier
 * @param uuid the uuid to create an identifier for
 * @param now date and time to use in the identifier
 * @returns A human readable identifier, based on the UUID and date
 */
export function generateIdentifier(prefix: string, uuid: string, now: Date): string {
    const date = now.toISOString().slice(0, 10).replace(REGEX, '');
    const suffix = uuid.replace(REGEX, '').slice(-4).toUpperCase();
    return `${prefix}-${date}-${suffix}`;
}