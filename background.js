const ScanModeEnum = {
    DISABLED: 'disabled',
    ALL: 'all',
    CUSTOM: 'custom'
};

const DomainModeEnum = {
    ALWAYS: 'always',
    INTERNAL: 'internal'
};

const simpleMailRegex = /[\w\.\_]+@[\w\.\-]+\.\w+/;

async function checkIncoming(folder, messages) {
    if (folder.type !== "inbox") {
        return;
    }

    for await (const message of listMessages(messages)) {
        verifyAndMark(message);
    }

}

async function verifyAndMark(message) {
    const messageFull = await browser.messages.getFull(message.id);
    const settings = await browser.storage.local.get();
    const isEncrypted = Boolean(messageFull.headers['content-type'].find(v => v.startsWith('multipart/encrypted')));

    if(settings.scanMode === ScanModeEnum.DISABLED || isEncrypted) {
        return;
    }
    
    let encryptionRequired = false;
    let tag = null;
    if(settings.scanMode === ScanModeEnum.ALL) {
        encryptionRequired = true;
        tag = settings.globalTag;
    } else {
        const sender = message.author.match(simpleMailRegex)[0];
        const recipientList = message.recipients
            .map(v => v.trim().match(simpleMailRegex)[0])
            .concat(
                message.ccList
                    .map(v => v.trim().match(simpleMailRegex)[0])
            );
        const isInternal = recipientList.filter(v => v.split('@')[1] === sender.split('@')[1])
                .length === recipientList.length;

        for(const domain of settings.domains) {
            const senderFromDomain = sender.endsWith(domain.name);

            if(domain.mode === DomainModeEnum.ALWAYS && senderFromDomain) {
                encryptionRequired = true;
                tag = domain.tag;
                break;
            } else if(domain.mode === DomainModeEnum.INTERNAL && isInternal) {
                encryptionRequired = true;
                tag = domain.tag;
                break;
            }
        }
    }

     // Checking isEncrypted is not required here, because the execution wouldn't reach this code without it
    if(encryptionRequired) {
        await browser.messages.update(message.id, {
            tags: [tag]
        });
    } else {
        await browser.messages.update(message.id, {
            tags: message.tags.filter(v => v !== tag)
        })
    }
}

// Source: https://webextension-api.thunderbird.net/en/latest/how-to/messageLists.html
async function* listMessages(page) {
    for (let message of page.messages) {
        yield message;
    }

    while (page.id) {
        page = await browser.messages.continueList(page.id);
        for (let message of page.messages) {
            yield message;
        }
    }
}

browser.messages.onNewMailReceived.addListener(checkIncoming);
