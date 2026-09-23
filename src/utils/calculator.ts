export interface Course {
  id: string;
  name: string;
  credits: number;
  scale: 'percentage' | 'gpa43' | 'gpa40';
  grade: number; // raw value based on selected scale
  excludeFromGPA?: boolean; // 新增：是否不採計至 GPA
}

export type ConversionSystemId = 'standard' | 'uq' | 'usyd';

export interface ConversionSystemMeta {
  id: ConversionSystemId;
  name: string;
  description: string;
}

export const CONVERSION_SYSTEMS: ConversionSystemMeta[] = [
  {
    id: 'standard',
    name: '標準澳洲 7 分制 (Standard)',
    description: '一般澳洲大學通用標準（HD 85+, D 75+, CR 65+, P 50+）'
  },
  {
    id: 'uq',
    name: '昆士蘭大學 (UQ) 對照模式',
    description: '適用於 University of Queensland 國際學生 GPA 換算'
  },
  {
    id: 'usyd',
    name: '雪梨大學 (USyd) 對照模式',
    description: '適用於 University of Sydney 升學審查百分制對照標準'
  }
];

export interface PresetSystem {
  id: string;
  name: string;
  description: string;
  courses: Course[];
}

export const PRESET_SYSTEMS: PresetSystem[] = [
  {
    id: 'taiwan-percentage',
    name: '台灣大學百分制 (0-100)',
    description: '適用於台灣多數大學百分制成績單轉換',
    courses: [
      { id: '1', name: '微積分 (Calculus)', credits: 3, scale: 'percentage', grade: 88, excludeFromGPA: false },
      { id: '2', name: '普通物理 (General Physics)', credits: 3, scale: 'percentage', grade: 76, excludeFromGPA: false },
      { id: '3', name: '會計學原理 (Accounting)', credits: 3, scale: 'percentage', grade: 92, excludeFromGPA: false },
      { id: '4', name: '個體經濟學 (Microeconomics)', credits: 3, scale: 'percentage', grade: 84, excludeFromGPA: false },
      { id: '5', name: '大學國文 (Chinese)', credits: 2, scale: 'percentage', grade: 80, excludeFromGPA: false }
    ]
  },
  {
    id: 'taiwan-43',
    name: '台灣 4.3 等第制',
    description: '適用於採用 4.3 GPA 滿分之台灣大專院校',
    courses: [
      { id: '1', name: '資料結構 (Data Structures)', credits: 4, scale: 'gpa43', grade: 4.0, excludeFromGPA: false },
      { id: '2', name: '演算法 (Algorithms)', credits: 4, scale: 'gpa43', grade: 3.7, excludeFromGPA: false },
      { id: '3', name: '作業系統 (Operating Systems)', credits: 3, scale: 'gpa43', grade: 3.3, excludeFromGPA: false },
      { id: '4', name: '線性代數 (Linear Algebra)', credits: 3, scale: 'gpa43', grade: 4.3, excludeFromGPA: false }
    ]
  },
  {
    id: 'us-40',
    name: '美國 4.0 等第制',
    description: '適用於美式計分或採用 4.0 體系之國際課程',
    courses: [
      { id: '1', name: 'Advanced Corporate Finance', credits: 3, scale: 'gpa40', grade: 4.0, excludeFromGPA: false },
      { id: '2', name: 'Strategic Management', credits: 3, scale: 'gpa40', grade: 3.7, excludeFromGPA: false },
      { id: '3', name: 'Marketing Analytics', credits: 3, scale: 'gpa40', grade: 3.0, excludeFromGPA: false },
      { id: '4', name: 'Business Ethics', credits: 2, scale: 'gpa40', grade: 4.0, excludeFromGPA: false }
    ]
  }
];

export interface ConversionResult {
  gpa7: number;
  mark: number;
  gradeName: string;
  badgeColor: string;
}

/**
 * 將各類原始成績轉換為澳洲 7 分制與對應百分位分數
 */
