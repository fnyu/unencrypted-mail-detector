// Helper datatype
class CustomDomain {
    constructor(name, mode, tag) {
        this.name = name;
        this.mode = mode;
        this.tag = tag;
    }
    toString() {
        return this.name;
    }
};

const ScanModeEnum = {
    DISABLED: 'disabled',
    ALL: 'all',
    CUSTOM: 'custom'
};

const DomainModeEnum = {
    ALWAYS: 'always',
    INTERNAL: 'internal'
};

const Elements = {
    SCAN_MODE: document.getElementById('UMDScanMode'),
    GLOBAL_TAG: document.getElementById('UMDGlobalTag'),
    CUSTOM_DOMAIN: document.getElementById('UMDCustomDomain'),
    TAG_SELECTOR: document.getElementById('UMDCustomDomainTag'),
    CHECKING_MODE: document.getElementById('UMDCustomDomainCheckingMode'),
    DOMAINS_LIST: document.getElementById('UMDCustomDomainsTable').tBodies[0],
    SAVE_BUTTON: document.getElementById('UMDSave')
};

const tags = [];
let domains = [];

const EventHandlers = {
    KEY_PRESS: (e) => {
        if (e.keyCode === 13) {
            e.preventDefault();
            saveDomain();
        }
    },

    CLICK_SAVE: (e) => {
        e.preventDefault();
        saveDomain();
    },

    SAVE_SETTINGS: (e) => {
        saveSettings();

    },
}

function HTML(type, id, value, properties, listeners, childElements) {
    const element = document.createElement(type);
    element.id = id;
    element.innerText = value;

    if (properties) {
        for (const propId in properties) {
            element.setAttribute(propId, properties[propId]);
        }
    }

    if (childElements) {
        for (const child of childElements) {
            element.appendChild(child);
        }
    }

    if (listeners) {
        for (const listener in listeners) {
            element.addEventListener(listener, listeners[listener]);
        }
    }

    return element;
}

function normalizeDomain(domainName) {
    domainName = domainName.trim();
    return domainName.startsWith('@') ? domainName : '@' + domainName;
}

function renderCustomDomainsTable(data) {
    while (Elements.DOMAINS_LIST.firstChild) {
        Elements.DOMAINS_LIST.removeChild(Elements.DOMAINS_LIST.firstChild);
    }

    for (const id in data) {
        const tableRow = HTML('tr', 'domain-' + id, null, null, null, [
            HTML('td', null, id)
        ]);

        tableRow.appendChild(HTML('td', null, data[id].name));
        tableRow.appendChild(HTML('td', null, data[id].mode));
        tableRow.appendChild(HTML('td', null, tags[data[id].tag]));

        const removeButton = HTML('a', null, 'Remove', {
            href: '#'
        }, {
            click: e => {
                e.preventDefault();
                document.getElementById('domain-' + id).remove();
                domains.splice(id, 1);
                saveSettings();
                renderCustomDomainsTable(domains);
            }
        });
        tableRow.appendChild(HTML('td', null, null, null, null, [removeButton]));
        Elements.DOMAINS_LIST.appendChild(tableRow);
    }
}

function saveDomain() {
    const normalizedDomain = normalizeDomain(Elements.CUSTOM_DOMAIN.value)
    if (normalizedDomain !== '@' && !domains.map(v => v.name).includes(normalizedDomain)) {
        domains.push(new CustomDomain(normalizedDomain, Elements.CHECKING_MODE.value, Elements.TAG_SELECTOR.value));
        Elements.CUSTOM_DOMAIN.value = '';
        renderCustomDomainsTable(domains);
        saveSettings();
    }
}

function notifySaved() {
    Elements.SAVE_BUTTON.classList.add('button-success');
    Elements.SAVE_BUTTON.innerText = 'Saved';
    setTimeout(function () {
        Elements.SAVE_BUTTON.classList.remove('button-success');
        Elements.SAVE_BUTTON.innerText = 'Save';
    }, 1000);
}

function saveSettings() {
    const settings = {
        scanMode: Elements.SCAN_MODE.value,
        globalTag: Elements.GLOBAL_TAG.value,
        domains: domains
    };

    browser.storage.local.set(settings);

    if(Elements.SCAN_MODE.value !== ScanModeEnum.ALL) {
        Elements.GLOBAL_TAG.setAttribute('disabled', 'disabled');
    } else {
        Elements.GLOBAL_TAG.removeAttribute('disabled', 'disabled');
    }

    notifySaved();

    return settings;
}

function loadSettings() {
    const loadedSettings = browser.storage.local.get();

    loadedSettings.then(settings => {
        Elements.SCAN_MODE.value = settings.scanMode || ScanModeEnum.DISABLED;
        Elements.GLOBAL_TAG.value = settings.globalTag || Object.keys(tags)[0];
        domains = settings.domains || [];

        if (Elements.SCAN_MODE.value === ScanModeEnum.ALL) {
            Elements.GLOBAL_TAG.removeAttribute('disabled');
        }

        renderCustomDomainsTable(domains);
    }).catch(console.error);
}

function loadTagList() {
    const loadedTagList = browser.messages.listTags();

    loadedTagList.then(tagList => {
        for (const tag of tagList) {
            Elements.TAG_SELECTOR.appendChild(
                HTML('option', null, tag.tag, {
                    value: tag.key
                })
            );

            Elements.GLOBAL_TAG.appendChild(
                HTML('option', null, tag.tag, {
                    value: tag.key
                })
            );

            tags[tag.key] = tag.tag;
        }
    }).catch(console.error);
}



loadTagList();
loadSettings();

Elements.CUSTOM_DOMAIN.addEventListener('keypress', EventHandlers.KEY_PRESS);
Elements.SAVE_BUTTON.addEventListener('click', EventHandlers.CLICK_SAVE);
Elements.SCAN_MODE.addEventListener('change', EventHandlers.SAVE_SETTINGS);
Elements.GLOBAL_TAG.addEventListener('change', EventHandlers.SAVE_SETTINGS);
