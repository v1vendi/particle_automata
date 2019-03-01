const canvas = document.getElementById('c')
const ctx = canvas.getContext('2d')
let width = canvas.width = window.innerWidth
let height = canvas.height = window.innerHeight

const MAX_DIST = 100

let fw = Math.floor(window.outerWidth / MAX_DIST) + 1
let fh = Math.floor(window.outerHeight / MAX_DIST) + 1

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth
    height = canvas.height = window.innerHeight
    fw = Math.floor(width / MAX_DIST) + 1
    fh = Math.floor(height / MAX_DIST) + 1
})

const NODE_RADIUS = 5
const NODE_COUNT = 1000
const SPEED = 4
const PLAYBACK_SPEED = 3
const BORDER = 30


/** @type {Link[]} */
const links = []
const LINK_FORCE = -0.015

const COUPLING = [
    [1, 1, -1],
    [1, 1, 1],
    [1, 1, 1]
]

const LINKS = [1, 3, 2]

const LINKS_POSSIBLE = [
    [0, 1, 1],
    [1, 2, 1],
    [1, 1, 2]
]

const COLORS = [
    'rgb(250, 20, 20)',
    'rgb(200, 140, 100)',
    'rgb(80, 170, 140)'
]

class Link {
    /**
     * @param {Particle} a
     * @param {Particle} b
     */
    constructor(a, b) {
        this.a = a
        this.b = b
    }
}

class Particle {
    constructor(type, x, y) {
        this.type = type
        this.x = x
        this.y = y
        this.sx = 0
        this.sy = 0
        this.links = 0
        /** @type {Particle[]} */
        this.bonds = []
    }

    get fx() {
        return Math.floor(this.x / MAX_DIST)
    }
    get fy() {
        return Math.floor(this.y / MAX_DIST)
    }
}

class Field {
    /** @type {Particle[]} */
    particles = []
    constructor(i, j) {
        this.i = i
        this.j = j
    }
}

// array for dividing scene into parts to reduce complexity
/** @type {Field[][]} */
const fields = Array.from(
    { length: fw },
    (_, i) => Array.from({ length: fh }, (_, j) => new Field(i, j) )
)

// put particles randomly
for (let i = 0; i < NODE_COUNT; i++) {
    const type = Math.floor(Math.random() * COUPLING.length)
    const x = Math.random() * width
    const y = Math.random() * height

    const p = new Particle(type, x, y)

    const field = fields[p.fx][p.fy]
    field.particles.push(p)
}

const BG = 'rgb(20, 55, 75)'
const LINK = 'rgb(255, 230, 0)';

(function run() {
    drawScene()
    for (let i = 0; i < PLAYBACK_SPEED; i++) logic()
    requestAnimationFrame(run)
})()

function drawScene() {
    ctx.fillStyle = BG
    ctx.fillRect(0,0,width,height)

    fields.forEach(fs => fs.forEach(field => field.particles.forEach(a => {
        ctx.fillStyle = COLORS[a.type]

        ctx.beginPath()
        ctx.arc(
            a.x,
            a.y,
            NODE_RADIUS,
            0,
            2 * Math.PI
        )
        ctx.fill()
        ctx.fillStyle = LINK
        for (let b of a.bonds) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
        }
    })))
}

