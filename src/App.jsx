import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginView } from './components/LoginView';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeView } from './components/EmployeeView';
import { PlayerFormPublic } from './forms/PlayerFormPublic';
import { database } from './utils/database';
import { supabase } from './supabaseClient';

const HeaderComponent = () => (
  <div className="bg-black text-yellow-400 p-4 text-center">
    App interna CAP v2
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
  const [dirigentes, setDirigentes] = useState([]);
  const [torneos, setTorneos] = useState([]);
  const [comisiones, setComisiones] = useState([]);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const user = session.user;

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
            role: permissions?.role || 'user', 
            canAccessPlayers: permissions?.can_access_players || false, 
            canAccessViaticos: permissions?.can_access_viatico || false, 
            canAccessWidgets: permissions?.can_access_widgets || false, 
            canAccessDirigentes: permissions?.can_access_dirigentes || false, 
            canEditPlayers: permissions?.can_edit_players || false, 
            canEditNameVisual: permissions?.editar_nombre_especial || false,
            categoria: permissions?.categoria ||[], 
            canEditTorneo: permissions?.edit_torneo || false,
            canViewTorneo: permissions?.view_torneo || false,
            canViewComisiones: permissions?.can_view_comisiones || false,
            canEditComision: permissions?.can_edit_comisiones || false,
            canAccessRopa: permissions?.can_access_ropa || false
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

  const loadPlayers = async () => { const d = await database.getPlayers(); setPlayers(d || []); };
  const loadEmployees = async () => { const d = await database.getEmployees(); setEmployees(d || []); };
  const loadInventory = async () => { const d = await database.getInventory(); setInventory(d || []); };
  const loadDistributions = async () => { const d = await database.getDistributions(); setDistributions(d || []); };
  const loadDirigentes = async () => { const d = await database.getDirigentes(); setDirigentes(d || []); };
  const loadTorneos = async () => { const d = await database.getTorneos(); setTorneos(d || []); };
  const loadComisiones = async () => { const d = await database.getComisiones(); setComisiones(d || []); };

  const loadData = async () => {
    try {
      await Promise.all([
        loadEmployees(),
        loadInventory(),
        loadDistributions(),
        loadPlayers(),
        loadDirigentes(),
        loadTorneos(),
        loadComisiones(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const entityLoaders = {
    players: loadPlayers,
    employees: loadEmployees,
    inventory: loadInventory,
    distributions: loadDistributions,
    dirigentes: loadDirigentes,
    torneos: loadTorneos,
    comisiones: loadComisiones,
  };

  const handleDataChange = async (...entities) => {
    await Promise.all(entities.map(e => entityLoaders[e]()));
  };

  const saveEmployees = async (data) => {
    setEmployees(data);
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

        setCurrentUser({
          email: emailOrGovId,
          isAdmin: true,
          role: permissions?.role || 'user',
          canAccessPlayers: permissions?.can_access_players || false,
          canAccessViaticos: permissions?.can_access_viatico || false,
          canAccessWidgets: permissions?.can_access_widgets || false,
          canAccessDirigentes: permissions?.can_access_dirigentes || false,
          canEditPlayers: permissions?.can_edit_players || false, 
          canEditNameVisual: permissions?.editar_nombre_especial || false,
          categoria: permissions?.categoria || [],
          canEditTorneo: permissions?.edit_torneo || false,
          canViewTorneo: permissions?.view_torneo || false,
          canViewComisiones: permissions?.can_view_comisiones || false,
          canEditComision: permissions?.can_edit_comisiones || false,
          canAccessRopa: permissions?.can_access_ropa || false
        });

        await loadData();
        setCurrentView('dashboard');
      } catch (error) {
        alert('Invalid admin credentials: ' + error.message);
      }
    } else {
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
    <BrowserRouter>
      <Routes>
        {/* Public form route - no header/footer */}
        <Route path="/formulario" element={<PlayerFormPublic />} />
        
        {/* Main app routes - with header/footer */}
        <Route path="/*" element={
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
                dirigentes={dirigentes}
                torneos={torneos}
                comisiones={comisiones}
                currentUser={currentUser}
                onLogout={handleLogout}
                onDataChange={handleDataChange}
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
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;