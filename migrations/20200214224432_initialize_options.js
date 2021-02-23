exports.up = function(knex) {
  return knex('options').insert([
    {
      name: 'domain',
      value: 'www.example.com',
      description:
        'Notice domain only and this is required if you want to enable disqus.'
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
        '[{"key": "Meta","value": [{"link":"/","text":"Home"},{"link":"/archive","text":"Archive"},{"link":"/page/links","text":"Links"},{"link":"/page/about","text":"About"}]},{"key": "Example Dropdown","value": [{"link":"/admin","text":"Admin"}, {"link":"https://github.com/songquanpeng/express-react-blog","text":"Star"}]}]',
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
        'https://cdn.jsdelivr.net/npm/highlight.js@10.1.1/styles/solarized-light.css',
      description: 'Input a highlight.js style css link here.'
    },
    {
      name: 'allow_comments',
      value: 'true',
      description: 'Whether to open comments.'
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
    },
    {
      name: 'disqus',
      value: '',
      description:
        'Input your disqus short name to enable disqus and disable origin comment system.'
    }
  ]);
};

exports.down = function(knex) {};
