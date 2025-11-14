require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const verifyAPIKey = require('./middlewares/verifyAPIKey');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const MyAPI = require('./classes/api.js');
const { debugPort } = require('process');
const myAPI = new MyAPI();

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive : true });
}

const storage = multer.diskStorage({
    destination: (req, res, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '.' + ext);
    }
})

const upload = multer({ storage })

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use(cors({   
    origin: '*', // หรือ '*' เพื่ออนุญาตทุกที่
    methods: ['GET','POST','PUT','DELETE'],
    allowedHeaders: ['Content-Type', 'x-api-key']
}));
app.use('/api/uploads', express.static('uploads'));

const serverError = {
    success: false,
    errorMessage: {
        thai: 'เซิร์ฟเวอร์ขัดข้อง โปรดลองใหม่อีกครั้ง',
        eng: "Server failed, please try again later"
    }
}

// insert data to firebase 
app.post('/api/createData', verifyAPIKey, async (req, res) => {
    try {
        const { name, message, filename } = req.body;
        console.log('req body : ', req.body);

        if (!name || !message) {
            res.status(400).json({
                success: false,
                errorMessage: {
                    thai: 'ข้อมูลไม่ครบถ้วน',
                    eng: 'Missing required fields'
                }
            });
        }
        
        // send data to myAPI.createData object => /api.js
        const apiRes = await myAPI.createData({name, message, filename});

        // handling response
        if (apiRes.success) {
            res.status(200).json(apiRes);
        } else {
            res.status(400).json(apiRes);
        }
    } catch (err) {
        console.log('Error myAPI.createData : ', err);
        res.status(500).json(serverError);
    }
});

// upload photo to uploads/
app.post('/api/upload', verifyAPIKey, upload.single('image'), async (req, res) => {
    try {

        const apiRes = await myAPI.upload(req);

        if (apiRes.success) {
            res.status(200).json(apiRes);
        } else {
            res.status(400).json(apiRes)
        }
    } catch (err) {
        console.log('Error myAPI.upload : ', err);
        res.status(500).json(serverError);
    }
});

app.get('/api/getAllData', verifyAPIKey, async (req, res) => {
    try {
        const apiRes = await myAPI.getAllData();

        if (apiRes.success) {
            res.status(200).json(apiRes);
        } else {
            res.status(400).json(apiRes);
        }
    } catch (err) {
        console.log('Error myAPI.getAllData : ', err);
        res.status(500).json(serverError);
    }
});

app.delete('/api/delete', verifyAPIKey, async (req, res) => {
    try {
        const { id } = req.body;

        const docRef = await myAPI.getDataBy(id);
        if (!docRef.success) {
            res.status(400).json(docRef);
        }

        const data = docRef.data;

        if (data.filename) {
            console.log('filename : ',data.filename);
            const apiRes = await myAPI.deleteFile(data.filename);

            if (apiRes.success) {
                const apiRes = await myAPI.deleteData(id);
                if (apiRes.success) {
                    res.status(200).json(apiRes);
                } else {
                    res.status(400).json(apiRes);
                }
            } else {
                res.status(400).json(apiRes);
            }
        } else {
            const apiRes = await myAPI.deleteData(id)

            if (apiRes.success) {
                res.status(200).json(apiRes);
            } else {
                res.status(400).json(apiRes);
            }
        }
    } catch (err) {
        console.log(err);
        res.status(500).json(serverError);
    }
});

app.listen(PORT, () => {
    console.log(`App is running on http://localhost:${PORT}`);
});