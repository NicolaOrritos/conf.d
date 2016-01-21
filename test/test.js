'use strict';

let assert = require('assert');
let confd = require('../index.js');


describe('conf.d node module', () =>
{
    it('must not throw an error when dealing with folders with 4-characters-long names', done =>
    {
        let conf = confd.from('test/data');

        assert(conf);

        conf.get()
        .then( json =>
        {
            assert(json);

            conf = confd.from('test/data').strategy().backcursion();

            assert(conf);

            return conf.get();
        })
        .then( json =>
        {
            assert(json);

            done();
        })
        .catch( error =>
        {
            throw error;
        });
    });

    it('must create an object from an existing path populated with configuration files', done =>
    {
        let conf = confd.from('test/data');

        assert(conf);
        assert(conf.toString() === '[object Conf]');

        done();
    });

    it('must create an object, NOT AN ARRAY, from an existing path populated with configuration files, when using the "get()" method and LEAVES or BACKCURSION strategies', done =>
    {
        confd.from('test/data').get()
        .then( conf =>
        {
            assert(conf);
            assert(conf.length === undefined);

            return confd.from('test/data').strategy().backcursion().get();
        })
        .then( conf =>
        {
            assert(conf);
            assert(conf.length === undefined);


            return confd.from('test/data').strategy().array().get();
        })
        .then( conf =>
        {
            assert(conf);
            assert(conf.length || conf.length === 0);

            done();
        })
        .catch( error =>
        {
            throw error;
        });
    });

    it('must return the path with which it got initialized when calling the "from()" method on the returned object', done =>
    {
        let conf = confd.from('test/data');
        let path = conf.from();

        assert(conf);
        assert(path);
        assert(path === 'test/data');

        done();
    });

    it('must create an object from an existing path with the default strategy set', done =>
    {
        let conf = confd.from('test/data');

        assert(conf);
        assert(conf.strategy().get() === confd.strategy().default());

        done();
    });

    it('must correctly set strategies when using "set()" method', done =>
    {
        let conf = confd.from('test/data');

        conf.strategy().set(confd.STRATEGIES.BACKCURSION);

        assert(conf);
        assert(conf.strategy().get() === confd.STRATEGIES.BACKCURSION);


        conf.strategy().set(confd.STRATEGIES.LEAVES);

        assert(conf);
        assert(conf.strategy().get() === confd.STRATEGIES.LEAVES);


        conf.strategy().set(confd.STRATEGIES.ARRAY);

        assert(conf);
        assert(conf.strategy().get() === confd.STRATEGIES.ARRAY);


        done();
    });

    it('must correctly set strategies when using ad-hoc methods', done =>
    {
        let conf = confd.from('test/data');

        conf.strategy().backcursion();

        assert(conf);
        assert(conf.strategy().get() === confd.STRATEGIES.BACKCURSION);


        conf.strategy().leaves();

        assert(conf);
        assert(conf.strategy().get() === confd.STRATEGIES.LEAVES);


        conf.strategy().array();

        assert(conf);
        assert(conf.strategy().get() === confd.STRATEGIES.ARRAY);


        done();
    });

    it('must refuse incorrect strategies passed to "set()" method', done =>
    {
        let conf = confd.from('test/data');

        try
        {
            conf.strategy().set('no-such-strategy');

            throw new Error('Should have thrown an error');
        }
        catch (err)
        {
            // An error was thrown, let's check it:
            if (err.message !== 'No such strategy ("no-such-strategy")')
            {
                throw err;
            }
            else
            {
                done();
            }
        }
    });

    it('must load configuration from an existing path populated with a single configuration file', done =>
    {
        let conf = confd.from('test/data');

        assert(conf);

        conf.get()
        .then( json =>
        {
            assert(json);
            assert(json.k_a === 'v_a');

            done();
        })
        .catch( error =>
        {
            throw error;
        });
    });

    it('must load configuration from an existing subpath populated with a single configuration file', done =>
    {
        let conf = confd.from('test/data');

        assert(conf);

        conf.get('b')
        .then( json =>
        {
            assert(json);
            assert(json.k_c === 'v_c');

            done();
        })
        .catch( error =>
        {
            throw error;
        });
    });

    it('must load merged configurations from an existing subpath', done =>
    {
        let conf = confd.from('test/data');

        assert(conf);

        conf.get('d')
        .then( json =>
        {
            assert(json);
            assert(json.k_d === 'v_d2');

            done();
        })
        .catch( error =>
        {
            throw error;
        });
    });

    it('must load merged configurations using the common one as base', done =>
    {
        let conf = confd.from('test/data');

        assert(conf);

        conf.get('e')
        .then( json =>
        {
            assert(json);
            assert(json.k_e1 === 'v_e1_common');
            assert(json.k_e2 === 'v_e2');

            done();
        })
        .catch( error =>
        {
            throw error;
        });
    });

    it('must load merged configurations using "backcursion" strategy', done =>
    {
        let conf = confd.from('test/data').strategy().backcursion();

        assert(conf);

        conf.get('e')
        .then( json =>
        {
            assert(json);
            assert(json.k_e1 === 'v_e1_common');
            assert(json.k_e2 === 'v_e2');

            conf = confd.from('test/data').strategy().backcursion();

            assert(conf);

            return conf.get('e/f');
        })
        .then( json =>
        {
            assert(json);
            assert(json.k    === 'v_common');
            assert(json.k_e1 === 'v_e1_common');
            assert(json.k_e2 === 'v_e2_common');
            assert(json.k_f  === 'v_f');

            done();
        })
        .catch( error =>
        {
            throw error;
        });
    });

    it('must load default upper configurations when using "backcursion" and no lower folders/files are found', done =>
    {
        let conf = confd.from('test/data').strategy().backcursion();

        assert(conf);

        conf.get('x')
        .then( json =>
        {
            assert(json);
            assert(json.k === 'v_common');

            done();
        })
        .catch( error =>
        {
            throw error;
        });
    });

    it('must load an array of configurations when using the "array" strategy and we have simple files all into the same folder', done =>
    {
        let conf = confd.from('test/data').strategy().array();

        assert(conf);

        conf.get('d')
        .then( json =>
        {
            assert(json);
            assert(json.length === 2);
            assert(json[0]);
            assert(json[1]);
            assert(json[0].k_d === 'v_d1');
            assert(json[1].k_d === 'v_d2');

            done();
        })
        .catch( error =>
        {
            throw error;
        });
    });

    it('must load an array of configurations when using the "array" strategy and we have both files and folders containing other files, under the same root folder', done =>
    {
        let conf = confd.from('test/data').strategy().array();

        assert(conf);

        conf.get('e')
        .then( json =>
        {
            assert(json);
            assert(json.length === 3);
            assert(json[0]);
            assert(json[1]);
            assert(json[2]);

            // We can't be sure about the order, hence the "combination-checks":
            assert(   (   json[0].k_f === 'v_f'
                       && json[1].k_e1 === 'v_e1_common'
                       && json[1].k_e2 === 'v_e2_common'
                       && json[2].k_e2 === 'v_e2')
                   || (   json[1].k_f === 'v_f'
                       && json[2].k_e1 === 'v_e1_common'
                       && json[2].k_e2 === 'v_e2_common'
                       && json[0].k_e2 === 'v_e2')
                   || (   json[2].k_f === 'v_f'
                       && json[0].k_e1 === 'v_e1_common'
                       && json[0].k_e2 === 'v_e2_common'
                       && json[1].k_e2 === 'v_e2')
                   || (   json[1].k_f === 'v_f'
                       && json[0].k_e1 === 'v_e1_common'
                       && json[0].k_e2 === 'v_e2_common'
                       && json[2].k_e2 === 'v_e2')
                   || (   json[2].k_f === 'v_f'
                       && json[1].k_e1 === 'v_e1_common'
                       && json[1].k_e2 === 'v_e2_common'
                       && json[0].k_e2 === 'v_e2')
            );

            done();
        })
        .catch( error =>
        {
            throw error;
        });
    });
});
