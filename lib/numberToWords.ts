export function numberToArabicWords(num: number | null): string {
    if (num === null || num < 0 || num > 100 || !Number.isInteger(num)) {
        return '';
    }

    if (num === 0) return 'صفر';
    if (num === 100) return 'مئة';

    const units: string[] = ['', 'واحد', 'اثنان', 'ثلاثة', 'اربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
    const teens: string[] = ['عشرة', 'احدى عشر', 'اثنا عشر', 'ثلاثة عشر', 'اربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens: string[] = ['', 'عشرة', 'عشرون', 'ثلاثون', 'اربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];

    if (num <= 10) {
        return units[num];
    }

    if (num < 20) {
        return teens[num - 10];
    }

    const unit = num % 10;
    const ten = Math.floor(num / 10);

    if (unit === 0) {
        return tens[ten];
    }

    return units[unit] + ' و ' + tens[ten];
}
