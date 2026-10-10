import React, { useState } from 'react';
import { 
  Lock, 
  Calendar, 
  Building2, 
  Phone, 
  Key, 
  Check, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { 
  Employee, 
  Branch, 
  UserAccount, 
  UserRole,
  CompanyDepartment, 
  DepartmentPositionsMap,
  DEPARTMENT_POSITIONS 
} from '../types';
import { calculateTenure } from '../utils/tenureHelpers';
import { db } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

export interface EmployeeFormData {
  id?: string;
  uid?: string;
  role: 'MD' | 'Manager' | 'Executive' | 'Admin' | 'Finance' | 'Staff';
  name: string;
  code: string;
  department: CompanyDepartment;
  position: string;
  branchId: string;
  branchName: string;
  joinedDate: string; // ISO date format YYYY-MM-DD (Mandatory)
  phone: string;
  status: 'active' | 'leave' | 'resigned';
}

export interface EmployeeFormProps {
  initialEmployee?: Employee | null;
  currentUser: UserAccount;
  branches: Branch[];
  positionsMap?: DepartmentPositionsMap;
  onSubmit?: (data: EmployeeFormData, isNew: boolean) => Promise<void> | void;
  onUpdateEmployee?: (employee: Employee) => Promise<void> | void;
  onAddEmployee?: (employee: Employee) => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  initialEmployee,
  currentUser,
  branches,
  positionsMap = DEPARTMENT_POSITIONS,
  onSubmit,
  onUpdateEmployee,
  onAddEmployee,
  onCancel,
  isSaving = false,
}) => {
  const isEditing = Boolean(initialEmployee && initialEmployee.id);

  // Field-Level Security: Only Admin or MD can see and edit the uid and role fields
  const userRole = (currentUser?.role || '').trim();
  const isAdminOrMD = userRole === 'Admin' || userRole === 'MD' || userRole === 'Managing Director';
  const isFinanceUser = userRole === 'Finance';
  const canEditAuthFields = isAdminOrMD && !isFinanceUser;

  // Form State
  const [uid, setUid] = useState<string>(initialEmployee?.firebaseUid || initialEmployee?.id || '');
  const [role, setRole] = useState<'MD' | 'Manager' | 'Executive' | 'Admin' | 'Finance' | 'Staff'>(
    (initialEmployee as any)?.role || 'Staff'
  );
  const [name, setName] = useState<string>(initialEmployee?.name || '');
  const [code, setCode] = useState<string>(initialEmployee?.code || '');
  const [department, setDepartment] = useState<CompanyDepartment>(
    (initialEmployee?.department as CompanyDepartment) || 'Sales Department'
  );
  const [position, setPosition] = useState<string>(
    initialEmployee?.position || positionsMap[(initialEmployee?.department as CompanyDepartment) || 'Sales Department']?.[0] || 'Junior Sales Executive'
  );
  const [branchId, setBranchId] = useState<string>(
    initialEmployee?.branchId || branches[0]?.id || 'branch-1'
  );
  // Join Date: Mandatory for tenure calculations (Editable for both new and existing staff)
  const [joinedDate, setJoinedDate] = useState<string>(
    initialEmployee?.joinedDate || new Date().toISOString().split('T')[0]
  );
  const [phone, setPhone] = useState<string>(initialEmployee?.phone || '');
  const [status, setStatus] = useState<'active' | 'leave' | 'resigned'>(
    initialEmployee?.status || 'active'
  );

  const [formError, setFormError] = useState<string>('');

  // Dynamic Tenure calculation (strictly computed on the fly, never stored statically)
  const currentTenure = calculateTenure(joinedDate);

  // Synchronize department positions when department changes
  const handleDepartmentChange = (newDept: CompanyDepartment) => {
    setDepartment(newDept);
    const available = positionsMap[newDept] || [];
    if (available.length > 0 && !available.includes(position)) {
      setPosition(available[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Full Name is required.');
      return;
    }

    if (!joinedDate.trim()) {
      setFormError('Join Date is mandatory for tenure and seniority calculation.');
      return;
    }

    const isNew = !isEditing;
    const cleanUid = uid.trim();

    // Zero UI Register validation
    if (isNew && canEditAuthFields && !cleanUid) {
      setFormError('Firebase Auth UID is required. Please paste the UID from Firebase Console.');
      return;
    }

    // Document ID: Use Firebase Auth UID for new employees if provided, or retain existing ID
    const docId = isNew ? (cleanUid || `emp-${Date.now()}`) : initialEmployee!.id;

    const selectedBranchObj = branches.find((b) => b.id === branchId);
    const branchName = selectedBranchObj?.name || initialEmployee?.branchName || 'Main Branch';

    // Strict Field-Level Security: Non-admin users cannot elevate role or UID
    const effectiveRole = canEditAuthFields ? role : (initialEmployee?.role || 'Staff');
    const effectiveUid = canEditAuthFields ? cleanUid : (initialEmployee?.firebaseUid || initialEmployee?.id || '');

    // Full Employee Object (Preserves baseSalary from master without exposing/editing it here)
    const savedEmployee: Employee = {
      ...(initialEmployee || {}),
      id: docId,
      firebaseUid: effectiveUid,
      role: effectiveRole as UserRole,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      department,
      position: position.trim(),
      branchId,
      branchName,
      baseSalary: initialEmployee?.baseSalary || 0, // Salary is strictly managed in Basic Pay / Payroll Master
      joinedDate: joinedDate.trim(),
      phone: phone.trim(),
      status,
      updatedAt: new Date().toISOString(),
      ...(isNew ? { createdAt: new Date().toISOString() } : {}),
    };

    const payload: EmployeeFormData = {
      id: docId,
      uid: effectiveUid,
      role: (effectiveRole as any),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      department,
      position: position.trim(),
      branchId,
      branchName,
      joinedDate: joinedDate.trim(),
      phone: phone.trim(),
      status,
    };

    // 1. Persist directly to Firebase Firestore
    try {
      if (isNew) {
        await setDoc(doc(db, 'employees', docId), savedEmployee);
      } else {
        await updateDoc(doc(db, 'employees', docId), {
          name: savedEmployee.name,
          code: savedEmployee.code,
          department: savedEmployee.department,
          position: savedEmployee.position,
          branchId: savedEmployee.branchId,
          branchName: savedEmployee.branchName,
          joinedDate: savedEmployee.joinedDate,
          phone: savedEmployee.phone,
          status: savedEmployee.status,
          updatedAt: savedEmployee.updatedAt,
          ...(canEditAuthFields ? { role: effectiveRole, firebaseUid: effectiveUid, uid: effectiveUid } : {})
        });
      }
    } catch (firestoreErr: any) {
      console.warn('[EmployeeForm] Firestore save note:', firestoreErr);
    }

    // 2. CRITICAL FIX: Immediately update parent React state to prevent race-condition overwrite
    try {
      if (isNew) {
        if (onAddEmployee) await onAddEmployee(savedEmployee);
      } else {
        if (onUpdateEmployee) await onUpdateEmployee(savedEmployee);
      }
      if (onSubmit) {
        await onSubmit(payload, isNew);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to update local employee state.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4">
      {formError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{formError}</span>
        </div>
      )}

      {/* Auth Mapping & Field-Level Security Section */}
      <div className={`p-3.5 rounded-xl border transition-all ${
        canEditAuthFields 
          ? 'bg-purple-50/70 border-purple-200 shadow-2xs' 
          : 'bg-slate-100 border-slate-200 opacity-90'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            {canEditAuthFields ? (
              <Key className="w-4 h-4 text-purple-600" />
            ) : (
              <Lock className="w-4 h-4 text-slate-500" />
            )}
            <span>Zero-UI Auth Mapping &amp; System Role</span>
          </div>
          {!canEditAuthFields && (
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              <span>Admin / MD Only (Locked for Finance/HR)</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* UID Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Firebase Auth UID (Console UID) *</span>
              {!canEditAuthFields && <span className="text-[9px] text-slate-400 font-normal">Restricted</span>}
            </label>
            <input
              type="text"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              disabled={!canEditAuthFields || (isEditing && Boolean(initialEmployee?.id))}
              placeholder={canEditAuthFields ? 'Paste UID from Firebase Console' : 'Protected UID'}
              className={`w-full px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                !canEditAuthFields
                  ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed select-none'
                  : 'bg-white border border-purple-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none'
              }`}
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {canEditAuthFields 
                ? 'Used directly as Firestore Document ID for new records.' 
                : 'Identity UID is protected to prevent privilege escalation.'}
            </p>
          </div>

          {/* Role Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>System Role (RBAC) *</span>
              {!canEditAuthFields && <span className="text-[9px] text-slate-400 font-normal">Restricted</span>}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              disabled={!canEditAuthFields}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                !canEditAuthFields
                  ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed select-none'
                  : 'bg-white border border-purple-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer'
              }`}
            >
              <option value="Staff">Staff</option>
              <option value="Finance">Finance</option>
              <option value="Executive">Executive</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
              <option value="MD">MD</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              {canEditAuthFields 
                ? 'Strictly controls permission tier across the ERP.' 
                : 'Role is managed by System Administrator.'}
            </p>
          </div>
        </div>
      </div>

      {/* Staff Basic Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Daw Khin Khin"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Employee Code (EC)
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. EC001"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Join Date & Live Dynamic Tenure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span>Join Date (Mandatory) *</span>
            </span>
          </label>
          <input
            type="date"
            required
            value={joinedDate}
            onChange={(e) => setJoinedDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Calculated Tenure (Live)</span>
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">Dynamic</span>
          </label>
          <div className="w-full px-3 py-2 bg-emerald-50/80 border border-emerald-200 rounded-lg text-emerald-950 font-bold text-xs flex items-center justify-between">
            <span>{currentTenure}</span>
            <span className="text-[10px] text-emerald-700 font-normal">Calculated on the fly</span>
          </div>
        </div>
      </div>

      {/* Branch Assignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Assigned Branch *</span>
          </label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code ? `[${b.code}] ` : ''}{b.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500 mt-1">
            Reassigning branch instantly updates Employee Directory and Payroll branch filters.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            <span>Phone Contact</span>
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09-xxxxxxxxx"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Department & Position */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Department *
          </label>
          <select
            value={department}
            onChange={(e) => handleDepartmentChange(e.target.value as CompanyDepartment)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
          >
            <option value="Sales Department">Sales Department</option>
            <option value="Finance Department">Finance Department</option>
            <option value="Service Department">Service Department</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Position Title *
          </label>
          <input
            type="text"
            required
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="e.g. Senior Accountant, Sales Executive..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          Employment Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
        >
          <option value="active">Active</option>
          <option value="leave">On Leave</option>
          <option value="resigned">Resigned</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <span>Saving...</span>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Save Employee' : 'Register Employee'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;
