const express = require('express');
const request = require('request');
const moment = require('moment');
const uuidv4 = require('uuid/v4');

const app = express();

app.get('/orders/:id', (req, res) => {
  const requestId = uuidv4();
  const placed = moment(req.query.placed);
  const due = placed.clone().add(14, 'days');

  request({ uri: 'https://api.example.com/orders/' + req.params.id, qs: { expand: 'items' }, json: true }, (err, response, body) => {
    if (err) return res.status(502).json({ requestId, error: err.message });
    res.json({
      requestId,
      order: body,
      placedOn: placed.format('YYYY-MM-DD'),
      dueOn: due.format('MMM D, YYYY'),
      overdue: moment().isAfter(due),
      age: placed.fromNow(),
    });
  });
});

app.listen(3000);
