exports.up = function(knex) {
  return knex('options').insert([
    {
      name: 'message_push_api',
      value: '',
      description:
        'Please check https://github.com/songquanpeng/wechat-message-push'
    }
  ]);
};

exports.down = function(knex) {};
