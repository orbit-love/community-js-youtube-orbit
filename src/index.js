const pkg = require('../package.json')
const OrbitActivities = require('@orbit-love/activities')
const axios = require('axios')
const qs = require('querystring')
const moment = require('moment')

class OrbitYouTube {
  constructor(orbitWorkspaceId, orbitApiKey, ytApiKey, ytChannelId) {
    this.credentials = this.setCredentials(orbitWorkspaceId, orbitApiKey, ytApiKey, ytChannelId)
    this.orbit = new OrbitActivities(
      this.credentials.orbitWorkspaceId,
      this.credentials.orbitApiKey,
      `community-js-youtube-orbit/${pkg.version}`
    )
  }

  setCredentials(orbitWorkspaceId, orbitApiKey, ytApiKey) {
    if (!(orbitWorkspaceId || process.env.ORBIT_WORKSPACE_ID))
      throw 'You must provide an Orbit Workspace ID or set an ORBIT_WORKSPACE_ID environment variable'
    if (!(orbitApiKey || process.env.ORBIT_API_KEY))
      throw 'You must provide an Orbit API Key or set an ORBIT_API_KEY environment variable'
    if (!(ytApiKey || process.env.YOUTUBE_API_KEY))
      throw 'You must provide a YouTube API Key or set a YOUTUBE_API_KEY environment variable'
    return {
      orbitWorkspaceId: orbitWorkspaceId || process.env.ORBIT_WORKSPACE_ID,
      orbitApiKey: orbitApiKey || process.env.ORBIT_API_KEY,
      ytApiKey: ytApiKey || process.env.YOUTUBE_API_KEY
    }
  }

  async api(path, query = {}) {
    try {
      if (!path) throw 'You must provide a path'
      const BASE_URL = 'https://www.googleapis.com/youtube/v3'
      const options = { key: this.credentials.ytApiKey, ...query }
      const url = BASE_URL + path + '?' + qs.encode(options)
      const { data } = await axios.get(url)
      return data
    } catch (error) {
      if (error.response) {
        throw new Error(`${error.response.status}: ${JSON.stringify(error.response.data)}`)
      } else {
        throw new Error('api() error: ' + error)
      }
    }
  }

  async getChannelUploadPlaylistId(channelId) {
    try {
      if (!channelId) throw 'You must provide a channelId'
      const channelsList = await this.api('/channels', { part: 'contentDetails', id: channelId })
      if (!channelsList.items) throw new Error('404: no channel with that id')
      const uploadsPlaylist = channelsList.items[0].contentDetails.relatedPlaylists.uploads
      return uploadsPlaylist
    } catch (error) {
      throw new Error('getChannelUploadPlaylistId error: ' + error)
    }
  }

  async getVideoPage(playlistId, pageToken) {
    try {
      if (!playlistId) throw 'You must provide a playlistId'
      const query = { part: 'snippet,contentDetails', maxResults: 50, playlistId }
      if (pageToken) query.pageToken = pageToken
      const videos = await this.api('/playlistItems', query)
      return videos
    } catch (error) {
      throw new Error('getVideoPage error: ' + error)
    }
  }

  async getVideos(playlistId) {
    try {
      let videos = []
      let nextPageToken

      const initialPage = await this.getVideoPage(playlistId)
      videos = initialPage.items
      nextPageToken = initialPage.nextPageToken

      while (nextPageToken) {
        const page = await this.getVideoPage(playlistId, nextPageToken)
        videos = [...videos, ...page.items]
        nextPageToken = page.nextPageToken
      }

      return videos
    } catch (error) {
      throw new Error('getVideos error: ' + error)
    }
  }

