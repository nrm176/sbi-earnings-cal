const puppeteer = require('puppeteer');
const fs = require('fs')
const util = require('util');
const moment = require('moment')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const {S3Client, AbortMultipartUploadCommand} = require("@aws-sdk/client-s3");
const readFile = util.promisify(fs.readFile);

const s3 = new S3Client({
    region: 'us-west-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
})

async function go_to_url(page, url) {
    await page.goto(url);
    await page.waitFor(1500);
    return page;
}


async function scrape_table(page) {
    const data = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('div#announcementInfo table.md-table06 tr')).filter((e, idx) => {
            return idx != 0
        }).map((e) => {
            return Array.from(e.querySelectorAll('td')).filter((e, idx) => {
                return idx != 7 && idx != 8
            }).map((e, idx) => {
                if (idx == 0) {
                    return e.querySelectorAll('p:nth-of-type(1)')[0].innerText.replace('\n', '')
                } else if (idx == 1) {
                    return e.innerText.replace('\n', '')
                } else if (idx == 2) {
                    return e.textContent.trim().replace(',', '')
                } else if (idx == 3) {
                    return e.textContent.trim().replace(',', '')
                } else if (idx == 4) {
                    return e.textContent.trim().replace(',', '')

                } else if (idx == 5) {
                    return e.textContent.trim().replace(',', '')

                } else if (idx == 6) {
                    return e.textContent.trim().replace(',', '')
                }
            })
        })
    },)
    return data
}


async function hasNextPage(page) {

    const next_back_elem = await page.evaluate(() => {
        return Array.from(document.querySelector('div.floatR.alR:nth-of-type(3)').querySelectorAll('a')).map((e) => {
            return e.textContent.trim()
        });
    })


    if (next_back_elem.length == 1 && next_back_elem[0] === '次へ→') {
        return true;
    } else if (next_back_elem.length == 2 && next_back_elem[1] == '次へ→') {
        return true;
    }
    return false;

}

async function click_next_page(page) {

    const next_back_elem = await page.$$('div.floatR.alR:nth-of-type(3) a');

    if (next_back_elem.length == 2) {
        await next_back_elem[0].click();
    } else if (next_back_elem.length == 4) {
        await next_back_elem[1].click()
    }
    await page.waitFor(3000);
    return page;
}


async function WriteDataToCSV(path, records) {
    const csvWriter = await createCsvWriter({
        path: path,
        header: [0, 1, 2, 3, 4, 5, 6],
        encoding: 'utf8'
    });

    await csvWriter.writeRecords(records)       // returns a promise
        .then(() => {
            console.log('...Done');
        });
}

async function upload_csv_to_s3(path, fileName) {
    fs.readFile(path, (err, data) => {
        if (err) throw err;
        const params = {
            Bucket: 'sbi-earnings-cal-csv',
            Key: fileName,
            Body: data
        };

        s3.upload(params, (s3Err, data) => {
            if (s3Err) throw s3Err
            console.log(`File uploaded successfully at ${data.Location}`)
        })
    })
}

async function read_csv_file(path) {
    const data = await readFile(path);

    return JSON.stringify(data, null, 2)

}

(async () => {

    let d = process.argv[2]

    if (d.length != 8 && /^\d+$/.test(d)) {
        console.log('yyyymmdd形式で日付を入力してください')
        return;
    } else if (d == 'today') {
        d = moment().format("YYYYMMDD");
    }

    const year = d.substring(0, 4)
    const month = d.substring(4, 6)
    const day = d.substring(6, 8)

    const SBI_EARNINGS_URL = `https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETmgR001Control&_PageID=WPLETmgR001Mdtl20&_DataStoreID=DSWPLETmgR001Control&_ActionID=DefaultAID&burl=iris_economicCalendar&cat1=market&cat2=economicCalender&dir=tl1-cal%7Ctl2-schedule%7Ctl3-stock%7Ctl4-calsel%7Ctl9-${year}${month}%7Ctl10-${year}${month}${day}&file=index.html&getFlg=on`
    const FAKE_USER_AGENT = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, likeGecko) Chrome/41.0.2228.0 Safari/537.36';
    let dataList = []
    const LAUNCH_OPTION = process.env.DYNO ? {args: ['--no-sandbox', '--disable-setuid-sandbox']} : {headless: false};
    const browser = await puppeteer.launch(LAUNCH_OPTION);
    let page = await browser.newPage();
    await page.setUserAgent(FAKE_USER_AGENT)
    console.log(`fetching ${SBI_EARNINGS_URL}`)

    page = await go_to_url(page, SBI_EARNINGS_URL);
    await page.waitFor(30 * 1000);
    let data = await scrape_table(page)
    console.log(data)

    dataList = dataList.concat(data)

    let flag = await hasNextPage(page);
    while (flag) {
        page = await click_next_page(page)
        data = await scrape_table(page)
        console.log(data)
        dataList = dataList.concat(data)
        flag = await hasNextPage(page);
    }
    const file_name = `sbi_earnings_cal_${d}.csv`
    const dir = process.env.DYNO ? '/tmp/' : './csv/'
    const path_to_save = `${dir}${file_name}`
    console.log(`saving a file to ${path_to_save}`)
    await WriteDataToCSV(path_to_save, dataList);

    if (process.env.DYNO) {
        await upload_csv_to_s3(path_to_save, file_name)
    }

    await browser.close()

})()
