'use strict';

const f        = require('f.luent');
const fs       = require('fs');
const sjl      = require('sjl');
const path     = require('path');
const unionj   = require('unionj');


let STRATEGIES =
{
    LEAVES: 'LEAVES',
    BACKCURSION: 'BACKCURSION',
    ARRAY: 'ARRAY'
};

let DEFAULT_STRATEGY = STRATEGIES.LEAVES;


function endsWith(end, str)
{
    let result = false;

    if (end && str && end.length && str.length)
    {
        let pos = str.indexOf(end);

        if (pos >= 0 && pos === str.length - end.length)
        {
            result = true;
        }
    }

    return result;
}

function unifyAllUnderFolder(folder)
{
    return new Promise( (resolve, reject) =>
    {
        f.constrain(folder).notnull().string()
        .otherwise( () =>
        {
            reject(new Error('Argument must be a string'));
        });

        folder = path.resolve(folder);

        fs.access(folder, fs.R_OK, err =>
        {
            if (err)
            {
                // In case we don't find the folder just return null and continue mixing JSONs:
                resolve(null);
            }
            else
            {
                fs.readdir(folder, (err, files) =>
                {
                    if (err)
                    {
                        reject(err);
                    }
                    else if (files.length)
                    {
                        // 'common.{conf|json}' files take precedence, acting as base configuration:
                        let pos = files.indexOf('common.conf');

                        if (pos === -1)
                        {
                            pos = files.indexOf('common.json');
                        }

                        if (pos !== -1 && pos !== 0)
                        {
                            let common = files[pos];

                            files.splice(pos, 1);
                            files.unshift(common);
                        }

                        const promises = files.map( file =>
                        {
                            if (endsWith('.conf', file) || endsWith('.json', file))
                            {
                                return sjl(path.join(folder, file));
                            }
                            else
                            {
                                return null;
                            }
                        });

                        Promise.all(promises)
                        .then( jsons =>
                        {
                            let contents = jsons.reduce( (contents, json) =>
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
                            });

                            /* The "reduce" step is skipped when only one doc is loaded.
                             * If so we need wrapping that only result in an array:
                             */
                            if (!f.$.isArray(contents))
                            {
                                contents = [contents];
                            }

                            let result = unionj.add.apply(unionj, contents);

                            resolve(result);
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
    return new Promise( (resolve, reject) =>
    {
        f.constrain(folder).notnull().string()
        .otherwise( () =>
        {
            reject(new Error('Argument must be a string'));
        });

        folder = path.resolve(folder);

        fs.access(folder, fs.R_OK, err =>
        {
            if (err)
            {
                // In case we don't find the folder just return null and continue mixing JSONs:
                resolve(null);
            }
            else
            {
                fs.readdir(folder, (err, files) =>
                {
                    if (err)
                    {
                        reject(err);
                    }
                    else if (files.length)
                    {
                        const promises = files.map( file =>
                        {
                            if (endsWith('.conf', file) || endsWith('.json', file))
                            {
                                return sjl(path.join(folder, file));
                            }
                            else
                            {
                                let subpath = path.join(folder, file);

                                return new Promise( (resolve, reject) =>
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
                        });

                        Promise.all(promises)
                        .then( jsons =>
                        {
                            let result = jsons.reduce( (result, json) =>
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
                            });

                            /* The "reduce" step is skipped when only one doc is loaded.
                             * If so we need wrapping that only result in an array:
                             */
                            if (!f.$.isArray(result))
                            {
                                result = [result];
                            }

                            resolve(result);
                        });
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
    let result = '.';

    f.constrain(parts).notnull().array().throws('Argument must be an array');

    if (parts.length)
    {
        for (let part of parts)
        {
            if (part)
            {
                result = path.join(result, part);
            }
        }
    }

    return result;
}

function loadCommonsFile(basePath)
{
    return new Promise( (resolve, reject) =>
    {
        f.constrain(basePath).notnull().string()
        .otherwise( () =>
        {
            reject(new Error('Path must be a string'));
        });

        let commonConf = path.join(basePath, 'common.conf');

        fs.access(commonConf, fs.R_OK, err =>
        {
            if (err)
            {
                let commonJson = path.join(basePath, 'common.json');

                fs.access(commonJson, fs.R_OK, err =>
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
    return new Promise( (resolve, reject) =>
    {
        f.constrain(basePath).notnull().string()
        .otherwise( () =>
        {
            reject(new Error('Base-path must be a string'));
        });

        f.constrain(paths).notnull().array()
        .otherwise( () =>
        {
            reject(new Error('Second argument must be an array'));
        });

        let commons = [];

        let incrementalPath = basePath;

        loadCommonsFile(incrementalPath)
        .then( json =>
        {
            if (json)
            {
                commons.push(json);
            }

            const promises = paths.map( commonFilePath =>
            {
                incrementalPath = path.join(incrementalPath, commonFilePath);

                return loadCommonsFile(incrementalPath);
            });

            Promise.all(promises)
            .then( jsons =>
            {
                let newCommons = jsons.reduce( (newCommons, json) =>
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
                });

                let result;

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
            });
        })
        .catch(reject);
    });
}

function load(basePath, subPath, strategy)
{
    return new Promise( (resolve, reject) =>
    {
        f.constrain(basePath, subPath).notnull().strings()
        .otherwise( () =>
        {
            reject(new Error('Paths must be strings'));
        });

        let fullpath;

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
            .then( commons =>
            {
                return load(basePath, subPath, STRATEGIES.LEAVES)
                .then( inner =>
                {
                    let result = unionj.add(commons, inner);

                    resolve(result);
                })
                .catch(reject);
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
    let self = this;

    let args;

    if (arguments.length)
    {
        args = Array.prototype.slice.call(arguments);
    }

    return new Promise( (resolve, reject) =>
    {
        if (args && args.length)
        {
            // Parse sublevels:
            let subPath = buildPath(args);

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
    let confRef = this;

    let obj = {};

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
            throw new Error('No such strategy ("' + str + '")');
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

        let result = new Conf(basePath);

        return result;
    }
};
