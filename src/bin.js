// #!/usr/bin/env node

const OrbitYouTube = require('./index.js')
const { argv } = require('yargs')
const { ORBIT_WORKSPACE_ID, ORBIT_API_KEY, YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } = process.env

if (argv.comments) comments()
if (!argv.comments) man()

async function comments() {
  try {
    if (checkValues()) {
      const orbitYouTube = new OrbitYouTube()
      const result = await orbitYouTube.addNewComments({
        channelId: YOUTUBE_CHANNEL_ID || argv.channel,
        hours: argv.hours || 24
      })
      console.log(JSON.stringify(result))
    }
  } catch (error) {
    console.error(error)
  }
}

function man() {
  console.log(`
    Orbit YouTube Community Integration Guide

    You must run this command as follows:
    npx @orbit-love/youtube --command [options]

    The following commands are supported:
    --comments [--hours=12 --channel=id]

    If --hours is not provided it will default to 24.
    If --channel is not provided it will default to process.env.YOUTUBE_CHANNEL_ID.
  `)
}

function checkValues() {
  if (!ORBIT_WORKSPACE_ID || !ORBIT_API_KEY) {
    console.log('You must have ORBIT_WORKSPACE_ID and ORBIT_API_KEY environment variables.')
    return false
  }

  if (!YOUTUBE_API_KEY) {
    console.log('You must have a YOUTUBE_API_KEY environment variable.')
    return false
  }

  if (!YOUTUBE_CHANNEL_ID && !argv.channel) {
    console.log(
      'You must have either a YOUTUBE_CHANNEL_ID environment variable or provide a --channel option when using this CLI.'
    )
    return false
  }

  if (argv.hours && Number.isNaN(+argv.hours)) {
    console.log('--hours must be a number')
    return false
  }

  return true
}
