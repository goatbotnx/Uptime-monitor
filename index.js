const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const cron = require('node-cron');
const crypto = require('crypto');
const path = require('path');

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

const MONGO_URI = "";

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("Database Connected Successfully");
        try {
            await User.collection.dropIndex('userID_1');
            console.log("Old userID_1 index dropped successfully.");
        } catch (err) {}
    })
    .catch(err => console.log("Database Connection Error: ", err));

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

const checkAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

const checkAdminAuth = (req, res, next) => {
    if (req.session.isAdmin) next();
    else res.redirect('/admin/login');
};

cron.schedule('* * * * *', async () => {
    try {
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
    } catch (err) {
        console.error("Cron Job Error:", err);
    }
});

app.get('/', (req, res) => res.redirect('/dashboard'));

app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.send("Error: Please provide both email and password.");
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send("Error: Email is already registered! Please login.");
        }

        const hashed = await bcrypt.hash(password, 10);
        const apiKey = crypto.randomBytes(8).toString('hex');

        await User.create({ email, password: hashed, apiKey });
        res.redirect('/login');

    } catch (e) {
        console.error("Registration Error Details:", e);
        res.send("Error: Registration Failed - " + e.message);
    }
});

app.get('/login', async (req, res) => {
    try {
        const monitors = await Monitor.find();
        const upCount = monitors.filter(m => m.status.includes('UP')).length;
        const downCount = monitors.filter(m => m.status.includes('DOWN')).length;
        const totalMonitors = monitors.length;

        res.render('login', { upCount, downCount, totalMonitors });
    } catch (e) {
        res.render('login', { upCount: 0, downCount: 0, totalMonitors: 0 });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            res.redirect('/dashboard');
        } else {
            res.send("Invalid Login Details!");
        }
    } catch (e) {
        console.error("Login Error:", e);
        res.send("Error during login.");
    }
});

app.get('/dashboard', checkAuth, async (req, res) => {
    try {
        const monitors = await Monitor.find({ ownerKey: req.session.user.apiKey });

        const upCount = monitors.filter(m => m.status.includes('UP')).length;
        const downCount = monitors.filter(m => m.status.includes('DOWN')).length;
        const totalMonitors = monitors.length;

        const fullApiUrl = `${req.protocol}://${req.get('host')}/api/status?key=${req.session.user.apiKey}`;
        const addApiUrl = `${req.protocol}://${req.get('host')}/api/add?key=${req.session.user.apiKey}&name=NAME&url=URL`;

        res.render('dashboard', { 
            user: req.session.user, 
            monitors, 
            upCount, 
            downCount, 
            totalMonitors, 
            fullApiUrl, 
            addApiUrl 
        });
    } catch (e) {
        console.error("Dashboard Error:", e);
        res.send("Error loading dashboard.");
    }
});

app.get('/admin/login', (req, res) => res.render('admin_login'));

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'nx210' && password === 'xalmanx210') {
        req.session.isAdmin = true;
        res.redirect('/admin/master');
    } else {
        res.send("Access Denied!");
    }
});

app.get('/admin/master', checkAdminAuth, async (req, res) => {
    try {
        const allData = await Monitor.find();
        res.render('admin', { allData });
    } catch (e) {
        res.send("Error loading admin page.");
    }
});

app.post('/add-monitor', checkAuth, async (req, res) => {
    try {
        await Monitor.create({ ownerKey: req.session.user.apiKey, name: req.body.name, url: req.body.url });
        res.redirect('/dashboard');
    } catch (e) {
        res.send("Error adding monitor.");
    }
});

app.get('/delete/:id', async (req, res) => {
    try {
        const monitor = await Monitor.findById(req.params.id);
        if (monitor && (req.session.isAdmin || (req.session.user && monitor.ownerKey === req.session.user.apiKey))) {
            await Monitor.findByIdAndDelete(req.params.id);
        }
        res.redirect(req.headers.referer || '/dashboard');
    } catch (e) {
        res.redirect('/dashboard');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/api/status', async (req, res) => {
    const key = req.query.key;
    if (!key) return res.json({ error: "API Key is required" });
    const data = await Monitor.find({ ownerKey: key }, { _id: 0, __v: 0 });
    res.json(data);
});

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
