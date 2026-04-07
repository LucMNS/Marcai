import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import '../styles/global.css';

const TIME_OPTIONS = [];
for (let i = 0; i < 24; i++) {
  for (let j = 0; j < 60; j += 30) {
    const h = i.toString().padStart(2, '0');
    const m = j.toString().padStart(2, '0');
    TIME_OPTIONS.push(`${h}:${m}`);
  }
}

const baseNames = [
  "Felix", "Aneka", "Jude", "Missy", "Leo", "Mia", "Sam", "Zoe", 
  "Max", "Nia", "Eli", "Ivy", "Rex", "Ava", "Ian", "Uma", 
  "Roy", "Joy", "Ted", "Fay", "Mac", "Rae", "Abe", "Liz",
  "Kai", "Lia", "Bob", "Ann", "Tom", "Eva", "Jay", "Ryu",
  "Ali", "Ray", "Kim", "Ron", "Amy", "Jon", "Dan", "Pam",
  "Hal", "Cal", "Sal", "Mel", "Lou", "Stu", "Ben", "Jan",
  "Ken", "Len", "Ned", "Pat", "Vic", "Zac", "Gus", "Dex"
];

const AVATAR_OPTIONS = [];
baseNames.forEach(name => {
  AVATAR_OPTIONS.push(`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`); 
  AVATAR_OPTIONS.push(`https://api.dicebear.com/7.x/bottts/svg?seed=${name}`); 
  AVATAR_OPTIONS.push(`https://api.dicebear.com/7.x/pixel-art/svg?seed=${name}`); 
  AVATAR_OPTIONS.push(`https://robohash.org/${name}?set=set4`);
  AVATAR_OPTIONS.push(`https://robohash.org/${name}?set=set2`);
});

