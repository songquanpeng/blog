exports.up = function(knex) {
  return knex('options').insert([
    {
      name: 'domain',
      value: 'www.example.com',
      description: 'Notice domain only.'
    },
    { name: 'author', value: 'My name', description: 'Your name.' },
    { name: 'motto', value: 'My motto.', description: 'Your motto.' },
    {
      name: 'site_name',
      value: 'Site name',
      description: 'Name your CMS site.'
    },
    {
      name: 'extra_header_code',
      value: '',
      description: 'For example you can insert google analytics code here.'
    },
    {
      name: 'extra_footer_code',
      value: '',
      description: 'This code will be inserted into the body tag.'
    },
    {
      name: 'description',
      value: 'Site description.',
      description: 'Describe your site.'
    },
    {
      name: 'nav_links',
      value:
        '[{"link":"/archive","text":"Archive"},{"link":"/page/about","text":"About"},{"link":"/admin","text":"Admin"}]',
      description: 'Add links on the navigation bar. Must be a valid json.'
    },
    {
      name: 'port',
      value: '3000',
      description: 'Set the port on which the server listens.'
    },
    {
      name: 'code_theme',
      value:
        'https://cdn.jsdelivr.net/npm/highlight.js@9.18.1/styles/railscasts.css',
      description: 'Input a highlight.js style css link here.'
    },
    {
      name: 'allow_comments',
      value: 'true',
      description: 'All comments true or false.'
    },
    {
      name: 'language',
      value: 'zh',
      description: 'Input a valid language codes here, such as "zh", "en".'
    },
    {
      name: 'extra_footer_text',
      value: '',
      description: 'Text here will display on the footer.'
    }
  ]);
};

exports.down = function(knex) {};
