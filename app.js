const state = {
  items: [],
  categories: [],
  q: '',
  type: 'all',
  category: 'all',
  sort: 'newest',
  mode: 'file', // 'file' | 'note'
  selectedFile: null,
  currentItem: null,
  adminPin: sessionStorage.getItem('spa_admin_pin') || ''
};

function authHeaders(extra = {}) {
  return state.adminPin ? { ...extra, 'x-admin-pin': state.adminPin } : extra;
}

// Elements
const searchInput = document.getElementById('searchInput');
const typeFilters = document.getElementById('typeFilters');
const categoryFilter = document.getElementById('categoryFilter');
const sortSelect = document.getElementById('sortSelect');
const resultCount = document.getElementById('resultCount');
const archiveList = document.getElementById('archiveList');
const emptyState = document.getElementById('emptyState');

// Form Modal Elements
const formModal = document.getElementById('formModal');
const formModalTitle = document.getElementById('formModalTitle');
const archiveForm = document.getElementById('archiveForm');
const editIdInput = document.getElementById('editId');
const modeTabs = document.getElementById('modeTabs');
const fileUploadSection = document.getElementById('fileUploadSection');
const textNoteSection = document.getElementById('textNoteSection');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const dropZoneText = document.getElementById('dropZoneText');
const selectedFileInfo = document.getElementById('selectedFileInfo');
const titleInput = document.getElementById('titleInput');
const categoryInput = document.getElementById('categoryInput');
const tagsInput = document.getElementById('tagsInput');
const notesInput = document.getElementById('notesInput');
const textContentInput = document.getElementById('textContentInput');
const formError = document.getElementById('formError');

// Viewer Modal Elements
const viewerModal = document.getElementById('viewerModal');
const viewerTitle = document.getElementById('viewerTitle');
const viewerBadges = document.getElementById('viewerBadges');
const viewerMeta = document.getElementById('viewerMeta');
const viewerContent = document.getElementById('viewerContent');
const btnDownload = document.getElementById('btnDownload');
const btnCopyLink = document.getElementById('btnCopyLink');
const btnCopyText = document.getElementById('btnCopyText');
const btnShareWa = document.getElementById('btnShareWa');
const btnEditArchive = document.getElementById('btnEditArchive');
const btnDeleteArchive = document.getElementById('btnDeleteArchive');

const toastEl = document.getElementById('toast');
let toastTimer = null;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2600);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

function typeLabel(fileType) {
  if (fileType === 'pdf') return 'PDF';
  if (fileType === 'ppt') return 'PPT';
  if (fileType === 'apk') return 'APK';
  if (fileType === 'text') return 'TEKS';
  return 'BERKAS';
}

function typeBadgeClass(fileType) {
  if (fileType === 'pdf') return 'badge-pdf';
  if (fileType === 'ppt') return 'badge-ppt';
  if (fileType === 'apk') return 'badge-apk';
  if (fileType === 'text') return 'badge-text';
  return 'badge-other';
}

async function fetchArchives() {
  const params = new URLSearchParams({
    q: state.q,
    type: state.type,
    category: state.category,
    sort: state.sort
  });

  const res = await fetch(`/api/archives?${params.toString()}`, {
    headers: authHeaders()
  });
  if (res.status === 401) {
    document.getElementById('pinModal').classList.remove('hidden');
    return;
  }
  const data = await res.json();
  state.items = data.items || [];
  state.categories = data.categories || [];
  renderCategories();
  renderList(data.total || 0);
}

function renderCategories() {
  const current = state.category;
  categoryFilter.innerHTML = '<option value="all">Semua Kategori</option>';
  state.categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });
  categoryFilter.value = state.categories.includes(current) ? current : 'all';
}

