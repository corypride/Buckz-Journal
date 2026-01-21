export interface CompoundPlanLevel {
  level: number;
  startAmount: number;
  targetAmount: number;
}

export interface CompoundPlan {
  id: string;
  name: string;
  description: string;
  levels: CompoundPlanLevel[];
}

export interface CompoundPlanProgress {
  planId: string;
  currentLevel: number;
  completedLevels: number[];
  lastCelebratedLevel: number;
  streak: {
    wins: number;
    levelsPassed: number;
    lastUpdated: string;
  };
}

export const STORAGE_KEY = 'bucks_bible_compound_plan';

// The 129-level relaxed compound plan provided by the user
export const RELAXED_LEVELS: CompoundPlanLevel[] = [
  { level: 1, startAmount: 3, targetAmount: 5 },
  { level: 2, startAmount: 5, targetAmount: 8 },
  { level: 3, startAmount: 8, targetAmount: 11 },
  { level: 4, startAmount: 11, targetAmount: 16 },
  { level: 5, startAmount: 16, targetAmount: 22 },
  { level: 6, startAmount: 22, targetAmount: 30 },
  { level: 7, startAmount: 30, targetAmount: 42 },
  { level: 8, startAmount: 42, targetAmount: 60 },
  { level: 9, startAmount: 60, targetAmount: 62 },
  { level: 10, startAmount: 62, targetAmount: 64 },
  { level: 11, startAmount: 64, targetAmount: 66 },
  { level: 12, startAmount: 66, targetAmount: 68 },
  { level: 13, startAmount: 68, targetAmount: 70 },
  { level: 14, startAmount: 70, targetAmount: 72 },
  { level: 15, startAmount: 72, targetAmount: 74 },
  { level: 16, startAmount: 74, targetAmount: 76 },
  { level: 17, startAmount: 76, targetAmount: 78 },
  { level: 18, startAmount: 78, targetAmount: 80 },
  { level: 19, startAmount: 80, targetAmount: 83 },
  { level: 20, startAmount: 83, targetAmount: 85 },
  { level: 21, startAmount: 85, targetAmount: 88 },
  { level: 22, startAmount: 88, targetAmount: 91 },
  { level: 23, startAmount: 91, targetAmount: 94 },
  { level: 24, startAmount: 94, targetAmount: 97 },
  { level: 25, startAmount: 97, targetAmount: 100 },
  { level: 26, startAmount: 100, targetAmount: 103 },
  { level: 27, startAmount: 103, targetAmount: 106 },
  { level: 28, startAmount: 106, targetAmount: 109 },
  { level: 29, startAmount: 109, targetAmount: 113 },
  { level: 30, startAmount: 113, targetAmount: 116 },
  { level: 31, startAmount: 116, targetAmount: 120 },
  { level: 32, startAmount: 120, targetAmount: 124 },
  { level: 33, startAmount: 124, targetAmount: 128 },
  { level: 34, startAmount: 128, targetAmount: 132 },
  { level: 35, startAmount: 132, targetAmount: 136 },
  { level: 36, startAmount: 136, targetAmount: 141 },
  { level: 37, startAmount: 141, targetAmount: 146 },
  { level: 38, startAmount: 146, targetAmount: 151 },
  { level: 39, startAmount: 151, targetAmount: 156 },
  { level: 40, startAmount: 156, targetAmount: 161 },
  { level: 41, startAmount: 161, targetAmount: 166 },
  { level: 42, startAmount: 166, targetAmount: 172 },
  { level: 43, startAmount: 172, targetAmount: 178 },
  { level: 44, startAmount: 178, targetAmount: 184 },
  { level: 45, startAmount: 184, targetAmount: 190 },
  { level: 46, startAmount: 190, targetAmount: 197 },
  { level: 47, startAmount: 197, targetAmount: 204 },
  { level: 48, startAmount: 204, targetAmount: 211 },
  { level: 49, startAmount: 211, targetAmount: 218 },
  { level: 50, startAmount: 218, targetAmount: 225 },
  { level: 51, startAmount: 225, targetAmount: 233 },
  { level: 52, startAmount: 233, targetAmount: 241 },
  { level: 53, startAmount: 241, targetAmount: 249 },
  { level: 54, startAmount: 249, targetAmount: 257 },
  { level: 55, startAmount: 257, targetAmount: 265 },
  { level: 56, startAmount: 265, targetAmount: 274 },
  { level: 57, startAmount: 274, targetAmount: 283 },
  { level: 58, startAmount: 283, targetAmount: 292 },
  { level: 59, startAmount: 292, targetAmount: 301 },
  { level: 60, startAmount: 301, targetAmount: 311 },
  { level: 61, startAmount: 311, targetAmount: 321 },
  { level: 62, startAmount: 321, targetAmount: 331 },
  { level: 63, startAmount: 331, targetAmount: 341 },
  { level: 64, startAmount: 341, targetAmount: 352 },
  { level: 65, startAmount: 352, targetAmount: 363 },
  { level: 66, startAmount: 363, targetAmount: 374 },
  { level: 67, startAmount: 374, targetAmount: 385 },
  { level: 68, startAmount: 385, targetAmount: 397 },
  { level: 69, startAmount: 397, targetAmount: 409 },
  { level: 70, startAmount: 409, targetAmount: 421 },
  { level: 71, startAmount: 421, targetAmount: 433 },
  { level: 72, startAmount: 433, targetAmount: 446 },
  { level: 73, startAmount: 446, targetAmount: 459 },
  { level: 74, startAmount: 459, targetAmount: 472 },
  { level: 75, startAmount: 472, targetAmount: 486 },
  { level: 76, startAmount: 486, targetAmount: 500 },
  { level: 77, startAmount: 500, targetAmount: 514 },
  { level: 78, startAmount: 514, targetAmount: 528 },
  { level: 79, startAmount: 528, targetAmount: 543 },
  { level: 80, startAmount: 543, targetAmount: 558 },
  { level: 81, startAmount: 558, targetAmount: 573 },
  { level: 82, startAmount: 573, targetAmount: 588 },
  { level: 83, startAmount: 588, targetAmount: 604 },
  { level: 84, startAmount: 604, targetAmount: 620 },
  { level: 85, startAmount: 620, targetAmount: 636 },
  { level: 86, startAmount: 636, targetAmount: 652 },
  { level: 87, startAmount: 652, targetAmount: 668 },
  { level: 88, startAmount: 668, targetAmount: 685 },
  { level: 89, startAmount: 685, targetAmount: 702 },
  { level: 90, startAmount: 702, targetAmount: 720 },
  { level: 91, startAmount: 720, targetAmount: 738 },
  { level: 92, startAmount: 738, targetAmount: 756 },
  { level: 93, startAmount: 756, targetAmount: 775 },
  { level: 94, startAmount: 775, targetAmount: 794 },
  { level: 95, startAmount: 794, targetAmount: 813 },
  { level: 96, startAmount: 813, targetAmount: 832 },
  { level: 97, startAmount: 832, targetAmount: 852 },
  { level: 98, startAmount: 852, targetAmount: 872 },
  { level: 99, startAmount: 872, targetAmount: 892 },
  { level: 100, startAmount: 892, targetAmount: 912 },
  { level: 101, startAmount: 912, targetAmount: 932 },
  { level: 102, startAmount: 932, targetAmount: 953 },
  { level: 103, startAmount: 953, targetAmount: 974 },
  { level: 104, startAmount: 974, targetAmount: 995 },
  { level: 105, startAmount: 995, targetAmount: 1016 },
  { level: 106, startAmount: 1016, targetAmount: 1037 },
  { level: 107, startAmount: 1037, targetAmount: 1059 },
  { level: 108, startAmount: 1059, targetAmount: 1081 },
  { level: 109, startAmount: 1081, targetAmount: 1103 },
  { level: 110, startAmount: 1103, targetAmount: 1125 },
  { level: 111, startAmount: 1125, targetAmount: 1147 },
  { level: 112, startAmount: 1147, targetAmount: 1170 },
  { level: 113, startAmount: 1170, targetAmount: 1193 },
  { level: 114, startAmount: 1193, targetAmount: 1216 },
  { level: 115, startAmount: 1216, targetAmount: 1239 },
  { level: 116, startAmount: 1239, targetAmount: 1262 },
  { level: 117, startAmount: 1262, targetAmount: 1285 },
  { level: 118, startAmount: 1285, targetAmount: 1309 },
  { level: 119, startAmount: 1309, targetAmount: 1333 },
  { level: 120, startAmount: 1333, targetAmount: 1357 },
  { level: 121, startAmount: 1357, targetAmount: 1381 },
  { level: 122, startAmount: 1381, targetAmount: 1405 },
  { level: 123, startAmount: 1405, targetAmount: 1430 },
  { level: 124, startAmount: 1430, targetAmount: 1455 },
  { level: 125, startAmount: 1455, targetAmount: 1480 },
  { level: 126, startAmount: 1480, targetAmount: 1505 },
  { level: 127, startAmount: 1505, targetAmount: 1530 },
  { level: 128, startAmount: 1530, targetAmount: 1555 },
  { level: 129, startAmount: 1555, targetAmount: 1580 },
];

