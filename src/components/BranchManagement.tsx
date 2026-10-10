import React, { useState } from 'react';
import { Branch, Employee, DailySale, DailyExpense, UserAccount, canUserDelete } from '../types';
import { formatNumber } from '../utils/formatters';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Plus, 
  X, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Search,
  Users,
  ShieldCheck,
  Briefcase
} from 'lucide-react';

interface BranchManagementProps {
  branches: Branch[];
  employees: Employee[];
  sales?: DailySale[];
  expenses?: DailyExpense[];
  currentUser: UserAccount;
  onSelectBranch: (branchId: string) => void;
  onAddBranch: (branch: Branch) => void;
  onUpdateBranch?: (branch: Branch) => void;
  onDeleteBranch?: (branchId: string) => void;
  onDeleteAllBranches?: () => void;
}

export const BranchManagement: React.FC<BranchManagementProps> = ({
  branches,
  employees,
  currentUser,
  onSelectBranch,
  onAddBranch,
  onUpdateBranch,
  onDeleteBranch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [viewingBranchStaff, setViewingBranchStaff] = useState<Branch | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setEditingBranch(null);
        setViewingBranchStaff(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    city: 'Yangon',
    address: '',
    phone: '',
  });

  const canDelete = canUserDelete(currentUser);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleOpenAdd = () => {
    const defaultCode = `CS-0${branches.length + 1}`;
    setFormData({
      code: defaultCode,
      name: '',
      city: 'Yangon',
      address: '',
      phone: '',
    });
    setEditingBranch(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      code: branch.code || branch.id,
      name: branch.name,
      city: branch.city,
      address: branch.address,
      phone: branch.phone,
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim() || !formData.address.trim()) {
      alert('Please fill required fields: Branch Code, Branch Name, and Address.');
      return;
    }

    const trimmedCode = formData.code.trim();
    const finalCode =
      trimmedCode.toLowerCase() === 'system ii' ||
      trimmedCode.toLowerCase() === 'system 2' ||
      trimmedCode.toLowerCase() === 'sys-02' ||
      editingBranch?.id === 'branch-sys2' ||
      formData.name.trim().toLowerCase() === 'system ii'
        ? 'System II'
        : trimmedCode;

    if (editingBranch) {
      if (onUpdateBranch) {
        onUpdateBranch({
          ...editingBranch,
          code: finalCode,
          name: formData.name.trim(),
          city: formData.city.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
        });
        showToast(`Branch "${formData.name.trim()}" updated successfully.`);
      }
      setEditingBranch(null);
    } else {
      const branchIdKey =
        finalCode === 'System II'
          ? 'branch-sys2'
          : `branch-${formData.code.trim().toLowerCase().replace(/[^a-z0-9]/g, '-') || Date.now()}`;
      const newBranch: Branch = {
        id: branchIdKey,
        code: finalCode,
        name: formData.name.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
      };

      onAddBranch(newBranch);
      showToast(`New branch "${newBranch.name}" (Code: ${newBranch.code}) created successfully.`);
    }

    setIsAddModalOpen(false);
  };

  // Filtered branches
  const filteredBranches = branches.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (b.name || '').toLowerCase().includes(q) ||
      (b.code || '').toLowerCase().includes(q) ||
      (b.city || '').toLowerCase().includes(q) ||
      (b.address || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-3.5 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Administration Module
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <span>Branch Management</span>
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                {branches.length} Branches
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage shop branch network, locations, store addresses, and contact phone numbers.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Branch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search branch code, name, address, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500 font-medium"
          />
        </div>
        
        <div className="text-xs font-bold text-slate-500">
          Total {filteredBranches.length} branches
        </div>
      </div>

      {/* CLEAN HIGH-PERFORMANCE TABLE VIEW */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Branch Code *</th>
                <th className="py-3 px-4">Branch Name *</th>
                <th className="py-3 px-4">Address / Location *</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-center">Staff Count</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No branches found matching your search.
                  </td>
                </tr>
              ) : (
                filteredBranches.map((b, idx) => {
                  const staffCount = employees.filter((e) => e.branchId === b.id).length;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200 text-xs inline-block">
                          {b.id === 'branch-sys2' || b.name === 'System II' ? 'System II' : (b.code || b.id)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{b.name}</div>
                        <span className="text-[11px] text-slate-400">{b.city || 'Yangon'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={b.address}>
                        {b.address || 'Address not registered'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {b.phone || '09-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setViewingBranchStaff(b)}
                          className="inline-flex items-center gap-1.5 font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1 rounded-full text-[11px] transition-colors cursor-pointer"
                          title="Click to view branch staff roster & Employee IDs"
                        >
                          <Users className="w-3 h-3 text-purple-600" />
                          <span>{staffCount} Staff</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingBranchStaff(b)}
                            className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-purple-200"
                            title="View Branch Staff Roster"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(b)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                            title="Update Branch Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && onDeleteBranch && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete branch "${b.name}" (${b.code})?`)) {
                                  onDeleteBranch(b.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                              title="Delete Branch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BRANCH PERSONNEL ROSTER MODAL */}
      {viewingBranchStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span>{viewingBranchStaff.name}</span>
                    <span className="font-mono text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                      {viewingBranchStaff.code}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Official Branch Personnel Roster &amp; Employee IDs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingBranchStaff(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {(() => {
                const branchEmps = employees.filter((e) => e.branchId === viewingBranchStaff.id);
                if (branchEmps.length === 0) {
                  return (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No staff assigned to this branch yet.
                    </div>
                  );
                }

                return (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-2.5 px-3">E-CODE</th>
                          <th className="py-2.5 px-3">EMPLOYEE NAME</th>
                          <th className="py-2.5 px-3">POSITION</th>
                          <th className="py-2.5 px-3">DEPARTMENT</th>
                          <th className="py-2.5 px-3">PHONE</th>
                          <th className="py-2.5 px-3 text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {branchEmps.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-purple-700">
                              {emp.code}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {emp.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold text-[11px]">
                                {emp.position}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium text-[11px]">
                              {emp.department}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                              {emp.phone || '09-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {emp.status || 'active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Total: {employees.filter((e) => e.branchId === viewingBranchStaff.id).length} Personnel
              </span>
              <button
                type="button"
                onClick={() => setViewingBranchStaff(null)}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE & UPDATE BRANCH MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  {editingBranch ? `Edit Branch • ${editingBranch.name}` : 'Create New Branch'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Configure branch details, store address, and contact phone
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Branch Code *</span>
                  <span className="text-[10px] text-purple-700 font-semibold">e.g. CS-01, CS-02, System II</span>
                </label>
                <div>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500"
                    placeholder="e.g. CS-01, CS-02, System II"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500"
                  placeholder="e.g. Shwe Kyal Tagon (Shop 1)"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Store Physical Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500"
                  placeholder="Store Address / Township"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    City / Township
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500"
                    placeholder="Yangon"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500"
                    placeholder="09 263027177"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  {editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