const getAvatarUrl = (seed) => {
  if (!seed) return `https://api.dicebear.com/7.x/avataaars/svg?seed=default`;
  if (seed.startsWith('http')) return seed;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

const GROUP_COLORS = ['bg-primary', 'bg-[#4CAF50]', 'bg-[#FF9800]', 'bg-[#E91E63]', 'bg-[#9C27B0]', 'bg-[#00BCD4]'];

export default function Dashboard({ userName, onLogout }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState({});
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const [userId, setUserId] = useState(null);
  const [userAvatar, setUserAvatar] = useState(userName);
  const [myGroups, setMyGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  
  const [activeTab, setActiveTab] = useState('calendar');
  const [groupMembers, setGroupMembers] = useState([]);
  const [bannedMembers, setBannedMembers] = useState([]);
  const [myGroupSettings, setMyGroupSettings] = useState({ hide_availability: false });
  const [groupMatches, setGroupMatches] = useState({});

  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [dialog, setDialog] = useState({ 
    isOpen: false, type: 'alert', title: '', message: '', 
    confirmText: 'OK', cancelText: 'Cancelar', isDestructive: false, onConfirm: null 
  });

  const openDialog = (options) => setDialog({ isOpen: true, confirmText: 'OK', cancelText: 'Cancelar', isDestructive: false, onConfirm: null, ...options });
  const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));

  const [newGroupName, setNewGroupName] = useState('');
  const [isPrivateGroup, setIsPrivateGroup] = useState(false);
  const [groupPassword, setGroupPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedGroupToJoin, setSelectedGroupToJoin] = useState(null);
  const [joinPasswordInput, setJoinPasswordInput] = useState('');

  const pad = (n) => n.toString().padStart(2, '0');
  const actualToday = new Date();
  const todayStr = `${actualToday.getFullYear()}-${pad(actualToday.getMonth())}-${pad(actualToday.getDate())}`;

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchGroups(user.id);
        
        const { data: profileData } = await supabase.from('profiles').select('avatar_seed').eq('id', user.id).single();
        if (profileData && profileData.avatar_seed) {
          setUserAvatar(profileData.avatar_seed);
        }
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (activeGroup && userId) {
      setActiveTab('calendar');
      fetchAvailabilities(activeGroup.id, userId);
      fetchGroupMatches(activeGroup.id);
      
      supabase.from('group_members')
        .select('hide_availability')
        .eq('group_id', activeGroup.id)
        .eq('user_id', userId)
        .single()
        .then(({ data }) => {
          if (data) setMyGroupSettings({ hide_availability: data.hide_availability });
        });
    } else {
      setSelectedDates({});
      setGroupMatches({});
    }
  }, [activeGroup, userId]);

  useEffect(() => {
    if (activeTab === 'members' && activeGroup) {
      fetchMembersAndAvailabilities();
    }
    if (activeTab === 'settings' && activeGroup && activeGroup.created_by === userId) {
      fetchBannedMembers();
    }
  }, [activeTab, activeGroup]);

  const fetchGroups = async (uid) => {
    const { data } = await supabase.from('group_members').select('group_id, groups (id, name, is_private, created_by)').eq('user_id', uid);
    if (data) {
      const formattedGroups = data.map((item, index) => {
        const g = item.groups;
        const initials = g.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const color = GROUP_COLORS[index % GROUP_COLORS.length];
        return { id: g.id, name: g.name, is_private: g.is_private, created_by: g.created_by, initials, color };
      });
      setMyGroups(formattedGroups);
      if (formattedGroups.length > 0) {
        if (!activeGroup || !formattedGroups.find(g => g.id === activeGroup.id)) {
          setActiveGroup(formattedGroups[0]);
        }
      } else {
        setActiveGroup(null);
      }
    }
  };

  const fetchAvailabilities = async (groupId, uid) => {
    const { data } = await supabase.from('availabilities').select('*').eq('group_id', groupId).eq('user_id', uid);
    if (data) {
      const datesObj = {};
      data.forEach(d => { datesObj[d.date_key] = { allDay: d.all_day, start: d.start_time, end: d.end_time }; });
      setSelectedDates(datesObj);
    }
  };

  const fetchGroupMatches = async (groupId) => {
    const { count: totalMembers } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', groupId);
    const { data: allAvails } = await supabase.from('availabilities').select('date_key').eq('group_id', groupId);

    if (allAvails) {
      const dateCounts = {};
      allAvails.forEach(a => { dateCounts[a.date_key] = (dateCounts[a.date_key] || 0) + 1; });
      const matches = {};
      const members = totalMembers || 1;

      Object.keys(dateCounts).forEach(date => {
        const count = dateCounts[date];
        const percentage = count / members;
        
        if (percentage >= 0.75) {
          matches[date] = { count, type: 'perfect' }; 
        } 
        else if (count >= 5) {
          matches[date] = { count, type: 'potential' }; 
        } 
        else if (members >= 3 && count >= Math.ceil(members / 2)) {
          matches[date] = { count, type: 'good' }; 
        }
      });
      setGroupMatches(matches);
    }
  };

  const fetchMembersAndAvailabilities = async () => {
    const { data: membersData } = await supabase.from('group_members').select('user_id, role, hide_availability, profiles(username, avatar_seed)').eq('group_id', activeGroup.id);
    const { data: availData } = await supabase.from('availabilities').select('user_id, date_key').eq('group_id', activeGroup.id);

    if (membersData) {
      const formatted = membersData.map(m => {
        const userAvails = availData?.filter(a => a.user_id === m.user_id) || [];
        return {
          user_id: m.user_id, role: m.role, hide_availability: m.hide_availability,
          username: m.profiles?.username || 'Usuário', 
          avatar_seed: m.profiles?.avatar_seed || m.profiles?.username,
          availCount: userAvails.length
        };
      });
      formatted.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.username.localeCompare(b.username);
      });
      setGroupMembers(formatted);
    }
  };

  const fetchBannedMembers = async () => {
    const { data } = await supabase.from('group_bans').select('user_id, profiles(username)').eq('group_id', activeGroup.id);
    if (data) setBannedMembers(data.map(b => ({ user_id: b.user_id, username: b.profiles?.username })));
  };

  const togglePrivacy = async () => {
    const newVal = !myGroupSettings.hide_availability;
    setMyGroupSettings({ hide_availability: newVal });
    setGroupMembers(prev => prev.map(m => m.user_id === userId ? { ...m, hide_availability: newVal } : m));
    await supabase.from('group_members').update({ hide_availability: newVal }).match({ group_id: activeGroup.id, user_id: userId });
  };

  const handleUpdateAvatar = async (seed) => {
    setUserAvatar(seed);
    await supabase.from('profiles').update({ avatar_seed: seed }).eq('id', userId);
    if (activeGroup && activeTab === 'members') {
      fetchMembersAndAvailabilities(); 
    }
  };

  const handleKickMember = (memberId, memberName) => {
    openDialog({
      type: 'confirm', title: 'Expulsar Membro', message: `Tem certeza que deseja expulsar @${memberName} do grupo? Ele poderá entrar novamente depois.`,
      isDestructive: true, confirmText: 'Expulsar',
      onConfirm: async () => {
        await supabase.from('group_members').delete().match({ group_id: activeGroup.id, user_id: memberId });
        await supabase.from('availabilities').delete().match({ group_id: activeGroup.id, user_id: memberId });
        fetchMembersAndAvailabilities(); fetchGroupMatches(activeGroup.id); closeDialog();
      }
    });
  };

  const handleBanMember = (memberId, memberName) => {
    openDialog({
      type: 'confirm', title: 'Banir Membro', message: `Tem certeza que deseja BANIR @${memberName}? Ele será bloqueado e não poderá mais entrar neste grupo.`,
      isDestructive: true, confirmText: 'Banir',
      onConfirm: async () => {
        await supabase.from('group_bans').insert([{ group_id: activeGroup.id, user_id: memberId }]);
        await supabase.from('group_members').delete().match({ group_id: activeGroup.id, user_id: memberId });
        await supabase.from('availabilities').delete().match({ group_id: activeGroup.id, user_id: memberId });
        fetchMembersAndAvailabilities(); fetchGroupMatches(activeGroup.id); closeDialog();
      }
    });
  };

  const handleUnbanMember = async (memberId) => {
    await supabase.from('group_bans').delete().match({ group_id: activeGroup.id, user_id: memberId });
    fetchBannedMembers();
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !userId) return;
    setIsCreating(true);

    try {
      const { data: groupData, error: groupErr } = await supabase.from('groups').insert([{ name: newGroupName, is_private: isPrivateGroup, join_password: groupPassword, created_by: userId }]).select().single();
      if (groupErr) throw groupErr;

      await supabase.from('group_members').insert([{ group_id: groupData.id, user_id: userId, role: 'admin' }]);

      await fetchGroups(userId);
      setShowCreateModal(false); setNewGroupName(''); setGroupPassword(''); setIsPrivateGroup(false);
      
      const initials = groupData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      setActiveGroup({ id: groupData.id, name: groupData.name, created_by: userId, initials, color: GROUP_COLORS[myGroups.length % GROUP_COLORS.length] });
    } catch (err) {
      openDialog({ title: 'Ops!', message: 'Erro ao criar o grupo. Tente novamente.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = () => {
    if (!activeGroup) return;
    openDialog({
      type: 'confirm', title: 'Apagar Grupo', message: `Tem certeza que deseja apagar o grupo "${activeGroup.name}" definitivamente? Essa ação não tem volta.`,
      isDestructive: true, confirmText: 'Apagar Grupo',
      onConfirm: async () => {
        try {
          await supabase.from('groups').delete().eq('id', activeGroup.id);
          setActiveGroup(null); fetchGroups(userId); closeDialog();
        } catch (error) {
          openDialog({ title: 'Erro', message: 'Houve um problema ao tentar apagar o grupo.' });
        }
      }
    });
  };

  const handleDeleteAccount = () => {
    openDialog({
      type: 'confirm', title: 'Apagar Minha Conta', message: 'Tem certeza absoluta? Você perderá o acesso, seus grupos serão apagados e suas marcações destruídas. Esta ação é irreversível.',
      isDestructive: true, confirmText: 'Sim, Apagar Tudo',
      onConfirm: async () => {
        try {
          const { error } = await supabase.rpc('delete_user');
          if (error) throw error;
          closeDialog(); onLogout();
        } catch (error) {
          openDialog({ title: 'Erro', message: 'Houve um problema ao apagar sua conta. Tente novamente mais tarde.' });
        }
      }
    });
  };

  const handleSearchGroups = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    
    try {
      const { data: groupsData, error: groupsErr } = await supabase.from('groups').select('id, name, is_private, created_by').ilike('name', `%${searchQuery.trim()}%`);
      if (groupsErr) throw groupsErr;

      if (groupsData && groupsData.length > 0) {
        const creatorIds = [...new Set(groupsData.map(g => g.created_by))];
        const { data: profilesData } = await supabase.from('profiles').select('id, username').in('id', creatorIds);

        const profilesMap = {};
        if (profilesData) {
          profilesData.forEach(p => { profilesMap[p.id] = p.username; });
        }
        const resultsWithUsernames = groupsData.map(group => ({
          ...group, profiles: { username: profilesMap[group.created_by] || 'desconhecido' }
        }));
        setSearchResults(resultsWithUsernames);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!selectedGroupToJoin || !userId) return;

    try {
      const { data: isBanned } = await supabase.from('group_bans').select('user_id').eq('group_id', selectedGroupToJoin.id).eq('user_id', userId).single();
      if (isBanned) {
        openDialog({ title: 'Acesso Negado', message: 'Você foi banido deste grupo e não pode mais entrar.', isDestructive: true });
        resetJoinModal(); return;
      }

      if (selectedGroupToJoin.is_private) {
        const { data } = await supabase.from('groups').select('id').eq('id', selectedGroupToJoin.id).eq('join_password', joinPasswordInput).single();
        if (!data) {
          openDialog({ title: 'Senha Incorreta', message: 'A senha que você digitou está errada. Tente novamente.' });
          return;
        }
      }

      const { data: existing } = await supabase.from('group_members').select('group_id').eq('group_id', selectedGroupToJoin.id).eq('user_id', userId).single();
      if (existing) {
        openDialog({ title: 'Aviso', message: 'Você já faz parte deste grupo!' });
        resetJoinModal(); return;
      }

      await supabase.from('group_members').insert([{ group_id: selectedGroupToJoin.id, user_id: userId, role: 'member' }]);
      await fetchGroups(userId); resetJoinModal();
    } catch (error) {
      openDialog({ title: 'Erro', message: 'Houve um problema ao tentar entrar no grupo.' });
    }
  };

  const resetJoinModal = () => {
    setShowJoinModal(false); setSelectedGroupToJoin(null); setSearchQuery(''); setSearchResults([]); setJoinPasswordInput('');
  };

  const toggleDate = async (dateKey) => {
    if (!activeGroup || !userId || dateKey < todayStr) return;
    const isSelected = !!selectedDates[dateKey];
    const newState = { ...selectedDates };

    if (isSelected) {
      delete newState[dateKey]; setSelectedDates(newState);
      await supabase.from('availabilities').delete().match({ group_id: activeGroup.id, user_id: userId, date_key: dateKey });
    } else {
      newState[dateKey] = { allDay: true, start: '18:00', end: '22:00' }; setSelectedDates(newState);
      await supabase.from('availabilities').insert([{ group_id: activeGroup.id, user_id: userId, date_key: dateKey, all_day: true, start_time: '18:00', end_time: '22:00' }]);
    }
    await fetchGroupMatches(activeGroup.id);
  };

  const updateTimePref = async (dateKey, field, value) => {
    if (!activeGroup || !userId) return;
    setSelectedDates(prev => ({ ...prev, [dateKey]: { ...prev[dateKey], [field]: value } }));
    const current = selectedDates[dateKey];
    const updatePayload = {
      all_day: field === 'allDay' ? value : current.allDay, start_time: field === 'start' ? value : current.start, end_time: field === 'end' ? value : current.end
    };
    await supabase.from('availabilities').update(updatePayload).match({ group_id: activeGroup.id, user_id: userId, date_key: dateKey });
  };

  const handleBulkSelect = async (action) => {
    if (!activeGroup || !userId) return;

    if (action === 'clear') {
       const newSelections = { ...selectedDates };
       const datesToDelete = [];

       Object.keys(newSelections).forEach(dateKey => {
         const [y, m] = dateKey.split('-');
         if (parseInt(y, 10) === year && parseInt(m, 10) === month) {
           datesToDelete.push(dateKey); delete newSelections[dateKey]; 
         }
       });

       if (datesToDelete.length > 0) {
         setSelectedDates(newSelections); 
         await supabase.from('availabilities').delete().match({ group_id: activeGroup.id, user_id: userId }).in('date_key', datesToDelete); 
         await fetchGroupMatches(activeGroup.id);
       }
       return;
    }

    const newSelections = { ...selectedDates };
    const toInsert = [];

    currentMonthDays.forEach(day => {
      const dateObj = new Date(year, month, day);
      const dayOfWeek = dateObj.getDay(); 
      const dateKey = `${year}-${pad(month)}-${pad(day)}`;

      let shouldSelect = false;
      if (action === 'all') shouldSelect = true;
      if (action === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) shouldSelect = true;
      if (action === 'weekends' && (dayOfWeek === 0 || dayOfWeek === 6)) shouldSelect = true;

      if (shouldSelect && dateKey >= todayStr && !newSelections[dateKey]) {
        newSelections[dateKey] = { allDay: true, start: '18:00', end: '22:00' };
        toInsert.push({ group_id: activeGroup.id, user_id: userId, date_key: dateKey, all_day: true, start_time: '18:00', end_time: '22:00' });
      }
    });

    if (toInsert.length > 0) {
      setSelectedDates(newSelections);
      await supabase.from('availabilities').insert(toInsert);
      await fetchGroupMatches(activeGroup.id);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const currentMonthName = monthNames[month];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => daysInPrevMonth - firstDayOfMonth + i + 1);
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalCells = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDaysCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const nextMonthDays = Array.from({ length: nextMonthDaysCount }, (_, i) => i + 1);
  
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const sortedSelectedKeys = Object.keys(selectedDates).sort();
  const upcomingSelectedKeys = sortedSelectedKeys.filter(key => key >= todayStr);

  return (
    <div className="text-on-surface font-body bg-surface h-screen overflow-hidden flex relative transition-colors duration-300">
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <nav className={`absolute md:relative w-16 h-full bg-[#1A1814] flex flex-col items-center py-4 gap-3 z-[70] shrink-0 shadow-2xl transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="group relative flex items-center justify-center cursor-pointer">
          <div className={`absolute left-0 w-1 bg-surface rounded-r-full transition-all duration-300 ${!activeGroup ? 'h-8' : 'h-0 opacity-0 group-hover:h-4 opacity-50'}`}></div>
          <div 
            onClick={() => setActiveGroup(null)}
            className={`w-12 h-12 flex items-center justify-center transition-all duration-300 ${!activeGroup ? 'bg-primary text-on-primary rounded-[12px]' : 'bg-surface-variant/10 text-surface-variant hover:bg-primary/80 hover:text-on-primary hover:rounded-[12px] rounded-[16px]'}`}
          >
            <span className="material-symbols-outlined text-[22px]">home</span>
          </div>
        </div>
        <div className="w-8 h-px bg-white/10 my-1 rounded-full"></div>

        <div className="flex-1 w-full flex flex-col items-center gap-3 overflow-y-auto scrollbar-none">
          {myGroups.map(group => {
            const isActive = activeGroup?.id === group.id;
            return (
              <div key={group.id} className="group relative flex items-center justify-center cursor-pointer w-full" title={group.name}>
                <div className={`absolute left-0 w-1 bg-surface rounded-r-full transition-all duration-300 ${isActive ? 'h-8' : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-50'}`}></div>
                <div 
                  onClick={() => setActiveGroup(group)}
                  className={`w-12 h-12 flex items-center justify-center font-headline font-black text-lg transition-all duration-300 shadow-md ${isActive ? `${group.color} text-white rounded-[12px]` : 'bg-surface-variant/10 text-surface-variant hover:bg-surface-variant/30 hover:rounded-[12px] rounded-[24px]'}`}
                >
                  {group.initials}
                </div>
              </div>
            );
          })}

          <div className="group relative flex items-center justify-center cursor-pointer mt-2">
            <button 
              onClick={() => setShowChoiceModal(true)} 
              className="w-12 h-12 rounded-[24px] bg-transparent border border-dashed border-white/20 text-white/40 flex items-center justify-center transition-all duration-300 hover:border-secondary hover:text-secondary hover:rounded-[12px] hover:bg-secondary/10"
              title="Adicionar Servidor"
            >
              <span className="material-symbols-outlined text-[24px]">add</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 relative flex h-full min-w-0">
        
        <nav className="absolute top-0 w-full z-50 flex justify-between items-center px-6 py-2 bg-[#1A1814] border-b border-black/20 shadow-sm h-14 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-[#e9e2d3] hover:text-primary transition-colors p-1 -ml-3">
              <span className="material-symbols-outlined text-[26px]">menu</span>
            </button>
            <div className="w-7 h-7 bg-primary-fixed rounded-full flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-primary text-xs">celebration</span>
            </div>
            <span className="text-xl font-black text-[#e9e2d3] font-headline tracking-tight">
              {activeGroup ? activeGroup.name : 'Marcaí'}
            </span>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 hover:bg-white/5 p-1.5 pr-2 rounded-full transition-colors focus:outline-none"
            >
              <span className="text-xs font-bold text-[#e9e2d3]/70 ml-2">Olá, {userName || "Convidado"}</span>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                <img alt="Perfil" className="w-full h-full object-cover" src={getAvatarUrl(userAvatar || userName || "Lucas")} />
              </div>
              <span className="material-symbols-outlined text-[#e9e2d3]/50 text-sm transition-transform duration-200" style={{ transform: isProfileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-[1rem] shadow-xl border border-outline-variant/20 overflow-hidden z-50 animate-fade-in transition-colors duration-300">
                <div className="p-3 border-b border-outline-variant/10 bg-surface/30">
                  <p className="text-[9px] text-tertiary font-bold uppercase tracking-widest">Sua Conta</p>
                </div>
                <div className="p-1.5">
                  <button 
                    onClick={() => { setShowAccountSettings(true); setIsProfileMenuOpen(false); }} 
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-variant rounded-[10px] transition-colors"
                  >
                    <span className="material-symbols-outlined text-base text-primary">settings</span> Configurações
                  </button>
                  <div className="w-full h-px bg-outline-variant/10 my-1"></div>
                  <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-error hover:bg-error/10 rounded-[10px] transition-colors">
                    <span className="material-symbols-outlined text-base">logout</span> Sair da Conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        {activeGroup && (
          <aside className={`absolute md:relative left-16 md:left-0 h-full flex flex-col p-4 pt-20 bg-inverse-surface w-56 rounded-r-[2rem] shadow-md z-[65] md:z-40 border-r border-outline-variant/10 shrink-0 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[150%] md:translate-x-0'}`}>
            <div className="mb-6 px-2 flex justify-between items-start">
              <div className="overflow-hidden">
                <h2 className="text-base font-bold text-inverse-on-surface font-headline truncate" title={activeGroup.name}>{activeGroup.name}</h2>
                <p className="text-[10px] text-primary-fixed-dim opacity-80 uppercase tracking-widest mt-1">Agenda do Grupo</p>
              </div>
            </div>
            
            <nav className="flex-1 space-y-2">
              <button onClick={() => { setActiveTab('calendar'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 font-bold rounded-[12px] shadow-sm transition-all duration-200 border ${activeTab === 'calendar' ? 'bg-primary text-on-primary border-white/5' : 'border-transparent text-surface-variant hover:bg-white/5'}`}>
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                <span className="font-body text-xs">Disponibilidade</span>
              </button>
              
              <button onClick={() => { setActiveTab('members'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 font-bold rounded-[12px] shadow-sm transition-all duration-200 border ${activeTab === 'members' ? 'bg-primary text-on-primary border-white/5' : 'border-transparent text-surface-variant hover:bg-white/5'}`}>
                <span className="material-symbols-outlined text-lg">group</span>
                <span className="font-body text-xs">Membros</span>
              </button>

              <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 font-bold rounded-[12px] shadow-sm transition-all duration-200 mt-4 border ${activeTab === 'settings' ? 'bg-primary text-on-primary border-white/5' : 'border-transparent text-surface-variant hover:bg-white/5'}`}>
                <span className="material-symbols-outlined text-lg">settings</span>
                <span className="font-body text-xs">Configurações</span>
              </button>
            </nav>
            
            <div className="mt-auto pt-4 border-t border-white/10 flex flex-col min-h-0">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-surface-variant mb-2 px-2 flex items-center gap-1.5 shrink-0">
                <span className="material-symbols-outlined text-sm">local_fire_department</span> Matches do Grupo
              </h3>
              
              <div className="px-1 overflow-y-auto scrollbar-thin flex-1 pb-2 space-y-1.5">
                {Object.keys(groupMatches).filter(key => key >= todayStr).length === 0 ? (
                  <div className="p-3 rounded-[12px] border border-dashed border-white/20 text-center bg-black/20">
                    <span className="material-symbols-outlined text-white/30 text-2xl mb-1">hourglass_empty</span>
                    <p className="text-[10px] text-surface-variant font-medium leading-relaxed">Nenhum match ainda. Convide a galera!</p>
                  </div>
                ) : (
                  Object.keys(groupMatches).filter(key => key >= todayStr).sort().map(dateKey => {
                    const match = groupMatches[dateKey];
                    const [, mo, d] = dateKey.split('-');
                    
                    let bgBorderClass = 'bg-primary border-primary';
                    let textIconClass = 'text-on-primary';
                    let iconName = 'mood';
                    
                    if (match.type === 'perfect') {
                      bgBorderClass = 'bg-secondary border-secondary';
                      textIconClass = 'text-on-secondary';
                      iconName = 'favorite';
                    } else if (match.type === 'potential') {
                      bgBorderClass = 'bg-tertiary border-tertiary';
                      textIconClass = 'text-on-tertiary';
                      iconName = 'star';
                    }

                    return (
                      <div key={dateKey} className={`p-2.5 rounded-[10px] border flex items-center justify-between animate-fade-in ${bgBorderClass}`}>
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[14px] ${textIconClass}`}>
                            {iconName}
                          </span>
                          <span className={`text-[11px] font-bold ${textIconClass}`}>{d}/{mo}</span>
                        </div>
                        <span className="text-[9px] font-bold bg-black/40 px-1.5 py-0.5 rounded text-white/90 flex items-center gap-1">
                          {match.count} <span className="material-symbols-outlined text-[10px]">group</span>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 pt-20 px-6 pb-2 flex flex-col h-full overflow-hidden transition-colors duration-300">
          {!activeGroup ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <span className="material-symbols-outlined text-[80px] text-tertiary/30 mb-4 animate-fade-in">waving_hand</span>
              <h2 className="text-2xl font-black font-headline text-on-surface mb-2">Bem-vindo ao Marcaí</h2>
              <p className="text-sm text-tertiary mb-6">Selecione um grupo na barra lateral esquerda para começar a marcar seus horários, ou clique no (+) para criar o seu primeiro grupo.</p>
            </div>
          ) : (
            <>
              {activeTab === 'calendar' && (
                <div className="flex flex-col h-full animate-fade-in">
                  <header className="mb-4 relative shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary mb-1 block">Seu Planejamento</span>
                    <h1 className="text-2xl font-black text-on-surface font-headline tracking-tighter leading-none">
                      Quando vamos nos <span className="text-secondary italic">encontrar?</span>
                    </h1>
                  </header>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-0 overflow-y-auto xl:overflow-hidden pb-10 xl:pb-0 pr-1 scrollbar-thin">
                    <section className="xl:col-span-8 bg-surface-container-lowest p-4 rounded-[1.5rem] shadow-sm border border-outline-variant/20 flex flex-col min-h-[500px] xl:min-h-0 shrink-0">
                      <div className="flex items-center justify-between mb-3 shrink-0">
                        <h3 className="text-lg font-bold font-headline text-on-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
                          {currentMonthName} {year}
                        </h3>
                        <div className="flex gap-1.5">
                          <button onClick={prevMonth} className="p-1.5 bg-surface-container hover:bg-surface-variant rounded-full transition-colors border border-outline-variant/20 active:scale-95">
                            <span className="material-symbols-outlined text-base">chevron_left</span>
                          </button>
                          <button onClick={nextMonth} className="p-1.5 bg-surface-container hover:bg-surface-variant rounded-full transition-colors border border-outline-variant/20 active:scale-95">
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1.5 flex-1 overflow-y-auto pr-1 scrollbar-thin">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                          <div key={day} className="text-center text-[10px] font-bold uppercase text-tertiary tracking-widest pb-1">{day}</div>
                        ))}
                        
                        {prevMonthDays.map(day => (
                           <div key={`prev-${day}`} className="min-h-[55px] w-full flex items-start justify-end p-2 text-outline-variant/50 text-xs font-bold bg-transparent">{day}</div>
                        ))}
                        
                        {currentMonthDays.map(day => {
                          const dateKey = `${year}-${pad(month)}-${pad(day)}`;
                          const isPast = dateKey < todayStr;
                          const data = selectedDates[dateKey];
                          const isSelected = !!data;
                          const matchInfo = groupMatches[dateKey];

                          let cellBgClass = 'bg-surface-container hover:bg-surface-variant border-outline-variant/20';
                          let textClass = 'text-on-surface';

                          if (isPast) {
                            cellBgClass = 'bg-surface-container-lowest opacity-40 cursor-not-allowed border-transparent';
                            textClass = 'text-tertiary';
                          } else if (isSelected) {
                            cellBgClass = 'bg-primary-container text-on-primary-container ring-1 ring-primary-container/50 border-transparent';
                            textClass = 'text-on-primary-container';
                          } else if (matchInfo) {
                            if (matchInfo.type === 'perfect') {
                              cellBgClass = 'bg-secondary-container/80 border-secondary/50';
                              textClass = 'text-on-secondary-container';
                            } else if (matchInfo.type === 'potential') {
                              cellBgClass = 'bg-tertiary-container/80 border-tertiary/50';
                              textClass = 'text-on-tertiary-container';
                            } else {
                              cellBgClass = 'bg-primary-container/80 border-primary/50';
                              textClass = 'text-on-primary-container';
                            }
                          }

                          return (
                            <div 
                              key={day} 
                              onClick={!isPast ? () => toggleDate(dateKey) : undefined}
                              className={`min-h-[55px] w-full relative flex flex-col p-1.5 transition-all rounded-[10px] shadow-sm ${!isPast ? 'cursor-pointer group hover:shadow-md' : ''} border ${cellBgClass}`}
                            >
                              {matchInfo && !isPast && (
                                <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-surface ${
                                  matchInfo.type === 'perfect' ? 'bg-secondary text-on-secondary' : 
                                  matchInfo.type === 'potential' ? 'bg-tertiary text-on-tertiary' : 
                                  'bg-primary text-on-primary'
                                }`}>
                                  <span className="material-symbols-outlined text-[9px]">
                                    {matchInfo.type === 'perfect' ? 'favorite' : matchInfo.type === 'potential' ? 'star' : 'mood'}
                                  </span>
                                </div>
                              )}

                              <span className={`self-end text-xs font-black ${textClass}`}>{day}</span>
                              
                              <div className="flex-1 flex items-center justify-center w-full">
                                {isSelected ? (
                                  <>
                                    <div className="absolute top-1 left-1 w-3.5 h-3.5 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-[10px] text-primary">check</span></div>
                                    <span className="block text-[9px] font-bold uppercase bg-white/40 px-1 py-1 rounded-[4px] text-on-primary-container text-center w-full mx-0.5 shadow-sm mt-0.5 leading-none truncate">
                                      {data.allDay ? 'Dia Todo' : `${data.start} - ${data.end}`}
                                    </span>
                                  </>
                                ) : !isPast && (
                                  <span className="text-[10px] font-bold text-tertiary opacity-0 group-hover:opacity-100 transition-opacity text-center mt-1">Marcar</span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {nextMonthDays.map(day => (
                           <div key={`next-${day}`} className="min-h-[55px] w-full flex items-start justify-end p-2 text-outline-variant/50 text-xs font-bold bg-transparent">{day}</div>
                        ))}
                      </div>

                      <div className="mt-3 pt-3 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
                        <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">bolt</span> Rápido:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => handleBulkSelect('weekdays')} className="px-3 py-1.5 bg-surface-container hover:bg-surface-variant text-[10px] font-bold text-on-surface rounded-[6px] border border-outline-variant/20 transition-colors shadow-sm">Dias Úteis</button>
                          <button onClick={() => handleBulkSelect('weekends')} className="px-3 py-1.5 bg-surface-container hover:bg-surface-variant text-[10px] font-bold text-on-surface rounded-[6px] border border-outline-variant/20 transition-colors shadow-sm">Fins de Semana</button>
                          <button onClick={() => handleBulkSelect('all')} className="px-3 py-1.5 bg-surface-container hover:bg-surface-variant text-[10px] font-bold text-on-surface rounded-[6px] border border-outline-variant/20 transition-colors shadow-sm">Mês Todo</button>
                          <div className="w-px h-6 bg-outline-variant/30 mx-1"></div>
                          <button onClick={() => handleBulkSelect('clear')} className="px-3 py-1.5 bg-error/10 hover:bg-error/20 text-[10px] font-bold text-error rounded-[6px] transition-colors ml-2">Limpar Mês Atual</button>
                        </div>
                      </div>
                    </section>

                    <aside className="xl:col-span-4 flex flex-col gap-4 min-h-[450px] xl:min-h-0 shrink-0">
                      <div className="bg-surface-container-highest p-5 rounded-[1.5rem] shadow-sm border border-outline-variant/20 relative flex flex-col flex-1 min-h-0">
                        <h4 className="text-base font-bold text-on-surface mb-3 flex items-center gap-1.5 font-headline shrink-0">
                          Minha Disponibilidade
                          <span className="material-symbols-outlined text-secondary text-lg">edit_calendar</span>
                        </h4>
                        
                        <div className="space-y-2.5 overflow-y-auto pr-1 scrollbar-thin flex-1 min-h-0">
                          {upcomingSelectedKeys.length === 0 ? (
                            <div className="py-6 text-center border-2 border-dashed border-outline-variant/30 rounded-[12px] bg-surface-container-lowest/50">
                              <span className="material-symbols-outlined text-tertiary/40 text-2xl mb-1.5">touch_app</span>
                              <p className="text-xs font-medium text-tertiary px-3 leading-relaxed">Selecione no calendário os dias livres.</p>
                            </div>
                          ) : (
                            upcomingSelectedKeys.map(dateKey => {
                              const [y, m, d] = dateKey.split('-');
                              const data = selectedDates[dateKey];
                              return (
                                <div key={dateKey} className="flex flex-col gap-2.5 group bg-surface-container-lowest p-3 rounded-[12px] border border-outline-variant/10 shadow-sm transition-all hover:border-primary-container/50 shrink-0">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 bg-primary-container/30 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary text-sm">event_available</span>
                                      </div>
                                      <p className="text-xs font-bold text-on-surface">{monthNames[parseInt(m, 10)]}, Dia {d}</p>
                                    </div>
                                    <button onClick={() => toggleDate(dateKey)} className="opacity-40 hover:opacity-100 hover:bg-error/10 transition-all p-1.5 rounded-md text-error">
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  </div>

                                  <div className="flex flex-col gap-2 mt-0.5">
                                    <div className="flex bg-surface-variant p-0.5 rounded-[8px] border border-outline-variant/20">
                                      <button onClick={() => updateTimePref(dateKey, 'allDay', true)} className={`flex-1 text-[10px] font-bold py-1.5 rounded-[6px] transition-all ${data.allDay ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-tertiary hover:text-on-surface'}`}>Dia Todo</button>
                                      <button onClick={() => updateTimePref(dateKey, 'allDay', false)} className={`flex-1 text-[10px] font-bold py-1.5 rounded-[6px] transition-all ${!data.allDay ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-tertiary hover:text-on-surface'}`}>Horário Específico</button>
                                    </div>
                                    {!data.allDay && (
                                      <div className="flex items-center justify-between gap-1.5 animate-fade-in px-1">
                                        <select value={data.start} onChange={(e) => updateTimePref(dateKey, 'start', e.target.value)} className="w-full flex-1 bg-surface border border-outline-variant/30 text-on-surface text-[11px] font-bold rounded-[6px] py-1.5 px-2 focus:ring-1 focus:ring-primary cursor-pointer outline-none">
                                          {TIME_OPTIONS.map(time => <option key={`start-${time}`} value={time}>{time}</option>)}
                                        </select>
                                        <span className="text-[10px] text-tertiary font-medium">até</span>
                                        <select value={data.end} onChange={(e) => updateTimePref(dateKey, 'end', e.target.value)} className="w-full flex-1 bg-surface border border-outline-variant/30 text-on-surface text-[11px] font-bold rounded-[6px] py-1.5 px-2 focus:ring-1 focus:ring-primary cursor-pointer outline-none">
                                          {TIME_OPTIONS.map(time => <option key={`end-${time}`} value={time}>{time}</option>)}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="bg-surface-variant/30 p-4 rounded-[16px] border border-dashed border-outline-variant/40 shrink-0">
                        <h4 className="text-xs font-bold text-on-surface mb-2.5 font-headline">Como Funciona</h4>
                        <ul className="space-y-3">
                          <li className="flex items-start gap-2.5">
                            <span className="material-symbols-outlined text-on-secondary text-sm bg-secondary p-1.5 rounded-[6px]">favorite</span>
                            <div><p className="text-xs font-bold text-on-surface">Data Perfeita</p><p className="text-[10px] text-tertiary mt-0.5">Quando 75%+ escolhem a mesma data.</p></div>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="material-symbols-outlined text-on-tertiary text-sm bg-tertiary p-1.5 rounded-[6px]">star</span>
                            <div><p className="text-xs font-bold text-on-surface">Dia em Potencial</p><p className="text-[10px] text-tertiary mt-0.5">Quando 5+ pessoas escolhem a mesma data.</p></div>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="material-symbols-outlined text-on-primary text-sm bg-primary p-1.5 rounded-[6px]">mood</span>
                            <div><p className="text-xs font-bold text-on-surface">Ótima Data</p><p className="text-[10px] text-tertiary mt-0.5">Maioria disponível em horários variados.</p></div>
                          </li>
                        </ul>
                      </div>
                    </aside>
                  </div>
                </div>
              )}

              {activeTab === 'members' && (
                <div className="max-w-4xl mx-auto w-full flex flex-col h-full animate-fade-in">
                  <div className="flex items-center justify-between mb-6 shrink-0 border-b border-outline-variant/20 pb-4 mt-2">
                    <header>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary mb-1 block">Companhia</span>
                      <h1 className="text-2xl font-black text-on-surface font-headline tracking-tighter leading-none">
                        Membros do <span className="text-secondary italic">Grupo</span>
                      </h1>
                    </header>

                    <div className="flex items-center gap-3 bg-surface-container-lowest py-2 px-4 rounded-[12px] border border-outline-variant/20 shadow-sm">
                      <div>
                        <p className="text-xs font-bold text-on-surface">Modo Anônimo</p>
                        <p className="text-[9px] text-tertiary">Ocultar meus dias marcados</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" className="sr-only peer" checked={myGroupSettings.hide_availability} onChange={togglePrivacy} />
                        <div className="w-9 h-5 bg-outline-variant/30 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto scrollbar-thin grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 items-start pr-2">
                    {groupMembers.map(member => (
                      <div key={member.user_id} className="bg-surface-container-lowest p-4 rounded-[1.5rem] shadow-sm border border-outline-variant/20 flex items-center gap-4 hover:border-primary/30 transition-colors">
                        <div className="w-14 h-14 rounded-full bg-surface-container-highest overflow-hidden border-2 border-surface-variant shrink-0">
                          <img alt="Perfil" className="w-full h-full object-cover" src={getAvatarUrl(member.avatar_seed)} />
                        </div>
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-bold text-sm text-on-surface truncate">@{member.username}</h4>
                              {member.role === 'admin' && <span className="text-[9px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">Admin</span>}
                            </div>
                            
                            {member.hide_availability ? (
                              <div className="flex items-center gap-1.5 text-tertiary">
                                <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                                <span className="text-[11px] font-medium italic">Disponibilidade Oculta</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-secondary">
                                <span className="material-symbols-outlined text-[14px]">event_available</span>
                                <span className="text-[11px] font-bold">{member.availCount} {member.availCount === 1 ? 'dia marcado' : 'dias marcados'}</span>
                              </div>
                            )}
                          </div>

                          {activeGroup.created_by === userId && member.user_id !== userId && (
                            <div className="flex gap-2 ml-2">
                              <button onClick={() => handleKickMember(member.user_id, member.username)} className="text-tertiary hover:text-error transition-colors p-1.5 rounded-lg hover:bg-error/10" title="Expulsar do Grupo">
                                <span className="material-symbols-outlined text-sm">person_remove</span>
                              </button>
                              <button onClick={() => handleBanMember(member.user_id, member.username)} className="text-tertiary hover:text-error transition-colors p-1.5 rounded-lg hover:bg-error/10" title="Banir Definitivamente">
                                <span className="material-symbols-outlined text-sm">block</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 animate-fade-in">
                  <header className="mb-2 shrink-0 mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary mb-1 block">Ajustes</span>
                    <h1 className="text-2xl font-black text-on-surface font-headline tracking-tighter leading-none">
                      Configurações do <span className="text-secondary italic">Grupo</span>
                    </h1>
                  </header>

                  <div className="flex-1 overflow-y-auto scrollbar-thin space-y-6 pb-6 pr-2">
                    <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm border border-outline-variant/20">
                      <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">security</span> Minha Privacidade
                      </h3>
                      <div className="flex items-center justify-between bg-surface-variant/30 p-4 rounded-xl border border-outline-variant/20">
                        <div>
                          <p className="text-xs font-bold text-on-surface">Modo Anônimo</p>
                          <p className="text-[10px] text-tertiary mt-1">Ocultar a quantidade de dias que marquei dos outros membros.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input type="checkbox" className="sr-only peer" checked={myGroupSettings.hide_availability} onChange={togglePrivacy} />
                          <div className="w-10 h-5 bg-outline-variant/30 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>

                    {activeGroup.created_by === userId && (
                      <>
                        <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm border border-outline-variant/20">
                          <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary">block</span> Usuários Banidos
                          </h3>
                          {bannedMembers.length === 0 ? (
                            <p className="text-xs text-tertiary italic bg-surface-variant/30 p-4 rounded-xl border border-outline-variant/20 text-center">Nenhum usuário foi banido deste grupo.</p>
                          ) : (
                            <div className="space-y-2">
                              {bannedMembers.map(b => (
                                <div key={b.user_id} className="flex items-center justify-between bg-surface p-3 rounded-xl border border-outline-variant/20 shadow-sm">
                                  <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                                    <span className="material-symbols-outlined text-error text-sm">person_off</span>
                                    @{b.username}
                                  </span>
                                  <button onClick={() => handleUnbanMember(b.user_id)} className="text-[10px] font-bold text-primary hover:text-on-primary-container px-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                                    Desbanir
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="bg-error/5 p-6 rounded-[1.5rem] border border-error/20">
                          <h3 className="text-sm font-bold text-error mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined">warning</span> Zona de Perigo
                          </h3>
                          <p className="text-[11px] text-on-surface-variant mb-4">Ao apagar o grupo, todos os membros, datas e configurações serão perdidos permanentemente.</p>
                          <button onClick={handleDeleteGroup} className="bg-error text-white font-bold py-2.5 px-6 rounded-xl hover:bg-error/80 transition-colors shadow-sm text-xs">
                            Apagar Grupo Definitivamente
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {showChoiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-[24px] shadow-2xl p-8 text-center">
             <h2 className="font-headline font-black text-2xl text-on-surface mb-6">Adicionar Grupo</h2>
             <div className="flex gap-4">
                <button onClick={() => {setShowChoiceModal(false); setShowCreateModal(true)}} className="flex-1 bg-primary text-on-primary font-bold py-5 rounded-[16px] flex flex-col items-center gap-2 hover:scale-105 hover:shadow-lg transition-all">
                   <span className="material-symbols-outlined text-4xl">add_box</span> Criar Novo
                </button>
                <button onClick={() => {setShowChoiceModal(false); setShowJoinModal(true)}} className="flex-1 bg-surface-variant text-on-surface font-bold py-5 rounded-[16px] flex flex-col items-center gap-2 hover:scale-105 border border-outline-variant/30 hover:shadow-lg transition-all">
                   <span className="material-symbols-outlined text-4xl">search</span> Procurar
                </button>
             </div>
             <button onClick={() => setShowChoiceModal(false)} className="mt-8 text-xs font-bold text-tertiary hover:text-on-surface transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline font-black text-2xl text-on-surface">Criar Grupo</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-tertiary hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Nome do Grupo</label>
                <input type="text" placeholder="Ex: Galera da Facul" required value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full mt-1 bg-surface-variant border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container outline-none text-on-surface font-bold" />
              </div>
              
              <div className="flex items-center justify-between bg-surface-variant/50 p-3 rounded-xl border border-outline-variant/20">
                <div>
                  <p className="text-xs font-bold text-on-surface">Grupo Privado</p>
                  <p className="text-[9px] text-tertiary">Exige senha para entrar</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isPrivateGroup} onChange={(e) => setIsPrivateGroup(e.target.checked)} />
                  <div className="w-9 h-5 bg-outline-variant/30 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {isPrivateGroup && (
                <div className="animate-fade-in">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Senha de Acesso</label>
                  <input type="text" placeholder="Crie uma senha" required value={groupPassword} onChange={(e) => setGroupPassword(e.target.value)} className="w-full mt-1 bg-surface-variant border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container outline-none text-on-surface font-bold" />
                </div>
              )}

              <button disabled={isCreating} type="submit" className="w-full bg-primary text-on-primary font-bold py-3.5 rounded-xl mt-4 shadow-md hover:brightness-110 active:scale-95 transition-all">
                {isCreating ? 'Criando...' : 'Criar Servidor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden p-6 flex flex-col max-h-[80vh]">
            
            {!selectedGroupToJoin ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-headline font-black text-2xl text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">explore</span>
                    Pesquisar Grupos
                  </h2>
                  <button onClick={resetJoinModal} className="text-tertiary hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
                </div>
                
                <form onSubmit={handleSearchGroups} className="relative mb-4">
                  <input 
                    type="text" 
                    placeholder="Digite o nome do grupo..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-variant border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-secondary/50 outline-none font-bold text-on-surface" 
                  />
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">search</span>
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-secondary text-on-secondary px-3 py-1.5 rounded-lg text-xs font-bold">Buscar</button>
                </form>

                <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1">
                  {isSearching ? (
                    <p className="text-center text-tertiary text-xs font-bold py-8">Procurando...</p>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(group => (
                      <div key={group.id} className="bg-surface p-3 rounded-xl border border-outline-variant/20 flex items-center justify-between hover:border-secondary/30 transition-colors">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {group.is_private && <span className="material-symbols-outlined text-[14px] text-error">lock</span>}
                            <h4 className="font-bold text-sm text-on-surface">{group.name}</h4>
                          </div>
                          <p className="text-[10px] text-tertiary mt-0.5">Criado por: <span className="font-bold text-primary">@{group.profiles?.username || 'desconhecido'}</span></p>
                        </div>
                        <button 
                          onClick={() => setSelectedGroupToJoin(group)}
                          className="bg-surface-variant hover:bg-secondary hover:text-on-secondary text-on-surface text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                        >
                          Entrar
                        </button>
                      </div>
                    ))
                  ) : searchQuery && (
                    <div className="text-center py-8">
                      <span className="material-symbols-outlined text-4xl text-tertiary/30 mb-2">search_off</span>
                      <p className="text-xs text-tertiary font-bold">Nenhum grupo encontrado com esse nome.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center animate-fade-in py-4">
                <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl">{selectedGroupToJoin.is_private ? 'lock' : 'waving_hand'}</span>
                </div>
                <h2 className="font-headline font-black text-xl text-on-surface mb-1">Entrar em {selectedGroupToJoin.name}</h2>
                <p className="text-xs text-tertiary mb-6">Criado por @{selectedGroupToJoin.profiles?.username}</p>
                
                <form onSubmit={handleJoinGroup} className="space-y-4">
                  {selectedGroupToJoin.is_private && (
                    <input 
                      type="password" 
                      placeholder="Senha do Grupo" 
                      required
                      value={joinPasswordInput}
                      onChange={(e) => setJoinPasswordInput(e.target.value)}
                      className="w-full bg-surface-variant border-none rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-secondary/50 outline-none text-center font-bold text-on-surface" 
                    />
                  )}
                  <button type="submit" className="w-full bg-secondary text-on-secondary font-bold py-3.5 rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all">
                    Confirmar Entrada
                  </button>
                  <button type="button" onClick={() => setSelectedGroupToJoin(null)} className="w-full py-2 text-xs font-bold text-tertiary hover:text-on-surface transition-colors">
                    Voltar para pesquisa
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {showAccountSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-[24px] shadow-2xl p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline font-black text-2xl text-on-surface">Sua Conta</h2>
              <button onClick={() => setShowAccountSettings(false)} className="text-tertiary hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-surface-container-highest p-4 rounded-[1.5rem] border border-outline-variant/20">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 rounded-full bg-surface-variant overflow-hidden border border-outline-variant/50">
      <img alt="Seu Perfil" className="w-full h-full object-cover bg-surface" src={getAvatarUrl(userAvatar || userName || "Lucas")} />
    </div>
    <div>
      <h3 className="text-sm font-bold text-on-surface">Seu Avatar</h3>
      <p className="text-[10px] text-tertiary">Escolha o seu visual abaixo.</p>
    </div>
  </div>
  
  <div className="grid grid-cols-6 gap-2 bg-surface-variant/30 p-2 rounded-xl border border-outline-variant/20 max-h-40 overflow-y-auto scrollbar-thin">
    {AVATAR_OPTIONS.map(url => (
      <div 
        key={url} 
        onClick={() => handleUpdateAvatar(url)}
        className={`w-10 h-10 rounded-full cursor-pointer overflow-hidden border-2 transition-transform hover:scale-110 bg-surface ${userAvatar === url ? 'border-primary shadow-md scale-110' : 'border-transparent hover:border-outline-variant/50'}`}
      >
        <img alt="Avatar Option" className="w-full h-full object-cover" src={url} />
      </div>
    ))}
  </div>
</div>
              <div className="flex items-center justify-between bg-surface-variant/30 p-4 rounded-xl border border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">{isDarkMode ? 'dark_mode' : 'light_mode'}</span>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Tema Escuro</p>
                    <p className="text-[10px] text-tertiary mt-0.5">Altera a aparência do Marcaí</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={isDarkMode} onChange={toggleTheme} />
                  <div className="w-10 h-5 bg-outline-variant/30 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="bg-error/5 p-5 rounded-xl border border-error/20">
                <h3 className="text-sm font-bold text-error mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">warning</span> Zona de Perigo
                </h3>
                <p className="text-[10px] text-on-surface-variant mb-4">Ao apagar sua conta, você sairá de todos os grupos e perderá todos os seus dados. Essa ação não pode ser desfeita.</p>
                <button onClick={handleDeleteAccount} className="w-full bg-error text-white font-bold py-2.5 rounded-lg hover:bg-error/80 transition-colors shadow-sm text-xs">
                  Apagar Minha Conta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-[24px] shadow-2xl p-6 text-center animate-fade-in" style={{ animationDuration: '0.2s' }}>
             <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${dialog.isDestructive || dialog.title === 'Acesso Negado' || dialog.title === 'Erro' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
               <span className="material-symbols-outlined text-3xl">
                 {dialog.type === 'confirm' ? 'warning' : 'info'}
               </span>
             </div>
             <h2 className="font-headline font-black text-xl text-on-surface mb-2">{dialog.title}</h2>
             <p className="text-sm text-on-surface-variant mb-6">{dialog.message}</p>
             
             <div className="flex gap-3">
                {dialog.type === 'confirm' && (
                  <button onClick={closeDialog} className="flex-1 py-3 text-xs font-bold text-tertiary hover:text-on-surface transition-colors bg-surface-variant/50 rounded-xl hover:bg-surface-variant">
                    {dialog.cancelText}
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (dialog.type === 'confirm' && dialog.onConfirm) {
                      dialog.onConfirm();
                    } else {
                      closeDialog();
                    }
                  }} 
                  className={`flex-1 font-bold py-3 rounded-xl shadow-md transition-all text-xs ${dialog.isDestructive ? 'bg-error text-white hover:bg-error/80' : 'bg-primary text-on-primary hover:brightness-110'}`}
                >
                   {dialog.confirmText}
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}