# Elm Simple Server via mise

A reworked version of example 03 from the acadia examples which doesn't need a bash script to serve the app.

I made this so I could play around with acadia on my windows computer.

I have used mise-en-place to manage the dependencies / install everything, but this repository
can be used without it by invoking the node commands directly.

- To build the app: `node ./server/build.js`
- To run the elm server: `node ./server/server.js`

If you don't mind using mise-en-place:

- Use `mise run build` to generate elm files.
- Use `mise run server` to run acadia and the elm http server in parallel (this also runs builds for you!).

## Changes to elm-simple-server

I believe that the script that builds the application (`build.js`) is a pretty faithful port of `serve.sh`. 
I added a static assets folder which allows you to include non elm-js assets in responses (like styles), 
and I renamed any identifiers called `tipe` to `type_` because that's my prefered style :)

The server correctly handles empty responses which means the `/logout` links work properly.

I included pico.css as an example static asset.

### Managing acadia with mise

I've added a http tool dependency to the `mise.toml` which will download the correct acadia binary. **I believe license activation is saved to in your local user's system config** this means that you should probably keep a global installation of acadia to manage that key, even if you want to use mise or another dev tool manager.
