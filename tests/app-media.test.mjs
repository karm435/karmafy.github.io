import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

class Element {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.attributes = {};
        this.dataset = {};
        this.className = '';
        this.textContent = '';
        this.href = '';
        this.target = '';
        this.rel = '';
        this.src = '';
        this.alt = '';
        this.loading = '';
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    append(...children) {
        this.children.push(...children);
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
    }

    querySelectorAll() {
        return [];
    }
}

function flatten(element) {
    return [element, ...element.children.flatMap(flatten)];
}

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>\s*const fallbackApps[\s\S]*?<\/script>/)?.[0]
    .replace(/^<script>/, '')
    .replace(/<\/script>$/, '');

assert.ok(script, 'homepage app rendering script should be present');

const context = {
    console,
    document: {
        createElement: (tagName) => new Element(tagName),
        getElementById: () => null,
        addEventListener: () => {}
    },
    window: {}
};

vm.createContext(context);
vm.runInContext(script, context);

const card = context.createAppCard({
    slug: 'ipad-only-app',
    appId: '123',
    trackName: 'iPad Only App',
    description: 'An app with Apple iPad screenshots.',
    primaryGenreName: 'Productivity',
    version: '1.0',
    sellerName: 'Karmafy',
    artworkUrl512: 'https://example.com/icon.jpg',
    screenshotUrls: [],
    ipadScreenshotUrls: ['https://example.com/ipad-screen.jpg']
});

const images = flatten(card).filter((element) => element.tagName === 'img');
assert.ok(
    images.some((image) => image.src === 'https://example.com/icon.jpg' && image.className === 'app-icon'),
    'app cards should render the Apple app icon'
);
assert.ok(
    images.some((image) => image.src === 'https://example.com/ipad-screen.jpg'),
    'app cards should render Apple iPad screenshots when iPhone screenshots are empty'
);
