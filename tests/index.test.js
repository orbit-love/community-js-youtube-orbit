const axios = require('axios')
const qs = require('querystring')
const OrbitYouTube = require('../src/index')
jest.mock('axios')

describe('OrbitYouTube constructor', () => {
  it('given all credentials, does not throw', () => {
    const sut = new OrbitYouTube('1', '2', '3', '4')
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

  it('given an error, throws', async () => {
    const error = 'Network error'
    axios.get.mockImplementationOnce(() => Promise.reject(new Error(error)))
    await expect(sut.api('/')).rejects.toThrow(error)
  })
})

describe('OrbitYouTube getChannel', () => {
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
    const toReturn = { data: { items: [{ contentDetails: { relatedPlaylists: { uploads: 'value' } } }] } }
    axios.get.mockResolvedValueOnce(toReturn)
    const playlistId = await sut.getChannelUploadPlaylistId('123')
    expect(playlistId).toBe('value')
  })
})

describe('OrbitYouTube getVideoPage', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3', '4')
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
    axios.get.mockImplementationOnce(() => Promise.reject(new Error(error)))
    await expect(sut.getVideoPage('id')).rejects.toThrow(error)
  })
})

describe('OrbitYouTube getVideos', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3', '4')
  })

  it('given fewer than 50 items, returns array of items', async () => {
    axios.get.mockResolvedValueOnce({ data: { items: [...Array(5).keys()] } })
    const videos = await sut.getVideos('id')
    expect(videos.length).toBe(5)
  })

  it('given greater than 50 items, returns array of items', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { items: [...Array(50).keys()], nextPageToken: '123' } })
      .mockResolvedValueOnce({ data: { items: [...Array(20).keys()] } })
    const videos = await sut.getVideos('id')
    expect(videos.length).toBe(70)
  })

  // it('given an error, throws', async () => {
  //   const error = 'Network error'
  //   axios.get.mockImplementationOnce(() => Promise.reject(new Error(error)))
  //   await expect(sut.getVideoPage('id')).rejects.toThrow(error)
  // })
})
