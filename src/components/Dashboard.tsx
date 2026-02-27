import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Microscope, Plus, Trash2, MapPin, 
  AlertCircle, CheckCircle2, Settings, X, Calendar, Clock, Sun, Moon
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

export const Dashboard: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [missedIds, setMissedIds] = useState<number[]>([]);
  const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon'>('morning');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Form states
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffShift, setNewStaffShift] = useState<'morning' | 'afternoon' | 'oncall'>('morning');
  const [newSectorName, setNewSectorName] = useState("");
  const [selectedStaffForSector, setSelectedStaffForSector] = useState<number | "">("");

  const seedData = async () => {
    if (!confirm("Isso irá carregar a equipe e os setores padrão da tabela. Continuar?")) return;
    setIsSeeding(true);
    try {
      const morningStaff = [
        { name: 'Nayana', shift: 'morning', sectors: ['Sala Verde', 'EP', 'UTI 3', 'UC1', 'Necrotério', 'P3', 'P6', 'P9', 'P11(229,230,231,232)'] },
        { name: 'Cleonice', shift: 'morning', sectors: ['Sala Vermelha', 'UTI 1', 'UTI 4', 'UC2', 'P1', 'P4', 'P7', 'P11 (236,237, LEITOS EXTRAS)'] },
        { name: 'Plantonista Manhã', shift: 'morning', sectors: ['Sala de Trauma', 'UTI 2', 'UTQ', 'Centro Cirúrgico (CC)', 'P2', 'P5', 'P8'] }
      ];

      const afternoonStaff = [
        { name: 'Juliana', shift: 'afternoon', sectors: ['Sala Verde', 'EP', 'UTI 3', 'UC1', 'Necrotério', 'P3', 'P6', 'P9', 'P11 (233,234,235)'] },
        { name: 'Shirley', shift: 'afternoon', sectors: ['Sala Vermelha', 'UTI 1', 'UTI 4', 'UC2', 'P1', 'P4', 'P7', 'P11  (238,239)'] },
        { name: 'Plantonista Tarde', shift: 'afternoon', sectors: ['Sala de Trauma', 'UTI 2', 'UTQ', 'Centro Cirúrgico (CC)', 'P2', 'P5', 'P8'] }
      ];

      const allStaff = [...morningStaff, ...afternoonStaff];

      for (const s of allStaff) {
        const { data: staffMember, error: sErr } = await supabase
          .from('staff')
          .insert([{ name: s.name, shift: s.shift }])
          .select()
          .single();
        
        if (sErr) throw sErr;

        const sectorInserts = s.sectors.map(name => ({
          name,
          staff_id: staffMember.id
        }));

        const { error: secErr } = await supabase.from('sectors').insert(sectorInserts);
        if (secErr) throw secErr;
      }

      alert("Dados carregados com sucesso!");
      fetchData();
    } catch (err: any) {
      alert("Erro ao carregar dados: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const { error: staffError, data: staffData } = await supabase.from('staff').select('*').order('name');
      
      if (staffError) {
        if (staffError.code === '42P01') {
          setDbError("As tabelas ainda não foram criadas no Supabase. Por favor, execute o script SQL no editor do Supabase.");
        } else {
          setDbError(staffError.message);
        }
        return;
      }

      setStaff(staffData || []);

      const { data: sectorsData } = await supabase.from('sectors').select('*').order('name');
      setSectors(sectorsData || []);

      const today = new Date().toISOString().split('T')[0];
      const { data: missedData } = await supabase
        .from('missed_visits')
        .select('sector_id')
        .eq('visit_date', today);
      
      setMissedIds(missedData?.map(m => m.sector_id) || []);
    } catch (err: any) {
      setDbError("Erro de conexão com o banco de dados.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addStaff = async () => {
    if (!newStaffName) return;
    const { error } = await supabase.from('staff').insert([{ name: newStaffName, shift: newStaffShift }]);
    if (!error) {
      setNewStaffName("");
      fetchData();
    }
  };

  const deleteStaff = async (id: number) => {
    if (!confirm("Excluir funcionária e seus setores?")) return;
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (!error) fetchData();
  };

  const addSector = async () => {
    if (!newSectorName || !selectedStaffForSector) return;
    const { error } = await supabase.from('sectors').insert([{ name: newSectorName, staff_id: selectedStaffForSector }]);
    if (!error) {
      setNewSectorName("");
      fetchData();
    }
  };

  const deleteSector = async (id: number) => {
    const { error } = await supabase.from('sectors').delete().eq('id', id);
    if (!error) fetchData();
  };

  const toggleMissed = async (sectorId: number) => {
    const today = new Date().toISOString().split('T')[0];
    const isMissed = missedIds.includes(sectorId);

    if (isMissed) {
      await supabase.from('missed_visits').delete().eq('sector_id', sectorId).eq('visit_date', today);
      setMissedIds(prev => prev.filter(id => id !== sectorId));
    } else {
      await supabase.from('missed_visits').insert([{ sector_id: sectorId, visit_date: today }]);
      setMissedIds(prev => [...prev, sectorId]);
    }
  };

  const filteredStaff = staff.filter(s => s.shift === selectedShift || s.shift === 'oncall');
  const todayStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading && staff.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-200">
              <Microscope size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Epiviu</h1>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1 uppercase tracking-wider">
                <Calendar size={12} /> {todayStr}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {dbError && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Atenção: Problema na conexão</p>
              <p className="text-sm opacity-90">{dbError}</p>
            </div>
          </div>
        )}

        {/* Shift Selector */}
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 mb-8 w-fit mx-auto">
          <button 
            onClick={() => setSelectedShift('morning')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${selectedShift === 'morning' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Sun size={16} /> Manhã
          </button>
          <button 
            onClick={() => setSelectedShift('afternoon')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${selectedShift === 'afternoon' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Moon size={16} /> Tarde
          </button>
        </div>

        {/* Staff List */}
        <div className="space-y-6">
          {filteredStaff.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <User size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-medium">Nenhuma funcionária para este turno.</p>
              <button onClick={() => setShowSettings(true)} className="mt-4 text-indigo-600 font-bold hover:underline">Configurar Equipe</button>
            </div>
          ) : (
            filteredStaff.map(person => (
              <motion.div key={person.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">{person.name.charAt(0)}</div>
                    <div>
                      <h3 className="font-bold text-slate-800">{person.name}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{person.shift === 'oncall' ? 'Plantonista' : 'Fixo'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sectors.filter(s => s.staff_id === person.id).map(sector => {
                    const isMissed = missedIds.includes(sector.id);
                    return (
                      <button key={sector.id} onClick={() => toggleMissed(sector.id)} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isMissed ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-200'}`}>
                        <div className="flex items-center gap-3">
                          <MapPin size={18} className={isMissed ? 'text-rose-500' : 'text-slate-300'} />
                          <span className="font-semibold">{sector.name}</span>
                        </div>
                        {isMissed ? <AlertCircle size={20} className="text-rose-500 animate-pulse" /> : <CheckCircle2 size={20} className="text-slate-100" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="mt-12 p-8 bg-slate-900 rounded-3xl text-white shadow-xl border border-slate-800">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Clock size={20} className="text-indigo-400" /> Resumo do Dia</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-slate-400 text-xs uppercase font-bold mb-1">Setores</p><p className="text-3xl font-bold">{sectors.length}</p></div>
            <div><p className="text-slate-400 text-xs uppercase font-bold mb-1">Visitados</p><p className="text-3xl font-bold text-emerald-400">{sectors.length - missedIds.length}</p></div>
            <div><p className="text-slate-400 text-xs uppercase font-bold mb-1">Pendentes</p><p className="text-3xl font-bold text-rose-500">{missedIds.length}</p></div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Configurações</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-8">
                {/* Carga Inicial */}
                <section className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <h3 className="text-sm font-bold text-indigo-900 mb-2">Carga Inicial de Dados</h3>
                  <p className="text-xs text-indigo-700 mb-4">Clique no botão abaixo para carregar automaticamente a equipe e os setores conforme a tabela padrão.</p>
                  <button 
                    onClick={seedData}
                    disabled={isSeeding}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSeeding ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
                    <span>Carregar Equipe e Setores</span>
                  </button>
                </section>

                {/* Staff Management */}
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Equipe</h3>
                  <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="Nome" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900" />
                    <select value={newStaffShift} onChange={e => setNewStaffShift(e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none text-slate-900">
                      <option value="morning">Manhã</option>
                      <option value="afternoon">Tarde</option>
                      <option value="oncall">Plantonista</option>
                    </select>
                    <button onClick={addStaff} className="bg-indigo-600 text-white p-2 rounded-xl"><Plus size={20} /></button>
                  </div>
                  <div className="space-y-2">
                    {staff.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="font-semibold text-slate-700">{s.name} ({s.shift})</span>
                        <button onClick={() => deleteStaff(s.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Sector Management */}
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Setores</h3>
                  <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="Setor" value={newSectorName} onChange={e => setNewSectorName(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900" />
                    <select value={selectedStaffForSector} onChange={e => setSelectedStaffForSector(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none text-slate-900">
                      <option value="">Vincular a...</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button onClick={addSector} className="bg-indigo-600 text-white p-2 rounded-xl"><Plus size={20} /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sectors.map(sec => (
                      <div key={sec.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-semibold text-slate-700 truncate">{sec.name}</span>
                        <button onClick={() => deleteSector(sec.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
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
