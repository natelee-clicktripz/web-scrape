const start = new Date();
let args = process.argv.slice(2);

if(!args.length) {
    throw new Error('Need to pass in an argument!');
}

const arg = args[0];
const splitArg = arg.split('=');
const file = splitArg[0];
const fileName = splitArg[1];

if(file !== 'file') {
    throw new Error('Only takes one argument of "file=<path/to/txt>!"');
}

const fs = require('fs');
const axios = require('axios');
const $ = require('cheerio');
const _ = require('lodash');
const OT_data = {data: {}};

fs.readFile(__dirname + '/url_list/' + fileName, 'utf8', (err, urls) => {
    if(err) {
        throw new Error(err);
    }

    let urlList = urls.split('\n');

    let urlInterval = setInterval(() => {
        let url;
        if(urlList.length > 0) {
            url = urlList.shift();
            startScrape(url, fileName);
        } else {
            clearInterval(urlInterval);
        }
    }, 300)

})

function startScrape(url, fileName) {
    if(/https\:\/\/www\.opentable\.com/i.test(url)) {
        OT_data.data[url] = {};

        const options = {
            url,
            timeout: 5000
        }

        axios(options)
            .then((html) => {
                const title = $('#results-title', html.data);
                const titleString = _.get(title[0], 'children[0].data', false)
                const titleSplit = titleString ? titleString.trim().split(' ') : [];

                let tableAvailable;
                let count = 0;

                if(titleSplit.length) {
                    tableAvailable = parseInt(titleSplit[0], 10);
                    OT_data.data[url]['tableAvailable'] = tableAvailable;
                }

                OT_data.data[url]['restaurants'] = [];

                const results = $('.content-section-list > .result', html.data);
                for(var key in results) {

                    const restaurantInfo = {};

                    if(_.get(results[key], 'children[0].children[3].attribs.class') === 'rest-row-info') {
                        let restaurant = _.get(results[key], 'children[0].children[3].children');
                        if(restaurant && !(restaurant.length > 4)) {
                            const restaurantName = restaurant[0].children[1].children[0].children[0].data;
                            const restaurantHref = restaurant[0].children[1].attribs.href;
                            let commentsData = _.get(restaurant, '[2].children[1].children[1].children[1].children[4].children[0].children[0].data');
                            commentsData  = commentsData ? parseInt(commentsData.replace(/[()]/g, '')) : commentsData;

                            restaurantInfo['name'] = restaurantName;
                            restaurantInfo['href'] = restaurantHref;
                            restaurantInfo['commentsLength'] = commentsData;
                            OT_data.data[url]['restaurants'].push(restaurantInfo);
                        }
                    }
                    count++
                    if(count === 20) {
                        return null;
                    }
                }
            }).then(() => {
                // console.log(JSON.stringify(OT_data))
                let name = fileName.split('.');

                fs.writeFile(`./${name[0]}.js`, JSON.stringify(OT_data), (err) => {
                    if(err) {
                        console.log(err)
                    }
                })
                console.log(new Date() - start);
            })
            .catch((err) => {
                throw new Error(err);
            })
    }
}
