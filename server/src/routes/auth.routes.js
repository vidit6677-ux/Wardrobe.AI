const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function setAuthCookie(res, userId) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is missing");
    }

    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}

router.post("/signup", async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        const name = String(req.body.name || "").trim() || email.split("@")[0] || "user";

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ error: "Email already in use" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, passwordHash });

        setAuthCookie(res, user._id.toString());
        return res.json({ id: user._id, email: user.email, name: user.name });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || "Signup failed" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ error: "Invalid credentials" });

        setAuthCookie(res, user._id.toString());
        return res.json({ id: user._id, email: user.email, name: user.name });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || "Login failed" });
    }
});

router.post("/logout", async (_req, res) => {
    res.clearCookie("token");
    return res.json({ ok: true });
});

router.get("/me", async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(200).json(null);

        if (!process.env.JWT_SECRET) return res.status(200).json(null);

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload.userId).select("_id email name");

        if (!user) return res.status(200).json(null);

        return res.json({ id: user._id, email: user.email, name: user.name });
    } catch (_e) {
        return res.status(200).json(null);
    }
});

module.exports = router;
