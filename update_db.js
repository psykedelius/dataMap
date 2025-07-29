const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/ludico.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the ludico database.');
});

db.serialize(() => {
    db.run(`ALTER TABLE users ADD COLUMN name TEXT`, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log("Column 'name' added to 'users' table.");
        }
    });
    db.run(`ALTER TABLE users ADD COLUMN username TEXT`, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log("Column 'username' added to 'users' table.");
        }
    });
    db.run(`ALTER TABLE users ADD COLUMN phone TEXT`, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log("Column 'phone' added to 'users' table.");
        }
    });
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Close the database connection.');
});
