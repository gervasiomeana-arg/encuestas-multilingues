import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  BarChart3, 
  History, 
  Trash2, 
  Users, 
  Layers, 
  Award, 
  UserCheck, 
  Link, 
  Copy, 
  Check, 
  Edit,
  Download,
  Eye,
  X,
  Printer,
  FileText,
  MapPin,
  ArrowLeft,
  FileDown,
  Loader2,
  Upload,
  Database,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { Survey, SurveyResponse, AVAILABLE_LANGUAGES, SurveyQuestion } from '../types';
import { saveMultipleResponses } from '../firebaseService';
import { ratingAverage, ratingScore } from '../utils/dataProtection';
import { ratingDistribution, surveyReportCSV, resolveResponseSurvey } from '../utils/reportData';
import { 
  normalizeAnswerToSpanish, 
  getQuestionTypeLabelES,
  getSurveyLocalities,
  LocalityItem
} from '../utils/answerTranslator';
import { generateSurveyPDF, GeneratedPDFResult } from '../utils/pdfGenerator';

interface AdminReportsProps {
  surveys: Survey[];
  responses: SurveyResponse[];
  onSurveyDeleted: () => void;
  onEditSurvey: (survey: Survey) => void;
  onResponsesUpdated?: () => void;
}

const COLORS = [
  '#4f46e5', // indigo-600
  '#0284c7', // sky-600
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#6366f1'  // indigo-500
];

