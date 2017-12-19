/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

'use strict';
const Alexa = require('alexa-sdk');
const request = require('request-promise');
const convert = require('xml-js');
const moment = require('moment-timezone');

//Replace with your app ID (OPTIONAL).  You can find this value at the top of your skill's page on http://developer.amazon.com.
//Make sure to enclose your value in quotes, like this: const APP_ID = 'amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1';
const APP_ID = process.env.APP_ID;

const SKILL_NAME = 'NJ Transit Bus Schedule';
const HELP_MESSAGE = 'You can say when is the next 127 bus... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';
const PROBLEM_MESSAGE = 'There was an issue';
const NO_BUSES = 'There are no buses scheduled';

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const url = 'http://mybusnow.njtransit.com/bustime/eta/getStopPredictionsETA.jsp';

const handlers = {
    'LaunchRequest': function () {
        this.emit('GetNextBusIntent');
    },
    'GetNextBusIntent': function () {
        console.info(this.event.request.intent.slots.bus);
        console.info(this.event.request.intent.slots.stop);
        let bus = this.event.request.intent.slots.bus.value;
        let stop = this.event.request.intent.slots.stop.value;
        let text = '';

        if (!stop) {
            text = 'You must supply a stop number';
            this.response.speak(PROBLEM_MESSAGE + ' ' + text);
            this.emit(':responseReady');
            return;
        }


        return getNextBus(bus, stop)
            .then(parseResponse)
            .then((parsedResponse) => {
                return createText(parsedResponse, bus);
            })
            .then((text) => {
                this.response.speak(text);
                this.emit(':responseReady');
            });
    },
    'HelpIntent': function () {
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'StopIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
};

function getNextBus (bus, stop) {
    let options = {
        url: url,
        qs: {
            bus: bus,
            stop: stop
        }
    }
    return request.get(options);
}

function parseResponse (data) {
    return convert.xml2js(data, {compact: true});
}

function createText (buses, bus) {
    console.log(buses.stop.pre);
    if (buses.noPredictionMessage) {
        return NO_BUSES;
    }
	if (!buses.stop || !buses.stop.pre) {
        return NO_BUSES;
    }

    let text = [];

    if ( Array.isArray(buses.stop.pre) ) {
        buses.stop.pre.forEach(function(busObj) {
            if (bus && parseInt(bus.rn._text) !== bus) {
                return;
            }
            var busText = _processBus(busObj);
            text.push(busText);
        });
    } else {
        if (buses.stop.pre.rn._text === bus) {
            text.push(_processBus(buses.stop.pre));
        }
    }
    
    if (!text.length) {
        return NO_BUSES;
    }

    return text.join(', AND, ');
}

function _processBus (bus) {
    let routeNumber = bus.rn._text;
    routeNumber.toString().split('').join(' ');

    let when;
    let now = moment().tz('America/New_York');

    if ( bus.pt._text ) {
        now.add(parseInt(bus.pt._text), 'minutes');
        when = ' will arrive at ' + now.format('LT');
    } else {
        when = ' is approaching. '; 
    }

    return `The next ${routeNumber} bus ${when}`;
}