export const DEFAULT_PLANS: CompoundPlan[] = [
  {
    id: 'relaxed',
    name: 'Relaxed',
    description: 'Steady growth with manageable targets',
    levels: RELAXED_LEVELS,
  },
];

// Helper functions for localStorage management
export function loadProgressFromStorage(): CompoundPlanProgress | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveProgressToStorage(progress: CompoundPlanProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save compound plan progress:', e);
  }
}

export function clearProgressFromStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear compound plan progress:', e);
  }
}

// Get the default progress object for a new user
export function getDefaultProgress(planId: string): CompoundPlanProgress {
  return {
    planId,
    currentLevel: 1,
    completedLevels: [],
    lastCelebratedLevel: 0,
    streak: {
      wins: 0,
      levelsPassed: 0,
      lastUpdated: new Date().toISOString(),
    },
  };
}

// Auto-detect current level based on portfolio value
export function detectCurrentLevel(portfolioValue: number, plan: CompoundPlan): number {
  for (let i = plan.levels.length - 1; i >= 0; i--) {
    const level = plan.levels[i];
    if (portfolioValue >= level.startAmount) {
      return level.level;
    }
  }
  return 1;
}

// Parse CSV file for custom plan upload
export function parsePlanCSV(csvContent: string): CompoundPlanLevel[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const levelIndex = headers.indexOf('level');
  const startIndex = headers.indexOf('startamount') !== -1 ? headers.indexOf('startamount') : headers.indexOf('start');
  const targetIndex = headers.indexOf('targetamount') !== -1 ? headers.indexOf('targetamount') : headers.indexOf('target');

  if (levelIndex === -1 || startIndex === -1 || targetIndex === -1) {
    throw new Error('CSV must contain columns: level, startAmount, targetAmount');
  }

  const levels: CompoundPlanLevel[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < headers.length) continue;

    const level = parseInt(values[levelIndex], 10);
    const startAmount = parseFloat(values[startIndex]);
    const targetAmount = parseFloat(values[targetIndex]);

    if (!isNaN(level) && !isNaN(startAmount) && !isNaN(targetAmount)) {
      levels.push({ level, startAmount, targetAmount });
    }
  }

  if (levels.length === 0) {
    throw new Error('No valid levels found in CSV');
  }

  return levels.sort((a, b) => a.level - b.level);
}

// Check if a level is a milestone level
export function isMilestoneLevel(level: number): boolean {
  return [25, 50, 75, 100, 129].includes(level);
}
