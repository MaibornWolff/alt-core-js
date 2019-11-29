export function isArrayOfStrings(input: unknown): input is string[] {
    return Array.isArray(input) && input.every(it => typeof it === 'string');
}
