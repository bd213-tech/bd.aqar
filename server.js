const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'data', 'db.json');
const sessions = new Map();
const pendingVerifications = new Map();
const passwordResets = new Map();
const rateLimits = new Map();
const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

async function readDb() {
    return JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
}

async function writeDb(db) {
    await fs.writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
}

function sendJson(response, status, payload) {
    response.writeHead(status, securityHeaders({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }));
    response.end(JSON.stringify(payload));
}

function securityHeaders(headers = {}) {
    return { ...headers, 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Content-Security-Policy': "default-src 'self'; img-src 'self' https://images.unsplash.com blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" };
}

function allowedRequest(request, key, limit, windowMs) {
    const now = Date.now();
    const address = request.socket.remoteAddress || 'unknown';
    const bucketKey = `${key}:${address}`;
    const bucket = rateLimits.get(bucketKey) || { count: 0, expires: now + windowMs };
    if (bucket.expires <= now) { bucket.count = 0; bucket.expires = now + windowMs; }
    bucket.count += 1;
    rateLimits.set(bucketKey, bucket);
    return bucket.count <= limit;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (error, derivedKey) => error ? reject(error) : resolve(`${salt}:${derivedKey.toString('hex')}`)));
}

async function verifyPassword(password, storedHash) {
    const [salt, expected] = storedHash.split(':');
    if (!salt || !expected || expected.length !== 128) return false;
    const candidate = await hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(candidate.split(':')[1], 'hex'), Buffer.from(expected, 'hex'));
}

function clean(value, maxLength = 500) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function tokenFor(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { userId, expires: Date.now() + 24 * 60 * 60 * 1000 });
    return token;
}

function authenticatedUser(request, db) {
    const token = request.headers.authorization?.replace('Bearer ', '');
    const session = token && sessions.get(token);
    if (!session || session.expires < Date.now()) return null;
    return db.users.find((user) => user.id === session.userId) || null;
}

async function bodyJson(request) {
    let body = '';
    for await (const chunk of request) {
        body += chunk;
        if (body.length > 1_000_000) throw new Error('Request body too large');
    }
    return body ? JSON.parse(body) : {};
}

