const jwt = require("jsonwebtoken");

module.exports = function authRequired(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.userId };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Not authenticated" });
  }
};