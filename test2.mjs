import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = {
    projectId: "venturely-ai",
    appId: "hyzen-labs-web"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const q = collection(db, 'artifacts', 'hyzen-labs-web', 'public', 'data', 'blog');
    const snapshots = await getDocs(q);
    const data = snapshots.docs.map(d => d.data());
    fs.writeFileSync('blogs.json', JSON.stringify(data, null, 2));
    console.log('done');
    process.exit(0);
}
run();
