const moment = require('moment')

const getChannelUploads = (youtube, channelId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const channel = await youtube.getChannel(channelId)
      const uploadsPlaylistId = channel.data.contentDetails.relatedPlaylists.uploads
      const playlist = await youtube.getPlaylistItems(uploadsPlaylistId, 0)
      console.log(playlist)
      resolve(playlist)
    } catch (error) {
      reject(error)
    }
  })
}

const getCommentsFromVideos = (youtube, videos) => {
  return new Promise(async (resolve, reject) => {
    try {
      let c = []
      for (let video of videos) {
        const comments = await youtube.getVideoComments(video, 0).catch(error => {
          const e = String(error)
          const commentThreadsNotFound = e.includes('commentThreads not found')
          const disabledComments = e.includes('disabled comments')
          if (!commentThreadsNotFound && !disabledComments) throw new Error(error)
        })
        if (comments) {
          const commentsWithTitle = comments.map(comment => {
            return { ...comment, videoTitle: video.title }
          })
          c = [...c, ...commentsWithTitle]
        }
      }
      resolve(c)
    } catch (error) {
      reject(error)
    }
  })
}

const filterOutOldComments = (comments, hours) => {
  return new Promise((resolve, reject) => {
    try {
      const filtered = comments.filter(comment => {
        let old = moment().diff(moment(comment.datePublished), 'hours') > hours
        return !old
      })
      resolve(filtered)
    } catch (error) {
      reject(error)
    }
  })
}

const get = (youtube, options) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!options) throw new Error('You must provide an options object')
      if (!options.channelId) throw new Error('You must provide channelId')
      if (!options.hours) throw new Error('You must provide hours')

      const videos = await getChannelUploads(youtube, options.channelId)
      // const comments = await getCommentsFromVideos(youtube, videos)
      // const justNew = await filterOutOldComments(comments, options.hours)
      //   resolve(justNew)
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

const prepare = comments => {
    return comments.map(comment => {
        return {
            activity: {
                description: comment.text.original,
                link: comment.url,
                link_text: 'See comment on YouTube',
                title: `Commented on ${comment.videoTitle}`,
                tags: ['channel:youtube'],
                activity_type: 'youtube:comment',
                key: `youtube-comment-${comment.id}`,
                occurred_at: new Date(comment.datePublished),
                member: {
                    name: comment.author.username
                }
            },
            identity: {
                source: 'YouTube',
                source_host: 'youtube.com',
                username: comment.author.username,
                url: comment.author.channelUrl,
                uid: comment.author.channelId
            }
        }
    })
}

module.exports = {
    get,
    prepare
}
