const html = '<br/><img src="data:image/jpeg;base64,aabbccddeeff" class="max-w-full rounded-2xl mx-auto my-4 shadow-sm border border-gray-100" style="max-height: 600px; object-fit: contain;" alt="media" /><br/>';
const imgRegex = /<img[^>]+src="([^">]+)"/g;
let match;
while ((match = imgRegex.exec(html)) !== null) {
    console.log("MATCH:", match[1]);
}