function renderList(totalAll) {
  if (state.items.length === 0) {
    archiveList.innerHTML = '';
    emptyState.classList.remove('hidden');
    resultCount.textContent = totalAll === 0 ? 'Belum ada arsip' : `0 dari ${totalAll} arsip ditemukan`;
    return;
  }

  emptyState.classList.add('hidden');
  resultCount.textContent =
    state.items.length === totalAll
      ? `${totalAll} arsip tersimpan`
      : `Menampilkan ${state.items.length} dari ${totalAll} arsip`;

  archiveList.innerHTML = state.items
    .map((item) => {
      const tagsHtml = (item.tags || [])
        .slice(0, 4)
        .map((t) => `<span class="tag">#${escapeHtml(t)}</span>`)
        .join('');

      const notePreview = item.notes
        ? escapeHtml(item.notes)
        : item.textContent
          ? escapeHtml(item.textContent.slice(0, 110))
          : item.originalName
            ? escapeHtml(item.originalName)
            : 'Tidak ada catatan';

      return `
        <article class="archive-card" data-id="${escapeHtml(item.id)}" tabindex="0">
          <div class="card-top">
            <span class="badge ${typeBadgeClass(item.fileType)}">${typeLabel(item.fileType)}</span>
            <span class="badge badge-cat">${escapeHtml(item.category || 'Umum')}</span>
          </div>
          <h3 class="card-title">${escapeHtml(item.title)}</h3>
          <p class="card-notes">${notePreview}</p>
          ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
          <div class="card-footer">
            <span>${formatDate(item.createdAt)} · ${formatBytes(item.size)}</span>
            <div class="card-quick-actions">
              <button class="mini-btn" data-action="wa" data-id="${escapeHtml(item.id)}" title="Share ke WhatsApp">WA</button>
              <button class="mini-btn" data-action="share" data-id="${escapeHtml(item.id)}" title="Salin link share">Link</button>
              <button class="mini-btn" data-action="download" data-id="${escapeHtml(item.id)}" title="Unduh berkas">Unduh</button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

// Open Add Modal
function openAddModal() {
  editIdInput.value = '';
  formModalTitle.textContent = 'Tambah Arsip Baru';
  modeTabs.classList.remove('hidden');
  setMode('file');
  archiveForm.reset();
  state.selectedFile = null;
  dropZoneText.classList.remove('hidden');
  selectedFileInfo.classList.add('hidden');
  formError.classList.add('hidden');
  formModal.classList.remove('hidden');
}

function openEditModal(item) {
  editIdInput.value = item.id;
  formModalTitle.textContent = 'Edit Arsip';
  modeTabs.classList.add('hidden');
  fileUploadSection.classList.add('hidden');

  if (item.sourceType === 'note') {
    textNoteSection.classList.remove('hidden');
    textContentInput.value = item.textContent || '';
  } else {
    textNoteSection.classList.add('hidden');
  }

  titleInput.value = item.title || '';
  categoryInput.value = item.category || '';
  tagsInput.value = (item.tags || []).join(', ');
  notesInput.value = item.notes || '';
  formError.classList.add('hidden');
  formModal.classList.remove('hidden');
}

function setMode(mode) {
  state.mode = mode;
  modeTabs.querySelectorAll('.mode-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  if (mode === 'file') {
    fileUploadSection.classList.remove('hidden');
    textNoteSection.classList.add('hidden');
  } else {
    fileUploadSection.classList.add('hidden');
    textNoteSection.classList.remove('hidden');
  }
}

function handleSelectedFile(file) {
  if (!file) return;
  state.selectedFile = file;
  dropZoneText.classList.add('hidden');
  selectedFileInfo.textContent = `${file.name} (${formatBytes(file.size)})`;
  selectedFileInfo.classList.remove('hidden');
  if (!titleInput.value.trim()) {
    titleInput.value = file.name.replace(/\.[^/.]+$/, '');
  }
}

// Open Viewer Modal
async function openViewer(id) {
  const res = await fetch(`/api/archives/${encodeURIComponent(id)}`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    showToast('Arsip tidak ditemukan');
    return;
  }
  const item = await res.json();
  state.currentItem = item;

  viewerTitle.textContent = item.title;
  viewerBadges.innerHTML = `
    <span class="badge ${typeBadgeClass(item.fileType)}">${typeLabel(item.fileType)}</span>
    <span class="badge badge-cat">${escapeHtml(item.category || 'Umum')}</span>
  `;

  const metaParts = [
    `Disimpan ${formatDate(item.createdAt)}`,
    formatBytes(item.size)
  ];
  if (item.originalName) metaParts.push(`File: ${item.originalName}`);
  if (item.notes) metaParts.push(`Catatan: ${item.notes}`);
  if (item.tags && item.tags.length) metaParts.push(`Tag: ${item.tags.map((t) => '#' + t).join(' ')}`);

  viewerMeta.textContent = metaParts.join('  •  ');

  const shareUrl = `${window.location.origin}/share/${item.id}`;
  const waText = encodeURIComponent(`*${item.title}*\n${item.notes ? item.notes + '\n' : ''}Buka arsip: ${shareUrl}`);
  btnShareWa.href = `https://wa.me/?text=${waText}`;

  if (item.fileType === 'text' && item.textContent) {
    btnCopyText.classList.remove('hidden');
  } else {
    btnCopyText.classList.add('hidden');
  }

  // Render preview content
  if (item.fileType === 'pdf') {
    viewerContent.innerHTML = `<iframe class="pdf-frame" src="/api/files/${encodeURIComponent(item.id)}/view" title="${escapeHtml(item.title)}"></iframe>`;
  } else if (item.fileType === 'text') {
    viewerContent.innerHTML = `<pre class="text-reader">${escapeHtml(item.textContent || '(Berkas teks kosong)')}</pre>`;
  } else if (item.fileType === 'apk') {
    viewerContent.innerHTML = `
      <div class="ppt-placeholder">
        <span class="badge badge-apk">APK · SOFTWARE EDC</span>
        <h3>${escapeHtml(item.originalName || item.title)}</h3>
        <p>File aplikasi Android (.apk) siap diunduh dan diinstal ke perangkat EDC / Android.</p>
        <a class="btn btn-primary" href="/api/files/${encodeURIComponent(item.id)}/download">Unduh APK (${formatBytes(item.size)})</a>
      </div>
    `;
  } else {
    viewerContent.innerHTML = `
      <div class="ppt-placeholder">
        <span class="badge ${typeBadgeClass(item.fileType)}">${typeLabel(item.fileType)}</span>
        <h3>${escapeHtml(item.originalName || item.title)}</h3>
        <p>Pratinjau langsung untuk berkas PowerPoint/Office belum tersedia di browser. Silakan unduh berkas untuk membukanya.</p>
        <a class="btn btn-primary" href="/api/files/${encodeURIComponent(item.id)}/download">Unduh Berkas (${formatBytes(item.size)})</a>
      </div>
    `;
  }

  viewerModal.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  if (id === 'viewerModal') {
    viewerContent.innerHTML = '';
    if (window.location.pathname.startsWith('/share/')) {
      window.history.replaceState({}, '', '/');
    }
  }
}

async function copyShareLink(id) {
  const url = `${window.location.origin}/share/${id}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link arsip berhasil disalin!');
  } catch {
    showToast(`Link: ${url}`);
  }
}

// Event Listeners
document.getElementById('btnOpenAdd').addEventListener('click', openAddModal);
document.getElementById('btnEmptyAdd').addEventListener('click', openAddModal);

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

[formModal, viewerModal].forEach((backdrop) => {
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal(backdrop.id);
  });
});

modeTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.mode-tab');
  if (tab) setMode(tab.dataset.mode);
});

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleSelectedFile(e.target.files[0]));

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) {
    handleSelectedFile(e.dataTransfer.files[0]);
  }
});

// Submit form (Create or Update)
archiveForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.add('hidden');

  const editId = editIdInput.value;

  if (editId) {
    const payload = {
      title: titleInput.value.trim(),
      category: categoryInput.value.trim() || 'SOP',
      tags: tagsInput.value,
      notes: notesInput.value.trim()
    };
    if (!textNoteSection.classList.contains('hidden')) {
      payload.textContent = textContentInput.value;
    }

    const res = await fetch(`/api/archives/${encodeURIComponent(editId)}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      formError.textContent = err.error || 'Gagal memperbarui arsip.';
      formError.classList.remove('hidden');
      return;
    }

    closeModal('formModal');
    showToast('Arsip diperbarui');
    await fetchArchives();
    if (!viewerModal.classList.contains('hidden')) {
      openViewer(editId);
    }
    return;
  }

  // Create new
  if (state.mode === 'file') {
    if (!state.selectedFile) {
      formError.textContent = 'Pilih berkas terlebih dahulu.';
      formError.classList.remove('hidden');
      return;
    }
    const fd = new FormData();
    fd.append('file', state.selectedFile);
    fd.append('title', titleInput.value.trim());
    fd.append('category', categoryInput.value.trim() || 'SOP');
    fd.append('tags', tagsInput.value);
    fd.append('notes', notesInput.value.trim());

    const res = await fetch('/api/archives', {
      method: 'POST',
      headers: authHeaders(),
      body: fd
    });
    if (!res.ok) {
      const err = await res.json();
      formError.textContent = err.error || 'Gagal menyimpan berkas.';
      formError.classList.remove('hidden');
      return;
    }
  } else {
    const textContent = textContentInput.value.trim();
    if (!textContent) {
      formError.textContent = 'Isi teks SOP tidak boleh kosong.';
      formError.classList.remove('hidden');
      return;
    }
    const res = await fetch('/api/archives', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: titleInput.value.trim(),
        category: categoryInput.value.trim() || 'SOP',
        tags: tagsInput.value,
        notes: notesInput.value.trim(),
        textContent
      })
    });
    if (!res.ok) {
      const err = await res.json();
      formError.textContent = err.error || 'Gagal menyimpan catatan.';
      formError.classList.remove('hidden');
      return;
    }
  }

  closeModal('formModal');
  showToast('Arsip berhasil disimpan!');
  await fetchArchives();
});

