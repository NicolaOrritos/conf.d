'use strict';

var f      = require('f.luent');
var fs     = require('fs');
var sjl    = require('sjl');
var path   = require('path');
var unionj = require('unionj');


var STRATEGIES =
{
    LEAVES: 'LEAVES',
    BACKCURSION: 'BACKCURSION',
    ARRAY: 'ARRAY'
};

var DEFAULT_STRATEGY = STRATEGIES.LEAVES;


function endsWith(end, str)
{
    var result = false;

    if (end && str && end.length && str.length)
    {
        var pos = str.indexOf(end);

        if (pos >= 0 && pos === str.length - end.length)
        {
            result = true;
        }
    }

    return result;
}

function unifyAllUnderFolder(folder)
{
    var result;

    f.constrain(folder).notnull().string().throws('Argument must be a string');

    folder = path.resolve(folder);

    if (fs.existsSync(folder))
    {
        var files = fs.readdirSync(folder);

        if (files.length)
        {
            // 'common.{conf|json}' files take precedence, acting as base configuration:
            var pos = files.indexOf('common.conf');

            if (pos === -1)
            {
                pos = files.indexOf('common.json');
            }

            if (pos !== -1 && pos !== 0)
            {
                var common = files[pos];

                files.splice(pos, 1);
                files.unshift(common);
            }

            var contents = [];

            for (var a=0; a<files.length; a++)
            {
                if (endsWith('.conf', files[a]) || endsWith('.json', files[a]))
                {
                    var json = sjl(path.join(folder, files[a]));

                    if (json)
                    {
                        contents.push(json);
                    }
                }
            }

            result = unionj.add.apply(unionj, contents);
        }
    }
    else
    {
        result = {};
    }

    return result;
}

function arrayizeAllUnderFolder(folder)
{
    var result = [];

    f.constrain(folder).notnull().string().throws('Argument must be a string');

    folder = path.resolve(folder);

    if (fs.existsSync(folder))
    {
        var files = fs.readdirSync(folder);

        if (files.length)
        {
            for (var a=0; a<files.length; a++)
            {
                if (endsWith('.conf', files[a]) || endsWith('.json', files[a]))
                {
                    var json = sjl(path.join(folder, files[a]));

                    if (json)
                    {
                        result.push(json);
                    }
                }
            }
        }
    }

    return result;
}

function buildPath(parts)
{
    var result = '.';

    f.constrain(parts).notnull().array().throws('Argument must be an array');

    if (parts.length)
    {
        for (var a=0; a<parts.length; a++)
        {
            if (parts[a])
            {
                result = path.join(result, parts[a]);
            }
        }
    }

    return result;
}

function loadCommonsFile(basePath)
{
    var result;

    f.constrain(basePath).notnull().string().throws('Path must be a string');

    if (fs.existsSync(path.join(basePath, 'common.conf')))
    {
        result = sjl(path.join(basePath, 'common.conf'));
    }
    else if (fs.existsSync(path.join(basePath, 'common.json')))
    {
        result = sjl(path.join(basePath, 'common.json'));
    }

    return result;
}

function loadCommonsFromPaths(basePath, paths)
{
    var result = {};

    f.constrain(basePath).notnull().string().throws('Base-path must be a string');
    f.constrain(paths).notnull().array().throws('Second argument must be an array');

    var commons = [];

    var incrementalPath = basePath;

    var json = loadCommonsFile(incrementalPath);

    if (json)
    {
        commons.push(json);
    }

    for (var a=0; a<paths.length; a++)
    {
        incrementalPath = path.join(incrementalPath, paths[a]);

        json = loadCommonsFile(incrementalPath);

        if (json)
        {
            commons.push(json);
        }
    }

    if (commons.length)
    {
        result = unionj.add.apply(unionj, commons);
    }

    return result;
}

function load(basePath, subPath, strategy)
{
    var result;

    f.constrain(basePath, subPath).notnull().strings().throws('Paths must be strings');

    var fullpath;

    if (strategy === STRATEGIES.LEAVES)
    {
        fullpath = path.join(basePath, subPath);

        result = unifyAllUnderFolder(fullpath);
    }
    else if (strategy === STRATEGIES.BACKCURSION)
    {
        var commons = loadCommonsFromPaths(basePath, subPath.split(path.sep));
        var inner   = load(basePath, subPath, STRATEGIES.LEAVES);

        result = unionj.add(commons, inner);
    }
    else
    {
        fullpath = path.join(basePath, subPath);

        result = arrayizeAllUnderFolder(fullpath);
    }

    return result;
}


function Conf(basePath)
{
    f.constrain(basePath).notnull().string().throws('Path must be a string');

    this.basePath  = basePath;
    this._strategy = DEFAULT_STRATEGY;
}

Conf.prototype.get = function()
{
    var result = {};

    if (arguments.length)
    {
        // Parse sublevels:
        var args = Array.prototype.slice.call(arguments);

        var subPath = buildPath(args);

        result = load(this.basePath, subPath, this._strategy);
    }
    else
    {
        // Here things are decided depending on the strategy previously set by the user:
        if (   this._strategy === STRATEGIES.LEAVES
            || this._strategy === STRATEGIES.BACKCURSION)
        {
            // Return the whole structure:
            result = unifyAllUnderFolder(this.basePath);
        }
        else // Assumes "ARRAY" strategy
        {
            // Return an array of files from the base-path:
            result = arrayizeAllUnderFolder(this.basePath);
        }
    }


    return result;
};

Conf.prototype.from = function()
{
    return this.basePath;
};

Conf.prototype.strategy = function()
{
    var confRef = this;

    var obj = {};

    obj.leaves = function()
    {
        confRef._strategy = STRATEGIES.LEAVES;

        return confRef;
    };

    obj.backcursion = function()
    {
        confRef._strategy = STRATEGIES.BACKCURSION;

        return confRef;
    };

    obj.array = function()
    {
        confRef._strategy = STRATEGIES.ARRAY;

        return confRef;
    };

    obj.get = function()
    {
        return confRef._strategy;
    };

    obj.set = function(str)
    {
        if (str &&
                (   str.toUpperCase() === STRATEGIES.LEAVES
                 || str.toUpperCase() === STRATEGIES.BACKCURSION
                 || str.toUpperCase() === STRATEGIES.ARRAY
                )
           )
        {
            confRef._strategy = str.toUpperCase();

            return confRef;
        }
        else
        {
            throw new Error('No such strategy');
        }
    };

    return obj;
};

Conf.prototype.toString = function()
{
    return '[object Conf]';
};


module.exports =
{
    STRATEGIES: STRATEGIES,

    strategy: function()
    {
        return {
            default: function()
            {
                return DEFAULT_STRATEGY;
            }
        };
    },

    from: function(basePath)
    {
        f.constrain(basePath).notnull().string().throws('Base-path must be a string');

        var result = new Conf(basePath);

        return result;
    }
};
