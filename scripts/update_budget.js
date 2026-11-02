const fs = require('fs');
const p = 'E:/talesItem/frontend/angular.json';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('"maximumWarning": "500kB"', '"maximumWarning": "1MB"');
c = c.replace('"maximumError": "1MB"', '"maximumError": "2MB"');
fs.writeFileSync(p, c, 'utf8');
console.log('Successfully updated budget in angular.json');
