const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
// const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
// const { response } = require('express');

const app = express();
dotenv.config();

//cors related stuff
const cors = require('cors');
app.use(cors({
    origin : 'http://localhost:3000',
    methods : ['GET','POST','PUT','DELETE'],
    allowedHeaders : ['Content-Type', 'Authorization']
}));
//-------

const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
)

try {
    const creds = fs.readFileSync("creds.json");
    oAuth2Client.setCredentials(JSON.parse(creds));
} catch (err) {
    console.log(err);
}


app.get('/', (req, res) => res.send(' API Running'));

app.get('/status', (req, res) => {
    const creds = fs.readFileSync("creds.json");
    res.send(JSON.stringify(JSON.parse(creds)));
});


app.get('/auth/google', (req, res) => {
    const url = oAuth2Client.generateAuthUrl({
        access_type : "offline",
        scope : [
            "https://www.googleapis.com/auth/drive.metadata.readonly",
            "https://www.googleapis.com/auth/userinfo.profile", 
            "https://www.googleapis.com/auth/drive"
        ]
    })
    // res.header('Access-Control-Allow-Credentials', true);
    res.redirect(url);
});

app.get('/redirect', (req, res) => {
    const { code } = req.query;
    oAuth2Client.getToken(code, (err,token) => {
        if (err){ 
            // connectionStatus = false;
            res.send("Error-------Write something meaningful later")
        }        
        oAuth2Client.setCredentials(token);
        fs.writeFileSync("creds.json", JSON.stringify(token));
        // res.header('Access-Control-Allow-Credentials', true);
        
        res.send(token);
    });
});

app.get('/read/google', (req, res) => {
    // if (req.body.token == null) return res.status(400).send('Token not found');
    // oAuth2Client.setCredentials(req.body.token);

    //Throw some error if access is revoked

    //DOUBT: Should the App send the token or should it be sent by end user
    const creds = fs.readFileSync("creds.json");
    oAuth2Client.setCredentials(JSON.parse(creds));

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    
    drive.files.get({fileId : "1FXTMXvqdx9l6lEJX7gVKDu85741V0mZcRnC7h767Lrk", fields : "size"}, (err,response) => {
        res.send(response.data);
    });

});

app.get('/files/google', (req, res) => {
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    drive.files.list({}, (err, response) => {
        res.send(response.data.files);
    });
});

app.get('/fileDetails', (req, res) => {
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    drive.files.get({fileId : req.query.fileId, fields : "name,id,size,mimeType"}, (err,response) => {
        res.send(response.data);
    });
});

app.get('/info/google', (req, res) => {

    // const creds = fs.readFileSync("creds.json");
    // oAuth2Client.setCredentials(JSON.parse(creds));
    
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    
    drive.about.get({fields : "storageQuota"}, (err,response) => {
        res.send({
            "totalStorageInMb" : response.data.storageQuota.limit/1048576,
            "usedStorageInMb" : response.data.storageQuota.usage/1048576,
            "availableStorageInMb" : (response.data.storageQuota.limit-response.data.storageQuota.usage)/1048576
        });
    })

});

app.get('/revoke/google', (req, res) => {
    const creds = fs.readFileSync("creds.json");
    oAuth2Client.revokeToken(JSON.parse(creds).access_token);
    fs.writeFileSync("creds.json", JSON.stringify(null));
    res.send("Access Revoked! MonkeyBoxAssessment will no longer be able to access your Google Drive");
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server Started ${PORT}`));