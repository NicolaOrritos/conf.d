
'use strict';

var confd   = require('./index');
var restify = require('restify');


module.exports =
{
    run: function(from, port, strategy)
    {
        var conf = confd.from(from).strategy().set(strategy);

        var server = restify.createServer(
        {
            name: 'conf.d'
        });

        server.get(/^\/confd\/(.*)/, function(req, res, next)
        {
            conf.get(req.params[0])
            .then(function(json)
            {
                res.end(JSON.stringify(json));

                next();
            })
            .catch(function(err)
            {
                next(new restify.InternalError(err));
            });
        });


        server.listen(port);
    }
};