export default function AdminReports({ surveys, responses, onSurveyDeleted, onEditSurvey, onResponsesUpdated }: AdminReportsProps) {
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('surveyId') || urlParams.get('id');
    if (paramId && surveys.some(s => s.id === paramId)) {
      return paramId;
    }
    return surveys[0]?.id || '';
  });
  const [selectedLocality, setSelectedLocality] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'analytics' | 'history'>('analytics');
  const [copiedSurveyId, setCopiedSurveyId] = useState<string>('');
  const [viewingResponse, setViewingResponse] = useState<SurveyResponse | null>(null);
  
  // Modals & PDF States
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isScreenReportView, setIsScreenReportView] = useState<boolean>(false);
  const [activePdfPreview, setActivePdfPreview] = useState<GeneratedPDFResult | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string>('');

  // Import responses states
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [importSuccessAlert, setImportSuccessAlert] = useState<string>('');
  const [importErrorAlert, setImportErrorAlert] = useState<string>('');

  // Active survey
  const currentSurvey = surveys.find(s => s.id === selectedSurveyId) || surveys[0];
  const allSurveyResponses = useMemo(() => {
    if (!currentSurvey) return [];
    return responses.filter(r => 
      r.surveyId === currentSurvey.id ||
      (currentSurvey.id === 'survey_mauritania_dos' && r.surveyId === 'survey_mauritania_perfecta') ||
      (currentSurvey.id === 'survey_mauritania_perfecta' && r.surveyId === 'survey_mauritania_dos')
    );
  }, [responses, currentSurvey]);

  // Detect localities available for current survey (e.g. RASD Campamentos vs TTOO Sáhara Ocupado)
  const { question: locationQuestion, localities } = useMemo(() => {
    return getSurveyLocalities(currentSurvey, allSurveyResponses);
  }, [currentSurvey, allSurveyResponses]);

  // Filter responses by selected locality if not 'ALL'
  const filteredResponses = useMemo(() => {
    if (selectedLocality === 'ALL' || !locationQuestion) {
      return allSurveyResponses;
    }
    return allSurveyResponses.filter(res => {
      const rawAns = res.answers[locationQuestion.id];
      if (rawAns === undefined || rawAns === null) return false;
      const normalized = normalizeAnswerToSpanish(rawAns, locationQuestion, currentSurvey);
      if (Array.isArray(normalized)) {
        return normalized.includes(selectedLocality);
      }
      return normalized === selectedLocality;
    });
  }, [allSurveyResponses, selectedLocality, locationQuestion, currentSurvey]);

  // ---------------------------------------------------------------------------------
  // NORMALIZED CHART MATHEMATICAL PREPARATIONS (ALL ANSWERS CONSOLIDATED IN SPANISH)
  // ---------------------------------------------------------------------------------

  const computeChartData = (question: SurveyQuestion) => {
    const counts: Record<string, number> = Object.create(null);
    const questionType = question.type;
    if (questionType === 'rating') return ratingDistribution(filteredResponses.map(response => response.answers[question.id]));
    const options = question.options || [];

    // Initialize canonical Spanish options
    if (questionType === 'boolean') {
      counts['Sí'] = 0;
      counts['No'] = 0;
    } else if (['single_choice', 'multiple_choice'].includes(questionType)) {
      options.forEach(opt => {
        counts[opt] = 0;
      });
    }

    let totalAnswersCount = 0;

    // Populate data with answers converted into clean Spanish for filtered responses
    filteredResponses.forEach(res => {
      const rawAns = res.answers[question.id];
      if (rawAns === undefined || rawAns === null || rawAns === '') return;

      const normalized = normalizeAnswerToSpanish(rawAns, question, currentSurvey);

      if (Array.isArray(normalized)) {
        normalized.forEach(val => {
          if (!val) return;
          counts[val] = (counts[val] || 0) + 1;
          totalAnswersCount++;
        });
      } else {
        const valStr = normalized.toString();
        if (!valStr) return;
        counts[valStr] = (counts[valStr] || 0) + 1;
        totalAnswersCount++;
      }
    });

    if (questionType === 'boolean') {
      const yesVotes = counts['Sí'] || 0;
      const noVotes = counts['No'] || 0;
      const totalBool = yesVotes + noVotes;
      return [
        { 
          name: 'Sí', 
          Votos: yesVotes, 
          porcentaje: totalBool > 0 ? ((yesVotes / totalBool) * 100).toFixed(1) : '0.0' 
        },
        { 
          name: 'No', 
          Votos: noVotes, 
          porcentaje: totalBool > 0 ? ((noVotes / totalBool) * 100).toFixed(1) : '0.0' 
        }
      ];
    } else {
      // General choice options (single_choice, multiple_choice)
      const orderedKeys = options.length > 0 ? options : Object.keys(counts);
      const allKeysSet = new Set([...orderedKeys, ...Object.keys(counts)]);

      return Array.from(allKeysSet).map(optName => {
        const votes = counts[optName] || 0;
        return {
          name: optName,
          Votos: votes,
          porcentaje: totalAnswersCount > 0 ? ((votes / totalAnswersCount) * 100).toFixed(1) : '0.0'
        };
      });
    }
  };

  // Calculate Average score specifically for Rating questions
  const calculateRatingAverage = (questionId: string) => {
    return ratingAverage(filteredResponses.map(res => res.answers[questionId]));
  };

  // ---------------------------------------------------------------------------------
  // PDF GENERATION HANDLERS (VIEW, DOWNLOAD, AND PRINT)
  // ---------------------------------------------------------------------------------

  const handleOpenPdfPreview = () => {
    if (!currentSurvey) return;
    setIsGeneratingPdf(true);
    try {
      const result = generateSurveyPDF({
        survey: currentSurvey,
        filteredResponses,
        allResponsesCount: allSurveyResponses.length,
        selectedLocality,
        computeChartData,
        calculateRatingAverage
      });
      setActivePdfPreview(result);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Hubo un error al generar el archivo PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDirectPdfDownload = () => {
    if (!currentSurvey) return;
    setIsGeneratingPdf(true);
    try {
      const result = generateSurveyPDF({
        survey: currentSurvey,
        filteredResponses,
        allResponsesCount: allSurveyResponses.length,
        selectedLocality,
        computeChartData,
        calculateRatingAverage
      });
      result.download();
      setDownloadSuccessToast(`¡Archivo ${result.filename} descargado!`);
      setTimeout(() => setDownloadSuccessToast(''), 3500);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Hubo un error al descargar el archivo PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Export original values alongside the existing normalization, without writes.
  const handleExportCSV = () => {
    if (!currentSurvey || filteredResponses.length === 0) {
      alert("No hay respuestas registradas para exportar en esta selección.");
      return;
    }

    const localitySuffix = selectedLocality === 'ALL' ? 'todas' : selectedLocality.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const csvContent = surveyReportCSV(currentSurvey, filteredResponses);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${currentSurvey.id}_${localitySuffix}_es.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportBackupJSON = () => {
    if (surveys.length === 0 && responses.length === 0) {
      alert("Aún no hay información registrada para respaldar.");
      return;
    }
    const jsonStr = JSON.stringify({
      format: 'survey-backup', version: 1, exportedAt: new Date().toISOString(),
      counts: { surveys: surveys.length, responses: responses.length },
      surveys, responses
    }, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `respaldo_encuestas_y_respuestas_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadSuccessToast('¡Copia de seguridad descargada con éxito!');
    setTimeout(() => setDownloadSuccessToast(''), 4000);
  };

  // ---------------------------------------------------------------------------------
  // IMPORT & INCORPORATE RESPONSES HANDLERS
  // ---------------------------------------------------------------------------------

  const handleImportJson = async () => {
    if (!importJsonText.trim()) {
      setImportErrorAlert('Por favor pega el JSON o texto con las respuestas.');
      return;
    }
    setImportLoading(true);
    setImportErrorAlert('');
    setImportSuccessAlert('');
    try {
      let parsed = JSON.parse(importJsonText.trim());
      if (parsed?.format === 'survey-backup' && Array.isArray(parsed.responses)) {
        // Imports only add responses. Questionnaire definitions are never restored or changed.
        parsed = parsed.responses;
      }
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }
      const formatted: SurveyResponse[] = parsed.map((item: any, idx: number) => ({
        id: item.id || `resp_import_${crypto.randomUUID()}`,
        surveyId: item.surveyId || currentSurvey?.id || 'survey_mauritania_dos',
        userName: item.userName || item.nombre || `Participante ${idx + 1}`,
        userLanguage: item.userLanguage || item.idioma || 'es',
        userCountry: item.userCountry || currentSurvey?.targetCountry || 'Mauritania',
        answers: item.answers || item.respuestas || item,
        submittedAt: item.submittedAt || item.fecha || new Date().toISOString()
      }));

      const count = await saveMultipleResponses(formatted);
      setImportSuccessAlert(`¡Se han importado exitosamente ${count} respuestas!`);
      if (onResponsesUpdated) {
        onResponsesUpdated();
      }
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportJsonText('');
        setImportSuccessAlert('');
      }, 1500);
    } catch (err: any) {
      setImportErrorAlert('No se pudo importar. Los registros existentes se conservaron: ' + (err.message || String(err)));
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportJsonText(text);
    };
    reader.readAsText(file);
  };

  // Helper to render question charts & tables
  const renderQuestionBlock = (q: SurveyQuestion, index: number, isDocumentMode: boolean = false) => {
    const chartData = computeChartData(q);
    const averageRating = q.type === 'rating' ? calculateRatingAverage(q.id) : null;
    
    const answeredCount = filteredResponses.filter(r => {
      const a = r.answers[q.id];
      if (q.type === 'rating') return ratingScore(a) !== null;
      return a !== undefined && a !== null && a !== '' && (!Array.isArray(a) || a.length > 0);
    }).length;

    return (
      <div 
        key={q.id} 
        className={`page-break-avoid p-6 rounded-2xl bg-white space-y-5 transition-all ${
          isDocumentMode 
            ? 'border-2 border-slate-200/90 shadow-xs' 
            : 'border border-slate-200 hover:border-indigo-200 shadow-2xs'
        }`}
      >
        {/* Title & Type headers */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <h5 className="font-bold text-slate-900 text-sm flex items-start gap-2.5">
            <span className="text-indigo-600 font-mono text-xs bg-indigo-50 px-2 py-0.5 rounded-md font-bold shrink-0">
              P{index + 1}
            </span>
            <span className="leading-snug">{q.text}</span>
          </h5>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold uppercase tracking-wider font-mono px-2.5 py-1 rounded-md border border-slate-200">
              {getQuestionTypeLabelES(q.type)}
            </span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold font-mono px-2.5 py-1 rounded-md border border-indigo-200">
              {answeredCount} RESPUESTAS
            </span>
            {averageRating && averageRating !== 'N/A' && (
              <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-bold uppercase tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1 font-mono">
                <Award className="w-3 h-3 text-amber-600" />
                Promedio: {averageRating}/10
              </span>
            )}
          </div>
        </div>

        {q.type === 'multiple_choice' && (
          <p className="text-xs text-slate-500">Porcentajes sobre el total de selecciones, no sobre participantes. Una respuesta puede incluir varias opciones.</p>
        )}
        {q.type === 'rating' && (
          <p className="text-xs text-slate-500">Gráfico y promedio: puntajes enteros entre 1 y 10. Los valores fuera de escala o inválidos se conservan en el registro y el CSV original.</p>
        )}

        {/* SUBTITLE: GRÁFICO DE BARRAS */}
        {q.type !== 'text' && (
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400">
            <span>GRÁFICO DE BARRAS • DISTRIBUCIÓN EN ESPAÑOL</span>
            <span>{answeredCount} de {filteredResponses.length} respuestas</span>
          </div>
        )}

        {/* RENDER BARRAS DEPENDING ON TYPE */}

        {/* 1. CHOICE SELECTIONS */}
        {['single_choice', 'multiple_choice'].includes(q.type) && (
          <div className="space-y-5">
            {/* Bar Chart Container */}
            <div className="h-64 w-full bg-slate-50/50 p-2 rounded-xl border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData} 
                  margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#475569' }} 
                    axisLine={{ stroke: '#cbd5e1' }} 
                    tickLine={false}
                    interval={0}
                    tickFormatter={(val: string) => {
                      if (val.length > 22) return val.substring(0, 20) + '...';
                      return val;
                    }}
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      fontSize: 11, 
                      borderRadius: 12, 
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }} 
                    formatter={(value: any, name: any, item: any) => [
                      `${value} votos (${item?.payload?.porcentaje}%)`, 
                      'Votos'
                    ]}
                  />
                  <Bar dataKey="Votos" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={`bar-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Clean Options Breakdown Table in Spanish */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              {chartData.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span 
                      className="w-3.5 h-3.5 rounded-md shrink-0 shadow-2xs" 
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                    />
                    <span className="font-semibold text-slate-800 leading-snug">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 shrink-0 self-end sm:self-auto font-mono text-xs">
                    <span className="font-black text-slate-800">
                      {item.Votos} {item.Votos === 1 ? 'voto' : 'votos'}
                    </span>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {item.porcentaje}%
                    </span>
                    <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden hidden sm:block">
                      <div 
                        className="h-full rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${item.porcentaje}%`, 
                          backgroundColor: COLORS[idx % COLORS.length] 
                        }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. BOOLEAN TYPE */}
        {q.type === 'boolean' && (
          <div className="space-y-4">
            <div className="h-56 w-full bg-slate-50/50 p-2 rounded-xl border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 'bold' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #cbd5e1' }} 
                    formatter={(value: any, name: any, item: any) => [
                      `${value} respuestas (${item?.payload?.porcentaje}%)`, 
                      'Respuestas'
                    ]}
                  />
                  <Bar dataKey="Votos" radius={[6, 6, 0, 0]}>
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Bullet breakdown in Spanish */}
            <div className="grid grid-cols-2 gap-4">
              {chartData.map((d, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-3.5 h-3.5 rounded-full ${idx === 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="font-bold text-slate-800 text-xs">{d.name}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-800 text-xs">{d.Votos} votos</span>
                    <span className="text-slate-400 text-[11px] ml-1.5">({d.porcentaje}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. RATING TYPE */}
        {q.type === 'rating' && (
          <div className="space-y-4">
            <div className="h-60 w-full bg-slate-50/50 p-2 rounded-xl border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="score" tick={{ fontSize: 11, fill: '#475569' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #cbd5e1' }} 
                    formatter={(value: any, name: any, item: any) => [
                      `${value} votos (${item?.payload?.porcentaje}%)`, 
                      'Frecuencia'
                    ]}
                  />
                  <Bar dataKey="Votos" fill="#4f46e5" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={`rating-bar-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 4. TEXT TYPE */}
        {q.type === 'text' && (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar bg-slate-50 p-3 rounded-xl border border-slate-100">
            {filteredResponses.map((res) => {
              const answerText = res.answers[q.id];
              if (!answerText) return null;
              return (
                <div key={res.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span className="font-semibold text-slate-600 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      {res.userName || 'Anónimo'}
                    </span>
                    <span>{new Date(res.submittedAt).toLocaleDateString('es-ES')}</span>
                  </div>
                  <p className="text-slate-800 text-xs italic">"{String(answerText)}"</p>
                </div>
              );
            })}
          </div>
        )}

      </div>
    );
  };

  // Percentage of total responses for the selected locality
  const localityPercentage = allSurveyResponses.length > 0 
    ? ((filteredResponses.length / allSurveyResponses.length) * 100).toFixed(1)
    : '0.0';

  // =========================================================================
  // VIEW MODE: FULL-SCREEN EXECUTIVE REPORT VIEWER (VISTA PREVIA EN PANTALLA)
  // =========================================================================
  if (isScreenReportView) {
    return (
      <div className="space-y-6 animate-fade-in" id="screen-report-document-suite">
        
        {/* Toast alert when direct download happens */}
        {downloadSuccessToast && (
          <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4" />
            <span>{downloadSuccessToast}</span>
          </div>
        )}

        {/* Sticky Control Toolbar for the Screen Report */}
        <div className="no-print sticky top-3 z-40 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-indigo-100 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left: Back button & Document context */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsScreenReportView(false)}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-600" />
              <span>Volver a la Consola</span>
            </button>
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                VISOR DE INFORME EN PANTALLA
              </span>
              <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{currentSurvey?.title}</p>
            </div>
          </div>

          {/* Center: Live Locality Selector right on screen! */}
          <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 uppercase font-mono px-2 flex items-center gap-1 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>Lugar:</span>
            </span>
            <select
              value={selectedLocality}
              onChange={(e) => setSelectedLocality(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 text-xs font-bold rounded-lg px-3 py-1.5 outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer flex-1 md:w-64"
            >
              {localities.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.count} encuestas)
                </option>
              ))}
            </select>
          </div>

          {/* Right: PDF Generation, PDF Modal View, and CSV Actions */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            
            {/* 1. BUTTON TO OPEN INTERACTIVE PDF VIEWER MODAL */}
            <button
              onClick={handleOpenPdfPreview}
              disabled={isGeneratingPdf}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Abrir visor interactivo del PDF para verlo y decidir imprimir o descargar"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Ver Archivo PDF</span>
                </>
              )}
            </button>

            {/* 2. DIRECT DOWNLOAD PDF FILE BUTTON */}
            <button
              onClick={handleDirectPdfDownload}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Descargar directamente el archivo .pdf a tu computadora"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Descargar PDF</span>
            </button>

            {/* 3. CSV EXPORT */}
            <button
              onClick={handleExportCSV}
              className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Exportar datos a Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* THE EXECUTIVE REPORT DOCUMENT CANVAS (A4-Styled on screen) */}
        <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12 space-y-10 print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none">
          
          {/* Document Official Header */}
          <div className="border-b-2 border-indigo-950 pb-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-black text-indigo-900 uppercase tracking-widest font-mono bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-md inline-block">
                INFORME EJECUTIVO DE RESULTADOS Y DIAGNÓSTICO
              </span>
              <div className="text-[11px] font-mono text-slate-500">
                <span>Fecha de Emisión: <strong>{new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                {currentSurvey?.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed max-w-3xl">
                {currentSurvey?.description}
              </p>
            </div>

            {/* High-visibility Locality Focus Banner */}
            <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300">
                  Ámbito Territorial Analizado:
                </span>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-400" />
                  <span>{selectedLocality === 'ALL' ? 'Todas las localidades' : selectedLocality}</span>
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono bg-white/10 px-4 py-2 rounded-xl backdrop-blur-xs">
                <div>
                  <span className="text-indigo-200 text-[10px] block">Muestra Filtrada:</span>
                  <span className="font-bold text-white text-base">{filteredResponses.length}</span> respuestas
                </div>
                <div className="border-l border-white/20 pl-4">
                  <span className="text-indigo-200 text-[10px] block">Representatividad:</span>
                  <span className="font-bold text-white text-base">{localityPercentage}%</span> del total
                </div>
              </div>
            </div>
          </div>

          {/* Executive Summary Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Total Muestra</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{filteredResponses.length}</p>
              <span className="text-[11px] text-slate-500 font-mono">votos analizados</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Preguntas</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{currentSurvey?.questions.length}</p>
              <span className="text-[11px] text-slate-500 font-mono">variables medidas</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Consolidación</span>
              <p className="text-base font-black text-emerald-700 mt-1">100% Español</p>
              <span className="text-[11px] text-slate-500 font-mono">árabe/francés traducidos</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Estado del Dato</span>
              <p className="text-base font-black text-indigo-700 mt-1">Auditado</p>
              <span className="text-[11px] text-slate-500 font-mono">Firestore Cloud</span>
            </div>
          </div>

          {/* Questions Section Title */}
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-sans text-slate-900 uppercase tracking-wider">
                Desglose Estadístico por Pregunta (Gráficos de Barras)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Datos calculados exclusivamente sobre las respuestas registradas en {selectedLocality === 'ALL' ? 'todas las localidades' : selectedLocality}.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
              {currentSurvey?.questions.length} Gráficos
            </span>
          </div>

          {/* Dynamic List of All Question Bar Charts */}
          <div className="space-y-8">
            {filteredResponses.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs border border-dashed rounded-2xl bg-slate-50">
                No se registraron respuestas para la localidad seleccionada ({selectedLocality}).
              </div>
            ) : (
              currentSurvey?.questions.map((q, idx) => renderQuestionBlock(q, idx, true))
            )}
          </div>

          {/* Document Footer Callout & Decision Bar */}
          <div className="border-t-2 border-slate-200 pt-8 mt-12 space-y-6">
            <div className="text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-600">Fin del Informe Oficial de Resultados</p>
              <p>Datos auditados y consolidados de la plataforma de encuestas y diagnóstico territorial.</p>
            </div>

            {/* Print & Download Decision Bar */}
            <div className="no-print flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenPdfPreview}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold cursor-pointer transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Ver Archivo PDF para Decidir Imprimir o Guardar</span>
              </button>
              
              <button
                type="button"
                onClick={handleDirectPdfDownload}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                <span>Descargar Archivo PDF (.pdf)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsScreenReportView(false)}
                className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer transition-colors"
              >
                Volver a la Consola
              </button>
            </div>
          </div>

        </div>

        {/* RENDER MODAL: INTERACTIVE PDF VIEWER MODAL */}
        {renderPdfViewerModal()}

      </div>
    );
  }

  // Helper to render the Interactive PDF Viewer Modal
  function renderPdfViewerModal() {
    if (!activePdfPreview) return null;

    return (
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Header with Title and Decision Buttons */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl border border-white/10 text-indigo-300">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-white">Visor del Archivo PDF</h4>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded font-mono font-bold">
                    LISTO
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80 mt-0.5 font-mono truncate max-w-md">
                  {activePdfPreview.filename} • {selectedLocality === 'ALL' ? 'Todas las localidades' : selectedLocality}
                </p>
              </div>
            </div>

            {/* DECISION BUTTONS: Download or Print or Close */}
            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {/* Download button */}
              <button
                type="button"
                onClick={activePdfPreview.download}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/30 flex items-center gap-1.5 cursor-pointer"
                title="Descargar este archivo PDF a tu computadora"
              >
                <FileDown className="w-4 h-4" />
                <span>Descargar PDF (.pdf)</span>
              </button>

              {/* Print button */}
              <button
                type="button"
                onClick={() => {
                  const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement;
                  if (iframe && iframe.contentWindow) {
                    try {
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                    } catch (e) {
                      // Fallback: download the PDF
                      activePdfPreview.download();
                    }
                  } else {
                    activePdfPreview.download();
                  }
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Imprimir el documento PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>

              {/* Close button */}
              <button
                type="button"
                onClick={() => setActivePdfPreview(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer ml-1"
                title="Cerrar vista previa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Embedded PDF Reader Body */}
          <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden relative">
            <iframe
              id="pdf-preview-iframe"
              src={`${activePdfPreview.blobUrl}#toolbar=1&navpanes=1`}
              className="w-full h-full rounded-2xl bg-white shadow-inner border border-slate-200"
              title="Visor PDF Interactivo"
            />
          </div>

          {/* Bottom Footer with helpful action bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 shrink-0">
            <p className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Puedes revisar todas las páginas, hacer zoom y decidir si imprimir o guardar el archivo.</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={activePdfPreview.download}
                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Guardar archivo en la computadora</span>
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={() => setActivePdfPreview(null)}
                className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: STANDARD ANALYTICS AND HISTORY TAB VIEW
  // =========================================================================
  return (
    <div className="space-y-6" id="analytics-reporting-suite">
      
      {/* Toast alert when direct download happens */}
      {downloadSuccessToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB MENU HEADER SELECTOR (SCREEN ONLY) */}
      {/* ========================================================================= */}
      <div className="no-print flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex-col sm:flex-row gap-4">
        
        {/* Left Toggles */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>REPORTES Y GRÁFICOS (EN ESPAÑOL)</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>HISTORIAL DE RESPUESTAS</span>
          </button>
        </div>

        {/* Right Actions: Survey Switcher + View Report on Screen + PDF Generator Button + CSV */}
        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={selectedSurveyId}
            onChange={(e) => {
              setSelectedSurveyId(e.target.value);
              setSelectedLocality('ALL');
            }}
            className="flex-1 sm:w-56 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {surveys.map(s => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.targetCountry || 'General'})
              </option>
            ))}
          </select>

          {/* BUTTON 1: VER INFORME EN PANTALLA */}
          <button
            onClick={() => setIsScreenReportView(true)}
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-200 cursor-pointer"
            title="Ver informe en pantalla completa con gráficos de la localidad"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver Informe en Pantalla</span>
          </button>

          {/* BUTTON 2: VER O DESCARGAR ARCHIVO PDF DIRECTAMENTE */}
          <button
            onClick={handleOpenPdfPreview}
            disabled={isGeneratingPdf}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Generar y ver el archivo PDF para decidir si imprimir o descargar"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>Ver PDF</span>
          </button>

          {/* BUTTON 3: SELECT LOCALITY MODAL */}
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Seleccionar localidad para el informe"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Por Localidad</span>
          </button>

          {/* BUTTON 4: CSV */}
          <button
            onClick={handleExportCSV}
            title="Descargar respuestas originales y normalizadas en CSV"
            className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {/* BUTTON 5: RESPALDO JSON */}
          <button
            onClick={handleExportBackupJSON}
            title="Descargar copia de seguridad completa en JSON para resguardo permanente"
            className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Respaldo JSON</span>
          </button>

          {/* BUTTON 6: INCORPORAR RESPUESTAS */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            title="Incorporar o importar respuestas de encuestas de Mauritania"
            className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Incorporar Respuestas</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUICK LOCALITY SELECTOR FILTER BAR (SCREEN ONLY) */}
      {/* ========================================================================= */}
      {localities.length > 1 && (
        <div className="no-print bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Filtrar Resultados por Localidad
              </h5>
              <p className="text-xs font-bold text-slate-800">
                {selectedLocality === 'ALL' ? 'Mostrando todas las localidades' : `Localidad: ${selectedLocality}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {localities.map(loc => {
              const isSelected = selectedLocality === loc.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocality(loc.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{loc.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {loc.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RENDER ANALYTICS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <>
          {!currentSurvey ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center">
              <span className="p-4 bg-slate-50 text-slate-400 rounded-full mb-3 border">
                <BarChart3 className="w-8 h-8" />
              </span>
              <p className="font-semibold text-slate-700 text-sm">No hay encuestas disponibles</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs">Crea una nueva encuesta para comenzar a visualizar los gráficos de resultados.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* SURVEY OVERVIEW METRICS ROWS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Metric 1 */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center space-x-4 shadow-2xs">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                      Respuestas {selectedLocality !== 'ALL' && '(Filtradas)'}
                    </h5>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-2xl font-black text-slate-800">{filteredResponses.length}</p>
                      {selectedLocality !== 'ALL' && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          de {allSurveyResponses.length} total
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center space-x-4 shadow-2xs">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">Total Preguntas</h5>
                    <p className="text-2xl font-black text-slate-800">{currentSurvey.questions.length}</p>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center space-x-4 shadow-2xs">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">Localidad Activa</h5>
                    <p className="text-xs font-black text-slate-800 truncate" title={selectedLocality}>
                      {selectedLocality === 'ALL' ? 'Todas las localidades' : selectedLocality}
                    </p>
                  </div>
                </div>

                {/* Metric 4 (Actions bar) */}
                <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 flex flex-col justify-center gap-2 shadow-2xs">
                  <button
                    onClick={() => setIsScreenReportView(true)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-100"
                    title="Ver informe en pantalla completa y decidir si imprimirlo"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Informe en Pantalla</span>
                  </button>
                  <button
                    onClick={handleOpenPdfPreview}
                    className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Archivo PDF</span>
                  </button>
                </div>
              </div>

              {/* REPORT TITLE CONTENT */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/50">
                      Consolidación en Español
                    </span>
                    {selectedLocality !== 'ALL' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                        Filtro: {selectedLocality}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    <span>ID: <code>{currentSurvey.id}</code></span>
                    <span className="mx-2">•</span>
                    <span>Creada: {new Date(currentSurvey.createdAt).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-800 font-sans tracking-tight">{currentSurvey.title}</h3>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{currentSurvey.description}</p>
              </div>

              {/* COMPOSABLE SURVEY SHARE WIDGET (SCREEN ONLY) */}
              {currentSurvey && (
                <div className="no-print bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50/50 p-5 rounded-2xl border border-indigo-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Link className="w-4 h-4 text-indigo-600" />
                      <span>Enlace Activo para Responder esta Encuesta</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
                      Comparte este enlace con los participantes. Responderán en su idioma y los verás filtrados por localidad en este panel.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}${window.location.pathname}?surveyId=${currentSurvey.id}`}
                      className="bg-white border border-slate-200 text-[11px] font-mono p-2.5 rounded-xl text-slate-600 flex-1 md:w-80 outline-hidden select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const link = `${window.location.origin}${window.location.pathname}?surveyId=${currentSurvey.id}`;
                        navigator.clipboard.writeText(link);
                        setCopiedSurveyId(currentSurvey.id);
                        setTimeout(() => setCopiedSurveyId(''), 2500);
                      }}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        copiedSurveyId === currentSurvey.id 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-100'
                      }`}
                    >
                      {copiedSurveyId === currentSurvey.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* DYNAMIC LIST OF QUESTIONS GRAPHICS (TYPE BARRAS & 100% SPANISH) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-10 shadow-xs">
                <div className="flex items-center justify-between border-b pb-3 mb-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">
                      Resultados y Gráficos de Barras
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Mostrando datos consolidados en español {selectedLocality !== 'ALL' ? `para: ${selectedLocality}` : 'para todas las localidades'}.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                      {filteredResponses.length} Votos Analizados
                    </span>
                    <button
                      onClick={handleOpenPdfPreview}
                      className="no-print px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="Ver PDF en pantalla y decidir si imprimirlo o descargarlo"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver PDF</span>
                    </button>
                  </div>
                </div>

                {filteredResponses.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-8 flex flex-col items-center gap-3">
                    <Database className="w-8 h-8 text-indigo-400" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">No se han registrado respuestas para: {selectedLocality === 'ALL' ? 'esta encuesta' : selectedLocality}</p>
                      <p className="text-slate-400 mt-1 max-w-md mx-auto">
                        Si tu cliente ya cargó respuestas en el enlace anterior o deseas incorporar las respuestas de campo de Mauritania, haz clic abajo.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="mt-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Incorporar / Importar Respuestas de Mauritania</span>
                    </button>
                  </div>
                ) : (
                  currentSurvey.questions.map((q, index) => renderQuestionBlock(q, index, false))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* RENDER RESPONSES HISTORY TAB */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
            <div>
              <h3 className="text-base font-bold font-display text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <span>Historial de Respuestas Individuales</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedLocality !== 'ALL' ? `Mostrando respuestas para: ${selectedLocality}` : 'Mostrando respuestas de todas las localidades'}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Incorporar Respuestas</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar CSV</span>
              </button>
              <button
                onClick={handleExportBackupJSON}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Respaldo JSON</span>
              </button>
              <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-xs px-3 py-1.5 rounded-xl font-bold">
                {filteredResponses.length} Filtradas
              </span>
            </div>
          </div>

          {filteredResponses.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Aún no se ha registrado ninguna respuesta para esta localidad.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase font-bold tracking-wider font-mono text-[10px]">
                    <th className="p-3">Encuesta</th>
                    <th className="p-3">Participante</th>
                    <th className="p-3">Idioma</th>
                    <th className="p-3">Fecha de Envío</th>
                    <th className="p-3 text-center">Respuestas</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredResponses.map((res) => {
                    const relatedSurvey = resolveResponseSurvey(surveys, res.surveyId);
                    const relatedSurveyTitle = relatedSurvey?.title || "Encuesta no disponible";
                    const activeLangName = AVAILABLE_LANGUAGES.find(l => l.code === res.userLanguage)?.name || res.userLanguage;

                    return (
                      <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 max-w-xs truncate font-semibold text-slate-800" title={relatedSurveyTitle}>
                          {relatedSurveyTitle}
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">{res.userName || 'Anónimo'}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] font-mono">
                            {activeLangName}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {new Date(res.submittedAt).toLocaleString('es-ES')}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-600">
                          {Object.keys(res.answers).length}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setViewingResponse(res)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Respuestas</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: GENERADOR DE INFORME PDF POR LOCALIDAD */}
      {/* ========================================================================= */}
      {isPdfModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
                  <FileText className="w-6 h-6 text-indigo-300" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">Informe de Resultados por Localidad</h4>
                  <p className="text-xs text-indigo-200/80 mt-0.5">Elige de qué lugar deseas el informe para verlo en pantalla</p>
                </div>
              </div>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              
              {/* Question 1: Survey Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                  1. Encuesta Seleccionada:
                </label>
                <select
                  value={selectedSurveyId}
                  onChange={(e) => {
                    setSelectedSurveyId(e.target.value);
                    setSelectedLocality('ALL');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-3 outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {surveys.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.targetCountry || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Question 2: Locality Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>2. ¿De qué lugar desea el informe?</span>
                  <span className="text-indigo-600 font-normal normal-case">
                    {localities.length - 1 > 0 ? `${localities.length - 1} localidades detectadas` : 'Todo el país'}
                  </span>
                </label>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {localities.map(loc => {
                    const isSelected = selectedLocality === loc.id;
                    return (
                      <div
                        key={loc.id}
                        onClick={() => setSelectedLocality(loc.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="locality_pdf"
                            checked={isSelected}
                            onChange={() => setSelectedLocality(loc.id)}
                            className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{loc.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {loc.id === 'ALL' ? 'Incluye todos los municipios y campamentos' : 'Filtrado exclusivo para este lugar'}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                          {loc.count} encuestas
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Information Box */}
              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5">
                  <Eye className="w-4 h-4" />
                </div>
                <div className="text-xs text-indigo-950 space-y-1">
                  <p className="font-bold">Podrás ver el informe en pantalla primero</p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Al presionar <strong>"Ver Informe en Pantalla"</strong>, se desplegarán todos los <strong>gráficos de barras y tablas</strong> calculados sobre las <strong>{filteredResponses.length} respuestas</strong> de <strong>{selectedLocality === 'ALL' ? 'todas las localidades' : selectedLocality}</strong>. También podrás abrir el <strong>Visor de PDF</strong> o descargarlo directamente.
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPdfModalOpen(false);
                  setIsScreenReportView(true);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Informe en Pantalla</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPdfModalOpen(false);
                  handleOpenPdfPreview();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                title="Generar y abrir el archivo PDF directamente"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Abrir Visor PDF</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VIEW INDIVIDUAL RESPONSE IN CLEAN SPANISH */}
      {/* ========================================================================= */}
      {viewingResponse && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 bg-indigo-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300 bg-white/10 px-2 py-0.5 rounded">
                  Detalle de Respuesta en Español
                </span>
                <h4 className="text-base font-bold mt-1 text-white">
                  Participante: {viewingResponse.userName || 'Anónimo'}
                </h4>
                <p className="text-[11px] text-indigo-200/80 font-mono mt-0.5">
                  Fecha: {new Date(viewingResponse.submittedAt).toLocaleString('es-ES')} • Idioma original: {AVAILABLE_LANGUAGES.find(l => l.code === viewingResponse.userLanguage)?.name || viewingResponse.userLanguage}
                </p>
              </div>
              <button
                onClick={() => setViewingResponse(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
              {(() => {
                const targetSurvey = resolveResponseSurvey(surveys, viewingResponse.surveyId);
                if (!targetSurvey) {
                  return (
                    <div className="text-center text-slate-400 py-8 text-xs">
                      La encuesta asociada a esta respuesta ya no se encuentra en el sistema.
                    </div>
                  );
                }

                return targetSurvey.questions.map((q, idx) => {
                  const rawAns = viewingResponse.answers[q.id];
                  const normalizedAns = normalizeAnswerToSpanish(rawAns, q, targetSurvey);

                  return (
                    <div key={q.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          {idx + 1}. {q.text}
                        </span>
                        <span className="text-[9px] bg-white border border-slate-200 text-slate-500 font-mono font-bold px-2 py-0.5 rounded-sm shrink-0">
                          {getQuestionTypeLabelES(q.type)}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/60">
                        <p className="font-bold mb-1">Respuesta original guardada</p>
                        <p className="whitespace-pre-wrap break-words">{Array.isArray(rawAns) ? JSON.stringify(rawAns) : String(rawAns ?? '') || 'Sin respuesta'}</p>
                      </div>
                      <div className="text-xs font-semibold text-indigo-900 bg-white p-2.5 rounded-lg border border-slate-200/60">
                        <p className="text-slate-500 font-normal mb-1">Interpretación normalizada para informes</p>
                        {rawAns === undefined || rawAns === null || rawAns === '' ? (
                          <span className="text-slate-400 italic font-normal">Sin respuesta</span>
                        ) : Array.isArray(normalizedAns) ? (
                          <ul className="list-disc list-inside space-y-0.5">
                            {normalizedAns.map((item, i) => (
                              <li key={i}>{String(item)}</li>
                            ))}
                          </ul>
                        ) : (
                          <span>{String(normalizedAns)}</span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingResponse(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: INCORPORAR O IMPORTAR RESPUESTAS DE LA ENCUESTA */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 text-white flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-300 bg-white/10 px-2.5 py-1 rounded-md border border-white/15 flex items-center gap-1.5 w-fit">
                  <Database className="w-3 h-3 text-purple-300" />
                  Sincronización de Datos • Mauritania
                </span>
                <h4 className="text-lg font-bold mt-2 text-white">
                  Incorporar / Importar Respuestas de Mauritania
                </h4>
                <p className="text-xs text-indigo-200/80 mt-1">
                  Si tu cliente cargó respuestas en el enlace anterior o cuentas con datos de campo, incorpóralos aquí para ver los gráficos e informes inmediatamente.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportErrorAlert('');
                  setImportSuccessAlert('');
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
              {/* Alerts */}
              {importSuccessAlert && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{importSuccessAlert}</span>
                </div>
              )}

              {importErrorAlert && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex items-center gap-2.5 animate-shake">
                  <X className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{importErrorAlert}</span>
                </div>
              )}

              {/* OPTION 2: PASTE JSON OR TEXT */}
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>O pegar respuestas en formato JSON / Texto</span>
                  </label>
                  <label className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                    <span>O subir archivo .json</span>
                    <input
                      type="file"
                      accept=".json,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`Pega aquí el JSON de respuestas (ejemplo: [{"surveyId": "survey_mauritania_dos", "answers": {...}}])`}
                  rows={4}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleImportJson}
                    disabled={importLoading || !importJsonText.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Importando...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Guardar Respuestas Pegadas</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span>Los datos se guardan de forma permanente en Google Cloud Firestore.</span>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportErrorAlert('');
                  setImportSuccessAlert('');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* RENDER MODAL: INTERACTIVE PDF VIEWER MODAL */}
      {renderPdfViewerModal()}

    </div>
  );
}