export function convertToGPA7(
  scale: 'percentage' | 'gpa43' | 'gpa40',
  grade: number,
  systemId: ConversionSystemId = 'standard',
  failPoint: number = 0.0
): ConversionResult {
  if (isNaN(grade)) {
    return { gpa7: 0, mark: 0, gradeName: 'Fail', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200' };
  }

  if (scale === 'percentage') {
    const mark = Math.max(0, Math.min(100, grade));
    let gpa7 = 0;
    let gradeName = 'Fail';
    let badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';

    if (mark >= 85) {
      gpa7 = 7.0;
      gradeName = 'High Distinction (HD)';
      badgeColor = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    }
    else if (mark >= 75) {
      gpa7 = 6.0;
      gradeName = 'Distinction (D)';
      badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
    }
    else if (mark >= 65) {
      gpa7 = 5.0;
      gradeName = 'Credit (CR)';
      badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    }
    else if (mark >= 50) {
      gpa7 = 4.0;
      gradeName = 'Pass (P)';
      badgeColor = 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800';
    }
    else {
      gpa7 = failPoint;
      gradeName = 'Fail (N)';
      badgeColor = 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
    }

    return { gpa7, mark, gradeName, badgeColor };
  }

  if (scale === 'gpa43') {
    const g43 = Math.max(0, Math.min(4.3, grade));
    let gpa7 = 0;
    let mark = 50;
    let gradeName = 'Fail';
    let badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';

    if (g43 >= 4.0) { gpa7 = 7.0; mark = 90; gradeName = 'High Distinction (HD)'; badgeColor = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'; }
    else if (g43 >= 3.7) { gpa7 = 6.5; mark = 82; gradeName = 'High Distinction (HD)'; badgeColor = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'; }
    else if (g43 >= 3.3) { gpa7 = 6.0; mark = 76; gradeName = 'Distinction (D)'; badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300'; }
    else if (g43 >= 2.7) { gpa7 = 5.0; mark = 68; gradeName = 'Credit (CR)'; badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'; }
    else if (g43 >= 2.0) { gpa7 = 4.0; mark = 55; gradeName = 'Pass (P)'; badgeColor = 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300'; }
    else { gpa7 = failPoint; mark = 40; gradeName = 'Fail (N)'; badgeColor = 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'; }

    return { gpa7, mark, gradeName, badgeColor };
  }

  if (scale === 'gpa40') {
    const g40 = Math.max(0, Math.min(4.0, grade));
    let gpa7 = 0;
    let mark = 50;
    let gradeName = 'Fail';
    let badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';

    if (g40 >= 3.7) { gpa7 = 7.0; mark = 90; gradeName = 'High Distinction (HD)'; badgeColor = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'; }
    else if (g40 >= 3.3) { gpa7 = 6.0; mark = 76; gradeName = 'Distinction (D)'; badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300'; }
    else if (g40 >= 2.7) { gpa7 = 5.0; mark = 68; gradeName = 'Credit (CR)'; badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'; }
    else if (g40 >= 2.0) { gpa7 = 4.0; mark = 55; gradeName = 'Pass (P)'; badgeColor = 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300'; }
    else { gpa7 = failPoint; mark = 40; gradeName = 'Fail (N)'; badgeColor = 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'; }

    return { gpa7, mark, gradeName, badgeColor };
  }

  return { gpa7: 0, mark: 0, gradeName: 'Fail', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200' };
}

/**
 * 依據 7 分制 GPA 計算對應的澳洲榮譽學位分級
 */
export function getHonorsClassification(gpa7: number): { title: string; desc: string; color: string } {
  if (gpa7 >= 6.5) {
    return {
      title: 'First Class Honors / High Distinction',
      desc: '達到澳洲頂尖大學研究所入學及獎學金最高標，極具競爭力。',
      color: 'text-amber-800 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    };
  } else if (gpa7 >= 5.5) {
    return {
      title: 'Second Class Honors (Division A) / Distinction',
      desc: '符合多數澳洲八大名校 (Go8) 熱門碩士學程入學要求。',
      color: 'text-indigo-800 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
    };
  } else if (gpa7 >= 4.5) {
    return {
      title: 'Second Class Honors (Division B) / Credit',
      desc: '符合多數澳洲大學一般研究所或專業課程申請門檻。',
      color: 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    };
  } else if (gpa7 >= 4.0) {
    return {
      title: 'Pass',
      desc: '達到學位及格標準，部分課程可能需要相關工作經驗輔助申請。',
      color: 'text-sky-800 bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
    };
  } else {
    return {
      title: 'Below Passing Standard',
      desc: '低於多sure研究所入學標準，建議尋求補救或預科途徑。',
      color: 'text-rose-800 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
    };
  }
}

/**
 * 檢查單科成績是否合法
 */
export function isGradeInvalid(course: Course): boolean {
  const g = Number(course.grade);
  if (isNaN(g)) return true;
  if (course.scale === 'percentage' && (g < 0 || g > 100)) return true;
  if (course.scale === 'gpa43' && (g < 0 || g > 4.3)) return true;
  if (course.scale === 'gpa40' && (g < 0 || g > 4.0)) return true;
  return false;
}

/**
 * 檢查學分是否合法
 */
export function isCreditsInvalid(credits: number): boolean {
  const cr = Number(credits);
  return isNaN(cr) || cr <= 0;
}
