const YouTube = require('popyt').YouTube
const comments = require('./comments')
const orbit = require('./orbit')

const BASE_URL='https://app.orbit.love/api/v1'

class OrbitYouTube {
    constructor(orbitWorkspaceId, orbitApiKey, ytApiKey, ytChannelId) {
        this.credentials = this.setCredentials(orbitWorkspaceId, orbitApiKey, ytApiKey, ytChannelId)
        this.youtube = new YouTube(this.credentials.ytApiKey)
    }

    setCredentials(orbitWorkspaceId, orbitApiKey, ytApiKey, ytChannelId) {
        if(!(orbitWorkspaceId || process.env.ORBIT_WORKSPACE_ID)) throw new Error('You must provide an Orbit Workspace ID or set an ORBIT_WORKSPACE_ID environment variable')
        if(!(orbitApiKey || process.env.ORBIT_API_KEY)) throw new Error('You must provide an Orbit API Key or set an ORBIT_API_KEY environment variable')
        if(!(ytApiKey || process.env.YOUTUBE_API_KEY)) throw new Error('You must provide a YouTube API Key or set a YOUTUBE_API_KEY environment variable')
        if(!(ytChannelId || process.env.YOUTUBE_CHANNEL_ID)) throw new Error('You must provide a YouTube Channel ID or set a YOUTUBE_CHANNEL_ID environment variable')
        return {
            orbitWorkspaceId: orbitWorkspaceId || process.env.ORBIT_WORKSPACE_ID,
            orbitApiKey: orbitApiKey || process.env.ORBIT_API_KEY,
            ytApiKey: ytApiKey || process.env.YOUTUBE_API_KEY,
            ytChannelId: ytChannelId || process.env.YOUTUBE_CHANNEL_ID
        }
    }

    getComments(options) {
        return new Promise(async (resolve, reject) => {
            try {
                const { channelId, hours } = options
                resolve(await comments.get(this.youtube, { channelId, hours }))
            } catch(error) {
                reject(error)
            }
        })

    }

    prepareComments(list) {
        return new Promise(async (resolve, reject) => {
            try {
                resolve(comments.prepare(list))
            } catch(error) {
                reject(error)
            }
        })
    }

    addActivities(activities) {
        return new Promise(async (resolve, reject) => {
            try {
                const data = await orbit.addActivities(activities, { credentials: this.credentials, BASE_URL })
                resolve(data)
            } catch(error) {
                reject(error)
            }
        })
    }
}

module.exports = OrbitYouTube
