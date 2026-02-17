import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';
import fetch from 'node-fetch'; // Standard fetch might be available, but just in case. Actually, 'v24' has fetch.

const jsUrl = 'https://hyzen-labs-web.vercel.app/assets/index-CYS6odrg.js';

async function wipeLive() {
    console.log("Fetching live JS...");
    const response = await fetch(jsUrl);
    const content = await response.text();

    // Strategy 1: Look for JSON string inside single quotes '{"apiKey":"...'
    const searchStr = '\'{"apiKey":"AIza';
    let startIndex = content.indexOf(searchStr);
    let endIndex = -1;
    let configStr = '';

    if (startIndex !== -1) {
        endIndex = content.indexOf('}\'', startIndex);
        if (endIndex !== -1) {
            configStr = content.substring(startIndex + 1, endIndex + 1);
        }
    } else {
        // Strategy 2: Look for raw object object if not stringified: {apiKey:"AIza...
        // Note: property names in minified code might not be quoted if not JSON, 
        // but firebase config usually keeps string keys for compatibility ?
        // Or if it IS a JSON string, it might be double quoted "{\"apiKey\":..."
        console.log("Strategy 1 failed. Trying raw...");
    }

    if (!configStr) {
        console.error("Could not find config in live JS!");
        return;
    }

    console.log("Parsed Config String:", configStr);

    let firebaseConfig;
    try {
        firebaseConfig = JSON.parse(configStr);
    } catch (e) {
        console.error("JSON parse failed:", e);
        return;
    }

    console.log("Initializing Firebase for Project:", firebaseConfig.projectId);

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    // Correct path: artifacts/{appId}/public/data/messages
    // Default appId is 'hyzen-labs-production'
    const appId = 'hyzen-labs-production';
    const guestbookRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages');

    console.log(`Querying collection: artifacts/${appId}/public/data/messages`);

    const snapshot = await getDocs(guestbookRef);
    console.log(`Found ${snapshot.size} documents in 'guestbook'.`);

    if (snapshot.size === 0) {
        console.log("Nothing to delete.");
        return;
    }

    console.log("Deleting documents...");
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log("All guestbook entries deleted successfully via Live Config.");
}

wipeLive().catch(console.error);
