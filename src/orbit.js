const axios = require('axios')
const pkg = require('../package.json')

const addActivities = (activities, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const calls = activities.map(activity => {
                return axios({
                    url: `${options.BASE_URL}/${options.credentials.orbitWorkspaceId}/activities`,
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${options.credentials.orbitApiKey}`,
                        'User-Agent': `community-js-youtube-orbit/${pkg.version}`
                    },
                    data: activity
                })
            })

            Promise.allSettled(calls).then(results => {
                let stats = { added: 0, duplicates: 0 }

                for(let result of results) {
                    if(result.status != 'fulfilled') {
                        if(result.reason.response.status == 422 && result.reason.response.data.errors.key) {
                            stats.duplicates++
                        } else {
                            throw new Error(result.reason.response.data.errors)
                        }
                    } else {
                        stats.added++
                    }
                }

                let reply = `Added ${stats.added} activities to the ${options.credentials.orbitWorkspaceId} Orbit workspace.`
                if(stats.duplicates) reply += ` Your activity list had ${stats.duplicates} duplicates which were not imported`
                resolve(reply)
            })

        } catch(error) {
            reject(error)
        }
    })
}


module.exports = {
    addActivities,
}
