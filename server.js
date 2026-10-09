require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const bcrypt = require("bcryptjs");
const multer = require("multer");

const { pool, query } = require("./src/config/database");
const { migrate } = require("./src/config/migrate");

const app = express();

const PORT = Number(process.env.PORT || 4000);
const IS_PROD = process.env.NODE_ENV === "production";

/* =========================================================
   CONFIGURATION
========================================================= */

if (!process.env.SESSION_SECRET) {
    console.error("ERREUR : SESSION_SECRET est manquant.");
    process.exit(1);
}

if (!process.env.ADMIN_USERNAME) {
    console.error("ERREUR : ADMIN_USERNAME est manquant.");
    process.exit(1);
}

if (!process.env.ADMIN_PASSWORD_HASH) {
    console.error("ERREUR : ADMIN_PASSWORD_HASH est manquant.");
    process.exit(1);
}

/* =========================================================
   CORS
========================================================= */

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin) {
                return callback(null, true);
            }

            if (
                allowedOrigins.length === 0 ||
                allowedOrigins.includes(origin)
            ) {
                return callback(null, true);
            }

            return callback(
                new Error("Origine non autorisée par CORS.")
            );
        },
        credentials: true
    })
);

/* =========================================================
   PROXY
========================================================= */

if (IS_PROD) {
    app.set("trust proxy", 1);
}

/* =========================================================
   HEADERS DE SÉCURITÉ
========================================================= */

app.disable("x-powered-by");

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=()"
    );

    next();
});

/* =========================================================
   BODY PARSER
========================================================= */

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

/* =========================================================
   SESSION POSTGRESQL
========================================================= */

app.use(
    session({
        store: new pgSession({
            pool,
            tableName: "session"
        }),

        name: "rectoy.sid",

        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: IS_PROD,
            maxAge: 1000 * 60 * 60 * 8
        }
    })
);

/* =========================================================
   FICHIERS STATIQUES
========================================================= */

const publicDirectory = path.join(__dirname, "public");

app.use(express.static(publicDirectory));

/*
   Routes explicites de l'administration.
   Elles évitent les problèmes de résolution /admin.
*/

app.get("/admin", (req, res) => {
    res.sendFile(
        path.join(publicDirectory, "admin", "index.html")
    );
});

app.get("/admin/", (req, res) => {
    res.sendFile(
        path.join(publicDirectory, "admin", "index.html")
    );
});

app.get("/admin/admin.css", (req, res) => {
    res.sendFile(
        path.join(publicDirectory, "admin", "admin.css")
    );
});

app.get("/admin/admin.js", (req, res) => {
    res.sendFile(
        path.join(publicDirectory, "admin", "admin.js")
    );
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/healthz", async (req, res) => {
    try {
        await query("SELECT 1");

        res.json({
            success: true,
            status: "ok",
            service: "RECTOY-AIRES",
            database: "connected",
            time: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: "error",
            database: "unavailable",
            message: error.message
        });
    }
});

/* =========================================================
   API PRINCIPALE
========================================================= */

app.get("/api", (req, res) => {
    res.json({
        success: true,
        name: "RECTOY-AIRES API",
        version: "1.0.0",
        status: "online"
    });
});

/* =========================================================
   AUTHENTIFICATION ADMIN
========================================================= */

function requireAuth(req, res, next) {
    if (
        req.session &&
        req.session.isAdmin === true
    ) {
        return next();
    }

    return res.status(401).json({
        success: false,
        message: "Authentification requise."
    });
}

/* =========================================================
   LOGIN ADMIN
========================================================= */

app.post("/api/admin/login", async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Nom d'utilisateur et mot de passe requis."
            });
        }

        if (
            username !== process.env.ADMIN_USERNAME
        ) {
            return res.status(401).json({
                success: false,
                message: "Identifiants incorrects."
            });
        }

        const passwordValid = await bcrypt.compare(
            password,
            process.env.ADMIN_PASSWORD_HASH
        );

        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                message: "Identifiants incorrects."
            });
        }

        req.session.isAdmin = true;
        req.session.adminUsername = username;

        await new Promise((resolve, reject) => {
            req.session.save(error => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        return res.json({
            success: true,
            message: "Connexion réussie."
        });

    } catch (error) {
        console.error("Erreur login admin :", error);

        return res.status(500).json({
            success: false,
            message: "Erreur interne du serveur."
        });
    }
});

/* =========================================================
   SESSION ADMIN
========================================================= */

app.get("/api/admin/session", (req, res) => {
    res.json({
        success: true,
        authenticated:
            req.session &&
            req.session.isAdmin === true,

        username:
            req.session &&
            req.session.isAdmin === true
                ? req.session.adminUsername
                : null
    });
});

