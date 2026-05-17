// frontend/src/components/manager/ApprovalDashboard.tsx
'use client';
import { useState, useEffect } from 'react';
import { goalsApi } from '@/lib/api';

interface Props { cycleId: string; }

export default function ApprovalDashboard({ cycleId }: Props) {
  const [sheets, setSheets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [returnReason, setReturnReason] = useState('');
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ target?: number; weightage?: number }>({});

  useEffect(() => {
    goalsApi.getTeamSheets(cycleId).then(setSheets);
  }, [cycleId]);

  const refresh = async () => {
    const updated = await goalsApi.getTeamSheets(cycleId);
    setSheets(updated);
    if (selected) setSelected(updated.find((s: any) => s.id === selected.id));
  };

  const handleApprove = async (sheetId: string) => {
    if (!confirm('Approve this goal sheet? Goals will be locked.')) return;
    await goalsApi.approveSheet(sheetId);
    await refresh();
  };

  const handleReturn = async (sheetId: string) => {
    if (!returnReason.trim()) { alert('Please enter a return reason'); return; }
    await goalsApi.returnSheet(sheetId, returnReason);
    setReturnReason('');
    await refresh();
  };

  const handleInlineEdit = async (goalId: string) => {
    await goalsApi.managerEditGoal(goalId, editValues);
    setEditingGoal(null);
    setEditValues({});
    await refresh();
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-600',
      SUBMITTED: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-green-100 text-green-700',
      RETURNED: 'bg-red-100 text-red-700',
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Team Goal Approvals</h1>
      <div className="grid grid-cols-3 gap-6">

        {/* Left: employee list */}
        <div className="col-span-1 space-y-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Team members</h2>
          {sheets.map(sheet => (
            <button
              key={sheet.id}
              onClick={() => setSelected(sheet)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === sheet.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm text-gray-900">{sheet.employee.name}</p>
                  <p className="text-xs text-gray-500">{sheet.employee.department}</p>
                </div>
                {statusBadge(sheet.status)}
              </div>
              <p className="text-xs text-gray-400 mt-1">{sheet.goals.length} goals · {sheet.totalWeightage}% total</p>
            </button>
          ))}
        </div>

        {/* Right: goal detail */}
        <div className="col-span-2">
          {!selected ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center text-gray-400">Select a team member to review their goals</div>
          ) : (
            <div className="bg-white border rounded-lg">
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{selected.employee.name}</h3>
                  <p className="text-sm text-gray-500">{selected.goals.length} goals · {selected.totalWeightage}% total weightage</p>
                </div>
                {statusBadge(selected.status)}
              </div>

              {/* Goals table */}
              <div className="p-4 space-y-3">
                {selected.goals.map((goal: any) => (
                  <div key={goal.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{goal.thrustArea}</span>
                        <p className="font-medium text-sm mt-1">{goal.title}</p>
                        {goal.description && <p className="text-xs text-gray-500">{goal.description}</p>}
                      </div>
                      {selected.status === 'SUBMITTED' && (
                        <button
                          onClick={() => { setEditingGoal(goal.id); setEditValues({ target: goal.target, weightage: goal.weightage }); }}
                          className="text-xs text-blue-600 hover:underline ml-2"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {editingGoal === goal.id ? (
                      <div className="mt-2 flex gap-2 items-center">
                        <div>
                          <label className="text-xs text-gray-500">Target</label>
                          <input type="number" value={editValues.target} onChange={e => setEditValues(v => ({ ...v, target: parseFloat(e.target.value) }))}
                            className="block border rounded px-2 py-1 text-sm w-24" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Weightage %</label>
                          <input type="number" min={10} max={100} value={editValues.weightage} onChange={e => setEditValues(v => ({ ...v, weightage: parseFloat(e.target.value) }))}
                            className="block border rounded px-2 py-1 text-sm w-24" />
                        </div>
                        <button onClick={() => handleInlineEdit(goal.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs mt-4">Save</button>
                        <button onClick={() => setEditingGoal(null)} className="border px-3 py-1 rounded text-xs mt-4">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>Target: <b>{goal.target}</b></span>
                        <span>UoM: <b>{goal.uomType}</b></span>
                        <span>Weightage: <b>{goal.weightage}%</b></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Approval actions */}
              {selected.status === 'SUBMITTED' && (
                <div className="p-4 border-t space-y-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(selected.id)} className="bg-green-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-green-700">
                      Approve & Lock
                    </button>
                    <div className="flex-1 flex gap-2">
                      <input
                        value={returnReason}
                        onChange={e => setReturnReason(e.target.value)}
                        placeholder="Return reason..."
                        className="flex-1 border rounded px-3 py-2 text-sm"
                      />
                      <button onClick={() => handleReturn(selected.id)} className="border border-red-400 text-red-600 px-4 py-2 rounded text-sm hover:bg-red-50">
                        Return for rework
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
