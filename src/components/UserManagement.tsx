import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Building2, 
  KeyRound, 
  Lock, 
  Mail, 
  Crown, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  X, 
  ShieldAlert,
  Search,
  Eye,
  EyeOff,
  RotateCcw,
  Link,
  UserCheck,
  Check,
  Copy,
  Sparkles
} from 'lucide-react';
import { UserAccount, Branch, UserRole, Employee, canUserDelete, isYaminnwe, isMDUser, normalizeUserRole, EXACT_SYSTEM_ROLES } from '../types';
import { isDummyOrInvalidStaff } from '../data/initialData';

interface UserManagementProps {
  users: UserAccount[];
  branches: Branch[];
  employees?: Employee[];
  currentUser: UserAccount;
  onAddUser: (user: UserAccount) => void;
  onUpdateUser: (user: UserAccount) => void;
  onDeleteUser: (id: string) => void;
  onSwitchUser: (user: UserAccount) => void;
  onResetAllUsers?: () => void;
  onUpdateEmployee?: (emp: Employee) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  branches,
  employees = [],
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSwitchUser,
  onResetAllUsers,
  onUpdateEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Global Escape key listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setEditingUser(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('Staff');
  const [title, setTitle] = useState('');
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || 'branch-1');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [firebaseUid, setFirebaseUid] = useState<string>('');
  const [error, setError] = useState('');
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  const isMD = isMDUser(currentUser);
  const canManageUsers = isMD;

