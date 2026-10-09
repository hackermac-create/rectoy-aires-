function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin === true) {
        return next();
    }

    return res.status(401).json({
        success: false,
        message: "Authentification administrateur requise."
    });
}

module.exports = {
    requireAdmin
};
function requireAdmin(req, res, next) {
    if (
        req.session &&
        req.session.isAdmin === true
    ) {
        return next();
    }

    return res.status(401).json({
        success: false,
        message:
            "Authentification administrateur requise."
    });
}

module.exports = {
    requireAdmin
};