import { supabase } from "../supabaseClient";

export const authService = {
  getSession() {
    return supabase.auth.getSession();
  },

  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  },

  signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  signOut() {
    return supabase.auth.signOut();
  }
};
