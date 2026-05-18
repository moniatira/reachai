/**
 * Load Athena integration settings from process.env.
 * Never commit real secrets; use .env locally or your host’s secret store.
 */
/**
 * @param {{ requirePractice?: boolean }} options Pass `{ requirePractice: false }` for OAuth-only (token); appointment APIs need practice id.
 */
export function loadConfig(options = {}) {
  const requirePractice = options.requirePractice !== false;

  const tokenUrl = process.env.ATHENA_TOKEN_URL || '';
  const apiBase = (process.env.ATHENA_API_BASE || '').replace(/\/+$/, '');
  const clientId = process.env.ATHENA_CLIENT_ID || '';
  const clientSecret = process.env.ATHENA_CLIENT_SECRET || '';
  const scope = process.env.ATHENA_SCOPE || '';
  const practiceId = process.env.ATHENA_PRACTICE_ID || '';
  const departmentId = process.env.ATHENA_DEPARTMENT_ID || '';
  const patientId = process.env.ATHENA_PATIENT_ID || '';

  const missing = [];
  if (!tokenUrl) missing.push('ATHENA_TOKEN_URL');
  if (!apiBase) missing.push('ATHENA_API_BASE');
  if (!clientId) missing.push('ATHENA_CLIENT_ID');
  if (!clientSecret) missing.push('ATHENA_CLIENT_SECRET');
  if (requirePractice && !practiceId) missing.push('ATHENA_PRACTICE_ID');

  return {
    tokenUrl,
    apiBase,
    clientId,
    clientSecret,
    scope,
    practiceId,
    departmentId,
    patientId,
    missing,
  };
}
