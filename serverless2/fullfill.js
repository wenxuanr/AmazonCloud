const AWS = require('aws-sdk');
const queueUrl = 'https://sqs.us-east-1.amazonaws.com/611947059505/queue1';
const sqs = new AWS.SQS({region : 'us-east-1'});
const yelpApi = 'https://api.yelp.com/v3/businesses/search';
const request = require('request');
const yelp = require('yelp-fusion');
const apiKey = '_mc3FNvE43bQEgZtPkTE6v63YtIY-2ks9qhUf6uHkp2uhFvn-nKwvMP8OaDS9IxtQwPlG-_nUD7GG4fy2-Huv4A1o0cqS3qXivIsI4FA4Mf46MyBsKepGFVSEZ-YWnYx';
const client = yelp.client(apiKey);
const ses = new AWS.SES();
const from = 'vcr01123@gmail.com';

function receiveMessages(callback) {
    var params = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10
    };
    sqs.receiveMessage(params, function(err, data) {
        if (err) {
            console.error(err, err.stack);
            callback(err);
        } else {
            callback(null, data.Messages);
        }
    });
}

function handleSQSMessages(context, callback) {
    receiveMessages(function(err, messages) {
        if (messages && messages.length > 0) {
            messages.forEach(function(message) {
                console.log(message);
                let deleteParams = {
                    QueueUrl: queueUrl,
                    ReceiptHandle: message.ReceiptHandle
                };
                let data = message.Body;
                let jsonData = JSON.parse(data);
                let email = jsonData.email;
                console.log(jsonData);
                console.log(jsonData.location);
                let searchParam = {
                    term:'restaurant',
                    location: jsonData.location,
                    category:jsonData.cuisine,
                    sort_by:'best_match',
                    limit:1
                };
                console.log(searchParam);
                let combinedUrl = '?location=' + message.Body.location + '&categories=' + message.Body.cuisine + '&limit=1' + '&sort_by=best_match';
                client.search(searchParam).then(response => {
                    let resname = response.jsonBody.businesses[0].name;
                    let phone = response.jsonBody.businesses[0].phone;
                    let address = response.jsonBody.businesses[0].location.address1;
                    console.log(response.jsonBody.businesses[0].name);
                    let toArray = [];
                    toArray.push(email);
                    let par = {
                        Source: from,
                        Destination: { ToAddresses: toArray },
                        Message:{
                            Subject: {
                                Data:'Your recommendation'
                            },
                            Body:{
                                Text:{
                                    Charset:'UTF-8',
                                    Data: "Your recommendation is: " + resname + ",address: " + address + " Phone number: " + phone
                                }
                            }
                        }
                };
                    ses.sendEmail(par, function (err, data) {
                        if (err) {
                            console.log(err, err.stack);
                        }
                        else {
                            sqs.deleteMessage(deleteParams, function(err, data) {
                                if (err) {
                                    console.log("Delete Error", err);
                                } else {
                                    console.log("Message Deleted", data);
                                }
                            });
                        }
                    });
                }).catch(e => {
                    console.log("here err");
                    console.log(e);
                });
                // sqs.deleteMessage(deleteParams, function(err, data) {
                //     if (err) {
                //         console.log("Delete Error", err);
                //     } else {
                //         console.log("Message Deleted", data);
                //     }
                // });
            });
        } else {
            callback(null, 'DONE');
        }
    });
}

module.exports.handle = function(event, context, callback) {
    handleSQSMessages(context, callback);
};