const pkg = require('../package.json')
const YouTube = require('popyt').YouTube
const comments = require('./comments')
const OrbitActivities = require('@orbit-love/activities')

class OrbitYouTube {
    constructor(orbitWorkspaceId, orbitApiKey, ytApiKey, ytChannelId) {
        this.credentials = this.setCredentials(orbitWorkspaceId, orbitApiKey, ytApiKey, ytChannelId)
        this.youtube = new YouTube(this.credentials.ytApiKey, undefined, { cache: false })
        this.orbit = new OrbitActivities(this.credentials.orbitWorkspaceId, this.credentials.orbitApiKey, `community-js-youtube-orbit/${pkg.version}`)
    }

    setCredentials(orbitWorkspaceId, orbitApiKey, ytApiKey) {
        if(!(orbitWorkspaceId || process.env.ORBIT_WORKSPACE_ID)) throw new Error('You must provide an Orbit Workspace ID or set an ORBIT_WORKSPACE_ID environment variable')
        if(!(orbitApiKey || process.env.ORBIT_API_KEY)) throw new Error('You must provide an Orbit API Key or set an ORBIT_API_KEY environment variable')
        if(!(ytApiKey || process.env.YOUTUBE_API_KEY)) throw new Error('You must provide a YouTube API Key or set a YOUTUBE_API_KEY environment variable')
        return {
            orbitWorkspaceId: orbitWorkspaceId || process.env.ORBIT_WORKSPACE_ID,
            orbitApiKey: orbitApiKey || process.env.ORBIT_API_KEY,
            ytApiKey: ytApiKey || process.env.YOUTUBE_API_KEY,
        }
    }

    async getComments(options) {
        return new Promise(async (resolve, reject) => {
            try {
                const { channelId, hours } = options
                const newComments = await comments.get(this.youtube, { channelId, hours })
                resolve(newComments)
            } catch(error) {
                reject(error)
            }
        })

    }

    prepareComments(list) {
        return new Promise(async (resolve, reject) => {
            try {
                const prepared = comments.prepare(list)
                resolve(prepared)
            } catch(error) {
                reject(error)
            }
        })
    }

    addActivities(activities) {
        return new Promise(async (resolve, reject) => {
            try {
                let stats = { added: 0, duplicates: 0, errors: [] }
                for(let activity of activities) {
                    await this.orbit.createActivity(activity)
                        .then(() => { stats.added++ })
                        .catch(err => {
                            console.log('e', err)
                            if(err.errors.key) stats.duplicates++
                            else { errors.push(err) }
                        })
                }
                resolve(stats)
            } catch(error) {
                reject(error)
            }
        })
    }
}

module.exports = OrbitYouTube
