'use strict';

var f      = require('f.luent');
var fs     = require('fs');
var sjl    = require('sjl');
var path   = require('path');
var unionj = require('unionj');


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
    
    console.log('Going to parse folder "%s"...', folder);
    
    if (fs.existsSync(folder))
    {
        var files = fs.readdirSync(folder);

        if (files.length)
        {
            // 'common.{conf|json}' files take precedence:
            var pos = files.indexOf('common.conf');

            if (pos === -1)
            {
                pos = files.indexOf('common.json');
            }

            if (pos !== -1)
            {
                var common = files[pos];

                files = files.splice(pos, 1);
                files.push(common);
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

            result = unionj.add.apply(null, contents);
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

function load(basePath, subPath)
{
    var result;
    
    f.constrain(basePath, subPath).notnull().strings().throws('Paths must be strings');
    
    var fullpath = path.join(basePath, subPath);
    
    result = unifyAllUnderFolder(fullpath);
    
    return result;
}


function Conf(basePath)
{
    f.constrain(basePath).notnull().string().throws('Path must be a string');
    
    this.basePath = basePath;
}

Conf.prototype.get = function()
{
    var result = {};
    
    if (arguments.length)
    {
        // Parse sublevels:
        var args = Array.prototype.slice.call(arguments);
        
        var subPath = buildPath(args);
        
        result = load(this.basePath, subPath);
    }
    else
    {
        // Return the whole structure
        result = unifyAllUnderFolder(this.basePath);
    }
    
    
    return result;
};

Conf.prototype.toString = function()
{
    return '[object Conf]';
};


module.exports =
{
    from: function(basePath)
    {
        f.constrain(basePath).notnull().string().throws('Base-path must be a string');
        
        var result = new Conf(basePath);
        
        return result;
    }
};
