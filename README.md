# yoat
YouTube-audio-stream-extraction proof of concept

## description
vanilla javascript script that produces audio stream URL given YouTube video ID

## files
```
yoat.js   -- actual script. exports the single async function get_audio(id)

test.html -- mini YouTube audio player using yoat.js's capabilities
server.js -- serves script on standard Deno server, providing test.html with interface to yoat.js
```