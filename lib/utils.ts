// lib/utils.ts

/**
 * Provides a robust, centralized function to normalize strings for use as Firebase path segments.
 * This ensures that variations in Arabic character input (e.g., "الفيزياء", " الفيزياء ", "الفِيزيَاء", "فيزياء")
 * all resolve to the exact same path key, solving the data sharing issue between teachers.
 *
 * It performs the following operations:
 * 1. Trims leading/trailing whitespace.
 * 2. Removes the Arabic definite article "ال" from the beginning of the string.
 * 3. Removes Arabic diacritics (tashkeel) and tatweel.
 * 4. Normalizes Alef variants (أ, إ, آ) to a plain Alef (ا).
 * 5. Normalizes Teh Marbuta (ة) to Heh (ه).
 * 6. Normalizes Alef Maksura (ى) to Yaa (ي).
 * 7. Removes all remaining whitespace characters.
 * 8. Converts the entire string to lowercase for final consistency.
 *
 * @param str The input string (e.g., a stage or subject name).
 * @returns A normalized string safe for use as a Firebase path key.
 */
export const normalizePathSegment = (str: string): string => {
    if (!str) return '';
    return str
        .trim()
        // 1. Remove the definite article "ال" from the beginning of the string
        .replace(/^ال/, '')
        // 2. Remove diacritics (tashkeel) and tatweel
        .replace(/[\u0640\u064B-\u0652]/g, '')
        // 3. Normalize Alef variants to a plain Alef
        .replace(/[أإآ]/g, 'ا')
        // 4. Normalize Teh Marbuta to Heh
        .replace(/ة/g, 'ه')
        // 5. Normalize Yaa/Alef Maksura to Yaa
        .replace(/ى/g, 'ي')
        // 6. Remove all whitespace
        .replace(/\s+/g, '')
        // 7. Convert to lowercase as a final safe step
        .toLowerCase();
};