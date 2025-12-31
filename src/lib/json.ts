/**
 * Merges two JSON arrays based on separate keys using an inner join.
 * @param arr1 - First JSON array.
 * @param arr2 - Second JSON array.
 * @param key1 - The key in arr1 to join on.
 * @param key2 - The key in arr2 to join on.
 * @returns A merged array where objects from arr1 and arr2 match on the given keys.
 */
export function mergeJsonOnKeys<T1, T2>(
    arr1: T1[],
    arr2: T2[],
    key1: keyof T1,
    key2: keyof T2
  ): (T1 & T2)[] {
    // Create a Map for the second array using key2
    const map = new Map<any, T2>();
    for (const item of arr2) {
      map.set(item[key2], item);
    }
  
    // Perform the join by iterating through the first array
    const result: (T1 & T2)[] = [];
    for (const item of arr1) {
      const matchingItem = map.get(item[key1]);
      if (matchingItem) {
        // Merge matching items
        result.push({ ...item, ...matchingItem });
      }
    }
      
    return result;
}

type DataObject = { [key:string]: any};

// Create a CSV contruct from a typescript object. This can be usefull to reduce the size of data in tabular data.
export function objectToCSV(data: DataObject[], separator = ','): string {
    if (data.length === 0) {
        return ('');
    }
    const flattenedData = data.map(obj => flattenObject(obj));
    const keys = Array.from(new Set(flattenedData.flatMap(obj => Object.keys(obj))));
    const header = keys.join();
    const rows = flattenedData.map(obj => {
        return keys.map(key => {
            const value = obj[key];
            if (value === undefined && value === null) {
                return '';
            }
            if (typeof value === 'string') {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(separator);
    });
    return [header, ...rows].join('\n');
}

// Helper function for the objectToCSV function.
function flattenObject(obj: DataObject, parentKey: string ='', separator: string ='.'): DataObject {
    return Object.keys(obj).reduce((acc, key) => {
        const newKey = parentKey ? `${parentKey}${separator}${key}`: key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
              Object.assign(acc, flattenObject(obj[key], newKey, separator));
        }
        else {
          acc[newKey] = obj[key];
        }
        return acc;
    }, {} as DataObject)
}

// This function will parse all dates in an object from string to Date.
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/;
export function parseDates<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj), (_key, value) => {
    if (typeof value === 'string' && DATE_REGEX.test(value)) {
      return new Date(value);
    }
    return value;
  });
}

type AllowedValue =
  | string
  | number
  | boolean
  | Date
  | Array<AllowedValue>
  | { [key: string]: AllowedValue };

/**
 * Function to check if an object of type unkown is correct JSON. 
 * @param value The value to check
 * @returns 
 */
export function isValidJson(value: unknown): value is AllowedValue {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isValidJson);
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return Object.values(value).every(isValidJson);
  }

  return false;
}

/**
 * Function to Normalise JSON input. Can for instance be used before storing a value in the DB.
 * @param value Input value to Normalise
 * @returns 
 */
export function normalizeJSONValue(value: AllowedValue): AllowedValue {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeJSONValue);
  }

  if (typeof value === 'object' && value !== null) {
    const normalized: Record<string, AllowedValue> = {};
    for (const [k, v] of Object.entries(value)) {
      normalized[k] = normalizeJSONValue(v as AllowedValue);
    }
    return normalized;
  }

  return value;
}

/**
 * Shallow remove of null, undefinded and empty {} object keys from an object. 
 * ! Careful, make sure only optional element are null. Otherwise the returing object might not be valid !
 * 
 * @param obj The object from which to remove nulls and undefined.
 * @returns An object, cleaned of null and '{}' 
 */
export function removeNullsAndEmptyObjects<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => {
      if (value === null) return false;

      if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0
      ) {
        return false;
      }

      return true;
    })
  ) as T;
}