/* =========================================================
   LOGOUT ADMIN
========================================================= */

app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(error => {
        if (error) {
            console.error(
                "Erreur destruction session :",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Impossible de fermer la session."
            });
        }

        res.clearCookie("rectoy.sid");

        return res.json({
            success: true,
            message: "Déconnexion réussie."
        });
    });
});

/* =========================================================
   CONFIGURATION PUBLICATIONS
========================================================= */

const ALLOWED_TYPES = [
    "annonce",
    "evenement",
    "publicite"
];

const ALLOWED_STATUS = [
    "published",
    "draft"
];

const COLUMNS = `
    id,
    title,
    type,
    description,
    TO_CHAR(event_date, 'YYYY-MM-DD') AS date,
    location,
    link,
    status,
    (image_data IS NOT NULL) AS has_image,
    created_at,
    updated_at
`;

/* =========================================================
   MULTER
========================================================= */

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter(req, file, callback) {
        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (!allowed.includes(file.mimetype)) {
            return callback(
                new Error(
                    "Format image non autorisé. Utilisez JPG, PNG, WEBP ou GIF."
                )
            );
        }

        callback(null, true);
    }
});

/* =========================================================
   PUBLICATIONS : FORMATAGE
========================================================= */

function toPublication(row) {
    return {
        id: row.id,
        title: row.title,
        type: row.type,
        description: row.description,
        date: row.date,
        location: row.location,
        link: row.link,
        status: row.status,
        has_image: row.has_image,
        image:
            row.has_image
                ? `/api/publications/${row.id}/image?v=${new Date(
                      row.updated_at
                  ).getTime()}`
                : null,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

/* =========================================================
   PUBLICATIONS PUBLIQUES
========================================================= */

app.get("/api/publications", async (req, res) => {
    try {
        const result = await query(`
            SELECT ${COLUMNS}
            FROM site_publications
            WHERE status = 'published'
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            publications: result.rows.map(toPublication)
        });

    } catch (error) {
        console.error(
            "Erreur GET publications :",
            error
        );

        res.status(500).json({
            success: false,
            message: "Impossible de charger les publications."
        });
    }
});

/* =========================================================
   IMAGE PUBLICATION
========================================================= */

app.get(
    "/api/publications/:id/image",
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id)) {
                return res.status(400).end();
            }

            const result = await query(
                `
                SELECT image_data, image_mime
                FROM site_publications
                WHERE id = $1
                `,
                [id]
            );

            if (
                result.rowCount === 0 ||
                !result.rows[0].image_data
            ) {
                return res.status(404).end();
            }

            const row = result.rows[0];

            res.setHeader(
                "Content-Type",
                row.image_mime || "image/jpeg"
            );

            res.setHeader(
                "Cache-Control",
                "public, max-age=86400"
            );

            return res.send(row.image_data);

        } catch (error) {
            console.error(
                "Erreur image publication :",
                error
            );

            return res.status(500).end();
        }
    }
);

/* =========================================================
   ADMIN : LISTE PUBLICATIONS
========================================================= */

app.get(
    "/api/admin/publications",
    requireAuth,
    async (req, res) => {
        try {
            const result = await query(`
                SELECT ${COLUMNS}
                FROM site_publications
                ORDER BY created_at DESC
            `);

            res.json({
                success: true,
                publications: result.rows.map(
                    toPublication
                )
            });

        } catch (error) {
            console.error(
                "Erreur ADMIN publications :",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Impossible de charger les publications."
            });
        }
    }
);

/* =========================================================
   ADMIN : CRÉER PUBLICATION
========================================================= */

app.post(
    "/api/admin/publications",
    requireAuth,
    upload.single("image"),
    async (req, res) => {
        try {
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
                        "Titre, type et description sont obligatoires."
                });
            }

            if (!ALLOWED_TYPES.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: "Type de publication invalide."
                });
            }

            const publicationStatus =
                status || "published";

            if (
                !ALLOWED_STATUS.includes(
                    publicationStatus
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Statut invalide."
                });
            }

            const imageData =
                req.file?.buffer || null;

            const imageMime =
                req.file?.mimetype || null;

            const result = await query(
                `
                INSERT INTO site_publications
                (
                    title,
                    type,
                    description,
                    event_date,
                    location,
                    link,
                    status,
                    image_data,
                    image_mime
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9
                )
                RETURNING ${COLUMNS}
                `,
                [
                    title.trim(),
                    type,
                    description.trim(),
                    date || null,
                    location?.trim() || null,
                    link?.trim() || null,
                    publicationStatus,
                    imageData,
                    imageMime
                ]
            );

            res.status(201).json({
                success: true,
                message:
                    "Publication créée avec succès.",
                publication:
                    toPublication(result.rows[0])
            });

        } catch (error) {
            console.error(
                "Erreur création publication :",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Impossible de créer la publication."
            });
        }
    }
);

/* =========================================================
   ADMIN : MODIFIER PUBLICATION
========================================================= */

app.put(
    "/api/admin/publications/:id",
    requireAuth,
    upload.single("image"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id)) {
                return res.status(400).json({
                    success: false,
                    message: "ID invalide."
                });
            }

            const {
                title,
                type,
                description,
                date,
                location,
                link,
                status
            } = req.body;

            if (
                !title ||
                !type ||
                !description
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Titre, type et description sont obligatoires."
                });
            }

            if (!ALLOWED_TYPES.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: "Type invalide."
                });
            }

            const publicationStatus =
                status || "published";

            if (
                !ALLOWED_STATUS.includes(
                    publicationStatus
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Statut invalide."
                });
            }

            let result;

            if (req.file) {
                result = await query(
                    `
                    UPDATE site_publications
                    SET
                        title = $1,
                        type = $2,
                        description = $3,
                        event_date = $4,
                        location = $5,
                        link = $6,
                        status = $7,
                        image_data = $8,
                        image_mime = $9
                    WHERE id = $10
                    RETURNING ${COLUMNS}
                    `,
                    [
                        title.trim(),
                        type,
                        description.trim(),
                        date || null,
                        location?.trim() || null,
                        link?.trim() || null,
                        publicationStatus,
                        req.file.buffer,
                        req.file.mimetype,
                        id
                    ]
                );
            } else {
                result = await query(
                    `
                    UPDATE site_publications
                    SET
                        title = $1,
                        type = $2,
                        description = $3,
                        event_date = $4,
                        location = $5,
                        link = $6,
                        status = $7
                    WHERE id = $8
                    RETURNING ${COLUMNS}
                    `,
                    [
                        title.trim(),
                        type,
                        description.trim(),
                        date || null,
                        location?.trim() || null,
                        link?.trim() || null,
                        publicationStatus,
                        id
                    ]
                );
            }

            if (result.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Publication introuvable."
                });
            }

            res.json({
                success: true,
                message:
                    "Publication modifiée avec succès.",
                publication:
                    toPublication(result.rows[0])
            });

        } catch (error) {
            console.error(
                "Erreur modification publication :",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Impossible de modifier la publication."
            });
        }
    }
);

/* =========================================================
   ADMIN : SUPPRIMER PUBLICATION
========================================================= */

app.delete(
    "/api/admin/publications/:id",
    requireAuth,
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id)) {
                return res.status(400).json({
                    success: false,
                    message: "ID invalide."
                });
            }

            const result = await query(
                `
                DELETE FROM site_publications
                WHERE id = $1
                RETURNING id
                `,
                [id]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Publication introuvable."
                });
            }

            res.json({
                success: true,
                message:
                    "Publication supprimée avec succès."
            });

        } catch (error) {
            console.error(
                "Erreur suppression publication :",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Impossible de supprimer la publication."
            });
        }
    }
);

/* =========================================================
   GESTION DES ERREURS MULTER
========================================================= */

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message:
                "Erreur upload : " + error.message
        });
    }

    if (
        error &&
        error.message &&
        error.message.includes(
            "Format image non autorisé"
        )
    ) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    next(error);
});

/* =========================================================
   404 API
========================================================= */

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "Route API introuvable."
    });
});

/* =========================================================
   ERREUR GLOBALE
========================================================= */

app.use((error, req, res, next) => {
    console.error(
        "ERREUR SERVEUR :",
        error
    );

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        message: "Erreur interne du serveur."
    });
});

/* =========================================================
   DÉMARRAGE
========================================================= */

(async () => {
    try {
        console.log("");
        console.log("================================");
        console.log(" RECTOY-AIRES");
        console.log(" Initialisation du serveur");
        console.log("================================");

        await migrate();

        console.log("");
        console.log(
            "Base de données : CONNECTÉE"
        );

        app.listen(PORT, () => {
            console.log("");
            console.log("================================");
            console.log(" RECTOY-AIRES BACKEND");
            console.log("================================");
            console.log(
                `Site  : http://localhost:${PORT}`
            );
            console.log(
                `Admin : http://localhost:${PORT}/admin/`
            );
            console.log(
                `API   : http://localhost:${PORT}/api`
            );
            console.log(
                `Health: http://localhost:${PORT}/healthz`
            );
            console.log("================================");
            console.log("");
        });

    } catch (error) {
        console.error("");
        console.error(
            "================================"
        );
        console.error(
            " ERREUR DÉMARRAGE RECTOY-AIRES"
        );
        console.error(
            "================================"
        );
        console.error(error);
        console.error("");

        process.exit(1);
    }
})();