const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const Ajv = require('ajv');
const ajv = new Ajv();
const addFormats = require('ajv-formats');
addFormats(ajv);

const root = path.join(__dirname, 'manifests');

const schema = {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    'type': 'object',
    'properties': {
        'Name' : {
            'type': 'string'
        },
        'Identifier' : {
            'type': 'string'
        },
        'Version' : {
            'type': 'object',
            'properties': {
                'Major': {
                    'anyOf': [
                        {
                            'type': 'string',
                            'pattern': '^\\d+$'
                        },
                        {
                            'type': 'number'
                        }
                    ]
                },
                'Minor': {
                    'anyOf': [
                        {
                            'type': 'string',
                            'pattern': '^\\d+$'
                        },
                        {
                            'type': 'number'
                        }
                    ]
                },
                'Patch': {
                    'anyOf': [
                        {
                            'type': 'string',
                            'pattern': '^\\d+$'
                        },
                        {
                            'type': 'number'
                        }
                    ]
                },
                'Build': {
                    'anyOf': [
                        {
                            'type': 'string',
                            'pattern': '^\\d+$'
                        },
                        {
                            'type': 'number'
                        }
                    ]
                }
            },
              'required': ['Major', 'Minor', 'Patch', 'Build']
        },
        'Author' : {
            'type': 'string'
        },
        'Homepage' : {
            'type': 'string',
            'format': 'uri-reference'
        },
        'Repository' : {
            'type': 'string',
            'format': 'uri-reference'
        },
        'License' : {
            'type': 'string'
        },
        'LicenseURL' : {
            'type': 'string',
            'format': 'uri-reference'
        },
        'Tags': {
            'type': 'array',
            'items': {
                'type': 'string'
            }
        },
        'MinimumApplicationVersion': {
            'type': 'object',
            'properties': {
                'Major': {
                    'anyOf': [
                        {
                            'type': 'string',
                            'pattern': '^\\d+$'
                        },
                        {
                            'type': 'number'
                        }
                    ]
                },
                'Minor': {
                    'anyOf': [
                        {
                            'type': 'string',
                            'pattern': '^\\d+$'
                        },
                        {
                            'type': 'number'
                        }
                    ]
                },
                'Patch': {
                    'anyOf': [
                        {
                            'type': 'string',
                            'pattern': '^\\d+$'
                        },
                        {
                            'type': 'number'
                        }
                    ]
                },
                'Build': {
                    'anyOf': [
                        {
                            'type': 'string',
                            'pattern': '^\\d+$'
                        },
                        {
                            'type': 'number'
                        }
                    ]
                }
            },
              'required': ['Major', 'Minor', 'Patch', 'Build']
        },
        'Descriptions': {
            'type': 'object',
            'properties': {
                'ShortDescription': {
                    'type': 'string'
                },
                'LongDescription': {
                    'type': 'string'
                },
                'FeaturedImageURL': {
                    'type': 'string',
                    'format': 'uri-reference'
                },
                'ScreenshotURL': {
                    'type': 'string',
                    'format': 'uri-reference'
                },
                'AltScreenshotURL': {
                    'type': 'string',
                    'format': 'uri-reference'
                }
            },
              'required': ['ShortDescription']
        },

        'Installer': {
            'type': 'object',
            'properties': {
                'URL': {
                    'type': 'string',
                    'format': 'uri-reference'
                },
                'Checksum': {
                    'type': 'string',
                    'minLength': 32,
                    'maxLength': 64,
                    'pattern': '^[A-Fa-f0-9]{32,64}$'
                },
                'ChecksumType': {
                    'type': 'string',
                    'enum': ['MD5','SHA1','SHA256']
                },
                'Type': {
                    'type': 'string',
                    'enum': ['DLL', 'ARCHIVE']
                }
            },
              'required': ['URL', 'Checksum', 'ChecksumType', 'Type']
        }
    },
    'required': ['Name', 'Identifier', 'Version', 'Author', 'Repository', 'License', 'LicenseURL', 'MinimumApplicationVersion', 'Descriptions', 'Installer'],
    'additionalProperties': false
};
const validate = ajv.compile(schema);

async function scanDir(dir) {
    let jsonArr = [];
    const files = await fs.promises.readdir(dir);
    for( const file of files ) {
        const fullPath = path.join( dir, file );
        
        if(fs.lstatSync(fullPath).isDirectory()) {
            const jsons = await scanDir(fullPath);
            jsonArr = [...jsonArr, ...jsons];
        } else {
            console.log('Found manifest in ' + fullPath);
            const data = await readFile(fullPath);
            const json = JSON.parse(data.toString('utf8').replace(/^\uFEFF/, ''));
            const valid = validate(json);
            if(!valid) {
                console.log('INVALID MANIFEST! ' + fullPath);
                console.log(JSON.stringify(validate.errors));
            } else {
                console.log('Manifest valid at ' + fullPath);
                jsonArr.push(json);
            }            
        }        
    }
    return jsonArr;
}

(async ()=>{
    console.log('Scanning for manifests in ' + root);
    const manifests = await scanDir(root);
    const targetDir = __dirname + '/Plugins';
    if (!fs.existsSync(targetDir)){
        fs.mkdirSync(targetDir);
    }
    await writeFile(targetDir + '/manifests.json', JSON.stringify(manifests), function(err, result) {
        if(err) console.log('error', err);
      });
    //await writeFile('manifests.json', manifests);
})();


