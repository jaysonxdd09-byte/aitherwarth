const https = require('https');
const fs = require('fs');
const path = require('path');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DATA_FILE = path.join(__dirname, 'all_cloaks.json');
const CAPU_DIR = path.join(__dirname, '..', 'capu');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchMetadata(hash) {
    const url = `https://laby.net/api/v3/texture/${hash}`;
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
                'Referer': 'https://laby.net/cloaks'
            }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('JSON_ERROR')); }
                } else if (res.statusCode === 429) {
                    reject(new Error('RATE_LIMIT'));
                } else {
                    reject(new Error(`STATUS_${res.statusCode}`));
                }
            });
        }).on('error', (err) => reject(err));
    });
}

async function enrich() {
    console.log('--- STARTING METADATA ENRICHER ---');
    
    let cloaks = [];
    if (fs.existsSync(DATA_FILE)) {
        cloaks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    const cloaksMap = new Map(cloaks.map(c => [c.image_hash, c]));

    const files = fs.readdirSync(CAPU_DIR).filter(f => f.endsWith('.png'));
    console.log(`Found ${files.length} local capes.`);

    const missing = files.filter(f => {
        const hash = f.replace('.png', '');
        const existing = cloaksMap.get(hash);
        return !existing || !existing.tags;
    });

    console.log(`Need to fetch metadata for ${missing.length} capes.`);

    for (let i = 0; i < missing.length; i++) {
        const file = missing[i];
        const hash = file.replace('.png', '');
        
        process.stdout.write(`\r[${i + 1}/${missing.length}] Fetching: ${hash}... `);

        try {
            const data = await fetchMetadata(hash);
            if (data) {
                const item = {
                    image_hash: hash,
                    tags: data.tags || null,
                    type: 'cloak',
                    imageUrl: `https://texture.laby.net/${hash}.png`
                };
                cloaksMap.set(hash, item);
                
                // Save every 10 items
                if (cloaksMap.size % 10 === 0) {
                    fs.writeFileSync(DATA_FILE, JSON.stringify(Array.from(cloaksMap.values()), null, 2));
                }
            }
            await sleep(100); // Small delay to avoid aggressive rate limiting
        } catch (err) {
            if (err.message === 'RATE_LIMIT') {
                console.log('\nRate limit hit. Pausing 60s...');
                await sleep(60000);
                i--; // Retry same item
            } else {
                console.log(`\nFailed for ${hash}: ${err.message}`);
            }
        }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(Array.from(cloaksMap.values()), null, 2));
    console.log('\n\n--- ENRICHMENT COMPLETE! ---');
}

enrich();
