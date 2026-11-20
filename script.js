// ВСТАВЬТЕ СЮДА ВАШ ДЛИННЫЙ ТОКЕН ИЗ TMDB (API Read Access Token)
const TMDB_TOKEN = 'ВАШ_API_READ_ACCESS_TOKEN';

const BASE_URL = 'https://api.themoviedb.org/3';
// Используем w342: картинки легче и стабильнее загружаются при большой сетке
const IMG_BASE = 'https://image.tmdb.org/t/p/w342';

// Ключи localStorage
const LS_USERS_KEY = 'cinetrack_users';
const LS_CURRENT_USER_KEY = 'cinetrack_current_user';

// Состояние приложения
const state = {
    searchType: 'movie', // 'movie' | 'tv' | 'person'
    query: '',
    viewMode: 'catalog', // 'catalog' | 'saved' | 'mediaDetails' | 'actorDetails'
    lastListMode: 'catalog',
    currentUser: null,
    currentPage: 1,
    totalPages: 1
};

// Элементы DOM
const els = {
    logoBtn: document.getElementById('logoBtn'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    savedNavBtn: document.getElementById('savedNavBtn'),
    savedBadge: document.getElementById('savedBadge'),
    accountNavBtn: document.getElementById('accountNavBtn'),
    headerUserName: document.getElementById('headerUserName'),
    statusBanner: document.getElementById('statusBanner'),

    catalogView: document.getElementById('catalogView'),
    sectionTitle: document.getElementById('sectionTitle'),
    backFromSavedBtn: document.getElementById('backFromSavedBtn'),
    loader: document.getElementById('loader'),
    emptyState: document.getElementById('emptyState'),
    cardsGrid: document.getElementById('cardsGrid'),
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),

    mediaDetailsView: document.getElementById('mediaDetailsView'),
    mediaDetailsContent: document.getElementById('mediaDetailsContent'),
    backFromMediaBtn: document.getElementById('backFromMediaBtn'),

    actorDetailsView: document.getElementById('actorDetailsView'),
    actorDetailsContent: document.getElementById('actorDetailsContent'),
    backFromActorBtn: document.getElementById('backFromActorBtn'),

    authModal: document.getElementById('authModal'),
    showLoginTab: document.getElementById('showLoginTab'),
    showRegisterTab: document.getElementById('showRegisterTab'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    loginError: document.getElementById('loginError'),
    regError: document.getElementById('regError'),

    profileModal: document.getElementById('profileModal'),
    closeProfileModalBtn: document.getElementById('closeProfileModalBtn'),
    profileAvatarLetter: document.getElementById('profileAvatarLetter'),
    profileName: document.getElementById('profileName'),
    profileEmail: document.getElementById('profileEmail'),
    profileSavedCount: document.getElementById('profileSavedCount'),
    profileRatedCount: document.getElementById('profileRatedCount'),
    logoutBtn: document.getElementById('logoutBtn')
};

/* ================= ЗАЩИТА ОТ ОШИБОК ЗАГРУЗКИ КАРТИНОК ================= */

window.handleImgError = function (img) {
    const fallbackText = img.dataset.fallback || 'Нет изображения';
    const placeholder = document.createElement('div');
    placeholder.className = 'poster-placeholder';
    placeholder.textContent = fallbackText;
    img.replaceWith(placeholder);
};

function buildImgHtml(path, altText, lazy = true) {
    if (!path) {
        const div = document.createElement('div');
        div.className = 'poster-placeholder';
        div.textContent = altText;
        return div.outerHTML;
    }
    const img = document.createElement('img');
    img.src = `${IMG_BASE}${path}`;
    img.alt = altText;
    img.dataset.fallback = altText;
    if (lazy) img.loading = 'lazy';
    img.setAttribute('onerror', 'handleImgError(this)');
    return img.outerHTML;
}

/* ================= РАБОТА С ПОЛЬЗОВАТЕЛЯМИ (localStorage) ================= */

function getUsers() {
    return JSON.parse(localStorage.getItem(LS_USERS_KEY) || '[]');
}

function saveUsers(users) {
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
}

function loadSession() {
    const email = localStorage.getItem(LS_CURRENT_USER_KEY);
    if (!email) {
        state.currentUser = null;
        updateUserUI();
        openAuthModal();
        return;
    }
    const users = getUsers();
    const found = users.find((u) => u.email === email);
    if (found) {
        state.currentUser = found;
        updateUserUI();
        closeAuthModal();
    } else {
        localStorage.removeItem(LS_CURRENT_USER_KEY);
        openAuthModal();
    }
}

function updateCurrentUserInStorage() {
    if (!state.currentUser) return;
    const users = getUsers();
    const idx = users.findIndex((u) => u.email === state.currentUser.email);
    if (idx !== -1) {
        users[idx] = state.currentUser;
        saveUsers(users);
    }
    updateUserUI();
}

function updateUserUI() {
    if (state.currentUser) {
        els.headerUserName.textContent = state.currentUser.name;
        els.savedBadge.textContent = state.currentUser.saved.length;
    } else {
        els.headerUserName.textContent = 'Войти';
        els.savedBadge.textContent = '0';
    }
}

function openAuthModal() {
    els.authModal.classList.remove('hidden');
}

function closeAuthModal() {
    els.authModal.classList.add('hidden');
}

els.showLoginTab.addEventListener('click', () => {
    els.showLoginTab.classList.add('active');
    els.showRegisterTab.classList.remove('active');
    els.loginForm.classList.remove('hidden');
    els.registerForm.classList.add('hidden');
    els.loginError.classList.add('hidden');
});

els.showRegisterTab.addEventListener('click', () => {
    els.showRegisterTab.classList.add('active');
    els.showLoginTab.classList.remove('active');
    els.registerForm.classList.remove('hidden');
    els.loginForm.classList.add('hidden');
    els.regError.classList.add('hidden');
});

els.registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;

    const users = getUsers();
    if (users.some((u) => u.email === email)) {
        els.regError.textContent = 'Пользователь с таким email уже зарегистрирован.';
        els.regError.classList.remove('hidden');
        return;
    }

    const newUser = {
        name,
        email,
        password,
        saved: [],
        ratings: {}
    };

    users.push(newUser);
    saveUsers(users);
    localStorage.setItem(LS_CURRENT_USER_KEY, email);
    state.currentUser = newUser;

    els.registerForm.reset();
    updateUserUI();
    closeAuthModal();
    loadCatalog(false);
});

