const axios = require('axios')
const pkg = require('../package.json')

const addActivities = (activities, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            let stats = {
                added: 0,
                duplicates: 0
            }
            for(let activity of activities) {
                await axios({
                    url: `${options.BASE_URL}/${options.credentials.orbitWorkspaceId}/activities`,
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${options.credentials.orbitApiKey}`,
                        'User-Agent': `community-js-youtube-orbit/${pkg.version}`
                    },
                    data: activity
                }).then(_ => {
                    stats.added++
                }).catch(error => {
                    if(error.response.status == 422 && error.response.data.errors.key) {
                        stats.duplicates++
                    } else {
                        throw new Error(error)
                    }
                })
            }
            let reply = `Added ${stats.added} activities to the ${options.credentials.orbitWorkspaceId} Orbit workspace.`
            if(stats.duplicates) reply += ` Your activity list had ${stats.duplicates} duplicates which were not imported`
            resolve(reply)
        } catch(error) {
            reject(error)
        }
    })
}


module.exports = {
    addActivities,
}
