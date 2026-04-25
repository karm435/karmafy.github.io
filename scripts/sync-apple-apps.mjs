import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'assets');
const dataDir = path.join(rootDir, 'data');
const outputPath = path.join(dataDir, 'apps.json');

const developerName = process.env.APPLE_DEVELOPER_NAME || 'Karmjit Singh';
const country = process.env.APPLE_STORE_COUNTRY || 'us';

function toSlug(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function readJson(filePath) {
    const contents = await readFile(filePath, 'utf8');
    return JSON.parse(contents);
}

async function readLocalCatalog() {
    const entries = await readdir(assetsDir, { withFileTypes: true });
    const apps = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const slug = entry.name;
        const descriptionPath = path.join(assetsDir, slug, 'descriptions.json');

        try {
            const local = await readJson(descriptionPath);
            apps.push({
                slug,
                appId: local.appId ? String(local.appId) : '',
                isLive: local.isLive === true,
                localDescriptions: Object.fromEntries(
                    Object.entries(local).filter(([key]) => key.endsWith('.png'))
                ),
                tagline: local.tagline || ''
            });
        } catch (error) {
            console.warn(`Skipping ${slug}: ${error.message}`);
        }
    }

    return apps;
}

async function fetchAppleJson(url) {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'KarmafyAppleMetadataSync/1.0'
        }
    });

    if (!response.ok) {
        throw new Error(`Apple API returned ${response.status} for ${url}`);
    }

    return response.json();
}

async function fetchAppleHtml(url) {
    const response = await fetch(url, {
        headers: {
            Accept: 'text/html',
            'User-Agent': 'Mozilla/5.0 (compatible; KarmafyAppleMetadataSync/1.0)'
        }
    });

    if (!response.ok) {
        throw new Error(`Apple app page returned ${response.status} for ${url}`);
    }

    return response.text();
}

