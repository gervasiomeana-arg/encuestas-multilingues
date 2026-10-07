import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { getAllSurveys, getAllResponses, databaseStatus, prepareHistoricalSurveys } from './firebaseService';
import { Survey, SurveyResponse } from './types';
import { loginAdmin, logoutAdmin, watchAdminSession } from './authService';
import Header from './components/Header';
import UserDashboard from './components/UserDashboard';
const AdminSurveyCreator = lazy(() => import('./components/AdminSurveyCreator'));
const AdminReports = lazy(() => import('./components/AdminReports'));
import { 
  Plus, 
  BarChart3, 
  HelpCircle, 
  CornerDownRight, 
  Globe2, 
  ShieldCheck,
  Zap,
  CheckSquare,
  Lock
} from 'lucide-react';

export default function App() {
  // Navigation states
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user');
  const [adminTab, setAdminTab] = useState<'create' | 'reports'>('create');
  
  // Track survey selected for editing/cloning
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);

  // Admin access validation states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Core synchronized database lists
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  
  // Loading indicator states
  const [loading, setLoading] = useState(true);

  // State to track whether the user is answering a survey beyond step 0
  const [isAnsweringSurvey, setIsAnsweringSurvey] = useState(false);

  const [loadError, setLoadError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const prepareInFlight = useRef(false);
  const [prepareMessage, setPrepareMessage] = useState('');
  const storage = databaseStatus();
  const latestSyncId = useRef(0);
  const syncData = useCallback(async () => {
    const syncId = ++latestSyncId.current;
    setLoading(true);
    setLoadError('');
    try {
      // Public sessions never fetch response documents. Opening the app never writes.
      const [allSurveys, allResponses] = await Promise.all([
        getAllSurveys(),
        isAdminAuthenticated ? getAllResponses() : Promise.resolve([])
      ]);
      if (syncId !== latestSyncId.current) return;
      setSurveys(allSurveys);
      setResponses(allResponses);
    } catch (error) {
      if (syncId === latestSyncId.current) {
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la información.');
      }
    } finally {
      if (syncId === latestSyncId.current) {
        setLoading(false);
      }
    }
  }, [isAdminAuthenticated]);

  useEffect(() => {
    let unmounted = false;
    const unsubscribe = watchAdminSession(admin => {
      if (unmounted) return;
      if (!admin) setResponses([]);
      setIsAdminAuthenticated(admin);
    });
    return () => {
      unmounted = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    syncData();
  }, [syncData]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-600 selection:text-white" id="root-viewport">
      
      {/* HEADER COMPONENT */}
      <div className="no-print">
        <Header
          viewMode={viewMode}
          onChangeViewMode={(mode) => setViewMode(mode)}
          totalSurveys={surveys.length}
          totalResponses={isAdminAuthenticated ? responses.length : undefined}
        />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="scrolling-main-wrapper">
        {!storage.configured && <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">{storage.connectionError || 'Estamos preparando el sistema de guardado. Los nuevos envíos aún no están habilitados.'}</div>}
        {storage.warnings.length > 0 && <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">No se pudo consultar toda la información histórica. Los totales son parciales. <button className="underline" onClick={syncData}>Reintentar</button></div>}
        {loadError ? (
          <div role="alert" className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-800">
            <p>{loadError}</p>
            <button onClick={syncData} className="mt-3 underline font-semibold">Reintentar</button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">Sincronizando información con Firebase Cloud...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* VIEW MODE 1: USER PORTAL VIEW */}
            {viewMode === 'user' && (() => {
              const urlParams = new URLSearchParams(window.location.search);
              let urlId = urlParams.get('surveyId') || urlParams.get('id');
              if (!urlId && window.location.hash) {
                const hash = window.location.hash;
                const queryIdx = hash.indexOf('?');
                if (queryIdx !== -1) {
                  const hashParams = new URLSearchParams(hash.substring(queryIdx));
                  urlId = hashParams.get('surveyId') || hashParams.get('id');
                } else {
                  const cleanHash = hash.replace(/^#\/?/, '');
                  if (cleanHash && !['admin', 'reports', 'user'].includes(cleanHash)) {
                    urlId = cleanHash;
                  }
                }
              }
              
              const displayedSurveys = urlId 
                ? surveys.filter(s => s.id === urlId) 
                : surveys;

              const activeDisplayedSurveys = displayedSurveys;
              if (urlId && displayedSurveys.length === 0) return <p role="alert">La encuesta de este enlace no está disponible.</p>;

              return (
                <div id="user-portal-panel" className="space-y-6">
                  
                  {/* Visual Banner introduction */}
                  {!isAnsweringSurvey && (
                    <div className="bg-indigo-950 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-xs border border-indigo-900">
                      <div className="absolute right-0 bottom-0 opacity-10 translate-y-6 translate-x-6">
                        <CheckSquare className="w-64 h-64" />
                      </div>
                      <div className="max-w-2xl relative">
                        <span className="bg-white/10 text-indigo-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md inline-block mb-3 border border-indigo-800/50 backdrop-blur-xs">
                          PORTAL DE LA ENCUESTA
                        </span>
                        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white font-sans uppercase">
                          {activeDisplayedSurveys.length === 1 ? activeDisplayedSurveys[0].title : "PORTAL DE ENCUESTAS"}
                        </h2>
                      </div>
                    </div>
                  )}

                  <UserDashboard 
                    surveys={activeDisplayedSurveys}
                    onActiveStateChange={setIsAnsweringSurvey}
                  />
                </div>
              );
            })()}

            {/* VIEW MODE 2: ADMIN PANEL VIEW */}
            {viewMode === 'admin' && (
              !isAdminAuthenticated ? (
                <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden animate-fade-in" id="admin-auth-lock-card">
                  <div className="p-6 bg-indigo-950 text-white flex flex-col items-center justify-center text-center space-y-2">
                    <div className="p-3 bg-white/10 rounded-full border border-white/25">
                      <Lock className="w-8 h-8 text-indigo-300" />
                    </div>
                    <h3 className="text-xl font-bold">Consola de Administración</h3>
                    <p className="text-xs text-indigo-200/80">Introduce la clave de acceso para continuar</p>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (signingIn) return;
                      setSigningIn(true);
                      setAdminError('');
                      try {
                        await loginAdmin(adminPassword);
                        setAdminPassword('');
                      } catch (err: any) {
                        setAdminError(err?.message || 'Clave de acceso incorrecta. Verifica e intenta nuevamente.');
                      } finally {
                        setSigningIn(false);
                      }
                    }}
                    className="p-6 space-y-4"
                  >
                    {adminError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0 animate-pulse"></span>
                        <span>{adminError}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clave de Acceso</label>
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        placeholder="••••••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono tracking-widest text-sm text-slate-800"
                        autoFocus
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('user');
                          setAdminPassword('');
                          setAdminError('');
                        }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all text-center cursor-pointer"
                      >
                        Volver
                      </button>
                      <button
                        type="submit"
                        disabled={signingIn}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-all text-center cursor-pointer shadow-sm shadow-indigo-100"
                      >
                        {signingIn ? 'Ingresando…' : 'Ingresar'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div id="admin-portal-panel" className="space-y-6">
                  
                  {/* Admin Welcome Jumbotron Header */}
                  <div className="no-print bg-white border border-slate-200 shadow-xs rounded-2xl p-6 text-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Consola de Control Central</span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 mt-1">Panel de Control de Encuestas</h2>
                      <p className="text-xs text-slate-500 mt-1 max-w-xl">
                        Carga y estructura encuestas mediante carga de archivos Word/PDF con Gemini. Monitoriza estadísticas mediante tablas gráficas circulares y barras.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          ++latestSyncId.current;
                          setResponses([]);
                          setIsAdminAuthenticated(false);
                          setEditingSurvey(null);
                          try { await logoutAdmin(); } catch { setLoadError('No se pudo cerrar la sesión. Reintenta.'); }
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                        title="Cerrar sesión de administrador"
                      >
                        <span>Cerrar Sesión</span>
                      </button>
                      

                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-2">
                    <p>Historial antiguo en modo lectura. Todas las encuestas y respuestas nuevas se guardan en la base nueva.</p>
                    <p>Respuestas por origen: históricas {Object.values(storage.origins.responses).filter(o => o === 'histórica').length}, nuevas {Object.values(storage.origins.responses).filter(o => o === 'nueva').length}, coincidentes en ambas {Object.values(storage.origins.responses).filter(o => o === 'ambas').length}.</p>
                    <button disabled={preparing || !storage.configured} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50" onClick={async () => {
                      if (prepareInFlight.current) return;
                      prepareInFlight.current = true; setPreparing(true); setPrepareMessage('');
                      try { const count = await prepareHistoricalSurveys(); setPrepareMessage(`Se prepararon ${count} encuestas nuevas en la base nueva. No se copiaron respuestas ni se modificó el historial.`); await syncData(); }
                      catch (error) { setPrepareMessage(error instanceof Error ? error.message : 'No se pudo preparar.'); }
                      finally { prepareInFlight.current = false; setPreparing(false); }
                    }}>{preparing ? 'Preparando…' : 'Habilitar nuevos envíos para encuestas históricas'}</button>
                    {prepareMessage && <p role="status">{prepareMessage}</p>}
                  </div>
                  {/* Sub Tab Navigation Selection */}
                  <div className="no-print flex flex-col sm:flex-row border-b border-slate-200">
                    <button
                      onClick={() => setAdminTab('create')}
                      className={`pb-3 text-sm font-semibold tracking-wide border-b-2 px-6 transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                        adminTab === 'create'
                          ? 'border-indigo-600 text-indigo-700'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Cargar / Crear Encuestas</span>
                    </button>
                    <button
                      onClick={() => setAdminTab('reports')}
                      className={`pb-3 text-sm font-semibold tracking-wide border-b-2 px-6 transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                        adminTab === 'reports'
                          ? 'border-indigo-600 text-indigo-700'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Informes e Historial</span>
                    </button>
                  </div>

                  {/* Switch Rendered admin panel body */}
                  <Suspense fallback={<p>Cargando panel…</p>}>
                  {adminTab === 'create' ? (
                    <AdminSurveyCreator 
                      onSurveyCreated={syncData} 
                      initialSurvey={editingSurvey}
                      onClearEdit={() => setEditingSurvey(null)}
                    />
                  ) : (
                    <AdminReports 
                      surveys={surveys}
                      responses={responses}
                      onSurveyDeleted={syncData}
                      onResponsesUpdated={syncData}
                      onEditSurvey={(survey) => {
                        setEditingSurvey(survey);
                        setAdminTab('create');
                      }}
                    />
                  )}
                  </Suspense>
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* FOOTER METADATA MARKUP */}
      <footer className="no-print bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400 font-medium" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© 2026 platform. Todos los derechos reservados.</p>
          <p className="font-mono text-[10px] uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            <span>Estable: Cloud Firestore + Gemini Flash 1.5</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
