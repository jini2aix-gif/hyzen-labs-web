import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist/assets');
const files = fs.readdirSync(distDir);
const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));

if (jsFile) {
    const content = fs.readFileSync(path.join(distDir, jsFile), 'utf8');
    // Search for the pattern '{"apiKey":"AIza
    // It is likely wrapped in single quotes: const t='{"apiKey":"AIza...}'
    const searchStr = '\'{"apiKey":"AIza';
    const startIndex = content.indexOf(searchStr);

    if (startIndex !== -1) {
        // Look for closing }'
        const endIndex = content.indexOf('}\'', startIndex);
        if (endIndex !== -1) {
            // Extract content between the quotes
            const configStr = content.substring(startIndex + 1, endIndex + 1);
            console.log("FULL_CONFIG:", configStr);
        } else {
            console.log("End of config not found (no closing }')");
            // Fallback: print context
            console.log("CONTEXT:", content.substring(startIndex, startIndex + 200));
        }
    } else {
        console.log("Start of config not found");
        // Fallback: search for just AIza
        const index = content.indexOf('AIza');
        if (index !== -1) {
            console.log("PARTIAL_MATCH_CONTEXT:", content.substring(index - 20, index + 200));
        }
    }
} else {
    console.log("JS file not found");
}
