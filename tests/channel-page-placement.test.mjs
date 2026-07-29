import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const userscriptPath = fileURLToPath(
    new URL('../userscript/[YouTube] Channel Location.user.js', import.meta.url),
);
const source = await readFile(userscriptPath, 'utf8');

class FakeElement {
    constructor(tagName = 'div', id = '') {
        this.tagName = tagName.toLowerCase();
        this.id = id;
        this.className = '';
        this.children = [];
        this.dataset = {};
        this.parentElement = null;
        this.isConnected = true;
        this.textContent = '';
    }

    appendChild(child) {
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    after(child) {
        if (!this.parentElement) return;
        const index = this.parentElement.children.indexOf(this);
        child.parentElement = this.parentElement;
        this.parentElement.children.splice(index + 1, 0, child);
    }

    get nextElementSibling() {
        if (!this.parentElement) return null;
        const index = this.parentElement.children.indexOf(this);
        return this.parentElement.children[index + 1] || null;
    }

    getAttribute(name) {
        if (name === 'href') return this.hrefAttribute || this.href || null;
        return null;
    }

    matches(selector) {
        return selector.split(',').some((candidate) => {
            const part = candidate.trim();
            if (part === `#${this.id}` && this.id) return true;
            if (part === this.tagName) return true;
            if (part.includes('[data-ytdc-pill="1"]')) {
                const className = part.match(/^\.([^[]+)/)?.[1];
                return this.dataset.ytdcPill === '1' && this.className.split(/\s+/).includes(className || '');
            }
            const hrefPrefix = part.match(/^a\[href\^="([^"]+)"\]$/)?.[1];
            return Boolean(hrefPrefix && this.tagName === 'a' && this.getAttribute('href')?.startsWith(hrefPrefix));
        });
    }

    querySelectorAll(selector) {
        const matches = [];
        for (const child of this.children) {
            if (child.matches(selector)) matches.push(child);
            matches.push(...child.querySelectorAll(selector));
        }
        return matches;
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    closest(selector) {
        let current = this;
        while (current) {
            if (current.matches(selector)) return current;
            current = current.parentElement;
        }
        return null;
    }

    remove() {
        this.isConnected = false;
        if (!this.parentElement) return;
        this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
        this.parentElement = null;
    }
}

class FakeAnchorElement extends FakeElement {
    constructor(href) {
        super('a');
        this.hrefAttribute = href;
        this.href = new URL(href, 'https://www.youtube.com').toString();
        this.textContent = 'Card channel';
    }
}

async function runUserscript(pathname) {
    const location = {
        href: `https://www.youtube.com${pathname}`,
        origin: 'https://www.youtube.com',
    };
    const headerContainer = new FakeElement('div', 'container');
    const channelName = new FakeElement('ytd-channel-name');
    const header = new FakeElement('ytd-c4-tabbed-header-renderer');
    const pageRoot = new FakeElement('ytd-page-manager');
    const card = new FakeElement('article');
    const cardAnchor = new FakeAnchorElement('/@card');
    const body = new FakeElement('body');
    const documentElement = new FakeElement('html');
    let mutationObserverCreations = 0;

    header.appendChild(channelName);
    channelName.appendChild(headerContainer);
    pageRoot.appendChild(card);
    card.appendChild(cardAnchor);

    const allMatches = (selector) => {
        const matches = [];
        for (const root of [header, pageRoot]) {
            if (root.matches(selector)) matches.push(root);
            matches.push(...root.querySelectorAll(selector));
        }
        return [...new Set(matches)];
    };

    const document = {
        body,
        documentElement,
        createElement: (tagName) => new FakeElement(tagName),
        querySelectorAll: allMatches,
        querySelector: (selector) => allMatches(selector)[0] || null,
    };

    class FakeMutationObserver {
        constructor() {
            mutationObserverCreations += 1;
        }

        disconnect() {}

        observe() {}
    }

    const window = {
        addEventListener() {},
    };
    const cache = JSON.stringify({
        '/@card/about': 'Japan',
        '/@demo/about': 'Hong Kong',
    });
    const context = {
        URL,
        Element: FakeElement,
        HTMLAnchorElement: FakeAnchorElement,
        MutationObserver: FakeMutationObserver,
        document,
        location,
        window,
        GM_addStyle() {},
        GM_getValue(key) {
            return key.includes('country-cache') ? cache : null;
        },
        clearTimeout,
        setTimeout,
    };

    const startup = vm.runInNewContext(source, context, { filename: userscriptPath });
    await startup;

    const deadline = Date.now() + 500;
    while (document.querySelectorAll('.ytdc-channel-country-name-container[data-ytdc-pill="1"]').length === 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    return {
        card,
        document,
        header,
        headerContainer,
        mutationObserverCreations,
    };
}

test('channel pages render one header pill and no card pills', async () => {
    const result = await runUserscript('/@demo/videos');
    const pills = result.document.querySelectorAll('.ytdc-channel-country-name-container[data-ytdc-pill="1"]');

    assert.equal(pills.length, 1);
    assert.equal(pills[0].closest('ytd-c4-tabbed-header-renderer'), result.header);
    assert.equal(result.card.querySelectorAll('.ytdc-channel-country-name-container[data-ytdc-pill="1"]').length, 0);
});

test('non-channel listing pages still render pills beside card channel links', async () => {
    const result = await runUserscript('/');
    const pills = result.document.querySelectorAll('.ytdc-channel-country-name-container[data-ytdc-pill="1"]');

    assert.equal(pills.length, 1);
    assert.equal(result.headerContainer.children.length, 0);
    assert.equal(pills[0].parentElement, result.card);
    assert.equal(result.mutationObserverCreations, 1);
});
