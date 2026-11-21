const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3456;
const ADMIN_PIN = (process.env.ADMIN_PIN || '').trim();

const BASE_STORAGE = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : __dirname;
const DATA_DIR = path.join(BASE_STORAGE, 'data');
const UPLOAD_DIR = path.join(BASE_STORAGE, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_FILE = path.join(DATA_DIR, 'archives.json');

// Ensure required directories exist
[DATA_DIR, UPLOAD_DIR, PUBLIC_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const starter = [
      {
        id: 'welcome-sop-01',
        title: 'Cara Menggunakan Si Paling Arsip',
        fileType: 'text',
        sourceType: 'note',
        originalName: null,
        storedName: null,
        mimeType: 'text/plain',
        size: 420,
        category: 'SOP',
        tags: ['panduan', 'arsip', 'mulai'],
        notes: 'Catatan singkat cara menyimpan, mencari, dan membagikan ulang berkas SOP atau APK EDC.',
        textContent:
          'Selamat datang di Si Paling Arsip!\n\n' +
          '1. Klik "+ Tambah Arsip" untuk mengunggah file PDF, PPT/PPTX, APK (software EDC), atau menulis SOP teks langsung.\n' +
          '2. Gunakan kolom pencarian di atas (tekan "/") untuk mencari judul, tag, kategori, atau isi teks.\n' +
          '3. Klik berkas untuk membaca ulang langsung di browser.\n' +
          '4. Gunakan tombol Salin Link atau Share WhatsApp untuk mengirim link khusus (read-only) ke teknisi.\n\n' +
          'Anda dapat menghapus catatan ini kapan saja.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(DB_FILE, JSON.stringify(starter, null, 2), 'utf8');
  }
}

initDb();

function readArchives() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeArchives(items) {
  fs.writeFileSync(DB_FILE, JSON.stringify(items, null, 2), 'utf8');
}

function detectFileType(filename, mimeType) {
  const ext = path.extname(filename || '').toLowerCase();
  if (ext === '.pdf' || mimeType === 'application/pdf') return 'pdf';
  if (
    ext === '.ppt' ||
    ext === '.pptx' ||
    (mimeType && (mimeType.includes('powerpoint') || mimeType.includes('presentation')))
  ) {
    return 'ppt';
  }
  if (ext === '.apk' || mimeType === 'application/vnd.android.package-archive') {
    return 'apk';
  }
  if (
    ['.txt', '.md', '.csv', '.log', '.json', '.xml', '.yaml', '.yml'].includes(ext) ||
    (mimeType && mimeType.startsWith('text/'))
  ) {
    return 'text';
  }
  return 'other';
}

function parseTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof rawTags === 'string') {
    return rawTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

// Optional Admin PIN middleware for dashboard & write APIs
function requireAdmin(req, res, next) {
  if (!ADMIN_PIN) return next();
  const provided = String(req.headers['x-admin-pin'] || '').trim();
  if (provided && provided === ADMIN_PIN) {
    return next();
  }
  return res.status(401).json({ error: 'PIN admin diperlukan' });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${crypto.randomBytes(3).toString('hex')}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200 MB (supports large APK & PDF files)
});

app.use(express.json({ limit: '5mb' }));
app.use(express.static(PUBLIC_DIR));

// Auth status & PIN check
app.get('/api/auth/status', (_req, res) => {
  res.json({ pinRequired: Boolean(ADMIN_PIN) });
});

app.post('/api/auth/verify', (req, res) => {
  if (!ADMIN_PIN) return res.json({ ok: true });
  const pin = String(req.body.pin || '').trim();
  if (pin === ADMIN_PIN) return res.json({ ok: true });
  return res.status(401).json({ error: 'PIN salah' });
});

// List / Search archives (admin)
app.get('/api/archives', requireAdmin, (req, res) => {
  const { q = '', type = 'all', category = 'all', sort = 'newest' } = req.query;
  let items = readArchives();

  if (type && type !== 'all') {
    items = items.filter((item) => item.fileType === type);
  }

  if (category && category !== 'all') {
    items = items.filter(
      (item) => (item.category || '').toLowerCase() === String(category).toLowerCase()
    );
  }

  const query = String(q).trim().toLowerCase();
  if (query) {
    const terms = query.split(/\s+/).filter(Boolean);
    items = items.filter((item) => {
      const haystack = [
        item.title,
        item.originalName,
        item.category,
        (item.tags || []).join(' '),
        item.notes,
        item.textContent
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  items.sort((a, b) => {
    if (sort === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    if (sort === 'name') {
      return (a.title || '').localeCompare(b.title || '', 'id');
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const allItems = readArchives();
  const categories = Array.from(
    new Set(allItems.map((i) => i.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'id'));

  res.json({ items, categories, total: allItems.length });
});

// Get single archive (admin)
app.get('/api/archives/:id', requireAdmin, (req, res) => {
  const items = readArchives();
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Arsip tidak ditemukan' });
  res.json(item);
});

// Public read-only single archive endpoint for shared links (/share/:id)
app.get('/api/share/:id', (req, res) => {
  const items = readArchives();
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Arsip tidak ditemukan' });
  res.json({
    id: item.id,
    title: item.title,
    fileType: item.fileType,
    sourceType: item.sourceType,
    originalName: item.originalName,
    size: item.size,
    category: item.category,
    tags: item.tags,
    notes: item.notes,
    textContent: item.fileType === 'text' ? item.textContent : '',
    createdAt: item.createdAt
  });
});

// Create archive (file upload OR direct text note)
app.post(
  '/api/archives',
  requireAdmin,
  (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return upload.single('file')(req, res, (err) => {
        if (err) {
          return res.status(400).json({ error: err.message || 'Gagal mengunggah berkas' });
        }
        next();
      });
    }
    next();
  },
  (req, res) => {
    const items = readArchives();
    const now = new Date().toISOString();
    const id = crypto.randomBytes(6).toString('hex');

    if (req.file) {
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const fileType = detectFileType(originalName, req.file.mimetype);
      const defaultTitle = path.basename(originalName, path.extname(originalName));
      const title = (req.body.title || '').trim() || defaultTitle;
      const category = (req.body.category || '').trim() || (fileType === 'apk' ? 'Software EDC' : 'SOP');
      const tags = parseTags(req.body.tags);
      const notes = (req.body.notes || '').trim();

      let textContent = '';
      if (fileType === 'text' && req.file.size <= 512 * 1024) {
        try {
          textContent = fs.readFileSync(req.file.path, 'utf8');
        } catch {
          textContent = '';
        }
      }

      const newItem = {
        id,
        title,
        fileType,
        sourceType: 'file',
        originalName,
        storedName: req.file.filename,
        mimeType:
          fileType === 'apk' ? 'application/vnd.android.package-archive' : req.file.mimetype,
        size: req.file.size,
        category,
        tags,
        notes,
        textContent,
        createdAt: now,
        updatedAt: now
      };

      items.unshift(newItem);
      writeArchives(items);
      return res.status(201).json(newItem);
    }

    const title = (req.body.title || '').trim();
    const textContent = (req.body.textContent || '').trim();
    if (!title || !textContent) {
      return res.status(400).json({ error: 'Judul dan isi teks wajib diisi.' });
    }

    const newItem = {
      id,
      title,
      fileType: 'text',
      sourceType: 'note',
      originalName: null,
      storedName: null,
      mimeType: 'text/plain',
      size: Buffer.byteLength(textContent, 'utf8'),
      category: (req.body.category || '').trim() || 'SOP',
      tags: parseTags(req.body.tags),
      notes: (req.body.notes || '').trim(),
      textContent,
      createdAt: now,
      updatedAt: now
    };

    items.unshift(newItem);
    writeArchives(items);
    res.status(201).json(newItem);
  }
);

// Update archive metadata / text content (admin)
app.patch('/api/archives/:id', requireAdmin, (req, res) => {
  const items = readArchives();
  const idx = items.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Arsip tidak ditemukan' });

  const current = items[idx];
  const updated = {
    ...current,
    title: req.body.title !== undefined ? String(req.body.title).trim() || current.title : current.title,
    category: req.body.category !== undefined ? String(req.body.category).trim() || 'Umum' : current.category,
    tags: req.body.tags !== undefined ? parseTags(req.body.tags) : current.tags,
    notes: req.body.notes !== undefined ? String(req.body.notes).trim() : current.notes,
    updatedAt: new Date().toISOString()
  };

  if (current.sourceType === 'note' && req.body.textContent !== undefined) {
    updated.textContent = String(req.body.textContent);
    updated.size = Buffer.byteLength(updated.textContent, 'utf8');
  }

  items[idx] = updated;
  writeArchives(items);
  res.json(updated);
});

// Delete archive (admin)
app.delete('/api/archives/:id', requireAdmin, (req, res) => {
  const items = readArchives();
  const idx = items.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Arsip tidak ditemukan' });

  const [removed] = items.splice(idx, 1);
  if (removed.storedName) {
    const filePath = path.join(UPLOAD_DIR, removed.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  writeArchives(items);
  res.json({ ok: true });
});

// View file inline (public for valid ID)
app.get('/api/files/:id/view', (req, res) => {
  const items = readArchives();
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).send('Berkas tidak ditemukan');

  if (item.sourceType === 'note') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(item.textContent || '');
  }

  const filePath = path.join(UPLOAD_DIR, item.storedName || '');
  if (!fs.existsSync(filePath)) return res.status(404).send('Berkas fisik tidak ditemukan');

  if (item.fileType === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
  } else if (item.fileType === 'text') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  } else if (item.fileType === 'apk') {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  } else if (item.mimeType) {
    res.setHeader('Content-Type', item.mimeType);
  }

  const safeName = encodeURIComponent(item.originalName || 'berkas');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${safeName}`);
  fs.createReadStream(filePath).pipe(res);
});

// Download file (public for valid ID)
app.get('/api/files/:id/download', (req, res) => {
  const items = readArchives();
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).send('Berkas tidak ditemukan');

  if (item.sourceType === 'note') {
    const safeTitle = (item.title || 'catatan').replace(/[^a-zA-Z0-9._-\s]/g, '_') + '.txt';
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}"`);
    return res.send(item.textContent || '');
  }

  const filePath = path.join(UPLOAD_DIR, item.storedName || '');
  if (!fs.existsSync(filePath)) return res.status(404).send('Berkas fisik tidak ditemukan');

  if (item.fileType === 'apk') {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  }
  res.download(filePath, item.originalName || item.storedName);
});

// Dedicated isolated read-only share page for technicians
app.get('/share/:id', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'share.html'));
});

app.listen(PORT, () => {
  console.log(`Si Paling Arsip berjalan di http://localhost:${PORT}`);
});
