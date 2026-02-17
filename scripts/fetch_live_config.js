import fs from 'fs';
import path from 'path';

// If node version < 18, fetch might need polyfill, but usually it's fine in recent node.
// We'll use built-in fetch.

const jsUrl = 'https://hyzen-labs-web.vercel.app/assets/index-CYS6odrg.js';

console.log("Fetching", jsUrl);

fetch(jsUrl)
    .then(res => res.text())
    .then(content => {
        console.log("Content length:", content.length);

        // Search for config
        const searchStr = '{"apiKey":"AIza';
        // try with single quote wrapper
        const searchStr1 = `'{"apiKey":"AIza`;
        const searchStr2 = `{"apiKey":"AIza`; // maybe no wrapper?

        let startIndex = content.indexOf(searchStr1);
        let quoteChar = "'";

        if (startIndex === -1) {
            startIndex = content.indexOf(searchStr2);
            quoteChar = null; // maybe just raw object?
        }

        if (startIndex !== -1) {
            console.log("Found config start at", startIndex);

            // precise extraction
            // if wrapped in single quote, look for }'
            if (content[startIndex - 1] === "'") {
                const endIndex = content.indexOf("}'", startIndex);
                if (endIndex !== -1) {
                    console.log("FULL_CONFIG_QUOTED:", content.substring(startIndex, endIndex + 1));
                }
            } else {
                // Maybe it's just in the code like `var x = {"apiKey":...}`
                // naive search for closing }
                const endIndex = content.indexOf("}", startIndex);
                if (endIndex !== -1) {
                    // heuristic: usually config is not extremely long ( < 500 chars)
                    console.log("FULL_CONFIG_RAW:", content.substring(startIndex, endIndex + 1));
                }
            }

        } else {
            console.log("Config not found with known patterns.");
            // Dump some context around "AIza"
            const idx = content.indexOf("AIza");
            if (idx !== -1) {
                console.log("CONTEXT:", content.substring(idx - 50, idx + 300));
            }
        }
    })
    .catch(err => {
        console.error("Error fetching:", err);
    });
