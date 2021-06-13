const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const root = path.join(__dirname, 'manifests');


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
            jsonArr.push(json);
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


