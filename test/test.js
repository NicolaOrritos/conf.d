'use strict';

var assert = require('assert');
var confd = require('../');


describe('conf.d node module', function()
{
    it('must not throw an error when dealing with folders with 4-characters-long names', function()
    {
        var conf = confd.from('test/data');
        var json = conf.get();

        assert(conf);
        assert(json);


        conf = confd.from('test/data').strategy().backcursion();
        json = conf.get();

        assert(conf);
        assert(json);
    });

    it('must create an object from an existing path populated with configuration files', function()
    {
        var conf = confd.from('test/data');

        assert(conf);
        assert(conf.toString() === '[object Conf]');
    });

    it('must return the path with which it got initialized when calling the "from()" method on the returned object', function()
    {
        var conf = confd.from('test/data');
        var path = conf.from();

        assert(conf);
        assert(path);
        assert(path === 'test/data');
    });

    it('must create an object from an existing path with the default strategy set', function()
    {
        var conf = confd.from('test/data');

        assert(conf);
        assert(conf.strategy().get() === confd.strategy().default());
    });

    it('must correctly set strategies when using "set()" method', function()
    {
        var conf = confd.from('test/data');

        conf.strategy().set(confd.STRATEGIES.BACKCURSION);

        assert(conf);
        assert(conf.strategy().get() === confd.STRATEGIES.BACKCURSION);


        conf.strategy().set(confd.STRATEGIES.LEAVES);

        assert(conf);
        assert(conf.strategy().get() === confd.STRATEGIES.LEAVES);


        conf.strategy().set(confd.STRATEGIES.ARRAY);

        assert(conf);
        assert(conf.strategy().get() === confd.STRATEGIES.ARRAY);
    });

    it('must correctly set strategies when using ad-hoc methods', function()
    {
        var conf = confd.from('test/data');

        conf.strategy().backcursion();

        assert(conf);
        assert(conf.strategy().get() === confd.STRATEGIES.BACKCURSION);


        conf.strategy().leaves();

        assert(conf);
        assert(conf.strategy().get() === confd.STRATEGIES.LEAVES);


        conf.strategy().array();

        assert(conf);
        assert(conf.strategy().get() === confd.STRATEGIES.ARRAY);
    });

    it('must refuse incorrect strategies passed to "set()" method', function()
    {
        var conf = confd.from('test/data');

        try
        {
            conf.strategy().set('no-such-strategy');

            throw new Error('Should have thrown an error');
        }
        catch (err)
        {
            // An error was thrown, let's check it:
            if (err.message !== 'No such strategy')
            {
                throw err;
            }
        }
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

    it('must load merged configurations from an existing subpath', function()
    {
        var conf = confd.from('test/data');
        var json = conf.get('d');

        assert(conf);
        assert(json);
        assert(json.k_d === 'v_d2');
    });

    it('must load merged configurations using the common one as base', function()
    {
        var conf = confd.from('test/data');
        var json = conf.get('e');

        assert(conf);
        assert(json);
        assert(json.k_e1 === 'v_e1_common');
        assert(json.k_e2 === 'v_e2');
    });

    it('must load merged configurations using "backcursion" strategy', function()
    {
        var conf = confd.from('test/data').strategy().backcursion();
        var json = conf.get('e');

        assert(conf);
        assert(json);
        assert(json.k_e1 === 'v_e1_common');
        assert(json.k_e2 === 'v_e2');


        conf = confd.from('test/data').strategy().backcursion();
        json = conf.get('e/f');

        assert(conf);
        assert(json);
        assert(json.k    === 'v_common');
        assert(json.k_e1 === 'v_e1_common');
        assert(json.k_e2 === 'v_e2_common');
        assert(json.k_f  === 'v_f');
    });

    it('must load default upper configurations when using "backcursion" and no lower folders/files are found', function()
    {
        var conf = confd.from('test/data').strategy().backcursion();
        var json = conf.get('x');

        assert(conf);
        assert(json);
        assert(json.k === 'v_common');
    });

    it('must load an array of configurations when using the "array" strategy', function()
    {
        var conf = confd.from('test/data').strategy().array();
        var json = conf.get('d');

        assert(conf);
        assert(json);
        assert(json.length === 2);
        assert(json[0]);
        assert(json[1]);
        assert(json[0].k_d === 'v_d1');
        assert(json[1].k_d === 'v_d2');
    });
});
