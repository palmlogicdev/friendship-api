require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const verifyAPIKey = require('./middlewares/verifyAPIKey');
const multer = require('multer');

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

const serviceAccount = {
  type: process.env.TYPE,
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'), // แปลง \n กลับเป็น newline จริง
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use(cors({   
    origin: '*', // หรือ '*' เพื่ออนุญาตทุกที่
    methods: ['GET','POST','PUT','DELETE'],
    allowedHeaders: ['Content-Type', 'x-api-key']
}));
app.use('/api/uploads', express.static('uploads'));

// insert data to firebase 
app.post('/api/createData', verifyAPIKey, async (req, res) => {
    const { name, message, filename } = req.body;
    const date = new Date();
    let value = {name, message, filename, date};

    try {
        const docRef = await db.collection('messages').add(value);

        if (docRef) {
        res.status(200).json({
            success: true,
            recived: {
                name,
                message, 
                filename,
                date
            },
            messageStatus: {
                thai: 'ข้อความของคุณถึงเพิ่มแล้ว!',
                eng: 'Your message has been inserted successfully'
            }
        });
        } else {
            res.status(400).json({
                success: false,
                messageStatus: {
                    thai: 'ไม่สามารถเพิ่มข้อความของคุณได้',
                    eng: "Oops! We couldn't save your message 😅 Please try again"
                }
            })
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            messageStatus: {
                thai: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                eng: 'Unable to save your data. Please try again later'
            },
            error
        });
    }
});

// upload photo to uploads/
app.post('/api/upload', verifyAPIKey, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            messageStatus: {
                thai: 'ไม่สามารถอัพโหลดรูปของคุณได้',
                eng: 'Unable to upload your photo. Please try again'
            }
        })
    }

    res.status(200).json({
        success: true,
        messageStatus: {
            thai: 'อัปโหลดรูปของคุณสำเร็จ',
            eng: 'Your photo has been uploaded successfully'
        },
        filename: req.file.filename
    });
});

app.get('/api/getAllData', async (req, res) => {
    const snapshot = await db.collection('messages')
                                 .orderBy('date', 'desc')
                                 .get();
    const documents = [];
    snapshot.forEach(doc => {
        documents.push({
            id: doc.id,
            ...doc.data()
        });
    });
    res.status(200).json(documents);
});

app.listen(PORT, () => {
    console.log(`App is running on http://localhost:${PORT}`);
});