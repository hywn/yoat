# yoat
YouTube-audio-stream-extraction proof of concept

## description
vanilla Node.js script that produces audio stream URL given YouTube video ID

## files
```
yoat.js   -- actual script. exports the single async function get_audio(id)

test.html -- mini YouTube audio player using yoat.js's capabilities
server.js -- serves script so that test.html can talk to yoat.js
```
