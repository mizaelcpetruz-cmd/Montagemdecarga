import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env.js';

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_KEY) {
  console.error('❌ ERRO CRÍTICO: SUPABASE_URL ou SUPABASE_KEY não configurados no backend/.env');
}

export const supabase: SupabaseClient = createClient(
  ENV.SUPABASE_URL || 'https://placeholder.supabase.co',
  ENV.SUPABASE_KEY || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  provider: 'supabase';
  message: string;
}> {
  try {
    const { error } = await supabase.from('branches').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        provider: 'supabase',
        message: `Falha na consulta ao Supabase: ${error.message}. Verifique as permissões de RLS no painel.`,
      };
    }
    return {
      connected: true,
      provider: 'supabase',
      message: 'Conexão 100% ativa com Supabase PostgreSQL Cloud.',
    };
  } catch (err: any) {
    return {
      connected: false,
      provider: 'supabase',
      message: `Erro de rede ao conectar no Supabase: ${err.message}`,
    };
  }
}
