import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  Sun,
  Moon,
  Hospital,
  Settings,
  Plus,
  Trash2,
  X,
  FileText,
  Stethoscope,
  Lock,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Staff {
  id: number;
  name: string;
  shift: 'morning' | 'afternoon' | 'oncall';
  role: 'admin' | 'staff';
  needs_password_change: number;
}

interface UserSession {
  id: number;
  name: string;
  shift: 'morning' | 'afternoon' | 'oncall';
  role: 'admin' | 'staff';
  needs_password_change: boolean;
}

interface Sector {
  id: number;
  name: string;
  staff_id: number;
}

interface ReportItem {
  staff_name: string;
  shift: string;
  sector_name: string;
  missed_date: string | null;
}

export default function App() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [missedIds, setMissedIds] = useState<number[]>([]);
  const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon'>('morning');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [reports, setReports] = useState<ReportItem[]>([]);
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem("epiviu_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Form states
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffShift, setNewStaffShift] = useState<'morning' | 'afternoon' | 'oncall'>('morning');
  const [newSectorName, setNewSectorName] = useState("");
  const [selectedStaffForSector, setSelectedStaffForSector] = useState<number | "">("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/data");
      const data = await res.json();
      setStaff(data.staff);
      setSectors(data.sectors);
      setMissedIds(data.missed);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setReports(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser && !currentUser.needs_password_change) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (data.success) {
        const user = {
          ...data.user,
          needs_password_change: data.user.needs_password_change === 1
        };
        setCurrentUser(user);
        localStorage.setItem("epiviu_user", JSON.stringify(user));
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Erro ao fazer login");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 4) {
      alert("A senha deve ter pelo menos 4 caracteres");
      return;
    }
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.id, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        const updatedUser = { ...currentUser!, needs_password_change: false };
        setCurrentUser(updatedUser);
        localStorage.setItem("epiviu_user", JSON.stringify(updatedUser));
        alert("Senha alterada com sucesso!");
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Erro ao alterar senha");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("epiviu_user");
  };

  const toggleMissed = async (sectorId: number, staffId: number) => {
    // Permission check: Admin can toggle anything, Staff only their own
    if (currentUser?.role !== 'admin' && currentUser?.id !== staffId) {
      alert("Você só pode marcar setores sob sua responsabilidade.");
      return;
    }

    try {
      const res = await fetch("/api/toggle-missed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId })
      });
      const result = await res.json();
      
      if (result.status === "added") {
        setMissedIds(prev => [...prev, sectorId]);
      } else {
        setMissedIds(prev => prev.filter(id => id !== sectorId));
      }
    } catch (err) {
      console.error("Error toggling missed status:", err);
    }
  };

  const addStaff = async () => {
    if (!newStaffName) return;
    try {
      await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStaffName, shift: newStaffShift })
      });
      setNewStaffName("");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteStaff = async (id: number) => {
    if (!confirm("Tem certeza? Isso excluirá todos os setores vinculados a esta funcionária.")) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        alert(`Erro: ${errorData.error || 'Não foi possível excluir'}`);
        return;
      }
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao tentar excluir.");
    }
  };

  const addSector = async () => {
    if (!newSectorName || !selectedStaffForSector) return;
    try {
      await fetch("/api/sectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSectorName, staffId: selectedStaffForSector })
      });
      setNewSectorName("");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSector = async (id: number) => {
    try {
      const res = await fetch(`/api/sectors/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        alert(`Erro: ${errorData.error || 'Não foi possível excluir'}`);
        return;
      }
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao tentar excluir.");
    }
  };

  // Logic: Show staff of selected shift OR oncall (plantonista)
  const filteredStaff = staff.filter(s => s.shift === selectedShift || s.shift === 'oncall');
  
  const today = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const shiftLabels = {
    morning: 'Manhã',
    afternoon: 'Tarde',
    oncall: 'Plantonista'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 font-medium">Carregando dados...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-3xl shadow-xl p-8 border border-slate-200"
        >
          <div className="text-center mb-8">
            <div className="bg-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
              <Hospital size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Epiviu</h1>
            <p className="text-slate-500 mt-2">Acesse o sistema de monitoramento</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Usuário (Nome)</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Seu nome"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Sua senha"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
            >
              Entrar no Sistema
            </button>
          </form>
          <p className="text-center text-slate-400 text-xs mt-8 italic">
            Senha inicial padrão: 1234
          </p>
        </motion.div>
      </div>
    );
  }

  if (currentUser.needs_password_change) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-md rounded-3xl shadow-xl p-8 border border-slate-200"
        >
          <div className="text-center mb-8">
            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Alterar Senha</h2>
            <p className="text-slate-500 mt-2">Para sua segurança, altere sua senha inicial.</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nova Senha</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="Mínimo 4 caracteres"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Confirmar Nova Senha</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="Repita a nova senha"
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
            >
              Salvar Nova Senha
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Report Summary Calculations
  const totalSectors = reports.length;
  const missedCount = reports.filter(r => r.missed_date).length;
  const visitedCount = totalSectors - missedCount;
  const visitedPercent = totalSectors > 0 ? Math.round((visitedCount / totalSectors) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg text-white">
              <Hospital size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">Epiviu</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> {today}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 mr-4 pr-4 border-r border-slate-100">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold">{currentUser.role === 'admin' ? 'Administrador' : 'Funcionária'}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </div>
            <button 
              onClick={handleLogout}
              className="md:hidden p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
            <button 
              onClick={() => {
                fetchReports();
                setShowReports(true);
              }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Relatórios"
            >
              <FileText size={20} />
            </button>
            {currentUser.role === 'admin' && (
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Configurações"
              >
                <Settings size={20} />
              </button>
            )}
            <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto">
              <button 
                onClick={() => setSelectedShift('morning')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedShift === 'morning' 
                    ? 'bg-white text-emerald-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sun size={14} /> Manhã
              </button>
              <button 
                onClick={() => setSelectedShift('afternoon')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedShift === 'afternoon' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Moon size={14} /> Tarde
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Monitoramento de Visitas</h2>
          <p className="text-slate-500">
            Selecione os setores que <span className="font-bold text-rose-600">não foram visitados</span> hoje.
          </p>
        </div>

        <div className="grid gap-6">
          <AnimatePresence mode="wait">
            {filteredStaff.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200"
              >
                <User size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-medium">Nenhuma funcionária cadastrada para este turno.</p>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="mt-4 text-emerald-600 font-bold hover:underline"
                >
                  Configurar Equipe
                </button>
              </motion.div>
            ) : (
              filteredStaff.map((person) => (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                        {person.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800">{person.name}</h3>
                          {person.shift === 'oncall' && (
                            <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Plantonista</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                          Turno {shiftLabels[person.shift]}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-400 bg-slate-200/50 px-2 py-1 rounded">
                      {sectors.filter(s => s.staff_id === person.id).length} SETORES
                    </div>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sectors.filter(s => s.staff_id === person.id).length === 0 ? (
                      <div className="col-span-full py-4 text-center text-slate-400 text-sm italic">
                        Nenhum setor vinculado.
                      </div>
                    ) : (
                      sectors
                        .filter(s => s.staff_id === person.id)
                        .map(sector => {
                          const isMissed = missedIds.includes(sector.id);
                          const isOwnSector = currentUser?.role === 'admin' || currentUser?.id === person.id;
                          
                          return (
                            <button
                              key={sector.id}
                              onClick={() => toggleMissed(sector.id, person.id)}
                              className={`group relative flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                                isMissed 
                                  ? 'bg-rose-50 border-rose-200 text-rose-800 ring-4 ring-rose-50' 
                                  : 'bg-white border-slate-100 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/30'
                              } ${!isOwnSector ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg transition-colors ${
                                  isMissed ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600'
                                }`}>
                                  <MapPin size={18} />
                                </div>
                                <span className="font-semibold">{sector.name}</span>
                              </div>
                              
                              <div className="flex items-center">
                                {isMissed ? (
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter bg-rose-600 text-white px-2 py-1 rounded-full animate-pulse">
                                    <AlertCircle size={12} /> Não Visitado
                                  </div>
                                ) : (
                                  <CheckCircle2 size={20} className="text-slate-200 group-hover:text-emerald-400 transition-colors" />
                                )}
                              </div>
                            </button>
                          );
                        })
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Summary Section */}
        <div className="mt-12 p-8 bg-slate-900 rounded-3xl text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-emerald-500">
            <Hospital size={120} />
          </div>
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Clock size={20} className="text-emerald-400" /> Resumo do Dia
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total de Setores</p>
                <p className="text-4xl font-bold">{sectors.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Visitados</p>
                <p className="text-4xl font-bold text-emerald-400">{sectors.length - missedIds.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Pendentes</p>
                <p className="text-4xl font-bold text-rose-500">{missedIds.length}</p>
              </div>
            </div>

            {missedIds.length > 0 && (
              <div className="mt-8 pt-8 border-t border-white/10">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Setores Não Visitados:</p>
                <div className="flex flex-wrap gap-2">
                  {missedIds.map(id => {
                    const sector = sectors.find(s => s.id === id);
                    return (
                      <span key={id} className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full text-xs font-semibold">
                        {sector?.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reports Modal */}
      <AnimatePresence>
        {showReports && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReports(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={20} className="text-slate-400" /> Relatório Dinâmico
                </h2>
                <button onClick={() => setShowReports(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto bg-slate-50">
                {/* Dynamic Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Setores</p>
                    <p className="text-2xl font-bold text-slate-800">{totalSectors}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Visitados</p>
                    <p className="text-2xl font-bold text-emerald-600">{visitedCount}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Não Visitados</p>
                    <p className="text-2xl font-bold text-rose-600">{missedCount}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Eficiência</p>
                    <p className="text-2xl font-bold text-indigo-600">{visitedPercent}%</p>
                  </div>
                </div>

                {/* Grouped Report */}
                <div className="space-y-6">
                  {Array.from(new Set(reports.map(r => r.staff_name))).map(staffName => {
                    const staffItems = reports.filter(r => r.staff_name === staffName);
                    const staffMissed = staffItems.filter(r => r.missed_date).length;
                    return (
                      <div key={staffName} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 bg-slate-100/50 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-slate-400" />
                            <span className="font-bold text-slate-700">{staffName}</span>
                            <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-500 font-bold uppercase">
                              {shiftLabels[staffItems[0].shift as keyof typeof shiftLabels]}
                            </span>
                          </div>
                          <div className="text-xs font-bold">
                            {staffMissed > 0 ? (
                              <span className="text-rose-600">{staffMissed} pendências</span>
                            ) : (
                              <span className="text-emerald-600">Tudo visitado</span>
                            )}
                          </div>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {staffItems.map((item, idx) => (
                            <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${
                              item.missed_date ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50/30 border-emerald-100'
                            }`}>
                              <span className="text-sm font-medium text-slate-700">{item.sector_name}</span>
                              {item.missed_date ? (
                                <AlertCircle size={16} className="text-rose-500" />
                              ) : (
                                <CheckCircle2 size={16} className="text-emerald-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
                <button 
                  onClick={() => setShowReports(false)}
                  className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Settings size={20} className="text-slate-400" /> Configurações do Sistema
                </h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-12">
                {/* Staff Management */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Gerenciar Equipe</h3>
                  <div className="flex gap-2 mb-6">
                    <input 
                      type="text" 
                      placeholder="Nome da funcionária"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <select 
                      value={newStaffShift}
                      onChange={(e) => setNewStaffShift(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="morning">Manhã</option>
                      <option value="afternoon">Tarde</option>
                      <option value="oncall">Plantonista</option>
                    </select>
                    <button 
                      onClick={addStaff}
                      className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {staff.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            s.shift === 'morning' ? 'bg-emerald-400' : 
                            s.shift === 'afternoon' ? 'bg-indigo-400' : 
                            'bg-amber-400'
                          }`} />
                          <span className="font-semibold text-slate-700">{s.name}</span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-200 rounded text-slate-500">
                            {shiftLabels[s.shift]}
                          </span>
                        </div>
                        <button onClick={() => deleteStaff(s.id)} className="text-rose-400 hover:text-rose-600 p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Sector Management */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Gerenciar Setores</h3>
                  <div className="flex gap-2 mb-6">
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        placeholder="Nome do setor"
                        value={newSectorName}
                        onChange={(e) => setNewSectorName(e.target.value)}
                        list="sector-suggestions"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <datalist id="sector-suggestions">
                        {Array.from(new Set(sectors.map(s => s.name))).map(name => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>
                    <select 
                      value={selectedStaffForSector}
                      onChange={(e) => setSelectedStaffForSector(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">Vincular a...</option>
                      {staff.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({shiftLabels[s.shift]})</option>
                      ))}
                    </select>
                    <button 
                      onClick={addSector}
                      className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sectors.map(sec => {
                      const owner = staff.find(s => s.id === sec.staff_id);
                      return (
                        <div key={sec.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 truncate">{sec.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold truncate">Vínculo: {owner?.name || 'Ninguém'}</p>
                          </div>
                          <button onClick={() => deleteSector(sec.id)} className="text-rose-400 hover:text-rose-600 p-1 flex-shrink-0">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                >
                  Concluído
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-slate-400 text-sm">
        <p>© 2026 Epiviu - Sistema de Gestão Epidemiológica</p>
        <p className="mt-1 italic">Desenvolvido para supervisão de visitas hospitalares.</p>
      </footer>
    </div>
  );
}