function decodeHtmlEntities(value) {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

function artworkUrl(artwork, width, height = width) {
    if (!artwork?.template) return '';
    const crop = artwork.crop || 'bb';
    return artwork.template
        .replace('{w}', String(width))
        .replace('{h}', String(height))
        .replace('{c}', crop)
        .replace('{f}', 'jpg');
}

function screenshotUrl(artwork) {
    if (!artwork?.template || !artwork.width || !artwork.height) return '';
    const width = 392;
    const height = Math.round((width * artwork.height) / artwork.width);
    return artworkUrl(artwork, width, height);
}

export function parseAppStorePageMedia(html) {
    const match = html.match(/<script[^>]*id=["']serialized-server-data["'][^>]*>([\s\S]*?)<\/script>/);
    if (!match) return { artworkUrl100: '', artworkUrl512: '', screenshotUrls: [] };

    const payload = JSON.parse(decodeHtmlEntities(match[1]));
    const pageData = payload.data?.[0]?.data || {};
    const icon = pageData.lockup?.icon || pageData.navigationBarIconArtwork;
    const screenshots = Object.entries(pageData.shelfMapping || {})
        .filter(([key]) => key.startsWith('product_media'))
        .flatMap(([, shelf]) => (Array.isArray(shelf.items) ? shelf.items : []))
        .map((item) => screenshotUrl(item.screenshot))
        .filter(Boolean);

    return {
        artworkUrl100: artworkUrl(icon, 100),
        artworkUrl512: artworkUrl(icon, 512),
        screenshotUrls: [...new Set(screenshots)]
    };
}

function appStorePageUrl(app) {
    if (app.trackViewUrl) return app.trackViewUrl;
    if (app.appId) return `https://apps.apple.com/${country}/app/id${app.appId}`;
    return '';
}

async function fetchAppStorePageMedia(app) {
    const url = appStorePageUrl(app);
    if (!url) return null;
    const html = await fetchAppleHtml(url);
    return parseAppStorePageMedia(html);
}

async function mergeAppStorePageMedia(app) {
    try {
        const media = await fetchAppStorePageMedia(app);
        if (!media) return app;

        return {
            ...app,
            artworkUrl100: media.artworkUrl100 || app.artworkUrl100,
            artworkUrl512: media.artworkUrl512 || app.artworkUrl512,
            screenshotUrls: media.screenshotUrls.length ? media.screenshotUrls : app.screenshotUrls,
            ipadScreenshotUrls: media.screenshotUrls.length ? [] : app.ipadScreenshotUrls
        };
    } catch (error) {
        console.warn(`Could not refresh App Store page media for ${app.trackName}: ${error.message}`);
        return app;
    }
}

async function lookupByIds(appIds) {
    if (!appIds.length) return [];
    const url = new URL('https://itunes.apple.com/lookup');
    url.searchParams.set('id', appIds.join(','));
    url.searchParams.set('country', country);
    url.searchParams.set('entity', 'software');
    const payload = await fetchAppleJson(url);
    return Array.isArray(payload.results) ? payload.results : [];
}

async function searchByDeveloper() {
    const url = new URL('https://itunes.apple.com/search');
    url.searchParams.set('term', developerName);
    url.searchParams.set('country', country);
    url.searchParams.set('entity', 'software');
    url.searchParams.set('limit', '50');
    const payload = await fetchAppleJson(url);
    return Array.isArray(payload.results) ? payload.results : [];
}

function normalizeAppleApp(appleApp, localByAppId, localBySlug) {
    const appId = appleApp.trackId ? String(appleApp.trackId) : '';
    const local = localByAppId.get(appId) || localBySlug.get(toSlug(appleApp.trackName)) || {};
    const slug = local.slug || toSlug(appleApp.trackName || appId);

    return {
        slug,
        appId,
        isLive: true,
        trackName: appleApp.trackName || local.slug || 'Karmafy App',
        description: appleApp.description || local.tagline || 'A mobile product designed and engineered by Karmafy.',
        primaryGenreName: appleApp.primaryGenreName || '',
        sellerName: appleApp.sellerName || '',
        artistName: appleApp.artistName || '',
        version: appleApp.version || '',
        releaseDate: appleApp.releaseDate || '',
        currentVersionReleaseDate: appleApp.currentVersionReleaseDate || '',
        trackViewUrl: appleApp.trackViewUrl || (appId ? `https://apps.apple.com/app/id${appId}` : ''),
        artworkUrl100: appleApp.artworkUrl100 || '',
        artworkUrl512: appleApp.artworkUrl512 || appleApp.artworkUrl100 || '',
        screenshotUrls: Array.isArray(appleApp.screenshotUrls) ? appleApp.screenshotUrls : [],
        ipadScreenshotUrls: Array.isArray(appleApp.ipadScreenshotUrls) ? appleApp.ipadScreenshotUrls : [],
        localDescriptions: local.localDescriptions || {}
    };
}

function fallbackFromLocal(localApp) {
    return {
        slug: localApp.slug,
        appId: localApp.appId,
        isLive: localApp.isLive,
        trackName: localApp.slug
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' '),
        description: localApp.tagline || 'A mobile product designed and engineered by Karmafy.',
        primaryGenreName: 'Mobile App',
        sellerName: developerName,
        artistName: developerName,
        version: '',
        releaseDate: '',
        currentVersionReleaseDate: '',
        trackViewUrl: localApp.appId ? `https://apps.apple.com/app/id${localApp.appId}` : '',
        artworkUrl100: '',
        artworkUrl512: '',
        screenshotUrls: [],
        ipadScreenshotUrls: [],
        localDescriptions: localApp.localDescriptions || {}
    };
}

async function loadExistingOutput() {
    try {
        return await readJson(outputPath);
    } catch {
        return null;
    }
}

async function sync() {
    const localCatalog = await readLocalCatalog();
    const liveLocalCatalog = localCatalog.filter((app) => app.isLive && app.appId);
    const localByAppId = new Map();
    const localBySlug = new Map();

    for (const app of localCatalog) {
        localBySlug.set(app.slug, app);
        if (app.appId && (!localByAppId.has(app.appId) || app.isLive)) {
            localByAppId.set(app.appId, app);
        }
    }

    const appIds = [...new Set(liveLocalCatalog.map((app) => app.appId))];
    let appleResults = [];

    try {
        const [lookupResults, searchResults] = await Promise.all([
            lookupByIds(appIds),
            searchByDeveloper()
        ]);
        const byTrackId = new Map();
        [...lookupResults, ...searchResults].forEach((app) => {
            if (app.wrapperType === 'software' && app.trackId) {
                byTrackId.set(String(app.trackId), app);
            }
        });
        appleResults = [...byTrackId.values()];
    } catch (error) {
        console.warn(`Apple metadata sync failed: ${error.message}`);
        const existing = await loadExistingOutput();
        if (existing?.apps?.length) {
            console.warn('Keeping existing data/apps.json because Apple metadata was unavailable.');
            return;
        }
    }

    const normalized = appleResults
        .map((app) => normalizeAppleApp(app, localByAppId, localBySlug))
        .filter((app) => app.trackName && (app.artistName === developerName || app.sellerName === developerName || localByAppId.has(app.appId)));

    const bySlug = new Map();
    normalized.forEach((app) => bySlug.set(app.slug, app));

    liveLocalCatalog.forEach((localApp) => {
        if (!bySlug.has(localApp.slug)) {
            bySlug.set(localApp.slug, fallbackFromLocal(localApp));
        }
    });

    const apps = (await Promise.all([...bySlug.values()].map(mergeAppStorePageMedia)))
        .sort((a, b) => a.trackName.localeCompare(b.trackName));
    const output = {
        generatedAt: new Date().toISOString(),
        source: {
            developerName,
            country,
            appIds
        },
        apps
    };

    await mkdir(dataDir, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    console.log(`Synced ${apps.length} apps to ${path.relative(rootDir, outputPath)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    sync().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
