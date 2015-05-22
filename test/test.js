'use strict';

var assert = require('assert');
var confd = require('../');


describe('confd node module', function()
{
    it('must create an object from an existing path populated with configuration files', function()
    {
        var conf = confd.from('test/data');
        
        assert(conf);
        assert(conf.toString() === '[object Conf]');
    });
    
    it('must load configuration from an existing path populated with a single configuration file', function()
    {
        var conf = confd.from('test/data');
        var json = conf.get();
        
        assert(conf);
        assert(json);
        assert(json.k_a === 'v_a');
    });
    
    it('must load configuration from an existing subpath populated with a single configuration file', function()
    {
        var conf = confd.from('test/data');
        var json = conf.get('b');
        
        assert(conf);
        assert(json);
        assert(json.k_c === 'v_c');
    });
});
