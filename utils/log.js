const boxen = require('boxen')
const box = (key, value, stringify) => {
    if (stringify) value = JSON.stringify(value, null, 2)
    console.log(
        boxen(`${value}`, {
            padding: 1,
            title: `${key}`,
            float: 'center',
            titleAlignment: 'center',
            textAlignment: 'left',
            borderStyle: 'round',
        })
    )
}

const info = (key, value, stringify) => {
    if (stringify) value = JSON.stringify(value, null, 2)
    console.info(`${key}:\n${value}\n`)
}

module.exports = { box, info }