els.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    const users = getUsers();
    const user = users.find((u) => u.email === email && u.password === password);

    if (!user) {
        els.loginError.textContent = 'Неверный email или пароль.';
        els.loginError.classList.remove('hidden');
        return;
    }

    localStorage.setItem(LS_CURRENT_USER_KEY, user.email);
    state.currentUser = user;

    els.loginForm.reset();
    updateUserUI();
    closeAuthModal();
    loadCatalog(false);
});

els.accountNavBtn.addEventListener('click', () => {
    if (!state.currentUser) {
        openAuthModal();
        return;
    }
    els.profileAvatarLetter.textContent = state.currentUser.name[0].toUpperCase();
    els.profileName.textContent = state.currentUser.name;
    els.profileEmail.textContent = state.currentUser.email;
    els.profileSavedCount.textContent = state.currentUser.saved.length;
    els.profileRatedCount.textContent = Object.keys(state.currentUser.ratings).length;
    els.profileModal.classList.remove('hidden');
});

els.closeProfileModalBtn.addEventListener('click', () => {
    els.profileModal.classList.add('hidden');
});

els.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(LS_CURRENT_USER_KEY);
    state.currentUser = null;
    els.profileModal.classList.add('hidden');
    updateUserUI();
    switchView('catalog');
    openAuthModal();
});

/* ================= ЗАПРОСЫ К TMDB API ================= */

