const shareBadges = document.getElementById('shareBadges');
const shareTitle = document.getElementById('shareTitle');
const shareMeta = document.getElementById('shareMeta');
const shareBody = document.getElementById('shareBody');
const btnShareDownload = document.getElementById('btnShareDownload');
const btnShareCopyText = document.getElementById('btnShareCopyText');
const btnShareCopyLink = document.getElementById('btnShareCopyLink');
const toastEl = document.getElementById('toast');

let toastTimer = null;
let currentItem = null;

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

btnShareCopyLink.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast('Link berhasil disalin!');
  } catch {
    showToast('Gagal menyalin link');
  }
});

btnShareCopyText.addEventListener('click', async () => {
  if (!currentItem || !currentItem.textContent) return;
  try {
    await navigator.clipboard.writeText(currentItem.textContent);
    showToast('Teks disalin ke clipboard!');
  } catch {
    showToast('Gagal menyalin teks');
  }
});

(async function init() {
  const match = window.location.pathname.match(/^\/share\/([^/]+)$/);
  if (!match) {
    shareTitle.textContent = 'Link tidak valid';
    return;
  }

  const id = match[1];
  const res = await fetch(`/api/share/${encodeURIComponent(id)}`);
  if (!res.ok) {
    shareTitle.textContent = 'Berkas tidak ditemukan atau sudah dihapus';
    btnShareDownload.classList.add('hidden');
    btnShareCopyLink.classList.add('hidden');
    shareBody.innerHTML =
      '<div class="ppt-placeholder"><p>Pastikan link yang Anda buka sudah benar atau minta admin membagikan ulang.</p></div>';
    return;
  }

  const item = await res.json();
  currentItem = item;

  document.title = `${item.title} — Si Paling Arsip`;
  shareTitle.textContent = item.title;
  shareBadges.innerHTML = `
    <span class="badge ${typeBadgeClass(item.fileType)}">${typeLabel(item.fileType)}</span>
    <span class="badge badge-cat">${escapeHtml(item.category || 'Umum')}</span>
  `;

  const metaParts = [
    `Diarsipkan ${formatDate(item.createdAt)}`,
    formatBytes(item.size)
  ];
  if (item.originalName) metaParts.push(`File: ${item.originalName}`);
  if (item.notes) metaParts.push(`Catatan: ${item.notes}`);
  shareMeta.textContent = metaParts.join('  •  ');

  btnShareDownload.href = `/api/files/${encodeURIComponent(item.id)}/download`;

  if (item.fileType === 'text' && item.textContent) {
    btnShareCopyText.classList.remove('hidden');
  }

  if (item.fileType === 'pdf') {
    shareBody.innerHTML = `<iframe class="pdf-frame" src="/api/files/${encodeURIComponent(item.id)}/view" title="${escapeHtml(item.title)}"></iframe>`;
  } else if (item.fileType === 'text') {
    shareBody.innerHTML = `<pre class="text-reader">${escapeHtml(item.textContent || '(Berkas teks kosong)')}</pre>`;
  } else if (item.fileType === 'apk') {
    shareBody.innerHTML = `
      <div class="ppt-placeholder">
        <span class="badge badge-apk">APK · SOFTWARE EDC</span>
        <h3>${escapeHtml(item.originalName || item.title)}</h3>
        <p>Klik tombol di bawah untuk mengunduh file installer (.apk) ke perangkat Anda.</p>
        <a class="btn btn-primary" href="/api/files/${encodeURIComponent(item.id)}/download">Unduh APK (${formatBytes(item.size)})</a>
      </div>
    `;
  } else {
    shareBody.innerHTML = `
      <div class="ppt-placeholder">
        <span class="badge ${typeBadgeClass(item.fileType)}">${typeLabel(item.fileType)}</span>
        <h3>${escapeHtml(item.originalName || item.title)}</h3>
        <p>Silakan unduh berkas untuk membukanya di perangkat Anda.</p>
        <a class="btn btn-primary" href="/api/files/${encodeURIComponent(item.id)}/download">Unduh Berkas (${formatBytes(item.size)})</a>
      </div>
    `;
  }
})();
