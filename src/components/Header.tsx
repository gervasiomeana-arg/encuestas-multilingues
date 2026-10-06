import React from 'react';
import { ClipboardList, Settings, Landmark, Globe, FileText, CheckCircle } from 'lucide-react';

interface HeaderProps {
  viewMode: 'user' | 'admin';
  onChangeViewMode: (mode: 'user' | 'admin') => void;
  totalSurveys: number;
  totalResponses: number;
}

export default function Header({ viewMode, onChangeViewMode, totalSurveys, totalResponses }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black font-display text-slate-800 tracking-tight flex items-center gap-1.5 leading-none">
                ENCUESTA PARA <span className="text-indigo-600">MAURITANIA</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mt-0.5">Formato Dinámico por Bloques</p>
              <p className="text-[8px] text-indigo-500 font-mono font-semibold tracking-wider uppercase mt-px">created by cm</p>
            </div>
          </div>

          {/* Quick Metrics (visible on md+) */}
          <div className="hidden md:flex items-center space-x-6 text-sm text-slate-500">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="font-medium text-slate-700">{totalSurveys}</span>
              <span>Encuestas</span>
            </div>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-700">{totalResponses}</span>
              <span>Respuestas Históricas</span>
            </div>
          </div>

          {/* Role Changer Menu (Segmented Button Container) */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl" id="view-mode-selector">
            <button
               onClick={() => onChangeViewMode('user')}
               id="user-mode-btn"
               className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-150 ${
                viewMode === 'user'
                  ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>RESPONDER</span>
            </button>
            <button
               onClick={() => onChangeViewMode('admin')}
               id="admin-mode-btn"
               className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-150 ${
                viewMode === 'admin'
                  ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>ADMINISTRACIÓN</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