function logic() {
    fields.forEach(fs => fs.forEach(field => field.particles.forEach(a => {
        a.x += a.sx
        a.y += a.sy
        a.sx *= 0.98
        a.sy *= 0.98
        // velocity normalization
        // idk if it is still necessary
        const magnitude = Math.sqrt(a.sx * a.sx + a.sy * a.sy)
        if (magnitude > 1) {
            a.sx /= magnitude
            a.sy /= magnitude
        }
        // border repulsion
        if (a.x < BORDER) {
            a.sx += SPEED * 0.05
            if (a.x < 0) {
                a.x = -a.x
                a.sx *= -0.5
            }
        }
        else if(a.x > width - BORDER) {
            a.sx -= SPEED * 0.05
            if(a.x > width) {
                a.x = width * 2 - a.x
                a.sx *= -0.5
            }
        }
        if(a.y < BORDER) {
            a.sy += SPEED * 0.05
            if(a.y < 0) {
                a.y = -a.y
                a.sy *= -0.5
            }
        }
        else if(a.y > height - BORDER) {
            a.sy -= SPEED * 0.05
            if(a.y > height) {
                a.y = height * 2 - a.y
                a.sy *= -0.5
            }
        }
    })))

    for (let i = 0; i < links.length; i++) {
        const link = links[i]
        const { a, b } = link
        const d2 = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)
        if (d2 > MAX_DIST ** 2 / 4) {
            a.links--
            b.links--
            removeFromArray(a.bonds, b)
            removeFromArray(b.bonds, a)
            removeFromArray(links, link)
            i--
        } else if (d2 > NODE_RADIUS * NODE_RADIUS * 4) {
            const angle = Math.atan2(a.y - b.y, a.x - b.x)
            a.sx += Math.cos(angle) * LINK_FORCE * SPEED
            a.sy += Math.sin(angle) * LINK_FORCE * SPEED
            b.sx -= Math.cos(angle) * LINK_FORCE * SPEED
            b.sy -= Math.sin(angle) * LINK_FORCE * SPEED
        }
    }

    // moving particle to another field
    fields.forEach(fs => fs.forEach(field => field.particles.forEach(a => {
        if(a.fx == field.i && a.fy == field.j) return

        removeFromArray(field.particles, a)
        fields[a.fx][a.fy].particles.push(a)
    })))

    fields.forEach(fs => fs.forEach(field => field.particles.forEach((a, i1) => {
        for (let j1 = i1 + 1; j1 < field.particles.length; j1++) {
            const b = field.particles[j1]
            applyForce(a, b)
        }
        let field1

        if (field.i < fw - 1) {
            field1 = fields[field.i + 1][field.j]
            for (let j1 = 0; j1 < field1.particles.length; j1++) {
                const b = field1.particles[j1]
                applyForce(a, b)
            }
        }
        if (field.j < fh - 1) {
            field1 = fields[field.i][field.j + 1]
            for (let j1 = 0; j1 < field1.particles.length; j1++) {
                const b = field1.particles[j1]
                applyForce(a, b)
            }
        }
        if (field.i < fw - 1 && field.j < fh - 1) {
        field1 = fields[field.i + 1][field.j + 1]
            for (let j1 = 0; j1 < field1.particles.length; j1++) {
                const b = field1.particles[j1]
                applyForce(a, b)
            }
        }
    })))
}

function applyForce(a, b) {
    if (a===b) return
    let d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2
    if (d2 > MAX_DIST ** 2) return

    let dA = COUPLING[a.type][b.type] / d2
    let dB = COUPLING[b.type][a.type] / d2
    if (a.links < LINKS[a.type] && b.links < LINKS[b.type]) {
        if(d2 < MAX_DIST ** 2 / 4) {
            if (!a.bonds.includes(b) && !b.bonds.includes(a)) {
                let typeCountA = 0
                for (let p of a.bonds) {
                    if (p.type == b.type) typeCountA++
                }
                let typeCountB = 0
                for (let p of b.bonds) {
                    if (p.type == a.type) typeCountB++
                }
                // TODO: particles should connect to closest neighbors not to just first in a list
                if (typeCountA < LINKS_POSSIBLE[a.type][b.type] && typeCountB < LINKS_POSSIBLE[b.type][a.type]) {
                    a.bonds.push(b)
                    b.bonds.push(a)
                    a.links++
                    b.links++
                    links.push(new Link(a, b))
                }
            }
        }
    } else {
        if (!a.bonds.includes(b) && !b.bonds.includes(a)) {
            dA = 1 / d2
            dB = 1 / d2
        }
    }

    const angle = Math.atan2(a.y - b.y, a.x - b.x)
    if (d2 < 1) d2 = 1
    if (d2 < NODE_RADIUS * NODE_RADIUS * 4) {
        dA = 1 / d2
        dB = 1 / d2
    }
    a.sx += Math.cos(angle) * dA * SPEED;
    a.sy += Math.sin(angle) * dA * SPEED;
    b.sx -= Math.cos(angle) * dB * SPEED;
    b.sy -= Math.sin(angle) * dB * SPEED;
}

/* helper */
function removeFromArray(array, item) {
    array.splice(array.indexOf(item), 1)
}