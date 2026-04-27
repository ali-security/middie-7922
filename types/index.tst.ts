import fastify from 'fastify'
import middiePlugin, {
  FastifyMiddieOptions,
  IncomingMessageExtended
} from '.'
import { expect } from 'tstyche'

const app = fastify()
app.register(middiePlugin)

expect({}).type.toBeAssignableTo<FastifyMiddieOptions>()

expect({ body: { foo: 'bar' }, query: { bar: 'foo' } }).type.toBeAssignableTo<IncomingMessageExtended>()
expect({}).type.toBeAssignableTo<IncomingMessageExtended>()

app.use('/', (_req, _res, next) => {
  expect<any>().type.toBeAssignableTo<IncomingMessageExtended['body']>()
  expect<any>().type.toBeAssignableTo<IncomingMessageExtended['query']>()
  next()
})

expect(app.register).type.not.toBeCallableWith(middiePlugin, {
  invalidOption: true
})
