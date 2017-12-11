/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

'use strict';
const Alexa = require('alexa-sdk');
const request = require('request');
const convert = require('xml-js'):

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

const numToWord = {
    '1': 'one',
    '2': 'two',
    '3': 'three',
    '4': 'four',
    '5': 'five',
    '6': 'six',
    '7': 'seven',
    '8': 'eight',
    '9': 'nine',
    '0': 'zero'
};

const handlers = {
    'LaunchRequest': function () {
        this.emit('GetNewFactIntent');
    },
    'GetNextBusIntent': function (intent, session, response) {
        let bus = intent.slots.bus.value;
        let stop = intent.slots.stop.value;
        let text = '';

        if (!bus || !route) {
            text = 'You must supply both a bus and stop number';
            this.response.tellWithCard(text, PROBLEM_MESSAGE, text);
            return;
        }

        return getNextBus(bus, stop)
            .then(parseResponse)
            .then(createText)
            .then(speak);
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
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
    return convert.xml2json(data, {compact: true});
}

function createText (buses) {
    if (buses.noPredictionMessage) {
        return NO_BUSES;
    }
	if (!buses.stop || !buses.stop.pre) {
        return NO_BUSES;
    }

    let text = [];
    
    buses.stop.pre.forEach((function(bus) {
        let routeNumber = bus.rn;
        routeNumber.toString().split('').join(' ');

        let when = bus.pt + ' ' + bus.pu;
        let plural = (parseInt(bus.pt) > 1) ? 's' : '';

        text.push(`The next ${routeNumber} bus will arrive in ${when}${plural}`);
    });

    return text.join(' AND');
}

function speak (text) {
    this.response.speak(text);
    this.emit(':responseReady');
}
