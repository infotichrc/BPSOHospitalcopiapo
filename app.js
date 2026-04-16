(() => {
  if (window.__BPSO_APP_LOADED__) return;
  window.__BPSO_APP_LOADED__ = true;

  const SUPABASE_URL = 'https://wedhcjlrlwdjoneahodl.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_QvlFvKMlHZsL1tP_UZfSvw_a4A6ejrQ';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase CDN no cargó correctamente.');
    return;
  }

  const { createClient } = window.supabase;
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

  const state = { session: null, news: [], trainings: [], guides: [] };

  const els = {
    menuToggle: document.getElementById('menu-toggle'),
    siteNav: document.getElementById('site-nav'),
    projectUrlView: document.getElementById('project-url-view'),
    loginForm: document.getElementById('login-form'),
    logoutBtn: document.getElementById('logout-btn'),
    forgotPasswordBtn: document.getElementById('forgot-password-btn'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    adminPanel: document.getElementById('admin-panel'),
    sessionBadge: document.getElementById('session-badge'),
    alertBox: document.getElementById('alert-box'),
    newsForm: document.getElementById('news-form'),
    trainingForm: document.getElementById('training-form'),
    guideForm: document.getElementById('guide-form'),
    newsGrid: document.getElementById('news-grid'),
    trainingsGrid: document.getElementById('trainings-grid'),
    guidesGrid: document.getElementById('guides-grid'),
    newsEmpty: document.getElementById('news-empty'),
    trainingsEmpty: document.getElementById('trainings-empty'),
    guidesEmpty: document.getElementById('guides-empty')
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

  function showAlert(message, type = 'success') {
    if (!els.alertBox) return;
    els.alertBox.textContent = message;
    els.alertBox.className = `alert ${type}`;
    els.alertBox.classList.remove('hidden');
    clearTimeout(showAlert._timer);
    showAlert._timer = setTimeout(() => els.alertBox.classList.add('hidden'), 6000);
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

  function toggleEmptyState(element, emptyElement, hasItems) {
    if (!element || !emptyElement) return;
    emptyElement.classList.toggle('show', !hasItems);
    element.style.display = hasItems ? 'grid' : 'none';
  }

  function setSessionUI(session) {
    const email = session?.user?.email || null;
    state.session = session || null;
    if (els.sessionBadge) els.sessionBadge.textContent = email ? `Sesión activa: ${email}` : 'Sin sesión';
    if (els.adminPanel) els.adminPanel.classList.toggle('hidden', !email);
    if (email && els.loginEmail && els.loginPassword) {
      els.loginEmail.value = email;
      els.loginPassword.value = '';
    }
  }

  function renderNews() {
    toggleEmptyState(els.newsGrid, els.newsEmpty, state.news.length > 0);
    if (!els.newsGrid || !state.news.length) return;
    els.newsGrid.innerHTML = state.news.map((item) => `
      <article class="card">
        <div class="card-media">${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}">` : ''}</div>
        <div class="card-body">
          <div class="card-meta">${escapeHtml(formatDate(item.published_at || item.created_at))}</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary || ((item.content || '').slice(0, 180) + '...'))}</p>
        </div>
      </article>`).join('');
  }

  function renderTrainings() {
    toggleEmptyState(els.trainingsGrid, els.trainingsEmpty, state.trainings.length > 0);
    if (!els.trainingsGrid || !state.trainings.length) return;
    els.trainingsGrid.innerHTML = state.trainings.map((item) => `
      <article class="card">
        <div class="card-media">${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}">` : ''}</div>
        <div class="card-body">
          <div class="card-meta">${escapeHtml(formatDate(item.event_date || item.published_at || item.created_at))}</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary || ((item.content || '').slice(0, 180) + '...'))}</p>
        </div>
      </article>`).join('');
  }

  function renderGuides() {
    toggleEmptyState(els.guidesGrid, els.guidesEmpty, state.guides.length > 0);
    if (!els.guidesGrid || !state.guides.length) return;
    els.guidesGrid.innerHTML = state.guides.map((item) => `
      <article class="card">
        <div class="card-media">${item.cover_image_url ? `<img src="${escapeHtml(item.cover_image_url)}" alt="${escapeHtml(item.title)}">` : ''}</div>
        <div class="card-body">
          <div class="card-meta">Guía descargable</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description || 'Documento disponible para descarga.')}</p>
          <div class="guide-actions"><a class="btn btn-primary" href="${escapeHtml(item.file_url)}" target="_blank" rel="noopener" download>Descargar</a></div>
        </div>
      </article>`).join('');
  }

  async function fetchNews() {
    const { data, error } = await supabaseClient.from('news').select('*').eq('status', 'published').order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    if (error) throw error;
    state.news = data || [];
    renderNews();
  }

  async function fetchTrainings() {
    const { data, error } = await supabaseClient.from('trainings').select('*').eq('status', 'published').order('event_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    if (error) throw error;
    state.trainings = data || [];
    renderTrainings();
  }

  async function fetchGuides() {
    const { data, error } = await supabaseClient.from('guides').select('*').eq('status', 'published').order('created_at', { ascending: false });
    if (error) throw error;
    state.guides = data || [];
    renderGuides();
  }

  async function fetchAllPublicData() {
    try { await Promise.all([fetchNews(), fetchTrainings(), fetchGuides()]); }
    catch (error) { console.error(error); showAlert(`Error cargando contenido público: ${error.message}`, 'error'); }
  }

  async function loginUser(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function logoutUser() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
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
    const { error: uploadError } = await supabaseClient.storage.from('bpso-images').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabaseClient.storage.from('bpso-images').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function uploadGuide(file) {
    if (!file) throw new Error('Debes seleccionar un archivo de guía.');
    const fileName = `guides/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage.from('bpso-guides').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabaseClient.storage.from('bpso-guides').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function createNews({ title, summary, content, imageFile }) {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) throw new Error('No hay usuario autenticado.');
    const imageUrl = imageFile ? await uploadImage(imageFile, 'news') : null;
    const payload = { title, slug: `${makeSlug(title)}-${Date.now()}`, summary, content, image_url: imageUrl, status: 'published', published_at: new Date().toISOString(), author_id: userData.user.id };
    const { error } = await supabaseClient.from('news').insert([payload]);
    if (error) throw error;
  }

  async function createTraining({ title, summary, content, imageFile, eventDate }) {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) throw new Error('No hay usuario autenticado.');
    const imageUrl = imageFile ? await uploadImage(imageFile, 'trainings') : null;
    const payload = { title, summary, content, image_url: imageUrl, event_date: eventDate || null, status: 'published', published_at: new Date().toISOString(), author_id: userData.user.id };
    const { error } = await supabaseClient.from('trainings').insert([payload]);
    if (error) throw error;
  }

  async function createGuide({ title, description, pdfFile, coverImageFile }) {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) throw new Error('No hay usuario autenticado.');
    const fileUrl = await uploadGuide(pdfFile);
    const coverImageUrl = coverImageFile ? await uploadImage(coverImageFile, 'guides') : null;
    const payload = { title, description, file_url: fileUrl, cover_image_url: coverImageUrl, status: 'published', author_id: userData.user.id };
    const { error } = await supabaseClient.from('guides').insert([payload]);
    if (error) throw error;
  }

  function bindEvents() {
    if (els.loginForm) {
      els.loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await loginUser((els.loginEmail?.value || '').trim(), els.loginPassword?.value || '');
          showAlert('Sesión iniciada correctamente.');
        } catch (error) {
          console.error(error);
          showAlert(`Error al iniciar sesión: ${error.message}`, 'error');
        }
      });
    }

    if (els.logoutBtn) {
      els.logoutBtn.addEventListener('click', async () => {
        try { await logoutUser(); showAlert('Sesión cerrada correctamente.'); }
        catch (error) { console.error(error); showAlert(`Error al cerrar sesión: ${error.message}`, 'error'); }
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
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Publicando...';
        try {
          await createNews({
            title: form.title.value.trim(),
            summary: form.summary.value.trim(),
            content: form.content.value.trim(),
            imageFile: form.image.files[0] || null
          });
          form.reset();
          showAlert('Noticia publicada correctamente.');
          await fetchNews();
        } catch (error) {
          console.error(error);
          showAlert(`Error publicando noticia: ${error.message}`, 'error');
        } finally {
          btn.disabled = false; btn.textContent = 'Publicar noticia';
        }
      });
    }

    if (els.trainingForm) {
      els.trainingForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Publicando...';
        try {
          await createTraining({
            title: form.title.value.trim(),
            summary: form.summary.value.trim(),
            content: form.content.value.trim(),
            eventDate: form.event_date.value || null,
            imageFile: form.image.files[0] || null
          });
          form.reset();
          showAlert('Capacitación publicada correctamente.');
          await fetchTrainings();
        } catch (error) {
          console.error(error);
          showAlert(`Error publicando capacitación: ${error.message}`, 'error');
        } finally {
          btn.disabled = false; btn.textContent = 'Publicar capacitación';
        }
      });
    }

    if (els.guideForm) {
      els.guideForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Publicando...';
        try {
          await createGuide({
            title: form.title.value.trim(),
            description: form.description.value.trim(),
            pdfFile: form.pdf_file.files[0] || null,
            coverImageFile: form.cover_image.files[0] || null
          });
          form.reset();
          showAlert('Guía publicada correctamente.');
          await fetchGuides();
        } catch (error) {
          console.error(error);
          showAlert(`Error publicando guía: ${error.message}`, 'error');
        } finally {
          btn.disabled = false; btn.textContent = 'Publicar guía';
        }
      });
    }
  }

  function subscribeRealtime() {
    if (!els.newsGrid && !els.trainingsGrid && !els.guidesGrid) return;
    supabaseClient.channel('bpso-content-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, fetchNews)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trainings' }, fetchTrainings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guides' }, fetchGuides)
      .subscribe();
  }

  async function initAuth() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error(error);
      showAlert(`Error leyendo sesión: ${error.message}`, 'error');
      return;
    }
    setSessionUI(data.session);
    supabaseClient.auth.onAuthStateChange((_event, session) => setSessionUI(session));
  }

  async function init() {
    initMenu();
    if (els.projectUrlView) els.projectUrlView.textContent = SUPABASE_URL;
    bindEvents();
    await initAuth();
    await fetchAllPublicData();
    subscribeRealtime();
  }

  window.addEventListener('DOMContentLoaded', init);
})();