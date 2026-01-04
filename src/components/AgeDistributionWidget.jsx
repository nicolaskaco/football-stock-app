import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

export const AgeDistributionWidget = ({ players }) => {
  const [ageGroups, setAgeGroups] = useState([]);

  useEffect(() => {
    calculateAgeDistribution();
  }, [players]);

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateAgeDistribution = () => {
    const groups = [
      { label: '13-14', min: 13, max: 14, count: 0, color: '#3B82F6' },
      { label: '15-16', min: 15, max: 16, count: 0, color: '#8B5CF6' },
      { label: '17-18', min: 17, max: 18, count: 0, color: '#10B981' },
      { label: '19-20', min: 19, max: 20, count: 0, color: '#F59E0B' },
      { label: '21-23', min: 21, max: 23, count: 0, color: '#EF4444' }
    ];

    players.forEach(player => {
      const age = calculateAge(player.date_of_birth);
      const group = groups.find(g => age >= g.min && age <= g.max);
      if (group) group.count++;
    });

    const total = groups.reduce((sum, g) => sum + g.count, 0);
    const withPercentage = groups.map(g => ({
      ...g,
      percentage: total > 0 ? ((g.count / total) * 100).toFixed(1) : 0
    }));

    setAgeGroups(withPercentage);
  };

  const maxCount = Math.max(...ageGroups.map(g => g.count), 1);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-6 h-6 text-orange-600" />
        <h3 className="text-lg font-bold">Distribución por Edad</h3>
      </div>

      <div className="space-y-3">
        {ageGroups.map((group, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{group.label} años</span>
              <div>
                <span className="text-gray-900 font-semibold">{group.count}</span>
                <span className="text-gray-500 text-xs ml-2">({group.percentage}%)</span>
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${(group.count / maxCount) * 100}%`,
                  backgroundColor: group.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};