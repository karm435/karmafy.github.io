window.KarmafyTheme = (() => {
    const storageKey = 'karmafy-theme';
    const darkQuery = '(prefers-color-scheme: dark)';

    function preferredTheme() {
        const savedTheme = localStorage.getItem(storageKey);
        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme;
        }
        return window.matchMedia && window.matchMedia(darkQuery).matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
            const icon = toggle.querySelector('[data-theme-icon]');
            toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
            toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
            if (icon) {
                icon.textContent = theme === 'dark' ? '☾' : '☼';
            }
        });
    }

    function init() {
        applyTheme(preferredTheme());

        document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
            if (toggle.dataset.boundThemeToggle === 'true') return;
            toggle.dataset.boundThemeToggle = 'true';
            toggle.addEventListener('click', () => {
                const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
                localStorage.setItem(storageKey, nextTheme);
                applyTheme(nextTheme);
            });
        });

        if (window.matchMedia) {
            window.matchMedia(darkQuery).addEventListener('change', (event) => {
                if (!localStorage.getItem(storageKey)) {
                    applyTheme(event.matches ? 'dark' : 'light');
                }
            });
        }
    }

    return { init };
})();

window.KarmafyEmail = (() => {
    function addressFromDataset(element) {
        const user = element.dataset.emailUser;
        const domain = element.dataset.emailDomain;
        return user && domain ? `${user}@${domain}` : '';
    }

    function init() {
        document.querySelectorAll('[data-email-user][data-email-domain]').forEach((element) => {
            const address = addressFromDataset(element);
            if (!address) return;

            if (element.tagName === 'FORM') {
                element.action = `mailto:${address}`;
                return;
            }

            if (element.tagName === 'A') {
                element.href = `mailto:${address}`;
                element.textContent = address;
            }
        });
    }

    return { init };
})();
