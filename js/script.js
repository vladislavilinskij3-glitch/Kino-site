const API_BASE = 'https://kinopoiskapiunofficial.tech/api/';
const API_KEY = 'd4a54efa-0d5b-462e-b1c1-ef51222a49af';

const API_HEADERS = { 
    'X-API-KEY': API_KEY, 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

let currentPage = 1;
let totalPages = 1;
let allMovies = [];

async function fetchAPI(url) {
    try {
        const response = await fetch(url, { headers: API_HEADERS });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Ошибка HTTP ${response.status}:`, errorBody);
            return null;
        }
        const data = await response.json();
        if (data.error || data.message) {
            console.error(' Ошибка от API:', data.message);
            return null;
        }
        return data;
    } catch (error) {
        console.error(' Ошибка в fetchAPI:', error);
        return null;
    }
}

function getCurrentPage() {
    const path = window.location.pathname.split('/').pop();
    if (path === 'top20.html') return 'top20';
    if (path === 'film.html') return 'film';
    return 'index';
}


// ЗАГРУЗКА ФИЛЬМОВ
// ==========================================================
async function loadMovies(page = 1) {
    const pageType = getCurrentPage();
    let url = '';
    const params = new URLSearchParams(window.location.search);
    const topParam = parseInt(params.get('top')) || 20;
    currentPage = page;

    if (pageType === 'top20') {
        url = `${API_BASE}v2.2/films/collections?type=TOP_250_MOVIES&page=1`;
    } else {
        url = `${API_BASE}v2.2/films/collections?type=TOP_POPULAR_ALL&page=${page}`;
    }

    const data = await fetchAPI(url);
    
    if (!data) {
        document.getElementById('movies-container').innerHTML = `
            <p style="text-align:center; color:#dc3545; padding:40px; font-size:1.2rem;">
                ⚠️ Ошибка соединения с сервером или неверный API-ключ.<br>
                Проверьте консоль браузера (F12) или замените ключ API.
            </p>
        `;
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    const items = data.items || data.films || [];

    if (items.length === 0) {
        document.getElementById('movies-container').innerHTML = `
            <p style="text-align:center; color:#dc3545; padding:40px; font-size:1.2rem;">
                ⚠️ Не удалось загрузить список фильмов.
            </p>
        `;
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    if (pageType === 'top20') {
        allMovies = items;
        applyFiltersAndSort(topParam);
    } else {
        totalPages = data.totalPages || data.pages || 1;
        renderPagination();
        renderMovies(items);
    }
}

// ==========================================================
// ОТРИСОВКА КАРТОЧЕК (index.html)
// ==========================================================
function renderMovies(items) {
    const container = document.getElementById('movies-container');
    if (!items || items.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:40px;">Ничего не найдено.</p>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const img = item.posterUrlPreview || item.posterUrl || 'https://via.placeholder.com/300x450?text=No+Image';
        const rating = item.ratingImdb || item.ratingKinopoisk || item.rating || 0;
        const year = item.year || '—';
        let ratingClass = 'rating';
        if (rating >= 8) ratingClass += ' green';
        else if (rating >= 6) ratingClass += ' yellow';
        else ratingClass += ' red';

        const filmId = item.kinopoiskId || item.filmId || '';
        return `
            <div class="movie-card" onclick="window.location.href='film.html?id=${filmId}'">
                <img src="${img}" alt="${item.nameRu || item.nameEn || 'Без названия'}" class="movie-poster">
                <div class="movie-info">
                    <div class="movie-title">${item.nameRu || item.nameEn || 'Без названия'}</div>
                    <div class="movie-meta">
                        <span>${year}</span>
                        <span class="${ratingClass}">${rating}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================================
// ЛОГИКА ДЛЯ TOP-20 (ФИЛЬТРАЦИЯ И СОРТИРОВКА)
// ==========================================================
function applyFiltersAndSort(topLimitFromURL) {
    const params = new URLSearchParams(window.location.search);
    const topLimit = topLimitFromURL || parseInt(params.get('top')) || 20;
    const searchText = params.get('search') || '';
    const order = params.get('order') || 'default';

    let filtered = allMovies.slice(0, topLimit);

    // Если есть текст поиска, фильтруем список локально
    if (searchText) {
        const lower = searchText.toLowerCase();
        filtered = filtered.filter(item => {
            const title = (item.nameRu || item.nameEn || '').toLowerCase();
            return title.includes(lower);
        });
    }

    // Сортировка
    if (order === 'new') {
        filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (order === 'old') {
        filtered.sort((a, b) => (a.year || 0) - (b.year || 0));
    }

    const itemsPerPage = 15;
    totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);

    renderTopList(paginated, start);
    renderTopPagination();
}

function renderTopList(items, startIndex) {
    const container = document.getElementById('movies-container');
    if (!items || items.length === 0) {
        container.innerHTML = `
            <p style="text-align:center; color:#94a3b8; padding:40px; font-size:1.2rem;">
                🤷 Ничего не найдено по вашему запросу.
            </p>
        `;
        return;
    }

    container.innerHTML = items.map((item, index) => {
        const img = item.posterUrlPreview || item.posterUrl || 'https://via.placeholder.com/300x450?text=No+Image';
        const rating = item.ratingImdb || item.ratingKinopoisk || item.rating || 0;
        const year = item.year || '—';
        const genres = item.genres ? item.genres.map(g => g.genre).join(', ') : '';

        const filmId = item.kinopoiskId || item.filmId || '';
        const globalIndex = startIndex + index + 1;

        return `
            <div class="movie-row" onclick="window.location.href='film.html?id=${filmId}'">
                <div class="row-number">${globalIndex}</div>
                <img src="${img}" alt="${item.nameRu || item.nameEn || 'Без названия'}" class="row-poster">
                <div class="row-info">
                    <div class="row-title">${item.nameRu || item.nameEn || 'Без названия'}</div>
                    <div class="row-meta">
                        <span>${genres}</span>
                        <span>${year}</span>
                    </div>
                </div>
                <div class="row-rating">${rating}</div>
            </div>
        `;
    }).join('');
}

// ==========================================================
// ПАГИНАЦИЯ
// ==========================================================
function renderTopPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;
    const params = new URLSearchParams(window.location.search);

    container.innerHTML = `
        <div class="top-pagination">
            <button class="page-btn" onclick="changeTopPage('prev')" ${currentPage <= 1 ? 'disabled' : ''}>&lt;</button>
            <span class="page-info">${currentPage} / ${totalPages}</span>
            <button class="page-btn" onclick="changeTopPage('next')" ${currentPage >= totalPages ? 'disabled' : ''}>&gt;</button>
        </div>
    `;
}

function changeTopPage(direction) {
    let newPage = currentPage;
    if (direction === 'next') newPage++;
    else if (direction === 'prev') newPage--;
    if (newPage < 1 || newPage > totalPages) return;

    const params = new URLSearchParams(window.location.search);
    const top = params.get('top') || 20;
    const search = params.get('search') || '';
    const order = params.get('order') || 'default';

    let url = `top20.html?top=${top}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (order !== 'default') url += `&order=${order}`;
    url += `&page=${newPage}`;
    window.location.href = url;
}

function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;
    container.innerHTML = `
        <div class="pagination">
            <button onclick="changePage('prev')" ${currentPage <= 1 ? 'disabled' : ''}>← Назад</button>
            <span class="page-info">Страница ${currentPage} из ${totalPages}</span>
            <button onclick="changePage('next')" ${currentPage >= totalPages ? 'disabled' : ''}>Вперед →</button>
        </div>
    `;
}

function changePage(direction) {
    let newPage = currentPage;
    if (direction === 'next') newPage++;
    else if (direction === 'prev') newPage--;
    if (newPage < 1 || newPage > totalPages) return;

    const pageType = getCurrentPage();
    const params = new URLSearchParams(window.location.search);
    const top = params.get('top') || 20;
    const order = params.get('order') || 'default';

    let url = '';
    if (pageType === 'top20') {
        url = `top20.html?top=${top}`;
        if (order !== 'default') url += `&order=${order}`;
        url += `&page=${newPage}`;
    } else {
        url = `index.html?page=${newPage}`;
    }
    window.location.href = url;
}

// ==========================================================
// ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИКИ СОБЫТИЙ
// ==========================================================
document.addEventListener('DOMContentLoaded', function() {
    const pageType = getCurrentPage();
    
    const tabBtns = document.querySelectorAll('.top-tabs .tab-btn');
    if (tabBtns.length) {
        const params = new URLSearchParams(window.location.search);
        const currentTop = params.get('top') || '20';
        tabBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.top === currentTop) btn.classList.add('active');
        });
    }

    // ОБРАБОТКА ПОИСКА В ТОП-20
    const topSearchInput = document.getElementById('top-search-input');
    const topSearchBtn = document.getElementById('top-search-btn');
    
    if (topSearchInput && topSearchBtn) {
        const performTopSearch = () => {
            const val = topSearchInput.value.trim();
            if (val) {
                const params = new URLSearchParams(window.location.search);
                const top = params.get('top') || 20;
                const order = params.get('order') || 'default';
                let url = `top20.html?top=${top}`;
                if (val) url += `&search=${encodeURIComponent(val)}`;
                if (order !== 'default') url += `&order=${order}`;
                window.location.href = url;
            }
        };

        topSearchBtn.addEventListener('click', performTopSearch);
        topSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performTopSearch();
            }
        });
    }

    const orderSelect = document.getElementById('top-order-select');
    if (orderSelect) {
        const params = new URLSearchParams(window.location.search);
        orderSelect.value = params.get('order') || 'default';
        orderSelect.addEventListener('change', function() {
            const val = this.value;
            const params = new URLSearchParams(window.location.search);
            const top = params.get('top') || 20;
            let url = `top20.html?top=${top}`;
            if (val !== 'default') url += `&order=${val}`;
            window.location.href = url;
        });
    }

    const subBtn = document.getElementById('subscribe-newsletter-btn');
    if (subBtn) {
        subBtn.addEventListener('click', () => {
            const input = document.getElementById('newsletter-email');
            const email = input.value.trim();
            if (!email || !email.includes('@')) {
                alert('Пожалуйста, введите корректный Email!');
                return;
            }
            console.log(`📧 Подписка оформлена на email: ${email}`);
            alert(`Спасибо, ${email}! Вы подписались на новости.`);
            input.value = '';
        });
    }
});

const navLinks = document.querySelectorAll('nav a');
navLinks.forEach(link => {
    if (link.href === window.location.href) link.classList.add('active');
});

// ==========================================================
// ЗАПУСК
// ==========================================================
const page = getCurrentPage();
const urlParams = new URLSearchParams(window.location.search);
const pageParam = parseInt(urlParams.get('page')) || 1;
currentPage = pageParam;

if (page === 'film') {
    loadFilmPage();
} else {
    loadMovies(pageParam);
}

// ==========================================================
// СТРАНИЦА ФИЛЬМА (film.html) 
// ==========================================================
async function loadFilmPage() {
    const params = new URLSearchParams(window.location.search);
    const filmId = params.get('id');

    if (!filmId || isNaN(parseInt(filmId))) {
        document.querySelector('.film-page').innerHTML = `
            <p style="color: #ef4444; text-align:center; padding:40px;">
                ❌ Неверный ID фильма. Пожалуйста, вернитесь на главную страницу и попробуйте снова.
            </p>
        `;
        return;
    }

    const filmData = await fetchAPI(`${API_BASE}v2.2/films/${filmId}`);
    if (!filmData) {
        document.querySelector('.film-page').innerHTML = '<p style="color: #ef4444; text-align:center;">Ошибка загрузки данных.</p>';
        return;
    }

    const actorsData = await fetchAPI(`${API_BASE}v1/staff?filmId=${filmId}`);
    const similarData = await fetchAPI(`${API_BASE}v2.2/films/${filmId}/similars`);

    renderFilmPage(filmData, actorsData, similarData);
}

function renderFilmPage(film, actors, similar) {
    const poster = film.posterUrl || 'https://via.placeholder.com/300x450?text=No+Image';
    const genres = film.genres ? film.genres.map(g => g.genre).join(' • ') : '';
    const rating = film.ratingKinopoisk || film.ratingImdb || 0;

    document.getElementById('film-poster').src = poster;
    document.getElementById('film-title').textContent = film.nameRu || film.nameEn || 'Без названия';
    document.getElementById('film-tags').innerHTML = `
        <span>${film.year || '—'}</span>
        <span>${film.ageRating || '0+'} </span>
        <span>${film.filmLength ? film.filmLength + ' мин' : '—'}</span>
        <span>${genres}</span>
    `;
    document.getElementById('film-rating').innerHTML = `⭐ ${rating}`;
    document.getElementById('film-description').textContent = film.description || 'Описание недоступно.';

    const castContainer = document.getElementById('cast-list');
    if (actors && actors.length) {
        castContainer.innerHTML = actors.map(person => {
            const img = person.posterUrl || 'https://via.placeholder.com/80x80?text=No+Photo';
            return `
                <div class="cast-member">
                    <img src="${img}" alt="${person.nameRu || person.nameEn || 'Актёр'}">
                    <div class="name">${person.nameRu || person.nameEn || 'Актёр'}</div>
                    <div class="role">${person.profession || 'Актёр'}</div>
                </div>
            `;
        }).join('');
    } else {
        castContainer.innerHTML = '<p style="color: #94a3b8;">Информация об актёрах отсутствует.</p>';
    }

    const similarContainer = document.getElementById('similar-grid');
    if (similar && similar.items && similar.items.length) {
        similarContainer.innerHTML = similar.items.map(item => {
            const img = item.posterUrl || 'https://via.placeholder.com/160x240?text=No+Image';
            return `
                <div class="similar-card" onclick="window.location.href='film.html?id=${item.filmId}'">
                    <img src="${img}" alt="${item.nameRu || item.nameEn || 'Без названия'}">
                    <div class="title">${item.nameRu || item.nameEn || 'Без названия'}</div>
                </div>
            `;
        }).join('');
    } else {
        similarContainer.innerHTML = '<p style="color: #94a3b8;">Похожие фильмы не найдены.</p>';
    }
}