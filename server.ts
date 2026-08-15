import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- Real-time Server-Sent Events (SSE) Hub ---
  let sseClients: { id: number; res: express.Response }[] = [];

  function broadcastRealtimeUpdate(type: string, data: any) {
    const payload = JSON.stringify({ type, data, timestamp: Date.now() });
    sseClients.forEach(client => {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (err) {
        // Handled by close listener
      }
    });
  }

  app.get('/api/realtime/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('\n');

    const clientId = Date.now() + Math.random();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);

    // Send initial connection handshake
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

    // Keep connection alive with heartbeat comment every 15 seconds
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (e) {
        clearInterval(heartbeat);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients = sseClients.filter(c => c.id !== clientId);
    });
  });

  const DATA_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Serve static uploads
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/api/uploads', express.static(UPLOADS_DIR));

  // Upload endpoint for profile photos and image assets
  app.post('/api/upload', (req, res) => {
    try {
      const { dataUrl, filename, mimeType } = req.body;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: 'dataUrl is required' });
      }

      // Extract base64 data
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let extension = 'png';

      if (matches && matches.length === 3) {
        const detectedMime = matches[1];
        if (detectedMime.includes('jpeg') || detectedMime.includes('jpg')) extension = 'jpg';
        else if (detectedMime.includes('png')) extension = 'png';
        else if (detectedMime.includes('webp')) extension = 'webp';
        else if (detectedMime.includes('svg')) extension = 'svg';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(dataUrl, 'base64');
      }

      const cleanName = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, '') : `avatar_${Date.now()}`;
      const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName.replace(/\.[^/.]+$/, '')}.${extension}`;
      const targetFilePath = path.join(UPLOADS_DIR, uniqueName);

      fs.writeFileSync(targetFilePath, buffer);
      const publicUrl = `/uploads/${uniqueName}`;

      res.json({
        success: true,
        url: publicUrl,
        filename: uniqueName,
        sizeBytes: buffer.length
      });
    } catch (err: any) {
      console.error('File upload failure:', err);
      res.status(500).json({ error: 'Failed to process file upload', details: err.message });
    }
  });

  // Delete uploaded file endpoint
  app.post('/api/delete-file', (req, res) => {
    try {
      const { fileUrl } = req.body;
      if (!fileUrl || typeof fileUrl !== 'string') return res.status(400).json({ error: 'fileUrl is required' });
      
      const filename = fileUrl.split('/').pop();
      if (!filename || filename.includes('..')) return res.status(400).json({ error: 'Invalid filename' });
      
      const targetFilePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(targetFilePath)) {
        fs.unlinkSync(targetFilePath);
        return res.json({ success: true, message: 'File deleted successfully' });
      } else {
        return res.status(404).json({ error: 'File not found' });
      }
    } catch (err: any) {
      console.error('File deletion failure:', err);
      res.status(500).json({ error: 'Failed to delete file', details: err.message });
    }
  });

  const BLOOD_BANKS_FILE = path.join(DATA_DIR, 'blood_banks.json');
  const EMERGENCY_CONTACTS_FILE = path.join(DATA_DIR, 'emergency_contacts.json');

  const defaultBloodBanks: any[] = [];

  const defaultEmergencyContacts = {
    hotline: '999 / 16263',
    contacts: []
  };

  function loadBloodBanks() {
    if (fs.existsSync(BLOOD_BANKS_FILE)) {
      try {
        const content = fs.readFileSync(BLOOD_BANKS_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.warn('Error reading blood_banks.json, preserving file:', e);
      }
    } else {
      fs.writeFileSync(BLOOD_BANKS_FILE, JSON.stringify(defaultBloodBanks, null, 2));
      return defaultBloodBanks;
    }
    return [];
  }

  function saveBloodBanks(data: any[]) {
    fs.writeFileSync(BLOOD_BANKS_FILE, JSON.stringify(data, null, 2));
  }

  function loadEmergencyContacts() {
    if (fs.existsSync(EMERGENCY_CONTACTS_FILE)) {
      try {
        const content = fs.readFileSync(EMERGENCY_CONTACTS_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          return {
            hotline: parsed.hotline || '999 / 16263',
            contacts: Array.isArray(parsed.contacts) ? parsed.contacts : []
          };
        }
      } catch (e) {
        console.warn('Error reading emergency_contacts.json, preserving file:', e);
      }
    } else {
      fs.writeFileSync(EMERGENCY_CONTACTS_FILE, JSON.stringify(defaultEmergencyContacts, null, 2));
      return defaultEmergencyContacts;
    }
    return { hotline: '999 / 16263', contacts: [] };
  }

  function saveEmergencyContacts(data: any) {
    fs.writeFileSync(EMERGENCY_CONTACTS_FILE, JSON.stringify(data, null, 2));
  }

  // Ensure initial files exist
  loadBloodBanks();
  loadEmergencyContacts();

  // --- A  // Blood Banks Endpoints
  app.get('/api/blood-banks', (req, res) => {
    const banks = loadBloodBanks();
    res.json(banks);
  });

  app.post('/api/blood-banks', (req, res) => {
    const { bloodBanks } = req.body;
    if (Array.isArray(bloodBanks)) {
      saveBloodBanks(bloodBanks);
      broadcastRealtimeUpdate('blood_banks_updated', bloodBanks);
      res.json({ success: true, count: bloodBanks.length, bloodBanks });
    } else {
      res.status(400).json({ error: 'Invalid payload. Array of bloodBanks required.' });
    }
  });

  app.post('/api/blood-banks/delete', (req, res) => {
    const { id, ids } = req.body;
    const current = loadBloodBanks();
    const idsToDelete = Array.isArray(ids) ? ids.map(String) : id ? [String(id)] : [];
    const filtered = current.filter((b: any) => !idsToDelete.includes(String(b.id)));
    saveBloodBanks(filtered);
    broadcastRealtimeUpdate('blood_banks_updated', filtered);
    res.json({ success: true, count: filtered.length, bloodBanks: filtered });
  });

  // Emergency Contacts & Hotline Endpoints
  app.get('/api/emergency-contacts', (req, res) => {
    const data = loadEmergencyContacts();
    res.json(data);
  });

  app.post('/api/emergency-contacts', (req, res) => {
    const { hotline, contacts } = req.body;
    const current = loadEmergencyContacts();
    const updated = {
      hotline: hotline !== undefined ? hotline : current.hotline,
      contacts: Array.isArray(contacts) ? contacts : current.contacts,
    };
    saveEmergencyContacts(updated);
    broadcastRealtimeUpdate('emergency_contacts_updated', updated);
    res.json({ success: true, data: updated });
  });

  // Users Management Endpoints
  const USERS_FILE = path.join(DATA_DIR, 'registered_users.json');
  const BANNED_USERS_FILE = path.join(DATA_DIR, 'banned_users.json');
  const DELETED_USERS_FILE = path.join(DATA_DIR, 'deleted_users.json');

  function loadUsersServer() {
    if (fs.existsSync(USERS_FILE)) {
      try {
        const content = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(content);
      } catch (e) {}
    }
    return [];
  }

  function saveUsersServer(users: any[]) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }

  function loadDeletedUsersServer(): string[] {
    if (fs.existsSync(DELETED_USERS_FILE)) {
      try {
        const content = fs.readFileSync(DELETED_USERS_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch (e) {}
    }
    return [];
  }

  function loadBannedUsersServer(): string[] {
    if (fs.existsSync(BANNED_USERS_FILE)) {
      try {
        const content = fs.readFileSync(BANNED_USERS_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch (e) {}
    }
    return [];
  }

  app.get('/api/users', (req, res) => {
    const users = loadUsersServer();
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const { user, users } = req.body;
    const current = loadUsersServer();
    let updated = [...current];

    const deletedList = loadDeletedUsersServer().map(d => d.toLowerCase().trim());
    const userListToUpsert = Array.isArray(users) ? users : user ? [user] : [];

    // Strictly filter out any user that was deleted by admin
    const sanitizedList = userListToUpsert.filter((u: any) => {
      if (!u) return false;
      const uEmail = (u.email || '').toLowerCase().trim();
      const uId = String(u.id || u.userId || '').trim();
      if (uEmail && deletedList.includes(uEmail)) return false;
      if (uId && deletedList.includes(uId)) return false;
      return true;
    });

    sanitizedList.forEach((u: any) => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uId = String(u.id || u.userId || '').trim();

      const idx = updated.findIndex((item: any) => {
        const itemEmail = (item.email || '').toLowerCase().trim();
        const itemId = String(item.id || item.userId || '').trim();
        return (uEmail && itemEmail === uEmail) || (uId && itemId === uId);
      });

      if (idx >= 0) {
        updated[idx] = { ...updated[idx], ...u };
      } else {
        updated.unshift(u);
      }
    });

    saveUsersServer(updated);
    broadcastRealtimeUpdate('users_updated', { count: updated.length, users: updated });
    res.json({ success: true, count: updated.length, users: updated });
  });

  app.post('/api/users/delete', (req, res) => {
    const { ids, emails } = req.body;
    const current = loadUsersServer();
    const idList = Array.isArray(ids) ? ids.map(String) : [];
    const emailList = Array.isArray(emails) ? emails.map((e: string) => e.toLowerCase().trim()) : [];

    const filtered = current.filter((u: any) => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uId = String(u.id || u.userId || '').trim();
      const isMatch = (uEmail && emailList.includes(uEmail)) || (uId && idList.includes(uId));
      return !isMatch;
    });

    saveUsersServer(filtered);

    // Persist to deleted_users.json to prevent resurrection from client localStorage
    const currentDeleted = loadDeletedUsersServer();
    const newDeleted = Array.from(new Set([...currentDeleted, ...idList, ...emailList]));
    fs.writeFileSync(DELETED_USERS_FILE, JSON.stringify(newDeleted, null, 2));

    broadcastRealtimeUpdate('users_updated', { count: filtered.length, users: filtered });
    broadcastRealtimeUpdate('deleted_users_updated', newDeleted);
    res.json({ success: true, count: filtered.length, deleted: newDeleted });
  });

  // Banned & Deleted Users Endpoints
  app.get('/api/users/banned', (req, res) => {
    res.json(loadBannedUsersServer());
  });

  app.post('/api/users/banned', (req, res) => {
    const { bannedList } = req.body;
    if (Array.isArray(bannedList)) {
      fs.writeFileSync(BANNED_USERS_FILE, JSON.stringify(bannedList, null, 2));
      broadcastRealtimeUpdate('banned_users_updated', bannedList);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'bannedList must be array' });
    }
  });

  app.get('/api/users/deleted', (req, res) => {
    res.json(loadDeletedUsersServer());
  });

  app.post('/api/users/deleted', (req, res) => {
    const { deletedList } = req.body;
    if (Array.isArray(deletedList)) {
      fs.writeFileSync(DELETED_USERS_FILE, JSON.stringify(deletedList, null, 2));
      broadcastRealtimeUpdate('deleted_users_updated', deletedList);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'deletedList must be array' });
    }
  });

  app.post('/api/users/offline', (req, res) => {
    const { userId, userEmail } = req.body;
    
    // 1. Mark user offline in registered_users.json
    const users = loadUsersServer();
    const updatedUsers = users.map((u: any) => {
      if (u.id === userId || (userEmail && u.email && u.email.toLowerCase() === userEmail.toLowerCase())) {
        return { ...u, activityStatus: 'offline', onlineStatus: 'Offline' };
      }
      return u;
    });
    saveUsersServer(updatedUsers);
    broadcastRealtimeUpdate('users_updated', updatedUsers);

    // 2. Remove them from any active blood requests if they haven't accepted
    const reqs = loadBloodRequestsServer();
    let modified = false;
    const updatedReqs = reqs.map((req: any) => {
      if (req.status === 'active' && req.matchedDonors) {
        const alreadyMatched = req.matchedDonors.find((d: any) => 
          d.id === userId || 
          (userEmail && (d.email?.toLowerCase() === userEmail.toLowerCase() || d.id?.toLowerCase() === userEmail.toLowerCase()))
        );
        
        if (alreadyMatched) {
          modified = true;
          return {
            ...req,
            matchedDonors: req.matchedDonors.filter((d: any) => 
              d.id !== userId && 
              !(userEmail && (d.id?.toLowerCase() === userEmail.toLowerCase() || d.email?.toLowerCase() === userEmail.toLowerCase()))
            )
          };
        }
      }
      return req;
    });

    if (modified) {
      fs.writeFileSync(BLOOD_REQUESTS_FILE, JSON.stringify(updatedReqs, null, 2));
      broadcastRealtimeUpdate('blood_requests_updated', { allRequests: updatedReqs });
    }

    res.json({ success: true });
  });

  // Site Configuration Endpoints
  const SITE_CONFIG_FILE = path.join(DATA_DIR, 'site_config.json');

  app.get('/api/site-config', (req, res) => {
    if (fs.existsSync(SITE_CONFIG_FILE)) {
      try {
        return res.json(JSON.parse(fs.readFileSync(SITE_CONFIG_FILE, 'utf-8')));
      } catch (e) {}
    }
    res.json(null);
  });

  app.post('/api/site-config', (req, res) => {
    const { siteConfig } = req.body;
    if (siteConfig && typeof siteConfig === 'object') {
      fs.writeFileSync(SITE_CONFIG_FILE, JSON.stringify(siteConfig, null, 2));
      broadcastRealtimeUpdate('site_config_updated', siteConfig);
      res.json({ success: true, data: siteConfig });
    } else {
      res.status(400).json({ error: 'Invalid siteConfig payload' });
    }
  });

  // Emergency Blood Requests Endpoints
  const BLOOD_REQUESTS_FILE = path.join(DATA_DIR, 'blood_requests.json');

  function loadBloodRequestsServer() {
    if (fs.existsSync(BLOOD_REQUESTS_FILE)) {
      try { return JSON.parse(fs.readFileSync(BLOOD_REQUESTS_FILE, 'utf-8')); } catch (e) {}
    }
    return [];
  }

  app.get('/api/blood-requests', (req, res) => {
    const requests = loadBloodRequestsServer();
    res.json(requests);
  });

  app.post('/api/blood-requests', (req, res) => {
    const { request } = req.body;
    if (!request) return res.status(400).json({ error: 'request object required' });

    const current = loadBloodRequestsServer();
    const idx = current.findIndex((item: any) => item.id === request.id || (request.userId && item.userId === request.userId && item.status === 'active'));

    let updated = [...current];
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], ...request };
    } else {
      updated.unshift(request);
    }

    fs.writeFileSync(BLOOD_REQUESTS_FILE, JSON.stringify(updated, null, 2));
    broadcastRealtimeUpdate('blood_requests_updated', { request, allRequests: updated });
    res.json({ success: true, request: request, allRequests: updated });
  });

  app.post('/api/blood-requests/delete', (req, res) => {
    const { id, clearAll } = req.body;
    let filtered: any[] = [];
    if (!clearAll && id) {
      const current = loadBloodRequestsServer();
      filtered = current.filter((r: any) => r.id !== id);
    }
    fs.writeFileSync(BLOOD_REQUESTS_FILE, JSON.stringify(filtered, null, 2));
    broadcastRealtimeUpdate('blood_requests_updated', { deletedId: id, allRequests: filtered });
    res.json({ success: true, allRequests: filtered });
  });

  app.post('/api/blood-requests/clear', (req, res) => {
    fs.writeFileSync(BLOOD_REQUESTS_FILE, JSON.stringify([], null, 2));
    broadcastRealtimeUpdate('blood_requests_updated', { allRequests: [] });
    res.json({ success: true, allRequests: [] });
  });

  // Support Tickets Endpoints
  const TICKETS_FILE = path.join(DATA_DIR, 'support_tickets.json');

  function loadTicketsServer() {
    if (fs.existsSync(TICKETS_FILE)) {
      try { return JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf-8')); } catch (e) {}
    }
    return [];
  }

  app.get('/api/tickets', (req, res) => {
    res.json(loadTicketsServer());
  });

  app.post('/api/tickets', (req, res) => {
    const { ticket, tickets } = req.body;
    const current = loadTicketsServer();
    let updated = [...current];

    const listToUpsert = Array.isArray(tickets) ? tickets : ticket ? [ticket] : [];
    listToUpsert.forEach((t: any) => {
      const idx = updated.findIndex((item: any) => item.id === t.id);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], ...t };
      } else {
        updated.unshift(t);
      }
    });

    fs.writeFileSync(TICKETS_FILE, JSON.stringify(updated, null, 2));
    broadcastRealtimeUpdate('tickets_updated', updated);
    res.json({ success: true, tickets: updated });
  });

  app.post('/api/tickets/delete', (req, res) => {
    const { id, ids } = req.body;
    const current = loadTicketsServer();
    const idsToDelete = Array.isArray(ids) ? ids.map(String) : id ? [String(id)] : [];
    const filtered = current.filter((t: any) => !idsToDelete.includes(String(t.id)));
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(filtered, null, 2));
    broadcastRealtimeUpdate('tickets_updated', filtered);
    res.json({ success: true, count: filtered.length, tickets: filtered });
  });

  // Admin Accounts Endpoints
  const ADMIN_ACCOUNTS_FILE = path.join(DATA_DIR, 'admin_accounts.json');

  app.get('/api/admin-accounts', (req, res) => {
    if (fs.existsSync(ADMIN_ACCOUNTS_FILE)) {
      try { return res.json(JSON.parse(fs.readFileSync(ADMIN_ACCOUNTS_FILE, 'utf-8'))); } catch (e) {}
    }
    res.json([]);
  });

  app.post('/api/admin-accounts', (req, res) => {
    const { adminAccounts } = req.body;
    if (Array.isArray(adminAccounts)) {
      fs.writeFileSync(ADMIN_ACCOUNTS_FILE, JSON.stringify(adminAccounts, null, 2));
      broadcastRealtimeUpdate('admin_accounts_updated', adminAccounts);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'adminAccounts must be array' });
    }
  });

  // Donations Endpoints
  const DONATIONS_FILE = path.join(DATA_DIR, 'donations.json');

  app.get('/api/donations', (req, res) => {
    if (fs.existsSync(DONATIONS_FILE)) {
      try { return res.json(JSON.parse(fs.readFileSync(DONATIONS_FILE, 'utf-8'))); } catch (e) {}
    }
    res.json([]);
  });

  app.post('/api/donations', (req, res) => {
    const { donation } = req.body;
    if (!donation) return res.status(400).json({ error: 'donation object required' });

    let current: any[] = [];
    if (fs.existsSync(DONATIONS_FILE)) {
      try { current = JSON.parse(fs.readFileSync(DONATIONS_FILE, 'utf-8')); } catch (e) {}
    }
    current.unshift(donation);
    fs.writeFileSync(DONATIONS_FILE, JSON.stringify(current, null, 2));
    broadcastRealtimeUpdate('donations_updated', { donation, allDonations: current });
    res.json({ success: true, donation });
  });

  // Vite Middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
