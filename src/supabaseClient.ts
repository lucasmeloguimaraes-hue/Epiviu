import { createClient } from '@supabase/supabase-js';

// Substitua pelos seus valores do Supabase no arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hdywcvioscafcymwpdnf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXdjdmlvc2NhZmN5bXdwZG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMzc3MjYsImV4cCI6MjA4NzgxMzcyNn0.Iq80Wxv0cTivNs22UsOv8-DdXJXRx1lK9aqDlA5q9NY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERRO: Credenciais do Supabase não configuradas! Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente.");
} else {
  console.log("Conectando ao Supabase em:", supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
