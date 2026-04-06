import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import '../styles/global.css';

export default function UsernameSetup({ onComplete }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanUsername = username.trim();

    if (cleanUsername.length < 3) {
      setError('O nome precisa ter pelo menos 3 letras.');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: dbError } = await supabase
        .from('profiles')
        .insert([{ id: user.id, username: cleanUsername }]);

      if (dbError) {
        if (dbError.code === '23505') {
          setError('Putz, alguém já pegou esse nome! Tente outro.');
        } else {
          setError('Erro ao salvar: ' + dbError.message);
        }
      } else {
        onComplete();
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-body text-on-surface bg-surface min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <main className="relative w-full max-w-md z-10">
        
        <div className="bg-surface-container-highest rounded-[2rem] p-8 shadow-xl shadow-[#1e1b13]/5 relative overflow-hidden border border-outline-variant/10">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-6 text-center">
              <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mb-4 mx-auto shadow-inner">
                <span className="material-symbols-outlined text-on-primary-container text-3xl">badge</span>
              </div>
              <h1 className="font-headline text-2xl font-black text-on-tertiary-fixed-variant tracking-tight">
                Quase lá!
              </h1>
              <p className="text-tertiary font-medium text-sm mt-2">
                Como a galera deve te chamar? Esse nome será único seu.
              </p>
            </div>

            {error && (
              <div className="w-full bg-error-container text-on-error-container text-xs font-bold p-3 rounded-xl mb-4 flex items-center gap-2 animate-fade-in border border-error/20">
                <span className="material-symbols-outlined text-base shrink-0">warning</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant ml-1">Nome de Usuário</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-tertiary/50">@</span>
                  <input 
                    className="w-full bg-surface-variant rounded-xl pl-8 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-primary-container transition-all font-bold text-on-surface" 
                    type="text" 
                    required 
                    value={username} 
                    onChange={(e) => {
                      // Removido o toLowerCase()! Agora aceita maiúsculas normalmente.
                      setUsername(e.target.value.replace(/\s+/g, '')); 
                      setError('');
                    }}
                  />
                </div>
              </div>

              <button 
                disabled={loading} 
                className="w-full bg-secondary text-on-secondary font-headline font-bold py-4 rounded-[14px] shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Verificando...' : 'Confirmar e Entrar'}
                {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}