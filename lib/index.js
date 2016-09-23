'use strict'

const zeromq = require('zmq')

const utils = require('microscopic-utils')
const Asserts = utils.asserts
const Json = utils.json
const Ports = utils.ports
const IP = utils.ip

const Transport = require('microscopic-transport')

const _connections = Symbol('connections')

class ZEROMQTransport extends Transport {
  constructor (options) {
    super(options)

    this[ _connections ] = new Map()
  }

  /**
   * @inheritDoc
   */
  listen (service) {
    Asserts.assert(typeof service.onMessage === 'function', new TypeError('Does not have `onMessage` method'))

    return new Promise((resolve) => {
      Ports.getFreePort()
        .then((port) => {
          this.server = zeromq.socket('router')
          this.server.identity = 'server' + process.pid

          this.server.bindSync(`tcp://${IP.getIP()}:${port}`)

          this.server.on('message', (identity, data) => {
            const message = Json.parse(data)

            const reply = (error, response) => this.server.send([ identity, Json.stringify({
              id: message.id,
              result: response
            }) ])

            service.onMessage(message, reply)
          })

          resolve({ address: IP.getIP(), port: port })
        })
    })
  }

  /**
   * @inheritDoc
   */
  send (connectionConfig, msg, callback) {
    const message = super.createMessage(msg, callback)

    const serviceAddress = `tcp://${connectionConfig.address}:${connectionConfig.port}`
    const connectionId = connectionConfig.address + connectionConfig.port

    let connection = this[ _connections ].get(connectionId)

    if (connection) {
      return connection.send(Json.stringify(message))
    }

    connection = zeromq.socket('dealer')
    connection.identity = 'client' + connectionConfig.address + connectionConfig.port + process.pid

    connection.connect(serviceAddress)
    connection.on('message', (data) => {
      super.onResponse(Json.parse(data))
    })

    connection.send(Json.stringify(message))

    this[ _connections ].set(connectionId, connection)
  }
}

module.exports = ZEROMQTransport
