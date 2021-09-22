const axios = require('axios')
const qs = require('querystring')
const moment = require('moment')
const OrbitYouTube = require('../src/index')
jest.mock('axios')

describe('OrbitYouTube constructor', () => {
  it('given all credentials, does not throw', () => {
    const sut = new OrbitYouTube('1', '2', '3')
    expect(sut).not.toBeNull()
  })

  it('given missing values, throws', () => {
    delete process.env.ORBIT_WORKSPACE_ID
    delete process.env.ORBIT_API_KEY
    delete process.env.YOUTUBE_API_KEY

    expect(() => {
      new OrbitYouTube(null, null, null)
    }).toThrow()
  })

  it('given some missing values, throws', () => {
    delete process.env.ORBIT_WORKSPACE_ID
    delete process.env.ORBIT_API_KEY
    delete process.env.YOUTUBE_API_KEY

    expect(() => {
      new OrbitYouTube(null, '2', '3')
    }).toThrow(/ORBIT_WORKSPACE_ID/)
    expect(() => {
      new OrbitYouTube('1', null, '3')
    }).toThrow(/ORBIT_API_KEY/)
    expect(() => {
      new OrbitYouTube('1', '2', null)
    }).toThrow(/YOUTUBE_API_KEY/)
  })

  it('reads from env vars when values not directly provided', () => {
    process.env.ORBIT_WORKSPACE_ID = '1'
    process.env.ORBIT_API_KEY = '2'
    process.env.YOUTUBE_API_KEY = '3'

    const sut = new OrbitYouTube(null, null, null)

    expect(sut.credentials.orbitWorkspaceId).toBe('1')
    expect(sut.credentials.ytApiKey).toBe('3')
  })

  it('sets @orbit-love/activities creds correctly', () => {
    const sut = new OrbitYouTube('1', '2', '3')
    expect(sut.orbit.credentials.orbitWorkspaceId).toBe('1')
    expect(sut.orbit.credentials.orbitApiKey).toBe('2')
  })
})

describe('OrbitYouTube api', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3')
  })

  it('if path is missing, throws', async () => {
    await expect(sut.api()).rejects.toThrow(/path/)
  })

  it('encodes api key in url correctly', async () => {
    axios.get.mockResolvedValueOnce({ data: {} })
    await sut.api('/path')
    expect(axios.get).toHaveBeenCalledWith('https://www.googleapis.com/youtube/v3/path?key=3')
  })

  it('given a query, encodes url correctly', async () => {
    axios.get.mockResolvedValueOnce({ data: {} })
    await sut.api('/path', { key1: 'val1' })
    expect(axios.get).toHaveBeenCalledWith('https://www.googleapis.com/youtube/v3/path?key=3&key1=val1')
  })

  it('given a generic error, throws', async () => {
    const error = 'Network error'
    axios.get.mockImplementationOnce(() => Promise.reject(error))
    await expect(sut.api('/')).rejects.toThrow(error)
  })

  it('given a specific axios error, throws', async () => {
    const error = { response: { data: { error: 'test' }, status: 403 } }
    axios.get.mockImplementationOnce(() => Promise.reject(error))
    await expect(sut.api('/')).rejects.toThrow(/test/)
  })
})

describe('OrbitYouTube getChannelUploadPlaylistId', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3')
  })

  it('given no channelId, throws', async () => {
    await expect(sut.getChannelUploadPlaylistId()).rejects.toThrow(/channelId/)
  })

  it('given incorrect channel id, throws', async () => {
    axios.get.mockResolvedValueOnce({ data: {} })
    await expect(sut.getChannelUploadPlaylistId('incorrect')).rejects.toThrow(/404/)
  })

  it('returns correct value', async () => {
    axios.get.mockResolvedValueOnce(returnValueGenerator({ type: 'channels' }))
    const playlistId = await sut.getChannelUploadPlaylistId('123')
    expect(playlistId).toBe('value')
  })
})

