const { pool } = require("./database");

async function migrate() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        /* =====================================================
           TABLE ADMINS
        ===================================================== */

        await client.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        /* =====================================================
           TABLE SESSIONS
        ===================================================== */

        await client.query(`
            CREATE TABLE IF NOT EXISTS "session" (
                "sid" VARCHAR NOT NULL PRIMARY KEY,
                "sess" JSON NOT NULL,
                "expire" TIMESTAMP(6) NOT NULL
            );
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS "IDX_session_expire"
            ON "session" ("expire");
        `);

        /* =====================================================
           TABLE PUBLICATIONS
        ===================================================== */

        await client.query(`
            CREATE TABLE IF NOT EXISTS site_publications (
                id SERIAL PRIMARY KEY,

                title VARCHAR(150) NOT NULL,

                type VARCHAR(30) NOT NULL
                    CHECK (
                        type IN (
                            'annonce',
                            'evenement',
                            'publicite'
                        )
                    ),

                description TEXT NOT NULL,

                event_date DATE,

                location VARCHAR(150),

                link TEXT,

                status VARCHAR(20) NOT NULL
                    DEFAULT 'published'
                    CHECK (
                        status IN (
                            'published',
                            'draft'
                        )
                    ),

                image_data BYTEA,

                image_mime VARCHAR(100),

                created_at TIMESTAMP NOT NULL
                    DEFAULT CURRENT_TIMESTAMP,

                updated_at TIMESTAMP NOT NULL
                    DEFAULT CURRENT_TIMESTAMP
            );
        `);

        /* =====================================================
           TRIGGER UPDATED_AT
        ===================================================== */

        await client.query(`
            CREATE OR REPLACE FUNCTION
            update_site_publications_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await client.query(`
            DROP TRIGGER IF EXISTS
            trigger_site_publications_updated_at
            ON site_publications;
        `);

        await client.query(`
            CREATE TRIGGER
            trigger_site_publications_updated_at

            BEFORE UPDATE
            ON site_publications

            FOR EACH ROW

            EXECUTE FUNCTION
            update_site_publications_updated_at();
        `);

        await client.query("COMMIT");

        console.log("");
        console.log("================================");
        console.log(" MIGRATION RECTOY-AIRES OK");
        console.log("================================");
        console.log("Table admins       : OK");
        console.log("Table session      : OK");
        console.log("Table publications : OK");
        console.log("================================");
        console.log("");

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("");
        console.error(
            "ERREUR MIGRATION :",
            error.message
        );
        console.error("");

        throw error;

    } finally {
        client.release();
    }
}

module.exports = {
    migrate
};