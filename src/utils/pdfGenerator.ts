import { jsPDF } from 'jspdf';
import { Survey, SurveyQuestion, SurveyResponse } from '../types';
import { getQuestionTypeLabelES } from './answerTranslator';

const PALETTE = [
  [79, 70, 229],   // #4f46e5 (indigo-600)
  [2, 132, 199],   // #0284c7 (sky-600)
  [16, 185, 129],  // #10b981 (emerald-500)
  [245, 158, 11],  // #f59e0b (amber-500)
  [236, 72, 153],  // #ec4899 (pink-500)
  [139, 92, 246],  // #8b5cf6 (violet-500)
  [6, 182, 212],   // #06b6d4 (cyan-500)
  [20, 184, 166],  // #14b8a6 (teal-500)
  [249, 115, 22],  // #f97316 (orange-500)
  [99, 102, 241]   // #6366f1 (indigo-500)
];

export interface PDFGenerationParams {
  survey: Survey;
  filteredResponses: SurveyResponse[];
  allResponsesCount: number;
  selectedLocality: string;
  computeChartData: (question: SurveyQuestion) => Array<{ name: string; Votos: number; porcentaje: string; score?: string }>;
  calculateRatingAverage: (questionId: string) => string;
}

export interface GeneratedPDFResult {
  doc: jsPDF;
  blob: Blob;
  blobUrl: string;
  filename: string;
  download: () => void;
}