async function tmdbFetch(endpoint) {
    if (!TMDB_TOKEN || TMDB_TOKEN.includes('ВСТАВЬТЕ_ВАШ')) {
        showBanner('Вставьте ваш API Read Access Token в переменную TMDB_TOKEN в начале файла script.js.');
        throw new Error('Missing TMDB token');
    }

    hideBanner();
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${TMDB_TOKEN}`
        }
    });

    if (!response.ok) {
        throw new Error(`Ошибка TMDB API: ${response.status}`);
    }
    return response.json();
}

function showBanner(msg) {
    els.statusBanner.textContent = msg;
    els.statusBanner.classList.remove('hidden');
}

function hideBanner() {
    els.statusBanner.classList.add('hidden');
}

/* ================= НАВИГАЦИЯ И ЭКРАНЫ ================= */

function switchView(view) {
    state.viewMode = view;
    els.catalogView.classList.add('hidden');
    els.mediaDetailsView.classList.add('hidden');
    els.actorDetailsView.classList.add('hidden');
    els.savedNavBtn.classList.remove('active');
    els.backFromSavedBtn.classList.add('hidden');
    els.loadMoreContainer.classList.add('hidden');

    if (view === 'catalog') {
        state.lastListMode = 'catalog';
        els.catalogView.classList.remove('hidden');
        if (state.currentPage < state.totalPages) {
            els.loadMoreContainer.classList.remove('hidden');
        }
    } else if (view === 'saved') {
        state.lastListMode = 'saved';
        els.catalogView.classList.remove('hidden');
        els.savedNavBtn.classList.add('active');
        els.backFromSavedBtn.classList.remove('hidden');
    } else if (view === 'mediaDetails') {
        els.mediaDetailsView.classList.remove('hidden');
    } else if (view === 'actorDetails') {
        els.actorDetailsView.classList.remove('hidden');
    }
}

els.logoBtn.addEventListener('click', () => {
    state.query = '';
    els.searchInput.value = '';
    els.clearSearchBtn.classList.add('hidden');
    switchView('catalog');
    loadCatalog(false);
});

els.tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        els.tabBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.searchType = btn.dataset.type;

        const placeholders = {
            movie: 'Искать фильмы...',
            tv: 'Искать сериалы...',
            person: 'Искать актёров...'
        };
        els.searchInput.placeholder = placeholders[state.searchType];

        switchView('catalog');
        loadCatalog(false);
    });
});

// ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
els.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.query = els.searchInput.value.trim();
    switchView('catalog');
    loadCatalog(false);
});

els.searchInput.addEventListener('input', () => {
    const val = els.searchInput.value.trim();
    els.clearSearchBtn.classList.toggle('hidden', val.length === 0);
    if (val === '' && state.query !== '') {
        state.query = '';
        switchView('catalog');
        loadCatalog(false);
    }
});

els.clearSearchBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    state.query = '';
    els.clearSearchBtn.classList.add('hidden');
    switchView('catalog');
    loadCatalog(false);
});
// ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

// Кнопка «Загрузить ещё»
els.loadMoreBtn.addEventListener('click', () => {
    if (state.currentPage < state.totalPages) {
        loadCatalog(true);
    }
});

els.savedNavBtn.addEventListener('click', () => {
    if (!state.currentUser) {
        openAuthModal();
        return;
    }
    renderSavedPage();
});

els.backFromSavedBtn.addEventListener('click', () => {
    switchView('catalog');
    loadCatalog(false);
});

els.backFromMediaBtn.addEventListener('click', () => {
    if (state.lastListMode === 'saved') {
        renderSavedPage();
    } else {
        switchView('catalog');
    }
});

els.backFromActorBtn.addEventListener('click', () => {
    if (state.lastListMode === 'saved') {
        renderSavedPage();
    } else {
        switchView('catalog');
    }
});

/* ================= ЗАГРУЗКА КАТАЛОГА И ПОИСКА С ПАГИНАЦИЕЙ ================= */

async function loadCatalog(append = false) {
    if (!append) {
        state.currentPage = 1;
        els.cardsGrid.innerHTML = '';
        els.emptyState.classList.add('hidden');
        els.loadMoreContainer.classList.add('hidden');
        els.loader.classList.remove('hidden');
    } else {
        state.currentPage += 1;
        els.loadMoreBtn.disabled = true;
        els.loadMoreBtn.textContent = 'Загрузка...';
    }

    const titlesMap = {
        movie: state.query ? `Результаты поиска фильмов: «${state.query}»` : 'Популярные фильмы',
        tv: state.query ? `Результаты поиска сериалов: «${state.query}»` : 'Популярные сериалы',
        person: state.query ? `Результаты поиска актёров: «${state.query}»` : 'Популярные актёры'
    };
    els.sectionTitle.textContent = titlesMap[state.searchType];

    try {
        const endpoint = state.query
            ? `/search/${state.searchType}?query=${encodeURIComponent(state.query)}&language=ru-RU&page=${state.currentPage}`
            : `/${state.searchType}/popular?language=ru-RU&page=${state.currentPage}`;

        const data = await tmdbFetch(endpoint);
        els.loader.classList.add('hidden');

        state.totalPages = Math.min(data.total_pages || 1, 500);

        if (!data.results || data.results.length === 0) {
            if (!append) {
                els.emptyState.textContent = 'Ничего не найдено по вашему запросу.';
                els.emptyState.classList.remove('hidden');
            }
            els.loadMoreContainer.classList.add('hidden');
            return;
        }

        if (state.searchType === 'person') {
            renderActorCards(data.results, els.cardsGrid, append);
        } else {
            renderMediaCards(data.results, state.searchType, els.cardsGrid, append);
        }

        // Показываем кнопку «Загрузить ещё», если есть следующие страницы
        if (state.viewMode === 'catalog' && state.currentPage < state.totalPages) {
            els.loadMoreContainer.classList.remove('hidden');
        } else {
            els.loadMoreContainer.classList.add('hidden');
        }
    } catch (err) {
        els.loader.classList.add('hidden');
        if (append) {
            state.currentPage -= 1;
        }
        if (err.message !== 'Missing TMDB token') {
            showBanner('Не удалось загрузить данные. Проверьте подключение к сети или токен API.');
        }
    } finally {
        els.loadMoreBtn.disabled = false;
        els.loadMoreBtn.textContent = 'Загрузить ещё';
    }
}

/* ================= ОТРИСОВКА КАРТОЧЕК ================= */
function formatDateRu(dateStr) {
    if (!dateStr) return 'Дата неизвестна';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function renderMediaCards(items, forcedType, container, append = false) {
    if (!append) {
        container.innerHTML = '';
    }

    items.forEach((item) => {
        const mediaType = forcedType || item.media_type || 'movie';
        if (mediaType !== 'movie' && mediaType !== 'tv') return;

        const title = item.title || item.name || 'Без названия';
        const rawDate = item.release_date || item.first_air_date;
        const formattedDate = formatDateRu(rawDate);

        const card = document.createElement('div');
        card.className = 'media-card';

        const posterHtml = buildImgHtml(item.poster_path, title, true);

        const iconSvg =
            mediaType === 'tv'
                ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`
                : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line></svg>`;

        card.innerHTML = `
      <div class="poster-wrapper">
        ${posterHtml}
        <div class="hover-title-overlay"></div>
      </div>
      <div class="card-date-row">
        ${iconSvg}
        <span>${formattedDate}</span>
      </div>
    `;

        card.querySelector('.hover-title-overlay').textContent = title;
        card.addEventListener('click', () => openMediaDetails(mediaType, item.id));
        container.appendChild(card);
    });
}

function renderActorCards(actors, container, append = false) {
    if (!append) {
        container.innerHTML = '';
    }

    actors.forEach((actor) => {
        const knownTitles = (actor.known_for || [])
            .map((k) => k.title || k.name)
            .filter(Boolean)
            .slice(0, 2)
            .join(', ');

        const subtitle =
            knownTitles || (actor.known_for_department === 'Acting' ? 'Актёр' : actor.known_for_department || '');

        const card = document.createElement('div');
        card.className = 'media-card';

        const photoHtml = buildImgHtml(actor.profile_path, actor.name, true);

        card.innerHTML = `
      <div class="poster-wrapper">
        ${photoHtml}
      </div>
      <div class="actor-card-meta">
        <div class="actor-card-name"></div>
        <div class="actor-card-sub"></div>
      </div>
    `;

        const nameEl = card.querySelector('.actor-card-name');
        const subEl = card.querySelector('.actor-card-sub');
        nameEl.textContent = actor.name;
        nameEl.title = actor.name;
        subEl.textContent = subtitle;
        subEl.title = subtitle;

        card.addEventListener('click', () => openActorDetails(actor.id));
        container.appendChild(card);
    });
}

/* ================= СТРАНИЦА СОХРАНЁННЫХ ================= */

function renderSavedPage() {
    switchView('saved');
    els.sectionTitle.textContent = `Мои сохранённые (${state.currentUser.saved.length})`;
    els.loader.classList.add('hidden');
    els.cardsGrid.innerHTML = '';

    if (state.currentUser.saved.length === 0) {
        els.emptyState.textContent = 'Ваш список сохранённого пока пуст. Откройте любой фильм или сериал и нажмите «Сохранить».';
        els.emptyState.classList.remove('hidden');
        return;
    }

    els.emptyState.classList.add('hidden');
    renderMediaCards(state.currentUser.saved, null, els.cardsGrid, false);
}

/* ================= СТРАНИЦА ДЕТАЛЕЙ ФИЛЬМА / СЕРИАЛА ================= */

async function openMediaDetails(mediaType, id) {
  switchView('mediaDetails');
  els.mediaDetailsContent.innerHTML = `
    <div class="loader">
      <div class="spinner"></div>
      <span>Загрузка информации...</span>
    </div>
  `;

  try {
    // Запрашиваем детали на русском, актёров и ВСЕ отзывы без фильтра по языку
    const [details, credits, reviewsData] = await Promise.all([
      tmdbFetch(`/${mediaType}/${id}?language=ru-RU`),
      tmdbFetch(`/${mediaType}/${id}/credits?language=ru-RU`),
      tmdbFetch(`/${mediaType}/${id}/reviews`)
    ]);

    // Если описания или слогана нет на русском — берём английский или любой доступный язык из API
    if (!details.overview || !details.tagline) {
      const detailsEn = await tmdbFetch(`/${mediaType}/${id}?language=en-US`);
      if (!details.overview && detailsEn.overview) {
        details.overview = detailsEn.overview;
      }
      if (!details.tagline && detailsEn.tagline) {
        details.tagline = detailsEn.tagline;
      }

      // Если нет даже на английском — берём первый непустой перевод из /translations
      if (!details.overview) {
        const transData = await tmdbFetch(`/${mediaType}/${id}/translations`);
        const availableTrans = (transData.translations || []).find(
          (t) => t.data && t.data.overview && t.data.overview.trim() !== ''
        );
        if (availableTrans) {
          details.overview = availableTrans.data.overview;
        }
      }
    }

    const reviews = reviewsData.results || [];
    renderMediaDetailsHTML(mediaType, details, credits, reviews);
  } catch (err) {
    els.mediaDetailsContent.innerHTML = `<div class="empty-state">Ошибка при загрузке карточки.</div>`;
  }
}

function renderMediaDetailsHTML(mediaType, data, credits, reviews) {
    const title = data.title || data.name;
    const originalTitle = data.original_title || data.original_name;
    const releaseDate = data.release_date || data.first_air_date;
    const year = releaseDate ? releaseDate.slice(0, 4) : '—';

    let creatorText = '';
    if (mediaType === 'movie') {
        const directors = (credits.crew || []).filter((c) => c.job === 'Director').map((d) => d.name);
        if (directors.length) creatorText = `Режиссёр: ${directors.join(', ')}`;
    } else if (data.created_by && data.created_by.length) {
        creatorText = `Создатели: ${data.created_by.map((c) => c.name).join(', ')}`;
    }

    let runtimeText = '';
    if (mediaType === 'movie' && data.runtime) {
        const h = Math.floor(data.runtime / 60);
        const m = data.runtime % 60;
        runtimeText = h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
    } else if (mediaType === 'tv' && data.number_of_seasons) {
        runtimeText = `Сезонов: ${data.number_of_seasons} (${data.number_of_episodes || 0} сер.)`;
    }

    const genres = (data.genres || []).map((g) => g.name).join(', ');
    const tmdbScore = data.vote_average ? data.vote_average.toFixed(1) : '—';

    const itemKey = `${mediaType}_${data.id}`;
    const isSaved = state.currentUser?.saved.some((s) => s.id === data.id && s.media_type === mediaType);
    const userRating = state.currentUser?.ratings[itemKey];

    const countries = (data.production_countries || []).map((c) => c.name).join(', ') || '—';
    const budget = data.budget ? `$${data.budget.toLocaleString('ru-RU')}` : null;
    const revenue = data.revenue ? `$${data.revenue.toLocaleString('ru-RU')}` : null;

    const extraFields = [
        { label: 'Оригинальное название', value: originalTitle },
        { label: 'Дата выхода', value: formatDateRu(releaseDate) },
        { label: 'Статус', value: data.status || '—' },
        { label: 'Страна', value: countries },
        { label: 'Язык оригинала', value: (data.original_language || '').toUpperCase() },
        ...(budget ? [{ label: 'Бюджет', value: budget }] : []),
        ...(revenue ? [{ label: 'Сборы', value: revenue }] : []),
        ...(data.tagline ? [{ label: 'Слоган', value: `«${data.tagline}»` }] : [])
    ];

    const posterHtml = buildImgHtml(data.poster_path, title, false);

    const castList = (credits.cast || []).slice(0, 18);
    const castSectionHtml = castList.length
        ? `
      <div class="sub-section">
        <h3 class="sub-section-title">Актёры &rsaquo;</h3>
        <div class="cast-row" id="mediaCastRow">
          ${castList
            .map(
                (actor) => `
              <div class="cast-card" data-actor-id="${actor.id}">
                <div class="cast-photo">
                  ${buildImgHtml(actor.profile_path, actor.name, true)}
                </div>
                <div class="cast-name" title="${actor.name}">${actor.name}</div>
                <div class="cast-character" title="${actor.character || ''}">${actor.character || ''}</div>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `
        : '';

    const reviewsSectionHtml =
        reviews.length > 0
            ? `
      <div class="sub-section">
        <h3 class="sub-section-title">Комментарии (${reviews.length}) &rsaquo;</h3>
        <div class="reviews-list">
          ${reviews
                .map(
                    (rev) => `
              <div class="review-card">
                <div class="review-header">
                  <span class="review-author">${rev.author}</span>
                  <span class="review-date">${formatDateRu(rev.created_at)}</span>
                </div>
                <p class="review-text">${rev.content}</p>
              </div>
            `
                )
                .join('')}
        </div>
      </div>
    `
            : '';

    els.mediaDetailsContent.innerHTML = `
    <div class="details-hero">
      <div class="details-poster">${posterHtml}</div>

      <div class="details-info">
        <h1 class="details-title">${title}</h1>
        ${creatorText ? `<div class="details-director">${creatorText}</div>` : ''}

        <div class="details-meta-line">
          <span>${year}</span>
          ${runtimeText ? `<span class="meta-dot">•</span><span>${runtimeText}</span>` : ''}
          ${genres ? `<span class="meta-dot">•</span><span>${genres}</span>` : ''}
        </div>

        <div class="rating-area">
          <button id="toggleRatingBtn" class="single-rating-btn" title="Нажмите, чтобы оценить">
            <span class="star-gold">★ ${tmdbScore}</span>
            <span class="rate-hint">(${data.vote_count || 0} оценок)</span>
            ${userRating
            ? `<span class="user-score-pill">Ваша оценка: ${userRating}/10</span>`
            : `<span class="rate-hint">• Нажмите, чтобы оценить</span>`
        }
          </button>

          <div id="ratingPicker" class="rating-picker hidden">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            .map(
                (num) =>
                    `<button class="score-btn ${userRating === num ? 'active' : ''}" data-score="${num}">${num}</button>`
            )
            .join('')}
            ${userRating ? `<button id="removeScoreBtn" class="clear-score-btn">Убрать</button>` : ''}
          </div>
        </div>

        <p class="details-overview">${data.overview || 'Описание отсутствует.'}</p>

        <div class="extra-info-grid">
          ${extraFields
            .map(
                (f) => `
              <div class="info-item">
                <span class="info-label">${f.label}</span>
                <span class="info-value">${f.value}</span>
              </div>
            `
            )
            .join('')}
        </div>

        <button id="saveMediaBtn" class="save-bookmark-btn ${isSaved ? 'saved' : ''}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>${isSaved ? 'В сохранённых' : 'Сохранить'}</span>
        </button>
      </div>
    </div>

    ${castSectionHtml}
    ${reviewsSectionHtml}
  `;

    const toggleRatingBtn = document.getElementById('toggleRatingBtn');
    const ratingPicker = document.getElementById('ratingPicker');

    toggleRatingBtn.addEventListener('click', () => {
        if (!state.currentUser) {
            openAuthModal();
            return;
        }
        ratingPicker.classList.toggle('hidden');
    });

    ratingPicker.querySelectorAll('.score-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const score = Number(btn.dataset.score);
            state.currentUser.ratings[itemKey] = score;
            updateCurrentUserInStorage();
            renderMediaDetailsHTML(mediaType, data, credits, reviews);
        });
    });

    const removeScoreBtn = document.getElementById('removeScoreBtn');
    if (removeScoreBtn) {
        removeScoreBtn.addEventListener('click', () => {
            delete state.currentUser.ratings[itemKey];
            updateCurrentUserInStorage();
            renderMediaDetailsHTML(mediaType, data, credits, reviews);
        });
    }

    const saveMediaBtn = document.getElementById('saveMediaBtn');
    saveMediaBtn.addEventListener('click', () => {
        if (!state.currentUser) {
            openAuthModal();
            return;
        }
        const existingIdx = state.currentUser.saved.findIndex(
            (s) => s.id === data.id && s.media_type === mediaType
        );

        if (existingIdx !== -1) {
            state.currentUser.saved.splice(existingIdx, 1);
        } else {
            state.currentUser.saved.unshift({
                id: data.id,
                media_type: mediaType,
                title,
                poster_path: data.poster_path,
                release_date: releaseDate
            });
        }

        updateCurrentUserInStorage();
        renderMediaDetailsHTML(mediaType, data, credits, reviews);
    });

    document.querySelectorAll('#mediaCastRow .cast-card').forEach((card) => {
        card.addEventListener('click', () => {
            openActorDetails(card.dataset.actorId);
        });
    });
}

