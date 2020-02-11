exports.up = function(knex, Promise) {
  return knex.schema
    .createTable('users', function(table) {
      table.uuid('id').primary();
      table
        .string('username')
        .unique()
        .notNullable();
      table.string('password').notNullable();
      table.string('display_name');
      table.integer('status').notNullable();
      table.string('email');
      table.string('url');
    })
    .createTable('pages', function(table) {
      table.uuid('id').primary();
      table
        .uuid('user_id')
        .references('id')
        .inTable('users')
        .notNullable()
        .onDelete('cascade');
      table.integer('type').notNullable();
      table.string('link').notNullable();
      table.integer('page_status').notNullable();
      table.dateTime('post_time').notNullable();
      table.dateTime('edit_time');
      table.integer('comment_status');
      table.string('title').notNullable();
      table.text('content').notNullable();
      table.string('tag');
      table.string('password');
      table.integer('view').defaultTo(0);
      table.integer('up_vote').defaultTo(0);
      table.integer('down_vote').defaultTo(0);
    })
    .createTable('comments', function(table) {
      table.uuid('id').primary();
      table.string('author').notNullable();
      table.integer('status');
      table
        .uuid('page_id')
        .references('id')
        .inTable('pages')
        .notNullable();
      table.dateTime('post_time').notNullable();
      table.string('title').notNullable();
      table.text('content').notNullable();
      table.integer('up_vote').defaultTo(0);
      table.integer('down_vote').defaultTo(0);
      table.string('ip');
      table.string('agent');
      table.string('url');
      table.string('email');
    })
    .createTable('options', function(table) {
      table.uuid('id').primary();
      table
        .string('name')
        .unique()
        .notNullable();
      table.text('value').notNullable();
    });
};

exports.down = function(knex) {};
