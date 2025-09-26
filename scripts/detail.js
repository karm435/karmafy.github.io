document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    const trackId = params.get('id');
    const appSlug = params.get('app');

    const appNameHeading = document.getElementById('app-name');
    const appTagline = document.getElementById('app-tagline');
    const screenshotsContainer = document.getElementById('screenshots-container');
    const loadingPlaceholder = document.getElementById('loading-placeholder');

    function performLookupById(id) {
        const LOOKUP_URL = `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`;
        return fetch(LOOKUP_URL, { cache: 'no-store' }).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        }).then(json => (json && Array.isArray(json.results) && json.results[0]) || null);
    }

    function performSearchBySlug(slug) {
        const pretty = slug.replace(/[-_]+/g, ' ').trim();
        const SEARCH_URL = `https://itunes.apple.com/search?term=${encodeURIComponent(pretty)}&entity=software&limit=10`;
        return fetch(SEARCH_URL, { cache: 'no-store' }).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        }).then(json => {
            const results = (json && Array.isArray(json.results)) ? json.results : [];
            const filtered = results.filter(r => (r.wrapperType === 'software' || r.kind === 'software') && (r.artistName || '').toLowerCase().includes('karmjit'));
            return filtered[0] || results[0] || null;
        });
    }

    function renderApp(app) {
        if (!app) throw new Error('App not found');

        const title = app.trackName || 'App';
        appNameHeading.textContent = title;
        document.title = `${title} Details - Karmafy`;
        const price = app.formattedPrice || (app.price === 0 ? 'Free' : `${app.price} ${app.currency || ''}`);
        const tagline = `${app.primaryGenreName || ''} • ${price}`.trim();
        appTagline.textContent = tagline;

        screenshotsContainer.innerHTML = '';

        // Create hero section
        const hero = createHeroSection(app);
        screenshotsContainer.appendChild(hero);

        // Create tabbed content
        const tabbedContent = createTabbedContent(app);
        screenshotsContainer.appendChild(tabbedContent);

        loadingPlaceholder.style.display = 'none';
        setupScrollAnimations();
        setupTabs();
    }

    function createHeroSection(app) {
        const hero = document.createElement('div');
        hero.className = 'bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 mb-8 scroll-animate';

        const heroContent = document.createElement('div');
        heroContent.className = 'flex flex-col lg:flex-row items-center gap-8';

        // App icon and basic info
        const iconSection = document.createElement('div');
        iconSection.className = 'flex-shrink-0 text-center';

        const icon = document.createElement('img');
        icon.src = app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60;
        icon.alt = `${app.trackName} icon`;
        icon.className = 'w-32 h-32 rounded-3xl shadow-xl mx-auto mb-4';

        const storeButton = document.createElement('a');
        storeButton.href = app.trackViewUrl;
        storeButton.target = '_blank';
        storeButton.rel = 'noopener noreferrer';
        storeButton.className = 'inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition duration-300 shadow-lg hover:shadow-xl';
        storeButton.innerHTML = `
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
            </svg>
            App Store
        `;

        iconSection.appendChild(icon);
        iconSection.appendChild(storeButton);

        // App metadata
        const metaSection = document.createElement('div');
        metaSection.className = 'flex-1';

        const metaTitle = document.createElement('h2');
        metaTitle.className = 'text-3xl font-bold text-gray-900 mb-2';
        metaTitle.textContent = app.trackName;

        const metaSubtitle = document.createElement('div');
        metaSubtitle.className = 'flex flex-wrap items-center gap-4 mb-6';
        
        const rating = app.averageUserRating || 0;
        const ratingCount = app.userRatingCount || 0;
        const stars = Array.from({length: 5}, (_, i) => i < Math.round(rating) ? '★' : '☆').join('');
        
        metaSubtitle.innerHTML = `
            <span class="text-lg font-semibold text-indigo-600">${app.formattedPrice || (app.price === 0 ? 'Free' : `$${app.price}`)}</span>
            <span class="text-yellow-500 font-medium">${stars} (${ratingCount})</span>
            <span class="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">${app.primaryGenreName || 'App'}</span>
        `;

        const description = document.createElement('p');
        description.className = 'text-gray-700 leading-relaxed text-lg';
        description.textContent = (app.description || '').split('\n')[0] || '';

        const features = document.createElement('div');
        features.className = 'mt-6 grid grid-cols-2 md:grid-cols-4 gap-4';
        
        const featureItems = [
            { label: 'Version', value: app.version || 'N/A' },
            { label: 'Size', value: formatFileSize(app.fileSizeBytes) },
            { label: 'Rating', value: `${rating.toFixed(1)}/5` },
            { label: 'Reviews', value: formatNumber(ratingCount) }
        ];

        featureItems.forEach(item => {
            const feature = document.createElement('div');
            feature.className = 'text-center p-3 bg-white rounded-lg shadow-sm';
            feature.innerHTML = `
                <div class="text-sm text-gray-500">${item.label}</div>
                <div class="text-lg font-semibold text-gray-900">${item.value}</div>
            `;
            features.appendChild(feature);
        });

        metaSection.appendChild(metaTitle);
        metaSection.appendChild(metaSubtitle);
        metaSection.appendChild(description);
        metaSection.appendChild(features);

        heroContent.appendChild(iconSection);
        heroContent.appendChild(metaSection);
        hero.appendChild(heroContent);

        return hero;
    }

    function createTabbedContent(app) {
        const container = document.createElement('div');
        container.className = 'scroll-animate';

        // Tab navigation
        const tabNav = document.createElement('div');
        tabNav.className = 'flex border-b border-gray-200 mb-8';
        
        const tabs = [
            { id: 'screenshots', label: 'Screenshots', active: true },
            { id: 'description', label: 'Description' },
            { id: 'details', label: 'Details' }
        ];

        tabs.forEach(tab => {
            const button = document.createElement('button');
            button.className = `px-6 py-3 font-medium text-sm border-b-2 transition-colors duration-200 ${
                tab.active 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`;
            button.textContent = tab.label;
            button.dataset.tab = tab.id;
            tabNav.appendChild(button);
        });

        // Tab content
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';

        // Screenshots tab
        const screenshotsTab = createScreenshotsTab(app);
        screenshotsTab.id = 'screenshots-content';
        screenshotsTab.className = 'tab-pane active';

        // Description tab
        const descriptionTab = createDescriptionTab(app);
        descriptionTab.id = 'description-content';
        descriptionTab.className = 'tab-pane hidden';

        // Details tab
        const detailsTab = createDetailsTab(app);
        detailsTab.id = 'details-content';
        detailsTab.className = 'tab-pane hidden';

        tabContent.appendChild(screenshotsTab);
        tabContent.appendChild(descriptionTab);
        tabContent.appendChild(detailsTab);

        container.appendChild(tabNav);
        container.appendChild(tabContent);

        return container;
    }

    function createScreenshotsTab(app) {
        const tab = document.createElement('div');
        
        const phoneShots = Array.isArray(app.screenshotUrls) ? app.screenshotUrls : [];
        const ipadShots = Array.isArray(app.ipadScreenshotUrls) ? app.ipadScreenshotUrls : [];
        
        if (phoneShots.length > 0) {
            const phoneSection = document.createElement('div');
            phoneSection.className = 'mb-8';
            
            const phoneTitle = document.createElement('h3');
            phoneTitle.className = 'text-xl font-semibold mb-4 text-gray-800';
            phoneTitle.textContent = 'iPhone Screenshots';
            
            const phoneGallery = buildGallery(phoneShots, 'phone');
            phoneSection.appendChild(phoneTitle);
            phoneSection.appendChild(phoneGallery);
            tab.appendChild(phoneSection);
        }
        
        if (ipadShots.length > 0) {
            const ipadSection = document.createElement('div');
            ipadSection.className = 'mb-8';
            
            const ipadTitle = document.createElement('h3');
            ipadTitle.className = 'text-xl font-semibold mb-4 text-gray-800';
            ipadTitle.textContent = 'iPad Screenshots';
            
            const ipadGallery = buildGallery(ipadShots, 'ipad');
            ipadSection.appendChild(ipadTitle);
            ipadSection.appendChild(ipadGallery);
            tab.appendChild(ipadSection);
        }
        
        if (phoneShots.length === 0 && ipadShots.length === 0) {
            tab.innerHTML = '<div class="text-center py-12 text-gray-500">No screenshots available</div>';
        }
        
        return tab;
    }

    function createDescriptionTab(app) {
        const tab = document.createElement('div');
        tab.className = 'prose max-w-none';
        
        const description = app.description || '';
        const paragraphs = description.split('\n').filter(p => p.trim());
        
        if (paragraphs.length > 0) {
            paragraphs.forEach(paragraph => {
                const p = document.createElement('p');
                p.className = 'text-gray-700 leading-relaxed mb-4';
                p.textContent = paragraph.trim();
                tab.appendChild(p);
            });
        } else {
            tab.innerHTML = '<div class="text-center py-12 text-gray-500">No description available</div>';
        }
        
        if (app.releaseNotes) {
            const notesTitle = document.createElement('h3');
            notesTitle.className = 'text-xl font-semibold mt-8 mb-4 text-gray-800';
            notesTitle.textContent = "What's New";
            
            const notes = document.createElement('div');
            notes.className = 'bg-blue-50 p-6 rounded-lg';
            notes.innerHTML = `<p class="text-gray-700 leading-relaxed">${app.releaseNotes}</p>`;
            
            tab.appendChild(notesTitle);
            tab.appendChild(notes);
        }
        
        return tab;
    }

    function createDetailsTab(app) {
        const tab = document.createElement('div');
        
        const details = [
            { label: 'Version', value: app.version || 'N/A' },
            { label: 'Size', value: formatFileSize(app.fileSizeBytes) },
            { label: 'Category', value: app.primaryGenreName || 'N/A' },
            { label: 'Content Rating', value: app.trackContentRating || app.contentAdvisoryRating || 'N/A' },
            { label: 'Developer', value: app.artistName || 'N/A' },
            { label: 'Release Date', value: formatDate(app.releaseDate) },
            { label: 'Last Updated', value: formatDate(app.currentVersionReleaseDate) },
            { label: 'Languages', value: (app.languageCodesISO2A || []).join(', ') || 'N/A' },
            { label: 'Compatibility', value: `iOS ${app.minimumOsVersion || 'N/A'}+` }
        ];
        
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';
        
        details.forEach(detail => {
            const item = document.createElement('div');
            item.className = 'bg-white p-6 rounded-lg shadow-sm border border-gray-100';
            item.innerHTML = `
                <div class="text-sm font-medium text-gray-500 mb-1">${detail.label}</div>
                <div class="text-lg text-gray-900">${detail.value}</div>
            `;
            grid.appendChild(item);
        });
        
        tab.appendChild(grid);
        return tab;
    }

    function formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    function formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return 'N/A';
        }
    }

    function setupTabs() {
        const tabButtons = document.querySelectorAll('[data-tab]');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Update button states
                tabButtons.forEach(btn => {
                    btn.className = btn.className.replace('border-indigo-500 text-indigo-600', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300');
                });
                button.className = button.className.replace('border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'border-indigo-500 text-indigo-600');
                
                // Update content visibility
                tabPanes.forEach(pane => {
                    pane.classList.add('hidden');
                    pane.classList.remove('active');
                });
                
                const targetPane = document.getElementById(`${targetTab}-content`);
                if (targetPane) {
                    targetPane.classList.remove('hidden');
                    targetPane.classList.add('active');
                }
            });
        });
    }

    function setupScrollAnimations() {
        const animatedItems = document.querySelectorAll('.scroll-animate');
        if (!('IntersectionObserver' in window)) return;
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        animatedItems.forEach(item => observer.observe(item));
    }

    function section(titleText, bodyNode) {
        const wrap = document.createElement('section');
        wrap.className = 'space-y-4 scroll-animate';
        const h3 = document.createElement('h3');
        h3.className = 'text-2xl font-semibold text-gray-800';
        h3.textContent = titleText;
        wrap.appendChild(h3);
        wrap.appendChild(bodyNode);
        return wrap;
    }

    function buildGallery(urls, deviceType = 'phone') {
        const list = document.createElement('div');
        list.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
        
        urls.forEach((src, i) => {
            const item = document.createElement('div');
            item.className = 'screenshot-detail-item group cursor-pointer';
            
            const imgContainer = document.createElement('div');
            imgContainer.className = 'relative overflow-hidden rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105';
            
            const img = document.createElement('img');
            img.src = src;
            img.alt = `${deviceType} Screenshot ${i + 1}`;
            img.className = deviceType === 'ipad' 
                ? 'w-full h-auto object-contain bg-gray-50' 
                : 'w-full h-auto object-contain bg-gray-50 max-h-[600px]';
            img.loading = 'lazy';
            
            // Add click handler for modal/lightbox effect
            img.addEventListener('click', () => openImageModal(src, `${deviceType} Screenshot ${i + 1}`));
            
            imgContainer.appendChild(img);
            item.appendChild(imgContainer);
            list.appendChild(item);
        });
        
        return list;
    }

    function openImageModal(src, alt) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
        modal.addEventListener('click', () => modal.remove());
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'relative max-w-4xl max-h-full';
        modalContent.addEventListener('click', (e) => e.stopPropagation());
        
        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.className = 'max-w-full max-h-full object-contain rounded-lg shadow-2xl';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors';
        closeButton.innerHTML = '✕';
        closeButton.addEventListener('click', () => modal.remove());
        
        modalContent.appendChild(img);
        modalContent.appendChild(closeButton);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
        
        // Add escape key listener
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    const start = () => {
        if (trackId) {
            performLookupById(trackId)
                .then(renderApp)
                .catch(err => {
                    appNameHeading.textContent = 'Error Loading App';
                    appTagline.textContent = 'Could not load app details. Please try again later.';
                    loadingPlaceholder.textContent = `Error: ${err.message}`;
                    screenshotsContainer.innerHTML = '';
                });
        } else if (appSlug) {
            performSearchBySlug(appSlug)
                .then(app => app ? renderApp(app) : Promise.reject(new Error('App not found')))
                .catch(err => {
                    appNameHeading.textContent = 'App Not Found';
                    appTagline.textContent = 'Please select an app from the homepage.';
                    loadingPlaceholder.textContent = `Error: ${err.message}`;
                    screenshotsContainer.innerHTML = '';
                });
        } else {
            appNameHeading.textContent = 'App Not Found';
            appTagline.textContent = 'Please select an app from the homepage.';
            loadingPlaceholder.textContent = 'No app specified.';
        }
    };

    start();
});


