
'use strict';

let confd   = require('./index');
let restify = require('restify');


module.exports =
{
    run: function(from, port, strategy)
    {
        let conf = confd.from(from).strategy().set(strategy);

        let server = restify.createServer(
        {
            name: 'conf.d'
        });

        server.get(/^\/confd\/(.*)/, (req, res, next) =>
        {
            conf.get(req.params[0])
            .then( json =>
            {
                res.end(JSON.stringify(json));

                next();
            })
            .catch( err =>
            {
                next(new restify.InternalError(err));
            });
        });


        server.listen(port);
    }
};
