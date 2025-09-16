// src/middleware/adminAuth.js
const adminAuth = (req, res, next) => {
  if (req.user &&( req.user.role === 'admin'/*|| req.user.role === 'superadmin'*/)) {
    next(); // ✅ admin or superadmin allowed
  } else {
    res.status(403).json({ message: 'Access denied: Admins only' });
  }
};

module.exports = { adminAuth };