  async getCommentPage(videoId, pageToken) {
    try {
      if (!videoId) throw 'You must provide a videoId'
      const query = { part: 'snippet,replies', maxResults: 50, videoId }
      if (pageToken) query.pageToken = pageToken

      const comments = await this.api('/commentThreads', query).catch(error => {
        const e = String(error)
        const commentThreadsNotFound = e.includes('not found')
        const disabledComments = e.includes('disabled')
        if (commentThreadsNotFound || disabledComments) {
          return { items: [], nextPageToken: false }
        } else {
          throw e
        }
      })
      const flattenedComments = comments.items.map(c => ({
        ...c,
        snippet: { ...c.snippet, ...c.snippet.topLevelComment.snippet }
      }))

      let replies = []
      for (let item of comments.items) {
        if (item.snippet.totalReplyCount) {
          replies = item.replies.comments
        }
      }

      return {
        items: [...flattenedComments, ...replies],
        nextPageToken: comments.nextPageToken
      }
    } catch (error) {
      throw new Error('getCommentPage error: ' + error)
    }
  }

  async getComments(videoId) {
    try {
      let comments = []
      let nextPageToken

      const initialPage = await this.getCommentPage(videoId)
      comments = initialPage.items
      nextPageToken = initialPage.nextPageToken

      while (nextPageToken) {
        const page = await this.getCommentPage(videoId, nextPageToken)
        comments = [...comments, ...page.items]
        nextPageToken = page.nextPageToken
      }

      return comments
    } catch (error) {
      throw new Error('getComments error: ' + error)
    }
  }

  async getChannelComments(channelId, options = {}) {
    try {
      if (!channelId) throw 'You must provide a channelId'
      const playlistId = await this.getChannelUploadPlaylistId(channelId)
      const videos = await this.getVideos(playlistId)
      if (options.log) console.log(`Found ${videos.length} videos`)
      let comments = []
      for (let video of videos) {
        let videoComments = await this.getComments(video.contentDetails.videoId)
        if (options.addTitle) {
          videoComments = videoComments.map(c => ({ ...c, snippet: { ...c.snippet, videoTitle: video.snippet.title } }))
        }
        comments = [...comments, ...videoComments]
        if (options.log) console.log(`Got comments for ${video.snippet.title}`)
      }
      return comments
    } catch (error) {
      throw new Error('getChannelComments error: ' + error)
    }
  }

  async filterComments(list, hours) {
    try {
      if (!list) throw 'You must provide a list of comments'
      if (!Array.isArray(list)) throw 'list must be an array'
      if (!hours) throw 'You must provide a number of hours to include comments from'
      const filtered = list.filter(item => moment().diff(moment(item.snippet.publishedAt), 'hours') <= hours)
      return filtered
    } catch (error) {
      throw new Error('filterComments error: ' + error)
    }
  }

  prepareComments(list = []) {
    return list.map(item => {
      const { snippet } = item
      return {
        activity: {
          description: snippet.textDisplay,
          link: `https://youtu.be/${snippet.videoId}`,
          link_text: 'See comment on YouTube',
          title: snippet.videoTitle ? `Commented on ${snippet.videoTitle}` : 'Commented on YouTube Video',
          tags: ['channel:youtube'],
          activity_type: 'youtube:comment',
          key: `youtube-comment-${snippet.publishedAt}`,
          occurred_at: snippet.publishedAt,
          member: {
            name: snippet.authorDisplayName
          }
        },
        identity: {
          source: 'YouTube',
          source_host: 'youtube.com',
          url: snippet.authorChannelUrl,
          uid: snippet.authorChannelId.value
        }
      }
    })
  }

  async addActivities(activities = []) {
    try {
      let stats = { added: 0, duplicates: 0, errors: [] }
      for (let activity of activities) {
        await this.orbit
          .createActivity(activity)
          .then(() => {
            stats.added++
          })
          .catch(error => {
            if (error.errors) {
              if (error.errors.key) stats.duplicates++
              else stats.errors.push(error)
            } else {
              throw error
            }
          })
      }
      return stats
    } catch (error) {
      throw new Error(error)
    }
  }
}

module.exports = OrbitYouTube
