/**
 * @jest-environment node
 */

const OrbitYouTube = require('../src/index.js')
const YOUTUBE_COMMENTS = require('./YOUTUBE_COMMENTS.json')

beforeAll(() => {
    jest.spyOn(OrbitYouTube.prototype, 'getComments').mockImplementation(options => {
        if (!options) throw new Error('You must provide an options object')
        if (!options.channelId) throw new Error('You must provide channelId')
        if (!options.hours) throw new Error('You must provide hours')
        return Promise.resolve(YOUTUBE_COMMENTS)
    })
})

describe('client', () => {
    it('initializes with arguments passed in directly', () => {
        envVars(false)
        const orbitYouTube = new OrbitYouTube('val1', 'val2', 'val3')
        expect(orbitYouTube.credentials.orbitWorkspaceId).toBe('val1')
        expect(orbitYouTube.credentials.orbitApiKey).toBe('val2')
        expect(orbitYouTube.credentials.ytApiKey).toBe('val3')
    })

    it('initializes with credentials from environment variables', () => {
        envVars(true)
        new OrbitYouTube()
    })

    it('throws with incomplete set of credentials', () => {
        expect(() => {
            envVars(false);
            process.env.ORBIT_WORKSPACE_ID = "val1";
            new OrbitYouTube();
        }).toThrow()
        expect(() => {
            envVars(false);
            process.env.ORBIT_API_KEY = "val2";
            new OrbitYouTube();
        }).toThrow()
        expect(() => {
            envVars(false);
            process.env.YOUTUBE_API_KEY = "val3";
            new OrbitYouTube();
        }).toThrow()
        expect(() => {
            envVars(false)
            process.env.ORBIT_WORKSPACE_ID = "val1"
            process.env.ORBIT_API_KEY = "val2"
            new OrbitYouTube()
        }).toThrow()
        expect(() => {
            envVars(false)
            process.env.ORBIT_API_KEY = "val2"
            process.env.YOUTUBE_API_KEY = "val3"
            new OrbitYouTube()
        }).toThrow()
        expect(() => {
            envVars(false)
            process.env.ORBIT_WORKSPACE_ID = "val2"
            process.env.YOUTUBE_API_KEY = "val3"
            new OrbitYouTube()
        }).toThrow()

        expect(() => {
            envVars(false);
            new orbitYouTube('val1', 'val2')
        }).toThrow()
        expect(() => {
            envVars(false);
            new orbitYouTube('val1')
        }).toThrow()
    })
})

 describe('get comments', () => {
     it('returns array', async () => {
         envVars(true)
         const orbitYouTube = new OrbitYouTube()
         const questions = await orbitYouTube.getComments({ channelId: 'channel', hours: 24 })
         expect(Array.isArray(questions)).toBe(true)
    })

    it('requires an object', async () => {
        try {
            const orbitYouTube = new OrbitYouTube()
            await orbitYouTube.getComments()
            fail()
        } catch(error) {
            expect(String(error).includes('object')).toBeTruthy()
        }
    })

    it('requires a channel', async () => {
        try {
            const orbitYouTube = new OrbitYouTube()
            await orbitYouTube.getComments({ hours: 12 })
            fail()
        } catch(error) {
            expect(String(error).includes('channel')).toBeTruthy()
        }
    })

    it('requires hours', async () => {
        try {
            const orbitYouTube = new OrbitYouTube()
            await orbitYouTube.getComments({ channelId: 'val' })
            fail()
        } catch(error) {
            expect(String(error).includes('hours')).toBeTruthy()
        }
    })
 })

 describe('prepare comments', () => {
     it('returns array of same size as the input', async () => {
         envVars(true)
         const orbitYouTube = new OrbitYouTube()
         const comments = await orbitYouTube.getComments({ channelId: 'val', hours: 1 })
         const prepared = await orbitYouTube.prepareComments(comments)
         expect(comments.length).toEqual(prepared.length)
     })
     it('structure is correct', async () => {
         envVars(true)
         const orbitYouTube = new OrbitYouTube()
         const comments = await orbitYouTube.getComments({ channelId: 'val', hours: 1 })
         const prepared = await orbitYouTube.prepareComments(comments)
         const p = prepared[0]
         expect(p.activity).toBeTruthy()
         expect(p.activity.activity_type).toBe('youtube:comment')
         expect(p.activity.title).toBeTruthy()
         expect(p.activity.member).toBeTruthy()
         expect(p.identity.source_host).toBe('youtube.com')
     })
 })

function envVars(toHaveVars) {
    if (toHaveVars) {
        process.env.ORBIT_WORKSPACE_ID = 'var1'
        process.env.ORBIT_API_KEY = 'var2'
        process.env.YOUTUBE_API_KEY = 'var3'
    } else {
        delete process.env.ORBIT_WORKSPACE_ID
        delete process.env.ORBIT_API_KEY
        delete process.env.YOUTUBE_API_KEY
    }
}
