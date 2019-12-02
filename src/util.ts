export function isArrayOfStrings(input: unknown): input is string[] {
    return Array.isArray(input) && input.every(it => typeof it === 'string');
}

export function objectFromEntries(arr: [string, unknown][]): object {
    return Object.assign({}, ...Array.from(arr, ([k, v]) => ({ [k]: v })));
}

export function trim(text: string, length: number, dots = '...'): string {
    return text.length > length
        ? `${text.substring(0, length - dots.length)}${dots}`
        : text;
}
