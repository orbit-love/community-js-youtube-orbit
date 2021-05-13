#!/usr/bin/env node

const OrbitYouTube = require('./index.js')
const args = require('yargs').argv

async function main() {

    if(!args.comments || !args.channel || !process.env.ORBIT_WORKSPACE_ID || !process.env.ORBIT_API_KEY || !process.env.YOUTUBE_API_KEY) {
        return console.error(`
        You must run this command as follows:
        npx @orbit-love/youtube --comments --channel=id --hours=24

        If --hours is not provided it will default to 24.

        You must also have ORBIT_WORKSPACE_ID, ORBIT_API_KEY, & YOUTUBE_API_KEY environment variables set.
        `)
    }

    const orbitYouTube = new OrbitYouTube()

    let hours
    if(!args.hours) hours = 24
    else if(Number.isNaN(+args.hours)) return console.error(`${args.hours} is not a number`)
    else hours = args.hours

    const videos = await orbitYouTube.getComments({ channelId: args.channel, hours })
    console.log(`Fetched ${videos.length} comments from the provided timeframe`)
    const comments = await orbitYouTube.prepareComments(videos)
    console.log(`Comments are prepared as Orbit activities`)
    const response = await orbitYouTube.addActivities(comments)
    console.log(response) // "Added n activities to the workspace-id Orbit workspace"
}

main()
