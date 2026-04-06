const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const cron = require('node-cron');
const crypto = require('crypto');
const path = require('path');

// --- MODELS ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    apiKey: { type: String, unique: true }
});
const User = mongoose.model('User', UserSchema);

const MonitorSchema = new mongoose.Schema({
    ownerKey: String,
    name: String,
    url: String,
    status: { type: String, default: "Checking..." },
    responseTime: String,
    lastChecked: String
});
const Monitor = mongoose.model('Monitor', MonitorSchema);

const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE CONFIG ---
const MONGO_URI = "and your Mongoose database";

mongoose.connect(MONGO_URI)
    .then(() => console.log("Database Connected Successfully"))
    .catch(err => console.log("Database Connection Error: ", err));

// --- VIEW ENGINE & MIDDLEWARES ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'nx-210-secure-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Auth Middlewares
const checkAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

const checkAdminAuth = (req, res, next) => {
    if (req.session.isAdmin) next();
    else res.redirect('/admin/login');
};

// --- MONITORING CRON JOB (Every 1 Minute) ---
cron.schedule('* * * * *', async () => {
    const monitors = await Monitor.find();
    for (let m of monitors) {
        try {
            const start = Date.now();
            await axios.get(m.url, { timeout: 10000 });
            m.status = "UP ✅";
            m.responseTime = (Date.now() - start) + "ms";
        } catch (e) {
            m.status = "DOWN ❌";
            m.responseTime = "N/A";
        }
        m.lastChecked = new Date().toLocaleString();
        await m.save();
    }
});

// --- USER ROUTES ---
app.get('/', (req, res) => res.redirect('/dashboard'));

app.get('/register', (req, res) => res.render('register'));
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        const apiKey = crypto.randomBytes(8).toString('hex');
        await User.create({ email, password: hashed, apiKey });
        res.redirect('/login');
    } catch (e) { res.send("Error: Registration Failed."); }
});

app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = user;
        res.redirect('/dashboard');
    } else res.send("Invalid Login Details!");
});

app.get('/dashboard', checkAuth, async (req, res) => {
    const monitors = await Monitor.find({ ownerKey: req.session.user.apiKey });
    const fullApiUrl = `${req.protocol}://${req.get('host')}/api/status?key=${req.session.user.apiKey}`;
    const addApiUrl = `${req.protocol}://${req.get('host')}/api/add?key=${req.session.user.apiKey}&name=NAME&url=URL`;
    res.render('dashboard', { user: req.session.user, monitors, fullApiUrl, addApiUrl });
});

// --- ADMIN ROUTES ---
app.get('/admin/login', (req, res) => res.render('admin_login'));
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'nx210' && password === 'xalmanx210') {
        req.session.isAdmin = true;
        res.redirect('/admin/master');
    } else res.send("Access Denied!");
});

app.get('/admin/master', checkAdminAuth, async (req, res) => {
    const allData = await Monitor.find();
    res.render('admin', { allData });
});

// --- ACTION ROUTES ---
app.post('/add-monitor', checkAuth, async (req, res) => {
    await Monitor.create({ ownerKey: req.session.user.apiKey, name: req.body.name, url: req.body.url });
    res.redirect('/dashboard');
});

app.get('/delete/:id', async (req, res) => {
    const monitor = await Monitor.findById(req.params.id);
    if (req.session.isAdmin || (req.session.user && monitor.ownerKey === req.session.user.apiKey)) {
        await Monitor.findByIdAndDelete(req.params.id);
    }
    res.redirect(req.headers.referer || '/dashboard');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- PUBLIC & SYSTEM API ---

// 1. Get Status API
app.get('/api/status', async (req, res) => {
    const key = req.query.key;
    if (!key) return res.json({ error: "API Key is required" });
    const data = await Monitor.find({ ownerKey: key }, { _id: 0, __v: 0 });
    res.json(data);
});

// 2. Add via API System
app.get('/api/add', async (req, res) => {
    const { key, name, url } = req.query;
    if (!key || !name || !url) return res.json({ status: "error", message: "Params missing" });

    const user = await User.findOne({ apiKey: key });
    if (!user) return res.json({ status: "error", message: "Invalid Key" });

    try {
        await Monitor.create({ ownerKey: key, name: name, url: url });
        res.json({ status: "success", message: `Added ${name} successfully` });
    } catch (e) {
        res.json({ status: "error", message: "Failed to add" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
