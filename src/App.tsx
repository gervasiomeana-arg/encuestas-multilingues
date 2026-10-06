import React, { useState, useEffect } from 'react';
import { 
  getAllSurveys, 
  getAllResponses, 
  saveSurvey,
  saveMultipleResponses,
  deleteSurvey
} from './firebaseService';
import { Survey, SurveyResponse, COUNTRIES } from './types';
import { MAURITANIA_SURVEY, MAURITANIA_SURVEY_II } from './utils/mauritaniaDefaultSurvey';
import { INITIAL_MAURITANIA_RESPONSES } from './utils/mauritaniaResponsesData';
import Header from './components/Header';
import UserDashboard from './components/UserDashboard';
import AdminSurveyCreator from './components/AdminSurveyCreator';
import AdminReports from './components/AdminReports';
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
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Core synchronized database lists
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  
  // Loading indicator states
  const [loading, setLoading] = useState(true);

  // State to track whether the user is answering a survey beyond step 0
  const [isAnsweringSurvey, setIsAnsweringSurvey] = useState(false);

  // Load all datastores on component mount safely without destructive wipe
  const syncData = async () => {
    try {
      const allSurveys = await getAllSurveys();
      
      // Ensure Mauritania Survey II (survey_mauritania_dos) exists in Firestore
      const secondarySurvey = allSurveys.find(s => s.id === 'survey_mauritania_dos');
      if (!secondarySurvey) {
        console.log("Seeding Mauritania Survey II to Firestore...");
        await saveSurvey(MAURITANIA_SURVEY_II);
      }

      // Reload fresh datasets from Firestore
      const updatedSurveys = await getAllSurveys();
      const allResponses = await getAllResponses();
      setSurveys(updatedSurveys);
      setResponses(allResponses);
    } catch (error) {
      console.error("Error synchronizing active datasets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncData();
  }, []);

  // Quick action to seed demo surveys if database is empty on start
  const handleSeedMockSurveys = async () => {
    setLoading(true);
    try {
      const mockSurvey: Survey = {
        id: 'survey_seed_ciudadano',
        title: 'Encuesta de Atención al Ciudadano',
        description: 'Relevamiento sobre la calidad de atención y tiempos de espera en oficinas gubernamentales.',
        targetCountry: 'Argentina',
        targetLanguage: 'es',
        createdAt: new Date().toISOString(),
        createdBy: 'seeder',
        questions: [
          {
            id: 'c1',
            text: '¿Cómo calificaría la atención general recibida por nuestro personal?',
            type: 'rating',
            required: true
          },
          {
            id: 'c2',
            text: '¿Logró resolver su trámite o consulta en su primera visita?',
            type: 'boolean',
            required: true
          },
          {
            id: 'c3',
            text: '¿Qué canales de contacto prefiere utilizar habitualmente?',
            type: 'multiple_choice',
            options: ['Atención Presencial', 'Llamada Telefónica', 'Portal Web Oficial', 'Mensajería Whatsapp'],
            required: false
          },
          {
            id: 'c4',
            text: 'Por favor, indíquenos alguna sugerencia para seguir mejorando nuestro portal.',
            type: 'text',
            required: true
          }
        ],
        translations: {
          en: {
            title: 'Citizen Support Quality Survey',
            description: 'Survey on service quality and waiting times in government offices.',
            questions: {
              c1: { text: 'How would you rate the overall support received by our staff?' },
              c2: { text: 'Did you manage to resolve your procedure or inquiry on your first visit?' },
              c3: { 
                text: 'Which contact channels do you usually prefer to use?', 
                options: ['In-person Attendance', 'Telephone Call', 'Official Web Portal', 'Whatsapp Messaging'] 
              },
              c4: { text: 'Please, write down any request or suggestion to keep improving our portal.' }
            }
          }
        }
      };

      await saveSurvey(mockSurvey);
      await syncData();
    } catch (err) {
      console.error("Error seeding mock items:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-600 selection:text-white" id="root-viewport">
      
      {/* HEADER COMPONENT */}
      <div className="no-print">
        <Header
          viewMode={viewMode}
          onChangeViewMode={(mode) => setViewMode(mode)}
          totalSurveys={surveys.length}
          totalResponses={responses.length}
        />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="scrolling-main-wrapper">
        {loading ? (
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

              const activeDisplayedSurveys = displayedSurveys.length > 0 ? displayedSurveys : surveys;

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
                    onSurveySubmitted={syncData}
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
                    <p className="text-xs text-indigo-200/80">Ingresa la clave de acceso para continuar</p>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      setAdminError('');
                      if (adminPassword === 'JULI123') {
                        setIsAdminAuthenticated(true);
                        setAdminPassword('');
                      } else {
                        setAdminError('Clave de acceso incorrecta');
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
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-all text-center cursor-pointer shadow-sm shadow-indigo-100"
                      >
                        Ingresar
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
                        onClick={() => setIsAdminAuthenticated(false)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                        title="Cerrar sesión de administrador"
                      >
                        <span>Cerrar Sesión</span>
                      </button>
                      
                      {/* Seed Mock Action if Database gets fully wiped or is fresh empty */}
                      {surveys.length === 0 && (
                        <button
                          onClick={handleSeedMockSurveys}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-100"
                        >
                          <Zap className="w-3.5 h-3.5 shrink-0" />
                          <span>Cargar Encuesta Ejemplo</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub Tab Navigation Selection */}
                  <div className="no-print flex border-b border-slate-200">
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
