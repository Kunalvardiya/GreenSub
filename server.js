require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

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

/* ---------- Mongoose Schema ---------- */
const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    condition: { type: String, default: 'Good' },
    price: { type: Number, required: true },
    reuseScore: { type: Number, required: true },
    imageUrl: { type: String, default: '' },
    distance: { type: Number, default: 0 },
    description: { type: String, default: '' },
    listedAt: { type: Date, default: Date.now }
});

const Item = mongoose.model('Item', itemSchema);

/* ---------- API Routes ---------- */

// GET /api/items — list marketplace items (with optional search & range)
app.get('/api/items', async (req, res) => {
    try {
        const { search, range } = req.query;
        const filter = {};

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
        const { name, category, condition, price, reuseScore, distance, description } = req.body;
        const imageUrl = req.file ? '/uploads/' + req.file.filename : '';

        const item = new Item({
            name,
            category,
            condition: condition || 'Good',
            price: Number(price),
            reuseScore: Number(reuseScore),
            imageUrl,
            distance: Number(distance) || 0,
            description: description || ''
        });

        await item.save();
        res.status(201).json(item);
    } catch (err) {
        res.status(400).json({ error: err.message });
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

/* ---------- Pickup requests (in-memory for now) ---------- */
const pickupRequests = [];

app.post('/api/pickups', (req, res) => {
    const pickup = {
        id: Date.now().toString(),
        itemName: req.body.itemName,
        category: req.body.category,
        material: req.body.material,
        partner: req.body.partner,
        date: req.body.date,
        time: req.body.time,
        status: 'pending',
        createdAt: new Date()
    };
    pickupRequests.push(pickup);
    res.status(201).json(pickup);
});

app.get('/api/pickups', (req, res) => {
    res.json(pickupRequests);
});

app.patch('/api/pickups/:id', (req, res) => {
    const pickup = pickupRequests.find(p => p.id === req.params.id);
    if (!pickup) return res.status(404).json({ error: 'Not found' });
    pickup.status = req.body.status || pickup.status;
    res.json(pickup);
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
