const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = 'votre_secret_jwt'; // Changez ceci pour une chaîne secrète plus complexe

app.use(bodyParser.json());

const fs = require('fs');
const dir = './db';

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

// Initialisation de la base de données
const db = new sqlite3.Database('./db/ludico.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the ludico database.');
});

// Création de la table des utilisateurs
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
)`);

// Création de la table des entreprises
db.run(`CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    lat REAL,
    lng REAL,
    user_id INTEGER,
    FOREIGN KEY (category_id) REFERENCES categories (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
)`);

// Création de la table des créneaux horaires
db.run(`CREATE TABLE IF NOT EXISTS time_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    max_clients INTEGER NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
)`);

// Route d'inscription
app.post('/api/signup', (req, res) => {
    console.log('Received signup request:', req.body);
    try {
        const { email, password } = req.body;
        const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';

        db.run(sql, [email, password], function(err) {
            if (err) {
                console.error('Database INSERT error:', err.message);
                res.status(400).json({ "error": err.message });
                return;
            }
            console.log(`A row has been inserted with rowid ${this.lastID}`);
            res.json({ "message": "success", "id": this.lastID });
        });
    } catch (e) {
        console.error('Error in /api/signup route:', e.message);
        res.status(500).json({ "error": "An internal server error occurred." });
    }
});

// Route de connexion
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.get(sql, [email, password], (err, row) => {
        if (err || !row) {
            res.status(400).json({ "error": "Invalid credentials" });
            return;
        }
        const token = jwt.sign({ id: row.id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ "message": "success", "token": token });
    });
});

// Middleware pour vérifier le token JWT
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }

            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// Route pour récupérer les entreprises d'un utilisateur
app.get('/api/user/businesses', authenticateJWT, (req, res) => {
    const sql = "SELECT * FROM businesses WHERE user_id = ?";
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
      });
});

// Route pour modifier une entreprise
app.put('/api/businesses/:id', authenticateJWT, (req, res) => {
    const { name, description, category_id, lat, lng } = req.body;
    const sql = `UPDATE businesses set
                 name = COALESCE(?,name),
                 description = COALESCE(?,description),
                 category_id = COALESCE(?,category_id),
                 lat = COALESCE(?,lat),
                 lng = COALESCE(?,lng)
                 WHERE id = ? AND user_id = ?`;
    db.run(sql, [name, description, category_id, lat, lng, req.params.id, req.user.id], function(err) {
        if (err) {
            res.status(400).json({ "error": res.message })
            return;
        }
        res.json({ message: "success" })
    });
});

// Route pour lister les créneaux d'une entreprise
app.get('/api/businesses/:id/slots', authenticateJWT, (req, res) => {
    const sql = "SELECT * FROM time_slots WHERE business_id = ?";
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
      });
});

// Route pour ajouter un créneau
app.post('/api/businesses/:id/slots', authenticateJWT, (req, res) => {
    const { day_of_week, start_time, max_clients } = req.body;
    const sql = 'INSERT INTO time_slots (business_id, day_of_week, start_time, max_clients) VALUES (?, ?, ?, ?)';
    db.run(sql, [req.params.id, day_of_week, start_time, max_clients], function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "id": this.lastID });
    });
});

// Route pour supprimer un créneau
app.delete('/api/slots/:id', authenticateJWT, (req, res) => {
    const sql = 'DELETE FROM time_slots WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            res.status(400).json({ "error": res.message })
            return;
        }
        res.json({ message: "deleted", changes: this.changes })
    });
});

// Route pour récupérer une entreprise par son ID (placée après les routes plus spécifiques)
app.get('/api/businesses/:id', (req, res) => {
    const sql = "SELECT * FROM businesses WHERE id = ?";
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":row
        })
      });
});

// Route pour supprimer une entreprise
app.delete('/api/businesses/:id', authenticateJWT, (req, res) => {
    const sql = 'DELETE FROM businesses WHERE id = ? AND user_id = ?';
    db.run(sql, [req.params.id, req.user.id], function(err) {
        if (err) {
            res.status(400).json({ "error": res.message })
            return;
        }
        res.json({ message: "deleted", changes: this.changes })
    });
});

// Route pour créer une entreprise
app.post('/api/businesses', authenticateJWT, (req, res) => {
    const { name, description, category_id, lat, lng } = req.body;
    const sql = 'INSERT INTO businesses (name, description, category_id, lat, lng, user_id) VALUES (?, ?, ?, ?, ?, ?)';
    db.run(sql, [name, description, category_id, lat, lng, req.user.id], function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "id": this.lastID });
    });
});

const nodemailer = require('nodemailer');

// Route pour les réservations
app.post('/api/booking', (req, res) => {
    const { businessName, date, time, name, email } = req.body;

    // Configuration de Nodemailer avec Ethereal
    nodemailer.createTestAccount((err, account) => {
        if (err) {
            console.error('Failed to create a testing account. ' + err.message);
            return process.exit(1);
        }

        console.log('Credentials obtained, sending message...');

        // Création du transporteur SMTP
        let transporter = nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: {
                user: account.user,
                pass: account.pass
            }
        });

        // Message de l'e-mail
        let message = {
            from: 'Ludico <no-reply@ludico.com>',
            to: 'professionnel@example.com', // Remplacez par l'e-mail du professionnel
            subject: 'Nouvelle réservation',
            text: `Vous avez une nouvelle réservation pour ${businessName} le ${date} à ${time} de la part de ${name} (${email}).`
        };

        transporter.sendMail(message, (err, info) => {
            if (err) {
                console.log('Error occurred. ' + err.message);
                return process.exit(1);
            }

            console.log('Message sent: %s', info.messageId);
            // Vous pouvez obtenir l'URL de prévisualisation de l'e-mail ici
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            res.json({ "message": "success" });
        });
    });
});

// Route pour récupérer les entreprises
app.get('/api/businesses', (req, res) => {
    const sql = "SELECT * FROM businesses";
    const params = [];
    db.all(sql, params, (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
      });
});

const https = require('https');

app.get('/api/location', (req, res) => {
    // Correct IP address detection for Heroku and local
    const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim() || '8.8.8.8';
    console.log(`[Location API] Detected IP: ${ip}`);
    const url = `https://ip-api.com/json/${ip}`;

    https.get(url, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => {
            data += chunk;
        });
        apiRes.on('end', () => {
            try {
                const jsonData = JSON.parse(data);
                console.log('[Location API] Response from ip-api.com:', jsonData);
                if (jsonData.status === 'success') {
                    res.json({ lat: jsonData.lat, lon: jsonData.lon });
                } else {
                    res.status(404).json({ error: 'Location not found' });
                }
            } catch (e) {
                console.error('[Location API] Error parsing JSON:', e);
                res.status(500).json({ error: 'Failed to parse location data' });
            }
        });
    }).on('error', (err) => {
        console.error('[Location API] Error fetching location:', err);
        res.status(500).json({ error: 'Failed to fetch location' });
    });
});

app.use(express.static(__dirname));

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
