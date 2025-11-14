require('dotenv').config();
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const multer = require('multer');

const db = require('../config/firebase.js');

// for upload file make filename like xxxxxxxxxx-xxxxxx.ext
const storage = multer.diskStorage({
    destination: (req, res, cb) => {
        cb(null, '../uploads');
    },
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '.' + ext);
    }
});

const upload = multer({ storage });


class MyAPI {
    constructor() {
        this.db = db;
    }

    async createData({name, message, filename}) {
        try {
            const value = {
                name, 
                message, 
                filename,
                date: new Date()
            };
            
            //add data to firestores
            await this.db.collection('messages').add(value);
            return {
                success: true,
                successMessage: {
                    thai: 'ข้อมูลถูกเพิ่มเรียบร้อยแล้ว',
                    eng: 'Your information has been inserted'
                }
            }
        } catch (err) {
            console.log('Error: ', err);
            return {
                success: false,
                errorMessage: {
                    thai: 'มีบางอย่างผิดพลาด โปรดตรวจสอบข้อมูลของคุณ',
                    eng: 'Something went wrong please check your information'
                }
            }
        }
    }

    async upload(req) {
        try {
            if (!req.file) {
                return {
                    success: false,
                    errorMessage: {
                        thai: 'ไม่สามารถอัพโหลดไฟล์รูปภาพของคุณได้ โปรดลองใหม่อีกครั้ง',
                        eng: 'Unable to upload your photo. Please try again'
                    }
                }
            } else {
                return {
                    success: true,
                    successMessage: {
                        thai: 'อัพโหลดรูปภาพของคุณเสร้จสิ้น',
                        eng: 'Your photo has been uploaded successfully'
                    },
                    filename: req.file.filename
                }
            }
        } catch (err) {
            console.log('(myAPI.upload ERROR : )', err);
            return {
                success: false,
                errorMessage: {
                    thai: 'เกิดปัญหาระหว่างการอัพโหลด',
                    eng: 'An error occurred during upload'
                }
            }
        }
    }

    async getDataBy(id) {
        try {
            const docRef = this.db.collection('messages').doc(id);
            const snapshot = await docRef.get();

            if (!snapshot.exists) {
                return {
                    success: false,
                    errorMessage: {
                        thai: 'ไม่พบข้อมูล',
                        eng: 'document not found'
                    }
                }
            }

            const data = snapshot.data();
            return {
                success: true,
                data,
            }
        } catch (err) {
            return {
                success: false,
                errorMessage: {
                    thai: 'ไม่สามารถหาข้อมูลได่',
                    eng: 'Can not find data'
                }
            }
        }
    }

    async getAllData() {
        try {
            const docRef = this.db.collection('messages').orderBy('date', 'desc');
            const snapshot = await docRef.get();

            let documents = [];
            snapshot.forEach(doc => {
                documents.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return {
                success: true,
                data: documents,
                successMessage: {
                    thai: 'โหลดข้อมูลสำเร็จ',
                    eng: 'download information successfully'
                }
            }
        } catch (err) {
            return {
                success: false,
                errorMessage: {
                    thai: 'ไม่สามารถโหลดข้อมูลได้',
                    eng: 'Unable to loading data'
                }
            }
        }
    }

    async deleteFile(filename) {
        try {
            const directoryPath = './uploads';
            const filePath = `${directoryPath}/${filename}`;
            console.log('filepath : ', filePath);
            if (!fs.existsSync(filePath)) {
                return {
                    success: false,
                    errorMessage: {
                        thai: 'ไม่พบไฟล์รูปภาพ',
                        eng: 'Can not find photo'
                    }
                }
            }
            fs.unlinkSync(filePath);
            return {
                success: true,
                successMessage: {
                    thai: 'ลบรูปภาพสำเร็จ',
                    eng: 'Your photo has been deleted'
                }
            }
        } catch (err) {
            return {
                success: false,
                errorMessage: {
                    thai: 'ไม่พบรูปภาพในโฟเดอร์อัพโหลด',
                    eng: `Can't find your photo in upload directory`
                }
            }
        }
    }

    async deleteData(id) {
        try {
            const docRef = this.db.collection('messages').doc(id);
            await docRef.delete();

            return {
                success: true,
                successMessage: {
                    thai: 'ลบข้อมูลสำเร็จ',
                    eng: `Data has been deleted successfully`
                }
            }
        } catch (err) {
            return {
                success: false,
                errorMessage: {
                    thai: 'ไม่สามารถลบข้อมูลได้',
                    eng: `Can't delete data`
                }
            }
        }
    }
}

module.exports = MyAPI;