#  [![NPM version][npm-image]][npm-url] [![Dependency Status][daviddm-image]][daviddm-url]

conf.d
======
> Multi-files JSON loader

_Conf.d_ serves JSON documents obtained from static files and arbitrary paths passed by the user.  
According to the paths being passed and the way the files are organized in folders (and sub-folders), JSON docs are mixed together and bundled into one.

_Conf.d_ is to be used when there is a need for serving complex JSON documents, composed of default keys/values that can be overridden depending on arbitrary, runtime-picked criteria and loaded from a tree of files that reflects those possible override schemata.

Files and folders organization stays fixed, but JSON documents produced by _conf.d_ are dynamically generated starting from those files and the rules passed to _conf.d_.

Documents are unified by using the [unionj](http://github.com/NicolaOrritos/unionj) module.

## Warning
**Documentation still isn't complete**

## Install
```sh
$ npm install -g confd
```


## Example Usage
First of all prepare your JSON configuration file(s) (you need root rights to execute these):
```sh
mkdir -p /etc/conf.d/myinstancename
touch /etc/conf.d/myinstancename/conf.json
echo "{\"key\":\"value\"}" > /etc/conf.d/myinstancename/conf.json
```

Finally you can either use the command-line utility to read your JSON conf:
```sh
confd cli get /etc/conf.d myinstancename

# {"key":"value"}
```

Or you can expose them as a RESTful webservice:
```sh
confd rest --port 8080 --from /etc/conf.d

curl --get localhost:8080/confd/myinstancename

# {"key":"value"}
```

Or you can embed conf.d straight into your Node.js code:
```js
var confd = require('confd');
var conf  = confd.from('/etc/conf.d');

conf.get('myinstancename')
.then(function(obj)
{
    console.log('Result is: "%s"', JSON.stringify(obj));
    // Result is: "{"key":"value"}"
})
.catch(function(err)
{
    // Handle errors here...
});
```
**When used as a node module the value retrieved is an actual Javascript object instead of a string containing a JSON doc.**


## Paths
Let's say we have the following files and folders structure:
```
/etc/conf.d/
    /subfolder1/
        file1.json => {"k": "v1"}
        file2.json => {"k": "v2"}
        /subfolder2/
            file1.json => {"x": "y"}
            file2.json => {"x": "y"}
```
If we execute `confd cli get /etc/conf.d subfolder1` we obtain `{"k": "v2"}` as a result.  
Here's what confd did to satisfy our request:
- We told confd to get the files from root folder `/etc/conf.d/`, subfolder 'subfolder1'
- confd then proceded to merge the contents of that folder, hence `file1.json` and `file2.json`
- The result is the merge of the two JSON documents (for the merge rules, see [unionj](http://github.com/NicolaOrritos/unionj) project)


## _"Common"_ documents
> [Coming soon]


## Strategies
_Conf.d_ offers two different strategies to load the configuration data:
- _Leaves_
- _Backcursion_

### Leaves
When using the _"Leaves"_ strategy all the documents from the same folder are bundled into one.  
There will be no sub-/super-paths traversing: the documents that's going to be bundled are just the ones into the one folder addressed by the provided path.

### Backcursion
> [Coming soon]

### Array
> [Coming soon]


## Next steps
- MongoDB docs loading
- New startegy: "Named Backcursion"
- RethinkDB docs loading


## License

MIT © [Nicola Orritos](nicolaorritos.github.io)


[npm-image]: https://badge.fury.io/js/confd.svg
[npm-url]: https://npmjs.org/package/confd
[daviddm-image]: https://david-dm.org/NicolaOrritos/conf.d.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/NicolaOrritos/conf.d
