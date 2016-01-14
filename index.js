'use strict';

var P      = require("bluebird");
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
    return new P(function(resolve, reject)
    {
        f.constrain(folder).notnull().string()
        .otherwise(function()
        {
            reject(new Error('Argument must be a string'));
        });

        folder = path.resolve(folder);

        fs.access(folder, fs.R_OK | fs.W_OK, function(err)
        {
            if (err)
            {
                // In case we don't find the folder just return null and continue mixing JSONs:
                resolve(null);
            }
            else
            {
                fs.readdir(folder, function(err, files)
                {
                    if (err)
                    {
                        reject(err);
                    }
                    else if (files.length)
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

                        P.map(files, function(file)
                        {
                            if (endsWith('.conf', file) || endsWith('.json', file))
                            {
                                return sjl(path.join(folder, file));
                            }
                            else
                            {
                                return null;
                            }
                        })
                        .reduce(function(contents, json)
                        {
                            if (!f.$.isArray(contents))
                            {
                                contents = [contents];
                            }

                            if (json)
                            {
                                contents.push(json);
                            }

                            return contents;
                        })
                        .then(function(contents)
                        {
                            /* The "reduce" step is skipped when only one doc is loaded.
                             * If so we need wrapping that only result in an array:
                             */
                            if (!f.$.isArray(contents))
                            {
                                contents = [contents];
                            }

                            var result = unionj.add.apply(unionj, contents);

                            resolve(result);
                        })
                        .catch(function(err)
                        {
                            reject(err);
                        });
                    }
                    else
                    {
                        resolve({});
                    }
                });
            }
        });
    });
}

function arrayizeAllUnderFolder(folder)
{
    return new P(function(resolve, reject)
    {
        f.constrain(folder).notnull().string()
        .otherwise(function()
        {
            reject(new Error('Argument must be a string'));
        });

        folder = path.resolve(folder);

        fs.access(folder, fs.R_OK | fs.W_OK, function(err)
        {
            if (err)
            {
                // In case we don't find the folder just return null and continue mixing JSONs:
                resolve(null);
            }
            else
            {
                fs.readdir(folder, function(err, files)
                {
                    if (err)
                    {
                        reject(err);
                    }
                    else if (files.length)
                    {
                        P.map(files, function(file)
                        {
                            if (endsWith('.conf', file) || endsWith('.json', file))
                            {
                                return sjl(path.join(folder, file));
                            }
                            else
                            {
                                var subpath = path.join(folder, file);

                                return new P(function(resolve, reject)
                                {
                                    fs.stat(subpath, function(err, stat)
                                    {
                                        if (stat.isDirectory())
                                        {
                                            unifyAllUnderFolder(subpath)
                                            .then(resolve)
                                            .catch(reject);
                                        }
                                        else
                                        {
                                            resolve(null);
                                        }
                                    });
                                });
                            }
                        })
                        .reduce(function(result, json)
                        {
                            if (!f.$.isArray(result))
                            {
                                result = [result];
                            }

                            if (json)
                            {
                                result.push(json);
                            }

                            return result;
                        })
                        .then(function(result)
                        {
                            /* The "reduce" step is skipped when only one doc is loaded.
                             * If so we need wrapping that only result in an array:
                             */
                            if (!f.$.isArray(result))
                            {
                                result = [result];
                            }

                            resolve(result);
                        })
                        .catch(reject);
                    }
                    else
                    {
                        resolve([]);
                    }
                });
            }
        });
    });
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
    return new P(function(resolve, reject)
    {
        f.constrain(basePath).notnull().string()
        .otherwise(function()
        {
            reject(new Error('Path must be a string'));
        });

        var commonConf = path.join(basePath, 'common.conf');

        fs.access(commonConf, fs.R_OK | fs.W_OK, function(err)
        {
            if (err)
            {
                var commonJson = path.join(basePath, 'common.json');

                fs.access(commonJson, fs.R_OK | fs.W_OK, function(err)
                {
                    if (err)
                    {
                        // No file? Easy solution: don't load anything and return null.
                        resolve(null);
                    }
                    else
                    {
                        sjl(commonJson)
                        .then(resolve)
                        .catch(reject);
                    }
                });
            }
            else
            {
                sjl(commonConf)
                .then(resolve)
                .catch(reject);
            }
        });
    });
}

