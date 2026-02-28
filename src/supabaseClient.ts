import { createClient } from '@supabase/supabase-js';

// Substitua pelos seus valores do Supabase no arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hdywcvioscafcymwpdnf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MjUWT49OuHcBgw_Y1-rP9w_kL--FxFh';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERRO: Credenciais do Supabase não configuradas! Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
