require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// Haversine formula for distance (in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

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
    location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
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
    address: { type: String, default: '' },
    location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
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

/* ========== AI ANALYZE ROUTE ========== */

app.post('/api/analyze', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY not configured in .env' });
        }

        // Read image file as base64
        const imagePath = req.file.path;
        const imageData = fs.readFileSync(imagePath);
        const base64Image = imageData.toString('base64');
        const mimeType = req.file.mimetype;

        const prompt = `You are an AI waste analysis expert for a recycling & reuse platform called GreenSub, operating in India.

Analyze the uploaded image and identify the waste item. Return a JSON object with these fields:

{
  "name": "Exact item name based on what you see (e.g. 'Plastic Water Bottle', 'Glass Jar', 'Cardboard Box')",
  "category": "One of: Plastic, Glass, Metal, Wood, Paper, Textile, Ceramic, Electronics, Rubber, Furniture, Organic, Chemical, Other",
  "condition": "One of: Excellent, Good, Fair, Poor",
  "marketValue": <realistic second-hand resale price in Indian Rupees (INR) as a number>,
  "reuseScore": <0-100 integer indicating how reusable the item is>,
  "material": "Primary material (e.g. PET Plastic, HDPE, Aluminum, Cotton, etc.)",
  "recyclable": true or false,
  "partner": "Suggested recycling partner from: Gravita India (metals/plastic/e-waste), ITC WOW (paper/cardboard), Attero Recycling (electronics/batteries), Nepra Resource Management (mixed waste/plastic)",
  "tip": "A helpful eco-friendly tip about this item",
  "route": "marketplace if reuseScore >= 50, otherwise trash"
}

PRICING GUIDELINES (Indian second-hand resale market, NOT scrap rates):
- Plastic bottles/containers: ₹5-20 (scrap), ₹20-80 (if reusable/decorative)
- Glass bottles/jars: ₹10-40 (kabadiwala), ₹30-150 (if decorative/reusable)
- Metal cans (aluminum): ₹5-15 per can
- Metal items (steel/iron utensils): ₹50-500 depending on item
- Copper items: ₹400-600/kg
- Paper/cardboard (per kg): ₹10-20
- Newspapers (per kg): ₹12-16
- Electronics (smartphones): ₹1000-8000 depending on model/condition
- Electronics (chargers/cables): ₹30-150
- Laptops/tablets: ₹3000-20000 depending on working condition
- Clothing (good condition): ₹100-1000 depending on brand/type
- Bags/backpacks: ₹150-1500
- Shoes (good condition): ₹100-800
- Wooden furniture (chairs/tables): ₹500-8000 depending on size/quality
- Vehicle tires (usable condition): ₹800-3000 per tire (retreaded/second-hand market)
- Vehicle tires (scrap only): ₹50-200
- Batteries: ₹10-100 each
- Books: ₹30-200
- Kitchen appliances: ₹200-3000
- Fans/heaters: ₹300-1500

IMPORTANT: Use RESALE value (what a buyer would pay for a used item), NOT scrap/kabadiwala rates, when condition is Good or Excellent. Only use scrap rates when condition is Poor.

IMPORTANT:
- Be accurate about what the item actually IS based on the image
- If reuseScore >= 50, route to "marketplace" (item can be resold)
- If reuseScore < 50, route to "trash" (item should be recycled)
- Return ONLY valid JSON, no markdown, no extra text`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType, data: base64Image } }
                ]
            }]
        };

        // Try multiple models with fallback
        const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
        let responseText = null;
        let lastError = null;

        for (const modelName of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                const apiRes = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                if (apiRes.ok) {
                    const data = await apiRes.json();
                    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                        responseText = data.candidates[0].content.parts[0].text;
                        console.log(`✅ Analysis succeeded with model: ${modelName}`);
                        break;
                    }
                } else {
                    const errData = await apiRes.json().catch(() => ({}));
                    lastError = `${modelName}: ${apiRes.status} - ${errData.error?.message || 'Unknown error'}`;
                    console.log(`⚠️ Model ${modelName} failed: ${lastError}`);
                }
            } catch (fetchErr) {
                lastError = `${modelName}: ${fetchErr.message}`;
                console.log(`⚠️ Model ${modelName} error: ${fetchErr.message}`);
            }
        }

        if (!responseText) {
            return res.status(500).json({ error: 'All AI models failed. Last error: ' + lastError });
        }

        // Extract JSON from response (handle possible markdown wrapping)
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1];
        jsonStr = jsonStr.trim();

        const analysis = JSON.parse(jsonStr);

        // Keep the uploaded image path for later listing
        analysis.imageUrl = '/uploads/' + req.file.filename;

        res.json(analysis);
    } catch (err) {
        console.error('Analyze error:', err.message);
        res.status(500).json({ error: 'AI analysis failed: ' + err.message });
    }
});

/* ========== ITEM ROUTES ========== */

// GET /api/items — list marketplace items (with optional search & range)
app.get('/api/items', async (req, res) => {
    try {
        const { search, range, lat, lng } = req.query;
        const filter = { sold: { $ne: true } };

        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [{ name: regex }, { category: regex }];
        }

        let items = await Item.find(filter).sort({ listedAt: -1 });

        // Calculate dynamic distance if user location is provided
        if (lat && lng) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);

            items = items.map(item => {
                const itemObj = item.toObject();
                if (item.location && item.location.lat != null && item.location.lng != null) {
                    itemObj.distance = calculateDistance(userLat, userLng, item.location.lat, item.location.lng);
                }
                return itemObj;
            });

            // Filter by range
            if (range) {
                const maxRange = Number(range);
                items = items.filter(item => item.distance <= maxRange);
            }

            // Sort by distance ascending
            items.sort((a, b) => a.distance - b.distance);
        } else if (range) {
            // Fallback for clients not sending lat/lng
            items = items.map(item => item.toObject());
            items = items.filter(item => item.distance <= Number(range));
        } else {
            items = items.map(item => item.toObject());
        }

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
        const { name, category, condition, price, reuseScore, distance, description, userId, lat, lng } = req.body;
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
            location: {
                lat: lat ? Number(lat) : null,
                lng: lng ? Number(lng) : null
            },
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
            address: req.body.address || '',
            location: {
                lat: req.body.lat ? Number(req.body.lat) : null,
                lng: req.body.lng ? Number(req.body.lng) : null
            },
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
