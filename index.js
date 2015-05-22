'use strict';

var f      = require('f.luent');
var fs     = require('fs');
var sjl    = require('sjl');
var path   = require('path');
var unionj = require('unionj');


var STRATEGIES =
{
    LEAVES: 'LEAVES',
    BACKCURSION: 'BACKCURSION'
};


function endsWith(end, str)
{
    var result = false;
    
    if (end && str && end.length && str.length)
    {
        var pos = str.indexOf(end);
        
        if (pos === str.length - end.length)
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
        throw new Error('Path "' + folder + '" does not exist');
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
            result = path.join(result, parts[a]);
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
    
    if (strategy === STRATEGIES.LEAVES)
    {
        var fullpath = path.join(basePath, subPath);

        result = unifyAllUnderFolder(fullpath);
    }
    else
    {
        // TODO
        var commons = loadCommonsFromPaths(basePath, subPath.split(path.sep));
        var inner   = load(basePath, subPath, STRATEGIES.LEAVES);
        
        result = unionj.add(commons, inner);
    }
    
    return result;
}


function Conf(basePath)
{
    f.constrain(basePath).notnull().string().throws('Path must be a string');
    
    this.basePath  = basePath;
    this._strategy = STRATEGIES.LEAVES;  // Default strategy is 'leaves'
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
        // Return the whole structure
        result = unifyAllUnderFolder(this.basePath);
    }
    
    
    return result;
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
    
    obj.get = function()
    {
        return confRef._strategy;
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
    
    from: function(basePath)
    {
        f.constrain(basePath).notnull().string().throws('Base-path must be a string');
        
        var result = new Conf(basePath);
        
        return result;
    }
};
