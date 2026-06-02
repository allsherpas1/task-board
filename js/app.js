// ─── Supabase init ───────────────────────────────────────────────────────────

const { createClient } = supabase;
const db = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// ─── State ────────────────────────────────────────────────────────────────────

let tasks = [];
let dragId = null;
let editingId = null;

const COLS = ['todo', 'inprogress', 'done'];
const COL_LABELS = { todo: 'To do', inprogress: 'In progress', done: 'Done' };

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function loadTasks() {
  setStatus('Loading...');
  const { data, error } = await db
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) { setStatus('Error loading tasks: ' + error.message); return; }
  tasks = data;
  render();
  setStatus('');
}

async function insertTask(task) {
  const { data, error } = await db
    .from('tasks')
    .insert([task])
    .select()
    .single();

  if (error) { setStatus('Save error: ' + error.message); return null; }
  return data;
}

async function updateTask(id, fields) {
  const { error } = await db.from('tasks').update(fields).eq('id', id);
  if (error) setStatus('Update error: ' + error.message);
}

async function deleteTaskDb(id) {
  const { error } = await db.from('tasks').delete().eq('id', id);
  if (error) setStatus('Delete error: ' + error.message);
}

// ─── Add form ─────────────────────────────────────────────────────────────────

function toggleForm() {
  const panel = document.getElementById('add-panel');
  const btn = document.getElementById('add-btn');
  const open = panel.classList.toggle('open');
  btn.textContent = open ? '✕ Cancel' : '+ Add task';
  btn.classList.toggle('open', open);
  if (open) setTimeout(() => document.getElementById('input-action').focus(), 50);
  else clearForm();
}

function clearForm() {
  document.getElementById('input-action').value = '';
  document.getElementById('input-client').value = '';
  document.getElementById('input-deadline').value = '';
  document.getElementById('input-notes').value = '';
}

document.addEventListener('keydown', function (e) {
  const panel = document.getElementById('add-panel');
  if (e.key === 'Escape' && panel.classList.contains('open')) toggleForm();
  if (panel.classList.contains('open') && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    saveNewTask();
  }
});

async function saveNewTask() {
  const action = document.getElementById('input-action').value.trim();
  if (!action) {
    document.getElementById('input-action').focus();
    setStatus('Action is required.');
    setTimeout(() => setStatus(''), 2000);
    return;
  }

  const btn = document.getElementById('save-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const newTask = {
    col: 'todo',
    action,
    client: document.getElementById('input-client').value.trim(),
    deadline: document.getElementById('input-deadline').value.trim(),
    snippet: document.getElementById('input-notes').value.trim(),
  };

  const saved = await insertTask(newTask);
  if (saved) {
    tasks.push(saved);
    render();
    toggleForm();
    setStatus('Task added.');
    setTimeout(() => setStatus(''), 2000);
  }

  btn.textContent = 'Add task';
  btn.disabled = false;
}

// ─── Card actions ─────────────────────────────────────────────────────────────

async function moveTask(id, dir) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const ni = COLS.indexOf(t.col) + dir;
  if (ni < 0 || ni >= COLS.length) return;
  t.col = COLS[ni];
  render();
  await updateTask(id, { col: t.col });
}

function startEdit(id) {
  editingId = id;
  render();
  setTimeout(() => {
    const el = document.getElementById('edit-action-' + id);
    if (el) { el.focus(); el.select(); }
  }, 30);
}

async function saveEdit(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.action = document.getElementById('edit-action-' + id)?.value.trim() || t.action;
  t.client = document.getElementById('edit-client-' + id)?.value.trim() || '';
  t.deadline = document.getElementById('edit-deadline-' + id)?.value.trim() || '';
  t.snippet = document.getElementById('edit-notes-' + id)?.value.trim() || '';
  editingId = null;
  render();
  await updateTask(id, { action: t.action, client: t.client, deadline: t.deadline, snippet: t.snippet });
}

function cancelEdit() { editingId = null; render(); }

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  tasks = tasks.filter(x => x.id !== id);
  render();
  await deleteTaskDb(id);
}

