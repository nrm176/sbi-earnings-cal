const puppeteer = require('puppeteer');
const fs = require('fs')
const util = require('util');
const moment = require('moment')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const AWS = require('aws-sdk');
const readFile = util.promisify(fs.readFile);
require('dotenv').config()

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
})

async function read_csv_file(path) {
    try {
        return await readFile(path).then((data)=> {
            return data
        });
    } catch (e) {
        return 'error'
    }
}


async function s3_upload(data) {
    try {
        const response = await s3.upload({
            Bucket: 'sbi-earnings-cal-csv',
            Key: 'output2.csv',
            Body: data,
        }).promise()

        return response
    } catch (e) {
        return 'error'
    }
}

async function upload_csv_to_s3(path, fileName) {
    fs.readFile(path, (err, data) => {
        if (err) throw err;
        const params = {
            Bucket: 'sbi-earnings-cal-csv',
            Key: fileName,
            Body: data
        };

        s3.upload(params, (s3Err, data)=> {
            if (s3Err) throw s3Err
            console.log(`File uploaded successfully at ${data.Location}`)
        })
    })
}

(async () => {
    // await upload_csv_to_s3('./csv/sbi_earnings_cal_20190813.csv', "test2.csv")
    const data = await read_csv_file('./csv/sbi_earnings_cal_20190813.csv')
    const response = await s3_upload(data)
    console.log(response)
})()
