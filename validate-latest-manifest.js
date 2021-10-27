const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const request = require('request');
const crypto = require('crypto');

const Ajv = require('ajv');
const ajv = new Ajv();
const addFormats = require('ajv-formats');
addFormats(ajv);

const schema = require('./manifest.schema.json');
const validate = ajv.compile(schema);

const { exec } = require("child_process");

exec('git diff --name-only --diff-filter=ACM HEAD~1..HEAD', async (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        process.exit(1);
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        process.exit(1);
    }

    let hasErrors = false;
    const files = stdout.split(/\r?\n/).filter(x => x.indexOf('.json') > -1 && x !== 'package.json' && x !== 'manifest.schema.json' && x !== '.vscode/launch.json');

    for(const file of files) {
        const fullPath = path.join( __dirname, file );
        try {
            console.log('\x1b[0m', 'Found changed manifest in ' + fullPath);
            const data = await readFile(fullPath);
            const json = JSON.parse(data.toString('utf8').replace(/^\uFEFF/, ''));
            const valid = validate(json);
            
            if(!valid) {
                throw new Error(fullPath + ' -- '  + JSON.stringify(validate.errors))
            } else {
                const remoteHash = await getHashFromRemote(json.Installer.URL, json.Installer.ChecksumType);
                if(remoteHash.toLowerCase() !== json.Installer.Checksum.toLowerCase()) {
                    throw new Error(`Expected hash to be ${json.Installer.Checksum}, but actually was ${remoteHash}`);
                }                

                console.log("\x1b[32m",'Manifest valid at ' + fullPath);
            }    
        } catch(e) {
            hasErrors = true;
            console.log('\x1b[31m', 'INVALID MANIFEST! ' + e.message);
        }
    }

    if(hasErrors) {        
        process.exit(1);
    }
});

function getHashFromRemote(url, hashalgorithm) {
    return new Promise((resolve, reject) => {
        const hasher = crypto.createHash(hashalgorithm.toLowerCase());
        hasher.setEncoding('hex');
        request(url).on('error', x => reject(new Error(`Failed to get ${url}`))).pipe(hasher).on('finish', (x) => resolve(hasher.read()));
    });
}