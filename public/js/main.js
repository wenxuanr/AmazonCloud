import {apigClientFactory} from "./apigClient"
import {AWSconfig} from "./config"
var messages = [], //array that hold the record of each string in chat
    lastUserMessage = "", //keeps track of the most recent input string from the user
    botMessage = "", //var keeps track of what the chatbot is going to say
    botName = 'Chatbot', //name of the chatbot
    talking = true; //when false the speach function doesn't work
let apiClient = {};
var getParameterByName = function(name, url) {

    if (!url) url = window.location.href;

    name = name.replace(/[\[\]]/g, "\\$&");

    console.log(name);

    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),

        results = regex.exec(url);

    console.log(results);

    if (!results) return null;

    if (!results[2]) return '';

    console.log(results[2]);

    return decodeURIComponent(results[2].replace(/\+/g, " "));

};
console.log(getParameterByName("code"));
// Exchange code for id_token and credentials.

var exchangeAuthCodeForCredentials = function({auth_code = getParameterByName("code")
                                                  ,client_id = AWSconfig.client_id,
                                                  identity_pool_id = AWSconfig.identity_pool_id,
                                                  aws_region =AWSconfig.region,
                                                  user_pool_id = AWSconfig.user_pool_id,
                                                  cognito_domain_url= AWSconfig.cognito_domain_url,
                                                  redirect_uri = AWSconfig.redirect_uri}) {
    return new Promise((resolve, reject) => {
        var settings = {
            url: `${cognito_domain_url}/oauth2/token`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: {
                grant_type: 'authorization_code',
                client_id: client_id,
                redirect_uri: redirect_uri,
                code: auth_code
            }
        };
        $.ajax(settings).done(function (response) {
            console.log('oauth2 token call responded');
            if (response.id_token) {
                // Add the User's Id Token to the Cognito credentials login map.
                if (!AWS.config.region) {
                    AWS.config.update({
                        region: aws_region
                    });
                }
                AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    IdentityPoolId : identity_pool_id,
                    Logins : {
                        [`cognito-idp.${aws_region}.amazonaws.com/${user_pool_id}`]: response.id_token
                    }
                });
                AWS.config.credentials.refresh((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        console.log('successfully logged in');
                        AWSconfig.secretKey = AWS.config.credentials.secretAccessKey;
                        AWSconfig.accessKey = AWS.config.credentials.accessKeyId;
                        AWSconfig.sessionToken = AWS.config.credentials.sessionToken;
                        apiClient = apigClientFactory.newClient(AWSconfig);
                        resolve(AWS.config.credentials);

                    }
                });
            } else {
                reject(response);
            }
        });
    });
};
exchangeAuthCodeForCredentials(2,2,2,2,2,2,2);


function chatbotResponse() {
    talking = true;
    botMessage = "I'm confused"; //the default message
    //pulls the value from the chatbox ands sets it to lastUserMessage
    lastUserMessage = document.getElementById("chatbox").value;
    //sets the chat box to be clear
    document.getElementById("chatbox").value = "";
    //adds the value of the chatbox to the array messages
    messages.push(lastUserMessage);
    var params = {

       };
    var body = {
        "userInput" : lastUserMessage
    };
    apiClient.chatbotPost(params, body,{})
        .then(function(result){
            // Add success callback code here.
            console.log("success");
            let data = result.data;
            const message = data.body.databack;
            botMessage = message;
            console.log(botMessage)
            messages.push("<b>" + botName + ":</b> " + botMessage);
            for (var i = 1; i < 8; i++) {
                if (messages[messages.length - i])
                    document.getElementById("chatlog" + i).innerHTML = messages[messages.length - i];
            }
        }).catch( function(result){
        // Add error callback code here.
        console.log("error");
    });

    if (lastUserMessage === 'name') {
        botMessage = 'My name is ' + botName;
    }
}

function newEntry() {
    //if the message from the user isn't empty then run
    if (document.getElementById("chatbox").value != "") {
        chatbotResponse();
    }
}


document.onkeypress = keyPress;
//if the key pressed is 'enter' runs the function newEntry()
function keyPress(e) {
    var x = e || window.event;
    var key = (x.keyCode || x.which);
    if (key == 13 || key == 3) {
        //runs this function when enter is pressed
        // newEntry();
        newEntry();
    }
    if (key == 38) {
        console.log('hi')
        //document.getElementById("chatbox").value = lastUserMessage;
    }
}

//clears the placeholder text ion the chatbox
//this function is set to run when the users brings focus to the chatbox, by clicking on it
function placeHolder() {
    document.getElementById("chatbox").placeholder = "Type something here";
}

