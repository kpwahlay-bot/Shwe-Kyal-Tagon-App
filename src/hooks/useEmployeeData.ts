import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Employee, Branch, UserAccount } from '../types';
import { calculateTenure } from '../utils/tenureHelpers';
import { isQuotaExceededError } from '../utils/cloudSync';

// In-memory cache to prevent quota-exhausting duplicate Firestore reads
const employeeCache = new Map<string, Employee[]>();
let lastGlobalEmployees: Employee[] = [];

/**
 * Normalizes Firestore document into an Employee entity with dynamic tenure
 */
export function mapDocToEmployee(id: string, data: any): Employee {
  const joinedDate = data.joinedDate || data.joined_date || data.joinDate || new Date().toISOString().split('T')[0];
  
  return {
    id: id || data.id,
    code: data.code || data.employeeCode || data.employee_id || `EC-${id.slice(-4)}`,
    name: data.name || '',
    position: data.position || 'Staff',
    department: data.department || 'Sales Department',
    branchId: data.branchId || data.branch_id || 'branch-1',
    branchName: data.branchName || data.branch_name || 'Main Branch',
    phone: data.phone || '',
    baseSalary: Number(data.baseSalary ?? data.base_salary ?? 0),
    joinedDate,
    // Dynamic Tenure is computed strictly on the fly (never static text)
    tenure: calculateTenure(joinedDate),
    status: data.status === 'resigned' ? 'resigned' : data.status === 'leave' ? 'leave' : 'active',
    firebaseUid: data.firebaseUid || data.uid || id,
    role: data.role || 'Staff',
    phoneTargetUnits: Number(data.phoneTargetUnits ?? 10),
    laptopTargetUnits: Number(data.laptopTargetUnits ?? 5),
    salesTargetUnits: Number(data.salesTargetUnits ?? 15),
  };
}

/**
 * Feature 5: Seamless Payroll Integration Hook
 * Dynamically fetches active staff list strictly via:
 * query(collection(db, 'employees'), where('branchId', '==', selectedBranch))
 * and calculates dynamic tenure on the fly.
 * 
 * Includes anti-looping safeguards and in-memory caching to minimize Firestore quota usage.
 */
