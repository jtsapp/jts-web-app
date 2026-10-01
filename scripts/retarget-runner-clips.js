// Бегун Word Rush: детальная сетка и риг первой модели + клипы прыжка,
// подката и спотыкания, снятые Meshy на другом риге той же фигуры.
//
//   git show fb0c6790:public/arcade/runner/runner.glb > base.glb
//   git show 44f7c39e:public/arcade/runner/runner-v2.glb > clips.glb
//   node scripts/retarget-runner-clips.js --base base.glb --source clips.glb \
//     --clip jump=1 --clip slide=2 --clip stumble=3 \
//     --map Spine02=neck,Spine01=Spine02,neck=Head1 --out public/arcade/runner/runner-v3.glb
//
// Почему не merge-runner-clips.js: тот склеивает выгрузки ОДНОГО рига по
// именам костей, а здесь риги разные (см. lib/retarget.js). `--map` —
// «кость базы=кость источника» там, где имена не совпадают по смыслу: у
// второго рига позвоночник назван со сдвигом (`neck` растёт из бёдер,
// шея — `Head1`). Бег базы остаётся её собственным клипом.
const fs = require('fs')
const { readGlb, writeGlb, keepAnimation } = require('./lib/glb.js')
const { retargetAnimation } = require('./lib/retarget.js')
const { parseAliases } = require('./merge-runner-clips.js')

function main(argv) {
  let base = null
  let source = null
  let out = null
  const clips = []
  const maps = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') base = argv[++i]
    else if (argv[i] === '--source') source = argv[++i]
    else if (argv[i] === '--out') out = argv[++i]
    else if (argv[i] === '--map') maps.push(argv[++i])
    else if (argv[i] === '--clip') {
      const [name, index] = argv[++i].split('=')
      clips.push({ name, index: Number(index) })
    }
  }
  if (!base || !source || !out || !clips.length) {
    console.error('usage: retarget-runner-clips.js --base base.glb --source clips.glb --clip jump=1 … [--map A=B,…] --out out.glb')
    process.exit(1)
  }
  const map = parseAliases(maps)
  const glb = keepAnimation(readGlb(fs.readFileSync(base)), 0, 'run')
  const src = readGlb(fs.readFileSync(source))
  for (const c of clips) retargetAnimation(glb, src, c.index, c.name, { map })
  fs.writeFileSync(out, writeGlb(glb))
  console.log(`${out}: ${glb.json.animations.map((a) => a.name).join(', ')}`)
}

if (require.main === module) main(process.argv.slice(2))