// ─── Drag and drop ────────────────────────────────────────────────────────────

function onDragStart(e, id) {
  dragId = id;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => document.querySelector('[data-id="' + id + '"]')?.classList.add('dragging'), 0);
}

function onDragEnd() {
  document.querySelectorAll('.card').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.col').forEach(el => el.classList.remove('drag-over'));
  dragId = null;
}

function onDragOver(e) {
  e.preventDefault();
  document.querySelectorAll('.col').forEach(el => el.classList.remove('drag-over'));
  e.currentTarget.classList.add('drag-over');
}

async function onDrop(e, col) {
  e.preventDefault();
  document.querySelectorAll('.col').forEach(el => el.classList.remove('drag-over'));
  if (!dragId) return;
  const t = tasks.find(x => x.id === dragId);
  if (t && t.col !== col) { t.col = col; render(); await updateTask(dragId, { col }); }
  dragId = null;
}

// ─── Client filter ────────────────────────────────────────────────────────────

function updateClientFilter() {
  const sel = document.getElementById('client-filter');
  const cur = sel.value;
  sel.innerHTML = '<option value="">All clients</option>';
  [...new Set(tasks.map(t => t.client).filter(Boolean))].sort().forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    if (c === cur) o.selected = true;
    sel.appendChild(o);
  });
}

document.getElementById('client-filter').addEventListener('change', render);

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  updateClientFilter();
  const filter = document.getElementById('client-filter').value;

  COLS.forEach(col => {
    const all = tasks.filter(t => t.col === col);
    const filtered = filter ? all.filter(t => t.client === filter) : all;
    document.getElementById('ct-' + col).textContent = filter ? filtered.length + '/' + all.length : all.length;
    document.getElementById('emp-' + col).classList.toggle('visible', filtered.length === 0);
    document.getElementById('tasks-' + col).innerHTML = filtered.map(t => renderCard(t, col)).join('');
  });
}

function renderCard(t, col) {
  const prev = COLS[COLS.indexOf(col) - 1];
  const next = COLS[COLS.indexOf(col) + 1];
  const a = escHtml(t.action), c = escHtml(t.client), d = escHtml(t.deadline), n = escHtml(t.snippet);

  if (editingId === t.id) {
    return `
      <div class="card" data-id="${t.id}">
        <div class="edit-form">
          <input id="edit-action-${t.id}" value="${a}" placeholder="Action (required)">
          <div class="edit-row">
            <input id="edit-client-${t.id}" value="${c}" placeholder="Client">
            <input id="edit-deadline-${t.id}" value="${d}" placeholder="Deadline">
          </div>
          <textarea id="edit-notes-${t.id}" placeholder="Notes">${n}</textarea>
          <div class="edit-actions">
            <button class="btn-primary" onclick="saveEdit('${t.id}')">Save</button>
            <button class="btn-secondary" onclick="cancelEdit()">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="card" data-id="${t.id}" draggable="true"
      ondragstart="onDragStart(event,'${t.id}')" ondragend="onDragEnd()">
      <div class="card-action">${a}</div>
      ${n ? `<div class="card-snippet">${n}</div>` : ''}
      <div class="card-meta">
        ${c ? `<span class="tag-client">${c}</span>` : ''}
        ${d ? `<span class="tag-deadline">⏱ ${d}</span>` : ''}
      </div>
      <div class="card-foot">
        ${prev ? `<button class="mv-btn" onclick="moveTask('${t.id}',-1)">← ${COL_LABELS[prev]}</button>` : ''}
        ${next ? `<button class="mv-btn" onclick="moveTask('${t.id}',1)">${COL_LABELS[next]} →</button>` : ''}
        <button class="icon-btn" onclick="startEdit('${t.id}')" title="Edit">✎</button>
        <button class="icon-btn del" onclick="deleteTask('${t.id}')" title="Delete">✕</button>
      </div>
    </div>`;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setStatus(msg) {
  document.getElementById('status-bar').textContent = msg;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

loadTasks();