describe('OrbitYouTube getVideoPage', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3')
  })

  it('given no playlistId, throws', async () => {
    await expect(sut.getVideoPage()).rejects.toThrow(/playlistId/)
  })

  it('given no page token, omit from query', async () => {
    axios.get.mockResolvedValueOnce({ data: {} })
    const expectedParams = qs.encode({ key: 3, part: 'snippet,contentDetails', maxResults: 50, playlistId: 'id' })
    const expectedUrl = `https://www.googleapis.com/youtube/v3/playlistItems?${expectedParams}`

    await sut.getVideoPage('id')

    expect(axios.get).toHaveBeenCalledWith(expectedUrl)
  })

  it('given page token, include in query', async () => {
    axios.get.mockResolvedValueOnce({ data: {} })
    const expectedParams = qs.encode({
      key: 3,
      part: 'snippet,contentDetails',
      maxResults: 50,
      playlistId: 'id',
      pageToken: 'token'
    })
    const expectedUrl = `https://www.googleapis.com/youtube/v3/playlistItems?${expectedParams}`

    await sut.getVideoPage('id', 'token')

    expect(axios.get).toHaveBeenCalledWith(expectedUrl)
  })

  it('returns correct value', async () => {
    const toReturn = { data: { value: '1' } }
    axios.get.mockResolvedValueOnce(toReturn)
    const page = await sut.getVideoPage('id')
    expect(page.value).toBe('1')
  })

  it('given an error, throws', async () => {
    const error = 'Network error'
    axios.get.mockImplementationOnce(() => Promise.reject(error))
    await expect(sut.getVideoPage('id')).rejects.toThrow(error)
  })
})

describe('OrbitYouTube getVideos', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3')
  })

  it('given fewer than 50 items, returns array of items', async () => {
    axios.get.mockResolvedValueOnce(returnValueGenerator({ type: 'videos', items: 2 }))
    const videos = await sut.getVideos('id')
    expect(videos.length).toBe(2)
  })

  it('given greater than 50 items, returns array of items', async () => {
    axios.get
      .mockResolvedValueOnce(returnValueGenerator({ type: 'videos', items: 50, nextPage: true }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'videos', items: 20 }))
    const videos = await sut.getVideos('id')
    expect(videos.length).toBe(70)
  })

  it('given an error, throws', async () => {
    const error = 'Network error'
    axios.get.mockImplementationOnce(() => Promise.reject(error))
    await expect(sut.getVideos('id')).rejects.toThrow(error)
  })
})

describe('OrbitYouTube getCommentPage', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3')
  })

  it('given no videoId, throws', async () => {
    await expect(sut.getCommentPage()).rejects.toThrow(/videoId/)
  })

  it('given no page token, omit from query', async () => {
    axios.get.mockResolvedValueOnce({ data: { items: [] } })
    const expectedParams = qs.encode({ key: 3, part: 'snippet,replies', maxResults: 50, videoId: 'id' })
    const expectedUrl = `https://www.googleapis.com/youtube/v3/commentThreads?${expectedParams}`

    await sut.getCommentPage('id')

    expect(axios.get).toHaveBeenCalledWith(expectedUrl)
  })

  it('given page token, include in query', async () => {
    axios.get.mockResolvedValueOnce({ data: { items: [] } })
    const expectedParams = qs.encode({
      key: 3,
      part: 'snippet,replies',
      maxResults: 50,
      videoId: 'id',
      pageToken: 'token'
    })
    const expectedUrl = `https://www.googleapis.com/youtube/v3/commentThreads?${expectedParams}`

    await sut.getCommentPage('id', 'token')

    expect(axios.get).toHaveBeenCalledWith(expectedUrl)
  })

  it('given no comments, returns empty array', async () => {
    axios.get.mockResolvedValueOnce({ data: { items: [] } })
    const comments = await sut.getCommentPage('id')
    expect(Array.isArray(comments.items)).toBe(true)
    expect(comments.items.length).toBe(0)
  })

  it('given comments with no replies, returns comments', async () => {
    axios.get.mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 3 }))
    const comments = await sut.getCommentPage('id')
    expect(comments.items.length).toBe(3)
  })

  it('given comment replies, returns single array', async () => {
    axios.get.mockResolvedValueOnce(
      returnValueGenerator({ type: 'comments', items: 5, itemsWithChildren: 2, childComments: 2 })
    )
    const comments = await sut.getCommentPage('id')
    expect(comments.items.length).toBe(7)
  })

  it('given nextPageToken, returns value', async () => {
    axios.get.mockResolvedValueOnce(returnValueGenerator({ type: 'comments', nextPage: true }))
    const comments = await sut.getCommentPage('id')
    expect(comments.nextPageToken).toBe('next-page-token')
  })

  it('given comments turned off, returns empty array', async () => {
    const error = { response: { data: { error: 'disabled' } } }
    axios.get.mockImplementationOnce(() => Promise.reject(error))
    const response = await sut.getCommentPage('id')
    await expect(response.items).not.toBeNull()
  })

  it('given an error, throws', async () => {
    const error = 'Network error'
    axios.get.mockImplementationOnce(() => Promise.reject(error))
    await expect(sut.getCommentPage('id')).rejects.toThrow(error)
  })
})

