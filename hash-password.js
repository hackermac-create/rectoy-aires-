/**
 * Génère le hash à mettre dans ADMIN_PASSWORD_HASH (.env).
 * Utilisation :
 *   node hash-password.js "VotreMotDePasseSolide"
 */

const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
    console.error("Utilisation : node hash-password.js \"VotreMotDePasse\"");
    process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
    console.log("\nAjoutez cette ligne dans votre fichier .env :\n");
    console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
});