/* ================= СТРАНИЦА ДЕТАЛЕЙ АКТЁРА ================= */

async function openActorDetails(actorId) {
    switchView('actorDetails');
    els.actorDetailsContent.innerHTML = `
    <div class="loader">
      <div class="spinner"></div>
      <span>Загрузка профиля актёра...</span>
    </div>
  `;

    try {
        const [person, credits] = await Promise.all([
            tmdbFetch(`/person/${actorId}?language=ru-RU`),
            tmdbFetch(`/person/${actorId}/combined_credits?language=ru-RU`)
        ]);

        let biography = person.biography;
        if (!biography) {
            const personEn = await tmdbFetch(`/person/${actorId}?language=en-US`);
            biography = personEn.biography || 'Биография отсутствует.';
        }

        const photoHtml = buildImgHtml(person.profile_path, person.name, false);

        const extraActorFields = [
            { label: 'Дата рождения', value: person.birthday ? formatDateRu(person.birthday) : 'Неизвестно' },
            ...(person.deathday ? [{ label: 'Дата смерти', value: formatDateRu(person.deathday) }] : []),
            { label: 'Место рождения', value: person.place_of_birth || 'Неизвестно' },
            { label: 'Известность', value: person.known_for_department || 'Актёрское мастерство' }
        ];

        els.actorDetailsContent.innerHTML = `
      <div class="details-hero">
        <div class="details-poster">${photoHtml}</div>

        <div class="details-info">
          <h1 class="details-title">${person.name}</h1>

          <div class="extra-info-grid">
            ${extraActorFields
                .map(
                    (f) => `
                <div class="info-item">
                  <span class="info-label">${f.label}</span>
                  <span class="info-value">${f.value}</span>
                </div>
              `
                )
                .join('')}
          </div>

          <p class="details-overview">${biography}</p>
        </div>
      </div>

      <div class="sub-section">
        <h3 class="sub-section-title">Фильмы и сериалы с участием &rsaquo;</h3>
        <div id="actorCreditsGrid" class="cards-grid"></div>
      </div>
    `;

        const excludedGenres = new Set([10767, 10763]);
        const selfRoleRegex = /^(self|himself|herself|самого себя|саму себя)\b/i;

        const uniqueCredits = [];
        const seen = new Set();

        (credits.cast || [])
            .filter((item) => {
                if (item.media_type !== 'movie' && item.media_type !== 'tv') return false;
                const genres = item.genre_ids || [];
                if (genres.some((id) => excludedGenres.has(id))) return false;
                if (item.character && selfRoleRegex.test(item.character.trim())) return false;
                return true;
            })
            // Сортируем по количеству оценок зрителей, чтобы известные фильмы шли первыми
            .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
            .forEach((item) => {
                const key = `${item.media_type}_${item.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueCredits.push(item);
                }
            });
        const creditsGrid = document.getElementById('actorCreditsGrid');
        if (uniqueCredits.length === 0) {
            creditsGrid.innerHTML = `<div class="empty-state">Фильмография не найдена.</div>`;
        } else {
            renderMediaCards(uniqueCredits.slice(0, 24), null, creditsGrid, false);
        }
    } catch (err) {
        els.actorDetailsContent.innerHTML = `<div class="empty-state">Ошибка при загрузке данных актёра.</div>`;
    }
}

/* ================= ЗАПУСК ПРИЛОЖЕНИЯ ================= */
loadSession();
loadCatalog(false);