describe('OrbitYouTube getComments', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3')
  })

  it('given fewer than 50 items, returns array of items', async () => {
    axios.get.mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 30 }))
    const comments = await sut.getComments('id')
    expect(comments.length).toBe(30)
  })

  it('given greater than 50 items, returns array of items', async () => {
    axios.get
      .mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 50, nextPage: true }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 20 }))
    const comments = await sut.getComments('id')
    expect(comments.length).toBe(70)
  })

  it('given an error, throws', async () => {
    const error = 'Network error'
    axios.get.mockImplementationOnce(() => Promise.reject(error))
    await expect(sut.getComments('id')).rejects.toThrow(error)
  })
})

describe('OrbitYouTube getChannelComments', () => {
  let sut
  let consoleSpy
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3')
    consoleSpy = jest.spyOn(console, 'log')
  })
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('given no channelId, throws', async () => {
    await expect(sut.getChannelComments()).rejects.toThrow(/channelId/)
  })

  it('calls methods correctly', async () => {
    axios.get
      .mockResolvedValueOnce(returnValueGenerator({ type: 'channels' }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'videos', items: 2 }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 0 }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 0 }))
    jest.spyOn(sut, 'getChannelUploadPlaylistId')
    jest.spyOn(sut, 'getVideos')
    jest.spyOn(sut, 'getComments')

    await sut.getChannelComments('channel')

    expect(sut.getChannelUploadPlaylistId).toHaveBeenCalledTimes(1)
    expect(sut.getVideos).toHaveBeenCalledTimes(1)
    expect(sut.getComments).toHaveBeenCalledTimes(2)
  })

  it('given options.log is true, log', async () => {
    axios.get
      .mockResolvedValueOnce(returnValueGenerator({ type: 'channels' }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'videos', items: 2 }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 0 }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 0 }))
    await sut.getChannelComments('channel', { log: true })
    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  it('given options.log is false or absent, do not log', async () => {
    axios.get
      .mockResolvedValueOnce(returnValueGenerator({ type: 'channels' }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'videos', items: 1 }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 0 }))
    await sut.getChannelComments('channel')
    expect(consoleSpy).toHaveBeenCalledTimes(0)
  })

  it('given options.addTitle is true, addVideoTitle property', async () => {
    axios.get
      .mockResolvedValueOnce(returnValueGenerator({ type: 'channels' }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'videos', items: 1 }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 1 }))
    const comments = await sut.getChannelComments('channel', { addTitle: true })
    expect(comments[0].snippet.addTitle).not.toBeNull()
  })

  it('returns a single array', async () => {
    axios.get
      .mockResolvedValueOnce(returnValueGenerator({ type: 'channels' }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'videos', items: 2 }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 0 }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 0 }))
    const comments = await sut.getChannelComments('channel')
    expect(Array.isArray(comments)).toBe(true)
  })

  it('given no comments, returns empty array', async () => {
    axios.get
      .mockResolvedValueOnce(returnValueGenerator({ type: 'channels' }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'videos', items: 1 }))
      .mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 0 }))
    const comments = await sut.getChannelComments('channel')
    expect(comments.length).toBe(0)
  })

  it('given an error, throws', async () => {
    const error = 'Network error'
    axios.get.mockImplementationOnce(() => Promise.reject(error))
    await expect(sut.getChannelComments('id')).rejects.toThrow(error)
  })
})

describe('OrbitYouTube filterComments', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3')
  })

  it('given missing params, throws', async () => {
    await expect(sut.filterComments()).rejects.toThrow(/list/)
    await expect(sut.filterComments([])).rejects.toThrow(/hours/)
  })

  it('given list is not an array, throws', async () => {
    await expect(sut.filterComments(1)).rejects.toThrow(/array/)
    await expect(sut.filterComments('string')).rejects.toThrow(/array/)
    await expect(sut.filterComments(true)).rejects.toThrow(/array/)
    await expect(sut.filterComments({})).rejects.toThrow(/array/)
  })

  it('given list of all new comments, return all', async () => {
    axios.get.mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 3, commentAge: [1, 1, 1] }))
    const comments = await sut.getComments('1')
    const filtered = await sut.filterComments(comments, 2)
    expect(filtered.length).toBe(3)
  })

  it('given a list of partially new comments, return only new ones', async () => {
    axios.get.mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 3, commentAge: [1, 3, 1] }))
    const comments = await sut.getComments('1')
    const filtered = await sut.filterComments(comments, 2)
    expect(filtered.length).toBe(2)
  })

  it('given a list of all old comments, return empty array', async () => {
    axios.get.mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 3, commentAge: [2, 2, 2] }))
    const comments = await sut.getComments('1')
    const filtered = await sut.filterComments(comments, 1)
    expect(Array.isArray(filtered)).toBe(true)
    expect(filtered.length).toBe(0)
  })
})

