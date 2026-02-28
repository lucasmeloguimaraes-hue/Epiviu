import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, User, Eye, Plus, Trash2, MapPin, 
  AlertCircle, CheckCircle2, Settings, X, Calendar, Clock, Sun, Moon, Search
} from 'lucide-react';

interface Staff {
  id: number;
  name: string;
  shift: 'morning' | 'afternoon' | 'oncall';
}

interface Sector {
  id: number;
  name: string;
  staff_id: number;
}

interface MissedVisit {
  sector_id: number;
  visit_date: string;
}

interface DashboardProps {
  user: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [missedToday, setMissedToday] = useState<number[]>([]);
  const [missedMonth, setMissedMonth] = useState<MissedVisit[]>([]);
  const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon' | 'oncall'>('morning');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Form states
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffShift, setNewStaffShift] = useState<'morning' | 'afternoon' | 'oncall'>('morning');
  const [newSectorName, setNewSectorName] = useState("");
  const [selectedStaffForSector, setSelectedStaffForSector] = useState<number | "">("");

  const fetchData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const { error: staffError, data: staffData } = await supabase.from('staff').select('*').order('name');
      if (staffError) throw staffError;
      setStaff(staffData || []);

      const { data: sectorsData } = await supabase.from('sectors').select('*').order('name');
      setSectors(sectorsData || []);

      const today = new Date().toISOString().split('T')[0];
      const { data: missedTodayData } = await supabase
        .from('missed_visits')
        .select('sector_id')
        .eq('visit_date', today);
      setMissedToday(missedTodayData?.map(m => m.sector_id) || []);

      // Monthly data
      const firstDay = new Date();
      firstDay.setDate(1);
      const firstDayStr = firstDay.toISOString().split('T')[0];
      const { data: missedMonthData } = await supabase
        .from('missed_visits')
        .select('sector_id, visit_date')
        .gte('visit_date', firstDayStr);
      setMissedMonth(missedMonthData || []);

    } catch (err: any) {
      setDbError(err.message || "Erro de conexão com o banco de dados.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const seedDatabase = async () => {
    if (!confirm("Deseja carregar os dados iniciais da planilha? Isso irá inserir a equipe e os setores padrão no banco de dados.")) return;
    setIsSeeding(true);
    try {
      const morningStaff = [
        { name: 'Nayana', shift: 'morning', sectors: ['Sala Verde', 'EP', 'UTI 3', 'UC1', 'Necrotério', 'P3', 'P6', 'P9', 'P11(229,230,231,232)'] },
        { name: 'Cleonice', shift: 'morning', sectors: ['Sala Vermelha', 'UTI 1', 'UTI 4', 'UC2', 'P1', 'P4', 'P7', 'P11 (236,237, LEITOS EXTRAS)'] },
        { name: 'Plantonista Manhã', shift: 'oncall', sectors: ['Sala de Trauma', 'UTI 2', 'UTQ', 'Centro Cirúrgico (CC)', 'P2', 'P5', 'P8'] }
      ];

      const afternoonStaff = [
        { name: 'Juliana', shift: 'afternoon', sectors: ['Sala Verde', 'EP', 'UTI 3', 'UC1', 'Necrotério', 'P3', 'P6', 'P9', 'P11 (233,234,235)'] },
        { name: 'Shirley', shift: 'afternoon', sectors: ['Sala Vermelha', 'UTI 1', 'UTI 4', 'UC2', 'P1', 'P4', 'P7', 'P11  (238,239)'] },
        { name: 'Plantonista Tarde', shift: 'oncall', sectors: ['Sala de Trauma', 'UTI 2', 'UTQ', 'Centro Cirúrgico (CC)', 'P2', 'P5', 'P8'] }
      ];

      const allStaff = [...morningStaff, ...afternoonStaff];

      for (const s of allStaff) {
        const { data: staffMember, error: sErr } = await supabase
          .from('staff')
          .insert([{ 
            name: s.name, 
            shift: s.shift,
            user_id: user.id 
          }])
          .select()
          .single();
        
        if (sErr) throw sErr;

        const sectorInserts = s.sectors.map(name => ({
          name,
          staff_id: staffMember.id,
          user_id: user.id
        }));

        const { error: secErr } = await supabase.from('sectors').insert(sectorInserts);
        if (secErr) throw secErr;
      }

      alert("Dados da planilha carregados com sucesso!");
      fetchData();
    } catch (err: any) {
      alert("Erro ao carregar dados: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const addStaff = async () => {
    if (!newStaffName) return;
    const { error } = await supabase.from('staff').insert([{ 
      name: newStaffName, 
      shift: newStaffShift,
      user_id: user.id 
    }]);
    if (!error) {
      setNewStaffName("");
      fetchData();
    }
  };

  const deleteStaff = async (id: number) => {
    if (!confirm("Excluir funcionária e todos os seus setores vinculados?")) return;
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (!error) fetchData();
  };

  const addSector = async () => {
    if (!newSectorName || !selectedStaffForSector) return;
    const { error } = await supabase.from('sectors').insert([{ 
      name: newSectorName, 
      staff_id: selectedStaffForSector,
      user_id: user.id
    }]);
    if (!error) {
      setNewSectorName("");
      fetchData();
    }
  };

  const deleteSector = async (id: number) => {
    if (!confirm("Excluir este setor?")) return;
    const { error } = await supabase.from('sectors').delete().eq('id', id);
    if (!error) fetchData();
  };

  const toggleMissed = async (sectorId: number) => {
    const today = new Date().toISOString().split('T')[0];
    const isMissed = missedToday.includes(sectorId);

    if (isMissed) {
      await supabase.from('missed_visits')
        .delete()
        .eq('sector_id', sectorId)
        .eq('visit_date', today)
        .eq('user_id', user.id);
      setMissedToday(prev => prev.filter(id => id !== sectorId));
      setMissedMonth(prev => prev.filter(m => !(m.sector_id === sectorId && m.visit_date === today)));
    } else {
      await supabase.from('missed_visits').insert([{ 
        sector_id: sectorId, 
        visit_date: today,
        user_id: user.id
      }]);
      setMissedToday(prev => [...prev, sectorId]);
      setMissedMonth(prev => [...prev, { sector_id: sectorId, visit_date: today }]);
    }
  };

  // Autocomplete logic for sectors
  const existingSectorNames = useMemo(() => {
    return Array.from(new Set(sectors.map(s => s.name)));
  }, [sectors]);

  const sectorSuggestions = useMemo(() => {
    if (!newSectorName || existingSectorNames.includes(newSectorName)) return [];
    return existingSectorNames.filter(name => 
      name.toLowerCase().startsWith(newSectorName.toLowerCase())
    ).slice(0, 5);
  }, [newSectorName, existingSectorNames]);

  const filteredStaff = staff.filter(s => {
    if (selectedShift === 'oncall') return s.shift === 'oncall';
    return s.shift === selectedShift || s.shift === 'oncall';
  });

  const todayStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  // Summary calculations
  const totalSectorsCount = sectors.length;
  const missedTodayCount = missedToday.length;
  const visitedTodayCount = totalSectorsCount - missedTodayCount;

  // Monthly summary: we calculate average or totals. User asked for "Setores, Visitados e Pendente".
  // For monthly, let's assume it's the sum of all days in the month so far.
  const daysInMonthSoFar = new Set(missedMonth.map(m => m.visit_date)).size || 1;
  const totalPotentialVisits = totalSectorsCount * daysInMonthSoFar;
  const totalMissedMonth = missedMonth.length;
  const totalVisitedMonth = Math.max(0, totalPotentialVisits - totalMissedMonth);

  if (loading && staff.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Carregando Epiviu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <Eye size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Epiviu</h1>
              <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-widest">
                <Calendar size={10} /> {todayStr}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(true)} 
              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="Configurações"
            >
              <Settings size={22} />
            </button>
            <button 
              onClick={handleSignOut} 
              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {dbError && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Erro de Banco de Dados</p>
              <p className="text-sm opacity-90">{dbError}</p>
            </div>
          </div>
        )}

        {/* Shift Selector */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-10 w-fit mx-auto">
          <button 
            onClick={() => setSelectedShift('morning')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedShift === 'morning' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Sun size={18} /> Manhã
          </button>
          <button 
            onClick={() => setSelectedShift('afternoon')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedShift === 'afternoon' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Moon size={18} /> Tarde
          </button>
          <button 
            onClick={() => setSelectedShift('oncall')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedShift === 'oncall' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Clock size={18} /> Plantonista
          </button>
        </div>

        {/* Staff List */}
        <div className="space-y-8">
          {filteredStaff.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <User size={40} className="text-slate-200" />
              </div>
              <p className="text-slate-400 font-bold text-lg">Nenhuma funcionária cadastrada para este turno.</p>
              <button 
                onClick={() => setShowSettings(true)} 
                className="mt-4 text-indigo-600 font-black hover:underline flex items-center gap-2 mx-auto"
              >
                <Plus size={18} /> Adicionar Equipe
              </button>
            </div>
          ) : (
            filteredStaff.map(person => (
              <motion.div 
                key={person.id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="px-8 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                      {person.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg">{person.name}</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                        {person.shift === 'oncall' ? 'Plantonista' : person.shift === 'morning' ? 'Turno Manhã' : 'Turno Tarde'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sectors.filter(s => s.staff_id === person.id).map(sector => {
                    const isMissed = missedToday.includes(sector.id);
                    return (
                      <button 
                        key={sector.id} 
                        onClick={() => toggleMissed(sector.id)} 
                        className={`group flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 transform active:scale-[0.98] ${
                          isMissed 
                            ? 'bg-rose-50 border-rose-200 text-rose-800 shadow-inner' 
                            : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg transition-colors ${isMissed ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                            <MapPin size={20} />
                          </div>
                          <span className="font-bold text-left leading-tight">{sector.name}</span>
                        </div>
                        <div className="flex-shrink-0">
                          {isMissed ? (
                            <div className="bg-rose-500 text-white p-1 rounded-full shadow-lg shadow-rose-200">
                              <AlertCircle size={20} />
                            </div>
                          ) : (
                            <div className="bg-slate-50 text-slate-200 p-1 rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-200 transition-colors">
                              <CheckCircle2 size={20} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Summaries */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Summary */}
          <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl border border-slate-800 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />
            <h3 className="text-xl font-black mb-8 flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                <Clock size={20} />
              </div>
              Resumo do Dia
            </h3>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-2">Setores</p>
                <p className="text-4xl font-black">{totalSectorsCount}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-2">Visitados</p>
                <p className="text-4xl font-black text-emerald-400">{visitedTodayCount}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-2">Pendente</p>
                <p className="text-4xl font-black text-rose-500">{missedTodayCount}</p>
              </div>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="p-8 bg-white rounded-[2.5rem] text-slate-900 shadow-xl border border-slate-200 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-all duration-700" />
            <h3 className="text-xl font-black mb-8 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                <Calendar size={20} />
              </div>
              Resumo de {currentMonthName}
            </h3>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-2">Total</p>
                <p className="text-4xl font-black text-slate-800">{totalPotentialVisits}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-2">Visitados</p>
                <p className="text-4xl font-black text-emerald-600">{totalVisitedMonth}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-2">Pendente</p>
                <p className="text-4xl font-black text-rose-600">{totalMissedMonth}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowSettings(false)} 
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="relative bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-xl text-white">
                    <Settings size={20} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gerenciamento</h2>
                </div>
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="p-2.5 hover:bg-white hover:shadow-md rounded-2xl text-slate-400 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-12">
                {/* Carga Inicial */}
                <section className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
                  <h3 className="text-sm font-black text-indigo-900 mb-2">Carga Inicial de Dados</h3>
                  <p className="text-xs text-indigo-700 mb-4 font-medium leading-relaxed">Clique no botão abaixo para alimentar o banco de dados automaticamente com a equipe e os setores da planilha.</p>
                  <button 
                    onClick={seedDatabase}
                    disabled={isSeeding}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                  >
                    {isSeeding ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={18} />}
                    <span>Alimentar Banco com Planilha</span>
                  </button>
                </section>

                {/* Staff Management */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Equipe</h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase">Total: {staff.length}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex-1 relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Nome da Funcionária" 
                        value={newStaffName} 
                        onChange={e => setNewStaffName(e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900" 
                      />
                    </div>
                    <select 
                      value={newStaffShift} 
                      onChange={e => setNewStaffShift(e.target.value as any)} 
                      className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none text-slate-900 focus:ring-4 focus:ring-indigo-500/10"
                    >
                      <option value="morning">Manhã</option>
                      <option value="afternoon">Tarde</option>
                      <option value="oncall">Plantonista</option>
                    </select>
                    <button 
                      onClick={addStaff} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={20} /> Adicionar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {staff.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-700 text-sm">{s.name}</span>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.shift}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteStaff(s.id)} 
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Sector Management */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Setores</h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase">Total: {sectors.length}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Nome do Setor" 
                        value={newSectorName} 
                        onChange={e => setNewSectorName(e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900" 
                      />
                      {/* Autocomplete Suggestions */}
                      {sectorSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden py-1">
                          {sectorSuggestions.map(suggestion => (
                            <button
                              key={suggestion}
                              onClick={() => setNewSectorName(suggestion)}
                              className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <select 
                      value={selectedStaffForSector} 
                      onChange={e => setSelectedStaffForSector(Number(e.target.value))} 
                      className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none text-slate-900 focus:ring-4 focus:ring-indigo-500/10"
                    >
                      <option value="">Vincular a...</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button 
                      onClick={addSector} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={20} /> Adicionar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sectors.map(sec => (
                      <div key={sec.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                            <MapPin size={14} />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-700 truncate block max-w-[150px]">{sec.name}</span>
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                              {staff.find(s => s.id === sec.staff_id)?.name || 'Sem vínculo'}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteSector(sec.id)} 
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
