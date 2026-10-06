import { Survey } from '../types';

export const MAURITANIA_SURVEY: Survey = {
  id: 'survey_mauritania_perfecta',
  title: 'ENCUESTA MAURITANIA',
  description: 'Esta encuesta es para entender cómo los conflictos, la migración y la situación en Mauritania afectan a la vida de las mujeres. Tus respuestas nos ayudarán a visibilizar situaciones injustas y a pedir cambios a las autoridades y organismos internacionales. No preguntamos tu nombre. Puedes dejar de responder cuando quieras. Todo lo que digas será tratado con respeto y confidencialidad.',
  targetCountry: 'Mauritania',
  targetLanguage: 'haa',
  createdAt: '2026-06-19T10:00:00.000Z',
  createdBy: 'administrador',
  questions: [
    {
      id: 'm1',
      text: '¿Aceptas participar de forma voluntaria en esta encuesta?',
      type: 'single_choice',
      options: [
        'Acepto participar de forma voluntaria y acepto que se utilicen estos datos para realizar informes de DDHH',
        'No acepto participar'
      ],
      required: true
    },
    // BLOQUE 1. PERFIL
    {
      id: 'm2',
      text: 'BLOQUE 1. PERFIL: Edad',
      type: 'single_choice',
      options: ['18-25', '26-35', '36-50', 'Más de 50'],
      required: true
    },
    {
      id: 'm3',
      text: 'BLOQUE 1. PERFIL: País de origen',
      type: 'text',
      required: true
    },
    {
      id: 'm4',
      text: 'BLOQUE 1. PERFIL: Situación administrativa en Mauritania',
      type: 'single_choice',
      options: [
        'Documentación regular',
        'Sin documentación o documentación vencida',
        'En tránsito',
        'No sabe'
      ],
      required: true
    },
    {
      id: 'm5',
      text: 'BLOQUE 1. PERFIL: ¿Sabe leer y escribir?',
      type: 'single_choice',
      options: ['Sí', 'Parcialmente', 'No'],
      required: true
    },
    {
      id: 'm6',
      text: 'BLOQUE 1. PERFIL: Personas a cargo',
      type: 'single_choice',
      options: ['Ninguna', '1-2', '3-5', 'Más de 5'],
      required: true
    },
    {
      id: 'm7',
      text: 'BLOQUE 1. PERFIL: Situación laboral actual',
      type: 'single_choice',
      options: [
        'Trabajo estable',
        'Trabajo ocasional o informal',
        'No tengo trabajo'
      ],
      required: true
    },
    // BLOQUE 2. SALIDA DEL PAÍS DE ORIGEN
    {
      id: 'm8',
      text: 'BLOQUE 2. SALIDA: ¿Cuáles fueron las principales razones para salir de su país? (máximo 3)',
      type: 'multiple_choice',
      options: [
        'Conflicto armado o inseguridad',
        'Violencia de género',
        'Persecución o amenazas',
        'Falta de acceso o ingresos',
        'Falta de acceso a alimentación',
        'Problemas familiares',
        'Otra'
      ],
      required: true
    },
    {
      id: 'm9',
      text: 'BLOQUE 2. SALIDA: Antes de salir de su país, ¿sufrió alguna de las siguientes situaciones?',
      type: 'multiple_choice',
      options: [
        'Violencia armada',
        'Violencia física',
        'Violencia sexual',
        'Amenazas o persecución',
        'Detención arbitraria',
        'Ninguna'
      ],
      required: true
    },
    // BLOQUE 3. TRÁNSITO MIGRATORIO
    {
      id: 'm10',
      text: 'BLOQUE 3. TRÁNSITO: ¿Pasó por otros países antes de llegar a Mauritania?',
      type: 'single_choice',
      options: ['Sí', 'No'],
      required: true
    },
    {
      id: 'm11',
      text: 'BLOQUE 3. TRÁNSITO: Durante el trayecto migratorio, ¿sufrió alguna de las siguientes situaciones?',
      type: 'multiple_choice',
      options: [
        'Robo o extorsión',
        'Violencia física',
        'Violencia sexual',
        'Detención',
        'Separación familiar',
        'Trabajo forzado o explotación',
        'Hambre o falta de agua',
        'Ninguna'
      ],
      required: true
    },
    {
      id: 'm12',
      text: 'BLOQUE 3. TRÁNSITO: ¿Pagó a intermediarios o redes para realizar el viaje?',
      type: 'single_choice',
      options: ['Sí', 'No'],
      required: true
    },
    {
      id: 'm13',
      text: 'BLOQUE 3. TRÁNSITO: ¿Hubo engaño o información falsa sobre el viaje o destino?',
      type: 'single_choice',
      options: ['Sí', 'No'],
      required: true
    },
    {
      id: 'm14',
      text: 'BLOQUE 3. TRÁNSITO: ¿Recibió asistencia humanitaria durante el trayecto?',
      type: 'single_choice',
      options: ['Sí', 'No'],
      required: true
    },
    // BLOQUE 4. SITUACIÓN ACTUAL EN MAURITANIA
    {
      id: 'm15',
      text: 'BLOQUE 4. SITUACIÓN ACTUAL: ¿Trabaja actualmente?',
      type: 'single_choice',
      options: ['Sí', 'No'],
      required: true
    },
    {
      id: 'm16',
      text: 'BLOQUE 4. SITUACIÓN ACTUAL: Si trabaja, ¿considera que sus condiciones laborales son adecuadas?',
      type: 'single_choice',
      options: ['Sí', 'No'],
      required: false
    },
    {
      id: 'm17',
      text: 'BLOQUE 4. SITUACIÓN ACTUAL: Desde su llegada a Mauritania, ¿ha sufrido alguna de estas situaciones? (puede marcar más de una)',
      type: 'multiple_choice',
      options: [
        'Discriminación por origen o nacionalidad',
        'Violencia física',
        'Violencia sexual',
        'Violencia por parte de autoridades públicas',
        'Amenaza de expulsión',
        'Explotación laboral',
        'Ninguna'
      ],
      required: true
    },
    {
      id: 'm18',
      text: 'BLOQUE 4. SITUACIÓN ACTUAL: Si respondió sí a alguna, ¿pidió ayuda o lo contó a alguien?',
      type: 'single_choice',
      options: [
        'Sí, denuncié frente a autoridad',
        'Sí, a ONG / institución',
        'Sí, a persona cercana',
        'No'
      ],
      required: false
    },
    {
      id: 'm19',
      text: 'BLOQUE 4. SITUACIÓN ACTUAL: ¿Qué pasó con el pedido de ayuda o denuncia?',
      type: 'single_choice',
      options: [
        'Nada, no obtuve ninguna reparación',
        'Caso sigue abierto / sin resolución',
        'Se finalizó el caso y obtuve justicia'
      ],
      required: false
    },
    {
      id: 'm20',
      text: 'BLOQUE 4. SITUACIÓN ACTUAL: ¿Ha tenido conflictos con población local debido a su origen?',
      type: 'single_choice',
      options: ['Frecuentemente', 'Algunas veces', 'Nunca'],
      required: true
    },
    // BLOQUE 5. ACCESO A DERECHOS
    {
      id: 'm21',
      text: 'BLOQUE 5. ACCESO A DERECHOS: Salud - Durante el último año, ¿ha necesitado atención sanitaria y no ha podido recibirla?',
      type: 'single_choice',
      options: ['Sí', 'No'],
      required: true
    },
    {
      id: 'm22',
      text: 'BLOQUE 5. ACCESO A DERECHOS: Salud - Si respondió sí, ¿cuál fue la principal razón?',
      type: 'single_choice',
      options: [
        'Falta de dinero',
        'Falta de documentación',
        'Distancia',
        'Miedo',
        'Otra'
      ],
      required: false
    },
    {
      id: 'm23',
      text: 'BLOQUE 5. ACCESO A DERECHOS: Educación - Si tiene hijos/as, ¿han podido acceder a la escuela?',
      type: 'single_choice',
      options: ['Sí', 'No'],
      required: false
    },
    {
      id: 'm24',
      text: 'BLOQUE 5. ACCESO A DERECHOS: Educación - Si no, ¿por qué?',
      type: 'single_choice',
      options: ['Falta de recursos', 'Falta de documentación', 'Discriminación', 'Otro'],
      required: false
    },
    {
      id: 'm25',
      text: 'BLOQUE 5. ACCESO A DERECHOS: Vivienda - ¿Cómo describiría su vivienda actual?',
      type: 'single_choice',
      options: ['Adecuada', 'Precaria', 'Hacinada', 'Temporal', 'Sin vivienda'],
      required: true
    },
    // BLOQUE 6. DISCRIMINACIÓN Y PARTICIPACIÓN
    {
      id: 'm26',
      text: 'BLOQUE 6. DISCRIMINACIÓN Y PARTICIPACIÓN: ¿Ha sufrido discriminación por alguno de estos motivos?',
      type: 'multiple_choice',
      options: [
        'Nacionalidad',
        'Grupo étnico',
        'Color de piel',
        'Idioma o acento',
        'Situación migratoria',
        'No'
      ],
      required: true
    },
    {
      id: 'm27',
      text: 'BLOQUE 6. DISCRIMINACIÓN Y PARTICIPACIÓN: ¿Esta discriminación afectó su acceso a servicios o trabajo?',
      type: 'single_choice',
      options: ['Sí', 'No'],
      required: true
    },
    {
      id: 'm28',
      text: 'BLOQUE 6. DISCRIMINACIÓN Y PARTICIPACIÓN: ¿Participa en alguna organización comunitaria o grupo de apoyo?',
      type: 'single_choice',
      options: ['Sí', 'No'],
      required: true
    },
    {
      id: 'm29',
      text: 'BLOQUE 6. DISCRIMINACIÓN Y PARTICIPACIÓN: Si participa, ¿considera que puede influir en las decisiones?',
      type: 'single_choice',
      options: [
        'Sí',
        'Lo intento, pero no se me escucha',
        'No lo intento por vergüenza',
        'No lo intento porque no se me escucha'
      ],
      required: false
    },
    // BLOQUE 7. BIENESTAR PSICOSOCIAL
    {
      id: 'm30',
      text: 'BLOQUE 7. BIENESTAR PSICOSOCIAL: ¿Con qué frecuencia ha sentido: Preocupación por familiares en su país?',
      type: 'single_choice',
      options: ['Nunca', 'A veces', 'Siempre'],
      required: true
    },
    {
      id: 'm31',
      text: 'BLOQUE 7. BIENESTAR PSICOSOCIAL: ¿Con qué frecuencia ha sentido: Miedo a ser expulsada?',
      type: 'single_choice',
      options: ['Nunca', 'A veces', 'Siempre'],
      required: true
    },
    {
      id: 'm32',
      text: 'BLOQUE 7. BIENESTAR PSICOSOCIAL: ¿Con qué frecuencia ha sentido: Tristeza por estar lejos de su país?',
      type: 'single_choice',
      options: ['Nunca', 'A veces', 'Siempre'],
      required: true
    },
    {
      id: 'm33',
      text: 'BLOQUE 7. BIENESTAR PSICOSOCIAL: ¿Con qué frecuencia ha sentido: Sensación de soledad?',
      type: 'single_choice',
      options: ['Nunca', 'A veces', 'Siempre'],
      required: true
    },
    {
      id: 'm34',
      text: 'BLOQUE 7. BIENESTAR PSICOSOCIAL: ¿Tiene personas de confianza en Nuadibú?',
      type: 'single_choice',
      options: ['Sí, varias', 'Sí, algunas', 'No'],
      required: true
    },
    {
      id: 'm35',
      text: 'BLOQUE 7. BIENESTAR PSICOSOCIAL: ¿Ha recibido apoyo psicológico o comunitario?',
      type: 'single_choice',
      options: ['Sí', 'No'],
      required: true
    },
    // BLOQUE 8. VIOLENCIA DE GÉNERO
    {
      id: 'm36',
      text: 'BLOQUE 8. VIOLENCIA DE GÉNERO: ¿Ha sufrido violencia por parte de una pareja o familiar desde que llegó a Mauritania?',
      type: 'single_choice',
      options: ['Sí', 'No', 'Prefiero no responder'],
      required: true
    },
    {
      id: 'm37',
      text: 'BLOQUE 8. VIOLENCIA DE GÉNERO: ¿Conoce casos de trata o explotación sexual de mujeres?',
      type: 'single_choice',
      options: ['Sí', 'No', 'Prefiero no responder'],
      required: true
    },
    {
      id: 'm38',
      text: 'BLOQUE 8. VIOLENCIA DE GÉNERO: ¿Ha sufrido alguno de los siguientes tipos de violencia? (puede marcar más de una)',
      type: 'multiple_choice',
      options: [
        'Violencia física',
        'Violencia sexual',
        'Coerción económica',
        'Control de movilidad',
        'Matrimonio forzado',
        'Explotación laboral',
        'Ninguna',
        'No recuerda / no sabe'
      ],
      required: true
    },
    {
      id: 'm39',
      text: 'BLOQUE 8. VIOLENCIA DE GÉNERO: ¿Dónde ocurrió principalmente la violencia?',
      type: 'single_choice',
      options: ['País de origen', 'En el trayecto', 'En Mauritania', 'No recuerda / no sabe'],
      required: true
    },
    {
      id: 'm40',
      text: 'BLOQUE 8. VIOLENCIA DE GÉNERO: ¿Denunció o pidió ayuda?',
      type: 'single_choice',
      options: ['Sí', 'No', 'No pudo', 'No sabía cómo'],
      required: true
    },
    {
      id: 'm41',
      text: 'BLOQUE 8. VIOLENCIA DE GÉNERO: Si respondió sí, ¿a quién denunció o informó?',
      type: 'multiple_choice',
      options: [
        'Policía',
        'Gendarmería',
        'Servicios sociales',
        'ONG / organización humanitaria',
        'Autoridad local',
        'Otro'
      ],
      required: false
    },
    {
      id: 'm42',
      text: 'BLOQUE 8. VIOLENCIA DE GÉNERO: ¿Cuál fue el resultado de la denuncia?',
      type: 'multiple_choice',
      options: [
        'No recibió respuesta',
        'No fue tomada en cuenta',
        'Se rechazó la denuncia',
        'Recibí protección o ayuda',
        'El agresor no fue sancionado',
        'Otro',
        'No recuerda / no sabe'
      ],
      required: false
    }
  ],
  translations: {
    haa: {
      title: 'استطلاع الرأي لموريتانيا',
      description: 'يهدف هذا الاستطلاع إلى فهم كيفية تأثير النزاعات والMigration والوضع العام في موريتانيا على حياة النساء. ستساعدنا إجاباتك على تسليط الضوء على الأوضاع غير العادلة والمطالبة بإصلاحات لدى السلطات والمنظمات الدولية. لن نطلب اسمك. يمكنك التوقف عن الإجابة في أي وقت. كل ما تقولينه سيعامل باحترام وسرية تامة.',
      questions: {
        m1: {
          text: 'هل توافقين على المشاركة طواعية في هذا الاستطلاع؟',
          options: [
            'أوافق على المشاركة طواعية وأقبل استخدام هذه البيانات لإعداد تقارير حقوق الإنسان',
            'لا أوافق على المشاركة'
          ]
        },
        m2: {
          text: 'القسم 1. الملف الشخصي: العمر',
          options: ['18-25', '26-35', '36-50', 'أكثر من 50']
        },
        m3: { text: 'القسم 1. الملف الشخصي: بلد المنشأ' },
        m4: {
          text: 'القسم 1. الملف الشخصي: الوضع الإداري في موريتانيا',
          options: ['أوراق قانونية سليمة', 'بدون أوراق أو منتهية الصلاحية', 'في حالة عبور', 'لا أعرف']
        },
        m5: {
          text: 'القسم 1. الملف الشخصي: هل تعرفين القراءة والكتابة؟',
          options: ['نعم', 'جزئياً', 'لا']
        },
        m6: {
          text: 'القسم 1. الملف الشخصي: عدد الأشخاص الذين تعولينهم في المنزل',
          options: ['لا أحد', '1-2', '3-5', 'أكثر من 5']
        },
        m7: {
          text: 'القسم 1. الملف الشخصي: الوضع المهني الحالي',
          options: ['وظيفة مستقرة وثابتة', 'عمل مؤقت أو غير رسمي', 'لا أعمل حالياً']
        }
      }
    },
    fr: {
      title: 'ENQUÊTE POUR LA MAURITANIE',
      description: "Cette enquête vise à comprendre comment les conflits, la migration et la situation en Mauritanie affectent la vie des femmes. Vos réponses nous aideront à rendre visibles les injustices et à demander des changements aux autorités et aux organisations internationales. Nous ne vous demandons pas votre nom. Vous pouvez arrêter de répondre quand vous le souhaitez. Tout ce que vous direz sera traité avec respect et confidentialité.",
      questions: {
        m1: {
          text: "Acceptez-vous de participer volontairement à cette enquête ?",
          options: [
            "J'accepte de participer volontairement et j'accepte que ces données soient utilisées pour réaliser des rapports de droits de l'homme",
            "Je n'accepte pas de participer"
          ]
        },
        m2: {
          text: "BLOC 1. PROFIL : Âge",
          options: ["18-25", "26-35", "36-50", "Plus de 50"]
        },
        m3: { text: "BLOC 1. PROFIL : Pays d'origine" },
        m4: {
          text: "BLOC 1. PROFIL : Situation administrative en Mauritanie",
          options: [
            "Documentation régulière",
            "Sans document ou document expiré",
            "En transit",
            "Ne sait pas"
          ]
        },
        m5: {
          text: "BLOC 1. PROFIL : Sait lire et écrire ?",
          options: ["Oui", "Partiellement", "Non"]
        },
        m6: {
          text: "BLOC 1. PROFIL : Personnes à charge",
          options: ["Aucune", "1-2", "3-5", "Plus de 5"]
        },
        m7: {
          text: "BLOC 1. PROFIL : Situation professionnelle actuelle",
          options: [
            "Travail stable",
            "Travail occasionnel ou informel",
            "Pas de travail"
          ]
        }
      }
    }
  }
};

export const MAURITANIA_SURVEY_II: Survey = {
  ...MAURITANIA_SURVEY,
  id: 'survey_mauritania_dos',
  title: 'ENCUESTA MAURITANIA',
  description: 'No preguntamos tu nombre. Puedes dejar de responder cuando quieras. Todo lo que digas será tratado con respeto y confidencialidad.',
  translations: {
    ...MAURITANIA_SURVEY.translations,
    haa: {
      ...MAURITANIA_SURVEY.translations?.haa,
      title: 'استطلاع موريتانيا',
      description: 'لن نطلب اسمك. يمكنك التوقف عن الإجابة في أي وقت. كل ما تقولينه سيعامل باحترام وسرية تامة.',
      questions: MAURITANIA_SURVEY.translations?.haa?.questions || {}
    },
    fr: {
      ...MAURITANIA_SURVEY.translations?.fr,
      title: 'ENQUÊTE MAURITANIE',
      description: 'Nous ne vous demandons pas votre nom. Vous pouvez arrêter de répondre quand vous le souhaitez. Tout ce que vous direz sera traité avec respect et confidentialité.',
      questions: MAURITANIA_SURVEY.translations?.fr?.questions || {}
    }
  }
};
