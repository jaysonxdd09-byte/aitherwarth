const express = require('express');
const path = require('path');
const fs = require('fs');

const axios = require('axios');

const crypto = require('crypto');

const app = express();
const PORT = 3000;
const CACHE_DIR = path.join(__dirname, 'cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
}

// Proxy for LabyMod images with Disk Caching
app.get('/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send('No URL provided');

    // Create a unique filename based on the URL
    const urlHash = crypto.createHash('md5').update(imageUrl).digest('hex');
    const cachePath = path.join(CACHE_DIR, `${urlHash}.png`);

    // Check if image is in cache
    if (fs.existsSync(cachePath)) {
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year in browser
        return fs.createReadStream(cachePath).pipe(res);
    }

    try {
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://laby.net/cloaks'
            },
            timeout: 5000 // 5s timeout
        });

        res.set('Content-Type', response.headers['content-type']);
        res.set('Cache-Control', 'public, max-age=31536000');

        // Pipe to both the response and the cache file
        const writer = fs.createWriteStream(cachePath);
        response.data.pipe(writer);
        response.data.pipe(res);

        writer.on('error', (err) => console.error('Cache write error:', err));
    } catch (e) {
        console.error(`Proxy error for ${imageUrl}:`, e.message);
        res.status(500).send('Error fetching image');
    }
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// API endpoint to get the scraped cloaks with pagination
app.get('/api/cloaks', (req, res) => {
    const dataPath = path.join(__dirname, 'all_cloaks.json');
    if (fs.existsSync(dataPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const filter = req.query.filter || 'all';
            const search = (req.query.search || '').toLowerCase();
            
            let filtered = data;
            
            if (filter !== 'all') {
                filtered = filtered.filter(c => c.categories && c.categories.includes(filter));
            }
            
            if (search) {
                filtered = filtered.filter(c => 
                    (c.tags && c.tags.toLowerCase().includes(search)) ||
                    (c.image_hash && c.image_hash.toLowerCase().includes(search))
                );
            }
            
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            
            res.json({
                total: filtered.length,
                page,
                limit,
                items: filtered.slice(startIndex, endIndex)
            });
        } catch (e) {
            res.status(500).json({ error: 'Error parsing data' });
        }
    } else {
        res.status(404).json({ error: 'Data not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
