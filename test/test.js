'use strict';

var assert = require('assert');
var confd = require('../');


describe('confd node module', function()
{
    it('must create an object from an existing path', function()
    {
        var conf = confd.from('/etc/');
        
        assert(conf);
    });
});
