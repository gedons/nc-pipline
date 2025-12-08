const { validationResult } = require('express-validator');

/**
 * Middleware to handle validation results from express-validator.
 * If there are validation errors, it responds with a 400 status and the errors.
 */
module.exports = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};
