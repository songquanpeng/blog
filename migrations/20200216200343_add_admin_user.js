exports.up = function(knex) {
  return knex('users').insert([
    {
      id: '123',
      username: 'admin',
      password: '123456',
      display_name: 'Administrator',
      status: 100,
      email: 'admin@domain.com',
      url: 'https://domain.com',
      avatar: '/favicon.ico'
    }
  ]);
};

exports.down = function(knex) {};
