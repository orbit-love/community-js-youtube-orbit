const axios = require('axios')
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
    const toReturn = { data: { items: [ { contentDetails: { relatedPlaylists: { uploads: 'value' }}}]}}
    axios.get.mockResolvedValueOnce(toReturn)
    const playlistId = await sut.getChannelUploadPlaylistId('123')
    expect(playlistId).toBe('value')
  })
})
