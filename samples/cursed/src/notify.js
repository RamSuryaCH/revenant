const request = require('request');
const fs = require('fs');

function notify(url, payload, cb) {
  request.post({ url, body: payload, json: true, headers: { 'X-Source': 'cursed' } }, cb);
}

function download(url, dest) {
  request(url).pipe(fs.createWriteStream(dest));
}

module.exports = { notify, download };
