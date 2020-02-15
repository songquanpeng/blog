exports.up = function(knex) {
  return knex('options').insert([
    { name: 'domain', value: 'www.example.com' },
    { name: 'author', value: 'My name' },
    { name: 'motto', value: 'My motto.' },
    { name: 'site_name', value: 'Site name' },
    { name: 'extra_header_code', value: '' },
    { name: 'extra_footer_code', value: '' },
    { name: 'description', value: 'Site description.' },
    { name: 'nav_links', value: '' }
  ]);
};

exports.down = function(knex) {};
