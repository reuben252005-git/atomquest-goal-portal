// backend/src/routes/reports.ts
// Achievement report (CSV export) + Completion dashboard

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ─── ACHIEVEMENT REPORT: CSV export ──────────────────────────────────────

router.get('/achievement/:cycleId', async (req: Request, res: Response) => {
  if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });

  const filter = req.user!.role === 'MANAGER'
    ? { managerId: req.user!.id, cycleId: req.params.cycleId }
    : { cycleId: req.params.cycleId };

  const sheets = await prisma.goalSheet.findMany({
    where: filter,
    include: {
      employee: { select: { name: true, email: true, department: true } },
      goals: { include: { checkIns: true } }
    }
  });

  const rows: string[] = [
    'Employee,Email,Department,Goal Title,Thrust Area,UoM Type,Target,Q1 Achievement,Q1 Score,Q2 Achievement,Q2 Score,Q3 Achievement,Q3 Score,Q4 Achievement,Q4 Score,Weightage'
  ];

  for (const sheet of sheets) {
    for (const goal of sheet.goals) {
      const q = (q: string) => goal.checkIns.find(c => c.quarter === q);
      rows.push([
        sheet.employee.name,
        sheet.employee.email,
        sheet.employee.department ?? '',
        `"${goal.title}"`,
        goal.thrustArea,
        goal.uomType,
        goal.target,
        q('Q1')?.actualAchievement ?? '',
        q('Q1')?.score ?? '',
        q('Q2')?.actualAchievement ?? '',
        q('Q2')?.score ?? '',
        q('Q3')?.actualAchievement ?? '',
        q('Q3')?.score ?? '',
        q('Q4')?.actualAchievement ?? '',
        q('Q4')?.score ?? '',
        goal.weightage
      ].join(','));
    }
  }

  const csv = rows.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=achievement_report_${req.params.cycleId}.csv`);
  res.send(csv);
});

// ─── COMPLETION DASHBOARD ─────────────────────────────────────────────────

router.get('/completion/:cycleId', async (req: Request, res: Response) => {
  if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });

  const filter = req.user!.role === 'MANAGER'
    ? { managerId: req.user!.id, cycleId: req.params.cycleId }
    : { cycleId: req.params.cycleId };

  const sheets = await prisma.goalSheet.findMany({
    where: filter,
    include: {
      employee: { select: { id: true, name: true, email: true } },
      goals: { include: { checkIns: true } }
    }
  });

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const summary = sheets.map(sheet => {
    const checkinCompletion = quarters.map(q => ({
      quarter: q,
      completed: sheet.goals.every(g =>
        g.checkIns.some(c => c.quarter === q && c.status === 'COMPLETED')
      )
    }));
    return {
      employeeId: sheet.employee.id,
      employeeName: sheet.employee.name,
      email: sheet.employee.email,
      sheetStatus: sheet.status,
      checkinCompletion
    };
  });

  const completionRates = quarters.map(q => ({
    quarter: q,
    rate: Math.round(
      (summary.filter(s => s.checkinCompletion.find(c => c.quarter === q)?.completed).length / summary.length) * 100
    ) || 0
  }));

  res.json({ employees: summary, completionRates });
});

// ─── AUDIT LOG ───────────────────────────────────────────────────────────

router.get('/audit/:cycleId', async (req: Request, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500
  });

  res.json(logs);
});

export { router as reportsRouter };
