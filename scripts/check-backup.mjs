import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export function inspectBackup(snapshot) {
  if (!snapshot || snapshot.format !== 'survey-backup' || snapshot.version !== 1 ||
      !Array.isArray(snapshot.surveys) || !Array.isArray(snapshot.responses)) {
    throw new Error('Se requiere un respaldo integral survey-backup versión 1 con encuestas y respuestas.');
  }
  const collections = {};
  for (const name of ['surveys', 'responses']) {
    if (snapshot.counts?.[name] !== snapshot[name].length) throw new Error('Los conteos declarados no coinciden con el contenido.');
    const records = new Map();
    for (const record of snapshot[name]) {
      if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id || records.has(record.id)) {
        throw new Error('Hay registros sin ID o IDs repetidos dentro de una colección.');
      }
      if (name === 'responses' && (typeof record.surveyId !== 'string' || !record.surveyId ||
          !record.answers || typeof record.answers !== 'object' || Array.isArray(record.answers))) {
        throw new Error('El respaldo contiene respuestas sin asociación o contenido estructurado.');
      }
      records.set(record.id, digest(record));
    }
    collections[name] = records;
  }
  const fingerprint = digest(Object.fromEntries(Object.entries(collections).map(([name, records]) =>
    [name, [...records].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)])));
  return { collections, summary: { surveys: snapshot.surveys.length, responses: snapshot.responses.length, fingerprint } };
}

export function compareBackups(before, after) {
  const original = inspectBackup(before);
  const current = inspectBackup(after);
  const result = {};
  for (const name of ['surveys', 'responses']) {
    let missing = 0, changed = 0;
    for (const [id, hash] of original.collections[name]) {
      if (!current.collections[name].has(id)) missing++;
      else if (current.collections[name].get(id) !== hash) changed++;
    }
    const added = [...current.collections[name].keys()].filter(id => !original.collections[name].has(id)).length;
    result[name] = { missing, changed, added };
  }
  return { preserved: Object.values(result).every(collection => collection.missing === 0 && collection.changed === 0), collections: result };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [beforePath, afterPath, ...extra] = process.argv.slice(2);
    if (!beforePath || extra.length) throw new Error('Uso: npm run check:backup -- respaldo.json [respaldo_posterior.json]');
    const before = JSON.parse(readFileSync(beforePath, 'utf8'));
    console.log(JSON.stringify(inspectBackup(before).summary));
    if (afterPath) {
      const result = compareBackups(before, JSON.parse(readFileSync(afterPath, 'utf8')));
      console.log(JSON.stringify(result));
      if (!result.preserved) process.exitCode = 1;
    }
  } catch {
    console.error('No se pudo validar el respaldo: revisa formato, conteos, IDs y estructura. No se modificaron archivos ni datos.');
    process.exitCode = 1;
  }
}
