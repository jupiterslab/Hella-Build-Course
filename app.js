// ═══════════════════════════════════════════
// HELLA BUILD — SUPABASE CONFIG + AUTH
// Replace SUPABASE_URL and SUPABASE_KEY with
// your real Hella Build project credentials
// ═══════════════════════════════════════════

const SUPABASE_URL = 'https://hiixqrgrkdxnfzltfxbi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaXhxcmdya2R4bmZ6bHRmeGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjQ4ODgsImV4cCI6MjA5NDM0MDg4OH0.we8PyEFwlIuxrvBItRD2BwWOWF6eCO2IeteabSy5QaI';

// Initialize Supabase client
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── AUTH UTILITIES ──────────────────────────

// Get current session
async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

// Get current user
async function getUser() {
  const { data } = await sb.auth.getUser();
  return data.user;
}

// Redirect to login if not authenticated
// Call this at the top of any protected page
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

// Redirect to dashboard if already logged in
// Call this on login/signup pages
async function redirectIfLoggedIn(destination = 'orientation.html') {
  const session = await getSession();
  if (session) {
    window.location.href = destination;
  }
}

// Sign out
async function signOut() {
  await sb.auth.signOut();
  window.location.href = 'login.html';
}

// ── PROGRESS UTILITIES ──────────────────────

// Mark a module as complete
async function markModuleComplete(moduleId) {
  const user = await getUser();
  if (!user) return;
  await sb.from('progress').upsert({
    user_id: user.id,
    module_id: moduleId,
    completed: true,
    completed_at: new Date().toISOString()
  }, { onConflict: 'user_id,module_id' });
}

// Get all completed modules for current user
async function getProgress() {
  const user = await getUser();
  if (!user) return [];
  const { data } = await sb
    .from('progress')
    .select('module_id, completed')
    .eq('user_id', user.id)
    .eq('completed', true);
  return data ? data.map(d => d.module_id) : [];
}

// ── WORKSHEET UTILITIES ─────────────────────

// Save worksheet data (any module)
async function saveWorksheet(worksheetName, data) {
  const user = await getUser();
  if (!user) return { error: 'Not logged in' };
  const { error } = await sb.from('worksheets').upsert({
    user_id: user.id,
    worksheet_name: worksheetName,
    data: data,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,worksheet_name' });
  return { error };
}

// Load worksheet data
async function loadWorksheet(worksheetName) {
  const user = await getUser();
  if (!user) return null;
  const { data } = await sb
    .from('worksheets')
    .select('data')
    .eq('user_id', user.id)
    .eq('worksheet_name', worksheetName)
    .single();
  return data ? data.data : null;
}

// ── UI UTILITIES ────────────────────────────

// Show alert message
function showAlert(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `alert alert-${type} show`;
  setTimeout(() => el.classList.remove('show'), 5000);
}

// Set loading state on button
function setLoading(btn, loading) {
  if (loading) {
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Processing...';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.original || btn.innerHTML;
    btn.disabled = false;
  }
}

// Format user display name from email
function displayName(email) {
  if (!email) return 'Builder';
  return email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
