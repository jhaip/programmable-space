const Room = require('@living-room/client-js')
const fs = require('fs');
const path = require('path');
const execFile = require('child_process').execFile;
const process = require('process');
const request = require('request');

const URL = 'http://localhost:3000/'
const room = new Room()

room.on(
  `wish all facts would be cleared`,
  options => {
    request(`${URL}facts`, { json: true }, (err, response, body) => {
      if (err) { return console.log(err); }
      console.log("REQUEST RESPONSE!!!!!")
      console.log(body.assertions.length)
      body.assertions.forEach(a => {
        room.retractRaw(a);
      })
    });
  }
);
