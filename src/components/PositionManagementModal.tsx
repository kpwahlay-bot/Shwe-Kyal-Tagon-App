import React, { useState, useMemo } from 'react';
import { 
  CompanyDepartment, 
  DepartmentPositionsMap, 
  DEPARTMENT_POSITIONS, 
  Employee 
} from '../types';
import { 
  X, 
  Briefcase, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  RotateCcw, 
  Search, 
  Users, 
  AlertTriangle,
  BriefcaseBusiness,
  Wrench,
  CircleDollarSign
} from 'lucide-react';

interface PositionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  positionsMap: DepartmentPositionsMap;
  employees: Employee[];
  onAddPosition: (department: CompanyDepartment, positionTitle: string) => void;
  onRenamePosition: (department: CompanyDepartment, oldTitle: string, newTitle: string, updateEmployees: boolean) => void;
  onDeletePosition: (department: CompanyDepartment, positionTitle: string) => void;
  onResetPositions: () => void;
  initialDepartment?: CompanyDepartment;
}

export const PositionManagementModal: React.FC<PositionManagementModalProps> = ({
  isOpen,
  onClose,
  positionsMap,
  employees,
  onAddPosition,
  onRenamePosition,
  onDeletePosition,
  onResetPositions,
  initialDepartment = 'Sales Department',
}) => {
  const [selectedDept, setSelectedDept] = useState<CompanyDepartment>(initialDepartment);
  const [newPositionTitle, setNewPositionTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPosTitle, setEditingPosTitle] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [updateStaffOnRename, setUpdateStaffOnRename] = useState(true);
  const [confirmDeletePos, setConfirmDeletePos] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentDeptPositions = positionsMap[selectedDept] || [];

  // Map employee counts by position
  const employeeCountByPosition = useMemo(() => {
    const counts: Record<string, { count: number; names: string[] }> = {};
    employees.forEach((emp) => {
      const pos = emp.position?.trim();
      if (pos) {
        if (!counts[pos]) {
          counts[pos] = { count: 0, names: [] };
        }
        counts[pos].count += 1;
        counts[pos].names.push(emp.name);
      }
    });
    return counts;
  }, [employees]);

  // Filtered positions based on search
  const filteredPositions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return currentDeptPositions;
    return currentDeptPositions.filter((pos) =>
      pos.toLowerCase().includes(term)
    );
  }, [currentDeptPositions, searchTerm]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  const handleCreatePosition = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newPositionTitle.trim();
    if (!trimmed) {
      showFeedback('Please enter a position title', 'error');
      return;
    }

    const exists = currentDeptPositions.some(
      (p) => p.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      showFeedback(`"${trimmed}" already exists in ${selectedDept}`, 'error');
      return;
    }

    onAddPosition(selectedDept, trimmed);
    setNewPositionTitle('');
    showFeedback(`Position "${trimmed}" added to ${selectedDept} successfully`);
  };

  const startEditing = (pos: string) => {
    setEditingPosTitle(pos);
    setEditedTitle(pos);
    setUpdateStaffOnRename(true);
    setConfirmDeletePos(null);
  };

  const cancelEditing = () => {
    setEditingPosTitle(null);
    setEditedTitle('');
  };

  const saveEditedPosition = (oldTitle: string) => {
    const trimmed = editedTitle.trim();
    if (!trimmed) {
      showFeedback('Please enter a position title', 'error');
      return;
    }

    if (trimmed.toLowerCase() !== oldTitle.toLowerCase()) {
      const exists = currentDeptPositions.some(
        (p) => p.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        showFeedback(`"${trimmed}" already exists`, 'error');
        return;
      }
    }

    onRenamePosition(selectedDept, oldTitle, trimmed, updateStaffOnRename);
    setEditingPosTitle(null);
    setEditedTitle('');
    showFeedback(`Position "${oldTitle}" updated to "${trimmed}" successfully`);
  };

  const handleDelete = (pos: string) => {
    onDeletePosition(selectedDept, pos);
    setConfirmDeletePos(null);
    showFeedback(`Position "${pos}" removed from list`);
  };

  const getDeptIcon = (dept: CompanyDepartment) => {
    switch (dept) {
      case 'Sales Department':
        return <BriefcaseBusiness className="w-4 h-4 text-amber-600" />;
      case 'Service Department':
        return <Wrench className="w-4 h-4 text-blue-600" />;
      case 'Finance Department':
        return <CircleDollarSign className="w-4 h-4 text-emerald-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 my-auto max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>Manage Positions</span>
              </h3>
              <p className="text-xs text-slate-500">
                Add, Edit (Rename) or Remove company positions by department
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-b animate-in slide-in-from-top-2 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-slate-700 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Department Tabs */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-3 gap-2">
            {(['Sales Department', 'Service Department', 'Finance Department'] as CompanyDepartment[]).map(
              (dept) => {
                const isSelected = selectedDept === dept;
                const posCount = (positionsMap[dept] || []).length;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => {
                      setSelectedDept(dept);
                      setEditingPosTitle(null);
                      setConfirmDeletePos(null);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-purple-500 ring-2 ring-purple-400/30 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getDeptIcon(dept)}
                      <div className="truncate">
                        <div className={`text-xs font-bold truncate ${isSelected ? 'text-purple-950' : 'text-slate-800'}`}>
                          {dept.replace(' Department', '')}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {dept === 'Sales Department' ? 'Retail / Branches' : dept === 'Service Department' ? 'Tech & Services' : 'Finance & Treasury'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ml-1 shrink-0 ${
                        isSelected
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {posCount}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Add New Position Form */}
        <div className="p-4 bg-purple-50/50 border-b border-purple-100 shrink-0">
          <form onSubmit={handleCreatePosition} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newPositionTitle}
                onChange={(e) => setNewPositionTitle(e.target.value)}
                placeholder={`+ Add new position in ${selectedDept}... (e.g. Senior Sales Lead)`}
                className="w-full px-3.5 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Position</span>
            </button>
          </form>
        </div>

        {/* Filter / Search bar & List of Positions */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search positions..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {filteredPositions.length} of {currentDeptPositions.length} Positions
          </div>
        </div>

        {/* Position Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0 bg-slate-50/40">
          {filteredPositions.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-200 p-6">
              <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No positions found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {searchTerm ? 'No matching positions found' : 'Add your first position using the form above'}
              </p>
            </div>
          ) : (
            filteredPositions.map((pos) => {
              const staffData = employeeCountByPosition[pos];
              const staffCount = staffData?.count || 0;
              const isEditing = editingPosTitle === pos;
              const isConfirmingDelete = confirmDeletePos === pos;

              return (
                <div
                  key={pos}
                  className={`bg-white rounded-xl border transition-all p-3 shadow-2xs ${
                    isEditing
                      ? 'border-purple-400 ring-2 ring-purple-400/20 bg-purple-50/20'
                      : isConfirmingDelete
                      ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20'
                      : 'border-slate-200 hover:border-purple-200 hover:shadow-xs'
                  }`}
                >
                  {isEditing ? (
                    /* Inline Editing Mode */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                          <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                          <span>Edit Position Title</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Press Save when done</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditedPosition(pos);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => saveEditedPosition(pos)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>

                      {staffCount > 0 && (
                        <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                          <input
                            type="checkbox"
                            checked={updateStaffOnRename}
                            onChange={(e) => setUpdateStaffOnRename(e.target.checked)}
                            className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <span>
                            Automatically update existing staff (<strong>{staffCount}</strong>) holding this position to the new title
                          </span>
                        </label>
                      )}
                    </div>
                  ) : isConfirmingDelete ? (
                    /* Delete Confirmation Mode */
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Are you sure you want to delete position "{pos}"?</span>
                      </div>

                      {staffCount > 0 && (
                        <p className="text-[11px] text-rose-700 bg-rose-100/70 p-2 rounded-lg border border-rose-200">
                          ⚠️ Warning: Currently (<strong>{staffCount}</strong>) active employee(s) ({staffData?.names.slice(0, 3).join(', ')}{staffCount > 3 ? '...' : ''}) hold this position. After deleting, you will need to re-assign their positions.
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(pos)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Confirm</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeletePos(null)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Regular Card View */
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {pos}
                        </span>
                        {staffCount > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold shrink-0"
                            title={`Staff: ${staffData?.names.join(', ')}`}
                          >
                            <Users className="w-3 h-3 text-purple-500" />
                            <span>{staffCount} Staff</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            (0 Staff)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditing(pos)}
                          className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit / Rename Position"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeletePos(pos);
                            setEditingPosTitle(null);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Position"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to reset to default company positions?')) {
                onResetPositions();
                showFeedback('Reset positions to default standards successfully');
              }
            }}
            className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer"
            title="Reset to factory standard positions"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Standard Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
