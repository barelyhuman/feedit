import { open } from '@op-engineering/op-sqlite'
import { drizzle } from 'drizzle-orm/op-sqlite'
import * as schema from './schema'

const connection = open({ name: 'feedit.db' })
export const db = drizzle(connection, { schema })
