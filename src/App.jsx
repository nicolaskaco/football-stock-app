import React, { useState, useEffect } from 'react';
import { LoginView } from './components/LoginView';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeView } from './components/EmployeeView';
import { database } from './utils/database';
import { supabase } from './supabaseClient';

const TestComponent = () => (
  <div className="bg-black text-yellow-400 p-4 text-center">
    App para manejar el Stock de la Indumentaria del Club Atlético Peñarol 2026 v1
  </div>
);

const App = () => {
  const [currentView, setCurrentView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // User is already logged in
        const user = session.user;
        const isAdmin = user.user_metadata?.role === 'authenticated';
        
        if (isAdmin) {
          setCurrentUser({ 
            email: user.email, 
            isAdmin: true, 
            name: 'Administrator' 
          });
          await loadData();
          setCurrentView('dashboard');
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
    setLoading(false);
  };

  const loadData = async () => {
    try {
      const [empData, invData, distData] = await Promise.all([
        database.getEmployees(),
        database.getInventory(),
        database.getDistributions()
      ]);
      
      setEmployees(empData || []);
      setInventory(invData || []);
      setDistributions(distData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const saveEmployees = async (data) => {
    setEmployees(data);
    // Data is saved via individual operations in components
  };

  const saveInventory = async (data) => {
    setInventory(data);
    await database.checkLowStock();
  };

  const saveDistributions = async (data) => {
    setDistributions(data);
  };

  const handleLogin = async (emailOrGovId, password, isAdmin) => {
  if (isAdmin) {
    // --- ADMIN LOGIN (unchanged) ---
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailOrGovId,
        password,
      });

      if (error) throw error;

      setCurrentUser({
        email: data.user.email,
        isAdmin: true,
        name: 'Administrator',
      });

      await loadData();
      setCurrentView('dashboard');
    } catch (error) {
      alert('Invalid admin credentials: ' + error.message);
    }
  } else {
    // --- EMPLOYEE LOGIN (FIXED) ---
    try {
      const empData = await database.getEmployees();

      const employee = empData.find(
        e =>
          e.gov_id === emailOrGovId &&
          String(e.id) === String(password)
      );

      if (employee) {
        await loadData();
        setCurrentUser({ ...employee, isAdmin: false });
        setCurrentView('employee-view');
      } else {
        alert('Invalid credentials. Please check your Government ID and Employee ID.');
      }
    } catch (error) {
      console.error(error);
      alert('Error validating employee');
    }
  }
};

  const handleLogout = async () => {
    if (currentUser?.isAdmin) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setCurrentView('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TestComponent />
      {currentView === 'login' && (
        <LoginView onLogin={handleLogin} />
      )}
      {currentView === 'dashboard' && (
        <AdminDashboard
          employees={employees}
          inventory={inventory}
          distributions={distributions}
          onLogout={handleLogout}
          onDataChange={loadData}
        />
      )}
      {currentView === 'employee-view' && (
        <EmployeeView
          employee={currentUser}
          distributions={distributions}
          inventory={inventory}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default App;