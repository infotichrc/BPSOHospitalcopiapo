(() => {
  if (window.__BPSO_APP_LOADED__) {
    console.warn('BPSO app.js ya estaba cargado. Se evita doble ejecución.');
    return;
  }
  window.__BPSO_APP_LOADED__ = true;

  const SUPABASE_URL = 'https://wedhcjlrlwdjoneahodl.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_QvlFvKMlHZsL1tP_UZfSvw_a4A6ejrQ';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase CDN no cargó correctamente.');
    return;
  }

  const { createClient } = window.supabase;
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

  window.bpso = {
    supabase: supabaseClient
  };

  console.log('BPSO app cargada correctamente');
  console.log('Supabase client inicializado:', !!supabaseClient);

  const state = {
    session: null,
    news: [],
    trainings: [],
    guides: []
  };

  const els = {
    projectUrlView: document.getElementById('project-url-view'),
    loginForm: document.getElementById('login-form'),
    logoutBtn: document.getElementById('logout-btn'),
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

  function showAlert(message, type = 'success') {
    if (!els.alertBox) return;
    els.alertBox.textContent = message;
    els.alertBox.className = `alert ${type}`;
    els.alertBox.classList.remove('hidden');

    window.clearTimeout(showAlert._timer);
    showAlert._timer = window.setTimeout(() => {
      els.alertBox.classList.add('hidden');
    }, 5000);
  }

  function formatDate(dateString) {
    if (!dateString) return 'Sin fecha';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium'
    }).format(date);
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
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function toggleEmptyState(element, emptyElement, hasItems) {
    if (!element || !emptyElement) return;
    emptyElement.classList.toggle('show', !hasItems);
    element.style.display = hasItems ? 'grid' : 'none';
  }

  function setSessionUI(session) {
    const email = session?.user?.email || null;
    state.session = session || null;

    if (els.sessionBadge) {
      els.sessionBadge.textContent = email ? `Sesión activa: ${email}` : 'Sin sesión';
    }

    if (els.adminPanel) {
      els.adminPanel.classList.toggle('hidden', !email);
    }

    if (email && els.loginEmail && els.loginPassword) {
      els.loginEmail.value = email;
      els.loginPassword.value = '';
    }
  }

  function renderNews() {
    const items = state.news;
    toggleEmptyState(els.newsGrid, els.newsEmpty, items.length > 0);
    if (!els.newsGrid || !items.length) return;

    els.newsGrid.innerHTML = items.map(item => `
      <article class="glass card">
        <div class="card-media">
          ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}">` : ''}
        </div>
        <div class="card-body">
          <div class="card-meta">${escapeHtml(formatDate(item.published_at || item.created_at))}</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary || ((item.content || '').slice(0, 180) + '...'))}</p>
        </div>
      </article>
    `).join('');
  }

  function renderTrainings() {
    const items = state.trainings;
    toggleEmptyState(els.trainingsGrid, els.trainingsEmpty, items.length > 0);
    if (!els.trainingsGrid || !items.length) return;

    els.trainingsGrid.innerHTML = items.map(item => `
      <article class="glass card">
        <div class="card-media">
          ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}">` : ''}
        </div>
        <div class="card-body">
          <div class="card-meta">${escapeHtml(formatDate(item.event_date || item.published_at || item.created_at))}</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary || ((item.content || '').slice(0, 180) + '...'))}</p>
        </div>
      </article>
    `).join('');
  }

  function renderGuides() {
    const items = state.guides;
    toggleEmptyState(els.guidesGrid, els.guidesEmpty, items.length > 0);
    if (!els.guidesGrid || !items.length) return;

    els.guidesGrid.innerHTML = items.map(item => `
      <article class="glass card">
        <div class="card-media">
          ${item.cover_image_url ? `<img src="${escapeHtml(item.cover_image_url)}" alt="${escapeHtml(item.title)}">` : ''}
        </div>
        <div class="card-body">
          <div class="card-meta">Guía descargable</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description || 'Documento disponible para descarga.')}</p>
          <div class="guide-actions">
            <a class="btn btn-primary" href="${escapeHtml(item.file_url)}" target="_blank" rel="noopener" download>Descargar</a>
          </div>
        </div>
      </article>
    `).join('');
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
    state.guides = data || [];
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

  async function loginUser(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async function logoutUser() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  }

  async function uploadImage(file, folder = 'general') {
    if (!file) return null;

    const fileName = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('bpso-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage
      .from('bpso-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function uploadGuide(file) {
    if (!file) throw new Error('Debes seleccionar un archivo de guía.');

    const fileName = `guides/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('bpso-guides')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage
      .from('bpso-guides')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function createNews({ title, summary, content, imageFile }) {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) throw new Error('No hay usuario autenticado.');

    let imageUrl = null;
    if (imageFile) imageUrl = await uploadImage(imageFile, 'news');

    const payload = {
      title,
      slug: `${makeSlug(title)}-${Date.now()}`,
      summary,
      content,
      image_url: imageUrl,
      status: 'published',
      published_at: new Date().toISOString(),
      author_id: userData.user.id
    };

    const { error } = await supabaseClient.from('news').insert([payload]);
    if (error) throw error;
  }

  async function createTraining({ title, summary, content, imageFile, eventDate }) {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) throw new Error('No hay usuario autenticado.');

    let imageUrl = null;
    if (imageFile) imageUrl = await uploadImage(imageFile, 'trainings');

    const payload = {
      title,
      summary,
      content,
      image_url: imageUrl,
      event_date: eventDate || null,
      status: 'published',
      published_at: new Date().toISOString(),
      author_id: userData.user.id
    };

    const { error } = await supabaseClient.from('trainings').insert([payload]);
    if (error) throw error;
  }

  async function createGuide({ title, description, pdfFile, coverImageFile }) {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) throw new Error('No hay usuario autenticado.');

    const fileUrl = await uploadGuide(pdfFile);
    const coverImageUrl = coverImageFile ? await uploadImage(coverImageFile, 'guides') : null;

    const payload = {
      title,
      description,
      file_url: fileUrl,
      cover_image_url: coverImageUrl,
      status: 'published',
      author_id: userData.user.id
    };

    const { error } = await supabaseClient.from('guides').insert([payload]);
    if (error) throw error;
  }

  function bindEvents() {
    if (els.loginForm) {
      els.loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
          const email = els.loginEmail.value.trim();
          const password = els.loginPassword.value;
          await loginUser(email, password);
          showAlert('Sesión iniciada correctamente.');
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
        } catch (error) {
          console.error(error);
          showAlert(`Error al cerrar sesión: ${error.message}`, 'error');
        }
      });
    }

    if (els.newsForm) {
      els.newsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Publicando...';

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
          submitButton.disabled = false;
          submitButton.textContent = 'Publicar noticia';
        }
      });
    }

    if (els.trainingForm) {
      els.trainingForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Publicando...';

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
          submitButton.disabled = false;
          submitButton.textContent = 'Publicar capacitación';
        }
      });
    }

    if (els.guideForm) {
      els.guideForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Publicando...';

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
          submitButton.disabled = false;
          submitButton.textContent = 'Publicar guía';
        }
      });
    }
  }

  function subscribeRealtime() {
    supabaseClient
      .channel('bpso-content-changes')
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

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSessionUI(session);
    });
  }

  async function init() {
    if (els.projectUrlView) {
      els.projectUrlView.textContent = SUPABASE_URL;
    }

    bindEvents();
    await initAuth();
    await fetchAllPublicData();
    subscribeRealtime();
  }

  window.addEventListener('DOMContentLoaded', init);
})();