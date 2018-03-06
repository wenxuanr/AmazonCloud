

const express = require('express'),
    path = require('path'),
    config = require('./config/config')

const app = express();
const chatBot =  require('./routes/routes');

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('hogan-express'));
app.set('view engine', 'html');
app.set('host', config.host);


app.use(express.static(path.join(__dirname, 'public')));

app.use('/', chatBot.router);
const server = require('http').createServer(app);

server.listen(app.get('port'), () => {
    console.log("running on" + app.get('port'));
});