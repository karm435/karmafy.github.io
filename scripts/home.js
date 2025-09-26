document.addEventListener('DOMContentLoaded', () => {
    const appsGrid = document.getElementById('live-apps-grid');
    const upcomingSection = document.getElementById('upcoming-apps-section');
    if (upcomingSection) {
        upcomingSection.style.display = 'none';
    }

    if (!appsGrid) {
        return;
    }

    const SEARCH_URL = 'https://itunes.apple.com/search?term=Karmjit%20Singh&entity=software&limit=50';

    function createSkeleton(count) {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const card = document.createElement('div');
            card.className = 'app-card bg-white rounded-xl shadow-lg overflow-hidden skeleton-card';

            const preview = document.createElement('div');
            preview.className = 'app-screenshots-preview skeleton-block';
            card.appendChild(preview);

            const body = document.createElement('div');
            body.className = 'p-6 pt-12';

            const title = document.createElement('div');
            title.className = 'h-6 w-2/3 mb-3 skeleton-line';
            const desc = document.createElement('div');
            desc.className = 'h-4 w-full mb-2 skeleton-line';
            const desc2 = document.createElement('div');
            desc2.className = 'h-4 w-5/6 mb-4 skeleton-line';

            const actions = document.createElement('div');
            actions.className = 'flex justify-between items-center mt-4';
            const btn1 = document.createElement('div');
            btn1.className = 'h-8 w-28 rounded-lg skeleton-line';
            const btn2 = document.createElement('div');
            btn2.className = 'h-8 w-32 rounded-lg skeleton-line';
            actions.appendChild(btn1);
            actions.appendChild(btn2);

            body.appendChild(title);
            body.appendChild(desc);
            body.appendChild(desc2);
            body.appendChild(actions);

            card.appendChild(body);
            fragment.appendChild(card);
        }
        return fragment;
    }

    function starRating(rating) {
        const max = 5;
        const filled = Math.round(Math.min(Math.max(rating || 0, 0), max));
        let stars = '';
        for (let i = 1; i <= max; i++) {
            stars += `<span class="inline-block text-yellow-400">${i <= filled ? '★' : '☆'}</span>`;
        }
        return stars;
    }

    function trimText(text, maxLen = 140) {
        if (!text) return '';
        if (text.length <= maxLen) return text;
        return text.slice(0, maxLen - 1).trim() + '…';
    }

    function extractPrimaryScreenshots(result) {
        const phone = Array.isArray(result.screenshotUrls) ? result.screenshotUrls : [];
        const ipad = Array.isArray(result.ipadScreenshotUrls) ? result.ipadScreenshotUrls : [];
        const pool = phone.length ? phone : ipad;
        return pool.slice(0, 3);
    }

    function renderCard(app, index) {
        const card = document.createElement('div');
        card.className = 'app-card bg-white rounded-xl shadow-lg overflow-hidden animate-fadeIn reveal';
        card.style.animationDelay = `${0.1 + index * 0.05}s`;

        const screenshots = extractPrimaryScreenshots(app);
        const preview = document.createElement('div');
        preview.className = 'app-screenshots-preview';
        if (screenshots.length) {
            screenshots.forEach((src, i) => {
                const img = document.createElement('img');
                img.src = src;
                img.alt = `${app.trackName} Screenshot ${i + 1}`;
                img.className = 'app-screenshot-preview';
                img.loading = 'lazy';
                preview.appendChild(img);
            });
        } else {
            preview.classList.add('bg-gradient');
        }
        card.appendChild(preview);

        const icon = document.createElement('img');
        icon.src = app.artworkUrl100 || app.artworkUrl512 || app.artworkUrl60;
        icon.alt = `${app.trackName} App Icon`;
        icon.className = 'app-icon';
        card.appendChild(icon);

        const body = document.createElement('div');
        body.className = 'p-6 pt-12';

        const title = document.createElement('h3');
        title.className = 'text-xl font-semibold mb-2 mt-2';
        title.textContent = app.trackName;

        const subtitle = document.createElement('div');
        subtitle.className = 'flex flex-wrap items-center gap-3 mb-4';
        subtitle.innerHTML = `
            <span class="text-sm text-gray-500">${app.primaryGenreName || ''}</span>
            <span class="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-600">${app.formattedPrice || (app.price === 0 ? 'Free' : (app.price + ' ' + (app.currency || '')))}</span>
            <span class="text-sm text-gray-600">${starRating(app.averageUserRating)} <span class="ml-1 text-gray-400">(${app.userRatingCount || 0})</span></span>
        `;

        const desc = document.createElement('p');
        desc.className = 'text-gray-600 mb-4 text-sm leading-relaxed';
        desc.textContent = trimText(app.description, 180);

        const actions = document.createElement('div');
        actions.className = 'flex justify-between items-center mt-4';

        const details = document.createElement('a');
        details.href = `app-detail.html?id=${encodeURIComponent(app.trackId)}`;
        details.className = 'text-sm text-indigo-500 hover:underline';
        details.textContent = 'View Details';

        const store = document.createElement('a');
        store.href = app.trackViewUrl;
        store.target = '_blank';
        store.rel = 'noopener noreferrer';
        store.className = 'inline-block bg-indigo-600 text-white text-sm py-2 px-5 rounded-lg hover:bg-indigo-700 transition duration-300';
        store.textContent = 'App Store →';

        actions.appendChild(details);
        actions.appendChild(store);

        body.appendChild(title);
        body.appendChild(subtitle);
        body.appendChild(desc);
        body.appendChild(actions);

        card.appendChild(body);
        return card;
    }

    function renderApps(apps) {
        appsGrid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        apps.forEach((app, i) => fragment.appendChild(renderCard(app, i)));
        appsGrid.appendChild(fragment);
        setupReveal();
    }

    function setupReveal() {
        const items = document.querySelectorAll('.reveal');
        if (!('IntersectionObserver' in window)) return;
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.15 });
        items.forEach(i => observer.observe(i));
    }

    function saveCache(results) {
        try {
            const data = { timestamp: Date.now(), results };
            localStorage.setItem('karmafyApps', JSON.stringify(data));
        } catch {}
    }

    function load() {
        appsGrid.appendChild(createSkeleton(6));
        fetch(SEARCH_URL, { cache: 'no-store' })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(json => {
                const results = Array.isArray(json.results) ? json.results : [];
                const apps = results.filter(r => r.wrapperType === 'software' || r.kind === 'software');

                function enrichAppsWithScreenshots(items) {
                    const missing = items.filter(a => {
                        const phone = Array.isArray(a.screenshotUrls) ? a.screenshotUrls : [];
                        const ipad = Array.isArray(a.ipadScreenshotUrls) ? a.ipadScreenshotUrls : [];
                        return phone.length === 0 && ipad.length === 0;
                    });
                    if (missing.length === 0) return Promise.resolve(items);

                    const ids = missing.map(a => a.trackId).filter(Boolean);
                    if (ids.length === 0) return Promise.resolve(items);

                    const LOOKUP = `https://itunes.apple.com/lookup?id=${ids.join(',')}`;
                    return fetch(LOOKUP, { cache: 'no-store' })
                        .then(r => r.ok ? r.json() : Promise.reject(new Error('Lookup failed')))
                        .then(data => {
                            const list = Array.isArray(data.results) ? data.results : [];
                            const byId = new Map(list.map(x => [x.trackId, x]));
                            return items.map(a => {
                                const d = byId.get(a.trackId);
                                if (!d) return a;
                                return Object.assign({}, a, {
                                    screenshotUrls: Array.isArray(a.screenshotUrls) && a.screenshotUrls.length ? a.screenshotUrls : d.screenshotUrls,
                                    ipadScreenshotUrls: Array.isArray(a.ipadScreenshotUrls) && a.ipadScreenshotUrls.length ? a.ipadScreenshotUrls : d.ipadScreenshotUrls,
                                    artworkUrl512: a.artworkUrl512 || d.artworkUrl512,
                                    artworkUrl100: a.artworkUrl100 || d.artworkUrl100,
                                    artworkUrl60: a.artworkUrl60 || d.artworkUrl60,
                                    trackViewUrl: a.trackViewUrl || d.trackViewUrl
                                });
                            });
                        })
                        .catch(() => items);
                }

                return enrichAppsWithScreenshots(apps).then(merged => {
                    saveCache(merged);
                    renderApps(merged);
                });
            })
            .catch(() => {
                appsGrid.innerHTML = '<div class="col-span-full text-center text-gray-500">Unable to load apps right now. Please try again later.</div>';
            });
    }

    load();
});


