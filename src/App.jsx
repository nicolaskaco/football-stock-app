import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginView } from './components/LoginView';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeView } from './components/EmployeeView';
import { SetPassword } from './components/SetPassword';
import { PlayerFormPublic } from './forms/PlayerFormPublic';
import PlayerLoginView from './components/PlayerLoginView';
import PlayerQuestionnaire from './forms/PlayerQuestionnaire';
import { database } from './utils/database';
import { supabase } from './supabaseClient';
import { ToastProvider } from './context/ToastContext';
import { Toast } from './components/Toast';

const HeaderComponent = () => (
  <div className="bg-black text-yellow-400 p-4 text-center">
    App interna CAP v4
  </div>
);

const FooterComponent = () => (
  <div className="bg-black text-yellow-400 p-4 text-center">
    Todos los derechos reservados
  </div>
);

// ── Player portal: login → questionnaire → thank-you ─────────────────────
const PlayerPortal = () => {
  const [player, setPlayer] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleLogin = (playerData, submitted) => {
    setPlayer(playerData);
    setAlreadySubmitted(submitted);
  };

  if (!player) {
    return <PlayerLoginView onLogin={handleLogin} />;
  }

  if (alreadySubmitted || completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Formulario completado!</h2>
          <p className="text-gray-500 text-sm">
            Gracias, <span className="font-medium text-gray-700">{player.name}</span>.<br />
            Tus respuestas han sido registradas correctamente. Ya podés cerrar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <PlayerQuestionnaire player={player} onComplete={() => setCompleted(true)} />;
};

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
  const [rivales, setRivales] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [appSettings, setAppSettings] = useState({});
  const [pendingChangeRequests, setPendingChangeRequests] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [sprints, setSprints] = useState([]);

  useEffect(() => {
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.slice(1));
    const tokenHash = hashParams.get('token_hash');
    const isInviteFlow = hash && (hash.includes('type=invite') || hash.includes('type=signup'));

    // Single listener — handles both invite and password-recovery flows
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (isInviteFlow && session)) {
        setLoading(false);
        setCurrentView('set-password');
      }
    });

    if (isInviteFlow) {
      if (tokenHash) {
        // New flow: link has token_hash in the fragment (WhatsApp-safe).
        // verifyOtp exchanges it for a session; onAuthStateChange handles the rest.
        supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'invite' })
          .then(({ error }) => {
            if (error) {
              // Token invalid/expired — fall through to login
              setLoading(false);
            }
            // Success: onAuthStateChange fires and sets 'set-password' view
          });
      } else {
        // Legacy flow: Supabase already exchanged the token and put
        // access_token in the hash (old direct action_link behaviour).
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            setCurrentView('set-password');
          }
          setLoading(false);
        });
      }
    } else {
      checkSession();
    }

    return () => subscription.unsubscribe();
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
            canAccessRopa: permissions?.can_access_ropa || false,
            canSeeRopaWidgets: permissions?.can_see_ropa_widgets || false,
            canViewPartidos: permissions?.can_view_partidos || false,
            canEditPartidos: permissions?.can_edit_partidos || false,
            canEditDirigentes: permissions?.can_edit_dirigentes || false,
            canAccessTesorero: permissions?.can_access_tesorero || false,
            canViewTarjetas: permissions?.can_view_tarjetas || false,
            canAccessTareas: permissions?.can_access_tareas || false,
            canDeleteTareas: permissions?.can_delete_tareas || false,
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
  const loadRivales = async () => { const d = await database.getRivales(); setRivales(d || []); };
  const loadJornadas = async () => { const d = await database.getJornadas(); setJornadas(d || []); };
  const loadInjuries = async () => { const d = await database.getInjuries(); setInjuries(d || []); };
  const loadAppSettings = async () => { const d = await database.getAppSettings(); setAppSettings(d || {}); };
  const loadPendingChangeRequests = async () => { const d = await database.getPendingChangeRequests(); setPendingChangeRequests(d || []); };
  const loadTareas = async () => { const d = await database.getTareas(); setTareas(d || []); };
  const loadSprints = async () => { const d = await database.getSprints(); setSprints(d || []); };

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
        loadRivales(),
        loadJornadas(),
        loadInjuries(),
        loadAppSettings(),
        loadPendingChangeRequests(),
        loadTareas(),
        loadSprints(),
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
    rivales: loadRivales,
    jornadas: loadJornadas,
    injuries: loadInjuries,
    appSettings: loadAppSettings,
    pendingChangeRequests: loadPendingChangeRequests,
    tareas: loadTareas,
    sprints: loadSprints,
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
          canAccessRopa: permissions?.can_access_ropa || false,
          canSeeRopaWidgets: permissions?.can_see_ropa_widgets || false,
          canViewPartidos: permissions?.can_view_partidos || false,
          canEditPartidos: permissions?.can_edit_partidos || false,
          canEditDirigentes: permissions?.can_edit_dirigentes || false,
          canAccessTesorero: permissions?.can_access_tesorero || false,
          canViewTarjetas: permissions?.can_view_tarjetas || false,
          canAccessTareas: permissions?.can_access_tareas || false,
          canDeleteTareas: permissions?.can_delete_tareas || false,
        });

        await loadData();
        setCurrentView('dashboard');
        // Fire-and-forget — don't block login on logging failure
        database.logActivity('login', emailOrGovId, null, null, { role: permissions?.role || 'user' });
      } catch (error) {
        throw new Error('Credenciales inválidas: ' + error.message);
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
          throw new Error('Credenciales inválidas. Verifique su cédula y número de funcionario.');
        }
      } catch (error) {
        throw error;
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
    <ToastProvider>
      <Toast />
    <BrowserRouter>
      <Routes>
        {/* Public form route - no header/footer */}
        <Route path="/formulario" element={<PlayerFormPublic />} />

        {/* Player self-service questionnaire - standalone, no header/footer */}
        <Route path="/jugador" element={<PlayerPortal />} />
        
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
                rivales={rivales}
                jornadas={jornadas}
                injuries={injuries}
                appSettings={appSettings}
                pendingChangeRequests={pendingChangeRequests}
                tareas={tareas}
                sprints={sprints}
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
            {currentView === 'set-password' && (
              <SetPassword
                onComplete={async () => {
                  // Clear the hash so invite token isn't re-detected on refresh
                  window.location.hash = '';
                  await checkSession();
                }}
              />
            )}
            <FooterComponent />
          </div>
        } />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
};

export default App;