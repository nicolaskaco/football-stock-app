import React, { useState, useEffect } from 'react';
import { LoginView } from './components/LoginView';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeView } from './components/EmployeeView';
import { database } from './utils/database';
import { supabase } from './supabaseClient';

const HeaderComponent = () => (
  <div className="bg-black text-yellow-400 p-4 text-center">
    App interna CAP v1
  </div>
);

const FooterComponent = () => (
  <div className="bg-black text-yellow-400 p-4 text-center">
    Todos los derechos reservados
  </div>
);

const App = () => {
  const [currentView, setCurrentView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [players, setPlayers] = useState([]);
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
        //const isAdmin = user.user_metadata?.role === 'authenticated';

        const { data: permissions, error: permError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('email', user.email)
        .single();

        if (permError) {
          console.error('Error fetching permissions:', permError);
        }

        const isAdmin = permissions?.can_access_players || false;
        
        if (isAdmin) {
          setCurrentUser({ 
            email: user.email, 
            isAdmin: true, 
            name: 'Administrator', 
            canAccessPlayers: permissions?.can_access_players || false, 
            canAccessViaticos: permissions?.can_access_viatico || false, 
            canAccessWidgets: permissions?.can_access_widgets || false 
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
      const [empData, invData, distData, playersData] = await Promise.all([
        database.getEmployees(),
        database.getInventory(),
        database.getDistributions(),
        database.getPlayers()
      ]);
      
      setEmployees(empData || []);
      setInventory(invData || []);
      setDistributions(distData || []);
      setPlayers(playersData || []);
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

      const { data: permissions, error: permError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('email', emailOrGovId)
        .single();

      if (permError) {
        console.error('Error fetching permissions:', permError);
      }

      // Set the current user with permissions
      setCurrentUser({
        email: emailOrGovId,
        isAdmin: true,
        canAccessPlayers: permissions?.can_access_players || false,
        canAccessViaticos: permissions?.can_access_viatico || false,
        canAccessWidgets: permissions?.can_access_widgets || false
      });

      await loadData();
      setCurrentView('dashboard');
    } catch (error) {
      alert('Invalid admin credentials: ' + error.message);
    }
  } else {
    // --- EMPLOYEE LOGIN (FIXED) ---
    try {
      const employee = await database.validateEmployee(emailOrGovId, password);
      
      if (employee) {
        // Only load inventory and employee's own distributions
        const [myDistributions, myInventory] = await Promise.all([
          database.getEmployeeDistributions(employee.id),
          database.getEmployeeInventory(employee.id)
        ]);

        setDistributions(myDistributions);  // Only their distributions
        setInventory(myInventory);
        setEmployees([]);  // Don't load employee list
        setPlayers([]);    // Don't load players

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
      <HeaderComponent />
      {currentView === 'login' && (
        <LoginView onLogin={handleLogin} />
      )}
      {currentView === 'dashboard' && (
        <AdminDashboard
          employees={employees}
          inventory={inventory}
          distributions={distributions}
          players={players}
          currentUser={currentUser}
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
      <FooterComponent />
    </div>
  );
};

export default App;