const puppeteer = require('puppeteer');
const fs = require('fs')
const {promisify} = require('util');
const moment = require('moment')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const AWS = require('aws-sdk');
const readFile = promisify(fs.readFile);

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
})

async function read_csv_file(path) {
    try {
        const data = await readFile(path);
        return JSON.stringify(data, null, 2)

    } catch (e) {
        return 'error'
    }
}


async function s3_upload(data) {
    try {
        const response = await s3.upload({
            Bucket: 'sbi-earnings-cal-csv',
            Key: 'output.csv',
            Body: data,
        }).promise()
    } catch (e) {

    }
}

(async () => {
    const data = await read_csv_file('./csv/sbi_earnings_cal_20190802.csv')
    const response = await s3_upload(data)
    console.log(data)
})()
