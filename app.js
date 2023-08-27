const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

const fs = require('fs');


const app = express();
dotenv.config();

app.use(express.static(path.join(__dirname, 'build')));

//cors related stuff
const cors = require('cors');
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
//-------
//----mongoDb related stuff----
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://avnaneet:Avnaneet%40123@cluster0.ctszd6b.mongodb.net/?retryWrites=true&w=majority";
//Please don't hack me, the account above is an unverified dummy google account :) 
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
// async function run() {
//     try {
//         await client.connect();
//         const coll = client.db("MonkeyBoxAssessmentDB").collection("MonkeyBoxAssessmentCollection");
//         const token = "token6";

//         //Write token
//         coll.updateOne(
//             { creds: { $exists: true } },
//             { $set: { creds: token } }
//         );

//         //Read token
//         const tokenRetrieved = (await coll.findOne()).creds;
//         console.log(tokenRetrieved);
//         // var tokenRetrieved;
//         // coll.findOne().then(doc => {
//         //     tokenRetrieved = doc.creds;
//         // })
//         // console.log(tokenRetrieved);


//     } finally { await client.close(); }
// }
// run().catch(console.dir);

// const token = "token8";
// client.connect().then(() => {
//     const coll = client.db("MonkeyBoxAssessmentDB").collection("MonkeyBoxAssessmentCollection");

//     coll.updateOne(
//         { creds: { $exists: true } },
//         { $set: { creds: token } }
//     );

//     // const tokenRetrieved = (coll.findOne()).creds;
//     // console.log(tokenRetrieved);
//     coll.findOne().then(result => console.log(result.creds));

// });
// client.close();
//------

const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
)

const drive = google.drive({ version: 'v3', auth: oAuth2Client });


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/status', async (req, res) => {
    // const creds = fs.readFileSync("creds.json");
    await client.connect();
    const coll = client.db("MonkeyBoxAssessmentDB").collection("MonkeyBoxAssessmentCollection");

    const creds = (await coll.findOne()).creds;
    res.send(JSON.stringify(JSON.parse(creds)));
});


app.get('/auth/google', (req, res) => {
    const url = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
            "https://www.googleapis.com/auth/drive.metadata.readonly",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/drive"
        ]
    })
    res.header('Access-Control-Allow-Credentials', true);
    res.redirect(url);
});

app.get('/redirect', (req, res) => {
    const { code } = req.query;
    oAuth2Client.getToken(code, async (err, token) => {

        if (err) { res.send("Error-------Write something meaningful later") }

        oAuth2Client.setCredentials(token);
        // fs.writeFileSync("creds.json", JSON.stringify(token));
        await client.connect();
        const coll = client.db("MonkeyBoxAssessmentDB").collection("MonkeyBoxAssessmentCollection");
        coll.updateOne(
            { creds: { $exists: true } },
            { $set: { creds: JSON.stringify(token) } }
        );
        // res.header('Access-Control-Allow-Credentials', true);
        res.redirect("/"); //replace this with: res.redirect("http://localhost:3000/")
    });
});


app.get('/files/google', (req, res) => {

    drive.files.list({}, (err, response) => res.send(response.data.files));
});

app.get('/fileDetails', (req, res) => {

    drive.files.get({ fileId: req.query.fileId, fields: "name,id,size,mimeType" }, (err, response) => res.send(response.data));
});

app.get('/info/google', (req, res) => {

    drive.about.get({ fields: "storageQuota" }, (err, response) => {
        res.send({
            "totalStorageInMb": response.data.storageQuota.limit / 1048576,
            "usedStorageInMb": response.data.storageQuota.usage / 1048576,
            "availableStorageInMb": (response.data.storageQuota.limit - response.data.storageQuota.usage) / 1048576
        });
    })

});

app.get('/revoke/google', async (req, res) => {
    // const creds = fs.readFileSync("creds.json");

    await client.connect();
    const coll = client.db("MonkeyBoxAssessmentDB").collection("MonkeyBoxAssessmentCollection");
    
    const creds = (await coll.findOne()).creds;
    
    oAuth2Client.revokeToken(JSON.parse(creds).access_token);
    
    // fs.writeFileSync("creds.json", JSON.stringify(null));

    coll.updateOne(
        { creds: { $exists: true } },
        { $set: { creds: JSON.stringify(null) } }
    );

    res.send({ revokeStatus: true });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server Started ${PORT}`));
