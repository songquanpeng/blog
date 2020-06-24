exports.up = function(knex) {
  return knex.schema.createTable('files', function(table) {
    table.uuid('id').primary();
    table.text('description');
    table.text('path').notNullable();
    table.text('filename');
  });
};

exports.down = function(knex) {};
