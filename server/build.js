import { createHash } from "node:crypto";
import fs, { openSync } from "node:fs";
import { execSync } from "node:child_process";
import { basename, join, parse } from "node:path";
import { types } from "./mime-types.js";

const hashFile = path => {
  const h = createHash("sha1")
  const data = fs.readFileSync(path)
  h.update(data)
  return h.digest('hex')
};

const rmrf = path => fs.rmSync(path, { recursive: true, force: true });
const mkdirp = path => fs.mkdirSync(path, { recursive: true });
const write = (content, fd) => fs.writeSync(fd, content);
const mv = (src, dest) => {
  fs.copyFileSync(src, dest)
  rmrf(src)
}
const exec = (cmd) => {
  try {
    execSync(cmd)
  } catch (e) {
    return false
  } finally {
    return true
  }
};

// SETUP DIRECTORIES

const TMP = `gen/tmp`
const ASSETS = `gen/assets`

process.on("exit", _ => {
  rmrf(TMP)
})

rmrf(ASSETS)

mkdirp(ASSETS)
mkdirp(TMP)

// BUILD

exec(`acadia make --gen-elm=gen/elm`)

const assetsTempFile = fs.openSync(`${TMP}/Assets.elm`, 'w', 0o666)

write(
  `module Assets exposing (..)\n\ntype alias Elm = {name : String, hash : String}\n\ntype alias Static = {name : String, hash : String, ext : String}\n\n`,
  assetsTempFile)

const files = []

for (const entry of fs.readdirSync(`src/client/Pages`, { withFileTypes: true, encoding: 'utf-8' })) {
  const file = join(entry.parentPath, entry.name);
  const name = basename(file, '.elm');

  exec(`elm make ${file} --optimize --output=${TMP}/elm.js`)

  const hash = hashFile(`${TMP}/elm.js`)

  mv(`${TMP}/elm.js`, `${ASSETS}/${hash}.js`)

  const lower = `${name[0].toLowerCase()}${name.slice(1)}`

  write(
    `${lower}_elm : Elm\n${lower}_elm = {name = "${name}", hash = "${hash}"}\n\n`,
    assetsTempFile
  )

  files.push(`{type_ = "text/javascript", hash = "${hash}", ext = "js", path = "${ASSETS}/${hash}.js"}`)
}

let staticFiles = 0
for (const entry of fs.readdirSync(`static`, { withFileTypes: true, encoding: 'utf-8' })) {
  const file = join(entry.parentPath, entry.name);
  const { name, ext } = parse(file)
  const mimeType = types[ext] ?? types['.bin']
  const hash = hashFile(file)

  const lower = `${name[0].toLowerCase()}${name.slice(1)}`
  const ident = `${lower}${ext === '' ? '' : '_'}${ext.slice(1)}`

  write(
    `${ident} : Static\n${ident} = {name = "${name}", hash = "${hash}", ext = "${ext.slice(1)}"}\n\n`,
    assetsTempFile
  )


  fs.copyFileSync(file, `${ASSETS}/${hash}${ext}`)

  files.push(`{type_ = "${mimeType}", hash = "${hash}", ext = "${ext.slice(1)}", path = "${ASSETS}/${hash}${ext}"}`)
  staticFiles += 1
}


if (files.length > 0) {
  const fileList = files.join(`\n  , `)
  write(`type alias File = {type_ : String, hash : String, ext : String, path: String}\n\nfiles : List File\nfiles =\n  [ ${fileList}\n  ]\n\n`, assetsTempFile)
} else {
  write(`type alias File = {type_ : String, hash : String, ext : String, path: String}\n\n`, assetsTempFile)
}

if (staticFiles > 0) {
  write(`static : Static -> String\nstatic {hash, ext} =\n  hash ++ "." ++ ext`, assetsTempFile)
}


mv(`${TMP}/Assets.elm`, `gen/elm/Assets.elm`)

exec(`elm make src/server/Main.elm --optimize --output=${ASSETS}/elm.js`)

rmrf(TMP)
