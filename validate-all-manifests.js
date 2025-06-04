const fs = require('fs').promises;
const path = require('path');
const readFile = fs.readFile;

const request = require('request');
const crypto = require('crypto');

const Ajv = require('ajv');
const ajv = new Ajv();
const addFormats = require('ajv-formats');
addFormats(ajv);

const schema = require('./manifest.schema.json');
const validate = ajv.compile(schema);

async function validateAll() {

    let hasErrors = false;
    const files = await getAllJsonFiles(path.join(__dirname, 'manifests'));

    for(const file of files) {
        const fullPath = file;
        try {
            console.log('\x1b[0m', 'Found manifest in ' + fullPath);
            const data = await readFile(fullPath);
            const json = JSON.parse(data.toString('utf8').replace(/^\uFEFF/, ''));
            const valid = validate(json);
            
            if(!valid) {
                throw new Error(fullPath + ' -- '  + JSON.stringify(validate.errors))
            } else {
                const remoteHash = await getHashFromRemote(json.Installer.URL, json.Installer.ChecksumType);
                if(remoteHash.toLowerCase() !== json.Installer.Checksum.toLowerCase()) {
                    throw new Error(`Expected hash to be ${json.Installer.Checksum}, but actually was ${remoteHash} from ${json.Installer.URL}`);
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
};

function getHashFromRemote(url, hashalgorithm) {
    return new Promise((resolve, reject) => {
        const hasher = crypto.createHash(hashalgorithm.toLowerCase());
        hasher.setEncoding('hex');
        request(url).on('error', x => reject(new Error(`Failed to get ${url}`))).pipe(hasher).on('finish', (x) => resolve(hasher.read()));
    });
}

async function getAllJsonFiles(dir) {
  let results = [];

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await getAllJsonFiles(fullPath);
      results.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }

  return results;
}

validateAll();