export const LEGACY_PROJECT = 'chromatic-pride-0ttsj';
export const LEGACY_DATABASE = 'ai-studio-f947253c-4469-4545-9268-02ec4d0ccde0';
export type CollectionName = 'surveys' | 'responses';
export type Origin = 'histórica' | 'nueva' | 'ambas';
export interface StoredRecord { id: string; [key: string]: unknown }
export interface ReadStore { list(name: CollectionName): Promise<StoredRecord[]> }
export interface WriteStore extends ReadStore {
  create(name: CollectionName, records: StoredRecord[], allowIdentical?: boolean): Promise<number>;
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k])).join(',') + '}';
  return JSON.stringify(value);
}
export function newDatabaseConfig(env: Record<string, string | undefined>) {
  const fields = ['PROJECT_ID', 'API_KEY', 'APP_ID', 'AUTH_DOMAIN', 'DATABASE_ID'];
  const values = fields.map(k => env['VITE_NEW_FIREBASE_' + k]?.trim());
  if (values.every(v => !v)) return null;
  if (values.some(v => !v)) throw new Error('Falta completar la conexión de la base nueva.');
  if (values[0] === LEGACY_PROJECT) throw new Error('La base nueva debe pertenecer a otro proyecto bajo tu control.');
  return { projectId: values[0]!, apiKey: values[1]!, appId: values[2]!, authDomain: values[3]!, databaseId: values[4]! };
}
export class DualRepository {
  warnings = new Map<CollectionName, string>();
  origins = { surveys: new Map<string, Origin>(), responses: new Map<string, Origin>() };
  constructor(private historical: ReadStore, private current: WriteStore | null) {}
  writable() {
    if (!this.current) throw new Error('La base nueva aún no está configurada. No se guardó nada.');
    return this.current;
  }
  async list(name: CollectionName): Promise<StoredRecord[]> {
    // A failed new store is fatal; a failed historical read is explicit and never represented as zero.
    const fresh = this.current ? await this.current.list(name) : [];
    let old: StoredRecord[] = [];
    try { old = await this.historical.list(name); this.warnings.delete(name); }
    catch { this.warnings.set(name, 'No se pudo consultar el historial de ' + name + '. La vista y el respaldo están incompletos.'); }
    const merged = new Map<string, StoredRecord>();
    const origins = new Map<string, Origin>();
    for (const row of old) { merged.set(row.id, row); origins.set(row.id, 'histórica'); }
    for (const row of fresh) {
      const existing = merged.get(row.id);
      if (existing && canonical(existing) !== canonical(row)) throw new Error('Hay un ID compartido con contenido diferente entre las bases. Se requiere revisión; no se combinó el historial.');
      merged.set(row.id, row); origins.set(row.id, existing ? 'ambas' : 'nueva');
    }
    this.origins[name] = origins;
    return [...merged.values()];
  }
  async create(name: CollectionName, records: StoredRecord[]) {
    const target = this.writable();
    // Fail closed on old-store errors: an unavailable history cannot authorize a duplicate ID.
    const old = await this.historical.list(name);
    const ids = new Set(old.map(r => r.id));
    if (records.some(r => ids.has(r.id))) throw new Error('Ese ID ya existe en el historial. No se reemplazó ni importó ningún registro.');
    return target.create(name, records);
  }
  async prepareHistoricalSurveys() {
    const target = this.writable();
    const old = await this.historical.list('surveys');
    if (!old.length || old.length > 250) throw new Error('La preparación requiere entre 1 y 250 encuestas históricas.');
    return target.create('surveys', old, true);
  }
  async prepareHistoricalSurvey(id: string) {
    const target = this.writable();
    const old = await this.historical.list('surveys');
    const survey = old.find(row => row.id === id);
    if (!survey) throw new Error('No se encontró la definición histórica de la encuesta. No se modificó ningún registro.');
    return target.create('surveys', [survey], true);
  }
  assertComplete() {
    if (this.warnings.size) throw new Error('No se puede exportar un respaldo integral: falta consultar una base. Reintenta la sincronización.');
  }
}
