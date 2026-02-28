import { createClient } from '@supabase/supabase-js';

// Substitua pelos seus valores do Supabase no arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ykuamkulwzplutugcjzf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5UpwqCeS77ScOmW_ROuWiQ_td6d5hom';

if (!supabaseUrl && !supabaseAnonKey) {
  console.warn("Aviso: Usando credenciais padrão do Supabase.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
