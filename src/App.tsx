import React, { useState, useMemo, useCallback } from 'react';
import { 
  Trophy, 
  Calendar, 
  Home, 
  ChevronDown, 
  User, 
  TrendingUp, 
  ChevronRight,
  Vote,
  Settings,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Group, ViewType, Match, StandingEntry } from './types';
import { GIRONI, MOCK_STANDINGS, MOCK_MATCHES, MOCK_DATA_VERSION } from './mockData';

export default function App() {
  const [selectedGroup, setSelectedGroup] = useState<Group>(GIRONI[0]);
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [parseStatus, setParseStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // State for data (initialized with mock data or localStorage)
  const [allStandings, setAllStandings] = useState<Record<string, StandingEntry[]>>(() => {
    const savedVersion = localStorage.getItem('dr3_data_version');
    if (savedVersion !== MOCK_DATA_VERSION) {
      localStorage.setItem('dr3_data_version', MOCK_DATA_VERSION);
      localStorage.removeItem('dr3_standings');
      localStorage.removeItem('dr3_matches');
      return MOCK_STANDINGS;
    }
    const saved = localStorage.getItem('dr3_standings');
    const parsed = saved ? JSON.parse(saved) : {};
    return { ...MOCK_STANDINGS, ...parsed };
  });
  
  const [allMatches, setAllMatches] = useState<Record<string, Match[]>>(() => {
    const savedVersion = localStorage.getItem('dr3_data_version');
    if (savedVersion !== MOCK_DATA_VERSION) {
      return MOCK_MATCHES;
    }
    const saved = localStorage.getItem('dr3_matches');
    const parsed = saved ? JSON.parse(saved) : {};
    return { ...MOCK_MATCHES, ...parsed };
  });

  // Persistence effects
  React.useEffect(() => {
    localStorage.setItem('dr3_standings', JSON.stringify(allStandings));
  }, [allStandings]);

  React.useEffect(() => {
    localStorage.setItem('dr3_matches', JSON.stringify(allMatches));
  }, [allMatches]);

  const standings = useMemo(() => allStandings[selectedGroup.id] || [], [allStandings, selectedGroup]);
  const matches = useMemo(() => allMatches[selectedGroup.id] || [], [allMatches, selectedGroup]);

  const finishedMatches = useMemo(() => 
    matches.filter(m => m.status === 'finished')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [matches]
  );

  const nextMatchday = useMemo(() => {
    const scheduled = matches.filter(m => m.status === 'scheduled');
    if (scheduled.length === 0) return null;
    return Math.min(...scheduled.map(m => m.matchday || 999));
  }, [matches]);

  const upcomingMatches = useMemo(() => {
    if (nextMatchday && nextMatchday !== 999) {
      return matches.filter(m => m.status === 'scheduled' && m.matchday === nextMatchday);
    }
    return matches.filter(m => m.status === 'scheduled').slice(0, 5);
  }, [matches, nextMatchday]);

  const handleParse = useCallback(() => {
    if (!rawText.trim()) return;

    try {
      const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const newStandings: StandingEntry[] = [];
      const newMatches: Match[] = [];

      lines.forEach((line, index) => {
        // Try to parse standings line: Team Name PT G V P
        // Example: Fortitudo Bologna 24 12 12 0
        const standingMatch = line.match(/^(.*?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
        if (standingMatch) {
          const [_, teamName, pt, g, v, p] = standingMatch;
          newStandings.push({
            teamId: `parsed-${index}`,
            teamName: teamName.trim(),
            points: parseInt(pt),
            played: parseInt(g),
            won: parseInt(v),
            lost: parseInt(p),
            pointsFor: 0,
            pointsAgainst: 0
          });
        }

        // Try to parse results line: Team A - Team B 82 - 75
        const resultMatch = line.match(/^(.*?)\s*-\s*(.*?)\s+(\d+)\s*-\s*(\d+)/);
        if (resultMatch) {
          const [_, home, away, hScore, aScore] = resultMatch;
          newMatches.push({
            id: `m-parsed-${index}`,
            homeTeamId: home.trim(),
            awayTeamId: away.trim(),
            homeScore: parseInt(hScore),
            awayScore: parseInt(aScore),
            date: new Date().toISOString().split('T')[0],
            time: '20:30',
            status: 'finished',
            mvpVotes: 0
          });
        }
      });

      if (newStandings.length > 0) {
        setAllStandings(prev => ({ ...prev, [selectedGroup.id]: newStandings }));
      }
      if (newMatches.length > 0) {
        setAllMatches(prev => ({ ...prev, [selectedGroup.id]: [...newMatches, ...(allMatches[selectedGroup.id] || [])] }));
      }

      setParseStatus('success');
      setRawText('');
      setTimeout(() => setParseStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setParseStatus('error');
      setTimeout(() => setParseStatus('idle'), 3000);
    }
  }, [rawText, selectedGroup.id, allMatches]);

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <header className="espn-header-dark sticky top-0 z-50 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold tracking-tighter italic">
              DR3 <span className="text-espn-red">ER</span> HUB
            </h1>
            <button 
              onClick={() => setIsGroupMenuOpen(!isGroupMenuOpen)}
              className="flex items-center text-xs font-semibold text-zinc-400 mt-0.5 hover:text-white transition-colors"
            >
              {selectedGroup.name}
              <ChevronDown size={14} className={`ml-1 transition-transform ${isGroupMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 cursor-pointer" onClick={() => setActiveView('admin')}>
            <User size={20} className="text-zinc-400" />
          </div>
        </div>

        {/* Group Selector Dropdown */}
        <AnimatePresence>
          {isGroupMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 top-full bg-espn-dark border-t border-zinc-800 shadow-2xl overflow-hidden"
            >
              <div className="max-w-2xl mx-auto py-2">
                {GIRONI.map(g => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGroup(g);
                      setIsGroupMenuOpen(false);
                    }}
                    className={`w-full text-left px-6 py-3 text-sm font-bold transition-colors ${
                      selectedGroup.id === g.id ? 'text-espn-red bg-zinc-900' : 'text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {activeView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              {/* Top Section: Recent Results Preview */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500">Ultimi Risultati</h2>
                  <button onClick={() => setActiveView('results')} className="text-xs font-bold text-espn-blue flex items-center">
                    Tutti <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {finishedMatches.slice(0, 3).map(match => (
                    <MatchCard key={match.id} match={match} compact />
                  ))}
                </div>
              </section>

              {/* Standings Preview */}
              <section className="espn-card">
                <div className="bg-zinc-900 text-white px-4 py-2 flex justify-between items-center">
                  <h2 className="text-xs font-black uppercase tracking-widest">Classifica {selectedGroup.name}</h2>
                  <TrendingUp size={16} className="text-espn-red" />
                </div>
                <div className="p-0">
                  <StandingsTable entries={standings.slice(0, 4)} compact />
                  <button 
                    onClick={() => setActiveView('standings')}
                    className="w-full py-3 text-xs font-bold text-zinc-500 border-t border-zinc-100 hover:bg-zinc-50 transition-colors"
                  >
                    Vedi Classifica Completa
                  </button>
                </div>
              </section>

              {/* Upcoming Matches */}
              {upcomingMatches.length > 0 && (
                <section>
                  <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-3">
                    {nextMatchday && nextMatchday !== 999 ? `Prossimo Turno (${nextMatchday}ª)` : 'Prossime Partite'}
                  </h2>
                  <div className="space-y-3">
                    {upcomingMatches.map(match => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {activeView === 'standings' && (
            <motion.div
              key="standings"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <h2 className="text-xl font-extrabold mb-4">Classifica Completa</h2>
              <div className="espn-card">
                <StandingsTable entries={standings} />
              </div>
            </motion.div>
          )}

          {activeView === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8"
            >
              {Object.entries(
                matches.reduce((acc, match) => {
                  const day = match.matchday || 0;
                  if (!acc[day]) acc[day] = [];
                  acc[day].push(match);
                  return acc;
                }, {} as Record<number, Match[]>)
              )
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([day, dayMatches]) => (
                  <div key={day} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-zinc-200"></div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                        {day === '0' ? 'Altre Partite' : `${day}ª Giornata`}
                      </h3>
                      <div className="h-px flex-1 bg-zinc-200"></div>
                    </div>
                    <div className="space-y-3">
                      {(dayMatches as Match[])
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(match => (
                          <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                  </div>
                ))}
            </motion.div>
          )}

          {activeView === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-extrabold mb-4 flex items-center">
                <Settings className="mr-2" /> Admin Panel
              </h2>
              
              <div className="espn-card p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-2">Playbasket Parser</h3>
                  <p className="text-xs text-zinc-400 mb-4">Incolla qui il testo copiato dalle tabelle di Playbasket per aggiornare i dati.</p>
                </div>
                
                <textarea 
                  className="w-full h-48 p-3 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-espn-blue outline-none"
                  placeholder="Incolla qui..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                ></textarea>
                
                <button 
                  onClick={handleParse}
                  disabled={!rawText.trim()}
                  className={`w-full py-3 rounded-lg font-bold flex items-center justify-center transition-colors ${
                    parseStatus === 'success' ? 'bg-emerald-500 text-white' : 
                    parseStatus === 'error' ? 'bg-espn-red text-white' :
                    'bg-espn-dark text-white hover:bg-zinc-900 disabled:opacity-50'
                  }`}
                >
                  {parseStatus === 'success' ? (
                    <><CheckCircle2 size={18} className="mr-2" /> Dati Aggiornati!</>
                  ) : parseStatus === 'error' ? (
                    'Errore nel parsing'
                  ) : (
                    <><Upload size={18} className="mr-2" /> Elabora Dati</>
                  )}
                </button>

                <div className="pt-4 border-t border-zinc-100 mt-4">
                  <button 
                    onClick={() => {
                      if (window.confirm('Sei sicuro di voler resettare tutti i dati ai valori predefiniti? Le modifiche manuali andranno perse.')) {
                        localStorage.removeItem('dr3_standings');
                        localStorage.removeItem('dr3_matches');
                        setAllStandings(MOCK_STANDINGS);
                        setAllMatches(MOCK_MATCHES);
                        setParseStatus('success');
                        setTimeout(() => setParseStatus('idle'), 2000);
                      }
                    }}
                    className="w-full py-2 text-xs font-bold text-espn-red border border-espn-red/20 rounded-lg hover:bg-espn-red/5 transition-colors"
                  >
                    Resetta ai Dati Predefiniti
                  </button>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex items-start">
                <CheckCircle2 className="text-emerald-500 mr-3 shrink-0" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Suggerimento</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Il parser riconosce automaticamente i nomi delle squadre e i punteggi separati da trattino o spazi.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-6 py-3 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <NavButton 
            active={activeView === 'home'} 
            onClick={() => setActiveView('home')} 
            icon={<Home size={22} />} 
            label="Home" 
          />
          <NavButton 
            active={activeView === 'standings'} 
            onClick={() => setActiveView('standings')} 
            icon={<Trophy size={22} />} 
            label="Classifica" 
          />
          <NavButton 
            active={activeView === 'results'} 
            onClick={() => setActiveView('results')} 
            icon={<Calendar size={22} />} 
            label="Risultati" 
          />
        </div>
      </nav>
    </div>
  );
}

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  key?: React.Key;
}

function NavButton({ active, onClick, icon, label }: NavButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center space-y-1 transition-colors ${active ? 'text-espn-red' : 'text-zinc-400'}`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

interface StandingsTableProps {
  entries: StandingEntry[];
  compact?: boolean;
  key?: React.Key;
}

function StandingsTable({ entries, compact = false }: StandingsTableProps) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="bg-zinc-50 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
          <th className="px-4 py-2 w-10">Pos</th>
          <th className="py-2">Squadra</th>
          <th className="px-3 py-2 text-center">PT</th>
          {!compact && (
            <>
              <th className="px-3 py-2 text-center">G</th>
              <th className="px-3 py-2 text-center">V</th>
              <th className="px-3 py-2 text-center">P</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, idx) => (
          <tr key={entry.teamId} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors">
            <td className="px-4 py-3 text-sm font-bold text-zinc-400">{idx + 1}</td>
            <td className="py-3 text-sm font-bold truncate max-w-[120px]">{entry.teamName}</td>
            <td className="px-3 py-3 text-sm font-black text-center text-espn-blue">{entry.points}</td>
            {!compact && (
              <>
                <td className="px-3 py-3 text-sm font-medium text-center">{entry.played}</td>
                <td className="px-3 py-3 text-sm font-medium text-center text-emerald-600">{entry.won}</td>
                <td className="px-3 py-3 text-sm font-medium text-center text-espn-red">{entry.lost}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface MatchCardProps {
  match: Match;
  compact?: boolean;
  key?: React.Key;
}

function MatchCard({ match, compact = false }: MatchCardProps) {
  const isFinished = match.status === 'finished';
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  if (compact) {
    return (
      <div className="espn-card min-w-[160px] p-3 flex flex-col justify-between h-24">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold truncate max-w-[80px]">{match.homeTeamId.length > 3 ? match.homeTeamId : 'Team A'}</span>
            <span className={`text-xs font-black ${match.homeScore! > match.awayScore! ? 'text-zinc-900' : 'text-zinc-400'}`}>
              {match.homeScore}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold truncate max-w-[80px]">{match.awayTeamId.length > 3 ? match.awayTeamId : 'Team B'}</span>
            <span className={`text-xs font-black ${match.awayScore! > match.homeScore! ? 'text-zinc-900' : 'text-zinc-400'}`}>
              {match.awayScore}
            </span>
          </div>
        </div>
        <div className="text-[10px] font-bold text-zinc-400 uppercase">FINALE</div>
      </div>
    );
  }

  return (
    <div className="espn-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          {match.matchday && `${match.matchday}ª Giornata • `}{match.date} • {match.time}
        </div>
        {isFinished && (
          <div className="bg-zinc-100 text-zinc-600 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
            Finale
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center font-black text-zinc-400 text-xs">
            {match.homeTeamId.length <= 2 ? match.homeTeamId : getInitials(match.homeTeamId)}
          </div>
          <span className="text-sm font-bold leading-tight">{match.homeTeamId.length > 3 ? match.homeTeamId : 'Squadra Casa'}</span>
        </div>

        <div className="flex flex-col items-center">
          {isFinished ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black">{match.homeScore}</span>
              <span className="text-zinc-300 font-bold">-</span>
              <span className="text-2xl font-black">{match.awayScore}</span>
            </div>
          ) : (
            <div className="text-lg font-black text-espn-blue">VS</div>
          )}
        </div>

        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center font-black text-zinc-400 text-xs">
            {match.awayTeamId.length <= 2 ? match.awayTeamId : getInitials(match.awayTeamId)}
          </div>
          <span className="text-sm font-bold leading-tight">{match.awayTeamId.length > 3 ? match.awayTeamId : 'Squadra Ospite'}</span>
        </div>
      </div>

      {isFinished && (
        <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between items-center">
          <div className="flex items-center text-xs font-bold text-zinc-500">
            <Vote size={14} className="mr-1 text-espn-red" />
            {match.mvpVotes} voti MVP
          </div>
          <button className="text-xs font-bold text-espn-blue bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
            Vota MVP
          </button>
        </div>
      )}
    </div>
  );
}
