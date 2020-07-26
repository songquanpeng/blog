exports.up = function(knex) {
  return knex('options').insert([
    {
      name: 'ad',
      value: '',
      description: 'Add ad in the page bottom.'
    },
    {
      name: 'copyright',
      value: '',
      description: 'Add copyright notice.'
    }
  ]);
};

exports.down = function(knex) {};