describe('OrbitYouTube prepareComments', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3')
  })

  it('if no list is provided or is empty, returns empty array', async () => {
    const noParameter = await sut.prepareComments()
    const emptyArray = await sut.prepareComments([])

    expect(Array.isArray(noParameter)).toBe(true)
    expect(Array.isArray(emptyArray)).toBe(true)
    expect(noParameter.length).toBe(0)
    expect(emptyArray.length).toBe(0)
  })

  it('given array, returns same size array', async () => {
    axios.get.mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 3 }))
    const comments = await sut.getComments('1')
    const prepared = await sut.prepareComments(comments)
    expect(prepared.length).toBe(3)
  })

  it('given hours parameter, returns filtered list', async () => {
    axios.get.mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 3, commentAge: [1, 3, 3] }))
    const comments = await sut.getComments('1')
    const prepared = await sut.prepareComments(comments, 2)
    expect(Array.isArray(prepared)).toBe(true)
    expect(prepared.length).toBe(1)
  })

  it('object is correctly formed', async () => {
    axios.get.mockResolvedValueOnce(returnValueGenerator({ type: 'comments', items: 3 }))
    const comments = await sut.getComments('1')
    const [prepared] = await sut.prepareComments(comments)

    expect(prepared.activity.title).toBe('Commented on YouTube Video')
    expect(prepared.activity.description).toBe('text display')
    expect(prepared.activity.link).toBe('https://youtu.be/video-id')
    expect(prepared.activity.key).toBe(`youtube-comment-${comments[0].snippet.publishedAt}`)
    expect(prepared.activity.occurred_at).toBe(comments[0].snippet.publishedAt)
    expect(prepared.activity.member.name).toBe('joe bloggs')
    expect(prepared.identity.source_host).toBe('youtube.com')
    expect(prepared.identity.url).toBe('https://youtube.com/channel/joebloggs')
    expect(prepared.identity.uid).toBe('joebloggs')
  })

  it('activity title returns both with and without video title passed', async () => {
    const comment = {
      id: '123',
      snippet: {
        videoId: 'video-id',
        textDisplay: 'text display',
        authorDisplayName: 'joe bloggs',
        authorChannelId: { value: 'joebloggs' },
        authorChannelUrl: 'https://youtube.com/channel/joebloggs'
      }
    }
    const commentWithTitle = { ...comment, snippet: { ...comment.snippet, videoTitle: 'Video Title' } }
    const prepared = await sut.prepareComments([comment, commentWithTitle])

    expect(prepared[0].activity.title).toBe('Commented on YouTube Video')
    expect(prepared[1].activity.title).toBe('Commented on Video Title')
  })
})

describe('OrbitYouTube addActivities', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3')
    sut.orbit.createActivity = jest.fn()
  })
  afterAll(() => {
    jest.clearAllMocks()
  })

  it('given no parameter, return correct object', async () => {
    const result = await sut.addActivities()
    expect(result).toMatchObject({ added: 0, duplicates: 0, errors: [] })
  })

  it('given an empty array, return correct object', async () => {
    const result = await sut.addActivities([])
    expect(result).toMatchObject({ added: 0, duplicates: 0, errors: [] })
  })

  it('given successful additions, return correct object', async () => {
    sut.orbit.createActivity
      .mockImplementationOnce(() => Promise.resolve({}))
      .mockImplementationOnce(() => Promise.resolve({}))
    const result = await sut.addActivities([{}, {}])

    expect(result).toMatchObject({ added: 2, duplicates: 0, errors: [] })
  })

  it('given some duplicates, return correct object', async () => {
    sut.orbit.createActivity
      .mockImplementationOnce(() => Promise.resolve({}))
      .mockImplementationOnce(() => Promise.reject({ errors: { key: 'error message' } }))
      .mockImplementationOnce(() => Promise.resolve({}))
    const result = await sut.addActivities([{}, {}, {}])

    expect(result).toMatchObject({ added: 2, duplicates: 1, errors: [] })
  })

  it('given some errors, return correct object', async () => {
    sut.orbit.createActivity
      .mockImplementationOnce(() => Promise.resolve({}))
      .mockImplementationOnce(() => Promise.reject({ errors: { notKey: 'error message' } }))
      .mockImplementationOnce(() => Promise.resolve({}))
    const result = await sut.addActivities([{}, {}, {}])

    expect(result.added).toBe(2)
    expect(result.errors.length).toBe(1)
  })

  it('given a non-API error, throws', async () => {
    const error = 'Network error'
    sut.orbit.createActivity.mockImplementationOnce(() => Promise.reject(error))
    await expect(sut.addActivities([{}])).rejects.toThrow(error)
  })
})

