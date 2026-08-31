const axios = require('axios');

const authMiddleware = async (req, res, next) => {
    // ------------------------------------------------------------------
    // DEV-ONLY BYPASS
    // Skips CRIS token validation entirely on local machines so you don't
    // need a live token every time you hit the API.
    //
    // Safety:
    //   - Requires BOTH conditions to be true, so it can't accidentally
    //     activate unless someone explicitly opts in.
    //   - NODE_ENV must NOT be 'production' (set this correctly in your
    //     real deployment and never touch it).
    //   - BYPASS_AUTH must be explicitly set to 'true' in your local .env
    //     (don't commit this, and don't put it in shared/staging configs).
    // ------------------------------------------------------------------
    if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_AUTH === 'true') {
        console.warn('[Auth Middleware] BYPASS_AUTH is active — skipping token validation.');
        req.user = { id: 'local-dev-user', bypass: true }; // mock context in case downstream code reads req.user
        return next();
    }

    // Check headers for the token
    const token = req.headers['x-auth-token'] || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    try {
        // User explicitly chose to validate via the CRIS API
        const response = await axios.get(process.env.TOKEN_VALIDATION_URL, {
            headers: {
                'X-Auth-Token': token,
                'Content-Type': 'application/json'
            },
            validateStatus: () => true // Resolve promise for all HTTP status codes, mimicking fetch behavior
        });

        if (response.status >= 200 && response.status < 300) {
            // Token is valid, proceed to the next middleware/route handler
            next();
        } else {
            // Token is invalid
            res.status(401).json({ error: 'Invalid or expired token.' });
        }
    } catch (error) {
        console.error('[Auth Middleware] Error validating token:', error);
        res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};

module.exports = authMiddleware;