require('dotenv').config();

const API_KEY = process.env.API_KEY;

const verifyAPIKey = (req, res, next) => {
  const key = req.headers['x-api-key'];

  if (key !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API Key' });
  }

  next();
};

module.exports = verifyAPIKey;