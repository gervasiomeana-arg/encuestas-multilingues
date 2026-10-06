export function parseRawTextToSurveyVerbatim(text: string, filename: string) {
  const rawLines = text.split(/\r?\n/).map(l => l.trim());
  const lines = rawLines.filter(l => l.length > 0);

  if (lines.length === 0) {
    const cleanFilename = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    return {
      title: cleanFilename,
      description: "Encuesta importada directamente del archivo original.",
      questions: []
    };
  }

  // Find a good title and description
  let title = lines[0];
  let description = "Encuesta importada directamente del archivo original (Modo copia literal sin IA).";
  let startIndex = 1;

  if (title.length > 100) {
    title = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    description = lines[0];
    startIndex = 1;
  } else if (lines.length > 1) {
    const secondLine = lines[1];
    const isQuestion = secondLine.endsWith("?") || secondLine.includes("¿") || /^\d+[\.\)]/.test(secondLine);
    const isOption = /^[\s\d\w\)\.\-\*•\[\]]+$/.test(secondLine) && secondLine.length < 50 && (secondLine.startsWith("-") || secondLine.startsWith("*") || /^[a-gA-G][\)\.]/.test(secondLine));
    if (!isQuestion && !isOption && secondLine.length > 10) {
      description = secondLine;
      startIndex = 2;
    }
  }

  if (/^\d+\s*[.)]|[¿?]/.test(lines[0])) {
    title = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    startIndex = 0;
  }

  // Clean title from common labels
  title = title.replace(/^(t[ií]tulo|title|encuesta|survey|evaluaci[oó]n):\s*/i, "").trim();

  const questions: any[] = [];
  let currentQuestion: any = null;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    // Detect if this line represents an option of the previous question
    const isBulletOption = /^[•\-\*\+]\s*(.+)$/.test(line);
    const isCheckboxOption = /^\[\s*x?\s*\]\s*(.+)$/i.test(line) || /^\(\s*x?\s*\)\s*(.+)$/i.test(line);
    const isIndexOption = /^[a-gA-G0-9]+\s*[\)\.\-]\s*(.+)$/.test(line);

    // Numbered lines are questions, never silently merged into an earlier answer.
    // Numbered answer lists are ambiguous and require review before publication.
    const isNumberedLine = /^\d+\s*[.)-]\s*/.test(line);
    const isOption = !isNumberedLine && (isBulletOption || isCheckboxOption || isIndexOption) && currentQuestion;

    if (isOption) {
      if (currentQuestion.type === "text") {
        currentQuestion.type = "single_choice";
      }
      if (!currentQuestion.options) {
        currentQuestion.options = [];
      }

      let optionText = line;
      if (isBulletOption) {
        optionText = line.replace(/^[•\-\*\+]\s*/, "");
      } else if (isCheckboxOption) {
        optionText = line.replace(/^\[\s*x?\s*\]\s*/i, "").replace(/^\(\s*x?\s*\)\s*/i, "");
      } else if (isIndexOption) {
        optionText = line.replace(/^[a-gA-G0-9]+\s*[\)\.\-]\s*/, "");
      }

      currentQuestion.options.push(optionText.trim());
    } else {
      // Treat this line as a new question!
      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      let type: "text" | "rating" | "boolean" | "single_choice" = "text";
      const lineLower = line.toLowerCase();

      if (
        lineLower.includes("sí o no") ||
        lineLower.includes("si o no") ||
        lineLower.includes("verdadero o falso") ||
        lineLower.includes("(si/no)") ||
        lineLower.includes("(sí/no)")
      ) {
        type = "boolean";
      } else if (
        lineLower.includes("escala del") ||
        lineLower.includes("escala de 1") ||
        lineLower.includes("(1 al") ||
        lineLower.includes("(1-5)") ||
        lineLower.includes("(1-10)")
      ) {
        type = "rating";
      }

      currentQuestion = {
        id: `q_parsed_${Date.now()}_${questions.length}_${Math.random().toString(36).substr(2, 4)}`,
        text: line,
        type,
        options: [],
        required: true
      };
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return {
    title,
    description,
    questions,
    warnings: ['Revisa el texto y las opciones antes de guardar. Las listas numéricas pueden representar preguntas u opciones.']
  };
}