// Search & Filter Listeners
let searchDebounce;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.q = searchInput.value;
    fetchArchives();
  }, 160);
});

typeFilters.addEventListener('click', (e) => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  typeFilters.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
  pill.classList.add('active');
  state.type = pill.dataset.type;
  fetchArchives();
});

categoryFilter.addEventListener('change', () => {
  state.category = categoryFilter.value;
  fetchArchives();
});

sortSelect.addEventListener('change', () => {
  state.sort = sortSelect.value;
  fetchArchives();
});

// Card clicks & quick actions
archiveList.addEventListener('click', (e) => {
  const actionBtn = e.target.closest('[data-action]');
  if (actionBtn) {
    e.stopPropagation();
    const { action, id } = actionBtn.dataset;
    if (action === 'share') copyShareLink(id);
    if (action === 'wa') {
      const item = state.items.find((i) => i.id === id);
      const url = `${window.location.origin}/share/${id}`;
      const text = encodeURIComponent(
        `*${item ? item.title : 'Arsip'}*\n${item && item.notes ? item.notes + '\n' : ''}Buka & unduh di sini: ${url}`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    }
    if (action === 'download') window.location.href = `/api/files/${encodeURIComponent(id)}/download`;
    return;
  }

  const card = e.target.closest('.archive-card');
  if (card) openViewer(card.dataset.id);
});

// Viewer Actions
btnDownload.addEventListener('click', () => {
  if (state.currentItem) {
    window.location.href = `/api/files/${encodeURIComponent(state.currentItem.id)}/download`;
  }
});

btnCopyLink.addEventListener('click', () => {
  if (state.currentItem) copyShareLink(state.currentItem.id);
});

btnCopyText.addEventListener('click', async () => {
  if (!state.currentItem || !state.currentItem.textContent) return;
  try {
    await navigator.clipboard.writeText(state.currentItem.textContent);
    showToast('Teks SOP disalin ke clipboard!');
  } catch {
    showToast('Gagal menyalin teks');
  }
});

btnEditArchive.addEventListener('click', () => {
  if (state.currentItem) openEditModal(state.currentItem);
});

btnDeleteArchive.addEventListener('click', async () => {
  if (!state.currentItem) return;
  if (!confirm(`Hapus arsip "${state.currentItem.title}"?`)) return;

  const res = await fetch(`/api/archives/${encodeURIComponent(state.currentItem.id)}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (res.ok) {
    closeModal('viewerModal');
    showToast('Arsip dihapus');
    fetchArchives();
  }
});

// Keyboard shortcuts: "/" to search, "Escape" to close modals
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    searchInput.focus();
  }
  if (e.key === 'Escape') {
    if (!formModal.classList.contains('hidden')) closeModal('formModal');
    else if (!viewerModal.classList.contains('hidden')) closeModal('viewerModal');
  }
});

// PIN Form Handler
document.getElementById('pinForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pinInput = document.getElementById('pinInput');
  const pinError = document.getElementById('pinError');
  pinError.classList.add('hidden');

  const res = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: pinInput.value })
  });

  if (!res.ok) {
    pinError.textContent = 'PIN salah, silakan coba lagi.';
    pinError.classList.remove('hidden');
    return;
  }

  state.adminPin = pinInput.value.trim();
  sessionStorage.setItem('spa_admin_pin', state.adminPin);
  document.getElementById('pinModal').classList.add('hidden');
  fetchArchives();
});

// Initial load
(async function init() {
  const authRes = await fetch('/api/auth/status');
  const auth = await authRes.json();
  if (auth.pinRequired && !state.adminPin) {
    document.getElementById('pinModal').classList.remove('hidden');
    return;
  }
  await fetchArchives();
})();
