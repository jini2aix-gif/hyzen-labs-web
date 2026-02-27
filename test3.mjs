import fs from 'fs';
const data = JSON.parse(fs.readFileSync('blogs.json', 'utf8').replace(/^\uFEFF/, ''));
const content = data.documents[0].fields.blocks.arrayValue.values[0].mapValue.fields.content.stringValue;

console.log("String length:", content.length);

const imgRegex = /<img[^>]+src="([^">]+)"/g;
let match;
try {
    while ((match = imgRegex.exec(content)) !== null) {
        console.log('Match found, length:', match[1].length);
    }
} catch (e) {
    console.log("Error regex: ", e);
}
console.log("Done");
