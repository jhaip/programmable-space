#!/usr/bin/env node
var WebSocketClient = require("websocket").client;

var client = new WebSocketClient();
var startTime = 0;
var count = 0;

client.on("connectFailed", function (error) {
  console.log("Connect Error: " + error.toString());
});

client.on("connect", function (connection) {
  console.log("WebSocket Client Connected");
  connection.on("error", function (error) {
    console.log("Connection Error: " + error.toString());
  });
  connection.on("close", function () {
    console.log("echo-protocol Connection Closed");
  });
  connection.on("message", function (message) {
    if (message.type === "utf8") {
      // console.log("Received: '" + message.utf8Data + "'");
      if (count.toString() === message.utf8Data) {
        count += 1;
        if (count >= 10000) {
          console.log(`DONE! ${new Date().getTime() - startTime}`);
        } else {
          sendNumber();
        }
      }
    }
  });

  function sendNumber() {
    if (connection.connected) {
      // var number = Math.round(Math.random() * 0xffffff);
      // connection.sendUTF(number.toString());
      connection.sendUTF(count.toString());
      // setTimeout(sendNumber, 1000);
    }
  }
  startTime = new Date().getTime();
  sendNumber();
});

client.connect("ws://localhost:8080/echo");
