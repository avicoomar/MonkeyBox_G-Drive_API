const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const fs = require('fs');

dotenv.config();

const app = express();

app.use(express.static(path.join(__dirname, 'build')));

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// MongoDB connection setup
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Google OAuth2 setup
const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// Middleware for MongoDB connection
async function connectMongoDB() {
    try {
        await client.connect();
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

// Middleware for handling errors
function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
}

// Middleware for handling authentication errors
function authenticationErrorHandler(err, req, res, next) {
    console.error('Authentication Error:', err);
    res.status(401).json({ error: 'Authentication Error' });
}

// MongoDB credential handling
async function getMongoDBCreds() {
    try {
        const coll = client.db("MonkeyBoxAssessmentDB").collection("MonkeyBoxAssessmentCollection");
        const creds = (await coll.findOne()).creds;
        return JSON.parse(creds);
    } catch (error) {
        console.error('Error getting MongoDB credentials:', error);
        throw error;
    }
}

// Google OAuth2 token revocation
async function revokeGoogleToken(accessToken) {
    try {
        oAuth2Client.setCredentials({ access_token: accessToken });
        await oAuth2Client.revokeToken();
    } catch (error) {
        console.error('Error revoking Google token:', error);
        throw error;
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/status', async (req, res, next) => {
    try {
        await connectMongoDB();
        const creds = await getMongoDBCreds();
        res.send(JSON.stringify(JSON.parse(creds)));
    } catch (error) {
        next(error);
    }
});

app.get('/auth/google', (req, res) => {
    const url = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/drive.metadata.readonly',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/drive',
        ],
    });
    res.header('Access-Control-Allow-Credentials', true);
    res.redirect(url);
});

app.get('/redirect', (req, res, next) => {
    const { code } = req.query;
    oAuth2Client.getToken(code, async (err, token) => {
        if (err) {
            next(err);
        } else {
            try {
                await connectMongoDB();
                const coll = client.db("MonkeyBoxAssessmentDB").collection("MonkeyBoxAssessmentCollection");
                coll.updateOne(
                    { creds: { $exists: true } },
                    { $set: { creds: JSON.stringify(token) } }
                );
                res.redirect('/');
            } catch (error) {
                next(error);
            }
        }
    });
});

app.get('/files/google', async (req, res, next) => {
    try {
        await connectMongoDB();
        const creds = await getMongoDBCreds();
        oAuth2Client.setCredentials(creds);

        // List files from Google Drive
        drive.files.list({}, (err, response) => {
            if (err) {
                next(err);
            } else {
                res.send(response.data.files);
            }
        });
    } catch (error) {
        next(error);
    }
});

app.get('/fileDetails', async (req, res, next) => {
    try {
        await connectMongoDB();
        const creds = await getMongoDBCreds();
        oAuth2Client.setCredentials(creds);

        const fileId = req.query.fileId;

        // Get file details from Google Drive
        drive.files.get({ fileId, fields: "name,id,size,mimeType" }, (err, response) => {
            if (err) {
                next(err);
            } else {
                res.send(response.data);
            }
        });
    } catch (error) {
        next(error);
    }
});

app.get('/info/google', async (req, res, next) => {
    try {
        await connectMongoDB();
        const creds = await getMongoDBCreds();
        oAuth2Client.setCredentials(creds);

        // Get storage quota information from Google Drive
        drive.about.get({ fields: "storageQuota" }, (err, response) => {
            if (err) {
                next(err);
            } else {
                const storageQuota = response.data.storageQuota;
                const totalStorageInMb = storageQuota.limit / 1048576;
                const usedStorageInMb = storageQuota.usage / 1048576;
                const availableStorageInMb = (storageQuota.limit - storageQuota.usage) / 1048576;

                res.send({
                    totalStorageInMb,
                    usedStorageInMb,
                    availableStorageInMb,
                });
            }
        });
    } catch (error) {
        next(error);
    }
});

app.get('/revoke/google', async (req, res, next) => {
    try {
        await connectMongoDB();
        const creds = await getMongoDBCreds();
        const accessToken = JSON.parse(creds).access_token;

        // Revoke Google token
        oAuth2Client.setCredentials({ access_token: accessToken });
        await oAuth2Client.revokeToken();

        const coll = client.db("MonkeyBoxAssessmentDB").collection("MonkeyBoxAssessmentCollection");
        coll.updateOne(
            { creds: { $exists: true } },
            { $set: { creds: JSON.stringify(null) } }
        );

        res.send({ revokeStatus: true });
    } catch (error) {
        next(error);
    }
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server Started ${PORT}`));
