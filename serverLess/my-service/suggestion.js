'use strict';

/**
 * This sample demonstrates an implementation of the Lex Code Hook Interface
 * in order to serve a sample bot which manages orders for flowers.
 * Bot, Intent, and Slot models which are compatible with this sample can be found in the Lex Console
 * as part of the 'OrderFlowers' template.
 *
 * For instructions on how to set up and test this bot, as well as additional samples,
 *  visit the Lex Getting Started documentation.
 */

const QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/611947059505/queue1';
const AWS = require('aws-sdk');
const sqs = new AWS.SQS({region : 'us-east-1'});

// --------------- Helpers to build responses which match the structure of the necessary dialog actions -----------------------

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            intentName,
            slots,
            slotToElicit,
            message,
        },
    };
}

function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}

function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots,
        },
    };
}

// ---------------- Helper Functions --------------------------------------------------

function parseLocalDate(date) {
    /**
     * Construct a date object in the local timezone by parsing the input date string, assuming a YYYY-MM-DD format.
     * Note that the Date(dateString) constructor is explicitly avoided as it may implicitly assume a UTC timezone.
     */
    const dateComponents = date.split(/\-/);
    return new Date(dateComponents[0], dateComponents[1] - 1, dateComponents[2]);
}

function isValidDate(date) {
    try {
        return !(isNaN(parseLocalDate(date).getTime()));
    } catch (err) {
        return false;
    }
}

function buildValidationResult(isValid, violatedSlot, messageContent) {
    if (messageContent == null) {
        return {
            isValid,
            violatedSlot,
        };
    }
    return {
        isValid,
        violatedSlot,
        message: { contentType: 'PlainText', content: messageContent },
    };
}


// --------------- Functions that control the bot's behavior -----------------------

/**
 * Performs dialog management and fulfillment for ordering flowers.
 *
 * Beyond fulfillment, the implementation of this intent demonstrates the use of the elicitSlot dialog action
 * in slot validation and re-prompting.
 *
 */
function diningSuggestions(intentRequest, callback) {
    const location = intentRequest.currentIntent.slots.Location;
    const cuisine = intentRequest.currentIntent.slots.Cuisine;
    const time = intentRequest.currentIntent.slots.Time;
    const number = intentRequest.currentIntent.slots.NumberOfPeople;
    const phone = intentRequest.currentIntent.slots.Phone;
    const date = intentRequest.currentIntent.slots.Date;
    const email = intentRequest.currentIntent.slots.Email;
    const source = intentRequest.invocationSource;

    if (source === 'DialogCodeHook'){
        const outputSessionAttributes = intentRequest.sessionAttributes || {};
        callback(delegate(outputSessionAttributes, intentRequest.currentIntent.slots));
        return;
    }

    let json={
        "location": location,
        "cuisine": cuisine,
        "time": time,
        "number": number,
        "phone": phone,
        "date": date,
        "email": email
    };
    let params = {
        MessageBody: JSON.stringify(json),
        QueueUrl: QUEUE_URL
    };
    sqs.sendMessage(params, function(err,data){
        if(err) {
            console.log('error:',"Fail Send Message" + err);
            //context.done('error', "ERROR Put SQS");  // ERROR with message
        }else{
            console.log('data:',data.MessageId);
        }
    });
    callback(close(intentRequest.sessionAttributes, 'Fulfilled',{ contentType: 'PlainText', content: 'You’re all set. Expect my recommendations shortly! Have a good day.' }));
}

// --------------- Intents -----------------------

/**
 * Called when the user specifies an intent for this skill.
 */
function dispatch(intentRequest, callback) {
    console.log(`dispatch userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`);

    const intentName = intentRequest.currentIntent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'DiningSuggestionsIntent') {
        return diningSuggestions(intentRequest, callback);
    }

    if (intentName === 'GreetingIntent') {
        callback(close(intentRequest.sessionAttributes, 'Fulfilled',{ contentType: 'PlainText', content: 'Hi there, how can I help?' }));
    }

    if (intentName === 'ThankYouIntent') {
        callback(close(intentRequest.sessionAttributes, 'Fulfilled',{ contentType: 'PlainText', content: 'You’re welcome.' }));
    }

    throw new Error(`Intent with name ${intentName} not supported`);
}

// --------------- Main handler -----------------------

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
module.exports.sugesstion = (event, context, callback) => {
    try {
        // By default, treat the user request as coming from the America/New_York time zone.
        process.env.TZ = 'America/New_York';
        console.log(`event.bot.name=${event.bot.name}`);

        /**
         * Uncomment this if statement and populate with your Lex bot name and / or version as
         * a sanity check to prevent invoking this Lambda function from an undesired Lex bot or
         * bot version.
         */
        /*
        if (event.bot.name !== 'OrderFlowers') {
             callback('Invalid Bot Name');
        }
        */
        dispatch(event, (response) => callback(null, response));
    } catch (err) {
        callback(err);
    }
};