const os = require('os');
const fs = require('fs');
const path = require('path');
const SQL = require('@signalapp/better-sqlite3');

const folderPath = './messages';

fs.mkdir(folderPath, () => {});

function getFolderPath() {
    return path.join(os.homedir(), 'AppData/Roaming/Signal');
}

function getDBPath() {
    return path.join(getFolderPath(), 'sql/db.sqlite');
}

function getDBKey() {
    const config = path.join(getFolderPath(), 'config.json');
    return JSON.parse(fs.readFileSync(config).toString())['key'];
}

function getLocalTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

const db = SQL(getDBPath(), { readonly: true });

db.pragma(`key = "x'${getDBKey()}'"`);

const conv = db.prepare(`SELECT id, name FROM conversations WHERE type = 'group' OR type = 'private'`);

const msgRes = [];

for (const convi of conv.iterate()) {
    const msg = db.prepare(`SELECT type, body, sent_at FROM messages WHERE ConversationId = ?`);
    const msgsForConv = msg.all(convi.id); // Use parameterized query to avoid SQL injection
    for (const msg of msgsForConv) msg.sent_at = getLocalTime(msg.sent_at);
    //msgsForConv.sent_at = getLocalTime(msgsForConv.sent_at);
    const jsonData = JSON.stringify(msgsForConv);
    fs.writeFileSync(`messages/${convi.name}.json`, jsonData, 'utf8');
    msgRes.push(...msgsForConv);
}

//console.log(msgRes);

const convRes = conv.all();
// Convert the messages array to JSON
const jsonData = JSON.stringify(convRes);

// Write JSON data to a file
//fs.writeFileSync('messages/messages.json', jsonData, 'utf8');

// Close the database connection
db.close();

// Log success message
console.log(`Messages saved to ${process.cwd()}\\messages folder`);

// Wait for user input before exiting
require('readline')
    .createInterface(process.stdin, process.stdout)
    .question("Press [Enter] to exit...", function(){
        process.exit();
});
