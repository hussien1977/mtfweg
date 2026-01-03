
import type { Student, Subject, SubjectGrade, CalculatedGrade, StudentResult, SchoolSettings, ClassData } from '../types.ts';

const MINISTERIAL_STAGES = ['الثالث متوسط', 'السادس العلمي', 'السادس الادبي', 'السادس ابتدائي'];

const isValidGrade = (grade: number | null | undefined): grade is number => {
    return grade !== null && grade !== undefined && grade >= 0;
};

export function calculateStudentResult(student: Student, subjects: Subject[], settings: SchoolSettings, classData: ClassData): { finalCalculatedGrades: Record<string, CalculatedGrade>, result: StudentResult } {
    const finalCalculatedGrades: Record<string, CalculatedGrade> = {};
    
    // 1. Handle "No Grades Yet" case
    if (!student.grades || Object.keys(student.grades).length === 0) {
        return { finalCalculatedGrades, result: { status: 'قيد الانتظار', message: 'ليس لديه درجات بعد' } };
    }
    const hasAnyGrade = subjects.some(subject => {
        const grade = student.grades?.[subject.name];
        if (!grade) return false;
        return Object.values(grade).some(g => g !== null && g !== undefined);
    });
    if (!hasAnyGrade) {
        return { finalCalculatedGrades, result: { status: 'قيد الانتظار', message: 'ليس لديه درجات بعد' } };
    }

    // 2. Initial calculations
    const isMinisterial = MINISTERIAL_STAGES.includes(classData.stage);

    subjects.forEach(subject => {
        const grade: SubjectGrade = {
            october: null, november: null, december: null, january: null,
            february: null, march: null, april: null,
            firstTerm: null, midYear: null, secondTerm: null,
            finalExam1st: null, finalExam2nd: null,
            ...student.grades?.[subject.name]
        };
        
        let firstTerm = grade.firstTerm;
        let secondTerm = grade.secondTerm;
        const isPrimary5_6 = classData.stage === 'الخامس ابتدائي' || classData.stage === 'السادس ابتدائي';
        if (isPrimary5_6) {
             const firstTermMonths = [grade.october, grade.november, grade.december, grade.january];
             if(firstTermMonths.every(isValidGrade)) {
                 firstTerm = Math.round(firstTermMonths.reduce((a, b) => a + b!, 0) / firstTermMonths.length);
             }
             const secondTermMonths = [grade.february, grade.march, grade.april];
             if(secondTermMonths.every(isValidGrade)) {
                 secondTerm = Math.round(secondTermMonths.reduce((a, b) => a + b!, 0) / secondTermMonths.length);
             }
        }

        let annualPursuit: number | null = null;
        if (isValidGrade(firstTerm) && isValidGrade(grade.midYear) && isValidGrade(secondTerm)) {
            annualPursuit = Math.round((firstTerm! + grade.midYear! + secondTerm!) / 3);
        }

        const isExempt = isValidGrade(annualPursuit) && annualPursuit >= 85 && isValidGrade(grade.midYear) && grade.midYear >= 75;

        let finalGrade1st: number | null = null;
        if (isExempt) {
            finalGrade1st = annualPursuit;
        } else if (isValidGrade(annualPursuit) && isValidGrade(grade.finalExam1st)) {
            finalGrade1st = Math.round((annualPursuit! + grade.finalExam1st!) / 2);
        }

        finalCalculatedGrades[subject.name] = {
            annualPursuit, finalGrade1st, finalGradeWithDecision: finalGrade1st, decisionApplied: 0,
            finalGrade2nd: null, isExempt, annualPursuitWithDecision: annualPursuit, decisionAppliedOnPursuit: 0,
        };
    });

    // 2.1. New robust check for incomplete grades before proceeding
    const hasIncompleteGrades = subjects.some(subject => {
        const calculated = finalCalculatedGrades[subject.name];
        if (calculated.isExempt) return false; // Exempt students don't need a final exam grade.
        
        const gradeToCheck = isMinisterial ? calculated.annualPursuit : calculated.finalGrade1st;
        // If it's -1 or -2, it's considered "complete" as a result (fail), so only null is incomplete.
        const originalGrade = student.grades?.[subject.name]?.[isMinisterial ? 'annualPursuit' as any : 'finalExam1st'];
        return gradeToCheck === null && originalGrade !== -1 && originalGrade !== -2;
    });

    if (hasIncompleteGrades) {
        return { finalCalculatedGrades, result: { status: 'قيد الانتظار', message: 'بعض الدرجات غير موجودة' } };
    }

    // 3. Apply Decision Points (Qarar)
    const PASSING_GRADE = 50;
    let remainingDecisionPoints = settings.decisionPoints;

    if (isMinisterial) {
        let remainingMinisterialDecisionPoints = classData.ministerialDecisionPoints ?? 5;
        subjects.forEach(subject => {
            const calculated = finalCalculatedGrades[subject.name];
            if (calculated.annualPursuit !== null && calculated.annualPursuit < PASSING_GRADE && calculated.annualPursuit >= (PASSING_GRADE - remainingMinisterialDecisionPoints)) {
                const pointsNeeded = PASSING_GRADE - calculated.annualPursuit;
                if (remainingMinisterialDecisionPoints >= pointsNeeded) {
                    calculated.annualPursuitWithDecision = PASSING_GRADE;
                    calculated.decisionAppliedOnPursuit = pointsNeeded;
                    remainingMinisterialDecisionPoints -= pointsNeeded;
                }
            }
        });
    } else {
        subjects.forEach(subject => {
            const calculated = finalCalculatedGrades[subject.name];
            if (calculated.finalGrade1st !== null && calculated.finalGrade1st < PASSING_GRADE && calculated.finalGrade1st >= (PASSING_GRADE - remainingDecisionPoints)) {
                const pointsNeeded = PASSING_GRADE - calculated.finalGrade1st;
                if (remainingDecisionPoints >= pointsNeeded) {
                    calculated.finalGradeWithDecision = PASSING_GRADE;
                    calculated.decisionApplied = pointsNeeded;
                    remainingDecisionPoints -= pointsNeeded;
                }
            }
        });
    }

    // 4. Calculate 2nd attempt final grade
    subjects.forEach(subject => {
        const grade = student.grades?.[subject.name];
        const calculated = finalCalculatedGrades[subject.name];
        if (isValidGrade(calculated.annualPursuit) && isValidGrade(grade?.finalExam2nd)) {
            calculated.finalGrade2nd = Math.round((calculated.annualPursuit! + grade!.finalExam2nd!) / 2);
        }
    });

    // 5. Determine Overall Result with detailed messages
    let failingSubjects1stAttempt: string[] = [];
    let decisionSubjects: string[] = [];
    let failingSubjectsCount2ndAttempt = 0;
    let anySecondAttemptGradeEntered = false;

    subjects.forEach(subject => {
        const calculated = finalCalculatedGrades[subject.name];
        if (calculated.decisionApplied > 0) { decisionSubjects.push(subject.name); }

        const gradeToCheck = isMinisterial ? calculated.annualPursuitWithDecision : calculated.finalGradeWithDecision;
        const rawGrade = student.grades?.[subject.name]?.[isMinisterial ? 'annualPursuit' as any : 'finalExam1st'];
        
        // If absent or excused (-1 or -2), they are effectively failing
        if ((gradeToCheck !== null && gradeToCheck < PASSING_GRADE && !calculated.isExempt) || rawGrade === -1 || rawGrade === -2) {
            failingSubjects1stAttempt.push(subject.name);
        }

        const rawGrade2nd = student.grades?.[subject.name]?.finalExam2nd;
        if (calculated.finalGrade2nd !== null || rawGrade2nd === -1 || rawGrade2nd === -2) {
            anySecondAttemptGradeEntered = true;
            if (calculated.finalGrade2nd === null || calculated.finalGrade2nd < PASSING_GRADE) { failingSubjectsCount2ndAttempt++; }
        } else if (gradeToCheck !== null && gradeToCheck < PASSING_GRADE && !calculated.isExempt) {
            failingSubjectsCount2ndAttempt++;
        }
    });

    const supplementarySubjectsLimit = isMinisterial ? (classData.ministerialSupplementarySubjects ?? 3) : settings.supplementarySubjectsCount;
    let status: StudentResult['status'] = 'قيد الانتظار';
    let message = 'النتيجة قيد الانتظار';

    if (anySecondAttemptGradeEntered) {
        if (failingSubjectsCount2ndAttempt === 0) {
            status = 'ناجح';
            message = 'ناجح (الدور الثاني)';
        } else {
            status = 'راسب';
            message = 'راسب دور ثاني';
        }
    } else {
        if (isMinisterial) {
            if (failingSubjects1stAttempt.length === 0) {
                status = 'مؤهل';
                message = 'مؤهل لدخول الامتحان الوزاري';
            } else if (failingSubjects1stAttempt.length <= supplementarySubjectsLimit) {
                status = 'مؤهل بقرار';
                message = `مؤهل لدخول الامتحان الوزاري بقرار (${failingSubjects1stAttempt.length} دروس)`;
            } else {
                status = 'غير مؤهل';
                message = `غير مؤهل لدخول الامتحان الوزاري (${failingSubjects1stAttempt.length} دروس)`;
            }
        } else {
            if (failingSubjects1stAttempt.length === 0) {
                status = 'ناجح';
                message = decisionSubjects.length > 0 ? `ناجح (قرار: ${decisionSubjects.join('، ')})` : 'ناجح';
            } else if (failingSubjects1stAttempt.length <= supplementarySubjectsLimit) {
                status = 'مكمل';
                let suppMessage = `مكمل (${failingSubjects1stAttempt.join('، ')})`;
                if (decisionSubjects.length > 0) {
                    suppMessage += ` (قرار: ${decisionSubjects.join('، ')})`;
                }
                message = suppMessage;
            } else {
                status = 'راسب';
                message = `راسب بـ ${failingSubjects1stAttempt.length} دروس`;
            }
        }
    }

    const result: StudentResult = { status, message };
    return { finalCalculatedGrades, result };
}
