#!/usr/bin/env node

const OrbitYouTube = require('./index.js')
const args = require('yargs').argv

async function main() {
    if(!args.comments || !process.env.ORBIT_WORKSPACE_ID || !process.env.ORBIT_API_KEY || !process.env.YOUTUBE_API_KEY) {
        return console.error(`
        You must run this command as follows:
        npx @orbit-love/youtube --comments --channel=id --hours=24

        If --hours is not provided it will default to 24.

        You must also have ORBIT_WORKSPACE_ID, ORBIT_API_KEY, & YOUTUBE_API_KEY environment variables set. You may optionally use YOUTUBE_CHANNEL_ID and omit the --channel option on the CLI.
        `)
    }

    const orbitYouTube = new OrbitYouTube()

    let hours
    if(!args.hours) hours = 24
    else if(Number.isNaN(+args.hours)) return console.error(`${args.hours} is not a number`)
    else hours = args.hours

    let channelId = args.channel ? args.channel : process.env.YOUTUBE_CHANNEL_ID
    if(!channelId) return console.error('You must use a --channel=channelId option or have a YOUTUBE_CHANNEL_ID environment variable.')

    const videos = await orbitYouTube.getComments({ channelId, hours })
    console.log(`Fetched ${videos.length} comments from the provided timeframe`)
    const comments = await orbitYouTube.prepareComments(videos)
    console.log(`Comments are prepared as Orbit activities. Sending them off now...`)
    const response = await orbitYouTube.addActivities(comments)
    console.log(response) // "Added n activities to the workspace-id Orbit workspace"
}

main()
