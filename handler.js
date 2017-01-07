'use strict';

var google = require('googleapis');
var googleAuth = require('google-auth-library');
var moment = require('moment');
var Promise = require('promise');
var util = require('util');

const rooms = {
  "Ni Hao": { name: "Ni Hao", email: "thoughtworks.com_3439353432373934323230@resource.calendar.google.com", capacity: 8, phone: "+65 6513 6961"},
  "Selamat Datang": { name: "Selamat Datang", email: "charris@thoughtworks.com", capacity: 4, phone: "+65 6513 6962"},
  "Vanakkam": { name: "Vanakkam", email: "hnwah@thoughtworks.com", capacity: 2, phone: "+65 6513 6974"}
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

function roomItems(){
  var roomEmails = [];
  for(var room in rooms) {
    roomEmails.push(rooms[room]['email']);
  }
  var formattedEmails = roomEmails.map(function(email){ return {'id': email} });
  return JSON.stringify(formattedEmails);
};

function getRoomNameByEmails(roomEmails) {
  var roomNames = [];
  for(var room in rooms) {
    if(roomEmails.indexOf(rooms[room]['email']) > -1) {
      roomNames.push(room);
    }
  }
  return roomNames;
};

function processAvailableRoomsResponse(response) {
  var calendars = response['calendars'];
  var availableRooms = [];

  for(var calendar in calendars) {
    if(calendars[calendar]['errors'] === undefined && calendars[calendar]['busy'].length === 0 ) {
      availableRooms.push(calendar);
    }
  }

  return getRoomNameByEmails(availableRooms);
};

function checkAvailableRooms(auth, start, end){
  return new Promise(function(fulfill, reject) {
    var calendar = google.calendar('v3');

    calendar.freebusy.query({
      auth: auth,
      resource: {
        timeMin: moment(start).format(),
        timeMax: moment(end).format(),
        timeZone: "Asia/Singapore",
        groupExpansionMax: 10,
        items:  roomItems()
      }
    },
    function(err, response) {
      if(err){
        reject(err);
      }else{
        fulfill(response);
      }
    });
  });
};

function humanizeResults(roomNames) {
  if(roomNames.length === 0) {
    return 'No room are available';
  }
  else if(roomNames.length > 1) {
    var tempRoomNames = roomNames.join(', ');
    var position = tempRoomNames.lastIndexOf(',');

    return tempRoomNames.substring(0, position) + ' and' + tempRoomNames.substring(position+1) + ' are available';
  }
  else {
    return roomNames.toString() + ' is available';
  }
}

module.exports.otherAvailableRooms = (event, context, callback) => {
  console.log("Request received:\n", JSON.stringify(event));
  console.log("Context received:\n", JSON.stringify(context));

  const data = JSON.parse(event.body);

  authorize().then(function(auth) {
    return checkAvailableRooms(auth, data.start, data.end);
  }).then(function(response){
    console.log("Successfully checked for available rooms: " + util.inspect(response));

    var availableRooms = processAvailableRoomsResponse(response);
    var message = humanizeResults(availableRooms);

    callback(null, {
        statusCode: 200,
        headers: {},
        body: JSON.stringify({message: message})
    });
  }).catch(function(err){
    console.log("Failed to check for available rooms: " + err);
    callback(err, {
        statusCode: 400,
        headers: {},
        body: JSON.stringify({message: ""+err})
    });
  }).done();
};
