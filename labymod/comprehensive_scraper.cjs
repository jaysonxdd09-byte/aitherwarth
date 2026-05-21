const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://laby.net/api/v3';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DATA_FILE = 'all_cloaks.json';
const DOWNLOAD_DIR = path.join(__dirname, '..', 'public', 'cache');

// --- OPTIMIZED SPEED SETTINGS ---
const DISCOVERY_CONCURRENCY = 1; // Single thread is fastest because it avoids 429 pauses
const DOWNLOAD_CONCURRENCY = 300; // Downloads are not restricted
const PAGE_SIZE = 100;
// ----------------------------

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR);
}

const cloaksMap = new Map();
const downloadQueue = [];
let activeDownloads = 0;

async function fetchApi(endpoint) {
    const url = `${BASE_URL}${endpoint}`;
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

async function downloadFile(url, filename) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(filename)) return resolve();
        const options = { headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://laby.net/cloaks' } };
        const file = fs.createWriteStream(filename);
        https.get(url, options, (response) => {
            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(filename, () => {});
                return reject(new Error('FAIL'));
            }
            response.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', (err) => { fs.unlink(filename, () => {}); reject(err); });
    });
}

async function processDownloadQueue() {
    while (downloadQueue.length > 0 && activeDownloads < DOWNLOAD_CONCURRENCY) {
        activeDownloads++;
        const { url, filename } = downloadQueue.shift();
        downloadFile(url, filename)
            .catch(() => downloadQueue.push({ url, filename })) 
            .finally(() => {
                activeDownloads--;
                processDownloadQueue();
            });
    }
}

function addToDownloadQueue(url, filename) {
    downloadQueue.push({ url, filename });
    processDownloadQueue();
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function discoveryWorker(queries) {
    while (queries.length > 0) {
        const queryObj = queries.shift();
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const endpoint = queryObj.q 
                ? `/search/textures/${queryObj.type}?q=${queryObj.q}&size=${PAGE_SIZE}&offset=${offset}`
                : `/search/textures/${queryObj.type}?order=${queryObj.order}&size=${PAGE_SIZE}&offset=${offset}`;

            try {
                const data = await fetchApi(endpoint);
                if (data && data.results && data.results.length > 0) {
                    data.results.forEach(item => {
                        if (!cloaksMap.has(item.image_hash)) {
                            const imageUrl = `https://texture.laby.net/${item.image_hash}.png`;
                            cloaksMap.set(item.image_hash, { ...item, type: queryObj.type, imageUrl });
                            addToDownloadQueue(imageUrl, path.join(DOWNLOAD_DIR, `${item.image_hash}.png`));
                        }
                    });

                    // Save periodically
                    if (cloaksMap.size % 100 === 0) {
                        fs.writeFileSync(DATA_FILE, JSON.stringify(Array.from(cloaksMap.values()), null, 2));
                    }

                    if (data.results.length < PAGE_SIZE || offset >= 1400) {
                        hasMore = false;
                    } else {
                        offset += PAGE_SIZE;
                        await sleep(500); // 500ms gap to keep the API happy
                    }
                } else {
                    hasMore = false;
                }
            } catch (err) {
                if (err.message === 'RATE_LIMIT') {
                    console.log(`\n[SPEED] Rate limit hit. Pausing 30s...`);
                    queries.unshift(queryObj); 
                    await sleep(30000);
                    break; 
                }
                hasMore = false;
            }
        }
        process.stdout.write(`\r[SPEED] Found: ${cloaksMap.size} | DL Queue: ${downloadQueue.length} | Active DL: ${activeDownloads} | Queries Left: ${queries.length}    `);
    }
}

async function startSpeedSync() {
    if (fs.existsSync(DATA_FILE)) {
        const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        existing.forEach(item => {
            cloaksMap.set(item.image_hash, item);
            const filePath = path.join(DOWNLOAD_DIR, `${item.image_hash}.png`);
            if (!fs.existsSync(filePath)) addToDownloadQueue(item.imageUrl, filePath);
        });
        console.log(`Loaded ${cloaksMap.size} items.`);
    }

    const hexChars = '0123456789abcdef'.split('');
    const queries = [];
    ['cloak', 'cape'].forEach(type => ['latest', 'used', 'trending'].forEach(order => queries.push({ type, order })));
    ['cloak', 'cape'].forEach(type => {
        for (let i = 0; i < 256; i++) {
            queries.push({ type, q: i.toString(16).padStart(2, '0') });
        }
    });

    console.log(`--- STARTING OPTIMIZED SPEED INSTALL (TARGET: 10,000+) ---`);
    console.log(`Discovery: 1 Thread (Stable), Download: 300 Threads (Fast)`);

    await discoveryWorker(queries);

    fs.writeFileSync(DATA_FILE, JSON.stringify(Array.from(cloaksMap.values()), null, 2));
    console.log(`\n\n--- SYNC COMPLETE! TOTAL: ${cloaksMap.size} ---`);
}

startSpeedSync();
