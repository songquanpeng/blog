exports.up = function(knex) {
  return knex('options').insert([
    { name: 'domain', value: 'www.example.com' },
    { name: 'author', value: 'My name' },
    { name: 'motto', value: 'My motto.' },
    { name: 'siteName', value: 'Site name' },
    { name: 'extraHeaderCode', value: '' },
    { name: 'extraFooterCode', value: '' },
    { name: 'siteName', value: 'Site name' },
    { name: 'description', value: 'Site description.' }
  ]);
};

exports.down = function(knex) {};
