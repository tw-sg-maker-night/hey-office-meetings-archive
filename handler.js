'use strict';

var google = require('googleapis');
var googleAuth = require('google-auth-library');
var moment = require('moment');
var Promise = require('promise');
var util = require('util');

const rooms = {
  "Ni Hao": { name: "Ni Hao", email: "thoughtworks.com_3439353432373934323230@resource.calendar.google.com", capacity: 8, phone: "+65 6513 6961"},
  "Selamat Datang": { name: "Selamat Datang", email: "charris@thoughtworks.com", capacity: 4, phone: "+65 6513 6962"},
  "Vanakkam": { name: "Vanakkam", email: "charris@thoughtworks.com", capacity: 2, phone: "+65 6513 6974"}
}

function authorize() {
  return new Promise(function (fulfill, reject) {
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(
      process.env['GOOGLE_CLIENT_ID'],
      process.env['GOOGLE_CLIENT_SECRET'],
      process.env['GOOGLE_REDIRECT_URL']
    );
    oauth2Client.credentials = {
      access_token: process.env['GOOGLE_ACCESS_TOKEN'],
      refresh_token: process.env['GOOGLE_REFRESH_TOKEN'],
      token_type: process.env['GOOGLE_TOKEN_TYPE'],
      expiry_date: process.env['GOOGLE_EXPIRY_DATE']
    };
    fulfill(oauth2Client);
  });
}

function createEvent(auth, title, room, start, end) {
  return new Promise(function (fulfill, reject) {
    var calendar = google.calendar('v3');
    calendar.events.insert({
      auth: auth,
      calendarId: "primary",
      resource: {
          start: {
            dateTime: moment(start).format(),
            timeZone: "Asia/Singapore"
          },
          end: {
            dateTime: moment(end).format(),
            timeZone: "Asia/Singapore"
          },
          summary: title,
          description: "Booked via Hey Office!",
          attendees: [
            {email: rooms[room].email}
          ]
      }},
      function (err, calendarEvent) {
        if (err) {
          reject(err);
        } else {
          fulfill(calendarEvent);
        }
      }
    );
  });
}

function validateData(data) {
    if (!data.title) {
      return "Missing required param: title";
    }

    if (!data.room) {
      return "Missing required param: room";
    }

    if (!rooms[data.room]) {
      return "Could not find room called "+data.room;
    }

    if (!data.start) {
      return "Missing required param: start";
    }

    if (!data.end) {
      return "Missing required param: end";
    }

    return false;
}

module.exports.create = (event, context, callback) => {
  console.log("Request received:\n", JSON.stringify(event));
  console.log("Context received:\n", JSON.stringify(context));

  const data = JSON.parse(event.body);

  var validationError = validateData(data);
  if (validationError) {
    callback(null, {statusCode: 400, body: JSON.stringify({message: validationError})});
    return;
  }

  authorize().then(function(auth) {
    return createEvent(auth, data.title, data.room, data.start, data.end)
  }).then(function(calendarEvent) {
    console.log("Successfully created a calendar event: " + util.inspect(calendarEvent));
    callback(null, {
        statusCode: 200,
        headers: {},
        body: JSON.stringify({message: "Booked "+data.room+" successfully"})
    });
  }).catch(function(err) {
    console.log("Failed to create a calendar event: " + err);
    callback(err, {
        statusCode: 400,
        headers: {},
        body: JSON.stringify({message: ""+err})
    });
  }).done();
};
