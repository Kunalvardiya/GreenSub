require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- Multer (image uploads) ---------- */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e4);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|gif/;
        const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
        cb(ok ? null : new Error('Only image files allowed'), ok);
    }
});

/* ========== Mongoose Schemas ========== */

// --- User ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// --- Item ---
const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    condition: { type: String, default: 'Good' },
    price: { type: Number, required: true },
    reuseScore: { type: Number, required: true },
    imageUrl: { type: String, default: '' },
    distance: { type: Number, default: 0 },
    description: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sold: { type: Boolean, default: false },
    listedAt: { type: Date, default: Date.now }
});
const Item = mongoose.model('Item', itemSchema);

// --- Pickup ---
const pickupSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    category: { type: String, default: '' },
    material: { type: String, default: '' },
    partner: { type: String, default: '' },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, default: 'pending' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    collectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now }
});
const Pickup = mongoose.model('Pickup', pickupSchema);

/* ========== AUTH ROUTES ========== */

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        const hash = await bcrypt.hash(password, 10);
        const user = new User({ name, email: email.toLowerCase(), password: hash });
        await user.save();
        res.status(201).json({ _id: user._id, name: user.name, email: user.email });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        res.json({ _id: user._id, name: user.name, email: user.email });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ========== ITEM ROUTES ========== */

// GET /api/items — list marketplace items (with optional search & range)
app.get('/api/items', async (req, res) => {
    try {
        const { search, range } = req.query;
        const filter = { sold: { $ne: true } };

        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [{ name: regex }, { category: regex }];
        }

        if (range) {
            filter.distance = { $lte: Number(range) };
        }

        const items = await Item.find(filter).sort({ listedAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/items/:id — get single item
app.get('/api/items/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/items — add item to marketplace (with image upload)
app.post('/api/items', upload.single('image'), async (req, res) => {
    try {
        const { name, category, condition, price, reuseScore, distance, description, userId } = req.body;
        const imageUrl = req.file ? '/uploads/' + req.file.filename : '';

        const item = new Item({
            name,
            category,
            condition: condition || 'Good',
            price: Number(price),
            reuseScore: Number(reuseScore),
            imageUrl,
            distance: Number(distance) || 0,
            description: description || '',
            userId: userId || null
        });

        await item.save();
        res.status(201).json(item);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/items/:id/buy — mark item as purchased
app.post('/api/items/:id/buy', async (req, res) => {
    try {
        const { buyerId } = req.body;
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        if (item.sold) return res.status(400).json({ error: 'Item already sold' });

        item.sold = true;
        item.buyerId = buyerId || null;
        await item.save();
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/items/:id — remove item
app.delete('/api/items/:id', async (req, res) => {
    try {
        await Item.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ========== PICKUP ROUTES (now MongoDB) ========== */

app.post('/api/pickups', async (req, res) => {
    try {
        const pickup = new Pickup({
            itemName: req.body.itemName,
            category: req.body.category,
            material: req.body.material,
            partner: req.body.partner,
            date: req.body.date,
            time: req.body.time,
            userId: req.body.userId || null
        });
        await pickup.save();
        res.status(201).json(pickup);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/pickups', async (req, res) => {
    try {
        const pickups = await Pickup.find().sort({ createdAt: -1 });
        res.json(pickups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/pickups/:id', async (req, res) => {
    try {
        const pickup = await Pickup.findById(req.params.id);
        if (!pickup) return res.status(404).json({ error: 'Not found' });
        pickup.status = req.body.status || pickup.status;
        pickup.collectorId = req.body.collectorId || pickup.collectorId;
        await pickup.save();
        res.json(pickup);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ========== USER DATA ROUTES ========== */

// Items uploaded by a seller
app.get('/api/users/:id/items', async (req, res) => {
    try {
        const items = await Item.find({ userId: req.params.id }).sort({ listedAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Items bought by a buyer
app.get('/api/users/:id/purchases', async (req, res) => {
    try {
        const items = await Item.find({ buyerId: req.params.id, sold: true }).sort({ listedAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pickups scheduled by a seller
app.get('/api/users/:id/scheduled-pickups', async (req, res) => {
    try {
        const pickups = await Pickup.find({ userId: req.params.id }).sort({ createdAt: -1 });
        res.json(pickups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pickups accepted by a collector
app.get('/api/users/:id/pickups', async (req, res) => {
    try {
        const pickups = await Pickup.find({ collectorId: req.params.id }).sort({ createdAt: -1 });
        res.json(pickups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ---------- Connect to MongoDB & Start ---------- */
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas');
        app.listen(PORT, () => {
            console.log(`🌿 GreenSub server running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        console.log('Starting server without MongoDB...');
        app.listen(PORT, () => {
            console.log(`🌿 GreenSub server running at http://localhost:${PORT} (no DB)`);
        });
    });
