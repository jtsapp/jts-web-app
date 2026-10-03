// Склейка бегуна Word Rush: сетка, скелет и бег — из одной выгрузки Meshy,
// клипы прыжка, подката и спотыкания — из выгрузок того же рига (3d_rigging
// одной модели с разными animation_action_id).
//
//   node scripts/merge-runner-clips.js --base run.glb[:N] \
//     --clip jump=jump.glb[:N] --clip slide=slide.glb[:N] --clip stumble=stumble.glb[:N] \
//     --out merged.glb
//
// `:N` — номер анимации в файле (по умолчанию 0): в выгрузке Meshy их бывает
// несколько, нужная видна в `npx -y @gltf-transform/cli inspect`.
//
// `--alias Spine1=Head1` — кость источника, названная иначе, чем в базе
// (см. addAnimation в lib/glb.js). Можно повторять или перечислять через
// запятую.
const fs = require('fs')
const { readGlb, writeGlb, keepAnimation, addAnimation } = require('./lib/glb.js')

// Номер — только цифры после последнего двоеточия: «C:\…» им не считается.
function parseRef(ref) {
  const m = /^(.*?)(?::(\d+))?$/.exec(ref)
  return { file: m[1], index: m[2] ? Number(m[2]) : 0 }
}

function parseAliases(list) {
  const out = {}
  for (const pair of list.flatMap((s) => s.split(','))) {
    const [from, to] = pair.split('=')
    if (from && to) out[from.trim()] = to.trim()
  }
  return out
}

function main(argv) {
  let base = null
  let out = null
  const clips = []
  const aliasArgs = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') base = parseRef(argv[++i])
    else if (argv[i] === '--out') out = argv[++i]
    else if (argv[i] === '--alias') aliasArgs.push(argv[++i])
    else if (argv[i] === '--clip') {
      const [name, ref] = argv[++i].split(/=(.*)/s)
      clips.push({ name, ...parseRef(ref) })
    }
  }
  if (!base || !out || !clips.length) {
    console.error('usage: merge-runner-clips.js --base run.glb[:N] --clip jump=jump.glb[:N] … --out merged.glb')
    process.exit(1)
  }
  const aliases = parseAliases(aliasArgs)
  const glb = keepAnimation(readGlb(fs.readFileSync(base.file)), base.index, 'run')
  for (const c of clips) addAnimation(glb, readGlb(fs.readFileSync(c.file)), c.index, c.name, aliases)
  fs.writeFileSync(out, writeGlb(glb))
  console.log(`${out}: ${glb.json.animations.map((a) => a.name).join(', ')}`)
}

if (require.main === module) main(process.argv.slice(2))

module.exports = { parseRef, parseAliases }
