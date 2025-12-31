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
      .order('created_at', { ascending: false });
    
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

  async updatePlayer(id, player) {
    const { data, error } = await supabase
      .from('players')
      .update(player)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async deletePlayer(id) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
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
  }
};