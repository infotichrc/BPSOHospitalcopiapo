(() => {
  if (window.__BPSO_APP_LOADED__) return;
  window.__BPSO_APP_LOADED__ = true;

  // =====================================================
  // CONFIGURACIÓN SUPABASE
  // =====================================================
  // Para conectar el proyecto nuevo, edita solamente supabase-config.js.
  const APP_CONFIG = window.BPSO_SUPABASE_CONFIG || {};
  const SUPABASE_URL = APP_CONFIG.SUPABASE_URL || '';
  const SUPABASE_KEY = APP_CONFIG.SUPABASE_ANON_KEY || APP_CONFIG.SUPABASE_KEY || '';

  const isConfigured = Boolean(
    SUPABASE_URL &&
    SUPABASE_KEY &&
    !SUPABASE_URL.includes('PEGA_AQUI') &&
    !SUPABASE_KEY.includes('PEGA_AQUI')
  );

  let supabaseClient = null;
  if (isConfigured && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (error) {
      console.error('No se pudo inicializar Supabase. Revisa supabase-config.js', error);
    }
  } else if (isConfigured) {
    console.error('Supabase CDN no cargó correctamente.');
  }

  // =====================================================
  // FUENTE ÚNICA DE DATOS
  // =====================================================
  // Los archivos físicos de guías y carátulas pueden vivir localmente
  // en /guias y /assets/guias, pero sus rutas se editan en la tabla
  // public.guide_catalog.
  //
  // Las imágenes de comités pueden vivir localmente en /assets/comites,
  // pero su ruta se edita en public.committees.image_path.

  const state = {
    session: null,
    profile: null,
    news: [],
    trainings: [],
    guides: [],
    committees: [],
    adminNews: [],
    adminTrainings: [],
    adminResources: []
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
    resourceForm: document.getElementById('resource-form'),
    resourceCommitteeSelect: document.getElementById('resource-committee-select'),
    resourceGuideSelect: document.getElementById('resource-guide-select'),
    adminNewsList: document.getElementById('admin-news-list'),
    adminTrainingsList: document.getElementById('admin-trainings-list'),
    adminResourcesList: document.getElementById('admin-resources-list'),
    newsGrid: document.getElementById('news-grid'),
    newsFeatured: document.getElementById('news-featured'),
    newsOlderHead: document.querySelector('.news-older-head'),
    trainingsGrid: document.getElementById('trainings-grid'),
    guidesGrid: document.getElementById('guides-grid'),
    committeesGrid: document.getElementById('committees-grid'),
    newsEmpty: document.getElementById('news-empty'),
    trainingsEmpty: document.getElementById('trainings-empty'),
    guidesEmpty: document.getElementById('guides-empty'),
    committeesEmpty: document.getElementById('committees-empty'),
    homeNewsSection: document.getElementById('home-news-section'),
    homeNewsFeatured: document.getElementById('home-news-featured'),
    homeTrainingsSection: document.getElementById('home-trainings-section'),
    homeTrainingFeatured: document.getElementById('home-training-featured'),
    modal: document.getElementById('content-modal'),
    modalContent: document.getElementById('modal-content'),
    guideBulletList: document.getElementById('guide-bullet-list'),
    homeCommitteeCard: document.getElementById('home-committee-card')
  };

  const CONTENT_TABLES = {
    news: 'news',
    training: 'trainings',
    trainings: 'trainings',
    resource: 'committee_resources',
    resources: 'committee_resources'
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
    resource: {
      draft: 'Recurso digital guardado como borrador.',
      published: 'Recurso digital publicado.'
    },
    content: {
      draft: 'Contenido pasado a borrador.',
      published: 'Contenido publicado.'
    }
  };

  function hasSupabase() {
    return Boolean(supabaseClient);
  }

  function requireSupabase() {
    if (!hasSupabase()) {
      throw new Error('Falta configurar SUPABASE_URL y SUPABASE_ANON_KEY en supabase-config.js.');
    }
  }

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
      'perfil-no-encontrado': 'Tu cuenta existe en Auth, pero no tiene perfil creado en la tabla profiles.',
      'sin-configuracion': 'Falta configurar Supabase en supabase-config.js.'
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
    return String(text || '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function sanitizeFileName(fileName) {
    return String(fileName || 'archivo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  function getSummary(item, limit = 180) {
    const raw = item.summary || item.content || item.description || '';
    return raw.length > limit ? `${raw.slice(0, limit).trim()}...` : raw;
  }

  function getContent(item) {
    return item.content || item.summary || item.description || 'Sin contenido disponible.';
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
    return role === 'editor' ? 'Editor' : 'Editor';
  }

  function statusLabel(status) {
    const labels = {
      draft: 'Borrador',
      published: 'Publicado',
      archived: 'Archivado'
    };
    return labels[status] || 'Sin estado';
  }

  function resourceTypeLabel(type) {
    const labels = {
      file: 'Archivo',
      pdf: 'PDF',
      document: 'Documento',
      presentation: 'Presentación',
      image: 'Imagen',
      video: 'Video',
      link: 'Enlace'
    };
    return labels[type] || 'Recurso';
  }

  function normalizeStatus(status) {
    return status === 'published' ? 'published' : 'draft';
  }

  function normalizeContentMessageType(type) {
    if (type === 'news') return 'news';
    if (type === 'training' || type === 'trainings') return 'training';
    if (type === 'resource' || type === 'resources') return 'resource';
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
    return Boolean(profile?.is_active && profile.role === 'editor');
  }

  function guideFilePath(item) {
    // Fuente única: Supabase.
    // El archivo puede estar en la carpeta local /guias, pero la ruta se edita en guide_catalog.local_file_path.
    return item?.local_file_path || item?.file_url || item?.download_url || '#';
  }

  function guideCoverPath(item) {
    // Fuente única: Supabase.
    // La carátula puede estar en /assets/guias, pero la ruta se edita en guide_catalog.cover_image_path.
    return item?.cover_image_path || item?.cover_image_url || '';
  }

  async function loadProfileForSession(session) {
    if (!session?.user?.id || !hasSupabase()) return null;
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
      if (!hasSupabase()) {
        els.sessionBadge.textContent = 'Supabase sin configurar';
      } else if (profile?.full_name) {
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

    if (session?.user) profile = await loadProfileForSession(session);
    setSessionUI(session, profile);

    const page = getCurrentPage();

    if (isProtectedPage()) {
      if (!hasSupabase()) {
        redirectToLogin('sin-configuracion');
        return false;
      }

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
    requireSupabase();
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
    const coverPath = guideCoverPath(item);
    const cover = coverPath
      ? `<img src="${escapeHtml(coverPath)}" alt="${escapeHtml(item.title)}" onerror="this.style.display='none';this.closest('.guide-media').innerHTML='<span class=&quot;guide-placeholder&quot;>Guía BPSO</span>'">`
      : `<span class="guide-placeholder">Guía BPSO</span>`;
    const downloadUrl = guideFilePath(item);

    return `
      <article class="card guide-card${compact ? ' guide-card-compact' : ''}">
        <button class="guide-cover-button" type="button" data-open-item="guide" data-id="${escapeHtml(item.id)}" aria-label="Ver detalle de ${escapeHtml(item.title)}">
          <div class="card-media guide-media">${cover}</div>
        </button>
        <div class="card-body">
          <div class="card-meta">Guía oficial BPSO/RNAO</div>
          <h3>${escapeHtml(item.title)}</h3>
          ${compact ? '' : `<p>${escapeHtml(description)}</p>`}
          <div class="guide-actions"><a class="btn btn-primary" href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener" download>Descargar guía</a></div>
        </div>
      </article>`;
  }

  function resourceLink(resource) {
    return resource.external_url || resource.file_url || '#';
  }

  function resourceList(resources = []) {
    if (!resources.length) return '<p class="muted-note">Sin recursos digitales publicados por el momento.</p>';
    return `
      <div class="resource-list">
        ${resources.map((resource) => `
          <a class="resource-item" href="${escapeHtml(resourceLink(resource))}" target="_blank" rel="noopener">
            <span>${escapeHtml(resourceTypeLabel(resource.resource_type))}</span>
            <strong>${escapeHtml(resource.title)}</strong>
            ${resource.description ? `<small>${escapeHtml(resource.description)}</small>` : ''}
          </a>
        `).join('')}
      </div>`;
  }

  function memberList(members = []) {
    if (!members.length) return '<p class="muted-note">Integrantes pendientes de actualización.</p>';
    return `
      <ul class="committee-member-list">
        ${members.map((member) => {
          const detail = [member.role_title, member.unit].filter(Boolean).join(' · ');
          return `<li><strong>${escapeHtml(member.full_name)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ''}</li>`;
        }).join('')}
      </ul>`;
  }

  function committeeGuideLinks(guides = []) {
    if (!guides.length) return '';
    return `
      <div class="committee-guides">
        <strong>Guía asociada</strong>
        ${guides.map((guide) => `<a href="${escapeHtml(guideFilePath(guide))}" target="_blank" rel="noopener" download>${escapeHtml(guide.title)}</a>`).join('')}
      </div>`;
  }

  function paragraphsHtml(text) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return '<p>Información pendiente de actualización.</p>';
    return cleanText
      .split(/\n{2,}|\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join('');
  }

  function renderHomeCommittee() {
    if (!els.homeCommitteeCard) return;
    const committee = state.committees.find((item) => item.slug === 'comite-implementacion') || state.committees[0];
    if (!committee) {
      els.homeCommitteeCard.innerHTML = `
        <p>Información del comité pendiente de actualización.</p>
        <div class="section-actions"><a class="btn btn-outline" href="comites.html">Ver comités</a></div>`;
      return;
    }

    els.homeCommitteeCard.innerHTML = `
      ${paragraphsHtml(committee.description)}
      <div class="section-actions"><a class="btn btn-outline" href="comites.html">Ver comités</a></div>`;
  }

  function committeeCard(committee) {
    const imagePath = committee.image_path || 'assets/comites/comite-generico.jpg';
    const isFeatured = committee.slug === 'comite-implementacion';
    return `
      <article class="committee-card committee-card-dynamic${isFeatured ? ' featured-committee' : ''}">
        <div class="committee-image-wrap">
          <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(committee.image_alt || committee.name)}" onerror="this.src='assets/comites/comite-generico.jpg'">
        </div>
        <div class="committee-card-body">
          <span class="eyebrow">${isFeatured ? 'Comité principal' : 'Comité asociado'}</span>
          <h2>${escapeHtml(committee.name)}</h2>
          <p>${escapeHtml(committee.description || '')}</p>
          ${committeeGuideLinks(committee.guides)}
          <details class="committee-details">
            <summary>Ver integrantes (${committee.members.length})</summary>
            ${memberList(committee.members)}
          </details>
          <details class="committee-details">
            <summary>Recursos digitales (${committee.resources.length})</summary>
            ${resourceList(committee.resources)}
          </details>
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
    const downloadUrl = guideFilePath(item);
    const coverPath = guideCoverPath(item);
    els.modalContent.innerHTML = `
      <div class="modal-media guide-modal-media">${coverPath ? `<img src="${escapeHtml(coverPath)}" alt="${escapeHtml(item.title)}">` : `<span class="guide-placeholder guide-placeholder-large">Guía BPSO</span>`}</div>
      <div class="modal-body">
        <div class="card-meta">Guía oficial de buenas prácticas</div>
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
    toggleEmptyState(els.newsGrid, els.newsEmpty, state.news.length > 0);
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

  function renderGuideBulletList() {
    if (!els.guideBulletList) return;
    els.guideBulletList.innerHTML = state.guides.length
      ? state.guides.map((guide) => `<li>${escapeHtml(guide.title)}</li>`).join('')
      : '<li>Guías pendientes de actualización.</li>';
  }

  function renderGuides() {
    renderGuideBulletList();
    toggleEmptyState(els.guidesGrid, els.guidesEmpty, state.guides.length > 0);
    if (!els.guidesGrid || !state.guides.length) return;
    const compact = els.guidesGrid.classList.contains('compact-guides');
    els.guidesGrid.innerHTML = state.guides.map((item) => guideCard(item, compact)).join('');
  }

  function renderCommittees() {
    renderHomeCommittee();
    toggleEmptyState(els.committeesGrid, els.committeesEmpty, state.committees.length > 0);
    if (!els.committeesGrid || !state.committees.length) return;
    els.committeesGrid.innerHTML = state.committees.map((committee) => committeeCard(committee)).join('');
  }

  function adminRow(item, type) {
    const isPublished = item.status === 'published';
    const nextStatus = isPublished ? 'draft' : 'published';
    const buttonLabel = isPublished ? 'Pasar a borrador' : 'Publicar';
    const subtitle = type === 'resources'
      ? `${item.committee?.name || 'Comité'} · ${statusLabel(item.status)} · ${formatDate(item.updated_at || item.created_at)}`
      : `${statusLabel(item.status)} · ${formatDate(item.updated_at || item.created_at)}`;
    return `
      <div class="admin-content-row">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(subtitle)}</small>
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
    renderAdminList(els.adminResourcesList, state.adminResources, 'resources', 'Aún no hay recursos digitales creados.');
  }

  function normalizeGuideCatalog(data = []) {
    return (data || [])
      .filter((guide) => guide.status === 'published' || !guide.status)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || String(a.title).localeCompare(String(b.title), 'es'));
  }

  function normalizeCommitteeData(data = []) {
    return (data || [])
      .map((committee) => {
        const members = (committee.committee_members || [])
          .filter((member) => member.is_active !== false)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || String(a.full_name).localeCompare(String(b.full_name), 'es'));

        const guides = (committee.committee_guides || [])
          .map((relation) => relation.guide)
          .filter(Boolean)
          .filter((guide) => guide.status === 'published' || !guide.status)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const resources = (committee.committee_resources || [])
          .filter((resource) => resource.status === 'published' || !resource.status)
          .sort((a, b) => new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0));

        return { ...committee, members, guides, resources };
      })
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || String(a.name).localeCompare(String(b.name), 'es'));
  }

  async function fetchNews() {
    if (!hasSupabase()) {
      state.news = [];
      renderNews();
      return;
    }
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
    if (!hasSupabase()) {
      state.trainings = [];
      renderTrainings();
      return;
    }
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
    if (!hasSupabase()) {
      state.guides = [];
      renderGuides();
      populateGuideSelect();
      return;
    }

    const { data, error } = await supabaseClient
      .from('guide_catalog')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });

    if (error) {
      console.error('No se pudo cargar guide_catalog desde Supabase.', error.message);
      state.guides = [];
    } else {
      state.guides = normalizeGuideCatalog(data || []);
    }
    renderGuides();
    populateGuideSelect();
  }

  async function fetchCommittees() {
    if (!els.committeesGrid && !els.resourceCommitteeSelect && !els.homeCommitteeCard) return;
    if (!hasSupabase()) {
      state.committees = [];
      renderCommittees();
      populateCommitteeSelect();
      return;
    }

    const { data, error } = await supabaseClient
      .from('committees')
      .select(`
        id,
        name,
        slug,
        description,
        image_path,
        image_alt,
        status,
        sort_order,
        committee_members(id, full_name, role_title, unit, sort_order, is_active),
        committee_guides(guide:guide_catalog(id, title, slug, description, local_file_path, cover_image_path, status, sort_order)),
        committee_resources(id, title, description, resource_type, file_path, file_url, external_url, status, published_at, created_at)
      `)
      .eq('status', 'published')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    state.committees = normalizeCommitteeData(data || []);
    renderCommittees();
    populateCommitteeSelect();
  }

  async function fetchAllPublicData() {
    try {
      await Promise.all([fetchGuides(), fetchNews(), fetchTrainings(), fetchCommittees()]);
    } catch (error) {
      console.error(error);
      showAlert(`Error cargando contenido público: ${error.message}`, 'error');
    }
  }

  async function fetchAdminContent() {
    if (!userCanManage(state.profile) || !hasSupabase()) return;

    try {
      const [newsRes, trainingsRes, resourcesRes] = await Promise.all([
        supabaseClient.from('news').select('id,title,status,created_at,updated_at,published_at').order('updated_at', { ascending: false }).limit(20),
        supabaseClient.from('trainings').select('id,title,status,created_at,updated_at,published_at').order('updated_at', { ascending: false }).limit(20),
        supabaseClient.from('committee_resources').select('id,title,status,created_at,updated_at,published_at,committee:committees(name)').order('updated_at', { ascending: false }).limit(20)
      ]);

      if (newsRes.error) throw newsRes.error;
      if (trainingsRes.error) throw trainingsRes.error;
      if (resourcesRes.error) throw resourcesRes.error;

      state.adminNews = newsRes.data || [];
      state.adminTrainings = trainingsRes.data || [];
      state.adminResources = resourcesRes.data || [];
      renderAdminContent();
    } catch (error) {
      console.error(error);
      showAlert(`Error cargando contenidos del panel: ${error.message}`, 'error');
    }
  }

  async function loginUser(email, password) {
    requireSupabase();
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const profile = await loadProfileForSession(data.session);
    if (!profile) {
      await supabaseClient.auth.signOut();
      throw new Error('La cuenta existe en Auth, pero falta crear su perfil en la tabla profiles.');
    }

    if (!userCanManage(profile)) {
      await supabaseClient.auth.signOut();
      throw new Error('Tu perfil no está activo como editor.');
    }

    setSessionUI(data.session, profile);
    return { ...data, profile };
  }

  async function logoutUser() {
    requireSupabase();
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    state.profile = null;
  }

  async function sendPasswordRecovery(email) {
    requireSupabase();
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://bpso.hospitalcopiapo.cl/reset-password'
    });
    if (error) throw error;
  }

  async function uploadImage(file, folder = 'general') {
    requireSupabase();
    if (!file) return null;
    const fileName = `${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('bpso-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage.from('bpso-images').getPublicUrl(fileName);
    return { path: fileName, url: data.publicUrl };
  }

  async function uploadResource(file, committeeSlug = 'general') {
    requireSupabase();
    if (!file) return null;
    const cleanFolder = makeSlug(committeeSlug || 'general') || 'general';
    const fileName = `committees/${cleanFolder}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('bpso-resources')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage.from('bpso-resources').getPublicUrl(fileName);
    return { path: fileName, url: data.publicUrl };
  }

  function publishedAtForStatus(status) {
    return status === 'published' ? new Date().toISOString() : null;
  }

  function normalizeExternalUrl(rawUrl) {
    const value = String(rawUrl || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
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
      slug: `${makeSlug(title)}-${Date.now()}`,
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

  async function createResource({ committeeId, guideId, title, description, resourceType, externalUrl, file, status }) {
    const { user } = await getAuthenticatedUserOrThrow();
    const safeStatus = normalizeStatus(status);
    const committee = state.committees.find((item) => String(item.id) === String(committeeId));
    const cleanExternalUrl = normalizeExternalUrl(externalUrl);

    if (!committeeId) throw new Error('Debes seleccionar un comité.');
    if (!file && !cleanExternalUrl) throw new Error('Debes adjuntar un archivo o ingresar un enlace externo.');

    const uploaded = file ? await uploadResource(file, committee?.slug || `comite-${committeeId}`) : null;
    const payload = {
      committee_id: Number(committeeId),
      guide_id: guideId ? Number(guideId) : null,
      title,
      description,
      resource_type: resourceType || (cleanExternalUrl && !file ? 'link' : 'file'),
      file_path: uploaded?.path || null,
      file_url: uploaded?.url || null,
      external_url: cleanExternalUrl || null,
      status: safeStatus,
      published_at: publishedAtForStatus(safeStatus),
      author_id: user.id
    };

    const { error } = await supabaseClient.from('committee_resources').insert([payload]);
    if (error) throw error;
    return safeStatus;
  }

  async function updateContentStatus(type, id, nextStatus) {
    requireSupabase();
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

  function populateCommitteeSelect() {
    if (!els.resourceCommitteeSelect) return;
    const currentValue = els.resourceCommitteeSelect.value;
    els.resourceCommitteeSelect.innerHTML = '<option value="">Selecciona un comité</option>' +
      state.committees.map((committee) => `<option value="${escapeHtml(committee.id)}">${escapeHtml(committee.name)}</option>`).join('');
    if (currentValue) els.resourceCommitteeSelect.value = currentValue;
  }

  function populateGuideSelect() {
    if (!els.resourceGuideSelect) return;
    const currentValue = els.resourceGuideSelect.value;
    els.resourceGuideSelect.innerHTML = '<option value="">Sin guía específica</option>' +
      state.guides.map((guide) => `<option value="${escapeHtml(guide.id)}">${escapeHtml(guide.title)}</option>`).join('');
    if (currentValue) els.resourceGuideSelect.value = currentValue;
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
          showAlert(`Error al iniciar sesión: ${error.message}`, 'error', 5000);
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
          showAlert(`Error al cerrar sesión: ${error.message}`, 'error', 5000);
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
          showAlert(`Error enviando recuperación: ${error.message}`, 'error', 5000);
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

    if (els.resourceForm) {
      els.resourceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const selectedStatus = getSubmittedStatus(event);
        const btn = event.submitter || form.querySelector('button[type="submit"]');
        setSubmitState(btn, selectedStatus === 'published' ? 'Publicando...' : 'Guardando...', true);
        try {
          const status = await createResource({
            committeeId: form.committee_id.value,
            guideId: form.guide_id.value || null,
            title: form.title.value.trim(),
            description: form.description.value.trim(),
            resourceType: form.resource_type.value,
            externalUrl: form.external_url.value.trim(),
            file: form.resource_file.files[0] || null,
            status: selectedStatus
          });
          form.reset();
          populateCommitteeSelect();
          populateGuideSelect();
          showAlert(getPublicationMessage('resource', status));
          await Promise.all([fetchCommittees(), fetchAdminContent()]);
        } catch (error) {
          console.error(error);
          showAlert(`Error guardando recurso digital: ${error.message}`, 'error', 5000);
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
    if (!hasSupabase()) return;
    if (!els.newsGrid && !els.newsFeatured && !els.trainingsGrid && !els.guidesGrid && !els.committeesGrid && !els.homeCommitteeCard && !els.homeNewsFeatured && !els.homeTrainingFeatured && !els.adminNewsList) return;

    supabaseClient.channel('bpso-content-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, async () => { await fetchNews(); await fetchAdminContent(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trainings' }, async () => { await fetchTrainings(); await fetchAdminContent(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guide_catalog' }, async () => { await fetchGuides(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'committees' }, async () => { await fetchCommittees(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'committee_members' }, async () => { await fetchCommittees(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'committee_resources' }, async () => { await fetchCommittees(); await fetchAdminContent(); })
      .subscribe();
  }

  async function initAuth() {
    if (!hasSupabase()) {
      setSessionUI(null, null);
      if (isProtectedPage()) {
        redirectToLogin('sin-configuracion');
        return false;
      }
      return true;
    }

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
    if (els.projectUrlView) els.projectUrlView.textContent = SUPABASE_URL || 'Pendiente en supabase-config.js';
    bindEvents();
    const canContinue = await initAuth();
    if (!canContinue) return;
    await fetchAllPublicData();
    await fetchAdminContent();
    subscribeRealtime();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
