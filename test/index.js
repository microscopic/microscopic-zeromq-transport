'use strict'

const chai = require('chai')
const mockery = require('mockery')
const sinon = require('sinon')

const expect = chai.expect

const ZEROMQTransport = require('../lib/index')

describe('ZeroMQ Transport', () => {
  describe('listen()', () => {
    it('should throw error if service does not have `onMessage` method', () => {
      expect(() => new ZEROMQTransport().listen({})).to.throw()
    })

    it('should return promise', () => {
      expect(new ZEROMQTransport().listen({ onMessage: () => 1 })).to.be.instanceOf(Promise)
    })

    it('should return connection config', (done) => {
      new ZEROMQTransport().listen({ onMessage: () => 1 })
        .then((connectionConfig) => {
          expect(connectionConfig).to.have.all.keys([ 'address', 'port' ])

          done()
        })
    })
  })

  describe('send()', () => {
    let connectSpy
    let sendSpy

    before(() => mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false
    }))

    beforeEach(() => {
      delete require.cache[ require.resolve('../lib/index') ]

      connectSpy = sinon.spy()
      sendSpy = sinon.spy()

      mockery.registerMock('zmq', {
        socket: () => ({
          connect: connectSpy,
          send: sendSpy,
          on: () => 1
        })
      })
    })

    after(() => mockery.disable())

    it('should reused one connection', (done) => {
      const ZEROMQTransportFresh = require('../lib/index')

      const client = new ZEROMQTransportFresh()

      client.send({ address: '127.0.0.1', port: 1234 }, { a: 1 }, () => {
      })

      client.send({ address: '127.0.0.1', port: 1234 }, { a: 1 }, () => {
      })

      expect(connectSpy.calledOnce).to.be.true
      expect(sendSpy.calledTwice).to.be.true

      done()
    })
  })

  describe('communication', () => {
    it('client should be able to communication with server ', (done) => {
      const service = {
        serviceName: 'communication',
        onMessage: (message, reply) => {
          expect(message.a).to.be.equal(1)

          reply(null, { result: 'ok' })
        }
      }

      const client = new ZEROMQTransport()

      new ZEROMQTransport().listen(service)
        .then((connectionConfig) => {
          client.send(connectionConfig, { a: 1 }, (error, response) => {
            expect(response.result).to.be.equal('ok')

            done()
          })
        })
    })
  })
})
