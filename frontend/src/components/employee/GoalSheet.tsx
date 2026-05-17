// frontend/src/components/employee/GoalSheet.tsx
'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { goalsApi } from '@/lib/api';

const UOM_OPTIONS = [
  { value: 'MIN_NUMERIC', label: 'Numeric — Higher is better (e.g. Revenue)' },
  { value: 'MAX_NUMERIC', label: 'Numeric — Lower is better (e.g. TAT, Cost)' },
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'TIMELINE', label: 'Timeline (Date-based)' },
  { value: 'ZERO_BASED', label: 'Zero-based (e.g. Safety incidents)' },
];

const THRUST_AREAS = [
  'Revenue Growth', 'Cost Optimisation', 'Customer Satisfaction',
  'Product Quality', 'People Development', 'Process Improvement',
  'Innovation', 'Compliance & Safety',
];

interface GoalSheetProps { cycleId: string; }

export default function GoalSheet({ cycleId }: GoalSheetProps) {
  const [sheet, setSheet] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    goalsApi.getMySheet(cycleId).then(setSheet);
  }, [cycleId]);

  const isLocked = sheet?.status === 'APPROVED';
  const totalWeightage = sheet?.goals?.reduce((s: number, g: any) => s + g.weightage, 0) ?? 0;
  const canAddGoal = !isLocked && (sheet?.goals?.length ?? 0) < 8;

  const onAddGoal = async (data: any) => {
    setLoading(true);
    try {
      await goalsApi.addGoal({ ...data, sheetId: sheet.id, target: parseFloat(data.target), weightage: parseFloat(data.weightage) });
      const updated = await goalsApi.getMySheet(cycleId);
      setSheet(updated);
      setShowForm(false);
      reset();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error adding goal');
    }
    setLoading(false);
  };

  const onDelete = async (goalId: string) => {
    if (!confirm('Delete this goal?')) return;
    await goalsApi.deleteGoal(goalId);
    const updated = await goalsApi.getMySheet(cycleId);
    setSheet(updated);
  };

  const onSubmit = async () => {
    const { valid, errors } = await goalsApi.validateSheet(sheet.id);
    if (!valid) { setValidationErrors(errors); return; }
    setValidationErrors([]);
    try {
      await goalsApi.submitSheet(sheet.id);
      setSubmitMsg('Goal sheet submitted successfully!');
      const updated = await goalsApi.getMySheet(cycleId);
      setSheet(updated);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Submission failed');
    }
  };

  if (!sheet) return <div className="p-6 text-gray-500">Loading goal sheet...</div>;

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    RETURNED: 'bg-red-100 text-red-700',
    APPROVED: 'bg-green-100 text-green-700',
    UNLOCKED: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Goal Sheet</h1>
          <p className="text-sm text-gray-500 mt-1">Cycle {cycleId} · {sheet.goals?.length ?? 0}/8 goals</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[sheet.status]}`}>
          {sheet.status}
        </span>
      </div>

      {/* Return reason */}
      {sheet.status === 'RETURNED' && sheet.returnReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-red-700">Returned for rework</p>
          <p className="text-sm text-red-600 mt-1">{sheet.returnReason}</p>
        </div>
      )}

      {/* Weightage bar */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Total weightage</span>
          <span className={`font-semibold ${Math.abs(totalWeightage - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
            {totalWeightage.toFixed(1)}% / 100%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${totalWeightage > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(totalWeightage, 100)}%` }}
          />
        </div>
      </div>

      {/* Goals list */}
      <div className="space-y-3 mb-6">
        {sheet.goals?.map((goal: any) => (
          <div key={goal.id} className="bg-white border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{goal.thrustArea}</span>
                  {goal.isShared && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Shared</span>}
                </div>
                <p className="font-medium text-gray-900 mt-1">{goal.title}</p>
                {goal.description && <p className="text-sm text-gray-500 mt-0.5">{goal.description}</p>}
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span>Target: <b>{goal.target}</b></span>
                  <span>UoM: <b>{goal.uomType}</b></span>
                  <span>Weight: <b>{goal.weightage}%</b></span>
                </div>
              </div>
              {!isLocked && (
                <button onClick={() => onDelete(goal.id)} className="text-red-400 hover:text-red-600 ml-4 text-sm">Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          {validationErrors.map((e, i) => <p key={i} className="text-sm text-red-700">• {e}</p>)}
        </div>
      )}

      {/* Success message */}
      {submitMsg && <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-sm text-green-700">{submitMsg}</div>}

      {/* Add goal form */}
      {showForm && !isLocked && (
        <form onSubmit={handleSubmit(onAddGoal)} className="bg-gray-50 border rounded-lg p-4 mb-4 space-y-3">
          <h3 className="font-medium text-gray-900">Add new goal</h3>
          <select {...register('thrustArea', { required: true })} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">Select thrust area</option>
            {THRUST_AREAS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input {...register('title', { required: true })} placeholder="Goal title *" className="w-full border rounded px-3 py-2 text-sm" />
          <textarea {...register('description')} placeholder="Description (optional)" className="w-full border rounded px-3 py-2 text-sm" rows={2} />
          <select {...register('uomType', { required: true })} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">Select unit of measurement *</option>
            {UOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input {...register('target', { required: true, min: 0 })} type="number" step="any" placeholder="Target *" className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <input {...register('weightage', { required: true, min: 10, max: 100 })} type="number" placeholder="Weightage % (min 10) *" className="w-full border rounded px-3 py-2 text-sm" />
              {errors.weightage && <p className="text-xs text-red-500 mt-1">Minimum 10%, max 100%</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Adding...' : 'Add goal'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); reset(); }} className="border px-4 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {canAddGoal && !showForm && (
          <button onClick={() => setShowForm(true)} className="border border-blue-500 text-blue-600 px-4 py-2 rounded text-sm font-medium hover:bg-blue-50">
            + Add goal
          </button>
        )}
        {['DRAFT', 'RETURNED'].includes(sheet.status) && sheet.goals?.length > 0 && (
          <button onClick={onSubmit} className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700">
            Submit for approval
          </button>
        )}
        {isLocked && (
          <div className="text-sm text-green-600 font-medium flex items-center gap-1">
            ✓ Goals locked and approved
          </div>
        )}
      </div>
    </div>
  );
}