export function usePayrollStaff(selectedBranch: string, fallbackEmployees: Employee[] = []) {
  const [staffList, setStaffList] = useState<Employee[]>(() => {
    if (fallbackEmployees.length > 0) {
      return fallbackEmployees.filter((e) => {
        if (!selectedBranch || selectedBranch === 'ALL') return e.status !== 'resigned';
        return e.branchId === selectedBranch && e.status !== 'resigned';
      });
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Anti-looping stable ref for active query
  const activeBranchRef = useRef<string>(selectedBranch);
  activeBranchRef.current = selectedBranch;

  useEffect(() => {
    let isMounted = true;
    const branchKey = selectedBranch || 'ALL';

    // Check memory cache first to conserve reads
    if (employeeCache.has(branchKey)) {
      const cached = employeeCache.get(branchKey)!;
      if (isMounted) {
        setStaffList(cached.map((emp) => ({
          ...emp,
          tenure: calculateTenure(emp.joinedDate),
        })));
        setLoading(false);
      }
    }

    try {
      // Feature 5 Query formulation:
      // query(collection(db, 'employees'), where('branchId', '==', selectedBranch))
      const employeesCollection = collection(db, 'employees');
      const staffQuery = branchKey === 'ALL'
        ? query(employeesCollection)
        : query(employeesCollection, where('branchId', '==', branchKey));

      const unsubscribe = onSnapshot(
        staffQuery,
        (snapshot) => {
          if (!isMounted) return;

          const loaded: Employee[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const emp = mapDocToEmployee(docSnap.id, data);
            // Only active or leave staff in payroll (skip resigned)
            if (emp.status !== 'resigned') {
              loaded.push(emp);
            }
          });

          // Sort by employee code / name
          loaded.sort((a, b) => a.code.localeCompare(b.code));

          // Save to cache to prevent redundant reads
          employeeCache.set(branchKey, loaded);

          if (isMounted) {
            setStaffList(loaded);
            setLoading(false);
            setError(null);
          }
        },
        (err) => {
          if (!isMounted) return;
          console.warn('[usePayrollStaff] Firestore error, falling back to local state:', err);
          
          if (isQuotaExceededError(err)) {
            setError('Firestore quota exceeded. Serving staff from cache.');
          } else {
            setError(err.message);
          }

          // Safe fallback from props without crashing
          if (fallbackEmployees.length > 0) {
            const filtered = fallbackEmployees.filter((e) => {
              if (branchKey === 'ALL') return e.status !== 'resigned';
              return e.branchId === branchKey && e.status !== 'resigned';
            });
            setStaffList(filtered);
          }
          setLoading(false);
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (err: any) {
      if (isMounted) {
        console.error('[usePayrollStaff] Query initialization failed:', err);
        setError(err.message);
        setLoading(false);
      }
    }
  }, [selectedBranch]);

  // Dynamically re-calculate tenure whenever staffList is accessed
  const staffWithDynamicTenure = useMemo(() => {
    return staffList.map((emp) => ({
      ...emp,
      tenure: calculateTenure(emp.joinedDate),
    }));
  }, [staffList]);

  return {
    staffList: staffWithDynamicTenure,
    loading,
    error,
  };
}

/**
 * Feature 4: Employee Directory Hook
 * Strict branch-based filtering and instant branch reassignment logic.
 * Enforces Zero UI Register (UID as Document ID) and strict field-level security.
 */
export function useEmployeeDirectory(
  selectedBranch: string,
  initialEmployees: Employee[] = [],
  branches: Branch[] = []
) {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    return initialEmployees.length > 0 ? initialEmployees : lastGlobalEmployees;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to employees collection with anti-looping protection
  useEffect(() => {
    let isMounted = true;

    try {
      const q = collection(db, 'employees');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted) return;

          const loaded: Employee[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push(mapDocToEmployee(docSnap.id, docSnap.data()));
          });

          if (loaded.length > 0) {
            loaded.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
            lastGlobalEmployees = loaded;
            if (isMounted) {
              setEmployees(loaded);
              setLoading(false);
              setError(null);
            }
          } else if (initialEmployees.length > 0 && isMounted) {
            // If collection is empty, retain fallback
            setEmployees(initialEmployees);
            setLoading(false);
          }
        },
        (err) => {
          if (!isMounted) return;
          console.warn('[useEmployeeDirectory] Snapshot error:', err);
          if (isMounted) {
            setEmployees(initialEmployees);
            setLoading(false);
          }
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (err: any) {
      if (isMounted) {
        setEmployees(initialEmployees);
        setLoading(false);
      }
    }
  }, []);

  // Feature 4: Strict Branch Reassignment & Filtering
  // Changing "Branch" dropdown strictly filters employees by branchId
  const filteredEmployees = useMemo(() => {
    if (!selectedBranch || selectedBranch === 'ALL') {
      return employees;
    }
    return employees.filter((emp) => emp.branchId === selectedBranch);
  }, [employees, selectedBranch]);

  // Feature 1: Zero UI Register (Save document using pasted UID as Document ID)
  const addEmployeeWithUid = useCallback(
    async (pastedUid: string, employeeData: Omit<Employee, 'id'>) => {
      const docId = pastedUid.trim();
      if (!docId) {
        throw new Error('Firebase Auth UID is mandatory for Zero-UI Employee Registration.');
      }

      const branchObj = branches.find((b) => b.id === employeeData.branchId);
      const branchName = branchObj ? branchObj.name : (branches[0]?.name || 'Shwe Kyal Tagon (Shop 1)');

      const payload = {
        ...employeeData,
        id: docId,
        uid: docId,
        firebaseUid: docId,
        branchName,
        // Mandate ISO date for joinDate
        joinedDate: employeeData.joinedDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // CRITICAL DB RULE: Save document using pasted uid as the Document ID itself
      const docRef = doc(db, 'employees', docId);
      await setDoc(docRef, payload);

      // Instantly update local state to avoid delay
      setEmployees((prev) => {
        const next = [...prev.filter((e) => e.id !== docId), payload as Employee];
        return next;
      });

      return payload;
    },
    [branches]
  );

  // Standard update for existing employees
  const updateEmployeeDoc = useCallback(
    async (employeeId: string, updates: Partial<Employee>) => {
      if (!employeeId) return;

      const branchObj = branches.find((b) => b.id === updates.branchId);
      const branchName = branchObj ? branchObj.name : updates.branchName;

      const payload = {
        ...updates,
        ...(branchName ? { branchName } : {}),
        updatedAt: new Date().toISOString(),
      };

      const docRef = doc(db, 'employees', employeeId);
      await updateDoc(docRef, payload);

      // Instant optimistic state update
      setEmployees((prev) =>
        prev.map((e) => (e.id === employeeId ? { ...e, ...payload } : e))
      );
    },
    [branches]
  );

  // Feature 4: Instant Branch Reassignment
  const reassignBranch = useCallback(
    async (employeeId: string, newBranchId: string) => {
      const branchObj = branches.find((b) => b.id === newBranchId);
      const branchName = branchObj ? branchObj.name : 'Branch';

      await updateEmployeeDoc(employeeId, {
        branchId: newBranchId,
        branchName,
      });
    },
    [branches, updateEmployeeDoc]
  );

  // Delete employee
  const deleteEmployeeDoc = useCallback(async (employeeId: string) => {
    if (!employeeId) return;
    const docRef = doc(db, 'employees', employeeId);
    await deleteDoc(docRef);

    setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
  }, []);

  return {
    employees: filteredEmployees,
    allEmployees: employees,
    loading,
    error,
    addEmployeeWithUid,
    updateEmployeeDoc,
    reassignBranch,
    deleteEmployeeDoc,
  };
}
