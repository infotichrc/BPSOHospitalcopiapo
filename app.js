(() => {
  if (window.__BPSO_APP_LOADED__) return;
  window.__BPSO_APP_LOADED__ = true;

  // =====================================================
  // CONFIGURACIÓN SUPABASE
  // =====================================================
  // Leo: cuando tengas el Supabase nuevo, reemplaza SOLO estas 2 líneas.
  // 1) Project URL: Supabase > Project Settings > API > Project URL
  // 2) Publishable key / anon key: Supabase > Project Settings > API > Project API keys
  const SUPABASE_URL = 'https://wmatnccgvbrfebwbymhq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_QbpQw67BT0bNOpjIv9Wp1A_jpMAhm-m';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase CDN no cargó correctamente.');
    return;
  }


  const { createClient } = window.supabase;
  let supabaseClient;
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (error) {
    console.error('Configura SUPABASE_URL y SUPABASE_KEY en app.js antes de probar el sitio.', error);
    return;
  }

  const state = {
    session: null,
    profile: null,
    news: [],
    trainings: [],
    guides: [],
    adminNews: [],
    adminTrainings: [],
    adminGuides: []
  };

  const els = {
    menuToggle: document.getElementById('menu-toggle'),
    siteNav: document.getElementById('site-nav'),
    projectUrlView: document.getElementById('project-url-view'),
    loginForm: document.getElementById('login-form'),
    logoutBtn: document.getElementById('logout-btn'),
    forgotPasswordBtn: document.getElementById('forgot-password-btn'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    passwordToggle: document.getElementById('toggle-password'),
    adminPanel: document.getElementById('admin-panel'),
    sessionBadge: document.getElementById('session-badge'),
    alertBox: document.getElementById('alert-box'),
    newsForm: document.getElementById('news-form'),
    trainingForm: document.getElementById('training-form'),
    guideForm: document.getElementById('guide-form'),
    adminNewsList: document.getElementById('admin-news-list'),
    adminTrainingsList: document.getElementById('admin-trainings-list'),
    adminGuidesList: document.getElementById('admin-guides-list'),
    newsGrid: document.getElementById('news-grid'),
    newsFeatured: document.getElementById('news-featured'),
    newsOlderHead: document.querySelector('.news-older-head'),
    trainingsGrid: document.getElementById('trainings-grid'),
    guidesGrid: document.getElementById('guides-grid'),
    newsEmpty: document.getElementById('news-empty'),
    trainingsEmpty: document.getElementById('trainings-empty'),
    guidesEmpty: document.getElementById('guides-empty'),
    homeNewsSection: document.getElementById('home-news-section'),
    homeNewsFeatured: document.getElementById('home-news-featured'),
    homeTrainingsSection: document.getElementById('home-trainings-section'),
    homeTrainingFeatured: document.getElementById('home-training-featured'),
    modal: document.getElementById('content-modal'),
    modalContent: document.getElementById('modal-content')
  };

  const CONTENT_TABLES = {
    news: 'news',
    training: 'trainings',
    trainings: 'trainings',
    guide: 'guides',
    guides: 'guides'
  };

  const PUBLICATION_MESSAGES = {
    news: {
      draft: 'Noticia guardada como borrador.',
      published: 'Noticia publicada.'
    },
    training: {
      draft: 'Capacitación guardada como borrador.',
      published: 'Capacitación publicada.'
    },
    guide: {
      draft: 'Guía guardada como borrador.',
      published: 'Guía publicada.'
    },
    content: {
      draft: 'Contenido pasado a borrador.',
      published: 'Contenido publicado.'
    }
  };

  function initMenu() {
    if (!els.menuToggle || !els.siteNav) return;
    els.menuToggle.addEventListener('click', () => els.siteNav.classList.toggle('open'));
    const current = window.location.pathname.split('/').pop() || 'index.html';
    els.siteNav.querySelectorAll('a').forEach((link) => {
      const target = link.getAttribute('href');
      if (target === current || (current === '' && target === 'index.html')) link.classList.add('active');
      link.addEventListener('click', () => els.siteNav.classList.remove('open'));
    });
  }

  function showAlert(message, type = 'success', duration = 3000) {
    if (!els.alertBox) return;
    els.alertBox.textContent = message;
    els.alertBox.className = `alert ${type}`;
    els.alertBox.classList.remove('hidden');
    clearTimeout(showAlert._timer);
    showAlert._timer = setTimeout(() => els.alertBox.classList.add('hidden'), duration);
  }

  function showQueryAlert() {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (!error) return;
    const messages = {
      'sin-sesion': 'Debes iniciar sesión para ingresar al panel de publicaciones.',
      'sin-permisos': 'Tu usuario no tiene permisos activos para administrar publicaciones.',
      'perfil-no-encontrado': 'Tu cuenta existe en Auth, pero no tiene perfil creado en la tabla profiles.'
    };
    showAlert(messages[error] || 'No fue posible validar el acceso.', 'error');
  }

  function formatDate(dateString) {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(date);
  }

  function escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function makeSlug(text) {
    return text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  function sanitizeFileName(fileName) {
    return fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  function getSummary(item, limit = 180) {
    const raw = item.summary || item.content || '';
    return raw.length > limit ? `${raw.slice(0, limit).trim()}...` : raw;
  }

  function getContent(item) {
    return item.content || item.summary || 'Sin contenido disponible.';
  }

  function toggleEmptyState(element, emptyElement, hasItems) {
    if (emptyElement) emptyElement.classList.toggle('show', !hasItems);
    if (element) element.style.display = hasItems ? 'grid' : 'none';
  }

  function getCurrentPage() {
    return document.body?.dataset?.page || '';
  }

  function isProtectedPage() {
    return document.body?.dataset?.protected === 'true';
  }

  function getSafeRedirectTarget() {
    const params = new URLSearchParams(window.location.search);
    const fallback = 'publicacion.html';
    const target = params.get('redirect') || fallback;
    if (/^(https?:)?\/\//i.test(target)) return fallback;
    if (target.includes('..')) return fallback;
    if (!/^[a-zA-Z0-9_.\/#?=&%-]+$/.test(target)) return fallback;
    return target;
  }

  function redirectToLogin(reason = 'sin-sesion') {
    const current = window.location.pathname.split('/').pop() || 'publicacion.html';
    window.location.replace(`login.html?redirect=${encodeURIComponent(current)}&error=${encodeURIComponent(reason)}`);
  }

  function roleLabel(role) {
    const labels = {
      admin: 'Administrador',
      editor: 'Editor'
    };
    return labels[role] || 'Sin rol';
  }

  function statusLabel(status) {
    const labels = {
      draft: 'Borrador',
      published: 'Publicado',
      archived: 'Archivado'
    };
    return labels[status] || 'Sin estado';
  }

  function normalizeStatus(status) {
    return status === 'published' ? 'published' : 'draft';
  }

  function normalizeContentMessageType(type) {
    if (type === 'news') return 'news';
    if (type === 'training' || type === 'trainings') return 'training';
    if (type === 'guide' || type === 'guides') return 'guide';
    return 'content';
  }

  function getPublicationMessage(type, status) {
    const messageType = normalizeContentMessageType(type);
    const safeStatus = normalizeStatus(status);
    return PUBLICATION_MESSAGES[messageType]?.[safeStatus] || PUBLICATION_MESSAGES.content[safeStatus];
  }

  function getSubmittedStatus(event, fallbackStatus = 'draft') {
    return normalizeStatus(event?.submitter?.value || fallbackStatus);
  }

  function userCanManage(profile) {
    return Boolean(profile?.is_active && ['admin', 'editor'].includes(profile.role));
  }

  async function loadProfileForSession(session) {
    if (!session?.user?.id) return null;
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('No se pudo cargar el perfil:', error);
      return null;
    }

    return data;
  }

  function setSessionUI(session, profile) {
    const hasSession = Boolean(session?.user);
    state.session = session || null;
    state.profile = profile || null;

    if (els.sessionBadge) {
      if (profile?.full_name) {
        els.sessionBadge.textContent = `${profile.full_name} · ${roleLabel(profile.role)}`;
      } else if (hasSession) {
        els.sessionBadge.textContent = 'Sesión activa · Perfil pendiente';
      } else {
        els.sessionBadge.textContent = 'Sin sesión';
      }
    }

    if (els.adminPanel) els.adminPanel.classList.toggle('hidden', !userCanManage(profile));
    if (els.logoutBtn) els.logoutBtn.classList.toggle('hidden', !hasSession);
  }

  async function applyAuthState(session) {
    let profile = null;

    if (session?.user) {
      profile = await loadProfileForSession(session);
    }

    setSessionUI(session, profile);

    const page = getCurrentPage();

    if (isProtectedPage()) {
      if (!session?.user) {
        redirectToLogin('sin-sesion');
        return false;
      }

      if (!profile) {
        await supabaseClient.auth.signOut();
        redirectToLogin('perfil-no-encontrado');
        return false;
      }

      if (!userCanManage(profile)) {
        await supabaseClient.auth.signOut();
        redirectToLogin('sin-permisos');
        return false;
      }
    }

    if (page === 'login' && session?.user && userCanManage(profile)) {
      window.location.replace(getSafeRedirectTarget());
      return true;
    }

    return true;
  }

  async function getAuthenticatedUserOrThrow() {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) throw new Error('No hay usuario autenticado.');

    const profile = state.profile || await loadProfileForSession({ user: userData.user });
    if (!userCanManage(profile)) throw new Error('Tu usuario no tiene permisos para publicar.');

    state.profile = profile;
    return { user: userData.user, profile };
  }

  function articleCard(item, type = 'news') {
    const date = type === 'training'
      ? formatDate(item.event_date || item.published_at || item.created_at)
      : formatDate(item.published_at || item.created_at);
    const image = item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}">` : '';
    return `
      <article class="card clickable-card" tabindex="0" data-open-item="${type}" data-id="${escapeHtml(item.id)}">
        <div class="card-media">${image}</div>
        <div class="card-body">
          <div class="card-meta">${escapeHtml(date)}</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(getSummary(item))}</p>
        </div>
      </article>`;
  }

  function featuredCard(item, type = 'news') {
    const date = type === 'training'
      ? formatDate(item.event_date || item.published_at || item.created_at)
      : formatDate(item.published_at || item.created_at);
    const image = item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}">` : '';
    const label = type === 'training' ? 'Capacitación destacada' : 'Última noticia publicada';
    return `
      <article class="featured-card" data-open-item="${type}" data-id="${escapeHtml(item.id)}">
        <div class="featured-media">${image}</div>
        <div class="featured-body">
          <div class="card-meta">${escapeHtml(label)} · ${escapeHtml(date)}</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(getSummary(item, 260))}</p>
        </div>
      </article>`;
  }

  function guideCard(item, compact = false) {
    const description = item.description || 'Documento disponible para descarga.';
    const cover = item.cover_image_url
      ? `<img src="${escapeHtml(item.cover_image_url)}" alt="${escapeHtml(item.title)}">`
      : `<span class="guide-placeholder">Guía BPSO</span>`;
    const downloadUrl = item.download_url || item.file_url || '#';

    return `
      <article class="card guide-card${compact ? ' guide-card-compact' : ''}">
        <button class="guide-cover-button" type="button" data-open-item="guide" data-id="${escapeHtml(item.id)}" aria-label="Ver detalle de ${escapeHtml(item.title)}">
          <div class="card-media guide-media">${cover}</div>
        </button>
        <div class="card-body">
          <div class="card-meta">Guía descargable</div>
          <h3>${escapeHtml(item.title)}</h3>
          ${compact ? '' : `<p>${escapeHtml(description)}</p>`}
          <div class="guide-actions"><a class="btn btn-primary" href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener" download>Descargar guía</a></div>
        </div>
      </article>`;
  }

  function findItem(type, id) {
    const source = type === 'training' ? state.trainings : state.news;
    return source.find((item) => String(item.id) === String(id));
  }

  function findGuide(id) {
    return state.guides.find((item) => String(item.id) === String(id));
  }

  function openGuideModal(id) {
    const item = findGuide(id);
    if (!item || !els.modal || !els.modalContent) return;
    const description = item.description || 'Documento disponible para descarga.';
    const downloadUrl = item.download_url || item.file_url || '#';
    els.modalContent.innerHTML = `
      <div class="modal-media modal-guide-media">${item.cover_image_url ? `<img src="${escapeHtml(item.cover_image_url)}" alt="${escapeHtml(item.title)}">` : `<span class="guide-placeholder guide-placeholder-large">Guía BPSO</span>`}</div>
      <div class="modal-body">
        <div class="card-meta">Guía de buenas prácticas</div>
        <h2 id="modal-title">${escapeHtml(item.title)}</h2>
        <div class="modal-text">${escapeHtml(description).replace(/\n/g, '<br>')}</div>
        <div class="modal-actions"><a class="btn btn-primary" href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener" download>Descargar guía</a></div>
      </div>`;
    els.modal.classList.remove('hidden');
    els.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function openModal(type, id) {
    if (type === 'guide') return openGuideModal(id);
    const item = findItem(type, id);
    if (!item || !els.modal || !els.modalContent) return;
    const date = type === 'training'
      ? formatDate(item.event_date || item.published_at || item.created_at)
      : formatDate(item.published_at || item.created_at);
    const label = type === 'training' ? 'Capacitación' : 'Noticia';
    els.modalContent.innerHTML = `
      <div class="modal-media modal-${escapeHtml(type)}-media">${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}">` : ''}</div>
      <div class="modal-body">
        <div class="card-meta">${escapeHtml(label)} · ${escapeHtml(date)}</div>
        <h2 id="modal-title">${escapeHtml(item.title)}</h2>
        ${item.summary ? `<p class="modal-summary">${escapeHtml(item.summary)}</p>` : ''}
        <div class="modal-text">${escapeHtml(getContent(item)).replace(/\n/g, '<br>')}</div>
      </div>`;
    els.modal.classList.remove('hidden');
    els.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    if (!els.modal) return;
    els.modal.classList.add('hidden');
    els.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function bindModalEvents() {
    document.addEventListener('click', (event) => {
      const openTarget = event.target.closest('[data-open-item]');
      if (openTarget) {
        event.preventDefault();
        openModal(openTarget.dataset.openItem, openTarget.dataset.id);
      }
      if (event.target.closest('[data-close-modal]')) closeModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.clickable-card')) {
        event.preventDefault();
        openModal(event.target.dataset.openItem, event.target.dataset.id);
      }
    });
  }

  function renderHomeNews() {
    if (!els.homeNewsSection || !els.homeNewsFeatured) return;
    const latest = state.news[0];
    els.homeNewsSection.classList.toggle('hidden', !latest);
    els.homeNewsFeatured.innerHTML = latest ? featuredCard(latest, 'news') : '';
  }

  function renderHomeTraining() {
    if (!els.homeTrainingsSection || !els.homeTrainingFeatured) return;
    const latest = state.trainings[0];
    els.homeTrainingsSection.classList.toggle('hidden', !latest);
    els.homeTrainingFeatured.innerHTML = latest ? featuredCard(latest, 'training') : '';
  }

  function renderNews() {
    renderHomeNews();
    if (!els.newsGrid && !els.newsFeatured) return;
    toggleEmptyState(els.newsGrid || els.newsFeatured, els.newsEmpty, state.news.length > 0);
    if (!state.news.length) {
      if (els.newsFeatured) els.newsFeatured.innerHTML = '';
      if (els.newsGrid) els.newsGrid.innerHTML = '';
      return;
    }
    const [latest, ...older] = state.news;
    if (els.newsFeatured) els.newsFeatured.innerHTML = featuredCard(latest, 'news');
    if (els.newsGrid) {
      els.newsGrid.innerHTML = older.map((item) => articleCard(item, 'news')).join('');
      els.newsGrid.style.display = older.length ? 'grid' : 'none';
    }
    if (els.newsOlderHead) els.newsOlderHead.classList.toggle('hidden', older.length === 0);
  }

  function renderTrainings() {
    renderHomeTraining();
    toggleEmptyState(els.trainingsGrid, els.trainingsEmpty, state.trainings.length > 0);
    if (!els.trainingsGrid || !state.trainings.length) return;
    els.trainingsGrid.innerHTML = state.trainings.map((item) => articleCard(item, 'training')).join('');
  }

  function renderGuides() {
    toggleEmptyState(els.guidesGrid, els.guidesEmpty, state.guides.length > 0);
    if (!els.guidesGrid || !state.guides.length) return;
    const compact = els.guidesGrid.classList.contains('compact-guides');
    els.guidesGrid.innerHTML = state.guides.map((item) => guideCard(item, compact)).join('');
  }

  function adminRow(item, type) {
    const isPublished = item.status === 'published';
    const nextStatus = isPublished ? 'draft' : 'published';
    const buttonLabel = isPublished ? 'Pasar a borrador' : 'Publicar';
    return `
      <div class="admin-content-row">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${statusLabel(item.status)} · ${escapeHtml(formatDate(item.updated_at || item.created_at))}</small>
        </div>
        <button class="btn btn-outline btn-small" type="button" data-status-action data-content-type="${escapeHtml(type)}" data-id="${escapeHtml(item.id)}" data-next-status="${escapeHtml(nextStatus)}">${escapeHtml(buttonLabel)}</button>
      </div>`;
  }

  function renderAdminList(element, items, type, emptyMessage) {
    if (!element) return;
    element.innerHTML = items.length
      ? items.map((item) => adminRow(item, type)).join('')
      : `<p class="muted-note">${escapeHtml(emptyMessage)}</p>`;
  }

  function renderAdminContent() {
    renderAdminList(els.adminNewsList, state.adminNews, 'news', 'Aún no hay noticias creadas.');
    renderAdminList(els.adminTrainingsList, state.adminTrainings, 'trainings', 'Aún no hay capacitaciones creadas.');
    renderAdminList(els.adminGuidesList, state.adminGuides, 'guides', 'Aún no hay guías creadas.');
  }

  async function createSignedGuideUrl(filePath) {
    if (!filePath) return null;
    const { data, error } = await supabaseClient.storage.from('bpso-guides').createSignedUrl(filePath, 60 * 30);
    if (error) {
      console.warn('No se pudo generar URL firmada para guía:', error.message);
      return null;
    }
    return data?.signedUrl || null;
  }

  async function hydrateGuideDownloadUrls(guides) {
    return Promise.all((guides || []).map(async (guide) => {
      if (!guide.file_path) return guide;
      const signedUrl = await createSignedGuideUrl(guide.file_path);
      return signedUrl ? { ...guide, download_url: signedUrl } : guide;
    }));
  }

  async function fetchNews() {
    const { data, error } = await supabaseClient
      .from('news')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    state.news = data || [];
    renderNews();
  }

  async function fetchTrainings() {
    const { data, error } = await supabaseClient
      .from('trainings')
      .select('*')
      .eq('status', 'published')
      .order('event_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    state.trainings = data || [];
    renderTrainings();
  }

  async function fetchGuides() {
    const { data, error } = await supabaseClient
      .from('guides')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    if (error) throw error;
    state.guides = await hydrateGuideDownloadUrls(data || []);
    renderGuides();
  }

  async function fetchAllPublicData() {
    try {
      await Promise.all([fetchNews(), fetchTrainings(), fetchGuides()]);
    } catch (error) {
      console.error(error);
      showAlert(`Error cargando contenido público: ${error.message}`, 'error');
    }
  }

  async function fetchAdminContent() {
    if (!userCanManage(state.profile)) return;

    try {
      const [newsRes, trainingsRes, guidesRes] = await Promise.all([
        supabaseClient.from('news').select('id,title,status,created_at,updated_at,published_at').order('updated_at', { ascending: false }).limit(20),
        supabaseClient.from('trainings').select('id,title,status,created_at,updated_at,published_at').order('updated_at', { ascending: false }).limit(20),
        supabaseClient.from('guides').select('id,title,status,created_at,updated_at,published_at').order('updated_at', { ascending: false }).limit(20)
      ]);

      if (newsRes.error) throw newsRes.error;
      if (trainingsRes.error) throw trainingsRes.error;
      if (guidesRes.error) throw guidesRes.error;

      state.adminNews = newsRes.data || [];
      state.adminTrainings = trainingsRes.data || [];
      state.adminGuides = guidesRes.data || [];
      renderAdminContent();
    } catch (error) {
      console.error(error);
      showAlert(`Error cargando contenidos del panel: ${error.message}`, 'error');
    }
  }

  async function loginUser(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const profile = await loadProfileForSession(data.session);
    if (!profile) {
      await supabaseClient.auth.signOut();
      throw new Error('La cuenta existe en Auth, pero falta crear su perfil en la tabla profiles.');
    }

    if (!userCanManage(profile)) {
      await supabaseClient.auth.signOut();
      throw new Error('Tu perfil no está activo o no tiene rol admin/editor.');
    }

    setSessionUI(data.session, profile);
    return { ...data, profile };
  }

  async function logoutUser() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    state.profile = null;
  }

  async function sendPasswordRecovery(email) {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://bpso.hospitalcopiapo.cl/reset-password'
    });
    if (error) throw error;
  }

  async function uploadImage(file, folder = 'general') {
    if (!file) return null;
    const fileName = `${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('bpso-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage.from('bpso-images').getPublicUrl(fileName);
    return { path: fileName, url: data.publicUrl };
  }

  async function uploadGuide(file) {
    if (!file) throw new Error('Debes seleccionar un archivo de guía.');
    const fileName = `guides/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('bpso-guides')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage.from('bpso-guides').getPublicUrl(fileName);
    return { path: fileName, url: data.publicUrl };
  }

  function publishedAtForStatus(status) {
    return status === 'published' ? new Date().toISOString() : null;
  }

  async function createNews({ title, summary, content, imageFile, status }) {
    const { user } = await getAuthenticatedUserOrThrow();
    const safeStatus = normalizeStatus(status);
    const image = imageFile ? await uploadImage(imageFile, 'news') : null;
    const payload = {
      title,
      slug: `${makeSlug(title)}-${Date.now()}`,
      summary,
      content,
      image_path: image?.path || null,
      image_url: image?.url || null,
      status: safeStatus,
      published_at: publishedAtForStatus(safeStatus),
      author_id: user.id
    };
    const { error } = await supabaseClient.from('news').insert([payload]);
    if (error) throw error;
    return safeStatus;
  }

  async function createTraining({ title, summary, content, imageFile, eventDate, status }) {
    const { user } = await getAuthenticatedUserOrThrow();
    const safeStatus = normalizeStatus(status);
    const image = imageFile ? await uploadImage(imageFile, 'trainings') : null;
    const payload = {
      title,
      summary,
      content,
      image_path: image?.path || null,
      image_url: image?.url || null,
      event_date: eventDate || null,
      status: safeStatus,
      published_at: publishedAtForStatus(safeStatus),
      author_id: user.id
    };
    const { error } = await supabaseClient.from('trainings').insert([payload]);
    if (error) throw error;
    return safeStatus;
  }

  async function createGuide({ title, description, pdfFile, coverImageFile, status }) {
    const { user } = await getAuthenticatedUserOrThrow();
    const safeStatus = normalizeStatus(status);
    const file = await uploadGuide(pdfFile);
    const coverImage = coverImageFile ? await uploadImage(coverImageFile, 'guides') : null;
    const payload = {
      title,
      description,
      file_path: file.path,
      file_url: file.url,
      cover_image_path: coverImage?.path || null,
      cover_image_url: coverImage?.url || null,
      status: safeStatus,
      published_at: publishedAtForStatus(safeStatus),
      author_id: user.id
    };
    const { error } = await supabaseClient.from('guides').insert([payload]);
    if (error) throw error;
    return safeStatus;
  }

  async function updateContentStatus(type, id, nextStatus) {
    const tableName = CONTENT_TABLES[type];
    if (!tableName) throw new Error('Tipo de contenido no reconocido.');

    const safeStatus = normalizeStatus(nextStatus);
    const payload = {
      status: safeStatus,
      published_at: publishedAtForStatus(safeStatus)
    };

    const { error } = await supabaseClient
      .from(tableName)
      .update(payload)
      .eq('id', id);

    if (error) throw error;
    return safeStatus;
  }

  function setSubmitState(button, loadingText, isLoading) {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = loadingText;
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || 'Guardar';
    }
  }

  function bindEvents() {
    bindModalEvents();

    if (els.passwordToggle && els.loginPassword) {
      els.passwordToggle.addEventListener('click', () => {
        const showPassword = els.loginPassword.type === 'password';
        els.loginPassword.type = showPassword ? 'text' : 'password';
        els.passwordToggle.setAttribute('aria-pressed', String(showPassword));
        els.passwordToggle.setAttribute('aria-label', showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        els.passwordToggle.textContent = showPassword ? '🙈' : '👁';
      });
    }

    if (els.loginForm) {
      els.loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await loginUser((els.loginEmail?.value || '').trim(), els.loginPassword?.value || '');
          showAlert('Sesión iniciada correctamente.');
          window.location.href = getSafeRedirectTarget();
        } catch (error) {
          console.error(error);
          showAlert(`Error al iniciar sesión: ${error.message}`, 'error');
        }
      });
    }

    if (els.logoutBtn) {
      els.logoutBtn.addEventListener('click', async () => {
        try {
          await logoutUser();
          showAlert('Sesión cerrada correctamente.');
          if (isProtectedPage()) redirectToLogin('sin-sesion');
        } catch (error) {
          console.error(error);
          showAlert(`Error al cerrar sesión: ${error.message}`, 'error');
        }
      });
    }

    if (els.forgotPasswordBtn) {
      els.forgotPasswordBtn.addEventListener('click', async () => {
        try {
          const email = (els.loginEmail?.value || '').trim();
          if (!email) return showAlert('Ingresa tu correo primero para enviar la recuperación.', 'error');
          await sendPasswordRecovery(email);
          showAlert('Correo de recuperación enviado. Revisa tu bandeja de entrada y correo no deseado.');
        } catch (error) {
          console.error(error);
          showAlert(`Error enviando recuperación: ${error.message}`, 'error');
        }
      });
    }

    if (els.newsForm) {
      els.newsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const selectedStatus = getSubmittedStatus(event);
        const btn = event.submitter || form.querySelector('button[type="submit"]');
        setSubmitState(btn, selectedStatus === 'published' ? 'Publicando...' : 'Guardando...', true);
        try {
          const status = await createNews({
            title: form.title.value.trim(),
            summary: form.summary.value.trim(),
            content: form.content.value.trim(),
            imageFile: form.image.files[0] || null,
            status: selectedStatus
          });
          form.reset();
          showAlert(getPublicationMessage('news', status));
          await Promise.all([fetchNews(), fetchAdminContent()]);
        } catch (error) {
          console.error(error);
          showAlert(`Error guardando noticia: ${error.message}`, 'error', 5000);
        } finally {
          setSubmitState(btn, '', false);
        }
      });
    }

    if (els.trainingForm) {
      els.trainingForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const selectedStatus = getSubmittedStatus(event);
        const btn = event.submitter || form.querySelector('button[type="submit"]');
        setSubmitState(btn, selectedStatus === 'published' ? 'Publicando...' : 'Guardando...', true);
        try {
          const status = await createTraining({
            title: form.title.value.trim(),
            summary: form.summary.value.trim(),
            content: form.content.value.trim(),
            eventDate: form.event_date.value || null,
            imageFile: form.image.files[0] || null,
            status: selectedStatus
          });
          form.reset();
          showAlert(getPublicationMessage('training', status));
          await Promise.all([fetchTrainings(), fetchAdminContent()]);
        } catch (error) {
          console.error(error);
          showAlert(`Error guardando capacitación: ${error.message}`, 'error', 5000);
        } finally {
          setSubmitState(btn, '', false);
        }
      });
    }

    if (els.guideForm) {
      els.guideForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const selectedStatus = getSubmittedStatus(event);
        const btn = event.submitter || form.querySelector('button[type="submit"]');
        setSubmitState(btn, selectedStatus === 'published' ? 'Publicando...' : 'Guardando...', true);
        try {
          const status = await createGuide({
            title: form.title.value.trim(),
            description: form.description.value.trim(),
            pdfFile: form.pdf_file.files[0] || null,
            coverImageFile: form.cover_image.files[0] || null,
            status: selectedStatus
          });
          form.reset();
          showAlert(getPublicationMessage('guide', status));
          await Promise.all([fetchGuides(), fetchAdminContent()]);
        } catch (error) {
          console.error(error);
          showAlert(`Error guardando guía: ${error.message}`, 'error', 5000);
        } finally {
          setSubmitState(btn, '', false);
        }
      });
    }

    document.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-status-action]');
      if (!action) return;

      const btn = action;
      setSubmitState(btn, 'Actualizando...', true);
      try {
        const newStatus = await updateContentStatus(btn.dataset.contentType, btn.dataset.id, btn.dataset.nextStatus);
        showAlert(getPublicationMessage(btn.dataset.contentType, newStatus));
        await Promise.all([fetchAllPublicData(), fetchAdminContent()]);
      } catch (error) {
        console.error(error);
        showAlert(`Error actualizando estado: ${error.message}`, 'error', 5000);
      } finally {
        setSubmitState(btn, '', false);
      }
    });
  }

  function subscribeRealtime() {
    if (!els.newsGrid && !els.newsFeatured && !els.trainingsGrid && !els.guidesGrid && !els.homeNewsFeatured && !els.homeTrainingFeatured && !els.adminNewsList) return;
    supabaseClient.channel('bpso-content-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, async () => { await fetchNews(); await fetchAdminContent(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trainings' }, async () => { await fetchTrainings(); await fetchAdminContent(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guides' }, async () => { await fetchGuides(); await fetchAdminContent(); })
      .subscribe();
  }

  async function initAuth() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error(error);
      showAlert(`Error leyendo sesión: ${error.message}`, 'error');
      return false;
    }

    const canContinue = await applyAuthState(data.session);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      applyAuthState(session);
    });

    return canContinue;
  }

  async function init() {
    initMenu();
    showQueryAlert();
    if (els.projectUrlView) els.projectUrlView.textContent = SUPABASE_URL;
    bindEvents();
    const canContinue = await initAuth();
    if (!canContinue) return;
    await fetchAllPublicData();
    await fetchAdminContent();
    subscribeRealtime();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
