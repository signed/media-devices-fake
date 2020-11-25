import './matchers/to-be-uuid'
import {uuidV4} from './uuid'

test('actual uuid', () => {
  expect('407aa314-56a7-40ff-815c-60c52baed9b3').toBeUuid()
})

test('generated uuid', () => {
  expect(uuidV4()).toBeUuid()
})

test('not a uuid', () => {
  expect('not a uuid').not.toBeUuid()
})
