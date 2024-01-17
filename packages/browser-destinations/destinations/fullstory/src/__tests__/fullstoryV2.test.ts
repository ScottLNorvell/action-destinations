import { Analytics, Context } from '@segment/analytics-next'
import fullstory from '..'
import { FS as FSApi } from '../types'
import { Subscription } from '@segment/browser-destination-runtime/types'

jest.mock('@fullstory/browser', () => ({
  ...jest.requireActual('@fullstory/browser'),
  init: () => {
    window.FS = jest.fn() as unknown as FSApi
  }
}))

const example: Subscription[] = [
  {
    partnerAction: 'trackEventV2',
    name: 'Track Event',
    enabled: true,
    subscribe: 'type = "track"',
    mapping: {
      name: {
        '@path': '$.name'
      },
      properties: {
        '@path': '$.properties'
      }
    }
  },
  {
    partnerAction: 'identifyUserV2',
    name: 'Identify User',
    enabled: true,
    subscribe: 'type = "identify"',
    mapping: {
      anonymousId: {
        '@path': '$.anonymousId'
      },
      userId: {
        '@path': '$.userId'
      },
      email: {
        '@path': '$.traits.email'
      },
      traits: {
        '@path': '$.traits'
      },
      displayName: {
        '@path': '$.traits.name'
      }
    }
  }
]

describe('#track', () => {
  it('sends record events to fullstory on "event"', async () => {
    const [event] = await fullstory({
      orgId: 'thefullstory.com',
      subscriptions: example
    })

    await event.load(Context.system(), {} as Analytics)

    await event.track?.(
      new Context({
        type: 'track',
        name: 'hello!',
        properties: {
          banana: '📞'
        }
      })
    )

    expect(window.FS).toHaveBeenCalledWith(
      'trackEvent',
      {
        name: 'hello!',
        properties: {
          banana: '📞'
        }
      },
      'segment-browser-actions'
    )
  })
})

describe('#identify', () => {
  it('should default to anonymousId', async () => {
    const [_, identifyUser] = await fullstory({
      orgId: 'thefullstory.com',
      subscriptions: example
    })

    await identifyUser.load(Context.system(), {} as Analytics)

    await identifyUser.identify?.(
      new Context({
        type: 'identify',
        anonymousId: 'anon',
        traits: {
          testProp: false
        }
      })
    )

    expect(window.FS).toHaveBeenCalledTimes(1)
    expect(window.FS).toHaveBeenCalledWith(
      'setProperties',
      { type: 'user', properties: { segmentAnonymousId: 'anon', testProp: false } },
      'segment-browser-actions'
    )
  }),
    it('should send an id', async () => {
      const [_, identifyUser] = await fullstory({
        orgId: 'thefullstory.com',
        subscriptions: example
      })
      await identifyUser.load(Context.system(), {} as Analytics)

      await identifyUser.identify?.(new Context({ type: 'identify', userId: 'id' }))
      expect(window.FS).toHaveBeenCalledWith('setIdentity', { uid: 'id', properties: {} }, 'segment-browser-actions')
    }),
    it('should camelCase custom traits', async () => {
      const [_, identifyUser] = await fullstory({
        orgId: 'thefullstory.com',
        subscriptions: example
      })
      await identifyUser.load(Context.system(), {} as Analytics)

      await identifyUser.identify?.(
        new Context({
          type: 'identify',
          userId: 'id',
          traits: {
            'not-cameled': false,
            'first name': 'John',
            lastName: 'Doe'
          }
        })
      )
      expect(window.FS).toHaveBeenCalledWith(
        'setIdentity',
        {
          uid: 'id',
          properties: { notCameled: false, firstName: 'John', lastName: 'Doe' }
        },
        'segment-browser-actions'
      )
    })

  it('can set user vars', async () => {
    const [_, identifyUser] = await fullstory({
      orgId: 'thefullstory.com',
      subscriptions: example
    })

    await identifyUser.load(Context.system(), {} as Analytics)

    await identifyUser.identify?.(
      new Context({
        type: 'identify',
        traits: {
          name: 'Hasbulla',
          email: 'thegoat@world',
          height: '50cm'
        }
      })
    )

    expect(window.FS).toHaveBeenCalledWith(
      'setProperties',
      {
        type: 'user',
        properties: {
          displayName: 'Hasbulla',
          email: 'thegoat@world',
          height: '50cm',
          name: 'Hasbulla'
        }
      },
      'segment-browser-actions'
    )
  })

  it('should set displayName correctly', async () => {
    const [_, identifyUser] = await fullstory({
      orgId: 'thefullstory.com',
      subscriptions: example
    })

    await identifyUser.load(Context.system(), {} as Analytics)

    await identifyUser.identify?.(
      new Context({
        type: 'identify',
        userId: 'userId',
        traits: {
          name: 'Hasbulla',
          email: 'thegoat@world',
          height: '50cm'
        }
      })
    )

    expect(window.FS).toHaveBeenCalledWith(
      'setIdentity',
      {
        uid: 'userId',
        properties: {
          displayName: 'Hasbulla',
          email: 'thegoat@world',
          height: '50cm',
          name: 'Hasbulla'
        }
      },
      'segment-browser-actions'
    )
  })
})
