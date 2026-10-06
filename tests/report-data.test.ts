import test from 'node:test';
import assert from 'node:assert/strict';
import { ratingAverage, csvCell } from '../src/utils/dataProtection';
import { ratingDistribution, surveyReportCSV, resolveResponseSurvey } from '../src/utils/reportData';
import type { Survey, SurveyResponse } from '../src/types';
import { normalizeAnswerToSpanish, getSurveyLocalities } from '../src/utils/answerTranslator';

const survey: Survey = { id: 'synthetic-report', title: 'Report test', description: '',
  targetCountry: 'Test', targetLanguage: 'es', translations: {}, createdAt: '2026-10-06', createdBy: 'test',
  questions: [
    { id: 'text', text: 'Texto, con "comillas"\ny salto', type: 'text', required: false },
    { id: 'choice', text: 'Opciones', type: 'multiple_choice', options: ['Otro', 'Ninguna'], required: false },
    { id: 'rating', text: 'Puntaje', type: 'rating', required: false }
  ] };
const response: SurveyResponse = { id: 'synthetic-only', surveyId: survey.id, userName: '=SUM(A1)',
  userLanguage: 'en', submittedAt: '2026-10-06T15:04:00.000Z',
  answers: { text: 'other\nTexto original, "sin cambiar"', choice: ['other', 'none'], rating: 11 } };

test('rating graph and average use the same integer scale without changing inputs', () => {
  const values = [1, '10', 5, 0, 11, 1.5, true, [], ['10'], '', ' ', null, undefined, 'invalid'];
  const before = structuredClone(values);
  const chart = ratingDistribution(values);
  assert.equal(chart.length, 10);
  assert.equal(chart.reduce((sum, item) => sum + item.Votos, 0), 3);
  assert.equal(chart[0].Votos, 1);
  assert.equal(chart[9].Votos, 1);
  assert.equal(chart[4].porcentaje, '33.3');
  assert.equal(ratingAverage(values), '5.3');
  assert.equal(ratingAverage([11, 1.5, true]), 'N/A');
  assert.ok(ratingDistribution([11, null]).every(item => item.Votos === 0 && item.porcentaje === '0.0'));
  assert.deepEqual(values, before);
});

test('CSV includes original values and normalization separately, preserves metadata and escapes formulas', () => {
  const source = structuredClone([survey, response]);
  const csv = surveyReportCSV(survey, [response]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes(csvCell('P1 Original: ' + survey.questions[0].text)));
  assert.ok(csv.includes(csvCell(response.answers.text)));
  assert.ok(csv.includes(csvCell(JSON.stringify(response.answers.choice)) + ',' + csvCell('Otro; Ninguna')));
  assert.ok(csv.includes(csvCell(response.submittedAt)));
  assert.ok(csv.includes(csvCell(response.userName)));
  assert.ok(csv.includes(',"en","",'));
  assert.deepEqual([survey, response], source);
});

test('historical Mauritania aliases resolve for read-only details, with exact IDs taking precedence', () => {
  const current = { ...survey, id: 'survey_mauritania_dos' };
  const historical = { ...survey, id: 'survey_mauritania_perfecta' };
  assert.equal(resolveResponseSurvey([current], historical.id), current);
  assert.equal(resolveResponseSurvey([historical], current.id), historical);
  assert.equal(resolveResponseSurvey([current, historical], historical.id), historical);
  assert.equal(resolveResponseSurvey([current], 'unknown'), undefined);
});

test('unrecognized answer labels cannot be mistaken for inherited object properties', () => {
  const question = { id: 'location', text: 'Lugar de residencia', type: 'single_choice' as const,
    required: false, options: ['__proto__', 'constructor', 'toString'] };
  const source = { ...survey, questions: [question] };
  const records = question.options.map((value, index) => ({ ...response, id: `test-${index}`, answers: { location: value } }));
  for (const value of question.options) assert.equal(normalizeAnswerToSpanish(value, question, source), value);
  assert.equal(normalizeAnswerToSpanish('constructor', survey.questions[1], survey), 'constructor');
  const { localities } = getSurveyLocalities(source, records);
  for (const value of question.options) assert.equal(localities.find(item => item.id === value)?.count, 1);
});

test('generated PDF explains percentage bases and does not report an invalid rating as a valid response', async () => {
  const { generateSurveyPDF } = await import('../src/utils/pdfGenerator');
  const { PDFParse } = await import('pdf-parse');
  const result = generateSurveyPDF({ survey, filteredResponses: [response], allResponsesCount: 1,
    selectedLocality: 'ALL', computeChartData: question => question.type === 'rating' ? ratingDistribution([11]) : [],
    calculateRatingAverage: () => ratingAverage([11]) });
  const parser = new PDFParse({ data: new Uint8Array(await result.blob.arrayBuffer()) });
  try {
    const { text } = await parser.getText();
    assert.match(text, /porcentajes sobre selecciones, no sobre participantes/);
    assert.match(text, /VALORACIÓN \(1 AL 10\)\s*\|\s*0 RESPUESTAS/);
    assert.match(text, /Sin puntajes válidos para calcular el promedio/);
    assert.doesNotMatch(text, /N\/A\s*\/\s*10/);
  } finally {
    await parser.destroy();
    URL.revokeObjectURL(result.blobUrl);
  }
});
