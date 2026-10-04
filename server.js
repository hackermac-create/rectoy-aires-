const path = require("path");

// On charge le .env qui se trouve dans CE dossier (backend/),
// peu importe le dossier depuis lequel la commande a été lancée
// (VS Code, un terminal, un script npm...).
require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 4000;

const DATA_FILE = path.join(
    __dirname,
    "data",
    "publications.json"
);

const UPLOADS_DIR = path.join(
    __dirname,
    "uploads"
);


// ================================
// VARIABLES D'ENVIRONNEMENT REQUISES
// ================================
// Voir .env.example pour la liste complète.
// Le serveur refuse de démarrer si les secrets essentiels manquent,
// pour éviter de tourner "par accident" avec des valeurs par défaut faibles.

const REQUIRED_ENV = [
    "SESSION_SECRET",
    "ADMIN_USERNAME",
    "ADMIN_PASSWORD_HASH"
];

const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);

if (missingEnv.length) {

    console.error(
        "Variables d'environnement manquantes : " +
        missingEnv.join(", ")
    );

    console.error(
        "Le serveur cherche le fichier .env ici : " +
        path.join(__dirname, ".env")
    );

    console.error(
        "Vérifiez qu'il existe bien à cet endroit exact et que les 3 valeurs y sont renseignées."
    );

    process.exit(1);

}


// ================================
// DOSSIERS OBLIGATOIRES
// ================================
// Evite un crash au premier upload / à la première écriture
// si "data/" ou "uploads/" n'existent pas encore.

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });


// ================================
// CONFIGURATION
// ================================

const allowedOrigins =
    (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean);

app.use(cors({

    origin: function (origin, callback) {

        // Requêtes sans en-tête Origin (ex. Postman, curl) : autorisées.
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origine non autorisée par CORS."));

    },

    credentials: true

}));

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.set("trust proxy", 1);

app.use(session({

    name: "rectoy.sid",

    secret: process.env.SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 8 // 8 heures
    }

}));


// Images envoyées par l'admin
app.use("/uploads", express.static(UPLOADS_DIR));

// Site public + administration (/admin/) servis par le même serveur :
// même domaine => pas de problème de CORS ni de cookies.
app.use(express.static(path.join(__dirname, "public")));


// ================================
// AUTHENTIFICATION ADMIN
// ================================

function requireAuth(req, res, next) {

    if (req.session && req.session.isAdmin) {
        return next();
    }

    return res.status(401).json({
        success: false,
        message: "Authentification requise."
    });

}

const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(key) {

    const entry = loginAttempts.get(key);

    if (!entry) return false;

    if (Date.now() - entry.firstAttempt > WINDOW_MS) {
        loginAttempts.delete(key);
        return false;
    }

    return entry.count >= MAX_ATTEMPTS;

}

function registerFailedAttempt(key) {

    const entry = loginAttempts.get(key);

    if (!entry || Date.now() - entry.firstAttempt > WINDOW_MS) {
        loginAttempts.set(key, { count: 1, firstAttempt: Date.now() });
        return;
    }

    entry.count += 1;

}


app.post("/api/admin/login", async (req, res) => {

    const ip = req.ip;

    if (isRateLimited(ip)) {

        return res.status(429).json({
            success: false,
            message: "Trop de tentatives. Réessayez dans quelques minutes."
        });

    }

    const { username, password } = req.body;

    if (!username || !password) {

        return res.status(400).json({
            success: false,
            message: "Identifiant et mot de passe requis."
        });

    }

    const validUsername = username === process.env.ADMIN_USERNAME;

    const validPassword = validUsername &&
        await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

    if (!validUsername || !validPassword) {

        registerFailedAttempt(ip);

        return res.status(401).json({
            success: false,
            message: "Identifiants invalides."
        });

    }

    loginAttempts.delete(ip);

    req.session.isAdmin = true;

    req.session.username = username;

    res.json({
        success: true,
        message: "Connexion réussie."
    });

});


app.post("/api/admin/logout", (req, res) => {

    req.session.destroy(() => {

        res.clearCookie("rectoy.sid");

        res.json({ success: true });

    });

});


app.get("/api/admin/session", (req, res) => {

    res.json({
        success: true,
        authenticated: !!(req.session && req.session.isAdmin),
        username: req.session ? req.session.username : null
    });

});


// ================================
// MULTER
// ================================

const ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
};

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, UPLOADS_DIR);

    },

    filename: function (req, file, cb) {

        // L'extension est déduite du type MIME validé, jamais du nom
        // original du fichier (évite les extensions forgées : .php, .html...).
        const extension = ALLOWED_IMAGE_TYPES[file.mimetype];

        const filename =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            extension;

        cb(null, filename);

    }

});

const upload = multer({

    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024 // 5 Mo max
    },

    fileFilter: function (req, file, cb) {

        if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {

            return cb(
                new Error("Format d'image non autorisé (JPG, PNG ou WEBP uniquement).")
            );

        }

        cb(null, true);

    }

});


// ================================
// OUTILS
// ================================

function readPublications() {

    try {

        const data =
            fs.readFileSync(
                DATA_FILE,
                "utf8"
            );

        return JSON.parse(data || "[]");

    } catch (error) {

        return [];

    }

}


const ALLOWED_TYPES = ["annonce", "evenement", "publicite"];
const ALLOWED_STATUS = ["published", "draft"];

// Refuse javascript:, data:, etc. (seuls http/https sont acceptés)
function isSafeLink(value) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
        return false;
    }
}

