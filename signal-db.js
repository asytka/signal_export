const os = require('os');
const fs = require('fs');
const path = require('path');
const SQL = require('@signalapp/better-sqlite3');

const folderPath = './messages';

fs.mkdir(folderPath, () => {});

function getFolderPath() {
    if (process.platform === 'win32') {
        return path.join(os.homedir(), 'AppData', 'Roaming', 'Signal');
    }
    return path.join(os.homedir(), '.config', 'signal');
}

function getDBPath() {
    return path.join(getFolderPath(), 'sql', 'db.sqlite');
}

function getDBKey() {
    const configPath = path.join(getFolderPath(), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath).toString());
    return config.key;
}

function getLocalTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

const db = SQL(getDBPath(), { readonly: true });

db.pragma(`key = "x'${getDBKey()}'"`);

const conv = db.prepare(`SELECT id, name FROM conversations WHERE type = 'group' OR type = 'private'`);


for (const convi of conv.iterate()) {
    const msg = db.prepare(`SELECT type, body, sent_at FROM messages WHERE ConversationId = ?`);
    const msgsForConv = msg.all(convi.id); 
    for (const msg of msgsForConv) msg.sent_at = getLocalTime(msg.sent_at);

    const jsonData = JSON.stringify(msgsForConv);
    fs.writeFileSync(`messages/${convi.name}.json`, jsonData, 'utf8');
}



db.close();

console.log(`Messages saved to ${process.cwd()}\\messages folder`);

require('readline')
    .createInterface(process.stdin, process.stdout)
    .question("Press [Enter] to exit...", function(){
        process.exit();
});
