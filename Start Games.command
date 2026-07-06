#!/bin/bash
# Double-click to serve Adrian's Learning Games over http:// and open them in your browser.
# Keep this window open while playing; close it (or press Ctrl-C) to stop the server.
cd "$(dirname "$0")" || exit 1
PORT=8777

# Free the port if a previous server is still holding it.
lsof -ti tcp:$PORT 2>/dev/null | xargs kill -9 2>/dev/null

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)

echo "🎮  Adrian's Learning Games"
echo "----------------------------------------"
echo "On this Mac:"
echo "   http://localhost:$PORT/Adrians-Learning-Quest.html"
echo "   http://localhost:$PORT/Word-and-Math-Blaster.html"
if [ -n "$IP" ]; then
  echo ""
  echo "On an iPad / phone on the same WiFi:"
  echo "   http://$IP:$PORT/Adrians-Learning-Quest.html"
  echo "   http://$IP:$PORT/Word-and-Math-Blaster.html"
fi
echo "----------------------------------------"
echo "Keep this window open while playing. Close it to stop."
echo ""

# Open the Quest in the default browser, then run the server in the foreground.
( sleep 1; open "http://localhost:$PORT/Adrians-Learning-Quest.html" ) &
python3 -m http.server "$PORT" --bind 0.0.0.0
