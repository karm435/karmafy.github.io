import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contactHtml = await readFile(new URL('../contact.html', import.meta.url), 'utf8');
const siteJs = await readFile(new URL('../site.js', import.meta.url), 'utf8');

assert.ok(
    contactHtml.includes('data-email-user="info"') && contactHtml.includes('data-email-domain="karmafy.com.au"'),
    'contact page should store the public email in split data attributes'
);

assert.equal(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(contactHtml),
    false,
    'contact page HTML should not expose a plain email address'
);

assert.ok(
    siteJs.includes('data-email-user') && siteJs.includes('mailto:'),
    'shared JavaScript should assemble the mailto link in the browser'
);
