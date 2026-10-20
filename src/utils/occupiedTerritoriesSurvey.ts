import type { Survey } from '../types';

// New questionnaire transcribed from the owner's Word document. No historical IDs are reused.
export const OCCUPIED_TERRITORIES_SURVEY: Survey = {
  "id": "survey_sahara_territorios_ocupados_20261020",
  "title": "TERRITORIOS OCUPADOS DEL SÁHARA OCCIDENTAL",
  "description": "ENCUESTA PARA MUJERES SAHARAUIS EN LOS TERRITORIOS OCUPADOS DEL SÁHARA OCCIDENTAL\n\nConsentimiento informado. Esta encuesta busca conocer cómo el conflicto del Sáhara Occidental y la situación de ocupación afectan a la vida, los derechos y el bienestar de las mujeres saharauis residentes en los territorios ocupados. Los resultados podrán contribuir a informes de derechos humanos destinados a mecanismos internacionales, incluidos los de Naciones Unidas. No solicitamos nombres. Participar es voluntario: puede omitir preguntas o abandonar en cualquier momento. Las respuestas se utilizarán solo conforme a la información de privacidad y protección que facilite la entidad responsable antes de su aplicación.",
  "questions": [
    {
      "id": "to_consent",
      "displayNumber": "Consentimiento",
      "text": "Consentimiento de participación",
      "type": "single_choice",
      "options": [
        "Acepto participar y utilizar mis respuestas de forma agregada y no identificable en informes de derechos humanos.",
        "No acepto (finalizar)."
      ],
      "required": true
    },
    {
      "id": "to_date",
      "displayNumber": "Fecha",
      "text": "Fecha",
      "type": "text",
      "required": false
    },
    {
      "id": "to_1",
      "displayNumber": "1",
      "text": "BLOQUE 1. PERFIL: Edad",
      "type": "single_choice",
      "options": [
        "18–25 años",
        "26–35 años",
        "36–50 años",
        "Más de 50 años",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_2",
      "displayNumber": "2",
      "text": "BLOQUE 1. PERFIL: Lugar de residencia",
      "type": "single_choice",
      "options": [
        "El Aaiún",
        "Smara",
        "Bojador",
        "Dajla",
        "Otra zona de los territorios ocupados",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_3",
      "displayNumber": "3",
      "text": "BLOQUE 1. PERFIL: ¿Cuántas personas tiene a su cargo?",
      "type": "single_choice",
      "options": [
        "Ninguna",
        "1–2",
        "3–5",
        "Más de 5",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_4",
      "displayNumber": "4",
      "text": "BLOQUE 1. PERFIL: Situación principal",
      "type": "single_choice",
      "options": [
        "Estudiante",
        "Trabajadora por cuenta ajena",
        "Trabajadora por cuenta propia",
        "Desempleada",
        "Trabajo doméstico y de cuidados no remunerado",
        "Otra situación",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_5",
      "displayNumber": "5",
      "text": "BLOQUE 2. CONSECUENCIAS DEL CONFLICTO EN LA VIDA COTIDIANA: ¿De qué maneras ha afectado el conflicto a su vida? (Puede marcar varias)",
      "type": "multiple_choice",
      "options": [
        "Separación de familiares",
        "Dificultades para viajar o visitar a familiares",
        "Pérdida de empleo o ingresos",
        "Dificultades educativas",
        "Dificultades para recibir atención sanitaria",
        "Limitaciones para expresarme o participar",
        "Miedo o inseguridad cotidiana",
        "Dificultades para mis proyectos personales",
        "Dificultades para expresar mi identidad cultural",
        "No identifico consecuencias",
        "Otras",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_6",
      "displayNumber": "6",
      "text": "BLOQUE 2. CONSECUENCIAS DEL CONFLICTO EN LA VIDA COTIDIANA: ¿Qué consecuencias ha experimentado en sus relaciones familiares? (Puede marcar varias)",
      "type": "multiple_choice",
      "options": [
        "Separación prolongada de familiares",
        "Dificultades para mantener el contacto",
        "Dificultades para reunirme con familiares",
        "Preocupación por su seguridad",
        "Fallecimiento o desaparición de familiares vinculados al conflicto",
        "Aumento de responsabilidades de cuidados",
        "Ninguna de las anteriores",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_7",
      "displayNumber": "7",
      "text": "BLOQUE 2. CONSECUENCIAS DEL CONFLICTO EN LA VIDA COTIDIANA: ¿Cómo ha afectado a su situación económica y laboral? (Puede marcar varias)",
      "type": "multiple_choice",
      "options": [
        "Dificultades para obtener empleo",
        "Discriminación laboral",
        "Pérdida de ingresos o medios de vida",
        "Menos oportunidades de formación",
        "Mayores responsabilidades económicas",
        "No ha afectado a mi situación",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_8",
      "displayNumber": "8",
      "text": "BLOQUE 2. CONSECUENCIAS DEL CONFLICTO EN LA VIDA COTIDIANA: ¿Ha tenido que renunciar, retrasar o modificar proyectos personales por consecuencias del conflicto? (Puede marcar varias)",
      "type": "multiple_choice",
      "options": [
        "Estudiar o seguir formándome",
        "Buscar o mantener empleo",
        "Iniciar negocio o actividad económica",
        "Viajar o cambiar de residencia",
        "Reunirme con familiares",
        "Participar en actividades públicas",
        "Otros proyectos personales",
        "No he tenido que modificarlos",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_9",
      "displayNumber": "9",
      "text": "BLOQUE 2. CONSECUENCIAS DEL CONFLICTO EN LA VIDA COTIDIANA: ¿Ha encontrado dificultades para expresar o transmitir su identidad cultural saharaui? (Puede marcar varias)",
      "type": "multiple_choice",
      "options": [
        "Expresar públicamente mi identidad",
        "Participar en actividades culturales",
        "Utilizar símbolos identitarios",
        "Transmitir historia o cultura a nuevas generaciones",
        "Participar en celebraciones",
        "No he encontrado dificultades",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_10",
      "displayNumber": "10",
      "text": "BLOQUE 2. CONSECUENCIAS DEL CONFLICTO EN LA VIDA COTIDIANA: ¿Qué responsabilidades u oportunidades se han visto afectadas en su vida como mujer? (Puede marcar varias)",
      "type": "multiple_choice",
      "options": [
        "Mayor carga de cuidados",
        "Mayor carga económica familiar",
        "Dificultad para conciliar empleo y cuidados",
        "Menos oportunidades educativas o profesionales",
        "Mayor exposición a inseguridad o violencia",
        "Limitaciones a mi autonomía",
        "Ninguna de las anteriores",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_11",
      "displayNumber": "11",
      "text": "BLOQUE 3. VULNERACIONES DE DERECHOS HUMANOS: Durante los últimos 12 meses, ¿qué situaciones ha sufrido personalmente? (Puede marcar varias)",
      "type": "multiple_choice",
      "options": [
        "Amenazas o intimidación",
        "Agresiones físicas o malos tratos",
        "Detención que considera arbitraria",
        "Vigilancia, seguimiento o acoso",
        "Impedimentos para manifestarme pacíficamente",
        "Restricciones a la expresión o asociación",
        "Discriminación laboral o educativa",
        "Obstáculos discriminatorios en servicios públicos",
        "Restricciones de movimiento",
        "Acoso digital",
        "Violencia o acoso sexual",
        "Ninguna de las anteriores",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_12",
      "displayNumber": "12",
      "text": "BLOQUE 3. VULNERACIONES DE DERECHOS HUMANOS: Si sufrió alguna de esas situaciones, ¿con qué frecuencia en los últimos 12 meses?",
      "type": "single_choice",
      "options": [
        "Una vez",
        "Dos o tres veces",
        "Cuatro veces o más",
        "Ninguna",
        "No recuerdo",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_13",
      "displayNumber": "13",
      "text": "BLOQUE 3. VULNERACIONES DE DERECHOS HUMANOS: ¿Dónde o en qué contexto sucedieron? (Puede marcar varias)",
      "type": "multiple_choice",
      "options": [
        "Manifestaciones pacíficas",
        "Reuniones de organizaciones",
        "Espacios públicos",
        "Controles o desplazamientos",
        "Centros educativos",
        "Lugar de trabajo",
        "Instituciones o servicios públicos",
        "Redes sociales",
        "Otros",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_14",
      "displayNumber": "14",
      "text": "BLOQUE 3. VULNERACIONES DE DERECHOS HUMANOS: Según lo que observó, ¿a quién atribuye los hechos? (Puede marcar varias)",
      "type": "multiple_choice",
      "options": [
        "Agentes policiales o fuerzas de seguridad marroquíes",
        "Otros representantes de autoridades",
        "Personas particulares",
        "Personas no identificadas",
        "No puedo determinarlo",
        "Otros",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_15",
      "displayNumber": "15",
      "text": "BLOQUE 3. VULNERACIONES DE DERECHOS HUMANOS: ¿Ha presenciado directamente hechos similares contra otras mujeres durante los últimos 12 meses?",
      "type": "multiple_choice",
      "options": [
        "Sí, agresiones o malos tratos",
        "Sí, amenazas o intimidación",
        "Sí, detenciones",
        "Sí, restricciones a reunión o expresión",
        "Sí, acoso o discriminación",
        "Sí, otras situaciones",
        "No he presenciado hechos similares",
        "Solo conozco relatos de otras personas",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_16",
      "displayNumber": "16",
      "text": "BLOQUE 4. SALUD FÍSICA Y BIENESTAR PSICOSOCIAL: ¿Qué consecuencias ha experimentado en su salud o vida diaria a raíz de esas situaciones? (Puede marcar varias)",
      "type": "multiple_choice",
      "options": [
        "Lesiones físicas",
        "Necesidad de atención médica",
        "Miedo o ansiedad persistente",
        "Alteraciones del sueño",
        "Tristeza o angustia emocional",
        "Dificultades de concentración",
        "Aislamiento social",
        "Conflictos familiares",
        "Pérdida de ingresos o interrupción de estudios",
        "Ninguna de las anteriores",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_17_1",
      "displayNumber": "17.1",
      "text": "BLOQUE 4. SALUD FÍSICA Y BIENESTAR PSICOSOCIAL: Durante las últimas cuatro semanas, ¿con qué frecuencia ha sentido lo siguiente? — Preocupación por familiares en campamentos u otros lugares",
      "type": "single_choice",
      "options": [
        "Nunca",
        "A veces",
        "Siempre",
        "No responde"
      ],
      "required": false
    },
    {
      "id": "to_17_2",
      "displayNumber": "17.2",
      "text": "BLOQUE 4. SALUD FÍSICA Y BIENESTAR PSICOSOCIAL: Durante las últimas cuatro semanas, ¿con qué frecuencia ha sentido lo siguiente? — Miedo por su seguridad o la de su familia",
      "type": "single_choice",
      "options": [
        "Nunca",
        "A veces",
        "Siempre",
        "No responde"
      ],
      "required": false
    },
    {
      "id": "to_17_3",
      "displayNumber": "17.3",
      "text": "BLOQUE 4. SALUD FÍSICA Y BIENESTAR PSICOSOCIAL: Durante las últimas cuatro semanas, ¿con qué frecuencia ha sentido lo siguiente? — Miedo a represalias por expresarse",
      "type": "single_choice",
      "options": [
        "Nunca",
        "A veces",
        "Siempre",
        "No responde"
      ],
      "required": false
    },
    {
      "id": "to_17_4",
      "displayNumber": "17.4",
      "text": "BLOQUE 4. SALUD FÍSICA Y BIENESTAR PSICOSOCIAL: Durante las últimas cuatro semanas, ¿con qué frecuencia ha sentido lo siguiente? — Dificultad para dormir",
      "type": "single_choice",
      "options": [
        "Nunca",
        "A veces",
        "Siempre",
        "No responde"
      ],
      "required": false
    },
    {
      "id": "to_17_5",
      "displayNumber": "17.5",
      "text": "BLOQUE 4. SALUD FÍSICA Y BIENESTAR PSICOSOCIAL: Durante las últimas cuatro semanas, ¿con qué frecuencia ha sentido lo siguiente? — Ansiedad o preocupación persistente",
      "type": "single_choice",
      "options": [
        "Nunca",
        "A veces",
        "Siempre",
        "No responde"
      ],
      "required": false
    },
    {
      "id": "to_17_6",
      "displayNumber": "17.6",
      "text": "BLOQUE 4. SALUD FÍSICA Y BIENESTAR PSICOSOCIAL: Durante las últimas cuatro semanas, ¿con qué frecuencia ha sentido lo siguiente? — Tristeza, impotencia o desesperanza",
      "type": "single_choice",
      "options": [
        "Nunca",
        "A veces",
        "Siempre",
        "No responde"
      ],
      "required": false
    },
    {
      "id": "to_17_7",
      "displayNumber": "17.7",
      "text": "BLOQUE 4. SALUD FÍSICA Y BIENESTAR PSICOSOCIAL: Durante las últimas cuatro semanas, ¿con qué frecuencia ha sentido lo siguiente? — Dificultad para actividades diarias por su estado emocional",
      "type": "single_choice",
      "options": [
        "Nunca",
        "A veces",
        "Siempre",
        "No responde"
      ],
      "required": false
    },
    {
      "id": "to_18",
      "displayNumber": "18",
      "text": "BLOQUE 4. SALUD FÍSICA Y BIENESTAR PSICOSOCIAL: ¿Ha necesitado apoyo médico o psicológico por estas experiencias?",
      "type": "single_choice",
      "options": [
        "Sí, lo recibí",
        "Lo busqué, pero no pude acceder",
        "Lo necesité, pero no lo busqué",
        "No lo he necesitado",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_19",
      "displayNumber": "19",
      "text": "BLOQUE 4. SALUD FÍSICA Y BIENESTAR PSICOSOCIAL: ¿Cuenta con personas de confianza a quienes acudir para recibir apoyo?",
      "type": "single_choice",
      "options": [
        "Sí, varias",
        "Sí, algunas",
        "No",
        "Evito pedir apoyo por motivos de seguridad",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_20",
      "displayNumber": "20",
      "text": "BLOQUE 5. JUSTICIA, PROTECCIÓN Y PARTICIPACIÓN: Si ha sufrido alguna vulneración, ¿la ha comunicado o denunciado?",
      "type": "single_choice",
      "options": [
        "Sí, ante instituciones oficiales",
        "Sí, ante organizaciones de DD. HH.",
        "Sí, ante ambas",
        "No",
        "No he sufrido vulneraciones",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_21",
      "displayNumber": "21",
      "text": "BLOQUE 5. JUSTICIA, PROTECCIÓN Y PARTICIPACIÓN: Si denunció, ¿qué respuesta recibió? Si no lo hizo, ¿por qué? (Marque lo que corresponda)",
      "type": "multiple_choice",
      "options": [
        "Se investigó el caso",
        "Recibí protección o reparación",
        "No recibí respuesta",
        "Se rechazó la denuncia",
        "Procedimiento en curso",
        "No denuncié por miedo a represalias",
        "No denuncié por desconfianza",
        "No denuncié por falta de información o recursos",
        "No corresponde",
        "Prefiero no responder"
      ],
      "required": false
    },
    {
      "id": "to_22",
      "displayNumber": "22",
      "text": "BLOQUE 5. JUSTICIA, PROTECCIÓN Y PARTICIPACIÓN: Durante los últimos 12 meses, ¿cómo se ha visto afectada su participación pública? (Puede marcar varias)",
      "type": "multiple_choice",
      "options": [
        "He participado en reuniones o manifestaciones pacíficas",
        "He participado en organizaciones o defensa de DD. HH.",
        "He reducido mi participación por temor",
        "He dejado de participar por temor",
        "He recibido amenazas o represalias por participar",
        "No participaba en estas actividades",
        "Prefiero no responder"
      ],
      "required": false
    }
  ],
  "targetCountry": "Sáhara Occidental (Territorios Ocupados)",
  "targetLanguage": "haa",
  "translations": {
    "fr": {
      "title": "TERRITOIRES OCCUPÉS DU SAHARA OCCIDENTAL",
      "description": "ENQUÊTE POUR LES FEMMES SAHRAOUIES DANS LES TERRITOIRES OCCUPÉS DU SAHARA OCCIDENTAL\n\nConsentement éclairé. Cette enquête vise à comprendre comment le conflit du Sahara occidental et la situation d’occupation affectent la vie, les droits et le bien-être des femmes sahraouies résidant dans les territoires occupés. Les résultats pourront contribuer à des rapports sur les droits humains destinés à des mécanismes internationaux, y compris ceux des Nations Unies. Nous ne demandons pas de noms. La participation est volontaire : vous pouvez omettre des questions ou arrêter à tout moment. Les réponses seront utilisées uniquement conformément aux informations relatives à la vie privée et à la protection fournies par l’entité responsable avant la réalisation de l’enquête.",
      "questions": {
        "to_consent": {
          "text": "Consentement à la participation",
          "options": [
            "J’accepte de participer et que mes réponses soient utilisées de manière agrégée et non identifiable dans des rapports sur les droits humains.",
            "Je n’accepte pas (terminer)."
          ]
        },
        "to_date": {
          "text": "Date"
        },
        "to_1": {
          "text": "BLOC 1. PROFIL : Âge",
          "options": [
            "18–25 ans",
            "26–35 ans",
            "36–50 ans",
            "Plus de 50 ans",
            "Je préfère ne pas répondre"
          ]
        },
        "to_2": {
          "text": "BLOC 1. PROFIL : Lieu de résidence",
          "options": [
            "El Aaiún",
            "Smara",
            "Bojador",
            "Dajla",
            "Une autre zone des territoires occupés",
            "Je préfère ne pas répondre"
          ]
        },
        "to_3": {
          "text": "BLOC 1. PROFIL : Combien de personnes sont à votre charge ?",
          "options": [
            "Aucune",
            "1–2",
            "3–5",
            "Plus de 5",
            "Je préfère ne pas répondre"
          ]
        },
        "to_4": {
          "text": "BLOC 1. PROFIL : Situation principale",
          "options": [
            "Étudiante",
            "Salariée",
            "Travailleuse indépendante",
            "Sans emploi",
            "Travail domestique et soins non rémunérés",
            "Autre situation",
            "Je préfère ne pas répondre"
          ]
        },
        "to_5": {
          "text": "BLOC 2. CONSÉQUENCES DU CONFLIT DANS LA VIE QUOTIDIENNE : De quelles manières le conflit a-t-il affecté votre vie ? (Plusieurs réponses possibles)",
          "options": [
            "Séparation de membres de la famille",
            "Difficultés à voyager ou à rendre visite à des proches",
            "Perte d’emploi ou de revenus",
            "Difficultés dans les études",
            "Difficultés d’accès aux soins de santé",
            "Restrictions à l’expression ou à la participation",
            "Peur ou insécurité au quotidien",
            "Difficultés dans mes projets personnels",
            "Difficultés à exprimer mon identité culturelle",
            "Je n’identifie pas de conséquences",
            "Autres",
            "Je préfère ne pas répondre"
          ]
        },
        "to_6": {
          "text": "BLOC 2. CONSÉQUENCES DU CONFLIT DANS LA VIE QUOTIDIENNE : Quelles conséquences avez-vous connues dans vos relations familiales ? (Plusieurs réponses possibles)",
          "options": [
            "Séparation prolongée de membres de la famille",
            "Difficultés à maintenir le contact",
            "Difficultés à retrouver des proches",
            "Inquiétude pour leur sécurité",
            "Décès ou disparition de membres de la famille liés au conflit",
            "Augmentation des responsabilités de soins",
            "Aucune de ces réponses",
            "Je préfère ne pas répondre"
          ]
        },
        "to_7": {
          "text": "BLOC 2. CONSÉQUENCES DU CONFLIT DANS LA VIE QUOTIDIENNE : Comment le conflit a-t-il affecté votre situation économique et professionnelle ? (Plusieurs réponses possibles)",
          "options": [
            "Difficultés à trouver un emploi",
            "Discrimination au travail",
            "Perte de revenus ou de moyens de subsistance",
            "Moins de possibilités de formation",
            "Responsabilités économiques accrues",
            "Il n’a pas affecté ma situation",
            "Je préfère ne pas répondre"
          ]
        },
        "to_8": {
          "text": "BLOC 2. CONSÉQUENCES DU CONFLIT DANS LA VIE QUOTIDIENNE : Avez-vous dû abandonner, retarder ou modifier des projets personnels en raison des conséquences du conflit ? (Plusieurs réponses possibles)",
          "options": [
            "Étudier ou poursuivre une formation",
            "Chercher ou conserver un emploi",
            "Créer une entreprise ou une activité économique",
            "Voyager ou changer de résidence",
            "Retrouver des proches",
            "Participer à des activités publiques",
            "Autres projets personnels",
            "Je n’ai pas dû les modifier",
            "Je préfère ne pas répondre"
          ]
        },
        "to_9": {
          "text": "BLOC 2. CONSÉQUENCES DU CONFLIT DANS LA VIE QUOTIDIENNE : Avez-vous rencontré des difficultés à exprimer ou à transmettre votre identité culturelle sahraouie ? (Plusieurs réponses possibles)",
          "options": [
            "Exprimer publiquement mon identité",
            "Participer à des activités culturelles",
            "Utiliser des symboles identitaires",
            "Transmettre l’histoire ou la culture aux nouvelles générations",
            "Participer à des célébrations",
            "Je n’ai pas rencontré de difficultés",
            "Je préfère ne pas répondre"
          ]
        },
        "to_10": {
          "text": "BLOC 2. CONSÉQUENCES DU CONFLIT DANS LA VIE QUOTIDIENNE : Quelles responsabilités ou possibilités ont été affectées dans votre vie en tant que femme ? (Plusieurs réponses possibles)",
          "options": [
            "Charge de soins accrue",
            "Charge économique familiale accrue",
            "Difficultés à concilier emploi et soins",
            "Moins de possibilités d’études ou professionnelles",
            "Exposition accrue à l’insécurité ou à la violence",
            "Restrictions à mon autonomie",
            "Aucune de ces réponses",
            "Je préfère ne pas répondre"
          ]
        },
        "to_11": {
          "text": "BLOC 3. VIOLATIONS DES DROITS HUMAINS : Au cours des 12 derniers mois, quelles situations avez-vous personnellement subies ? (Plusieurs réponses possibles)",
          "options": [
            "Menaces ou intimidation",
            "Agressions physiques ou mauvais traitements",
            "Détention que vous considérez comme arbitraire",
            "Surveillance, filature ou harcèlement",
            "Empêchements de manifester pacifiquement",
            "Restrictions à l’expression ou à l’association",
            "Discrimination au travail ou dans les études",
            "Obstacles discriminatoires dans les services publics",
            "Restrictions de déplacement",
            "Harcèlement en ligne",
            "Violence ou harcèlement sexuel",
            "Aucune de ces réponses",
            "Je préfère ne pas répondre"
          ]
        },
        "to_12": {
          "text": "BLOC 3. VIOLATIONS DES DROITS HUMAINS : Si vous avez subi l’une de ces situations, à quelle fréquence au cours des 12 derniers mois ?",
          "options": [
            "Une fois",
            "Deux ou trois fois",
            "Quatre fois ou plus",
            "Aucune",
            "Je ne me souviens pas",
            "Je préfère ne pas répondre"
          ]
        },
        "to_13": {
          "text": "BLOC 3. VIOLATIONS DES DROITS HUMAINS : Où ou dans quel contexte ces faits se sont-ils produits ? (Plusieurs réponses possibles)",
          "options": [
            "Manifestations pacifiques",
            "Réunions d’organisations",
            "Espaces publics",
            "Contrôles ou déplacements",
            "Établissements d’enseignement",
            "Lieu de travail",
            "Institutions ou services publics",
            "Réseaux sociaux",
            "Autres",
            "Je préfère ne pas répondre"
          ]
        },
        "to_14": {
          "text": "BLOC 3. VIOLATIONS DES DROITS HUMAINS : D’après vos observations, à qui attribuez-vous les faits ? (Plusieurs réponses possibles)",
          "options": [
            "Agents de police ou forces de sécurité marocaines",
            "Autres représentants des autorités",
            "Personnes privées",
            "Personnes non identifiées",
            "Je ne peux pas le déterminer",
            "Autres",
            "Je préfère ne pas répondre"
          ]
        },
        "to_15": {
          "text": "BLOC 3. VIOLATIONS DES DROITS HUMAINS : Avez-vous été directement témoin de faits similaires contre d’autres femmes au cours des 12 derniers mois ?",
          "options": [
            "Oui, agressions ou mauvais traitements",
            "Oui, menaces ou intimidation",
            "Oui, détentions",
            "Oui, restrictions à la réunion ou à l’expression",
            "Oui, harcèlement ou discrimination",
            "Oui, autres situations",
            "Je n’ai pas été témoin de faits similaires",
            "Je ne connais que des récits d’autres personnes",
            "Je préfère ne pas répondre"
          ]
        },
        "to_16": {
          "text": "BLOC 4. SANTÉ PHYSIQUE ET BIEN-ÊTRE PSYCHOSOCIAL : Quelles conséquences avez-vous connues sur votre santé ou votre vie quotidienne à la suite de ces situations ? (Plusieurs réponses possibles)",
          "options": [
            "Blessures physiques",
            "Besoin de soins médicaux",
            "Peur ou anxiété persistante",
            "Troubles du sommeil",
            "Tristesse ou détresse émotionnelle",
            "Difficultés de concentration",
            "Isolement social",
            "Conflits familiaux",
            "Perte de revenus ou interruption des études",
            "Aucune de ces réponses",
            "Je préfère ne pas répondre"
          ]
        },
        "to_17_1": {
          "text": "BLOC 4. SANTÉ PHYSIQUE ET BIEN-ÊTRE PSYCHOSOCIAL : Au cours des quatre dernières semaines, à quelle fréquence avez-vous ressenti ce qui suit ? — Inquiétude pour des proches dans les camps ou ailleurs",
          "options": [
            "Jamais",
            "Parfois",
            "Toujours",
            "Sans réponse"
          ]
        },
        "to_17_2": {
          "text": "BLOC 4. SANTÉ PHYSIQUE ET BIEN-ÊTRE PSYCHOSOCIAL : Au cours des quatre dernières semaines, à quelle fréquence avez-vous ressenti ce qui suit ? — Peur pour votre sécurité ou celle de votre famille",
          "options": [
            "Jamais",
            "Parfois",
            "Toujours",
            "Sans réponse"
          ]
        },
        "to_17_3": {
          "text": "BLOC 4. SANTÉ PHYSIQUE ET BIEN-ÊTRE PSYCHOSOCIAL : Au cours des quatre dernières semaines, à quelle fréquence avez-vous ressenti ce qui suit ? — Peur de représailles pour vous être exprimée",
          "options": [
            "Jamais",
            "Parfois",
            "Toujours",
            "Sans réponse"
          ]
        },
        "to_17_4": {
          "text": "BLOC 4. SANTÉ PHYSIQUE ET BIEN-ÊTRE PSYCHOSOCIAL : Au cours des quatre dernières semaines, à quelle fréquence avez-vous ressenti ce qui suit ? — Difficultés à dormir",
          "options": [
            "Jamais",
            "Parfois",
            "Toujours",
            "Sans réponse"
          ]
        },
        "to_17_5": {
          "text": "BLOC 4. SANTÉ PHYSIQUE ET BIEN-ÊTRE PSYCHOSOCIAL : Au cours des quatre dernières semaines, à quelle fréquence avez-vous ressenti ce qui suit ? — Anxiété ou inquiétude persistante",
          "options": [
            "Jamais",
            "Parfois",
            "Toujours",
            "Sans réponse"
          ]
        },
        "to_17_6": {
          "text": "BLOC 4. SANTÉ PHYSIQUE ET BIEN-ÊTRE PSYCHOSOCIAL : Au cours des quatre dernières semaines, à quelle fréquence avez-vous ressenti ce qui suit ? — Tristesse, impuissance ou désespoir",
          "options": [
            "Jamais",
            "Parfois",
            "Toujours",
            "Sans réponse"
          ]
        },
        "to_17_7": {
          "text": "BLOC 4. SANTÉ PHYSIQUE ET BIEN-ÊTRE PSYCHOSOCIAL : Au cours des quatre dernières semaines, à quelle fréquence avez-vous ressenti ce qui suit ? — Difficultés dans les activités quotidiennes en raison de votre état émotionnel",
          "options": [
            "Jamais",
            "Parfois",
            "Toujours",
            "Sans réponse"
          ]
        },
        "to_18": {
          "text": "BLOC 4. SANTÉ PHYSIQUE ET BIEN-ÊTRE PSYCHOSOCIAL : Avez-vous eu besoin d’un soutien médical ou psychologique en raison de ces expériences ?",
          "options": [
            "Oui, je l’ai reçu",
            "Je l’ai cherché, mais je n’ai pas pu y accéder",
            "J’en ai eu besoin, mais je ne l’ai pas cherché",
            "Je n’en ai pas eu besoin",
            "Je préfère ne pas répondre"
          ]
        },
        "to_19": {
          "text": "BLOC 4. SANTÉ PHYSIQUE ET BIEN-ÊTRE PSYCHOSOCIAL : Avez-vous des personnes de confiance vers qui vous tourner pour obtenir du soutien ?",
          "options": [
            "Oui, plusieurs",
            "Oui, quelques-unes",
            "Non",
            "J’évite de demander du soutien pour des raisons de sécurité",
            "Je préfère ne pas répondre"
          ]
        },
        "to_20": {
          "text": "BLOC 5. JUSTICE, PROTECTION ET PARTICIPATION : Si vous avez subi une violation, l’avez-vous signalée ou dénoncée ?",
          "options": [
            "Oui, auprès d’institutions officielles",
            "Oui, auprès d’organisations de défense des droits humains",
            "Oui, auprès des deux",
            "Non",
            "Je n’ai pas subi de violations",
            "Je préfère ne pas répondre"
          ]
        },
        "to_21": {
          "text": "BLOC 5. JUSTICE, PROTECTION ET PARTICIPATION : Si vous avez porté plainte, quelle réponse avez-vous reçue ? Si vous ne l’avez pas fait, pourquoi ? (Cochez les réponses correspondantes)",
          "options": [
            "Le cas a fait l’objet d’une enquête",
            "J’ai reçu une protection ou une réparation",
            "Je n’ai reçu aucune réponse",
            "La plainte a été rejetée",
            "Procédure en cours",
            "Je n’ai pas porté plainte par peur de représailles",
            "Je n’ai pas porté plainte par manque de confiance",
            "Je n’ai pas porté plainte par manque d’information ou de ressources",
            "Sans objet",
            "Je préfère ne pas répondre"
          ]
        },
        "to_22": {
          "text": "BLOC 5. JUSTICE, PROTECTION ET PARTICIPATION : Au cours des 12 derniers mois, comment votre participation publique a-t-elle été affectée ? (Plusieurs réponses possibles)",
          "options": [
            "J’ai participé à des réunions ou manifestations pacifiques",
            "J’ai participé à des organisations ou à la défense des droits humains",
            "J’ai réduit ma participation par peur",
            "J’ai cessé de participer par peur",
            "J’ai reçu des menaces ou subi des représailles en raison de ma participation",
            "Je ne participais pas à ces activités",
            "Je préfère ne pas répondre"
          ]
        }
      }
    }
  },
  "createdAt": "2026-10-20T14:53:58.000Z",
  "createdBy": "administrador"
};