export function generateSurveyPDF(params: PDFGenerationParams): GeneratedPDFResult {
  const { 
    survey, 
    filteredResponses, 
    allResponsesCount, 
    selectedLocality, 
    computeChartData, 
    calculateRatingAverage 
  } = params;

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2);

  const cardInnerLeft = margin + 14;
  const cardInnerRight = margin + contentWidth - 14;

  const localityLabel = selectedLocality === 'ALL' ? 'Todas las localidades / Muestra General' : selectedLocality;
  const pctOfTotal = allResponsesCount > 0 
    ? ((filteredResponses.length / allResponsesCount) * 100).toFixed(1) 
    : '0.0';
  const issueDate = new Date().toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let currentY = 0;

  // ---------------------------------------------------------
  // PAGE 1: OFFICIAL TOP HEADER BANNER
  // ---------------------------------------------------------
  doc.setFillColor(30, 27, 75); // #1e1b4b (indigo-950)
  doc.rect(0, 0, pageWidth, 100, 'F');

  // Decorative top accent stripe
  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(0, 0, pageWidth, 4, 'F');

  doc.setTextColor(199, 210, 254); // indigo-200
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME OFICIAL DE RESULTADOS Y DIAGNÓSTICO TERRITORIAL', margin, 26);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  const splitHeaderTitle = doc.splitTextToSize(survey.title || 'INFORME DE ENCUESTAS', contentWidth - 145);
  doc.text(splitHeaderTitle[0] || survey.title, margin, 49);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(224, 231, 255);
  doc.text(`Localidad evaluada: ${localityLabel}`, margin, 70);
  doc.text(`Fecha de emisión: ${issueDate}`, margin, 84);

  // Right-aligned sample badge in banner
  doc.setFillColor(49, 46, 129); // indigo-900
  doc.roundedRect(pageWidth - margin - 135, 18, 135, 64, 6, 6, 'F');
  doc.setTextColor(165, 180, 252);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('MUESTRA ANALIZADA', pageWidth - margin - 123, 36);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(`${filteredResponses.length} votos`, pageWidth - margin - 123, 56);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(199, 210, 254);
  doc.text(`(${pctOfTotal}% del total)`, pageWidth - margin - 123, 72);

  currentY = 115;

  // ---------------------------------------------------------
  // EXECUTIVE SUMMARY BOX
  // ---------------------------------------------------------
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, currentY, contentWidth, 54, 6, 6, 'FD');

  const colWidth = contentWidth / 4;
  
  // KPI 1
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL RESPUESTAS', margin + 12, currentY + 18);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text(`${filteredResponses.length}`, margin + 12, currentY + 36);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('encuestas analizadas', margin + 12, currentY + 46);

  // KPI 2
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('VARIABLES / PREGUNTAS', margin + colWidth + 12, currentY + 18);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text(`${survey.questions.length}`, margin + colWidth + 12, currentY + 36);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('indicadores evaluados', margin + colWidth + 12, currentY + 46);

  // KPI 3
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSOLIDACIÓN', margin + (colWidth * 2) + 12, currentY + 18);
  doc.setTextColor(16, 185, 129); // emerald
  doc.setFontSize(12);
  doc.text('100% Español', margin + (colWidth * 2) + 12, currentY + 36);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('árabe/francés unificados', margin + (colWidth * 2) + 12, currentY + 46);

  // KPI 4
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BASE DE DATOS', margin + (colWidth * 3) + 12, currentY + 18);
  doc.setTextColor(79, 70, 229); // indigo
  doc.setFontSize(12);
  doc.text('Auditada', margin + (colWidth * 3) + 12, currentY + 36);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Firestore Cloud Storage', margin + (colWidth * 3) + 12, currentY + 46);

  currentY += 72;

  // Section Header
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DESGLOSE ESTADÍSTICO Y GRÁFICOS DE BARRAS', margin, currentY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Distribución de frecuencias para ${localityLabel}`, margin, currentY + 12);

  currentY += 24;

  // ---------------------------------------------------------
  // ITERATE OVER QUESTIONS AND RENDER CLEAN BLOCKS
  // ---------------------------------------------------------
  const maxOptWidth = 175;
  const barX = cardInnerLeft + maxOptWidth + 10;
  const barMaxWidth = 230;

  survey.questions.forEach((q, idx) => {
    const chartData = computeChartData(q);
    const averageRating = q.type === 'rating' ? calculateRatingAverage(q.id) : null;
    const answeredCount = filteredResponses.filter(r => {
      const a = r.answers[q.id];
      return a !== undefined && a !== null && a !== '' && (!Array.isArray(a) || a.length > 0);
    }).length;

    // Badges on right side
    const typeLabel = getQuestionTypeLabelES(q.type).toUpperCase();
    const badgeText = `${typeLabel}  |  ${answeredCount} VOTOS`;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    const badgeWidth = doc.getTextWidth(badgeText);

    // Calculate title height
    const maxTitleWidth = contentWidth - badgeWidth - 35;
    const splitTitle = doc.splitTextToSize(`P${idx + 1}. ${q.text}`, maxTitleWidth);
    const titleHeight = Math.max(16, splitTitle.length * 12);
    
    // Calculate content inner height dynamically
    let contentInnerHeight = 0;
    if (['single_choice', 'multiple_choice', 'boolean'].includes(q.type)) {
      chartData.forEach(item => {
        doc.setFontSize(8);
        const optLines = doc.splitTextToSize(item.name, maxOptWidth);
        contentInnerHeight += Math.max(20, optLines.length * 10 + 6);
      });
      contentInnerHeight = Math.max(25, contentInnerHeight);
    } else if (q.type === 'rating') {
      contentInnerHeight = 65;
    } else {
      // Text responses
      contentInnerHeight = Math.min(65, Math.max(25, answeredCount * 18));
    }

    const totalCardHeight = titleHeight + contentInnerHeight + 24;

    // Page break check
    if (currentY + totalCardHeight > pageHeight - 45) {
      doc.addPage();
      currentY = 40;

      // Running page header
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`INFORME DE RESULTADOS • ${survey.title.toUpperCase()} • ${localityLabel.toUpperCase()}`, margin, 24);
      doc.text(`Página ${doc.getNumberOfPages()}`, pageWidth - margin - 40, 24);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, 28, pageWidth - margin, 28);
      currentY = 38;
    }

    // Question card container
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, totalCardHeight, 5, 5, 'FD');

    // Left indicator bar
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(margin, currentY, 3.5, totalCardHeight, 2, 2, 'F');

    // Question Title (wrapped cleanly within maxTitleWidth)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(splitTitle, cardInnerLeft, currentY + 16);

    // Question Badge (Right-aligned at cardInnerRight, perfectly within frame)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(badgeText, cardInnerRight, currentY + 16, { align: 'right' });

    let itemY = currentY + titleHeight + 14;

    // RENDER BARS FOR CHOICE & BOOLEAN
    if (['single_choice', 'multiple_choice', 'boolean'].includes(q.type)) {
      chartData.forEach((item, itemIdx) => {
        const color = PALETTE[itemIdx % PALETTE.length];
        const pctNumber = parseFloat(item.porcentaje) || 0;
        const barFillWidth = Math.max(2, (barMaxWidth * pctNumber) / 100);

        // Option Name with clean text wrapping
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85); // slate-700
        const optLines = doc.splitTextToSize(item.name, maxOptWidth);
        const rowHeight = Math.max(20, optLines.length * 10 + 6);

        doc.text(optLines, cardInnerLeft, itemY + 8);

        // Background Track Bar (Vertically centered in row)
        const barY = itemY + (rowHeight - 9) / 2;
        doc.setFillColor(241, 245, 249); // slate-100
        doc.roundedRect(barX, barY, barMaxWidth, 9, 2.5, 2.5, 'F');

        // Filled Colored Bar
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(barX, barY, barFillWidth, 9, 2.5, 2.5, 'F');

        // Vote count and percentage (RIGHT-ALIGNED AT cardInnerRight - GUARANTEED INSIDE FRAME)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        const voteLabel = `${item.Votos} (${item.porcentaje}%)`;
        doc.text(voteLabel, cardInnerRight, barY + 7, { align: 'right' });

        itemY += rowHeight;
      });
    } else if (q.type === 'rating') {
      // RATING SCALE
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6); // amber-600
      doc.text(`Promedio Obtenido: ${averageRating || 'N/A'} / 10 puntos`, cardInnerLeft, itemY + 8);

      // Mini bar summary of top rating buckets
      itemY += 16;
      const sortedRatings = [...chartData].filter(d => d.Votos > 0);
      if (sortedRatings.length === 0) {
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Sin valoraciones registradas en esta localidad.', cardInnerLeft, itemY + 10);
      } else {
        const ratingStr = sortedRatings.map(d => `${d.name}: ${d.Votos} votos (${d.porcentaje}%)`).join('   •   ');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const splitRating = doc.splitTextToSize(ratingStr, contentWidth - 30);
        doc.text(splitRating, cardInnerLeft, itemY + 8);
      }
    } else {
      // TEXT OPEN RESPONSES
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(71, 85, 105);
      
      const sampleAnswers = filteredResponses
        .map(r => r.answers[q.id])
        .filter(ans => ans !== undefined && ans !== null && ans !== '')
        .slice(0, 3);

      if (sampleAnswers.length === 0) {
        doc.text('Sin respuestas abiertas para esta pregunta en esta localidad.', cardInnerLeft, itemY + 10);
      } else {
        sampleAnswers.forEach(ans => {
          const cleanAns = `"${String(ans).trim()}"`;
          const splitAns = doc.splitTextToSize(cleanAns, contentWidth - 35);
          doc.text(splitAns[0] || cleanAns, cardInnerLeft, itemY + 8);
          itemY += 13;
        });
      }
    }

    currentY += totalCardHeight + 10;
  });

  // ---------------------------------------------------------
  // RUNNING FOOTERS ON ALL PAGES
  // ---------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

    doc.text('Documento Oficial de Resultados • Plataforma de Encuestas y Diagnóstico Territorial', margin, pageHeight - 14);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 14, { align: 'right' });
  }

  // Generate output blob and download action
  const cleanLocalityName = selectedLocality === 'ALL' 
    ? 'todas_las_localidades' 
    : selectedLocality.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `informe_${survey.id}_${cleanLocalityName}.pdf`;

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  const download = () => {
    doc.save(filename);
  };

  return {
    doc,
    blob,
    blobUrl,
    filename,
    download
  };
}
