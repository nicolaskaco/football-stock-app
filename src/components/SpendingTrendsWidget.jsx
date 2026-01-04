import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { supabase } from '../supabaseClient';

export const SpendingTrendsWidget = ({ players }) => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateTrends();
  }, [players]);

  const calculateTrends = async () => {
    setLoading(true);
    const last6Months = [];
    const today = new Date();

    // Get ALL history records
    const { data: historyData, error } = await supabase
      .from('player_history')
      .select('*')
      .in('field_name', ['viatico', 'complemento', 'contrato'])
      .order('changed_at', { ascending: true });

    if (error) {
      console.error('Error fetching history:', error);
      calculateCurrentTotals();
      setLoading(false);
      return;
    }

    // Build a complete state for each player starting from CURRENT values
    const playerStates = {};
    
    // Initialize with CURRENT player values
    players.forEach(player => {
      playerStates[player.id] = {
        currentViatico: player.viatico || 0,
        currentComplemento: player.complemento || 0,
        currentContrato: player.contrato || false,
        history: [] // Track all changes with timestamps
      };
    });

    // Apply ALL history changes and track them
    historyData.forEach(change => {
      if (!playerStates[change.player_id]) {
        playerStates[change.player_id] = { 
          currentViatico: 0,
          currentComplemento: 0,
          currentContrato: false,
          history: []
        };
      }
      
      playerStates[change.player_id].history.push({
        timestamp: new Date(change.changed_at),
        field: change.field_name,
        oldValue: change.old_value,
        newValue: change.new_value
      });
    });

    // For each of the last 6 months, calculate totals at the END of that month
    for (let i = 5; i >= 0; i--) {
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59);
      const monthName = new Date(today.getFullYear(), today.getMonth() - i, 1)
        .toLocaleDateString('es-UY', { month: 'short', year: 'numeric' });
      
      // Check if this is the current month
      const isCurrentMonth = i === 0;
      
      let totalViaticos = 0;
      let totalComplementos = 0;

      if (isCurrentMonth) {
        // For current month, use actual values from players table
        totalViaticos = players
          .filter(p => !p.contrato)
          .reduce((sum, p) => sum + (p.viatico || 0), 0);
        
        totalComplementos = players
          .filter(p => !p.contrato)
          .reduce((sum, p) => sum + (p.complemento || 0), 0);
      } else {
        // For past months, start with current values and apply/reverse changes
        Object.entries(playerStates).forEach(([playerId, playerState]) => {
          let viatico = playerState.currentViatico;
          let complemento = playerState.currentComplemento;
          let contrato = playerState.currentContrato;

          if (playerState.history.length > 0) {
            // If player has history, replay changes up to month end
            const changesUpToMonth = playerState.history
              .filter(change => change.timestamp <= monthEnd)
              .sort((a, b) => a.timestamp - b.timestamp);

            if (changesUpToMonth.length > 0) {
              // Start from 0 and apply all changes up to this month
              viatico = 0;
              complemento = 0;
              contrato = false;

              changesUpToMonth.forEach(change => {
                if (change.field === 'viatico') {
                  viatico = parseInt(change.newValue) || 0;
                } else if (change.field === 'complemento') {
                  complemento = parseInt(change.newValue) || 0;
                } else if (change.field === 'contrato') {
                  contrato = change.newValue === 'true';
                }
              });
            } else {
              // No changes before this month, so values were 0
              viatico = 0;
              complemento = 0;
              contrato = false;
            }
          }
          // else: player has no history, use current values (already set)

          // Only count players without contracts
          if (!contrato) {
            totalViaticos += viatico;
            totalComplementos += complemento;
          }
        });
      }

      last6Months.push({
        month: monthName,
        viaticos: totalViaticos,
        complementos: totalComplementos,
        total: totalViaticos + totalComplementos
      });
    }

    setTrends(last6Months);
    setLoading(false);
  };

  const calculateCurrentTotals = () => {
    // Fallback: show current totals for all months
    const last6Months = [];
    const today = new Date();
    
    const totalViaticos = players
      .filter(p => !p.contrato)
      .reduce((sum, p) => sum + (p.viatico || 0), 0);
    
    const totalComplementos = players
      .filter(p => !p.contrato)
      .reduce((sum, p) => sum + (p.complemento || 0), 0);

    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = month.toLocaleDateString('es-UY', { month: 'short', year: 'numeric' });
      
      last6Months.push({
        month: monthName,
        viaticos: totalViaticos,
        complementos: totalComplementos,
        total: totalViaticos + totalComplementos
      });
    }

    setTrends(last6Months);
  };

  const maxValue = Math.max(...trends.map(t => t.total), 1);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-6 h-6 text-green-600" />
        <h3 className="text-lg font-bold">Tendencia de Gastos (Últimos 6 Meses)</h3>
      </div>
      
      {trends.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No hay datos históricos disponibles</p>
      ) : (
        <>
          <div className="space-y-3">
            {trends.map((trend, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{trend.month}</span>
                  <span className="text-gray-600">${trend.total.toLocaleString()}</span>
                </div>
                <div className="flex gap-1 h-8">
                  {trend.viaticos > 0 && (
                    <div 
                      className="bg-blue-500 rounded relative group cursor-pointer"
                      style={{ width: `${(trend.viaticos / maxValue) * 100}%` }}
                    >
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Viáticos: ${trend.viaticos.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {trend.complementos > 0 && (
                    <div 
                      className="bg-purple-500 rounded relative group cursor-pointer"
                      style={{ width: `${(trend.complementos / maxValue) * 100}%` }}
                    >
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Complementos: ${trend.complementos.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {trend.total === 0 && (
                    <div className="w-full bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                      Sin gastos
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Viáticos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Complementos</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};