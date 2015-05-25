
'use strict';

var confd   = require('./index');
var restify = require('restify');


module.exports =
{
    run: function(from, port)
    {
        var server = restify.createServer(
        {
            name: 'conf.d'
        });


        server.get(/^\/confd\/get\/(.*)/, function(req, res, next)
        {
            var conf = confd.from(from);
            
            var json = conf.get(req.params[0]);
            
            res.end(JSON.stringify(json));
            
            return next();
        });


        server.listen(port);
    }
};
