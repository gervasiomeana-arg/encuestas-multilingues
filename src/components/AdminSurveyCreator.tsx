import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  FileUp, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Globe, 
  X, 
  Sparkles, 
  Check, 
  HelpCircle,
  FileText,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Survey, SurveyQuestion, QuestionType, COUNTRIES, AVAILABLE_LANGUAGES, TranslationData } from '../types';
import { saveSurvey } from '../firebaseService';
import { validQuestions } from '../utils/apiValidation';
import { uploadAndParseSurveyFile, translateSurveyWithAI } from '../utils/api';

interface AdminSurveyCreatorProps {
  onSurveyCreated: () => void;
  initialSurvey?: Survey | null;
  onClearEdit?: () => void;
}

export default function AdminSurveyCreator({ onSurveyCreated, initialSurvey, onClearEdit }: AdminSurveyCreatorProps) {
  // Main state fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [targetCountry, setTargetCountry] = useState(COUNTRIES[0].name);

  // Sync form state when initialSurvey changes
  useEffect(() => {
    if (initialSurvey) {
      setTitle(initialSurvey.title);
      setDescription(initialSurvey.description);
      // Create copies of questions to avoid reference problems
      setQuestions(initialSurvey.questions.map(q => ({
        ...q,
        options: q.options ? [...q.options] : []
      })));
      setTargetCountry(initialSurvey.targetCountry || COUNTRIES[0].name);
    } else {
      setTitle('');
      setDescription('');
      setQuestions([]);
      setTargetCountry(COUNTRIES[0].name);
    }
  }, [initialSurvey]);

  // Parsing file uploaded status
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [fileUploadNotice, setFileUploadNotice] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [useAIForParsing, setUseAIForParsing] = useState(true);

  // Save survey status
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Automatic translation toggler
  const [autoTranslateToTargetLang, setAutoTranslateToTargetLang] = useState(true);

  // Map chosen country to native language metadata
  const activeCountryInfo = COUNTRIES.find(c => c.name === targetCountry) || COUNTRIES[0];

  // Drag and drop events logic
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setFileUploadError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileParsing(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileUploadError(null);
    if (e.target.files && e.target.files[0]) {
      await handleFileParsing(e.target.files[0]);
    }
  };

  // Upload and parse file via Express backend with Gemini AI
  const handleFileParsing = async (file: File) => {
    setFileUploadError(null);
    setFileUploadNotice(null);
    const filename = file.name.toLowerCase();
    if (
      !filename.endsWith('.pdf') && 
      !filename.endsWith('.docx') && 
      !filename.endsWith('.txt')
    ) {
      setFileUploadError("Solo se admiten archivos PDF (.pdf), Word (.docx) o texto (.txt).");
      return;
    }

    setFileUploading(true);
    try {
      const response = await uploadAndParseSurveyFile(file, useAIForParsing);
      if (response.success && response.survey) {
        if (!validQuestions(response.survey.questions)) throw new Error("El documento produjo preguntas inválidas o repetidas. Revisa el archivo antes de crear la encuesta.");
        setTitle(response.survey.title);
        setDescription(response.survey.description);
        
        // Ensure every parsed question has a secure unique id
        const mappedQuestions = response.survey.questions.map((q, idx) => ({
          id: q.id || `q_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
          text: q.text,
          type: q.type,
          options: q.options || [],
          required: q.required !== undefined ? q.required : true
        }));
        
        setQuestions(mappedQuestions);
        setFileUploadNotice(response.warnings?.join(' ') || 'Revisa las preguntas y opciones extraídas antes de guardar una encuesta nueva.');
      } else {
        setFileUploadError(response.error || "No se pudo extraer el formato de encuesta de este documento.");
      }
    } catch (err: any) {
      setFileUploadError(err.message || "Error al procesar el archivo por medio de la IA.");
    } finally {
      setFileUploading(false);
    }
  };

  // Add questions manually
  const handleAddQuestion = (type: QuestionType) => {
    const newQuestion: SurveyQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      text: '',
      type,
      required: true,
      options: ['text', 'rating', 'boolean'].includes(type) ? [] : ['Opción 1', 'Opción 2']
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  // Modify question attributes
  const handleUpdateQuestion = (id: string, updates: Partial<SurveyQuestion>) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return { ...q, ...updates } as SurveyQuestion;
      }
      return q;
    }));
  };

  // Remove question
  const handleRemoveQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  // Reorder questions
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    
    setQuestions(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
  };

  // Multiple selection option management
  const handleAddOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    const currentOptions = question.options || [];
    const updatedOptions = [...currentOptions, `Opción ${currentOptions.length + 1}`];
    handleUpdateQuestion(questionId, { options: updatedOptions });
  };

  const handleUpdateOption = (questionId: string, index: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || !question.options) return;
    const updated = [...question.options];
    updated[index] = value;
    handleUpdateQuestion(questionId, { options: updated });
  };

  const handleRemoveOption = (questionId: string, index: number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || !question.options) return;
    const updated = question.options.filter((_, i) => i !== index);
    handleUpdateQuestion(questionId, { options: updated });
  };

  // Save the constructed survey draft in Firestore
  const handleSaveSurvey = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!title.trim()) {
      setErrorMessage("Por favor ingresa un título para la encuesta.");
      return;
    }
    if (questions.length === 0) {
      setErrorMessage("La encuesta debe tener al menos una pregunta.");
      return;
    }
    
    // Check for empty question names
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) {
        setErrorMessage(`Por favor completa el texto para la pregunta #${i + 1}`);
        return;
      }
      if (['multiple_choice', 'single_choice'].includes(questions[i].type)) {
        if (!questions[i].options || questions[i].options!.length === 0) {
          setErrorMessage(`La pregunta de opción múltiple #${i + 1} debe contener al menos una opción.`);
          return;
        }
      }
    }

    if (!validQuestions(questions)) {
      setErrorMessage('Revisa los IDs, tipos y opciones: hay preguntas inválidas o repetidas.');
      return;
    }
    setSaving(true);

    try {
      const surveyId = `survey_${crypto.randomUUID()}`;
      
      const surveyData: Survey = {
        id: surveyId,
        title: title.trim(),
        description: description.trim(),
        questions,
        targetCountry,
        targetLanguage: activeCountryInfo.nativeLanguage.code,
        translations: {},
        createdAt: new Date().toISOString(),
        createdBy: "administrador"
      };

      // Perform translation using Gemini if requested
      if (autoTranslateToTargetLang && activeCountryInfo.nativeLanguage.code !== 'es') {
        const translateResult = await translateSurveyWithAI(
          surveyData, 
          activeCountryInfo.nativeLanguage.code, 
          activeCountryInfo.nativeLanguage.name
        );
        if (translateResult.success && translateResult.translation) {
          surveyData.translations[activeCountryInfo.nativeLanguage.code] = translateResult.translation;
        } else {
          console.warn("Auto-translation issue:", translateResult.error);
          // Don't crash entirely, save draft anyway but alert admin
        }
      }

      await saveSurvey(surveyData);
      setSaveSuccess(true);
      
      // Reset variables
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setQuestions([]);
        setSaveSuccess(false);
        if (onClearEdit) onClearEdit();
        onSurveyCreated(); // Notify parent of update
      }, 2000);

    } catch (err: any) {
      setErrorMessage(err.message || "No se pudo guardar la encuesta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="survey-creator-workflow">
      
      {initialSurvey && <p className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
        La encuesta original está protegida. Los cambios se guardarán en una copia nueva, sin alterar sus respuestas.
      </p>}

      {/* SECTION 1: DOCUMENT PARSER CHANGER UPLOADER */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold font-display text-slate-800 flex items-center gap-2">
              <FileUp className="w-5 h-5 text-indigo-600" />
              <span>Importar Encuesta desde un Archivo (PDF / Word)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Sube un archivo de texto, PDF o Word para auto-completar la encuesta de forma automática en pocos segundos.
            </p>
          </div>

          {/* Toggle Switch Mode */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 self-start md:self-auto">
            <span className={`text-[11px] font-bold ${!useAIForParsing ? 'text-indigo-600' : 'text-slate-400'}`}>Copia Literal Verbatim</span>
            <button
              type="button"
              onClick={() => setUseAIForParsing(!useAIForParsing)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                useAIForParsing ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  useAIForParsing ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-[11px] font-bold flex items-center gap-1 ${useAIForParsing ? 'text-indigo-600' : 'text-slate-400'}`}>
              <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
              <span>Analizador Gemini AI</span>
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mb-4 bg-slate-50/50 p-2.5 rounded-xl border border-dashed border-slate-100">
          {useAIForParsing ? (
            <span><b>Modo Inteligente (Gemini):</b> AI estructurará preguntas, deducirá tipos de respuestas (escala, texto, opción múltiple), pulirá títulos y creará la encuesta ideal. (Sujeto a disponibilidad del servicio de IA).</span>
          ) : (
            <span><b>Modo Copia Literal Verbatim (Offline / Sin IA):</b> Sáltate la IA. El sistema propone una estructura a partir del texto extraído. Revisa la numeración, las preguntas y las opciones antes de guardar. Ideal si la IA experimenta demoras o alta demanda.</span>
          )}
        </p>

        {/* Drag Drop Field Area */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
            dragActive 
              ? 'border-indigo-500 bg-indigo-50/50' 
              : 'border-slate-200 hover:border-indigo-400/50 hover:bg-slate-50/30'
          }`}
        >
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.docx,.txt"
            className="hidden"
          />

          {fileUploading ? (
            <div className="space-y-3 flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-700">
                {useAIForParsing ? "Analizando documento con Gemini AI..." : "Procesando documento (Modo copia literal rápida)..."}
              </p>
              <p className="text-[10px] text-slate-400">
                {useAIForParsing ? "Extrayendo títulos, descripciones y tipos de preguntas" : "Extrayendo y mapeando texto al pie de la letra sin intermediarios"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-3 bg-indigo-50 text-indigo-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-1 border border-indigo-100">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700">Arrastra y suelta tu archivo aquí, o <span className="text-indigo-600 underline">haz clic para buscar</span></p>
              <p className="text-[10px] text-slate-400 font-mono">Formatos soportados: PDF, DOCX (Word), TXT</p>
            </div>
          )}
        </div>

        {fileUploadError && (
          <div role="alert" className="mt-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{fileUploadError}</span>
          </div>
        )}
        {fileUploadNotice && (
          <div role="status" className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs">
            Documento cargado. {fileUploadNotice}
          </div>
        )}
      </section>

      {/* SECTION 2: SURVEY MANUAL EDITOR FORM */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative">
        <h3 className="text-base font-bold font-display text-slate-800 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-600" />
          <span>Editor de Estructura de Encuesta</span>
        </h3>

        {initialSurvey && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                Modo Edición / Duplicación Activo
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                Estás trabajando sobre la encuesta <strong className="font-semibold">"{initialSurvey.title}"</strong> ({initialSurvey.targetCountry}). Puedes modificar las preguntas, cambiar el país de destino (por ejemplo, a Senegal) y guardarla como copia nueva. La original y sus respuestas se conservan.
              </p>
            </div>
            <button
              type="button"
              onClick={onClearEdit}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-lg transition-all shrink-0 cursor-pointer"
            >
              Cancelar / Crear Nueva
            </button>
          </div>
        )}

        {saveSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3">
            <Check className="w-10 h-10 bg-emerald-500 text-white rounded-full p-2" />
            <h4 className="text-lg font-bold text-slate-800">¡Encuesta creada con éxito!</h4>
            <p className="text-xs text-slate-500">Se guardó y se generaron las traducciones automáticas pertinentes.</p>
          </div>
        ) : (
          <form onSubmit={handleSaveSurvey} className="space-y-6">
            
            {/* Country and Meta fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <span>¿Para qué país querés publicar la encuesta?</span>
                </label>
                <div className="relative">
                  <select
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm text-slate-700 bg-slate-50/50 cursor-pointer appearance-none"
                  >
                    {COUNTRIES.map(country => (
                      <option key={country.name} value={country.name}>🇵🇹 {country.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Idioma de destino: {activeCountryInfo.nativeLanguage.name} (<code>{activeCountryInfo.nativeLanguage.code}</code>)</span>
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all w-full mt-5">
                  <input
                    type="checkbox"
                    checked={autoTranslateToTargetLang}
                    onChange={(e) => setAutoTranslateToTargetLang(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500/30 border-slate-300"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Traducción automática por IA</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Traduce el contenido del creador al idioma oficial del país seleccionado mediante Gemini.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Title & Desc inputs */}
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Título General de la Encuesta (Español)</label>
                <input
                  type="text"
                  placeholder="Ej. Evaluación de Calidad de Producto"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-700 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Descripción de la Encuesta</label>
                <textarea
                  placeholder="Escribe una breve introducción para indicarle al encuestado el propósito del relevamiento..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-700 bg-white"
                />
              </div>
            </div>

            {/* Questions Segment heading */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Preguntas de la Encuesta ({questions.length})</span>
                
                {/* Manual Add Trigger Menu */}
                <div className="flex gap-1.5 flex-wrap">
                  {(['text', 'rating', 'boolean', 'single_choice', 'multiple_choice'] as QuestionType[]).map((type) => {
                    const labelMap: Record<string, string> = {
                      text: '+ Texto',
                      rating: '+ Escala 1-10',
                      boolean: '+ Sí/No',
                      single_choice: '+ Opción Única',
                      multiple_choice: '+ Opción Múltiple'
                    };
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleAddQuestion(type)}
                        className="bg-white hover:bg-indigo-600 text-slate-600 hover:text-white border border-slate-200 hover:border-indigo-500 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        {labelMap[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Questions Map list */}
              {questions.length === 0 ? (
                <div className="border border-dashed rounded-xl p-8 text-center text-slate-400 text-xs">
                  Aún no has agregado preguntas. Elige una plantilla tipo de arriba para añadirla manualmente o sube un archivo para auto-completar.
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, index) => (
                    <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 space-y-3 relative group">
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-slate-400">#{index + 1}</span>
                          
                          {/* Rich type selector for easy corrections */}
                          <select
                            value={q.type}
                            onChange={(e) => {
                              const newType = e.target.value as QuestionType;
                              const updates: Partial<SurveyQuestion> = { type: newType };
                              if (['multiple_choice', 'single_choice'].includes(newType)) {
                                if (!q.options || q.options.length === 0) {
                                  updates.options = ['Opción A', 'Opción B'];
                                }
                              }
                              handleUpdateQuestion(q.id, updates);
                            }}
                            className="text-[10px] bg-white border border-slate-200 text-indigo-700 font-bold px-1.5 py-0.5 rounded-md uppercase font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            title="Haz clic para corregir o cambiar el tipo de pregunta"
                          >
                            <option value="text">Texto Libre</option>
                            <option value="rating">Escala 1-10</option>
                            <option value="boolean">Sí/No</option>
                            <option value="single_choice">Opción Única</option>
                            <option value="multiple_choice">Opción Múltiple</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-2 md:space-x-4">
                          {/* Reordering indicators */}
                          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition-all cursor-pointer disabled:opacity-35"
                              title="Subir posición"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(index, 'down')}
                              disabled={index === questions.length - 1}
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition-all cursor-pointer disabled:opacity-35"
                              title="Bajar posición"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Required logic toggle */}
                          <label className="flex items-center space-x-1.5 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) => handleUpdateQuestion(q.id, { required: e.target.checked })}
                              className="w-3.5 h-3.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                            />
                            <span className="text-slate-500 select-none">Obligatoria</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-sm hover:bg-rose-50 transition-all cursor-pointer"
                            title="Eliminar pregunta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Text input */}
                      <div>
                        <input
                          type="text"
                          placeholder="Escribe la pregunta de la encuesta..."
                          value={q.text}
                          onChange={(e) => handleUpdateQuestion(q.id, { text: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Choice answers option subform */}
                      {['multiple_choice', 'single_choice'].includes(q.type) && (
                        <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opciones de respuesta (Los usuarios podrán tildarlas)</span>
                            <button
                              type="button"
                              onClick={() => handleAddOption(q.id)}
                              className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Añadir opción</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options?.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center space-x-1.5 bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                                <span className="text-[10px] text-slate-400 font-mono font-bold w-4 text-center">
                                  {q.type === 'multiple_choice' ? '☐' : '◯'}
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-md text-[11px] px-2 py-1 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                                  placeholder={`Opción ${optIdx + 1}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(q.id, optIdx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-sm cursor-pointer"
                                  title="Eliminar opción"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error notifications and Save survey Button row */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 pt-5 border-t border-slate-100">
              {initialSurvey ? (
                <>
                  <button
                    type="button"
                    onClick={handleSaveSurvey}
                    disabled={saving}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                    title="Crea una encuesta idéntica o editada en otro país con un nuevo enlace, sin alterar la original."
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Guardar como Copia Nueva (Duplicar)</span>
                  </button>

                </>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm shadow-indigo-100"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Guardando encuesta...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Encuesta e Iniciar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
