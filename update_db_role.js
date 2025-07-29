const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/ludico.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the ludico database.');
});

db.serialize(() => {
    db.run(`ALTER TABLE users ADD COLUMN role TEXT`, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log("Column 'role' added to 'users' table.");
        }
    });
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Close the database connection.');
});