async function api(request, response, url) {
    if (request.method === 'GET' && url.pathname === '/api/health') return sendJson(response, 200, { ok: true, service: 'BD AQAR API' });
    const db = await readDb();

    if (request.method === 'POST' && url.pathname === '/api/register') {
        if (!allowedRequest(request, 'register', 5, 15 * 60 * 1000)) return sendJson(response, 429, { error: 'Too many registration attempts. Try again later.' });
        const input = await bodyJson(request);
        const email = clean(input.email, 160).toLowerCase();
        const password = typeof input.password === 'string' ? input.password : '';
        const confirmation = typeof input['confirm-password'] === 'string' ? input['confirm-password'] : '';
        const phone = clean(input.phone, 20);
        if (password !== confirmation) return sendJson(response, 400, { error: 'Password and confirmation must match.' });
        if (!email || !email.includes('@') || !/^\d{10}$/.test(phone) || password.length < 8) return sendJson(response, 400, { error: 'Enter a valid email, a 10-digit phone number, and a password of at least 8 characters.' });
        if (db.users.some((user) => user.email === email)) return sendJson(response, 409, { error: 'An account with this email already exists.' });
        const user = { id: crypto.randomUUID(), firstName: clean(input['first-name'], 80), lastName: clean(input['last-name'], 80), email, phone, wilaya: clean(input.wilaya, 80), accountType: clean(input['account-type'], 20), passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
        const challengeId = crypto.randomUUID();
        const code = String(crypto.randomInt(100000, 1000000));
        pendingVerifications.set(challengeId, { user, code, expires: Date.now() + 10 * 60 * 1000, attempts: 0 });
        console.log(`BD AQAR demo OTP for ${email} / ${user.phone}: ${code}`);
        const result = { message: 'OTP sent to your phone and email.', challengeId };
        if (process.env.NODE_ENV !== 'production') result.demoCode = code;
        return sendJson(response, 201, result);
    }

    if (request.method === 'POST' && url.pathname === '/api/verify-otp') {
        if (!allowedRequest(request, 'verify-otp', 10, 15 * 60 * 1000)) return sendJson(response, 429, { error: 'Too many OTP attempts. Try again later.' });
        const input = await bodyJson(request);
        const challenge = pendingVerifications.get(clean(input.challengeId, 80));
        if (!challenge || challenge.expires < Date.now() || challenge.attempts >= 5) return sendJson(response, 400, { error: 'This OTP has expired. Please register again.' });
        challenge.attempts += 1;
        if (clean(input.code, 6) !== challenge.code) return sendJson(response, 400, { error: 'Invalid OTP code.' });
        if (db.users.some((user) => user.email === challenge.user.email)) return sendJson(response, 409, { error: 'An account with this email already exists.' });
        challenge.user.phoneVerified = true;
        challenge.user.emailVerified = true;
        challenge.user.verifiedAt = new Date().toISOString();
        db.users.push(challenge.user);
        await writeDb(db);
        pendingVerifications.delete(input.challengeId);
        return sendJson(response, 201, { message: 'Phone and email verified.', token: tokenFor(challenge.user.id), user: { id: challenge.user.id, email: challenge.user.email, firstName: challenge.user.firstName } });
    }

    if (request.method === 'POST' && url.pathname === '/api/login') {
        if (!allowedRequest(request, 'login', 10, 15 * 60 * 1000)) return sendJson(response, 429, { error: 'Too many login attempts. Try again later.' });
        const input = await bodyJson(request);
        const login = clean(input.login, 160).toLowerCase();
        const user = db.users.find((candidate) => candidate.email === login || candidate.phone === input.login);
        if (!user || !(await verifyPassword(input.password || '', user.passwordHash))) return sendJson(response, 401, { error: 'Email/phone or password is incorrect.' });
        if (!user.phoneVerified || !user.emailVerified) return sendJson(response, 403, { error: 'Please verify your phone and email first.' });
        return sendJson(response, 200, { message: 'Login successful.', token: tokenFor(user.id), user: { id: user.id, email: user.email, firstName: user.firstName, accountType: user.accountType, role: user.role || user.accountType } });
    }

    if (request.method === 'POST' && url.pathname === '/api/request-password-reset') {
        if (!allowedRequest(request, 'password-reset', 5, 15 * 60 * 1000)) return sendJson(response, 429, { error: 'Too many reset requests. Try again later.' });
        const input = await bodyJson(request);
        const email = clean(input.email, 160).toLowerCase();
        const user = db.users.find((candidate) => candidate.email === email);
        if (!user) return sendJson(response, 200, { message: 'If this email exists, a reset OTP has been sent.' });
        const resetId = crypto.randomUUID();
        const code = String(crypto.randomInt(100000, 1000000));
        passwordResets.set(resetId, { userId: user.id, code, expires: Date.now() + 10 * 60 * 1000, attempts: 0 });
        console.log(`BD AQAR demo password reset OTP for ${email}: ${code}`);
        const result = { message: 'Password reset OTP sent.', resetId };
        if (process.env.NODE_ENV !== 'production') result.demoCode = code;
        return sendJson(response, 200, result);
    }

    if (request.method === 'POST' && url.pathname === '/api/reset-password') {
        if (!allowedRequest(request, 'reset-password', 10, 15 * 60 * 1000)) return sendJson(response, 429, { error: 'Too many reset attempts. Try again later.' });
        const input = await bodyJson(request);
        const reset = passwordResets.get(clean(input.resetId, 80));
        const newPassword = typeof input.newPassword === 'string' ? input.newPassword : '';
        if (!reset || reset.expires < Date.now() || reset.attempts >= 5) return sendJson(response, 400, { error: 'This reset request has expired.' });
        reset.attempts += 1;
        if (clean(input.code, 6) !== reset.code) return sendJson(response, 400, { error: 'Invalid OTP code.' });
        if (newPassword.length < 8) return sendJson(response, 400, { error: 'New password must contain at least 8 characters.' });
        const user = db.users.find((candidate) => candidate.id === reset.userId);
        user.passwordHash = await hashPassword(newPassword);
        await writeDb(db);
        passwordResets.delete(input.resetId);
        return sendJson(response, 200, { message: 'Password changed successfully.' });
    }

    if (request.method === 'GET' && url.pathname === '/api/properties') return sendJson(response, 200, { properties: db.properties });

    if (request.method === 'GET' && url.pathname === '/api/me') {
        const user = authenticatedUser(request, db);
        if (!user) return sendJson(response, 401, { error: 'Authentication required.' });
        return sendJson(response, 200, { user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, accountType: user.accountType, role: user.role || user.accountType } });
    }

    if (request.method === 'GET' && url.pathname === '/api/my-properties') {
        const user = authenticatedUser(request, db);
        if (!user) return sendJson(response, 401, { error: 'Authentication required.' });
        return sendJson(response, 200, { properties: db.properties.filter((property) => property.ownerId === user.id) });
    }

    if (request.method === 'POST' && url.pathname === '/api/properties') {
        const user = authenticatedUser(request, db);
        if (!user) return sendJson(response, 401, { error: 'Please log in before adding a property.' });
        const input = await bodyJson(request);
        if (input['accept-commission'] !== 'true') return sendJson(response, 400, { error: 'You must accept the 1% BD AQAR commission.' });
        if (input['communication-authorization'] !== 'true') return sendJson(response, 400, { error: 'You must authorize BD AQAR communication for this listing.' });
        const price = Number(input.price) || 0;
        const now = new Date().toISOString();
        const property = { id: crypto.randomUUID(), ownerId: user.id, title: clean(input.title, 120), type: clean(input.type, 40), listing: clean(input.listing, 40), price, commissionRate: 0.01, commissionAmount: Math.round(price * 0.01 * 100) / 100, commissionAcceptedAt: now, communicationAuthorized: true, communicationAuthorizedAt: now, ownerContactFirstRequired: true, directContactAllowed: false, agreementVersion: '1.1', wilaya: clean(input.wilaya, 80), area: clean(input.area, 80), bedrooms: Number(input.bedrooms) || 0, bathrooms: Number(input.bathrooms) || 0, surface: Number(input.surface) || 0, description: clean(input.description, 2000), status: 'Pending', createdAt: now };
        if (!property.title || !property.type || !property.wilaya || !property.description || property.price <= 0 || property.surface <= 0) return sendJson(response, 400, { error: 'Please complete the required property details.' });
        db.properties.push(property);
        await writeDb(db);
        return sendJson(response, 201, { message: 'Property submitted for review.', property });
    }

    if (request.method === 'POST' && url.pathname === '/api/contact') {
        const input = await bodyJson(request);
        const message = { id: crypto.randomUUID(), name: clean(input.name, 100), email: clean(input.email, 160).toLowerCase(), message: clean(input.message, 2000), createdAt: new Date().toISOString() };
        if (!message.name || !message.email.includes('@') || !message.message) return sendJson(response, 400, { error: 'Please complete all contact fields.' });
        db.messages.push(message);
        await writeDb(db);
        return sendJson(response, 201, { message: 'Message received.' });
    }

    sendJson(response, 404, { error: 'API route not found.' });
}

async function serveStatic(request, response, url) {
    const requested = url.pathname === '/' ? '/login.html' : url.pathname;
    const filePath = path.resolve(ROOT, `.${requested}`);
    const relativePath = path.relative(ROOT, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || path.basename(filePath) === 'db.json') return sendJson(response, 403, { error: 'Forbidden' });
    try {
        const file = await fs.readFile(filePath);
        response.writeHead(200, securityHeaders({ 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' }));
        response.end(file);
    } catch { sendJson(response, 404, { error: 'Page not found.' }); }
}

const server = http.createServer(async (request, response) => {
    try {
        const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
        if (url.pathname.startsWith('/api/')) await api(request, response, url);
        else await serveStatic(request, response, url);
    } catch (error) {
        sendJson(response, error.message === 'Request body too large' ? 413 : 400, { error: 'Invalid request.' });
    }
});

server.listen(PORT, () => console.log(`BD AQAR server running at http://localhost:${PORT}`));
