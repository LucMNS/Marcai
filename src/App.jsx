import React, { useEffect, useState } from 'react';
import { supabase } from './utils/supabaseClient';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsernameSetup from './pages/UsernameSetup'; // Você precisará criar esta tela simples

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pega sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Ouve mudanças (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (id) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    setProfile(data);
    setLoading(false);
  };

  if (loading) return <div className="bg-surface h-screen flex items-center justify-center text-primary font-bold">Carregando agenda...</div>;

  if (!session) return <Login />;
  
  // Se logou mas não escolheu username único ainda
  if (!profile) return <UsernameSetup onComplete={() => fetchProfile(session.user.id)} />;

  return <Dashboard userName={profile.username} onLogout={() => supabase.auth.signOut()} />;
}