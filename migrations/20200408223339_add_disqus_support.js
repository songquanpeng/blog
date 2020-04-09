exports.up = function(knex) {
  return knex('options').insert([
    {
      name: 'disqus',
      value: '',
      description: 'Input your disqus short name to enable disqus and disable origin comment system.'
    }]
  );
};

exports.down = function(knex) {

};
