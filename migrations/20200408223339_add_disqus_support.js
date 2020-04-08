exports.up = function(knex) {
  return knex('options').insert([
    {
      name: 'disqus',
      value: '',
      description: 'Please input your disqus website name to enable disqus comment system. Notice this will disable origin comment system.'
    }]
  );
};

exports.down = function(knex) {

};
