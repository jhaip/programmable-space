const express = require('express')
const bodyParser = require("body-parser");
const fs = require('fs');
const { room, myId, scriptName, run } = require('../helpers/helper')(__filename);
const app = express();
const port = 3020;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('./src/files/web-editor'))

var programData = [];

room.on(
  `$name has paper ID $id`,
  `$name has source code $code`,
  results => {
    programData = results || [];
});

app.get('/status', (req, res) => {
  res.status(200).send({'programs': programData});
})

app.post('/print', (req, res) => {
  const {currentTargetId, currentTargetName} = req.body;
  room.cleanup();
  room.assert(`wish paper ${currentTargetId} at`, ["text", currentTargetName], `would be printed`);
  room.flush();
  res.status(200).send('OK');
})

app.post('/save', (req, res) => {
  const {currentTargetId, currentTargetName, currentSourceCode} = req.body;
  const cleanSourceCode = currentSourceCode
    .replace(/"/g, String.fromCharCode(9787))
  room.cleanup();
  room.assert(
    `wish`, ["text", currentTargetName],
    `has source code`, ["text", cleanSourceCode]);
  // claim it's not running to force the paper to be killed
  // so the source code change is used when it starts again
  room.retractAll(
    `wish ${currentTargetId} would be running`
  )
  room.flush();
  res.status(200).send('OK');
})

app.post('/new-copy', (req, res) => {
  const {currentTargetId, currentTargetName, currentSourceCode} = req.body;
  const language = currentTargetName.split(".")[1];
  const cleanSourceCode = currentSourceCode
    .replace(/"/g, String.fromCharCode(9787));
  const millis = (new Date()).getTime()
  room.cleanup();
  room.assert(
    `wish a paper would be created in`, ["text", language],
    `with source code`, ["text", cleanSourceCode],
    `@ ${millis}`);
  room.flush();
  res.status(200).send('OK');
})

app.post('/new', (req, res) => {
  const {name, sourceCode} = req.body;
  const cleanSourceCode = sourceCode
    .replace(/"/g, String.fromCharCode(9787));
  const millis = (new Date()).getTime()
  room.cleanup();
  room.assert(
    `wish a paper named`, ["text", name],
    `would be created with source code`, ["text", cleanSourceCode],
    `@ ${millis}`);
  room.flush();
  res.status(200).send('OK');
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))