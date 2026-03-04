import { supabase } from '../supabaseClient';
import { CHANGE_REQUEST_STATUS } from './constants';
import { parseDOB, formatDate } from './dateUtils';

export const database = {
  // EMPLOYEES
  async getEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true });
    
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
    const trackedFields = ['contrato', 'viatico', 'complemento', 'vianda', 'casita'];
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

  // Check ficha médica via SND proxy Edge Function
  async checkFichaMedica(cedula) {
    const documento = String(cedula).replace(/\D/g, '');
    const { data, error } = await supabase.functions.invoke('check-ficha-medica', {
      body: { documento, idtipodocumento: 1 },
    });
    if (error) throw error;
    return data;
  },

  async saveFichaMedicaHasta(playerId, hastaStr) {
    // hastaStr is DD/MM/YYYY — convert to YYYY-MM-DD for PostgreSQL
    const [d, m, y] = hastaStr.split('/');
    const isoDate = `${y}-${m}-${d}`;
    const { error } = await supabase
      .from('players')
      .update({ ficha_medica_hasta: isoDate })
      .eq('id', playerId);
    if (error) throw error;
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

  async getUpcomingBirthdays(daysAhead = 7, categorias = null) {
    let query = supabase
      .from('players')
      .select('*')
      .eq('hide_player', false);

    if (categorias && categorias.length > 0) {
      query = query.in('categoria', categorias);
    }

    const { data: players, error } = await query;

    if (error) throw error;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day

    const upcoming = players.filter(player => {
      if (!player.date_of_birth) return false; // Skip players without birthdate
      
      const birthDate = parseDOB(player.date_of_birth);
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
      const birthDate = parseDOB(player.date_of_birth);
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
          const birthDate = parseDOB(dirigente.date_of_birth);
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
  },

  // TORNEOS
  // Update getTorneos to include funcionarios
  async getTorneos() {
    const { data, error } = await supabase
      .from('torneos')
      .select(`
        *,
        torneo_dirigentes(dirigente_id, dirigentes(id, name, rol, categoria)),
        torneo_players(player_id, players(id, name, categoria, posicion, gov_id, date_of_birth)),
        torneo_funcionarios(employee_id, employees(id, name, role, categoria))
      `)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Update addTorneo to include funcionarios
  async addTorneo(torneo, dirigenteIds, playerIds, employeeIds = []) {
    const { data: torneoData, error: torneoError } = await supabase
      .from('torneos')
      .insert([torneo])
      .select()
      .single();

    if (torneoError) throw torneoError;

    // Insert dirigentes
    if (dirigenteIds.length > 0) {
      const dirigenteRecords = dirigenteIds.map(id => ({
        torneo_id: torneoData.id,
        dirigente_id: id
      }));
      
      const { error: dirError } = await supabase
        .from('torneo_dirigentes')
        .insert(dirigenteRecords);
      
      if (dirError) throw dirError;
    }

    // Insert players
    if (playerIds.length > 0) {
      const playerRecords = playerIds.map(id => ({
        torneo_id: torneoData.id,
        player_id: id
      }));
      
      const { error: playerError } = await supabase
        .from('torneo_players')
        .insert(playerRecords);
      
      if (playerError) throw playerError;
    }

    // Insert funcionarios
    if (employeeIds.length > 0) {
      const employeeRecords = employeeIds.map(id => ({
        torneo_id: torneoData.id,
        employee_id: id
      }));
      
      const { error: empError } = await supabase
        .from('torneo_funcionarios')
        .insert(employeeRecords);
      
      if (empError) throw empError;
    }

    return torneoData;
  },

  // Update updateTorneo to include funcionarios
  async updateTorneo(id, torneo, dirigenteIds = [], playerIds = [], employeeIds = []) {
    // First, update the torneo basic info
    const { error: updateError } = await supabase
      .from('torneos')
      .update({
        name: torneo.name,
        country: torneo.country,
        city: torneo.city,
        categoria: torneo.categoria,
        start_date: torneo.start_date,
        end_date: torneo.end_date
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Delete existing relationships
    await supabase.from('torneo_dirigentes').delete().eq('torneo_id', id);
    await supabase.from('torneo_players').delete().eq('torneo_id', id);
    await supabase.from('torneo_funcionarios').delete().eq('torneo_id', id);

    // Insert new dirigentes relationships
    if (dirigenteIds.length > 0) {
      const dirigenteRecords = dirigenteIds.map(dirigente_id => ({
        torneo_id: id,
        dirigente_id
      }));
      const { error: dirError } = await supabase
        .from('torneo_dirigentes')
        .insert(dirigenteRecords);
      if (dirError) throw dirError;
    }

    // Insert new players relationships
    if (playerIds.length > 0) {
      const playerRecords = playerIds.map(player_id => ({
        torneo_id: id,
        player_id
      }));
      const { error: playError } = await supabase
        .from('torneo_players')
        .insert(playerRecords);
      if (playError) throw playError;
    }

    // Insert new funcionarios relationships
    if (employeeIds.length > 0) {
      const employeeRecords = employeeIds.map(employee_id => ({
        torneo_id: id,
        employee_id
      }));
      const { error: empError } = await supabase
        .from('torneo_funcionarios')
        .insert(employeeRecords);
      if (empError) throw empError;
    }
  },

  async deleteTorneo(id) {
    try {
      const { error } = await supabase
        .from('torneos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting torneo:', error);
      throw error;
    }
  },

  // Get all comisiones with their dirigentes
  async getComisiones() {
    const { data, error } = await supabase
      .from('comisiones')
      .select(`
        *,
        comision_dirigentes (
          dirigente_id,
          dirigentes (*)
        )
      `)
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Add a new comision
  async addComision(comision, dirigenteIds = []) {
    const { data: newComision, error: comisionError } = await supabase
      .from('comisiones')
      .insert([comision])
      .select()
      .single();

    if (comisionError) throw comisionError;

    if (dirigenteIds.length > 0) {
      const dirigenteRecords = dirigenteIds.map(dirigente_id => ({
        comision_id: newComision.id,
        dirigente_id
      }));
      const { error: dirError } = await supabase
        .from('comision_dirigentes')
        .insert(dirigenteRecords);
      if (dirError) throw dirError;
    }

    return newComision;
  },

  // Update comision
  async updateComision(id, comision, dirigenteIds = []) {
    const { error: updateError } = await supabase
      .from('comisiones')
      .update({
        name: comision.name,
        description: comision.description
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await supabase.from('comision_dirigentes').delete().eq('comision_id', id);

    if (dirigenteIds.length > 0) {
      const dirigenteRecords = dirigenteIds.map(dirigente_id => ({
        comision_id: id,
        dirigente_id
      }));
      const { error: dirError } = await supabase
        .from('comision_dirigentes')
        .insert(dirigenteRecords);
      if (dirError) throw dirError;
    }
  },

  // Delete comision
  async deleteComision(id) {
    const { error } = await supabase
      .from('comisiones')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async updatePlayerNameVisual(playerId, nameVisual) {
    const { error } = await supabase
      .from('players')
      .update({ name_visual: nameVisual })
      .eq('id', playerId);
    
    if (error) throw error;
  },

  // Create a change request
  async createPlayerChangeRequest(playerId, requestedBy, oldValues, newValues, notes = '') {
    const { data, error } = await supabase
      .from('player_change_requests')
      .insert([{
        player_id: playerId,
        requested_by: requestedBy,
        old_viatico: oldValues.viatico,
        old_complemento: oldValues.complemento,
        old_contrato: oldValues.contrato,
        new_viatico: newValues.viatico,
        new_complemento: newValues.complemento,
        new_contrato: newValues.contrato,
        request_notes: notes,
        status: CHANGE_REQUEST_STATUS.PENDING
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get pending change requests
  async getPendingChangeRequests() {
    const { data, error } = await supabase
      .from('player_change_requests')
      .select(`
        *,
        players (
          name,
          name_visual,
          categoria
        )
      `)
      .eq('status', CHANGE_REQUEST_STATUS.PENDING)
      .order('request_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get all change requests (for history)
  async getAllChangeRequests() {
    const { data, error } = await supabase
      .from('player_change_requests')
      .select(`
        *,
        players (
          name,
          name_visual,
          categoria
        )
      `)
      .order('request_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Approve change request
  async approveChangeRequest(requestId, reviewedBy, reviewNotes = '') {
    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('player_change_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Get current player data to append to comentario_viatico
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('comentario_viatico')
      .eq('id', request.player_id)
      .single();
    
    if (playerError) throw playerError;
    
    // Build updated comentario_viatico with the request notes
    let updatedComentario = player.comentario_viatico || '';
    if (request.request_notes && request.request_notes.trim()) {
      const reviewDate = formatDate(new Date().toISOString());
      
      // Add separator if there's existing content
      if (updatedComentario.trim()) {
        updatedComentario += '\n\n';
      }
      
      updatedComentario += `${reviewDate}:\n${request.request_notes}`;
    }
    
    // Update player with new values (this will track history)
    await this.updatePlayer(
      request.player_id,
      {
        viatico: request.new_viatico,
        complemento: request.new_complemento,
        contrato: request.new_contrato,
        comentario_viatico: updatedComentario
      },
      reviewedBy // Use the reviewer's email for history tracking
    );
    
    // Update request status
    const { error: statusError } = await supabase
      .from('player_change_requests')
      .update({
        status: CHANGE_REQUEST_STATUS.APPROVED,
        reviewed_by: reviewedBy,
        review_date: new Date().toISOString(),
        review_notes: reviewNotes
      })
      .eq('id', requestId);
    
    if (statusError) throw statusError;
  },

  // Reject change request
  async rejectChangeRequest(requestId, reviewedBy, reviewNotes = '') {
    const { error } = await supabase
      .from('player_change_requests')
      .update({
        status: CHANGE_REQUEST_STATUS.REJECTED,
        reviewed_by: reviewedBy,
        review_date: new Date().toISOString(),
        review_notes: reviewNotes
      })
      .eq('id', requestId);
    
    if (error) throw error;
  },

  // ============================================================
  // RIVALES
  // ============================================================

  async getRivales() {
    const { data, error } = await supabase
      .from('rivales')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data;
  },

  async addRival(rival) {
    const { data, error } = await supabase
      .from('rivales')
      .insert([rival])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addRivalesBulk(names) {
    const rows = names.map((name) => ({ name }));
    const { data, error } = await supabase
      .from('rivales')
      .insert(rows)
      .select();
    if (error) throw error;
    return data;
  },

  async updateRival(id, rival) {
    const { data, error } = await supabase
      .from('rivales')
      .update(rival)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteRival(id) {
    const { error } = await supabase
      .from('rivales')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ============================================================
  // APP SETTINGS
  // ============================================================

  async getAppSettings() {
    const { data, error } = await supabase.from('app_settings').select('*');
    if (error) throw error;
    // Convert array of { key, value } rows to a plain object
    return (data || []).reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  },

  async updateAppSetting(key, value) {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value: String(value) }, { onConflict: 'key' });
    if (error) throw error;
  },

  // ============================================================
  // JORNADAS + PARTIDOS
  // ============================================================

  async getJornadas() {
    const { data, error } = await supabase
      .from('jornadas')
      .select(`
        *,
        rivales(id, name),
        partidos(
          *,
          partido_players(
            id, player_id, tipo, posicion, orden,
            players(id, name, name_visual, categoria)
          ),
          partido_eventos(id, tipo, player_id, minuto)
        )
      `)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data;
  },

  /**
   * Crea una jornada y sus 5 partidos (uno por categoría) en batch.
   * @param {object} jornadaData  - { rival_id, fecha, fase }
   * @param {string} escenarioBase - 'Local' | 'Visitante'
   * Regla: 4ta/5ta/S16 → escenarioBase; 6ta/7ma → opuesto
   */
  async addJornada(jornadaData, escenarioBase) {
    const { data: jornada, error: jornadaError } = await supabase
      .from('jornadas')
      .insert([jornadaData])
      .select()
      .single();
    if (jornadaError) throw jornadaError;

    const CATEGORIAS_INVERTIDAS = ['6ta', '7ma'];
    const categorias = ['4ta', '5ta', 'S16', '6ta', '7ma'];
    const opuesto = escenarioBase === 'Local' ? 'Visitante' : 'Local';

    const partidos = categorias.map(categoria => {
      const escenario = CATEGORIAS_INVERTIDAS.includes(categoria) ? opuesto : escenarioBase;
      return {
        jornada_id: jornada.id,
        categoria,
        escenario,
        cesped: escenario === 'Local' ? 'Sintético' : 'Natural',
      };
    });

    const { error: partidosError } = await supabase
      .from('partidos')
      .insert(partidos);
    if (partidosError) throw partidosError;

    return jornada;
  },

  async updateJornada(id, jornadaData) {
    // jornadaData: { rival_id, fecha, fase, numero_jornada }
    // No tocamos el escenario de los partidos existentes
    const { error } = await supabase
      .from('jornadas')
      .update(jornadaData)
      .eq('id', id);
    if (error) throw error;
  },

  async deleteJornada(id) {
    // partidos y partido_players se eliminan en cascada por FK ON DELETE CASCADE
    const { error } = await supabase
      .from('jornadas')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Actualiza los datos de un partido individual, su planilla de jugadores y sus eventos.
   * @param {string} id - partido id
   * @param {object} partidoData - { escenario, cesped, goles_local, goles_visitante }
   * @param {Array}  titulares   - [{ player_id, posicion, orden }]  (max 11)
   * @param {Array}  suplentes   - [{ player_id, orden }]            (max 10)
   * @param {Array}  eventos     - [{ player_id, tipo }] tipo: 'gol' | 'amarilla' | 'roja'
   */
  async updatePartido(id, partidoData, titulares = [], suplentes = [], eventos = []) {
    // 1. Actualizar datos del partido
    const { error: updateError } = await supabase
      .from('partidos')
      .update(partidoData)
      .eq('id', id);
    if (updateError) throw updateError;

    // 2. Eliminar planilla existente (delete-then-reinsert)
    const { error: deleteError } = await supabase
      .from('partido_players')
      .delete()
      .eq('partido_id', id);
    if (deleteError) throw deleteError;

    // 3. Insertar titulares
    if (titulares.length > 0) {
      const titularRecords = titulares.map(t => ({
        partido_id: id,
        player_id: t.player_id,
        tipo: 'titular',
        posicion: t.posicion,
        orden: t.orden,
      }));
      const { error: titError } = await supabase
        .from('partido_players')
        .insert(titularRecords);
      if (titError) throw titError;
    }

    // 4. Insertar suplentes
    if (suplentes.length > 0) {
      const suplenteRecords = suplentes.map(s => ({
        partido_id: id,
        player_id: s.player_id,
        tipo: 'suplente',
        posicion: null,
        orden: s.orden,
      }));
      const { error: supError } = await supabase
        .from('partido_players')
        .insert(suplenteRecords);
      if (supError) throw supError;
    }

    // 5. Eliminar eventos existentes y reinsertar
    const { error: delEvError } = await supabase
      .from('partido_eventos')
      .delete()
      .eq('partido_id', id);
    if (delEvError) throw delEvError;

    if (eventos.length > 0) {
      const evRecords = eventos.map(e => ({
        partido_id: id,
        player_id: e.player_id,
        tipo: e.tipo,
        minuto: e.minuto ?? null,
      }));
      const { error: evError } = await supabase
        .from('partido_eventos')
        .insert(evRecords);
      if (evError) throw evError;
    }
  },
};