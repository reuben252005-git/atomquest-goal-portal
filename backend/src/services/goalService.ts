// backend/src/services/goalService.ts
// Core business logic: validation, scoring, approval workflow

import { PrismaClient, UomType, GoalStatus } from '@prisma/client';
const prisma = new PrismaClient();

// ─── VALIDATION ─────────────────────────────────────────────────────────────

export async function validateGoalSheet(sheetId: string): Promise<{ valid: boolean; errors: string[] }> {
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: { goals: true }
  });

  if (!sheet) return { valid: false, errors: ['Goal sheet not found'] };

  const errors: string[] = [];
  const goals = sheet.goals;

  // Rule 1: max 8 goals
  if (goals.length > 8) {
    errors.push(`Too many goals: ${goals.length}. Maximum allowed is 8.`);
  }

  // Rule 2: min 10% weightage per goal
  const underweightGoals = goals.filter(g => g.weightage < 10);
  if (underweightGoals.length > 0) {
    errors.push(`Goals with less than 10% weightage: ${underweightGoals.map(g => g.title).join(', ')}`);
  }

  // Rule 3: total weightage = 100%
  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
  if (Math.abs(totalWeightage - 100) > 0.01) {
    errors.push(`Total weightage is ${totalWeightage.toFixed(1)}%. Must equal exactly 100%.`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── SCORING ────────────────────────────────────────────────────────────────

export function computeScore(
  uomType: UomType,
  target: number,
  achievement: number,
  targetDate?: Date | null,
  completionDate?: Date | null
): number {
  switch (uomType) {
    case UomType.MIN_NUMERIC:
    case UomType.PERCENTAGE:
      // Higher is better: Sales Revenue, etc.
      if (target === 0) return 0;
      return Math.min((achievement / target) * 100, 150); // cap at 150%

    case UomType.MAX_NUMERIC:
      // Lower is better: TAT, Cost, etc.
      if (achievement === 0) return 150; // target met perfectly
      return Math.min((target / achievement) * 100, 150);

    case UomType.TIMELINE:
      // Date-based: on time = 100%, late = prorated
      if (!targetDate || !completionDate) return 0;
      const onTime = completionDate <= targetDate;
      if (onTime) return 100;
      // Late: 0% for now (can extend to prorated penalty)
      return 0;

    case UomType.ZERO_BASED:
      // Zero = success (e.g. safety incidents, defects)
      return achievement === 0 ? 100 : 0;

    default:
      return 0;
  }
}

// Compute weighted overall score for a goal sheet in a quarter
export async function computeSheetScore(sheetId: string, quarter: string): Promise<number> {
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: {
      goals: {
        include: {
          checkIns: { where: { quarter: quarter as any } }
        }
      }
    }
  });

  if (!sheet) return 0;

  let weightedScore = 0;
  for (const goal of sheet.goals) {
    const checkIn = goal.checkIns[0];
    if (!checkIn || checkIn.actualAchievement === null) continue;

    const score = computeScore(
      goal.uomType,
      goal.target,
      checkIn.actualAchievement,
      goal.targetDate,
      checkIn.completionDate
    );
    weightedScore += (goal.weightage / 100) * score;
  }

  return Math.round(weightedScore * 100) / 100;
}

// ─── APPROVAL WORKFLOW ──────────────────────────────────────────────────────

export async function submitGoalSheet(sheetId: string, employeeId: string) {
  const { valid, errors } = await validateGoalSheet(sheetId);
  if (!valid) throw new Error(`Validation failed: ${errors.join('; ')}`);

  const sheet = await prisma.goalSheet.findFirst({
    where: { id: sheetId, employeeId, status: GoalStatus.DRAFT }
  });
  if (!sheet) throw new Error('Sheet not found or not in DRAFT status');

  return prisma.goalSheet.update({
    where: { id: sheetId },
    data: { status: GoalStatus.SUBMITTED, submittedAt: new Date() }
  });
}

export async function approveGoalSheet(sheetId: string, managerId: string) {
  const sheet = await prisma.goalSheet.findFirst({
    where: { id: sheetId, managerId, status: GoalStatus.SUBMITTED }
  });
  if (!sheet) throw new Error('Sheet not found or not in SUBMITTED status');

  return prisma.goalSheet.update({
    where: { id: sheetId },
    data: { status: GoalStatus.APPROVED, approvedAt: new Date() }
  });
}

export async function returnGoalSheet(sheetId: string, managerId: string, reason: string) {
  const sheet = await prisma.goalSheet.findFirst({
    where: { id: sheetId, managerId, status: GoalStatus.SUBMITTED }
  });
  if (!sheet) throw new Error('Sheet not found or not in SUBMITTED status');

  return prisma.goalSheet.update({
    where: { id: sheetId },
    data: { status: GoalStatus.RETURNED, returnReason: reason }
  });
}

export async function unlockGoalSheet(sheetId: string, adminId: string) {
  await prisma.auditLog.create({
    data: {
      goalId: null,
      userId: adminId,
      action: 'SHEET_UNLOCKED',
      fieldName: 'status',
      oldValue: 'APPROVED',
      newValue: 'UNLOCKED'
    }
  });

  return prisma.goalSheet.update({
    where: { id: sheetId },
    data: { status: GoalStatus.UNLOCKED }
  });
}

// ─── SHARED GOALS ───────────────────────────────────────────────────────────

export async function pushSharedGoal(
  sharedGoalId: string,
  targetSheetIds: string[],
  defaultWeightage: number
) {
  const sharedGoal = await prisma.sharedGoal.findUnique({ where: { id: sharedGoalId } });
  if (!sharedGoal) throw new Error('Shared goal not found');

  const created = [];
  for (const sheetId of targetSheetIds) {
    const goal = await prisma.goal.create({
      data: {
        sheetId,
        thrustArea: sharedGoal.thrustArea,
        title: sharedGoal.title,
        description: sharedGoal.description,
        uomType: sharedGoal.uomType,
        target: sharedGoal.target,
        targetDate: sharedGoal.targetDate,
        weightage: defaultWeightage,
        isShared: true,
        sharedGoalId
      }
    });
    created.push(goal);
  }
  return created;
}
