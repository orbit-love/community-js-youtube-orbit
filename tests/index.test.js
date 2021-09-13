const axios = require('axios')
const OrbitYouTube = require('../src/index')
const qs = require('querystring')
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
    delete process.env.YOUTUBE_CHANNEL_ID

    expect(() => {
      new OrbitYouTube(null, null, null, null)
    }).toThrow()
  })

  it('given missing youtube credentials, throws', () => {
    delete process.env.YOUTUBE_API_KEY
    delete process.env.YOUTUBE_CHANNEL_ID

    expect(() => {
      new OrbitYouTube('1', '2', null, '4')
    }).toThrow(/YOUTUBE_API_KEY/)
    expect(() => {
      new OrbitYouTube('1', '2', '3', null)
    }).toThrow(/YOUTUBE_CHANNEL_ID/)
  })

  it('reads from env vars when values not directly provided', () => {
    process.env.ORBIT_WORKSPACE_ID = '1'
    process.env.ORBIT_API_KEY = '2'
    process.env.YOUTUBE_API_KEY = '3'
    process.env.YOUTUBE_CHANNEL_ID = '4'

    const sut = new OrbitYouTube(null, null, null, null)

    expect(sut.credentials.orbitWorkspaceId).toBe('1')
    expect(sut.credentials.ytChannelId).toBe('4')
  })

  it('sets @orbit-love/activities creds correctly', () => {
    const sut = new OrbitYouTube('1', '2', '3', '4')
    expect(sut.orbit.credentials.orbitWorkspaceId).toBe('1')
    expect(sut.orbit.credentials.orbitApiKey).toBe('2')
  })
})

describe('OrbitYouTube api', () => {
  let sut
  beforeEach(() => {
    sut = new OrbitYouTube('1', '2', '3', '4')
  })

  it('if path is missing, throws', async () => {
    await expect(sut.api()).rejects.toThrow(/path/)
  })

  it('encodes api key in url correctly', async () => {
    axios.get.mockResolvedValueOnce({ data: {} })

    await sut.api('/path')
    const url = axios.get.mock.calls[0][0]
    const search = url.split('?')[1]
    const params = qs.decode(search)

    expect(params.key).toBe('3')
  })

  it('given a query, encodes url correctly', async () => {
    axios.get.mockResolvedValueOnce({ data: {} })

    await sut.api('/path', { key1: 'val1', key2: 'val2' })
    const url = axios.get.mock.calls[0][0]
    const search = url.split('?')[1]
    const params = qs.decode(search)

    expect(params.key1).toBe('val1')
    expect(params.key2).toBe('val2')
  })
})
