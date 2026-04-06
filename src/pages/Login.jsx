import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import '../styles/global.css';

export default function Login({ onLoginSuccess }) {
  const [view, setView] = useState('login'); // 'login', 'signup', 'recovery'
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) setMessage({ type: 'error', text: error.message });
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const isEmail = identifier.includes('@');
      let loginEmail = identifier;

      if (view === 'signup') {
        if (!isEmail) throw new Error("Para cadastrar, use um e-mail válido.");
        
        const { error } = await supabase.auth.signUp({ email: identifier, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Conta criada! Você já pode entrar.' });
        setTimeout(() => setView('login'), 2000);

      } else if (view === 'login') {
        
        // Login por Nome de Usuário (Respeitando letras maiúsculas/minúsculas)
        if (!isEmail) {
          const cleanUsername = identifier.trim().replace('@', ''); 
          
          const { data, error: rpcError } = await supabase.rpc('get_email_by_username', { p_username: cleanUsername });
          
          if (rpcError || !data) {
             throw new Error("Usuário não encontrado.");
          }
          loginEmail = data; 
        }

        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw new Error("Senha incorreta ou erro no login.");

      } else {
        if (!isEmail) throw new Error("Precisamos do seu e-mail para enviar o link.");
        const { error } = await supabase.auth.resetPasswordForEmail(identifier);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Instruções enviadas para o seu e-mail!' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-body text-on-surface bg-surface min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Elementos Decorativos de Fundo (Estáticos conforme pedido) */}
      <div className="absolute top-10 left-10 opacity-[0.07] transform -rotate-12 pointer-events-none">
        <span className="material-symbols-outlined text-[120px] text-tertiary">sports_esports</span>
      </div>
      <div className="absolute -bottom-10 left-20 opacity-[0.06] transform rotate-12 pointer-events-none">
        <span className="material-symbols-outlined text-[160px] text-tertiary">local_bar</span>
      </div>
      <div className="absolute top-20 right-10 opacity-[0.08] transform rotate-45 pointer-events-none">
        <span className="material-symbols-outlined text-[100px] text-tertiary">restaurant</span>
      </div>
      <div className="absolute bottom-20 right-20 opacity-[0.05] transform -rotate-12 pointer-events-none">
        <span className="material-symbols-outlined text-[140px] text-tertiary">camping</span>
      </div>

      <main className="relative w-full max-w-md z-10">
        <div className="bg-surface-container-highest rounded-[2rem] p-10 shadow-2xl shadow-[#1e1b13]/10 relative overflow-hidden border border-outline-variant/10">
          
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            
            <div className="mb-6 text-center">
              <div className="w-16 h-16 bg-primary-fixed rounded-full flex items-center justify-center mb-4 mx-auto shadow-inner transform transition-transform hover:scale-105 duration-300">
                <span className="material-symbols-outlined text-primary text-3xl">calendar_today</span>
              </div>
              <h1 className="font-headline text-3xl font-black text-on-tertiary-fixed-variant tracking-tight mb-1">
                Marcaí
              </h1>
              <p className="text-tertiary font-medium text-xs">
                Sua agenda de rolês, encontros e eventos.
              </p>
            </div>

            {message.text && (
              <div className={`w-full text-xs font-bold p-3 rounded-xl mb-6 flex items-center gap-2 animate-fade-in border ${
                message.type === 'error' ? 'bg-error-container text-on-error-container border-error/20' : 'bg-primary-container text-on-primary-container border-primary/20'
              }`}>
                <span className="material-symbols-outlined text-base shrink-0">{message.type === 'error' ? 'warning' : 'check_circle'}</span>
                <span>{message.text}</span>
              </div>
            )}

            <div key={view} className="w-full animate-fade-in" style={{ animationDuration: '0.4s' }}>
              <form onSubmit={handleEmailAuth} className="w-full space-y-4">
                
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-on-surface-variant ml-2 uppercase tracking-widest">
                    {view === 'login' ? 'E-mail ou Usuário' : 'E-mail'}
                  </label>
                  <div className="relative">
                    <input 
                      className="w-full bg-surface-variant border border-transparent rounded-xl px-12 py-3.5 focus:border-primary-container focus:bg-surface-container-lowest transition-all duration-300 outline-none text-on-surface text-sm font-medium placeholder:text-tertiary/40" 
                      type="text" 
                      placeholder={view === 'login' ? "Digite seu e-mail ou nome" : "Seu melhor e-mail"}
                      required 
                      value={identifier} 
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-tertiary/50 text-[20px]">person</span>
                  </div>
                </div>

                {view !== 'recovery' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-2">
                      <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Senha</label>
                      {view === 'login' && (
                        <button type="button" onClick={() => { setView('recovery'); setMessage({type:'', text:''}); }} className="text-[9px] font-bold text-tertiary hover:text-secondary transition-colors">
                          Esqueceu?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input 
                        className="w-full bg-surface-variant border border-transparent rounded-xl px-12 py-3.5 focus:border-primary-container focus:bg-surface-container-lowest transition-all duration-300 outline-none text-on-surface text-sm font-medium placeholder:text-tertiary/40" 
                        type="password" 
                        placeholder="••••••••"
                        required 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-tertiary/50 text-[20px]">lock</span>
                    </div>
                  </div>
                )}

                <button 
                  disabled={loading} 
                  className="w-full bg-secondary hover:bg-secondary-container text-on-secondary font-headline font-bold py-4 rounded-[14px] transition-all duration-300 transform active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? 'Carregando...' : view === 'login' ? 'Entrar no Marcaí' : view === 'signup' ? 'Criar Conta' : 'Enviar Link'}
                  {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
                </button>
              </form>
            </div>

            <div className="w-full flex items-center gap-3 my-6 opacity-60">
              <div className="flex-1 h-px bg-outline-variant/50"></div>
              <span className="text-[9px] font-black text-tertiary uppercase tracking-widest">Ou</span>
              <div className="flex-1 h-px bg-outline-variant/50"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin} 
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface text-sm font-bold py-3.5 rounded-[14px] flex items-center justify-center gap-3 hover:bg-surface-variant hover:border-outline-variant/50 transition-all duration-300 group"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 group-hover:scale-110 transition-transform" alt="Google" />
              Continuar com Google
            </button>

            <div className="mt-6 flex flex-col items-center">
              <button 
                type="button"
                onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setMessage({type:'', text:''}); setIdentifier(''); setPassword(''); }} 
                className="text-[11px] font-bold text-primary hover:text-secondary transition-colors"
              >
                {view === 'login' ? 'Primeira vez aqui? Crie sua conta' : 'Já tem sua chave? Faça login'}
              </button>
            </div>

          </div>
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary-container/20 rounded-full blur-3xl"></div>
        </div>
      </main>
    </div>
  );
}