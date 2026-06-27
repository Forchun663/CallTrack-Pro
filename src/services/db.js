import { supabase } from "../supabaseClient";
import { mapToState } from "../utils/helpers";

export const dbService = {
  async getLeads() {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapToState);
  },

  async getLeadById(id) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return mapToState(data);
  },

  async insertLead(row) {
    const { data, error } = await supabase
      .from("leads")
      .insert([row])
      .select();
    if (error) throw error;
    return mapToState(data[0]);
  },

  async insertLeadsBulk(rows) {
    const { data, error } = await supabase
      .from("leads")
      .insert(rows)
      .select();
    if (error) throw error;
    return (data || []).map(mapToState);
  },

  async updateLead(id, row) {
    const { error } = await supabase
      .from("leads")
      .update(row)
      .eq("id", id);
    if (error) throw error;
    return this.getLeadById(id);
  },

  async deleteLead(id) {
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return id;
  },

  async deleteLeadsBulk(ids) {
    const { error } = await supabase
      .from("leads")
      .delete()
      .in("id", ids);
    if (error) throw error;
    return ids;
  },

  async wipeDatabase() {
    const { error } = await supabase
      .from("leads")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw error;
  },

  async logActivity(leadId, userId, type, result, notes) {
    const { error } = await supabase
      .from("lead_activities")
      .insert([{
        lead_id: leadId,
        user_id: userId,
        activity_type: type,
        result: result,
        notes: notes,
      }]);
    if (error) throw error;
  },

  subscribeToLeads(onInsert, onUpdate, onDelete) {
    const channel = supabase
      .channel("shared_leads_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          onInsert(mapToState(payload.new));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          onUpdate(mapToState(payload.new));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "leads" },
        (payload) => {
          onDelete(payload.old.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