  const handleCopyUid = (uid: string) => {
    if (!uid) return;
    navigator.clipboard?.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2500);
  };

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    if (!empId) return;
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setDisplayName(emp.name);
      setTitle(emp.position || 'Staff');
      if (emp.branchId) setBranchId(emp.branchId);
      const cleanSlug = (emp.code || emp.name).toLowerCase().replace(/[^a-z0-9]/g, '');
      setUsername(`${cleanSlug}@sktg.com`);
      const pLower = (emp.position || '').toLowerCase();
      const nameLower = (emp.name || '').toLowerCase();
      
      if (pLower.includes('finance & policy') || nameLower.includes('yamin') || emp.code === 'EC010') {
        setRole('Operation');
        setBranchId('ALL');
      } else if (pLower.includes('cashier')) {
        setRole('Cashier');
      } else if (pLower.includes('finance') || pLower.includes('accountant')) {
        setRole('Finance');
      } else if (pLower.includes('manager') || pLower.includes('supervisor') || pLower.includes('leader')) {
        setRole('Sales Manager');
      } else {
        setRole('Staff');
      }
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setSelectedEmpId('');
    setFirebaseUid('');
    setDisplayName('');
    setUsername('');
    setRole('Staff');
    setTitle('Sales & POS Staff');
    setBranchId(branches[0]?.id || 'branch-1');
    setPin('1234');
    setPassword('');
    setStatus('active');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setSelectedEmpId(user.employeeId || '');
    setFirebaseUid(user.firebaseUid || '');
    setDisplayName(user.displayName);
    setUsername(user.username);
    setRole(normalizeUserRole(user.role));
    setTitle(user.title || '');
    setBranchId(user.branchId);
    setPin(user.pin || '1234');
    setPassword(user.password || '');
    setStatus(user.status);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim() || !username.trim()) {
      setError('Name and Username/Email are required.');
      return;
    }

    const cleanUser = username.trim().toLowerCase();
    if (cleanUser !== 'sumyatwin.sktg@gmail.com' && !cleanUser.endsWith('@sktg.com')) {
      setError('Username format must end with @sktg.com (e.g. name@sktg.com). Only sumyatwin.sktg@gmail.com is allowed as gmail.');
      return;
    }

    // Check duplicate username if adding new or changed
    const duplicate = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && (!editingUser || u.id !== editingUser.id)
    );
    if (duplicate) {
      setError('This username/email is already taken by another account.');
      return;
    }

    const selectedBranch = branches.find((b) => b.id === branchId);
    const isGlobal = role === 'MD' || role === 'Operation';
    const branchName = isGlobal ? 'All Branches (Enterprise)' : (selectedBranch?.name || 'Branch');

    const linkedEmp = employees.find(
      (e) =>
        (selectedEmpId && e.id === selectedEmpId) ||
        (editingUser && (
          (editingUser.employeeId && e.id === editingUser.employeeId) ||
          (editingUser.employeeCode && e.code === editingUser.employeeCode) ||
          (editingUser.username && e.username && e.username.toLowerCase() === editingUser.username.toLowerCase()) ||
          (editingUser.displayName && e.name.trim().toLowerCase() === editingUser.displayName.trim().toLowerCase())
        )) ||
        (e.name.trim().toLowerCase() === displayName.trim().toLowerCase())
    );

    const avatarBg =
      role === 'MD'
        ? 'bg-amber-600'
        : role === 'Operation'
        ? 'bg-cyan-600'
        : role === 'Sales Manager'
        ? 'bg-indigo-600'
        : role === 'Admin'
        ? 'bg-purple-600'
        : role === 'Finance'
        ? 'bg-blue-600'
        : role === 'Cashier'
        ? 'bg-orange-600'
        : 'bg-emerald-600';

    if (editingUser) {
      const updated: UserAccount = {
        ...editingUser,
        displayName: displayName.trim(),
        username: username.trim(),
        role: normalizeUserRole(role),
        title: title.trim(),
        branchId: isGlobal ? 'ALL' : branchId,
        branchName,
        pin: pin.trim() || '1234',
        password: password.trim() || editingUser.password || '',
        avatarBg,
        status,
        employeeId: linkedEmp?.id || editingUser.employeeId,
        employeeCode: linkedEmp?.code || editingUser.employeeCode,
        firebaseUid: firebaseUid.trim() || editingUser.firebaseUid || undefined,
      };

      try {
        const { saveUserToFirestore } = await import('../utils/authProfile');
        await saveUserToFirestore(updated);
      } catch (err) {
        console.warn('Firestore user update notice:', err);
      }

      onUpdateUser(updated);

      // Synchronize employee record if linked
      if (linkedEmp && onUpdateEmployee) {
        const cleanEmpName = displayName.replace(/\s*\([^)]*\)\s*$/, '').trim() || displayName.trim();
        onUpdateEmployee({
          ...linkedEmp,
          name: cleanEmpName,
          username: username.trim(),
          userAccountId: editingUser.id,
        });
      }
    } else {
      const newUser: UserAccount = {
        id: `usr-${Date.now()}`,
        displayName: displayName.trim(),
        username: username.trim(),
        role: normalizeUserRole(role),
        title: title.trim() || (linkedEmp?.position || (role === 'Staff' ? 'Sales Executive' : role)),
        branchId: isGlobal ? 'ALL' : branchId,
        branchName,
        pin: pin.trim() || '1234',
        password: password.trim() || '',
        avatarBg,
        status,
        employeeId: linkedEmp?.id,
        employeeCode: linkedEmp?.code,
        firebaseUid: firebaseUid.trim() || undefined,
      };

      try {
        const { saveUserToFirestore } = await import('../utils/authProfile');
        await saveUserToFirestore(newUser);
      } catch (err) {
        console.warn('Firestore user save notice:', err);
      }

      onAddUser(newUser);
    }

    setIsModalOpen(false);
  };

  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const handleDelete = async (id: string, userDisplayName: string) => {
    if (!canUserDelete(currentUser)) {
      setWarningMessage('Only the Managing Director (MD) has permission to delete user accounts.');
      setTimeout(() => setWarningMessage(null), 5000);
      return;
    }
    if (users.length <= 1) {
      setWarningMessage('At least 1 account is required. Cannot delete the only remaining account.');
      setTimeout(() => setWarningMessage(null), 4000);
      return;
    }
    const target = users.find((u) => u.id === id);
    if (target?.username === 'sumyatwin.sktg@gmail.com' || target?.role === 'MD') {
      setWarningMessage('Managing Director (Daw Su Myat Win) account cannot be deleted.');
      setTimeout(() => setWarningMessage(null), 4000);
      return;
    }

    try {
      const { deleteUserFromFirestore } = await import('../utils/authProfile');
      await deleteUserFromFirestore(id);
    } catch (err) {
      console.warn('Firestore user deletion notice:', err);
    }

    onDeleteUser(id);
  };

  const filteredUsers = useMemo(() => {
    const list = users.filter((u) => {
      if (isDummyOrInvalidStaff(u.displayName) || isDummyOrInvalidStaff(u.username)) return false;
      const normalizedRole = normalizeUserRole(u.role);
      const matchesSearch =
        u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.title && u.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        u.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.firebaseUid && u.firebaseUid.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.employeeCode && u.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = selectedRoleFilter === 'ALL' || normalizedRole === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });

    return list.sort((a, b) => {
      const roleA = normalizeUserRole(a.role);
      const roleB = normalizeUserRole(b.role);
      if (roleA === 'MD' || a.username === 'sumyatwin.sktg@gmail.com') return -1;
      if (roleB === 'MD' || b.username === 'sumyatwin.sktg@gmail.com') return 1;

      // Find employee code
      const codeA = a.employeeCode || '';
      const codeB = b.employeeCode || '';
      const matchA = codeA.match(/(\d+)/);
      const matchB = codeB.match(/(\d+)/);
      const numA = matchA ? parseInt(matchA[1], 10) : 99999;
      const numB = matchB ? parseInt(matchB[1], 10) : 99999;

      if (numA !== numB) return numA - numB;
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
  }, [users, searchTerm, selectedRoleFilter]);

  if (!isMD) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Access Restricted (MD Only)
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            User Accounts &amp; Access Security is strictly restricted to Managing Director (Daw Su Myat Win). Operation, Sales Manager, Admin, Finance, Cashier, and Staff cannot access User Security.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
            <span className="font-semibold">Current User: {currentUser.displayName} ({currentUser.role})</span>
            <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Restricted</span>
          </div>
        </div>
      </div>
    );
  }

  const getRoleBadgeStyle = (r: UserRole) => {
    switch (r) {
      case 'MD':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-black';
      case 'Operation':
        return 'bg-cyan-100 text-cyan-950 border-cyan-300 font-extrabold';
      case 'Sales Manager':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold';
      case 'Admin':
        return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
      case 'Finance':
        return 'bg-blue-100 text-blue-900 border-blue-300 font-bold';
      case 'Cashier':
        return 'bg-orange-100 text-orange-900 border-orange-300 font-bold';
      case 'Staff':
      default:
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Staff &amp; User Management (MD Security Hub)</span>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
              {users.length} Firestore Accounts
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Shwe Kyal Tagon Co., Ltd. • Strictly link Firestore Auth UIDs, provision staff accounts, and configure RBAC roles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Create &amp; Link User Account</span>
          </button>
        </div>
      </div>

      {warningMessage && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center justify-between">
          <span>⚠️ {warningMessage}</span>
          <button
            onClick={() => setWarningMessage(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Security Info Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-amber-400">7 Authorized Roles Policy</div>
            <div className="text-slate-300 text-[11px] mt-0.5">
              Only: <span className="text-amber-300 font-semibold">MD</span>, <span className="text-cyan-300 font-semibold">Operation</span>, <span className="text-indigo-300 font-semibold">Sales Manager</span>, <span className="text-purple-300 font-semibold">Admin</span>, <span className="text-blue-300 font-semibold">Finance</span>, <span className="text-orange-300 font-semibold">Cashier</span>, <span className="text-emerald-300 font-semibold">Staff</span>. Accounts not in Firestore cannot log in.
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user name, email, role, branch, UID, employee code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Roles ({users.length})</option>
            {EXACT_SYSTEM_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Authorized Personnel in Firestore ({filteredUsers.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff / User</th>
                <th className="py-3 px-4">Username / Email</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Firestore UID</th>
                <th className="py-3 px-4">Branch Access</th>
                <th className="py-3 px-4">PIN</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const normalizedRole = normalizeUserRole(u.role);
                const isTargetMD = normalizedRole === 'MD' || u.username === 'sumyatwin.sktg@gmail.com';
                const isCurrent = currentUser?.id === u.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${u.avatarBg || 'bg-purple-600'} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                          {isTargetMD ? '👑' : u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{u.displayName}</span>
                            {isTargetMD && (
                              <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <span>{u.title || normalizedRole}</span>
                            {u.employeeCode && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 font-mono font-bold text-[9px]">
                                {u.employeeCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                      {u.username}
                    </td>

                    <td className="py-3 px-4">
                      {isTargetMD ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 bg-amber-100 text-amber-900 border-amber-300">
                          <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                          MD
                        </span>
                      ) : (
                        <select
                          value={normalizedRole}
                          onChange={async (e) => {
                            const newRole = e.target.value as UserRole;
                            const isGlobal = newRole === 'MD' || newRole === 'Operation';
                            const updatedUser: UserAccount = {
                              ...u,
                              role: newRole,
                              branchId: isGlobal ? 'ALL' : (u.branchId === 'ALL' ? (branches[0]?.id || 'branch-1') : u.branchId),
                              branchName: isGlobal ? 'All Branches (Enterprise)' : (branches.find(b => b.id === u.branchId)?.name || u.branchName),
                            };
                            try {
                              const { saveUserToFirestore } = await import('../utils/authProfile');
                              await saveUserToFirestore(updatedUser);
                            } catch {}
                            onUpdateUser(updatedUser);
                          }}
                          className={`text-[11px] font-bold py-1 px-2 rounded-lg border cursor-pointer focus:outline-hidden transition-colors ${getRoleBadgeStyle(normalizedRole)}`}
                        >
                          {EXACT_SYSTEM_ROLES.filter(r => r !== 'MD').map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* Firestore UID Status */}
                    <td className="py-3 px-4">
                      {u.firebaseUid ? (
                        <div className="flex items-center gap-1">
                          <span 
                            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-pointer"
                            title={`Firebase UID: ${u.firebaseUid} (Click to copy)`}
                            onClick={() => handleCopyUid(u.firebaseUid!)}
                          >
                            ● {u.firebaseUid.slice(0, 8)}...
                          </span>
                          <button
                            onClick={() => handleCopyUid(u.firebaseUid!)}
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="Copy UID"
                          >
                            {copiedUid === u.firebaseUid ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 cursor-pointer"
                          title="Click to link Firebase UID"
                        >
                          + Link UID
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {isTargetMD || normalizedRole === 'Operation' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold text-[10px] border border-purple-200">
                          <Building2 className="w-3 h-3 text-purple-600" />
                          <span>All Branches</span>
                        </span>
                      ) : (
                        <select
                          value={u.branchId}
                          onChange={async (e) => {
                            const newBranchId = e.target.value;
                            const bObj = branches.find(b => b.id === newBranchId);
                            const updatedUser: UserAccount = {
                              ...u,
                              branchId: newBranchId,
                              branchName: bObj?.name || u.branchName,
                            };
                            try {
                              const { saveUserToFirestore } = await import('../utils/authProfile');
                              await saveUserToFirestore(updatedUser);
                            } catch {}
                            onUpdateUser(updatedUser);
                          }}
                          className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-800 cursor-pointer max-w-[150px]"
                        >
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name.split('(')[1]?.replace(')', '') || b.name}</option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {isTargetMD ? '••••' : (u.pin || '1234')}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSwitchUser(u)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="Switch to this account"
                        >
                          {isCurrent ? 'Active' : 'Switch'}
                        </button>

                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Edit User Credentials & UID Link"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {u.username !== 'sumyatwin.sktg@gmail.com' && normalizedRole !== 'MD' && canUserDelete(currentUser) && (
                          <button
                            onClick={() => handleDelete(u.id, u.displayName)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete User from Firestore"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No user accounts match your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
              setEditingUser(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingUser ? 'Edit User Credentials & Link Firestore UID' : 'Create & Link User Account'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Shwe Kyal Tagon Co., Ltd. • Account will be directly provisioned in Firestore.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUser(null);
                }}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium shrink-0">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-xs overflow-y-auto flex-1 pr-1">
              {/* Optional Staff Link Selector */}
              {employees.length > 0 && (
                <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1.5">
                  <label className="block text-purple-950 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5 text-purple-600" />
                      <span>Link with Employee from Directory</span>
                    </span>
                    <span className="text-[10px] text-purple-700 font-normal">Auto-fills name, code &amp; position</span>
                  </label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => handleSelectEmployee(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-slate-800 font-semibold cursor-pointer text-xs"
                  >
                    <option value="">-- Select Employee to link (or configure manually) --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.code} - {emp.name} ({emp.position || 'Staff'} • {emp.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Employee / Staff Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                    placeholder="e.g. Ma Thida Win"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Username / Login ID (@sktg.com) *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                    placeholder="e.g. thida@sktg.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    System Access Role (Exact 7 Roles) *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const newRoleVal = e.target.value as UserRole;
                      setRole(newRoleVal);
                      if (newRoleVal === 'MD' || newRoleVal === 'Operation') {
                        setBranchId('ALL');
                      } else if (branchId === 'ALL') {
                        setBranchId(branches[0]?.id || 'branch-1');
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="Staff">Staff (POS Own Branch, Sell Own Branch Only, No Edit/Delete/Discount)</option>
                    <option value="Cashier">Cashier (POS Own Branch, Sell Own Branch Only, No Edit/Delete/Discount)</option>
                    <option value="Sales Manager">Sales Manager (POS Own Branch, Edit Mistaken Sales, Read-only Financials, No Delete/Discount/Payroll/P&amp;L)</option>
                    <option value="Admin">Admin (System Admin, Edit Mistaken Sales, Read-only Financials, No Delete/Discount/P&amp;L/Users)</option>
                    <option value="Finance">Finance (Finance Account, Edit Mistaken Sales, Read-only Financials, No Delete/Discount/P&amp;L)</option>
                    <option value="Operation">Operation (Yamin Nwe - Full Operations, Discounts, Payroll Edit/Delete, POS All Branches)</option>
                    <option value="MD">MD (Managing Director - Super Admin Full Read/Write/Delete Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Job Title / Position
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    placeholder="e.g. Cashier / Senior Sales"
                  />
                </div>
              </div>

              {/* Firebase Auth UID linking */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <label className="block text-slate-800 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Firestore / Firebase Auth UID</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Copy from Firebase Console &gt; Auth &gt; Users</span>
                </label>
                <input
                  type="text"
                  value={firebaseUid}
                  onChange={(e) => setFirebaseUid(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  placeholder="e.g. 7qX9w2bKmPnL4vJ8rS1..."
                />
                <p className="text-[10px] text-slate-500">
                  Linking UID guarantees the staff member's Firebase Authentication account connects to their profile in Firestore.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Branch Assignment *
                </label>
                <select
                  value={role === 'MD' || role === 'Operation' ? 'ALL' : branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={role === 'MD' || role === 'Operation'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {(role === 'MD' || role === 'Operation') && (
                    <option value="ALL">All Branches (Enterprise Access)</option>
                  )}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name} ({b.city})
                    </option>
                  ))}
                </select>
                {(role === 'MD' || role === 'Operation') ? (
                  <p className="text-[10px] text-indigo-700 mt-1 font-semibold">
                    * {role} accounts have full enterprise access across all branches.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    * {role} accounts are restricted to operating and issuing vouchers in their assigned branch.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                    <span>4-Digit Staff PIN *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Quick POS Auth</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-center font-bold tracking-widest"
                    placeholder="1234"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                    <span>Password *</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-purple-700 hover:underline"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                    placeholder=""
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Account Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer"
                >
                  <option value="active">Active (Permitted to sign in)</option>
                  <option value="inactive">Inactive (Access denied / locked)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingUser ? 'Save & Sync in Firestore' : 'Provision in Firestore'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
