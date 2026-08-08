(function () {
  'use strict';

  const GUEST_SESSION_KEY = 'rufuf_majlis_guest_v1';
  const HOST_ROOM_PREFIX = 'rufuf_majlis_host_room_v1:';
  const AVATARS = ['🦊', '🐯', '🦁', '🐼', '🐨', '🐸', '🐵', '🐧', '🦄', '🐺', '🐰', '🐙'];
  const ROOM_ERROR_MESSAGES = {
    ROOM_NOT_FOUND: 'رقم الغرفة غير صحيح أو انتهت الغرفة.',
    ROOM_CLOSED: 'هذه الغرفة أُغلقت أو انتهى وقتها.',
    ROOM_FULL: 'الغرفة ممتلئة حالياً.',
    PLAYER_NAME_TAKEN: 'هذا الاسم مستخدم داخل الغرفة، اختر اسماً آخر.',
    INVALID_PLAYER_NAME: 'اكتب اسماً من 1 إلى 20 حرفاً.',
    INVALID_AVATAR: 'اختر أفاتاراً من القائمة.',
    INVALID_GUEST_TOKEN: 'تعذّر إنشاء هوية الضيف. حدّث الصفحة وحاول مجدداً.',
    ROOM_ACCESS_DENIED: 'انتهت صلاحية دخولك لهذه الغرفة.',
    HOST_NOT_AUTHORIZED: 'لا يمكن إنشاء الغرفة من هذا الحساب.',
    ROOM_CODE_UNAVAILABLE: 'تعذّر توليد رقم غرفة الآن. حاول مرة أخرى.'
  };

  let config = null;
  let hostRoom = null;
  let guestSession = null;
  let roomPlayers = [];
  let onlinePlayerIds = new Set();
  let realtimeClient = null;
  let realtimeChannel = null;
  let realtimeRole = null;
  let selectedAvatar = AVATARS[0];
  let checkedRoomCode = '';
  let lastHostSnapshot = null;
  let snapshotPersistTimer = null;
  let refreshPlayersTimer = null;
  let lastBuzzAt = 0;
  let hostRoomCreationPromise = null;
  const hostBuzzTimes = new Map();

  function el(id) { return document.getElementById(id); }

  function configure(nextConfig) {
    config = nextConfig;
    renderAvatarChoices();
    bindEntryInputs();
    const urlCode = new URLSearchParams(location.search).get('room');
    if (/^[0-9]{6}$/.test(urlCode || '')) {
      el('guest-room-code').value = urlCode;
      showEntryMode('guest');
    }
  }

  function bindEntryInputs() {
    const roomInput = el('guest-room-code');
    const nameInput = el('guest-player-name');
    if (roomInput && !roomInput.dataset.bound) {
      roomInput.dataset.bound = 'true';
      roomInput.addEventListener('input', () => {
        roomInput.value = roomInput.value.replace(/\D/g, '').slice(0, 6);
        guestMessage('');
      });
      roomInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') checkGuestRoom();
      });
    }
    if (nameInput && !nameInput.dataset.bound) {
      nameInput.dataset.bound = 'true';
      nameInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') joinGuestRoom();
      });
    }
  }

  function showEntryMode(mode) {
    const guest = mode !== 'host';
    el('guest-entry-panel').hidden = !guest;
    el('host-entry-panel').hidden = guest;
    el('entry-tab-guest').classList.toggle('active', guest);
    el('entry-tab-host').classList.toggle('active', !guest);
    el('entry-tab-guest').setAttribute('aria-selected', guest ? 'true' : 'false');
    el('entry-tab-host').setAttribute('aria-selected', guest ? 'false' : 'true');
    if (!guest) setTimeout(() => el('game-username')?.focus(), 0);
    else setTimeout(() => el('guest-room-code')?.focus(), 0);
  }

  function showGuestCodeStep() {
    checkedRoomCode = '';
    el('guest-code-step').hidden = false;
    el('guest-profile-step').hidden = true;
    guestMessage('');
    el('guest-room-code')?.focus();
  }

  function guestMessage(message) {
    ['guest-entry-error', 'guest-entry-error-profile'].forEach(id => {
      const node = el(id);
      if (node) node.textContent = message || '';
    });
  }

  function roomError(error) {
    const source = String(error?.message || error || '');
    const code = Object.keys(ROOM_ERROR_MESSAGES).find(key => source.includes(key));
    return code ? ROOM_ERROR_MESSAGES[code] : 'تعذّر الاتصال بالغرفة. تحقق من الإنترنت وحاول مجدداً.';
  }

  async function publicApi(path, options) {
    if (!config) throw new Error('ROOMS_NOT_CONFIGURED');
    const opt = options || {};
    const headers = Object.assign({
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json'
    }, opt.headers || {});
    const response = await fetch(config.url + path, Object.assign({}, opt, { headers }));
    const raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (error) { data = raw; }
    if (!response.ok) {
      throw new Error(data?.message || data?.error_description || data?.error || `HTTP ${response.status}`);
    }
    return data;
  }

  async function guestRpc(name, body) {
    return publicApi(`/rest/v1/rpc/${name}`, {
      method: 'POST',
      body: JSON.stringify(body || {})
    });
  }

  function setBusy(button, busy, busyLabel, normalLabel) {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? busyLabel : normalLabel;
  }

  async function checkGuestRoom() {
    const code = (el('guest-room-code')?.value || '').replace(/\D/g, '').slice(0, 6);
    const button = el('guest-room-check-btn');
    if (!/^[0-9]{6}$/.test(code)) {
      guestMessage('اكتب رقم الغرفة المكوّن من 6 أرقام.');
      return;
    }
    setBusy(button, true, 'جاري البحث…', 'دخول');
    guestMessage('');
    try {
      const rows = await guestRpc('check_majlis_room', { p_room_code: code });
      if (!rows?.length) throw new Error('ROOM_NOT_FOUND');
      checkedRoomCode = code;
      el('guest-confirmed-code').textContent = code;
      el('guest-code-step').hidden = true;
      el('guest-profile-step').hidden = false;
      setTimeout(() => el('guest-player-name')?.focus(), 0);
    } catch (error) {
      guestMessage(roomError(error));
    } finally {
      setBusy(button, false, 'جاري البحث…', 'دخول');
    }
  }

  function renderAvatarChoices() {
    const grid = el('guest-avatar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    AVATARS.forEach(avatar => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'avatar-choice' + (avatar === selectedAvatar ? ' selected' : '');
      button.textContent = avatar;
      button.setAttribute('aria-label', `اختيار ${avatar}`);
      button.setAttribute('aria-pressed', avatar === selectedAvatar ? 'true' : 'false');
      button.addEventListener('click', () => {
        selectedAvatar = avatar;
        renderAvatarChoices();
      });
      grid.appendChild(button);
    });
  }

  function randomGuestToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  async function joinGuestRoom() {
    const code = checkedRoomCode || (el('guest-room-code')?.value || '').trim();
    const name = (el('guest-player-name')?.value || '').trim();
    const button = el('guest-room-join-btn');
    if (!/^[0-9]{6}$/.test(code)) {
      showGuestCodeStep();
      guestMessage('اكتب رقم الغرفة أولاً.');
      return;
    }
    if (!name || name.length > 20) {
      guestMessage('اكتب اسماً من 1 إلى 20 حرفاً.');
      return;
    }

    let token = randomGuestToken();
    try {
      const previous = JSON.parse(localStorage.getItem(GUEST_SESSION_KEY) || 'null');
      if (previous?.roomCode === code && previous?.token) token = previous.token;
    } catch (error) { /* ابدأ هوية ضيف جديدة */ }

    setBusy(button, true, 'جاري الانضمام…', 'انضم للغرفة');
    guestMessage('');
    try {
      const rows = await guestRpc('join_majlis_room', {
        p_room_code: code,
        p_display_name: name,
        p_avatar: selectedAvatar,
        p_guest_token: token
      });
      const row = rows?.[0];
      if (!row) throw new Error('ROOM_NOT_FOUND');
      guestSession = {
        roomId: row.room_id,
        roomCode: row.room_code,
        roomStatus: row.room_status,
        topic: row.realtime_topic,
        playerId: row.player_id,
        name: row.display_name,
        avatar: row.avatar,
        token,
        expiresAt: row.expires_at
      };
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestSession));
      openGuestApp(row.public_state);
    } catch (error) {
      guestMessage(roomError(error));
    } finally {
      setBusy(button, false, 'جاري الانضمام…', 'انضم للغرفة');
    }
  }

  async function restoreGuestSession() {
    try {
      guestSession = JSON.parse(localStorage.getItem(GUEST_SESSION_KEY) || 'null');
    } catch (error) {
      guestSession = null;
    }
    if (!guestSession?.roomId || !guestSession?.roomCode || !guestSession?.token) return false;
    const requestedCode = new URLSearchParams(location.search).get('room');
    if (/^[0-9]{6}$/.test(requestedCode || '') && requestedCode !== guestSession.roomCode) {
      guestRpc('leave_majlis_room', {
        p_room_id: guestSession.roomId,
        p_guest_token: guestSession.token
      }).catch(() => {});
      localStorage.removeItem(GUEST_SESSION_KEY);
      guestSession = null;
      return false;
    }
    try {
      const rows = await guestRpc('join_majlis_room', {
        p_room_code: guestSession.roomCode,
        p_display_name: guestSession.name,
        p_avatar: guestSession.avatar,
        p_guest_token: guestSession.token
      });
      const row = rows?.[0];
      if (!row) throw new Error('ROOM_NOT_FOUND');
      Object.assign(guestSession, {
        roomStatus: row.room_status,
        topic: row.realtime_topic,
        expiresAt: row.expires_at,
        playerId: row.player_id
      });
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestSession));
      openGuestApp(row.public_state);
      return true;
    } catch (error) {
      localStorage.removeItem(GUEST_SESSION_KEY);
      guestSession = null;
      guestMessage(roomError(error));
      return false;
    }
  }

  function openGuestApp(snapshot) {
    el('auth-gate').hidden = true;
    el('majlis-app').hidden = true;
    el('guest-app').hidden = false;
    el('guest-room-number').textContent = guestSession.roomCode;
    el('guest-profile-avatar').textContent = guestSession.avatar;
    el('guest-profile-name').textContent = guestSession.name;
    paintGuestSnapshot(snapshot && Object.keys(snapshot).length ? snapshot : null);
    connectRealtime('guest');
    refreshRoomPlayers();
  }

  async function leaveGuestRoom() {
    const leaving = guestSession;
    if (leaving) {
      await sendEventBriefly('guest_left', { player_id: leaving.playerId });
      guestRpc('leave_majlis_room', {
        p_room_id: leaving.roomId,
        p_guest_token: leaving.token
      }).catch(() => {});
    }
    disconnectRealtime();
    localStorage.removeItem(GUEST_SESSION_KEY);
    guestSession = null;
    roomPlayers = [];
    el('guest-app').hidden = true;
    el('auth-gate').hidden = false;
    showEntryMode('guest');
    showGuestCodeStep();
    history.replaceState({}, '', location.pathname);
  }

  function hostStorageKey() {
    const userId = config?.getHostAuth?.()?.user?.id;
    return userId ? HOST_ROOM_PREFIX + userId : null;
  }

  function saveHostRoom() {
    const key = hostStorageKey();
    if (!key) return;
    if (hostRoom) localStorage.setItem(key, JSON.stringify(hostRoom));
    else localStorage.removeItem(key);
  }

  async function restoreHostRoom() {
    const key = hostStorageKey();
    if (!key) return false;
    try { hostRoom = JSON.parse(localStorage.getItem(key) || 'null'); }
    catch (error) { hostRoom = null; }
    if (!hostRoom?.roomId) return false;
    try {
      const rows = await config.hostApi('/rest/v1/rpc/get_majlis_room_snapshot', {
        method: 'POST',
        body: JSON.stringify({ p_room_id: hostRoom.roomId, p_guest_token: null })
      });
      const row = rows?.[0];
      if (!row || !['lobby', 'playing'].includes(row.room_status)) throw new Error('ROOM_CLOSED');
      hostRoom = {
        roomId: row.room_id,
        roomCode: row.room_code,
        roomStatus: row.room_status,
        topic: row.realtime_topic,
        expiresAt: row.expires_at
      };
      lastHostSnapshot = row.public_state && Object.keys(row.public_state).length
        ? row.public_state
        : null;
      saveHostRoom();
      renderHostRoom();
      connectRealtime('host');
      refreshRoomPlayers();
      return true;
    } catch (error) {
      hostRoom = null;
      saveHostRoom();
      renderHostRoom();
      return false;
    }
  }

  async function createHostRoomImpl() {
    if (hostRoom) await sendEventBriefly('room_closed', {});
    disconnectRealtime();
    const panel = el('host-room-panel');
    if (panel) panel.hidden = false;
    if (el('host-room-code')) el('host-room-code').textContent = '••••••';
    setHostRoomStatus('جاري إنشاء رقم الغرفة…', 'loading');
    try {
      const rows = await config.hostApi('/rest/v1/rpc/create_majlis_room', {
        method: 'POST',
        body: '{}'
      });
      const row = rows?.[0];
      if (!row) throw new Error('ROOM_CODE_UNAVAILABLE');
      hostRoom = {
        roomId: row.room_id,
        roomCode: row.room_code,
        roomStatus: row.room_status,
        topic: row.realtime_topic,
        expiresAt: row.expires_at
      };
      roomPlayers = [];
      onlinePlayerIds = new Set();
      hostBuzzTimes.clear();
      lastHostSnapshot = null;
      saveHostRoom();
      renderHostRoom();
      connectRealtime('host');
      return hostRoom;
    } catch (error) {
      hostRoom = null;
      saveHostRoom();
      renderHostRoom();
      if (panel) panel.hidden = false;
      if (el('host-room-code')) el('host-room-code').textContent = '—';
      roomPlayers = [];
      renderRoomPlayers();
      setHostRoomStatus(roomError(error), 'error');
      throw error;
    }
  }

  function createHostRoom() {
    if (!hostRoomCreationPromise) {
      hostRoomCreationPromise = createHostRoomImpl()
        .finally(() => { hostRoomCreationPromise = null; });
    }
    return hostRoomCreationPromise;
  }

  async function ensureHostRoom() {
    return hostRoom || createHostRoom();
  }

  function renderHostRoom() {
    const panel = el('host-room-panel');
    if (!panel) return;
    panel.hidden = !hostRoom;
    if (!hostRoom) return;
    el('host-room-code').textContent = hostRoom.roomCode;
    const mobileTitle = el('mobile-room-title');
    if (mobileTitle) mobileTitle.textContent = `مجلس روم #${hostRoom.roomCode}`;
    setHostRoomStatus(
      hostRoom.roomStatus === 'playing' ? 'اللعبة شغّالة · دخول اللاعبين مفتوح' : 'بانتظار انضمام اللاعبين',
      'ok'
    );
    renderRoomPlayers();
  }

  function setHostRoomStatus(message, type) {
    const node = el('host-room-status');
    if (!node) return;
    node.textContent = message;
    node.dataset.state = type || '';
  }

  async function copyJoinLink() {
    if (!hostRoom) return;
    const link = `${location.origin}${location.pathname}?room=${hostRoom.roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      config.toast?.('نُسخ رابط دخول اللاعبين', 'ok');
    } catch (error) {
      window.prompt('انسخ رابط دخول اللاعبين:', link);
    }
  }

  async function closeHostRoom() {
    if (!hostRoom) return;
    const closing = hostRoom;
    await sendEventBriefly('room_closed', {});
    hostRoom = null;
    saveHostRoom();
    renderHostRoom();
    disconnectRealtime();
    try {
      await config.hostApi('/rest/v1/rpc/close_majlis_room', {
        method: 'POST',
        body: JSON.stringify({ p_room_id: closing.roomId })
      });
    } catch (error) {
      console.warn('تعذّر إغلاق الغرفة في الخادم', error);
    }
  }

  function hasHostRoom() { return Boolean(hostRoom); }

  async function updateHostRoom(status, snapshot, immediate) {
    if (!hostRoom) return;
    hostRoom.roomStatus = status;
    saveHostRoom();
    renderHostRoom();
    const update = async () => {
      if (!hostRoom) return;
      try {
        await config.hostApi('/rest/v1/rpc/update_majlis_room', {
          method: 'POST',
          body: JSON.stringify({
            p_room_id: hostRoom.roomId,
            p_room_status: status,
            p_public_state: snapshot || {}
          })
        });
      } catch (error) {
        setHostRoomStatus('المزامنة متوقفة مؤقتاً؛ نحاول إعادة الاتصال…', 'error');
      }
    };
    clearTimeout(snapshotPersistTimer);
    if (immediate) await update();
    else snapshotPersistTimer = setTimeout(update, 1400);
  }

  async function markHostPlaying(snapshot) {
    lastHostSnapshot = snapshot || lastHostSnapshot;
    await updateHostRoom('playing', lastHostSnapshot, true);
    sendEvent('room_state', lastHostSnapshot || {});
  }

  function markHostFinished(snapshot) {
    lastHostSnapshot = snapshot || lastHostSnapshot;
    updateHostRoom('finished', lastHostSnapshot, true);
    sendEvent('room_finished', lastHostSnapshot || {});
  }

  function syncHostState(snapshot) {
    if (!hostRoom || realtimeRole !== 'host' || !snapshot) return;
    lastHostSnapshot = snapshot;
    hostRoom.roomStatus = 'playing';
    sendEvent('room_state', snapshot);
    updateHostRoom('playing', snapshot, false);
  }

  function connectRealtime(role) {
    disconnectRealtime();
    const RealtimeClient = window.MajlisRealtime?.RealtimeClient;
    const room = role === 'host' ? hostRoom : guestSession;
    if (!RealtimeClient || !room?.topic) {
      if (role === 'host') setHostRoomStatus('تعذّر تشغيل الاتصال اللحظي.', 'error');
      return;
    }
    realtimeRole = role;
    realtimeClient = new RealtimeClient(`${config.url}/realtime/v1`, {
      params: { apikey: config.key },
      heartbeatIntervalMs: 25000,
      timeout: 15000
    });
    realtimeClient.connect();
    const presenceKey = role === 'host'
      ? `host-${config.getHostAuth?.()?.user?.id || 'host'}`
      : `player-${guestSession.playerId}`;
    realtimeChannel = realtimeClient.channel(room.topic, {
      config: {
        private: false,
        broadcast: { ack: true, self: false },
        presence: { key: presenceKey }
      }
    });

    realtimeChannel
      .on('broadcast', { event: 'room_state' }, message => onRoomState(message.payload))
      .on('broadcast', { event: 'request_state' }, () => {
        if (realtimeRole === 'host' && lastHostSnapshot) sendEvent('room_state', lastHostSnapshot);
      })
      .on('broadcast', { event: 'player_joined' }, () => {
        if (realtimeRole === 'host') {
          refreshRoomPlayers();
          if (lastHostSnapshot) sendEvent('room_state', lastHostSnapshot);
        }
      })
      .on('broadcast', { event: 'guest_left' }, () => refreshRoomPlayers())
      .on('broadcast', { event: 'buzzer' }, message => onRemoteBuzzer(message.payload))
      .on('broadcast', { event: 'emoji' }, message => onRemoteEmoji(message.payload))
      .on('broadcast', { event: 'room_finished' }, message => onRoomFinished(message.payload))
      .on('broadcast', { event: 'room_closed' }, () => onRoomClosed())
      .on('presence', { event: 'sync' }, onPresenceSync)
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          if (role === 'host') {
            setHostRoomStatus(
              hostRoom?.roomStatus === 'playing' ? 'اللعبة شغّالة · دخول اللاعبين مفتوح' : 'الغرفة جاهزة · بانتظار اللاعبين',
              'ok'
            );
            await realtimeChannel.track({ role: 'host', online_at: new Date().toISOString() });
          } else if (guestSession) {
            el('guest-connection-status').textContent = 'متصل بالغرفة';
            await realtimeChannel.track({
              role: 'player',
              player_id: guestSession.playerId,
              name: guestSession.name,
              avatar: guestSession.avatar,
              online_at: new Date().toISOString()
            });
            sendEvent('player_joined', { player_id: guestSession.playerId });
            sendEvent('request_state', { player_id: guestSession.playerId });
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (role === 'host') setHostRoomStatus('انقطع الاتصال اللحظي؛ جاري المحاولة…', 'error');
          else if (el('guest-connection-status')) el('guest-connection-status').textContent = 'جاري إعادة الاتصال…';
        }
      });
  }

  function disconnectRealtime() {
    clearTimeout(refreshPlayersTimer);
    clearTimeout(snapshotPersistTimer);
    onlinePlayerIds = new Set();
    if (realtimeChannel) {
      try { realtimeChannel.unsubscribe(); } catch (error) { /* تجاهل */ }
    }
    if (realtimeClient) {
      try { realtimeClient.disconnect(); } catch (error) { /* تجاهل */ }
    }
    realtimeChannel = null;
    realtimeClient = null;
    realtimeRole = null;
  }

  function sendEvent(event, payload) {
    if (!realtimeChannel) return Promise.resolve('not_connected');
    return realtimeChannel.send({
      type: 'broadcast',
      event,
      payload: payload || {}
    }).catch(() => 'error');
  }

  function sendEventBriefly(event, payload) {
    return Promise.race([
      sendEvent(event, payload),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 500))
    ]);
  }

  function onRoomState(snapshot) {
    if (realtimeRole !== 'guest' || !guestSession) return;
    guestSession.roomStatus = 'playing';
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestSession));
    paintGuestSnapshot(snapshot);
  }

  function onRoomFinished(snapshot) {
    if (realtimeRole !== 'guest') return;
    paintGuestSnapshot(snapshot);
    el('guest-room-phase').textContent = 'انتهت الجولة 🏁';
    el('guest-buzzer-btn').disabled = true;
  }

  function onRoomClosed() {
    if (realtimeRole !== 'guest') return;
    el('guest-room-phase').textContent = 'أغلق المضيف الغرفة';
    el('guest-buzzer-btn').disabled = true;
    el('guest-connection-status').textContent = 'الغرفة مغلقة';
    localStorage.removeItem(GUEST_SESSION_KEY);
  }

  async function onPresenceSync() {
    if (!realtimeChannel) return;
    const state = realtimeChannel.presenceState();
    const presences = Object.values(state).flat();
    onlinePlayerIds = new Set(
      presences.filter(item => item.role === 'player').map(item => item.player_id)
    );
    renderRoomPlayers();
    clearTimeout(refreshPlayersTimer);
    refreshPlayersTimer = setTimeout(refreshRoomPlayers, 150);
  }

  function onRemoteBuzzer(payload) {
    if (realtimeRole !== 'host') return;
    const player = roomPlayers.find(item => item.player_id === payload?.player_id);
    if (!player) return;
    const now = Date.now();
    if (now - Number(hostBuzzTimes.get(player.player_id) || 0) < 1200) return;
    hostBuzzTimes.set(player.player_id, now);
    config.onHostBuzzer?.(player);
  }

  function onRemoteEmoji(payload) {
    if (realtimeRole !== 'host') return;
    const player = roomPlayers.find(item => item.player_id === payload?.player_id);
    if (!player || !['🐪', '🌴', '⚽', '🔥', '🎬'].includes(payload?.emoji)) return;
    config.onHostEmoji?.(payload.emoji, player);
  }

  async function refreshRoomPlayers() {
    const room = realtimeRole === 'host' ? hostRoom : guestSession;
    if (!room?.roomId) return;
    try {
      const rows = realtimeRole === 'host'
        ? await config.hostApi('/rest/v1/rpc/list_majlis_room_players', {
            method: 'POST',
            body: JSON.stringify({ p_room_id: room.roomId, p_guest_token: null })
          })
        : await guestRpc('list_majlis_room_players', {
            p_room_id: room.roomId,
            p_guest_token: guestSession.token
          });
      roomPlayers = rows || [];
      renderRoomPlayers();
    } catch (error) {
      console.warn('تعذّر تحديث قائمة اللاعبين', error);
    }
  }

  function renderRoomPlayers() {
    const targets = [el('host-room-players'), el('guest-room-players')].filter(Boolean);
    targets.forEach(target => {
      target.innerHTML = '';
      roomPlayers.forEach(player => {
        const card = document.createElement('div');
        card.className = 'room-player-card';
        const avatar = document.createElement('span');
        avatar.className = 'room-player-avatar';
        avatar.textContent = player.avatar;
        const name = document.createElement('span');
        name.textContent = player.display_name;
        const dot = document.createElement('span');
        const online = onlinePlayerIds.has(player.player_id);
        dot.className = 'room-online-dot' + (online ? ' online' : '');
        dot.title = online ? 'متصل الآن' : 'غير متصل';
        card.append(avatar, name, dot);
        target.appendChild(card);
      });
      if (!roomPlayers.length) {
        const empty = document.createElement('div');
        empty.className = 'room-players-empty';
        empty.textContent = 'بانتظار أول لاعب…';
        target.appendChild(empty);
      }
    });
    const hostCount = el('host-player-count');
    const guestCount = el('guest-player-count');
    if (hostCount) hostCount.textContent = String(roomPlayers.length);
    if (guestCount) guestCount.textContent = String(roomPlayers.length);
  }

  function paintGuestSnapshot(snapshot) {
    const isPlaying = Boolean(snapshot && (snapshot.nameA || snapshot.nameB));
    el('guest-lobby-panel').hidden = isPlaying;
    el('guest-play-panel').hidden = !isPlaying;
    if (!isPlaying) {
      el('guest-room-phase').textContent = guestSession?.roomStatus === 'playing'
        ? 'اللعبة شغّالة · بانتظار مزامنة المضيف'
        : 'بانتظار المضيف يبدأ اللعبة';
      return;
    }
    el('guest-room-phase').textContent = snapshot.open ? 'السؤال مفتوح الآن' : 'استعد للسؤال القادم';
    el('guest-team-a-name').textContent = snapshot.nameA || 'الفريق الأول';
    el('guest-team-b-name').textContent = snapshot.nameB || 'الفريق الثاني';
    el('guest-team-a-score').textContent = Number(snapshot.scoreA || 0);
    el('guest-team-b-score').textContent = Number(snapshot.scoreB || 0);
    el('guest-question-wrap').hidden = !snapshot.open;
    el('guest-question-idle').hidden = Boolean(snapshot.open);
    el('guest-buzzer-btn').disabled = !snapshot.open;
    if (snapshot.open) {
      el('guest-question-category').textContent = snapshot.category || '';
      el('guest-question-text').textContent = snapshot.text || '';
      el('guest-question-timer').textContent = snapshot.timer || '';
    }
  }

  function guestBuzz() {
    if (!guestSession || !realtimeChannel) return;
    const now = Date.now();
    if (now - lastBuzzAt < 1500) return;
    lastBuzzAt = now;
    sendEvent('buzzer', { player_id: guestSession.playerId, sent_at: new Date().toISOString() });
    const button = el('guest-buzzer-btn');
    button.classList.add('buzzed');
    button.textContent = 'تم! 🚨';
    setTimeout(() => {
      button.classList.remove('buzzed');
      button.textContent = 'إجابة!';
    }, 1100);
  }

  function guestEmoji(emoji) {
    if (!guestSession || !['🐪', '🌴', '⚽', '🔥', '🎬'].includes(emoji)) return;
    sendEvent('emoji', { player_id: guestSession.playerId, emoji });
    config.toast?.(`تم إرسال ${emoji}`, 'ok');
  }

  window.MajlisRooms = {
    configure,
    showEntryMode,
    showGuestCodeStep,
    checkGuestRoom,
    joinGuestRoom,
    restoreGuestSession,
    leaveGuestRoom,
    restoreHostRoom,
    createHostRoom,
    ensureHostRoom,
    closeHostRoom,
    hasHostRoom,
    markHostPlaying,
    markHostFinished,
    syncHostState,
    copyJoinLink,
    guestBuzz,
    guestEmoji,
    disconnectRealtime
  };
})();
