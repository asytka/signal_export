const os = require('os');
const fs = require('fs');
const path = require('path');
const SQL = require('./node_modules/@signalapp/better-sqlite3');

const folderPath = ['./messages/json', './messages/text'];

for (var i in folderPath) fs.mkdir(folderPath[i], () => {});


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

const conv_stmt = db.prepare(`SELECT id, name, type FROM conversations WHERE type = 'group' OR type = 'private'`);


for (const conv_i of conv_stmt.iterate()) {
    const msg_stmt = db.prepare(`SELECT type, body, sent_at FROM messages WHERE ConversationId = ?`);
    const msg = msg_stmt.all(conv_i.id); 
    for (const msg_i of msg) msg_i.sent_at = getLocalTime(msg_i.sent_at);

    const jsonData = JSON.stringify(msg);
    var Data = `Чат: ${conv_i.name} (${conv_i.type}) \n\n`;
    for (const msg_i of msg) {
        if (msg_i.type == 'group-v2-change') { 
            Data += `Створення групи: ${msg_i.sent_at}\n`;
        }
        else {
            Data += `Час: ${msg_i.sent_at} \nТекст: ${msg_i.body} \nВідправник ${msg_i.type}\n`;
        }
        Data += "\n";
    }
    fs.writeFileSync(`messages/text/${conv_i.name}.txt`, Data, 'utf8');
    fs.writeFileSync(`messages/json/${conv_i.name}.json`, jsonData, 'utf8');

}



db.close();

console.log(`Messages saved to ${process.cwd()}\\messages folder`);

require('readline')
    .createInterface(process.stdin, process.stdout)
    .question("Press [Enter] to exit...", function(){
        process.exit();
});
