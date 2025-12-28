import React from 'react';

export const StatCard = ({ icon, label, value, color }) => {
  const colors = { 
    blue: 'bg-blue-100 text-blue-600', 
    green: 'bg-green-100 text-green-600', 
    purple: 'bg-purple-100 text-purple-600', 
    red: 'bg-red-100 text-red-600' 
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`inline-flex p-3 rounded-lg ${colors[color]} mb-4`}>
        {icon}
      </div>
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
};