function removeUpload(imagePath) {
    if (!imagePath || !imagePath.startsWith("/uploads/")) return;
    fs.unlink(path.join(UPLOADS_DIR, path.basename(imagePath)), () => {});
}

function reject(req, res, message) {
    if (req.file) removeUpload("/uploads/" + req.file.filename);
    return res.status(400).json({ success: false, message });
}


function savePublications(publications) {

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(
            publications,
            null,
            2
        )
    );

}


// ================================
// ROUTE TEST
// ================================

app.get("/api", (req, res) => {

    res.json({
        success: true,
        message: "API RECTOY-AIRES opérationnelle",
        version: "1.0.0"
    });

});


// ================================
// GET PUBLICATIONS
// ================================

app.get("/api/publications", (req, res) => {

    const publications =
        readPublications();

    const published =
        publications.filter(
            publication =>
                publication.status === "published"
        );

    res.json({
        success: true,
        publications: published
    });

});


// ================================
// GET TOUTES PUBLICATIONS
// ADMIN
// ================================

app.get("/api/admin/publications", requireAuth, (req, res) => {

    const publications =
        readPublications();

    res.json({
        success: true,
        publications
    });

});


// ================================
// CREER UNE PUBLICATION
// ================================

app.post(
    "/api/admin/publications",
    requireAuth,
    upload.single("image"),
    (req, res) => {

        try {

            const publications =
                readPublications();

            const {
                title,
                type,
                description,
                date,
                location,
                link,
                status
            } = req.body;


            if (!title || !type || !description) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Le titre, le type et la description sont obligatoires."

                });

            }


            const allowedTypes = [
                "annonce",
                "evenement",
                "publicite"
            ];


            if (!allowedTypes.includes(type)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Type de publication invalide."

                });

            }


            if (link && !isSafeLink(link)) {
                return reject(req, res, "Le lien doit commencer par http:// ou https://");
            }

            let image = null;


            if (req.file) {

                image =
                    `/uploads/${req.file.filename}`;

            }


            const publication = {

                id:
                    Date.now().toString(),

                title,

                type,

                description,

                date:
                    date || null,

                location:
                    location || null,

                link:
                    link || null,

                image,

                status:
                    ALLOWED_STATUS.includes(status) ? status : "published",

                createdAt:
                    new Date().toISOString()

            };


            publications.unshift(
                publication
            );


            savePublications(
                publications
            );


            res.status(201).json({

                success: true,

                message:
                    "Publication créée avec succès.",

                publication

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Erreur lors de la création."

            });

        }

    }
);


// ================================
// MODIFIER
// ================================

app.put(
    "/api/admin/publications/:id",
    requireAuth,
    upload.single("image"),
    (req, res) => {

        try {

            const publications =
                readPublications();

            const index =
                publications.findIndex(
                    publication =>
                        publication.id === req.params.id
                );


            if (index === -1) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Publication introuvable."

                });

            }


            const publication =
                publications[index];


            if (req.body.type !== undefined && !ALLOWED_TYPES.includes(req.body.type)) {
                return reject(req, res, "Type de publication invalide.");
            }
            if (req.body.status !== undefined && !ALLOWED_STATUS.includes(req.body.status)) {
                return reject(req, res, "Statut invalide.");
            }
            if (req.body.link && !isSafeLink(req.body.link)) {
                return reject(req, res, "Le lien doit commencer par http:// ou https://");
            }


            publication.title =
                req.body.title ??
                publication.title;

            publication.type =
                req.body.type ??
                publication.type;

            publication.description =
                req.body.description ??
                publication.description;

            publication.date =
                req.body.date ??
                publication.date;

            publication.location =
                req.body.location ??
                publication.location;

            publication.link =
                req.body.link ??
                publication.link;

            publication.status =
                req.body.status ??
                publication.status;


            if (req.file) {

                removeUpload(publication.image);

                publication.image =
                    `/uploads/${req.file.filename}`;

            }


            publication.updatedAt =
                new Date().toISOString();


            publications[index] =
                publication;


            savePublications(
                publications
            );


            res.json({

                success: true,

                message:
                    "Publication modifiée.",

                publication

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Erreur lors de la modification."

            });

        }

    }
);


// ================================
// SUPPRIMER
// ================================

app.delete(
    "/api/admin/publications/:id",
    requireAuth,
    (req, res) => {

        const publications =
            readPublications();

        const index =
            publications.findIndex(
                publication =>
                    publication.id === req.params.id
            );


        if (index === -1) {

            return res.status(404).json({

                success: false,

                message:
                    "Publication introuvable."

            });

        }


        const [removed] = publications.splice(index, 1);

        removeUpload(removed.image);


        savePublications(
            publications
        );


        res.json({

            success: true,

            message:
                "Publication supprimée."

        });

    }
);


// ================================
// GESTION D'ERREURS GLOBALE
// (fichiers trop lourds, type invalide, origine CORS refusée...)
// ================================

app.use((error, req, res, next) => {

    if (error instanceof multer.MulterError || error) {

        console.error(error.message);

        return res.status(400).json({
            success: false,
            message: error.message || "Requête invalide."
        });

    }

    next();

});


// ================================
// DEMARRAGE
// ================================

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "================================"
        );
        console.log(
            " RECTOY-AIRES BACKEND"
        );
        console.log(
            "================================"
        );
        console.log(
            `API : http://localhost:${PORT}`
        );
        console.log(
            "================================"
        );
        console.log("");

    }
);