function loadCommonsFromPaths(basePath, paths)
{
    return new P(function(resolve, reject)
    {
        f.constrain(basePath).notnull().string()
        .otherwise(function()
        {
            reject(new Error('Base-path must be a string'));
        });

        f.constrain(paths).notnull().array()
        .otherwise(function()
        {
            reject(new Error('Second argument must be an array'));
        });

        var commons = [];

        var incrementalPath = basePath;

        loadCommonsFile(incrementalPath)
        .then(function(json)
        {
            if (json)
            {
                commons.push(json);
            }

            P.map(paths, function(commonFilePath)
            {
                incrementalPath = path.join(incrementalPath, commonFilePath);

                return loadCommonsFile(incrementalPath);
            })
            .reduce(function(newCommons, json)
            {
                if (!f.$.isArray(newCommons))
                {
                    newCommons = [newCommons];
                }

                if (json)
                {
                    newCommons.push(json);
                }

                return newCommons;
            })
            .then(function(newCommons)
            {
                var result;

                if (newCommons && newCommons.length)
                {
                    // Add to previous commons:
                    commons = commons.concat(newCommons);

                    result = unionj.add.apply(unionj, commons);
                }
                else if (commons && commons.length)
                {
                    result = unionj.add.apply(unionj, commons);
                }
                else
                {
                    result = {};
                }

                resolve(result);
            })
            .catch(reject);
        })
        .catch(reject);
    });
}

function load(basePath, subPath, strategy)
{
    return new P(function(resolve, reject)
    {
        f.constrain(basePath, subPath).notnull().strings()
        .otherwise(function()
        {
            reject(new Error('Paths must be strings'));
        });

        var fullpath;

        if (strategy === STRATEGIES.LEAVES)
        {
            fullpath = path.join(basePath, subPath);

            unifyAllUnderFolder(fullpath)
            .then(resolve)
            .catch(reject);
        }
        else if (strategy === STRATEGIES.BACKCURSION)
        {
            loadCommonsFromPaths(basePath, subPath.split(path.sep))
            .then(function(commons)
            {
                load(basePath, subPath, STRATEGIES.LEAVES)
                .then(function(inner)
                {
                    var result = unionj.add(commons, inner);

                    resolve(result);
                });
            })
            .catch(reject);
        }
        else // Strategy is "ARRAY"...
        {
            fullpath = path.join(basePath, subPath);

            arrayizeAllUnderFolder(fullpath)
            .then(resolve)
            .catch(reject);
        }
    });
}


function Conf(basePath)
{
    f.constrain(basePath).notnull().string().throws('Path must be a string');

    this.basePath  = basePath;
    this._strategy = DEFAULT_STRATEGY;
}

Conf.prototype.get = function()
{
    var self = this;

    var args;

    if (arguments.length)
    {
        args = Array.prototype.slice.call(arguments);
    }

    return new P(function(resolve, reject)
    {
        if (args && args.length)
        {
            // Parse sublevels:
            var subPath = buildPath(args);

            load(self.basePath, subPath, self._strategy)
            .then(resolve)
            .catch(reject);
        }
        else
        {
            // Here things are decided depending on the strategy previously set by the user:
            if (   self._strategy === STRATEGIES.LEAVES
                || self._strategy === STRATEGIES.BACKCURSION)
            {
                // Answer with the whole structure (by returning the underlying promise):
                unifyAllUnderFolder(self.basePath)
                .then(resolve)
                .catch(reject);
            }
            else // Assumes "ARRAY" strategy
            {
                // Return an array of files from the base-path:
                arrayizeAllUnderFolder(self.basePath)
                .then(resolve)
                .catch(reject);
            }
        }
    });
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