describe('OrbitYouTube addNewComments', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3')
    sut.getChannelComments = jest.fn()
    sut.prepareComments = jest.fn()
    sut.addActivities = jest.fn()
  })

  it('given missing params, throws', async () => {
    await expect(sut.addNewComments()).rejects.toThrow(/channelId/)
    await expect(sut.addNewComments({})).rejects.toThrow(/channelId/)
    await expect(sut.addNewComments({ hours: 1 })).rejects.toThrow(/channelId/)
    await expect(sut.addNewComments({ channelId: 1 })).rejects.toThrow(/hours/)
  })

  it('given a string is passed as a parameter, throws', async () => {
    await expect(sut.addNewComments('channel-id')).rejects.toThrow(/object/)
  })

  it('call methods with correct parameters', async () => {
    mockCalls()
    await sut.addNewComments({ channelId: '123', hours: 12, log: true })

    expect(sut.getChannelComments).toHaveBeenCalledTimes(1)
    expect(sut.getChannelComments).toHaveBeenCalledWith('123', { addTitle: true, log: true })
    expect(sut.prepareComments).toHaveBeenCalledTimes(1)
    expect(sut.prepareComments).toHaveBeenCalledWith([], 12)
    expect(sut.addActivities).toHaveBeenCalledTimes(1)
    expect(sut.addActivities).toHaveBeenCalledWith([])
  })

  it('given an error, throws', async () => {
    const error = 'Network error'
    sut.getChannelComments.mockImplementationOnce(() => Promise.reject(error))
    await expect(sut.addNewComments({ channelId: '123', hours: 12, log: true })).rejects.toThrow(error)
  })

  function mockCalls() {
    sut.getChannelComments.mockImplementationOnce(() => Promise.resolve([]))
    sut.prepareComments.mockImplementationOnce(() => Promise.resolve([]))
    sut.addActivities.mockImplementationOnce(() => Promise.resolve({ added: 0, duplicates: 0, errors: [] }))
  }
})

function returnValueGenerator(options) {
  const { type, items, nextPage, itemsWithChildren, childComments, commentAge } = options
  let r = { data: { items: [] } }

  if (type == 'channels') {
    r.data.items.push({ contentDetails: { relatedPlaylists: { uploads: 'value' } } })
  }
  if (type == 'videos') {
    for (let i = 0; i < items; i++) {
      r.data.items.push({ snippet: { title: `Video ${i + 1}` }, contentDetails: { videoId: '123' } })
    }
    if (nextPage) r.data.nextPageToken = 'next-page-token'
  }
  if (type == 'comments') {
    const comment = {
      id: '123',
      snippet: {
        videoId: 'video-id',
        textDisplay: 'text display',
        authorDisplayName: 'joe bloggs',
        authorChannelId: { value: 'joebloggs' },
        authorChannelUrl: 'https://youtube.com/channel/joebloggs'
      }
    }
    for (let i = 0; i < items; i++) {
      r.data.items.push({ snippet: { totalReplyCount: 0, topLevelComment: comment } })
    }
    for (let i = 0; i < itemsWithChildren; i++) {
      r.data.items[i].snippet.totalReplyCount = childComments
      r.data.items[i].replies = { comments: [] }
      for (let j = 0; j < childComments; j++) {
        r.data.items[i].replies.comments.push(comment)
      }
    }
    if (commentAge) {
      for (let i = 0; i < commentAge.length; i++) {
        r.data.items[i].snippet.publishedAt = moment().subtract(commentAge[i], 'hours').toISOString()
      }
    }
    if (nextPage) r.data.nextPageToken = 'next-page-token'
  }

  return r
}
