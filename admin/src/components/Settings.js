import React, { Component } from 'react';

import { connect } from 'react-redux';

import axios from 'axios';
import { message as Message, Button, Tabs, Form, Input } from 'antd';

const { TabPane } = Tabs;

const tabs = [
  {
    label: '通用设置',
    settings: [
      {
        key: 'domain',
        description: '请输入你的域名，例如：www.domain.com',
      },
      {
        key: 'language',
        description: '语言',
      },
      {
        key: 'copyright',
        description: '请输入 HTML 代码，其将被放置在页面的末尾',
      },
      {
        key: 'allow_comments',
        description: 'true 或者 false',
      },
      {
        key: 'use_cache',
        description: 'true 或者 false',
      },
    ],
  },
  {
    label: '自定义设置',
    settings: [
      {
        key: 'theme',
        description:
          "博客主题，可选值：bulma, bootstrap, bootstrap5, v2ex, next 以及 w3",
      },
      {
        key: 'code_theme',
        description:
          '从这里选择一个代码主题：https://www.jsdelivr.com/package/npm/highlight.js?path=styles',
      },
      {
        key: 'site_name',
        description: "网站名称",
      },
      {
        key: 'description',
        description: '网站描述信息',
      },
      {
        key: 'nav_links',
        description: '必须是合法的 JSON 格式的文本',
        isBlock: true,
      },
      {
        key: 'author',
        description: '你的名字',
      },
      {
        key: 'motto',
        description: '你的格言',
      },
      {
        key: 'favicon',
        description: '请输入一个图片链接',
      },
      {
        key: 'brand_image',
        description: '请输入一个图片链接',
      },
      {
        key: 'index_page_content',
        description: '自定义首页 HTML 代码，输入 404 则对外隐藏首页',
        isBlock: true,
      }
    ],
  },
  {
    label: '其他设置',
    settings: [
      {
        key: 'ad',
        description: '广告代码',
        isBlock: true,
      },
      {
        key: 'extra_header_code',
        description: '此处代码会被插入到 header 标签内，可在此处放入统计代码',
        isBlock: true,
      },
      {
        key: 'extra_footer_code',
        description: '此处代码会被插入到 footer 标签内',
      },
      {
        key: 'disqus',
        description: 'Disqus 标识符，未输入则无法启用评论',
      },
      {
        key: 'extra_footer_text',
        description: '自定义页脚信息，支持 HTML，可在此放入备案信息等',
      },
      {
        key: 'message_push_api',
        description:
          '消息推送 API 链接，具体参见：https://github.com/songquanpeng/message-pusher',
      },
    ],
  },
];

class Settings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      submitLoading: false,
      language: 'javascript',
      options: {},
      optionIndex: 0,
    };
  }

  static getDerivedStateFromProps({ status }) {
    return { status };
  }

  async componentDidMount() {
    if (this.state.status === 0) {
      Message.error('访问被拒绝');
      this.props.history.push('/login');
      return;
    }
    await this.fetchData();
  }

  fetchData = async () => {
    try {
      this.setState({ loading: true });
      const res = await axios.get(`/api/option/`);
      let { status, message, options } = res.data;
      let temp = {};
      if (status) {
        options.forEach((option) => {
          temp[option.key] = option.value;
        });
        options = temp;
        console.log(options);
        this.setState({ options });
      } else {
        Message.error(message);
      }
      this.setState({ loading: false });
    } catch (e) {
      Message.error(e.message);
    }
  };

  updateOption = (key, value) => {
    let options = this.state.options;
    options[key] = value;
    this.setState({ options });
  };

  submit = async () => {
    let options = this.state.options;
    try {
      const res = await axios.put(`/api/option/`, options);
      const { status, message } = res.data;
      if (status) {
        Message.success('设置更新成功');
      } else {
        Message.error(message);
      }
      this.setState({ loading: false });
    } catch (e) {
      Message.error(e.message);
    } finally {
      this.setState({ submitLoading: false });
    }
  };

  render() {
    return (
      <div className={'content-area'}>
        <h1>系统设置</h1>
        <div style={{ background: '#fff', padding: 16 }}>
          <Tabs tabPosition={'left'}>
            {tabs.map((tab) => {
              tab.settings.sort((a, b) => {
                if (a.key < b.key) {
                  return -1;
                }
                if (a.key > b.key) {
                  return 1;
                }
                return 0;
              });
              return (
                <TabPane tab={tab.label} key={tab.label}>
                  <Form layout={'vertical'}>
                    {tab.settings.map((setting) => {
                      setting.label = setting.key
                        .replaceAll('_', ' ')
                        .toUpperCase();
                      return (
                        <Form.Item
                          label={setting.label ? setting.label : setting.key}
                        >
                          {setting.isBlock ? (
                            <Input.TextArea
                              placeholder={setting.description}
                              value={this.state.options[setting.key]}
                              onChange={(e) => {
                                this.updateOption(setting.key, e.target.value);
                              }}
                              rows={10}
                            />
                          ) : (
                            <Input
                              placeholder={setting.description}
                              value={this.state.options[setting.key]}
                              onChange={(e) => {
                                this.updateOption(setting.key, e.target.value);
                              }}
                            />
                          )}
                        </Form.Item>
                      );
                    })}
                    <Button type="primary" onClick={() => this.submit()}>
                      保存设置
                    </Button>
                  </Form>
                </TabPane>
              );
            })}
          </Tabs>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return state;
};

export default connect(mapStateToProps)(Settings);
