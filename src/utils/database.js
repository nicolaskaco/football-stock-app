import { supabase } from '../supabaseClient';

export const database = {
  // EMPLOYEES
  async getEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async addEmployee(employee) {
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async updateEmployee(id, employee) {
    const { data, error } = await supabase
      .from('employees')
      .update(employee)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async deleteEmployee(id) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // INVENTORY
  async getInventory() {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getEmployeeInventory(employeeId) {
    const { data, error } = await supabase
      .from('distributions')
      .select(`
        item_id,
        inventory:item_id (
          id,
          name,
          category,
          size,
          quantity,
          min_stock,
          created_at
        )
      `)
      .eq('employee_id', employeeId);
    
    if (error) throw error;
    
    // Extract unique inventory items (avoid duplicates if employee has multiple distributions of same item)
    const inventoryMap = new Map();
    data.forEach(dist => {
      if (dist.inventory && !inventoryMap.has(dist.inventory.id)) {
        inventoryMap.set(dist.inventory.id, dist.inventory);
      }
    });
    
    return Array.from(inventoryMap.values());
  },

  async addInventoryItem(item) {
    const { data, error } = await supabase
      .from('inventory')
      .insert([item])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async updateInventoryItem(id, item) {
    const { data, error } = await supabase
      .from('inventory')
      .update(item)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async deleteInventoryItem(id) {
    // First, check if this item has any distributions
    const { data: distributions, error: checkError } = await supabase
      .from('distributions')
      .select('id')
      .eq('item_id', id)
      .limit(1);
    
    if (checkError) throw checkError;
    
    if (distributions && distributions.length > 0) {
      throw new Error('No se puede eliminar este artículo porque tiene distribuciones asociadas. Elimine primero las distribuciones.');
    }
    
    // If no distributions, proceed with deletion
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // DISTRIBUTIONS
  async getDistributions() {
    const { data, error } = await supabase
      .from('distributions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Add these new functions for employee view
  async getEmployeeDistributions(employeeId) {
    const { data, error } = await supabase
      .from('distributions')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async addDistribution(distribution) {
    const { data, error } = await supabase
      .from('distributions')
      .insert([distribution])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async updateDistribution(id, distribution) {
    const { data, error } = await supabase
      .from('distributions')
      .update(distribution)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // PLAYERS (NEW)
  async getPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('hide_player', false)
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async addPlayer(player) {
    const { data, error } = await supabase
      .from('players')
      .insert([player])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async updatePlayer(id, player, currentUserEmail) {
    // First, get the old player data
    const { data: oldPlayer, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Track which fields changed
    const trackedFields = ['contrato', 'viatico', 'complemento'];
    const historyRecords = [];

    trackedFields.forEach(field => {
      const oldValue = oldPlayer[field];
      const newValue = player[field];

      // Check if value actually changed
      if (oldValue !== newValue) {
        historyRecords.push({
          player_id: id,
          field_name: field,
          old_value: oldValue !== null ? String(oldValue) : null,
          new_value: newValue !== null ? String(newValue) : null,
          changed_by: currentUserEmail || 'Unknown'
        });
      }
    });

    // Update the player
    const { data, error } = await supabase
      .from('players')
      .update(player)
      .eq('id', id)
      .select();
    
    if (error) throw error;

    // Insert history records if any changes
    if (historyRecords.length > 0) {
      const { error: historyError } = await supabase
        .from('player_history')
        .insert(historyRecords);
      
      if (historyError) console.error('Error saving history:', historyError);
    }

    return data[0];
  },

  async deletePlayer(id) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // PLAYER HISTORY
  async getPlayerHistory(playerId) {
    const { data, error } = await supabase
      .from('player_history')
      .select('*')
      .eq('player_id', playerId)
      .order('changed_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async addPlayerHistory(historyRecord) {
    const { data, error } = await supabase
      .from('player_history')
      .insert([historyRecord])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // LOW STOCK CHECK
  async checkLowStock() {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .lte('quantity', supabase.raw('min_stock'));
    
    if (error) throw error;
    
    if (data.length > 0) {
      console.log('Low stock alert for: nicomultimanya@gmail.com');
      console.log('Low stock items:', data);
    }
    
    return data;
  },

  // Validate employee credentials via Edge Function
  //https://czboublvkbkvtbkmkqmx.supabase.co/functions/v1/validate-employee
  async validateEmployee(govId, employeeId) {
    const { data, error } = await supabase.functions.invoke('validate-employee', {
      body: { gov_id: govId, employee_id: employeeId }
    });
    
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    
    return data.employee;
  },

  async uploadDocument(playerId, file, documentType) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${playerId}/${documentType}_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('player-documents')
        .upload(fileName, file);

      if (error) throw error;

      // Don't use getPublicUrl for private buckets
      // Just save the file path
      await supabase.from('player_documents').insert({
        player_id: playerId,
        document_type: documentType,
        file_path: fileName,
        file_url: fileName, // Store path, not URL
        uploaded_at: new Date().toISOString()
      });

      return fileName;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  async getPlayerDocuments(playerId) {
    const { data, error } = await supabase
      .from('player_documents')
      .select('*')
      .eq('player_id', playerId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getDocumentUrl(filePath) {
    const { data, error } = await supabase.storage
      .from('player-documents')
      .createSignedUrl(filePath, 3600); // URL valid for 1 hour

    if (error) throw error;
    return data.signedUrl;
  },

  async deleteDocument(documentId, filePath) {
    // Delete from storage
    await supabase.storage
      .from('player-documents')
      .remove([filePath]);

    // Delete from database
    await supabase
      .from('player_documents')
      .delete()
      .eq('id', documentId);
  },

  async getUpcomingBirthdays(daysAhead = 7) {
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('hide_player', false);

    if (error) throw error;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day

    const upcoming = players.filter(player => {
      if (!player.date_of_birth) return false; // Skip players without birthdate
      
      const [year, month, day] = player.date_of_birth.split('-');
      const birthDate = new Date(year, month - 1, day);
      const thisYearBirthday = new Date(
        today.getFullYear(),
        birthDate.getMonth(),
        birthDate.getDate()
      );
      thisYearBirthday.setHours(0, 0, 0, 0);

      const daysUntil = Math.round((thisYearBirthday - today) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= daysAhead;
    });

    return upcoming.map(player => {
      const [year, month, day] = player.date_of_birth.split('-');
      const birthDate = new Date(year, month - 1, day);
      const thisYearBirthday = new Date(
        today.getFullYear(),
        birthDate.getMonth(),
        birthDate.getDate()
      );
      thisYearBirthday.setHours(0, 0, 0, 0);

      return {
        ...player,
        daysUntilBirthday: Math.round((thisYearBirthday - today) / (1000 * 60 * 60 * 24))
      };
    });
  },

  async getUpcomingBirthdaysDirigentes(days = 7) {
    try {
      const { data, error } = await supabase
        .from('dirigentes')
        .select('id, name, date_of_birth')
        .not('date_of_birth', 'is', null);

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentYear = today.getFullYear();
      
      const upcoming = data
        .filter(dirigente => dirigente.date_of_birth) // Filter out null birthdates first
        .map(dirigente => {
          const [year, month, day] = dirigente.date_of_birth.split('-');
          const birthDate = new Date(year, month - 1, day);
          const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
          thisYearBirthday.setHours(0, 0, 0, 0);
          const nextYearBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
          nextYearBirthday.setHours(0, 0, 0, 0);
          
          let daysUntil;
          if (thisYearBirthday >= today) {
            daysUntil = Math.round((thisYearBirthday - today) / (1000 * 60 * 60 * 24));
          } else {
            daysUntil = Math.round((nextYearBirthday - today) / (1000 * 60 * 60 * 24));
          }
          
          return {
            ...dirigente,
            daysUntilBirthday: daysUntil
          };
        })
        .filter(dirigente => dirigente.daysUntilBirthday <= days)
        .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

      return upcoming;
    } catch (error) {
      console.error('Error fetching upcoming birthdays for dirigentes:', error);
      return [];
    }
  },

  //DIRIGENTES
  async getDirigentes() {
    try {
      const { data, error } = await supabase
        .from('dirigentes')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching dirigentes:', error);
      throw error;
    }
  },

  async addDirigente(dirigente) {
    try {
      const { data, error } = await supabase
        .from('dirigentes')
        .insert([dirigente])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error adding dirigente:', error);
      throw error;
    }
  },

  async updateDirigente(id, dirigente) {
    try {
      const { data, error } = await supabase
        .from('dirigentes')
        .update(dirigente)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error updating dirigente:', error);
      throw error;
    }
  },

  async deleteDirigente(id) {
    try {
      const { error } = await supabase
        .from('dirigentes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting dirigente:', error);
      throw error;
    }
  }
};