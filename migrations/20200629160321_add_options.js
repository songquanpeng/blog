exports.up = function(knex) {
  return knex('options').insert([
    {
      name: 'favicon',
      value: '/favicon.ico',
      description: 'Setup the favicon of your site.'
    },
    {
      name: 'brand_image',
      value: '/icon192.png',
      description: 'Setup the brand image of your site.'
    }
  ]);
};

exports.down = function(knex) {};
