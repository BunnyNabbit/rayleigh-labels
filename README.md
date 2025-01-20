# Rayleigh Moderation
Moderation interface for quickly labeling `app.bsky.feed.post` records containing images.

Rayleigh is not a replacement labeling service. It still requires a labeling service like [Ozone](https://github.com/bluesky-social/ozone/) to function.

## Setup
Node.js should be installed prior to following these setup instructions.
1. In the project directory, install dependencies with `npm i`.
2. Copy `/agentKeys-example.json` to `/agentKeys.json` and copy `/web/labels-example.json` to `/web/labels.json`. You will then edit the new files with relevant information.
3. Run `npm run build` to build the web interface. Or use `npm run watch` to build on changed files. 
4. Run with `npm run start`. By default, the moderation interface can be accessed at localhost:3213.

## Usage
The interface will emit events back to the labeling service when a post is acknowledged/labeled. Set a post's labels from the buttons on the top left area of the interface

Keyboard: Left-right arrow keys to switch image in post and Enter to acknowledge/label. Label access keys may be implemented differently on browsers, but this is typically `Alt+KEY`. Backspace to show previously seen post.

Touch gestures: Swipe left-right to switch image in post and up to acknowledge/label. Swipe down to show previously seen post.