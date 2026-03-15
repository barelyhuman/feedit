import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const feeds = sqliteTable('feeds', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull(),
  feedUrl: text('feed_url').notNull().unique(),
  link: text('link').notNull().default(''),
})

export const feedItems = sqliteTable('feed_items', {
  id: text('id').primaryKey().notNull(),
  feedId: text('feed_id').notNull().references(() => feeds.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default(''),
  link: text('link').notNull().default(''),
  published: text('published'),
  unread: integer('unread', { mode: 'boolean' }).notNull().default(true),
})

export const bookmarks = sqliteTable('bookmarks', {
  feedId: text('feed_id').notNull().references(() => feeds.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),
}, (t) => [
  primaryKey({ name: 'pk', columns: [t.feedId, t.itemId] }),
])
