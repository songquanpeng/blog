exports.up = function(knex) {
  return knex('options').insert([
    {
      name: 'theme',
      value: 'bulma',
      description: 'Your should restart the server to apply change.'
    }
  ]);
};

exports.down = function(knex) {};
