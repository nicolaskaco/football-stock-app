import React, { useState, useEffect } from 'react';
import { LoginView } from './components/LoginView';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeView } from './components/EmployeeView';
import { storage } from './utils/storage';

const TestComponent = () => (
  <div className="bg-black text-yellow-400 p-4 text-center">
    App para manejar el Stock de la Indumentaria del Club Atlético Peñarol 2026
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
    loadData();
  }, []);

  const loadData = () => {
    try {
      const empData = storage.get('employees');
      const invData = storage.get('inventory');
      const distData = storage.get('distributions');
      
      if (empData) setEmployees(empData);
      if (invData) setInventory(invData);
      if (distData) setDistributions(distData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const saveEmployees = (data) => {
    setEmployees(data);
    storage.set('employees', data);
  };

  const saveInventory = (data) => {
    setInventory(data);
    storage.set('inventory', data);
    storage.checkLowStock(data);
  };

  const saveDistributions = (data) => {
    setDistributions(data);
    storage.set('distributions', data);
  };

  const handleLogin = (username, password, isAdmin) => {
    if (isAdmin && username === 'admin' && password === 'admin123') {
      setCurrentUser({ 
        username: 'admin', 
        isAdmin: true, 
        name: 'Administrator' 
      });
      setCurrentView('dashboard');
    } else if (!isAdmin) {
      const employee = employees.find(
        e => e.govId === username && e.id === password
      );
      if (employee) {
        setCurrentUser({ ...employee, isAdmin: false });
        setCurrentView('employee-view');
      } else {
        alert('Invalid credentials. Please check your Government ID and Employee ID.');
      }
    } else {
      alert('Invalid admin credentials.');
    }
  };

  const handleLogout = () => {
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
          saveEmployees={saveEmployees}
          saveInventory={saveInventory}
          saveDistributions={saveDistributions}
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